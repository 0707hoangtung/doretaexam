/**
 * DORETA'S EXAM - Centralized Persistent Storage Manager
 * Ensures zero-data-loss across page reloads, tab closes, and offline network state.
 */

export const STORAGE_KEYS = {
  QBANK: 'doreta_qbank',
  EXAMS: 'doreta_exams',
  RESULTS: 'doreta_results',
  PIN: 'doreta_pin',
  DRAFT_QUESTIONS: 'doreta_draft_questions',
  DRAFT_FORM: 'doreta_draft_form',
  ACTIVE_SESSION: 'doreta_active_session',
  IS_ADMIN: 'doreta_is_admin',
  CURRENT_USER: 'doreta_current_user',
  USERS: 'doreta_users_list',
  THEME: 'doreta_theme',
  LAST_PUBLISHED_BACKUP: 'doreta_last_published_backup',
  EMERGENCY_BACKUP: 'doreta_emergency_backup',
} as const;

/**
 * Safe get from LocalStorage with fallback and error handling
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] Failed to read key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Sanitize oversized base64 audio in local cache to prevent QuotaExceededError
 */
function sanitizeForLocalCache(val: any): any {
  if (!val) return val;
  if (Array.isArray(val)) {
    return val.map(sanitizeForLocalCache);
  }
  if (typeof val === 'object') {
    const copy: any = { ...val };
    if (copy.questions && Array.isArray(copy.questions)) {
      copy.questions = copy.questions.map((q: any) => {
        if (q && q.audio && typeof q.audio === 'string' && q.audio.startsWith('data:') && q.audio.length > 50000) {
          return { ...q, audio: `cloud-media://audio_${copy.id || 'exam'}_${q.id || 'q'}` };
        }
        return q;
      });
    }
    if (copy.audio && typeof copy.audio === 'string' && copy.audio.startsWith('data:') && copy.audio.length > 50000) {
      copy.audio = `cloud-media://audio_item_${copy.id || 'item'}`;
    }
    return copy;
  }
  return val;
}

/**
 * Safe set to LocalStorage with quota protection & error handling
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    // If serialized is larger than 1.5MB, proactively sanitize to prevent quota crash
    if (serialized.length > 1500000) {
      const sanitized = sanitizeForLocalCache(value);
      localStorage.setItem(key, JSON.stringify(sanitized));
      return true;
    }
    localStorage.setItem(key, serialized);
    return true;
  } catch (error: any) {
    // If quota exceeded, sanitize large audio strings and retry
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      try {
        const sanitized = sanitizeForLocalCache(value);
        localStorage.setItem(key, JSON.stringify(sanitized));
        return true;
      } catch (retryErr) {
        console.warn(`[Storage] Quota exceeded on key "${key}" even after sanitization.`);
        return false;
      }
    }
    console.error(`[Storage] Failed to write key "${key}":`, error);
    return false;
  }
}

/**
 * Safe remove key from LocalStorage
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to delete key "${key}":`, error);
  }
}

/**
 * Interface for active student exam session persistence
 */
export interface ActiveExamSession {
  exam: any;
  questions: any[];
  answers: Record<string | number, any>;
  secondsLeft: number;
  examStartTime: number;
  tabSwitchCount: number;
  studentName: string;
  studentSbd?: string; // Số báo danh
  studentClass: string;
  examCode: string;
  savedTimestamp: number;
}
