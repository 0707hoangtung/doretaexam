import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { Exam, Question, ExamResult, UserAccount } from '../src/types';
import { initialExams, initialQuestionBank } from '../src/data/sampleData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'app_database.json');

export const DEFAULT_ROOT_ADMIN: UserAccount = {
  id: 'usr-root-admin',
  username: 'admin',
  displayName: 'Quản Trị Viên Tối Cao',
  email: 'hoangtuanh341992@gmail.com',
  role: 'super_admin',
  password: 'Tunganh7787',
  subject: 'Toán Học - Quản Trị',
  school: 'Hệ Thống DoretaExam',
  createdAt: '2026-08-28',
  isActive: true,
  lastLoginAt: new Date().toISOString(),
};

export interface SyncDataState {
  exams: Exam[];
  questionBank: Question[];
  results: ExamResult[];
  users: UserAccount[];
  systemPin: string;
  lastUpdated: string;
}

// In-memory master state
let state: SyncDataState = {
  exams: initialExams,
  questionBank: initialQuestionBank,
  results: [],
  users: [DEFAULT_ROOT_ADMIN],
  systemPin: 'Tunganh7787',
  lastUpdated: new Date().toISOString(),
};

// Connected SSE clients
const sseClients = new Set<Response>();

/**
 * Initialize data from local filesystem
 */
export function initSyncStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed) {
        state = {
          exams: Array.isArray(parsed.exams) ? parsed.exams : initialExams,
          questionBank: Array.isArray(parsed.questionBank) ? parsed.questionBank : initialQuestionBank,
          results: Array.isArray(parsed.results) ? parsed.results : [],
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : [DEFAULT_ROOT_ADMIN],
          systemPin: typeof parsed.systemPin === 'string' ? parsed.systemPin : '123456',
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
        console.log(`[SyncStore] Loaded database with ${state.exams.length} exams, ${state.questionBank.length} questions.`);
        return;
      }
    }

    // If no existing file, write default state
    saveStateToDisk();
    console.log(`[SyncStore] Initialized brand new database file at ${DATA_FILE}`);
  } catch (err) {
    console.error('[SyncStore] initSyncStore error:', err);
  }
}

/**
 * Save in-memory state to disk
 */
function saveStateToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SyncStore] saveStateToDisk error:', err);
  }
}

/**
 * Get current synchronized state
 */
export function getSyncState(): SyncDataState {
  return state;
}

/**
 * Register SSE client
 */
export function addSseClient(res: Response): void {
  sseClients.add(res);
  // Send immediate INIT event
  const initMsg = `event: init\ndata: ${JSON.stringify(state)}\n\n`;
  res.write(initMsg);
}

/**
 * Remove SSE client on disconnect
 */
export function removeSseClient(res: Response): void {
  sseClients.delete(res);
}

/**
 * Broadcast event to all connected devices and tabs
 */
export function broadcastSync(action: string, payload?: any): void {
  state.lastUpdated = new Date().toISOString();
  saveStateToDisk();

  const eventPayload = {
    action,
    payload,
    state,
    timestamp: state.lastUpdated,
  };

  const message = `event: sync\ndata: ${JSON.stringify(eventPayload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// MUTATIONS
// -------------------------------------------------------------

export function upsertExam(exam: Exam): SyncDataState {
  const index = state.exams.findIndex((e) => e.id === exam.id);
  if (index >= 0) {
    state.exams[index] = exam;
  } else {
    state.exams = [exam, ...state.exams];
  }
  broadcastSync('UPSERT_EXAM', exam);
  return state;
}

export function deleteExam(examId: string): SyncDataState {
  state.exams = state.exams.filter((e) => e.id !== examId);
  broadcastSync('DELETE_EXAM', { id: examId });
  return state;
}

export function upsertQuestion(question: Question): SyncDataState {
  const index = state.questionBank.findIndex((q) => q.id === question.id);
  if (index >= 0) {
    state.questionBank[index] = question;
  } else {
    state.questionBank = [question, ...state.questionBank];
  }
  broadcastSync('UPSERT_QUESTION', question);
  return state;
}

export function deleteQuestion(questionId: string): SyncDataState {
  state.questionBank = state.questionBank.filter((q) => q.id !== questionId);
  broadcastSync('DELETE_QUESTION', { id: questionId });
  return state;
}

export function submitResult(result: ExamResult): SyncDataState {
  const exists = state.results.some((r) => r.id === result.id);
  if (!exists) {
    state.results = [result, ...state.results];
  } else {
    state.results = state.results.map((r) => (r.id === result.id ? result : r));
  }
  broadcastSync('SUBMIT_RESULT', result);
  return state;
}

export function deleteResult(resultId: string): SyncDataState {
  state.results = state.results.filter((r) => r.id !== resultId);
  broadcastSync('DELETE_RESULT', { id: resultId });
  return state;
}

export function clearResults(resultIds: string[]): SyncDataState {
  const idSet = new Set(resultIds);
  state.results = state.results.filter((r) => !idSet.has(r.id));
  broadcastSync('CLEAR_RESULTS', { ids: resultIds });
  return state;
}

export function upsertUser(user: UserAccount): SyncDataState {
  const index = state.users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    state.users[index] = user;
  } else {
    state.users = [...state.users, user];
  }
  broadcastSync('UPSERT_USER', user);
  return state;
}

export function deleteUser(userId: string): SyncDataState {
  state.users = state.users.filter((u) => u.id !== userId);
  broadcastSync('DELETE_USER', { id: userId });
  return state;
}

export function updatePin(pin: string): SyncDataState {
  state.systemPin = pin;
  broadcastSync('UPDATE_PIN', { pin });
  return state;
}

export function fullSync(incoming: Partial<SyncDataState>): SyncDataState {
  if (Array.isArray(incoming.exams)) {
    // Smart merge: if client has exams with codes not in state, merge them
    const examMap = new Map<string, Exam>();
    state.exams.forEach((e) => examMap.set(e.id, e));
    incoming.exams.forEach((e) => examMap.set(e.id, e));
    state.exams = Array.from(examMap.values());
  }

  if (Array.isArray(incoming.questionBank)) {
    const qMap = new Map<string, Question>();
    state.questionBank.forEach((q) => qMap.set(q.id, q));
    incoming.questionBank.forEach((q) => qMap.set(q.id, q));
    state.questionBank = Array.from(qMap.values());
  }

  if (Array.isArray(incoming.results)) {
    const resMap = new Map<string, ExamResult>();
    state.results.forEach((r) => resMap.set(r.id, r));
    incoming.results.forEach((r) => resMap.set(r.id, r));
    state.results = Array.from(resMap.values());
  }

  if (Array.isArray(incoming.users) && incoming.users.length > 0) {
    const uMap = new Map<string, UserAccount>();
    state.users.forEach((u) => uMap.set(u.id, u));
    incoming.users.forEach((u) => uMap.set(u.id, u));
    state.users = Array.from(uMap.values());
  }

  if (typeof incoming.systemPin === 'string' && incoming.systemPin.trim().length > 0) {
    state.systemPin = incoming.systemPin.trim();
  }

  broadcastSync('FULL_SYNC');
  return state;
}
