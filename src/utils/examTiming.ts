/**
 * Exam Timing & Access Control Utilities
 * Handles start time (giờ mở đề), end time (giờ đóng đề), live countdowns, and access status
 */

export interface ExamTimingInfo {
  status: 'upcoming' | 'open' | 'closed';
  isRestricted: boolean;
  startFormatted: string | null;
  endFormatted: string | null;
  timeUntilStartMs: number;
  timeUntilEndMs: number;
  message: string;
}

/**
 * Format ISO or datetime string into friendly Vietnamese format:
 * e.g. "08:30, 22/09/2026"
 */
export function formatExamDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${hours}:${minutes}, ${day}/${month}/${year}`;
}

/**
 * Format milliseconds into friendly countdown string:
 * e.g. "2 ngày 05:32:10" or "01:15:30" or "45 giây"
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days} ngày ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Determine the current status of an exam regarding start & end schedule:
 * - 'upcoming': Current time is before startTime. Students cannot enter yet.
 * - 'open': Current time is within the allowed window (or no restrictions set).
 * - 'closed': Current time is past endTime. Exam is permanently closed.
 */
export function getExamTimeStatus(
  exam: { startTime?: string | null; endTime?: string | null },
  nowMs = Date.now()
): ExamTimingInfo {
  const startMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
  const endMs = exam.endTime ? new Date(exam.endTime).getTime() : null;

  const isRestricted = Boolean(startMs || endMs);
  const startFormatted = startMs && !isNaN(startMs) ? formatExamDateTime(exam.startTime) : null;
  const endFormatted = endMs && !isNaN(endMs) ? formatExamDateTime(exam.endTime) : null;

  // Case 1: Exam has not reached start time yet
  if (startMs && !isNaN(startMs) && nowMs < startMs) {
    const timeUntilStartMs = startMs - nowMs;
    return {
      status: 'upcoming',
      isRestricted: true,
      startFormatted,
      endFormatted,
      timeUntilStartMs,
      timeUntilEndMs: endMs && !isNaN(endMs) ? Math.max(0, endMs - nowMs) : 0,
      message: `Chưa đến giờ mở đề thi (Mở lúc ${startFormatted})`,
    };
  }

  // Case 2: Exam has passed end time
  if (endMs && !isNaN(endMs) && nowMs > endMs) {
    return {
      status: 'closed',
      isRestricted: true,
      startFormatted,
      endFormatted,
      timeUntilStartMs: 0,
      timeUntilEndMs: 0,
      message: `Đề thi đã đóng hoàn toàn vào lúc ${endFormatted}`,
    };
  }

  // Case 3: Exam is currently open
  const timeUntilEndMs = endMs && !isNaN(endMs) ? Math.max(0, endMs - nowMs) : Infinity;
  return {
    status: 'open',
    isRestricted,
    startFormatted,
    endFormatted,
    timeUntilStartMs: 0,
    timeUntilEndMs,
    message: isRestricted
      ? endFormatted
        ? `Đang mở làm bài (Đóng lúc ${endFormatted})`
        : `Đang mở làm bài (Đã mở lúc ${startFormatted})`
      : 'Mở tự do',
  };
}
