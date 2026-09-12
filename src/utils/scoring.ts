import { Exam } from '../types';

export interface ScoreBreakdown {
  finalScore: number; // Điểm quy đổi thang 10 (0 - 10.0)
  rawEarnedScore: number; // Tổng điểm thực tế đạt được
  rawMaxScore: number; // Tổng điểm tối đa của đề thi
  totalEarnedWeight: number; // Alias for backward compatibility
  maxPossibleWeight: number; // Alias for backward compatibility
  partDetails: {
    qIndex: number;
    type: string;
    earned: number;
    max: number;
    correctCount?: number; // Số ý đúng đối với câu hỏi Đúng/Sai (0-4)
    isFullScore: boolean;
    note?: string;
  }[];
}

/**
 * Quy chuẩn thang điểm theo quy định của Bộ Giáo dục & Đào tạo Việt Nam:
 * 1. Trắc nghiệm nhiều lựa chọn 4 phương án (ABCD):
 *    - Mỗi câu đúng: 0.25 điểm (Tối đa: 0.25 điểm)
 * 2. Trắc nghiệm Đúng / Sai (4 ý a, b, c, d):
 *    - Đúng 1 ý / 4 ý: 0.10 điểm
 *    - Đúng 2 ý / 4 ý: 0.25 điểm
 *    - Đúng 3 ý / 4 ý: 0.50 điểm
 *    - Đúng 4 ý / 4 ý: 1.00 điểm
 *    - (Tối đa: 1.00 điểm)
 * 3. Câu hỏi Trả lời ngắn:
 *    - Mỗi câu đúng: 0.50 điểm (Tối đa: 0.50 điểm)
 * 4. Câu hỏi Tự luận:
 *    - Trình bày đúng: 1.00 điểm (Tối đa: 1.00 điểm)
 */
export function calculateMOETScore(
  exam: Exam,
  answers: Record<string | number, any>
): ScoreBreakdown {
  if (!exam || !exam.questions || exam.questions.length === 0) {
    return {
      finalScore: 0,
      rawEarnedScore: 0,
      rawMaxScore: 0,
      totalEarnedWeight: 0,
      maxPossibleWeight: 0,
      partDetails: [],
    };
  }

  let rawEarned = 0;
  let rawMax = 0;
  const partDetails: ScoreBreakdown['partDetails'] = [];

  exam.questions.forEach((q, idx) => {
    const userAns = answers ? answers[idx] : null;
    let earned = 0;
    let max = 0.25;
    let note = '';
    let correctCount = 0;

    if (q.type === 'mc') {
      // 1. Trắc nghiệm 4 phương án (ABCD): mặc định 0.25 điểm / câu, hoặc điểm tùy chỉnh do giáo viên gán
      const customPoints = typeof q.points === 'number' && q.points > 0 ? q.points : 0.25;
      max = customPoints;
      if (
        userAns !== undefined &&
        userAns !== null &&
        q.correctAnswer !== undefined &&
        q.correctAnswer !== null
      ) {
        const uStr = String(userAns).trim().toUpperCase();
        const cStr = String(q.correctAnswer).trim().toUpperCase();
        if (uStr === cStr) {
          earned = customPoints;
          note = `Đúng đáp án (+${customPoints}đ)`;
        } else {
          note = `Sai (Chọn: ${uStr}, Đúng: ${cStr})`;
        }
      } else {
        note = 'Chưa trả lời (0đ)';
      }
    } else if (q.type === 'tf') {
      // 2. Trắc nghiệm Đúng / Sai: tối đa 1.0 điểm / câu
      max = 1.0;
      if (userAns && typeof userAns === 'object' && q.correctAnswers) {
        const keys: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];
        keys.forEach((k) => {
          if (
            userAns[k] !== undefined &&
            userAns[k] !== null &&
            q.correctAnswers?.[k] !== undefined
          ) {
            const uVal = String(userAns[k]).trim().toLowerCase();
            const cVal = String(q.correctAnswers[k]).trim().toLowerCase();
            if (uVal === cVal) {
              correctCount++;
            }
          }
        });

        // Bậc tính điểm Bộ GD&ĐT:
        // - Đúng 1/4 ý: 0.10 điểm
        // - Đúng 2/4 ý: 0.25 điểm
        // - Đúng 3/4 ý: 0.50 điểm
        // - Đúng 4/4 ý: 1.00 điểm
        if (correctCount === 1) earned = 0.1;
        else if (correctCount === 2) earned = 0.25;
        else if (correctCount === 3) earned = 0.5;
        else if (correctCount === 4) earned = 1.0;
        else earned = 0;

        note = `Đúng ${correctCount}/4 ý (+${earned}đ)`;
      } else {
        note = 'Chưa trả lời (0đ)';
      }
    } else if (q.type === 'short') {
      // 3. Trả lời ngắn: mặc định 0.5 điểm / câu, hoặc điểm tùy chỉnh do giáo viên gán
      const customPoints = typeof q.points === 'number' && q.points > 0 ? q.points : 0.5;
      max = customPoints;
      if (
        userAns !== undefined &&
        userAns !== null &&
        q.correctAnswer !== undefined &&
        q.correctAnswer !== null
      ) {
        const normalize = (s: string) =>
          s
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/,/g, '.');
        const uStr = normalize(String(userAns));
        const cStr = normalize(String(q.correctAnswer));
        if (uStr === cStr || uStr === String(q.correctAnswer).trim().toLowerCase()) {
          earned = customPoints;
          note = `Đúng kết quả (+${customPoints}đ)`;
        } else {
          note = `Sai (Điền: "${userAns}", Đúng: "${q.correctAnswer}")`;
        }
      } else {
        note = 'Chưa điền đáp án (0đ)';
      }
    } else if (q.type === 'essay') {
      // 4. Tự luận: 1.0 điểm / câu
      max = 1.0;
      if (userAns && typeof userAns === 'string' && userAns.trim().length > 0) {
        earned = 1.0;
        note = 'Đã nộp bài tự luận (+1.0đ)';
      } else {
        note = 'Chưa làm bài tự luận (0đ)';
      }
    }

    rawEarned += earned;
    rawMax += max;

    partDetails.push({
      qIndex: idx,
      type: q.type,
      earned: Math.round(earned * 100) / 100,
      max,
      correctCount: q.type === 'tf' ? correctCount : undefined,
      isFullScore: earned >= max,
      note,
    });
  });

  const roundedRawEarned = Math.round(rawEarned * 100) / 100;
  const roundedRawMax = Math.round(rawMax * 100) / 100;

  // Điểm số cuối cùng chính là tổng điểm thô thực tế đạt được (không quy đổi, giữ nguyên giá trị thực tế)
  const finalScore = roundedRawEarned;

  return {
    finalScore,
    rawEarnedScore: roundedRawEarned,
    rawMaxScore: roundedRawMax,
    totalEarnedWeight: roundedRawEarned,
    maxPossibleWeight: roundedRawMax,
    partDetails,
  };
}

