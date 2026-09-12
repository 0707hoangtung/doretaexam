import { Question, Exam } from '../types';

/**
 * Split questions into standard MOET parts:
 * - Part I: Multiple Choice ABCD ('mc')
 * - Part II: True / False ('tf')
 * - Part III: Short Answer ('short')
 * - Part IV: Essay if any ('essay')
 */
export function getExamParts(questions: Question[]) {
  const part1 = questions.filter((q) => q.type === 'mc');
  const part2 = questions.filter((q) => q.type === 'tf');
  const part3 = questions.filter((q) => q.type === 'short');
  const part4 = questions.filter((q) => q.type === 'essay');

  return { part1, part2, part3, part4 };
}

/**
 * Sort questions strictly into 3 MOET parts (Part I -> Part II -> Part III -> Part IV)
 */
export function sortQuestionsByMOETStructure(questions: Question[]): Question[] {
  const { part1, part2, part3, part4 } = getExamParts(questions);
  return [...part1, ...part2, ...part3, ...part4];
}

/**
 * Prepare and shuffle questions according to strict MOET rules:
 * 1. PHẦN I (Trắc nghiệm ABCD):
 *    - Cho phép xáo trộn thứ tự các câu trong Phần I (nếu shuffleQs = true)
 *    - Cho phép xáo trộn các ý lựa chọn trong mỗi câu (nếu shuffleOpts = true), nhưng nhãn luôn giữ nguyên A, B, C, D theo thứ tự
 * 2. PHẦN II (Trắc nghiệm Đúng/Sai):
 *    - Cho phép xáo trộn thứ tự các câu trong Phần II (nếu shuffleQs = true)
 *    - TUYỆT ĐỐI KHÔNG XÁO TRỘN các ý trong mỗi câu (Trình tự luôn luôn giữ nguyên a), b), c), d))
 * 3. PHẦN III (Trả lời ngắn):
 *    - Cho phép xáo trộn thứ tự các câu trong Phần III (nếu shuffleQs = true)
 * 4. PHẦN IV (Tự luận nếu có):
 *    - Cho phép xáo trộn thứ tự các câu trong Phần IV (nếu shuffleQs = true)
 *
 * Toàn bộ đề thi LUÔN duy trì cấu trúc 3 phần từ trên xuống dưới: PHẦN I -> PHẦN II -> PHẦN III!
 */
export function shuffleExamQuestions(
  questions: Question[],
  shuffleQs: boolean,
  shuffleOpts: boolean
): Question[] {
  let { part1, part2, part3, part4 } = getExamParts(questions);

  // 1. PHẦN I: Trắc nghiệm ABCD
  let processedPart1 = [...part1];
  if (shuffleQs) {
    // Group consecutive questions sharing the same groupStem/groupId so they stay together
    const chunks: Question[][] = [];
    let currentChunk: Question[] = [];
    let currentGroupId: string | null = null;

    for (const q of processedPart1) {
      const gId = q.groupId || (q.groupStem && q.groupStem.trim() ? q.groupStem.trim() : null);
      if (gId) {
        if (currentGroupId === gId) {
          currentChunk.push(q);
        } else {
          if (currentChunk.length > 0) chunks.push(currentChunk);
          currentChunk = [q];
          currentGroupId = gId;
        }
      } else {
        if (currentChunk.length > 0) chunks.push(currentChunk);
        chunks.push([q]);
        currentChunk = [];
        currentGroupId = null;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    // Shuffle chunk units
    chunks.sort(() => Math.random() - 0.5);
    processedPart1 = chunks.flat();
  }
  processedPart1 = processedPart1.map((q) => {
    if (q.type === 'mc' && q.options) {
      const getOpt = (k: 'A' | 'B' | 'C' | 'D') =>
        q.options?.[k] ?? (q.options as any)?.[k.toLowerCase()] ?? '';

      const correctKey = (q.correctAnswer || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const correctValue = getOpt(correctKey);

      if (shuffleOpts) {
        const optionValues = [getOpt('A'), getOpt('B'), getOpt('C'), getOpt('D')];
        // Shuffle option contents
        optionValues.sort(() => Math.random() - 0.5);

        const newOptions: { A: string; B: string; C: string; D: string } = {
          A: optionValues[0] || '',
          B: optionValues[1] || '',
          C: optionValues[2] || '',
          D: optionValues[3] || '',
        };

        let newCorrectKey = 'A';
        const labels: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        labels.forEach((label) => {
          if (newOptions[label] === correctValue) {
            newCorrectKey = label;
          }
        });

        return {
          ...q,
          options: newOptions,
          correctAnswer: newCorrectKey,
        };
      } else {
        // Keep original content in strict A, B, C, D order
        return {
          ...q,
          options: {
            A: getOpt('A'),
            B: getOpt('B'),
            C: getOpt('C'),
            D: getOpt('D'),
          },
          correctAnswer: correctKey,
        };
      }
    }
    return q;
  });

  // 2. PHẦN II: Trắc nghiệm Đúng / Sai
  let processedPart2 = [...part2];
  if (shuffleQs) {
    // Xáo trộn thứ tự các câu trong Phần II
    processedPart2.sort(() => Math.random() - 0.5);
  }
  // TUYỆT ĐỐI KHÔNG XÁO TRỘN CÁC Ý TRONG MỖI CÂU (Giữ nguyên vẹn 100% trình tự a, b, c, d gốc)
  processedPart2 = processedPart2.map((q) => {
    if (q.type === 'tf' && q.statements) {
      const getVal = (k: string) =>
        q.statements?.[k as 'a' | 'b' | 'c' | 'd'] ??
        (q.statements as any)?.[k.toUpperCase()] ??
        '';
      const getAns = (k: string) =>
        q.correctAnswers?.[k as 'a' | 'b' | 'c' | 'd'] ??
        (q.correctAnswers as any)?.[k.toUpperCase()] ??
        'true';

      return {
        ...q,
        statements: {
          a: getVal('a'),
          b: getVal('b'),
          c: getVal('c'),
          d: getVal('d'),
        },
        correctAnswers: {
          a: getAns('a'),
          b: getAns('b'),
          c: getAns('c'),
          d: getAns('d'),
        },
      };
    }
    return q;
  });

  // 3. PHẦN III: Trả lời ngắn
  let processedPart3 = [...part3];
  if (shuffleQs) {
    processedPart3.sort(() => Math.random() - 0.5);
  }

  // 4. PHẦN IV: Tự luận nếu có
  let processedPart4 = [...part4];
  if (shuffleQs) {
    processedPart4.sort(() => Math.random() - 0.5);
  }

  // Kết hợp luôn đảm bảo thứ tự Phần I -> Phần II -> Phần III -> Phần IV
  return [...processedPart1, ...processedPart2, ...processedPart3, ...processedPart4];
}

export interface ExamVariantConfig {
  variantCount: number; // 1 to 4
  baseTitle: string;
  baseCode: string;
  duration: number;
  description: string;
  shuffleQs: boolean;
  shuffleOpts: boolean;
  variantCodes: string[];
  keepMasterAsFirst?: boolean;
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
}

/**
 * Generate 1 to 4 exam variants from a master set of draft questions
 */
export function generateExamVariants(
  masterQuestions: Question[],
  config: ExamVariantConfig
): Exam[] {
  const count = Math.min(4, Math.max(1, config.variantCount || 1));
  const masterSorted = sortQuestionsByMOETStructure(masterQuestions);
  const variants: Exam[] = [];

  const baseTitle = config.baseTitle.trim() || 'Đề Thi';
  const duration = Number(config.duration) || 45;
  const description = config.description || '';
  const shuffleQs = !!config.shuffleQs;
  const shuffleOpts = !!config.shuffleOpts;
  const keepMasterFirst = config.keepMasterAsFirst ?? (count > 1);

  for (let i = 0; i < count; i++) {
    const rawCode = config.variantCodes[i] || (count === 1 ? config.baseCode : `${config.baseCode || '10'}${i + 1}`);
    const code = rawCode.trim().toUpperCase() || `EX-${101 + i}`;
    const isMaster = i === 0;

    let variantQuestions: Question[];
    if (isMaster && keepMasterFirst && count > 1) {
      // Đề 1 giữ nguyên thứ tự câu hỏi và phương án của đề gốc
      variantQuestions = shuffleExamQuestions(masterSorted, false, false);
    } else {
      // Các đề sau (hoặc tất cả các đề nếu không giữ đề gốc) được xáo trộn độc lập
      variantQuestions = shuffleExamQuestions(masterSorted, shuffleQs, shuffleOpts);
    }

    const stampedQuestions = variantQuestions.map((q, qIdx) => ({
      ...q,
      id: `q-var-${i + 1}-${qIdx + 1}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      authorId: config.authorId || 'admin',
      authorName: config.authorName || 'Quản trị viên',
      authorUsername: config.authorUsername || 'admin',
    }));

    const variantTitle = count > 1 ? `${baseTitle} - [Mã đề ${code}]` : baseTitle;

    const variantExam: Exam = {
      id: `exam-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
      title: variantTitle,
      code,
      duration,
      shuffleQs,
      shuffleOpts,
      description,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      authorId: config.authorId || 'admin',
      authorName: config.authorName || 'Quản trị viên',
      authorUsername: config.authorUsername || 'admin',
      questions: stampedQuestions,
    };

    variants.push(variantExam);
  }

  return variants;
}

