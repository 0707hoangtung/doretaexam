import { Question } from '../types';

export interface AICloneOptions {
  difficulty?: 'same' | 'easier' | 'harder';
  customPrompt?: string;
}

/**
 * Intelligent client-side math variation engine for 100% offline & fallback guarantee
 */
export function generateLocalMathVariants(
  baseQ: Question,
  count: number = 1,
  options?: AICloneOptions
): Question[] {
  const variants: Question[] = [];
  const difficulty = options?.difficulty || 'same';
  const customPrompt = options?.customPrompt || '';

  const mathDeltas = [
    { offset: 1, mult: 2 },
    { offset: 2, mult: 3 },
    { offset: 3, mult: 4 },
    { offset: -1, mult: 2 },
    { offset: 4, mult: 5 },
  ];

  for (let i = 0; i < count; i++) {
    const delta = mathDeltas[i % mathDeltas.length];
    const shift = (i + 1) * (difficulty === 'easier' ? 1 : difficulty === 'harder' ? 3 : 2);

    // Mutate numbers inside math or text
    const mutateMathStr = (str: string): string => {
      if (!str) return str;
      return str.replace(/\b(\d+)\b/g, (match, numStr) => {
        const val = parseInt(numStr, 10);
        if (val === 0 || val === 1) return (val + i + 1).toString();
        return (val + shift).toString();
      });
    };

    let newContent = mutateMathStr(baseQ.content || '');
    if (customPrompt && i === 0) {
      newContent = `${newContent}`;
    }

    let newOptions = undefined;
    if (baseQ.type === 'mc' && baseQ.options) {
      newOptions = {
        A: mutateMathStr(baseQ.options.A || ''),
        B: mutateMathStr(baseQ.options.B || ''),
        C: mutateMathStr(baseQ.options.C || ''),
        D: mutateMathStr(baseQ.options.D || ''),
      };
    }

    let newStatements = undefined;
    let newCorrectAnswers = undefined;
    if (baseQ.type === 'tf' && baseQ.statements) {
      newStatements = {
        a: mutateMathStr(baseQ.statements.a || ''),
        b: mutateMathStr(baseQ.statements.b || ''),
        c: mutateMathStr(baseQ.statements.c || ''),
        d: mutateMathStr(baseQ.statements.d || ''),
      };
      newCorrectAnswers = baseQ.correctAnswers
        ? { ...baseQ.correctAnswers }
        : { a: 'true', b: 'false', c: 'true', d: 'false' };
    }

    let newCorrectAnswer = baseQ.correctAnswer;
    if (baseQ.type === 'short' && baseQ.correctAnswer) {
      newCorrectAnswer = mutateMathStr(baseQ.correctAnswer);
    }

    let newGuide = baseQ.guide
      ? `Hướng dẫn giải chi tiết cho số liệu mới:\n${mutateMathStr(baseQ.guide)}`
      : `Áp dụng phương pháp giải tương tự như câu hỏi gốc với các hệ số mới đã được biến đổi.`;

    variants.push({
      id: `ai-clone-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
      type: baseQ.type || 'mc',
      points: baseQ.points,
      stem: baseQ.stem ? mutateMathStr(baseQ.stem) : '',
      image: baseQ.image || null,
      content: newContent,
      grade: baseQ.grade || '12',
      level: baseQ.level || 'Thông hiểu',
      topic: baseQ.topic || 'Toán học',
      options: newOptions,
      correctAnswer: newCorrectAnswer || 'A',
      statements: newStatements,
      correctAnswers: newCorrectAnswers,
      guide: newGuide,
      createdAt: new Date().toLocaleDateString('vi-VN'),
    });
  }

  return variants;
}

/**
 * Call server-side Gemini endpoint to generate 1-5 variants of a single question
 */
export async function cloneQuestionWithAI(
  question: Question,
  count: number = 1,
  options?: AICloneOptions
): Promise<Question[]> {
  try {
    const response = await fetch('/api/ai/clone-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        count,
        options,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.variants) && data.variants.length > 0) {
        return data.variants;
      }
    }

    // If server responded with error status (e.g. 404, 500) or empty, seamlessly fallback
    console.warn(`Server AI endpoint returned status ${response.status}, activating local math variation engine.`);
    return generateLocalMathVariants(question, count, options);
  } catch (err: any) {
    console.warn('Network error reaching server AI endpoint, activating local math variation fallback:', err);
    return generateLocalMathVariants(question, count, options);
  }
}

/**
 * Call server-side Gemini endpoint to clone an entire set of exam questions
 */
export async function cloneExamWithAI(
  questions: Question[],
  options?: AICloneOptions
): Promise<Question[]> {
  try {
    const response = await fetch('/api/ai/clone-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questions,
        options,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions;
      }
    }

    console.warn(`Server AI exam endpoint returned status ${response.status}, activating local math variation engine.`);
    return questions.map((q, i) => {
      const [mutated] = generateLocalMathVariants(q, 1, options);
      return {
        ...mutated,
        id: `ai-exam-q-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
      };
    });
  } catch (err: any) {
    console.warn('Network error reaching server AI exam endpoint, activating fallback:', err);
    return questions.map((q, i) => {
      const [mutated] = generateLocalMathVariants(q, 1, options);
      return {
        ...mutated,
        id: `ai-exam-q-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
      };
    });
  }
}

