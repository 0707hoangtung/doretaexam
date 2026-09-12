import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { Exam, ExamResult, Question, UserAccount } from '../types';
import { initialExams, initialQuestionBank } from '../data/sampleData';
import { uploadAudioToCloudChunks, resolveAudioUrl } from '../utils/mediaStorage';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfigData) : getApp();

// Initialize Firestore with custom databaseId if present
export const db: Firestore = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Verify initial connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system_settings', 'global'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline, running with local cached state.');
    }
  }
}
testConnection();

// Firestore Collection Names
export const COLLECTIONS = {
  SETTINGS: 'system_settings',
  EXAMS: 'exams',
  QBANK: 'question_bank',
  RESULTS: 'exam_results',
  USERS: 'users',
} as const;

// -------------------------------------------------------------
// SYSTEM SETTINGS (Admin PIN & Global Config)
// -------------------------------------------------------------

export async function fetchSystemPin(): Promise<string> {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'global');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.adminPin) {
      return snap.data().adminPin;
    }
    // If not exists, initialize with default PIN 'Tunganh7787'
    await setDoc(docRef, { adminPin: 'Tunganh7787', updatedAt: new Date().toISOString() });
    return 'Tunganh7787';
  } catch (error) {
    console.warn('[Firebase] fetchSystemPin fallback:', error);
    return 'Tunganh7787';
  }
}

export async function updateSystemPin(newPin: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'global');
    await setDoc(docRef, {
      adminPin: newPin,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] updateSystemPin error:', error);
    return false;
  }
}

export function subscribeSystemPin(callback: (pin: string) => void): () => void {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'global');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists() && snap.data()?.adminPin) {
        callback(snap.data().adminPin);
      }
    },
    (err) => {
      console.warn('[Firebase] subscribeSystemPin error:', err);
    }
  );
}

// -------------------------------------------------------------
// HELPER: Deep Recursive Sanitizer for Firestore
// -------------------------------------------------------------
/**
 * Recursively sanitize any object or array for Firestore:
 * - Removes keys with `undefined` values completely
 * - Recursively processes nested objects and arrays of objects (questions, options, blanks, pairs)
 * - Ensures 100% compliance with Firestore constraints so setDoc never rejects with "Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(data: T): any {
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned;
}

// -------------------------------------------------------------
// EXAMS (Real-time Cloud Sync)
// -------------------------------------------------------------

export function subscribeExams(callback: (exams: Exam[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.EXAMS);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }

      const list: Exam[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Exam);
      });
      // Sort newest created first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      // Immediately notify listeners with the current exam documents
      callback(list);

      // In background, resolve any cloud-media references and re-emit when resolved
      const hasCloudMedia = list.some((e) =>
        e.questions?.some((q) => q.audio && q.audio.startsWith('cloud-media://'))
      );

      if (hasCloudMedia) {
        Promise.all(
          list.map(async (exam) => {
            const resolvedQuestions = await Promise.all(
              (exam.questions || []).map(async (q) => {
                if (q.audio && q.audio.startsWith('cloud-media://')) {
                  const resolvedAudio = await resolveAudioUrl(q.audio);
                  return { ...q, audio: resolvedAudio };
                }
                return q;
              })
            );
            return { ...exam, questions: resolvedQuestions };
          })
        )
          .then((resolvedList) => {
            callback(resolvedList);
          })
          .catch((err) => {
            console.warn('[Firebase] Background exam media resolution warning:', err);
          });
      }
    },
    (error) => {
      console.warn('[Firebase] subscribeExams error:', error);
    }
  );
}

export async function saveExamToCloud(exam: Exam): Promise<boolean> {
  try {
    // Process large audio files on questions to avoid 1MB Firestore limit
    const processedQuestions = await Promise.all(
      (exam.questions || []).map(async (q) => {
        if (q.audio && q.audio.startsWith('data:')) {
          const safeExamId = (exam.id || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
          const safeQId = (q.id || 'q').replace(/[^a-zA-Z0-9_-]/g, '_');
          const mediaId = `audio_${safeExamId}_${safeQId}`;
          const cloudRef = await uploadAudioToCloudChunks(mediaId, q.audio, q.audioName);
          return {
            ...q,
            audio: cloudRef,
          };
        }
        return q;
      })
    );

    const examToSave: Exam = {
      ...exam,
      questions: processedQuestions,
    };

    const docRef = doc(db, COLLECTIONS.EXAMS, exam.id);
    const sanitizedExam = sanitizeForFirestore(examToSave);
    await setDoc(docRef, sanitizedExam, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] saveExamToCloud error:', error);
    return false;
  }
}

export async function deleteExamFromCloud(examId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.EXAMS, examId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('[Firebase] deleteExamFromCloud error:', error);
    return false;
  }
}

// -------------------------------------------------------------
// QUESTION BANK (Real-time Cloud Sync)
// -------------------------------------------------------------

export function subscribeQuestionBank(callback: (questions: Question[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.QBANK);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }

      const list: Question[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Question);
      });
      callback(list);

      // In background, resolve any cloud-media references in question bank
      const hasCloudMedia = list.some((q) => q.audio && q.audio.startsWith('cloud-media://'));
      if (hasCloudMedia) {
        Promise.all(
          list.map(async (q) => {
            if (q.audio && q.audio.startsWith('cloud-media://')) {
              const resolvedAudio = await resolveAudioUrl(q.audio);
              return { ...q, audio: resolvedAudio };
            }
            return q;
          })
        )
          .then((resolvedList) => {
            callback(resolvedList);
          })
          .catch((err) => {
            console.warn('[Firebase] Background question bank media resolution warning:', err);
          });
      }
    },
    (error) => {
      console.warn('[Firebase] subscribeQuestionBank error:', error);
    }
  );
}

export async function saveQuestionToCloud(question: Question): Promise<boolean> {
  try {
    let qToSave = question;
    if (question.audio && question.audio.startsWith('data:')) {
      const safeQId = (question.id || 'q').replace(/[^a-zA-Z0-9_-]/g, '_');
      const mediaId = `audio_qbank_${safeQId}`;
      const cloudRef = await uploadAudioToCloudChunks(mediaId, question.audio, question.audioName);
      qToSave = { ...question, audio: cloudRef };
    }
    const docRef = doc(db, COLLECTIONS.QBANK, qToSave.id);
    const sanitizedQ = sanitizeForFirestore(qToSave);
    await setDoc(docRef, sanitizedQ, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] saveQuestionToCloud error:', error);
    return false;
  }
}

export async function deleteQuestionFromCloud(questionId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.QBANK, questionId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('[Firebase] deleteQuestionFromCloud error:', error);
    return false;
  }
}

// -------------------------------------------------------------
// EXAM RESULTS (Submissions Real-time Sync)
// -------------------------------------------------------------

export function subscribeExamResults(callback: (results: ExamResult[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.RESULTS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ExamResult[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ExamResult);
      });
      // Sort newest submission first
      list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      callback(list);
    },
    (error) => {
      console.warn('[Firebase] subscribeExamResults error:', error);
    }
  );
}

export async function submitExamResultToCloud(result: ExamResult): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.RESULTS, result.id);
    const sanitizedResult = sanitizeForFirestore(result);
    await setDoc(docRef, sanitizedResult, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] submitExamResultToCloud error:', error);
    return false;
  }
}

export async function deleteExamResultFromCloud(resultId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.RESULTS, resultId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('[Firebase] deleteExamResultFromCloud error:', error);
    return false;
  }
}

// -------------------------------------------------------------
// USER ACCOUNTS & RBAC MANAGEMENT
// -------------------------------------------------------------

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

export function subscribeUsers(callback: (users: UserAccount[]) => void): () => void {
  const colRef = collection(db, COLLECTIONS.USERS);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed default super admin account
        try {
          await setDoc(doc(db, COLLECTIONS.USERS, DEFAULT_ROOT_ADMIN.id), sanitizeForFirestore(DEFAULT_ROOT_ADMIN));
          callback([DEFAULT_ROOT_ADMIN]);
          return;
        } catch (e) {
          console.warn('[Firebase] Seed root admin error:', e);
          return;
        }
      }

      const list: UserAccount[] = [];
      let hasAdmin = false;
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserAccount;
        if (u && u.id && u.username) {
          list.push(u);
          if (u.role === 'super_admin' || u.username === 'admin') {
            hasAdmin = true;
          }
        }
      });

      // Ensure root admin exists
      if (!hasAdmin && list.length > 0) {
        try {
          await setDoc(doc(db, COLLECTIONS.USERS, DEFAULT_ROOT_ADMIN.id), sanitizeForFirestore(DEFAULT_ROOT_ADMIN));
          list.unshift(DEFAULT_ROOT_ADMIN);
        } catch {}
      }

      callback(list);
    },
    (error) => {
      console.warn('[Firebase] subscribeUsers error:', error);
    }
  );
}

export async function saveUserToCloud(user: UserAccount): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, user.id);
    const cleaned = sanitizeForFirestore(user);
    await setDoc(docRef, cleaned, { merge: true });
    return true;
  } catch (error) {
    console.error('[Firebase] saveUserToCloud error:', error);
    return false;
  }
}

export async function deleteUserFromCloud(userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('[Firebase] deleteUserFromCloud error:', error);
    return false;
  }
}

/**
 * Manually or automatically trigger full synchronization of all data to Cloud Firestore
 * Also reconciles and purges any deleted documents from Firestore
 */
export async function syncAllLocalDataToCloud(
  exams: Exam[],
  bank: Question[],
  results: ExamResult[],
  users: UserAccount[]
): Promise<{ examsSynced: number; questionsSynced: number; resultsSynced: number; usersSynced: number }> {
  let examsSynced = 0;
  let questionsSynced = 0;
  let resultsSynced = 0;
  let usersSynced = 0;

  // 1. Clean up deleted exams from Firestore
  try {
    const examSnapshot = await getDocs(collection(db, COLLECTIONS.EXAMS));
    const currentExamIds = new Set(exams.map((e) => e.id));
    for (const docSnap of examSnapshot.docs) {
      if (!currentExamIds.has(docSnap.id)) {
        await deleteDoc(doc(db, COLLECTIONS.EXAMS, docSnap.id));
      }
    }
  } catch (err) {
    console.warn('[Firebase] Exam cleanup error:', err);
  }

  for (const ex of exams) {
    const success = await saveExamToCloud(ex);
    if (success) examsSynced++;
  }

  // 2. Clean up deleted questions from Firestore
  try {
    const bankSnapshot = await getDocs(collection(db, COLLECTIONS.QBANK));
    const currentQIds = new Set(bank.map((q) => q.id));
    for (const docSnap of bankSnapshot.docs) {
      if (!currentQIds.has(docSnap.id)) {
        await deleteDoc(doc(db, COLLECTIONS.QBANK, docSnap.id));
      }
    }
  } catch (err) {
    console.warn('[Firebase] Question bank cleanup error:', err);
  }

  for (const q of bank) {
    const success = await saveQuestionToCloud(q);
    if (success) questionsSynced++;
  }

  for (const res of results) {
    const success = await submitExamResultToCloud(res);
    if (success) resultsSynced++;
  }

  for (const u of users) {
    const success = await saveUserToCloud(u);
    if (success) usersSynced++;
  }

  return { examsSynced, questionsSynced, resultsSynced, usersSynced };
}

