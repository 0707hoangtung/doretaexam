import { Exam, Question, ExamResult, UserAccount } from '../types';
import {
  saveExamToCloud,
  deleteExamFromCloud,
  saveQuestionToCloud,
  deleteQuestionFromCloud,
  submitExamResultToCloud,
  deleteExamResultFromCloud,
  saveUserToCloud,
  deleteUserFromCloud,
  updateSystemPin as updateFirebasePin,
} from './firebase';

export interface SyncDataState {
  exams: Exam[];
  questionBank: Question[];
  results: ExamResult[];
  users: UserAccount[];
  systemPin: string;
  lastUpdated: string;
}

export interface SyncCallbacks {
  onExams: (exams: Exam[]) => void;
  onQuestionBank: (bank: Question[]) => void;
  onResults: (results: ExamResult[]) => void;
  onUsers: (users: UserAccount[]) => void;
  onPin: (pin: string) => void;
  onStatusChange?: (status: 'connected' | 'syncing' | 'offline') => void;
}

/**
 * Fetch complete current data from server API
 */
export async function fetchServerSync(): Promise<SyncDataState | null> {
  try {
    const res = await fetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && json.data) {
      return json.data as SyncDataState;
    }
    return null;
  } catch (err) {
    console.warn('[SyncEngine] fetchServerSync error:', err);
    return null;
  }
}

/**
 * Dispatch mutation to server API and broadcast to all devices
 */
async function postSyncMutation(type: string, data: any): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SyncEngine] postSyncMutation (${type}) error:`, err);
    return false;
  }
}

// -------------------------------------------------------------
// MUTATIONS (Server + Firestore Dual Sync)
// -------------------------------------------------------------

export async function serverUpsertExam(exam: Exam): Promise<void> {
  // 1. Post to Server (instant broadcast to all devices and tabs via SSE)
  postSyncMutation('UPSERT_EXAM', exam);
  // 2. Dual-sync to Firestore in background
  saveExamToCloud(exam).catch(() => {});
}

export async function serverDeleteExam(examId: string): Promise<void> {
  postSyncMutation('DELETE_EXAM', { id: examId });
  deleteExamFromCloud(examId).catch(() => {});
}

export async function serverUpsertQuestion(question: Question): Promise<void> {
  postSyncMutation('UPSERT_QUESTION', question);
  saveQuestionToCloud(question).catch(() => {});
}

export async function serverDeleteQuestion(questionId: string): Promise<void> {
  postSyncMutation('DELETE_QUESTION', { id: questionId });
  deleteQuestionFromCloud(questionId).catch(() => {});
}

export async function serverSubmitResult(result: ExamResult): Promise<void> {
  postSyncMutation('SUBMIT_RESULT', result);
  submitExamResultToCloud(result).catch(() => {});
}

export async function serverDeleteResult(resultId: string): Promise<void> {
  postSyncMutation('DELETE_RESULT', { id: resultId });
  deleteExamResultFromCloud(resultId).catch(() => {});
}

export async function serverClearResults(resultIds: string[]): Promise<void> {
  postSyncMutation('CLEAR_RESULTS', { ids: resultIds });
  resultIds.forEach((id) => deleteExamResultFromCloud(id).catch(() => {}));
}

export async function serverUpsertUser(user: UserAccount): Promise<void> {
  postSyncMutation('UPSERT_USER', user);
  saveUserToCloud(user).catch(() => {});
}

export async function serverDeleteUser(userId: string): Promise<void> {
  postSyncMutation('DELETE_USER', { id: userId });
  deleteUserFromCloud(userId).catch(() => {});
}

export async function serverUpdatePin(pin: string): Promise<void> {
  postSyncMutation('UPDATE_PIN', { pin });
  updateFirebasePin(pin).catch(() => {});
}

export async function serverFullSync(data: Partial<SyncDataState>): Promise<boolean> {
  return postSyncMutation('FULL_SYNC', data);
}

/**
 * Start real-time SSE listener with fallback polling
 */
export function startSyncListener(callbacks: SyncCallbacks): () => void {
  let eventSource: EventSource | null = null;
  let isUnmounted = false;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

  const applyState = (state: SyncDataState) => {
    if (!state) return;
    if (Array.isArray(state.exams)) callbacks.onExams(state.exams);
    if (Array.isArray(state.questionBank)) callbacks.onQuestionBank(state.questionBank);
    if (Array.isArray(state.results)) callbacks.onResults(state.results);
    if (Array.isArray(state.users)) callbacks.onUsers(state.users);
    if (typeof state.systemPin === 'string') callbacks.onPin(state.systemPin);
  };

  const connectSSE = () => {
    if (isUnmounted) return;
    try {
      callbacks.onStatusChange?.('syncing');
      eventSource = new EventSource('/api/sync/stream');

      eventSource.addEventListener('init', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          applyState(data);
          callbacks.onStatusChange?.('connected');
        } catch (err) {
          console.warn('[SyncEngine] Parse init error:', err);
        }
      });

      eventSource.addEventListener('sync', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.state) {
            applyState(parsed.state);
          }
          callbacks.onStatusChange?.('connected');
        } catch (err) {
          console.warn('[SyncEngine] Parse sync event error:', err);
        }
      });

      eventSource.onopen = () => {
        callbacks.onStatusChange?.('connected');
      };

      eventSource.onerror = () => {
        // SSE reconnecting or momentarily disrupted.
        // DO NOT falsely mark offline if the user has active internet and the HTTP server responds!
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          callbacks.onStatusChange?.('offline');
        } else {
          fetchServerSync().then((data) => {
            if (data) {
              callbacks.onStatusChange?.('connected');
            } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
              callbacks.onStatusChange?.('offline');
            }
          }).catch(() => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              callbacks.onStatusChange?.('offline');
            }
          });
        }

        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Auto reconnect after 3 seconds
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connectSSE, 3000);
        }
      };
    } catch (err) {
      console.warn('[SyncEngine] EventSource setup error:', err);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        callbacks.onStatusChange?.('offline');
      }
      if (!isUnmounted) {
        reconnectTimer = setTimeout(connectSSE, 4000);
      }
    }
  };

  // 1. Initial immediate fetch
  fetchServerSync().then((initial) => {
    if (!isUnmounted && initial) {
      applyState(initial);
      callbacks.onStatusChange?.('connected');
    }
  });

  // 2. Connect real-time SSE stream
  connectSSE();

  // 3. Fallback heartbeat polling every 10 seconds to guarantee sync even on flaky networks
  pollInterval = setInterval(async () => {
    if (isUnmounted) return;
    const latest = await fetchServerSync();
    if (!isUnmounted && latest) {
      applyState(latest);
      callbacks.onStatusChange?.('connected');
    }
  }, 10000);

  return () => {
    isUnmounted = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
