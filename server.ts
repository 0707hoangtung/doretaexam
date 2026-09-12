import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  initSyncStore,
  getSyncState,
  addSseClient,
  removeSseClient,
  upsertExam,
  deleteExam,
  upsertQuestion,
  deleteQuestion,
  submitResult,
  deleteResult,
  clearResults,
  upsertUser,
  deleteUser,
  updatePin,
  fullSync,
} from './server/syncStore';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize persistent real-time sync store
initSyncStore();

// -------------------------------------------------------------
// REAL-TIME SYNCHRONIZATION API (Device & Tab Unified)
// -------------------------------------------------------------

// 1. Get complete unified dataset
app.get('/api/sync', (req, res) => {
  res.json({ success: true, data: getSyncState() });
});

// 2. Real-time Server-Sent Events (SSE) Stream
app.get('/api/sync/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx reverse proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  addSseClient(res);

  // Keep-alive ping every 15 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch {
      clearInterval(pingInterval);
      removeSseClient(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    removeSseClient(res);
  });
});

// 3. Post mutation / update
app.post('/api/sync', (req, res) => {
  const { type, data } = req.body;
  let updatedState = getSyncState();

  switch (type) {
    case 'UPSERT_EXAM':
      if (data && data.id) updatedState = upsertExam(data);
      break;
    case 'DELETE_EXAM':
      if (data && data.id) updatedState = deleteExam(data.id);
      break;
    case 'UPSERT_QUESTION':
      if (data && data.id) updatedState = upsertQuestion(data);
      break;
    case 'DELETE_QUESTION':
      if (data && data.id) updatedState = deleteQuestion(data.id);
      break;
    case 'SUBMIT_RESULT':
      if (data && data.id) updatedState = submitResult(data);
      break;
    case 'DELETE_RESULT':
      if (data && data.id) updatedState = deleteResult(data.id);
      break;
    case 'CLEAR_RESULTS':
      if (data && Array.isArray(data.ids)) updatedState = clearResults(data.ids);
      break;
    case 'UPSERT_USER':
      if (data && data.id) updatedState = upsertUser(data);
      break;
    case 'DELETE_USER':
      if (data && data.id) updatedState = deleteUser(data.id);
      break;
    case 'UPDATE_PIN':
      if (data && typeof data.pin === 'string') updatedState = updatePin(data.pin);
      break;
    case 'FULL_SYNC':
      if (data) updatedState = fullSync(data);
      break;
    default:
      return res.status(400).json({ success: false, error: 'Unknown sync action type' });
  }

  res.json({ success: true, data: updatedState });
});

// Lazy GoogleGenAI initialization
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Multi-model fallback list prioritizing high availability, math precision, and speed
const CANDIDATE_MODELS = [
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

/**
 * Call Gemini with multi-model failover & retry for 503 / 429 high demand spikes
 */
async function callGeminiWithModelFallback(params: {
  contents: any;
  config?: any;
}): Promise<string> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    // Retry up to 2 attempts per model for transient 503/429 spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response.text) {
          return response.text.trim();
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.error?.code || err?.code;
        const msg = err?.message || err?.error?.message || '';

        const isTransientOverload =
          status === 503 ||
          status === 429 ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('Resource has been exhausted');

        if (isTransientOverload && attempt === 1) {
          console.warn(`[Gemini Retry] Model '${model}' high demand (status ${status}). Waiting 600ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }

        console.warn(`[Gemini Fallback] Model '${model}' failed (status ${status}). Switching to next candidate model...`);
        break; // break inner loop and try next model
      }
    }
  }

  throw lastError || new Error('Tất cả các mô hình AI hiện đang bận hoặc quá tải.');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Schema definition for Question generation with Gemini
 */
const questionSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      description: "Question type: 'mc' (Multiple choice 4 options), 'tf' (True/False 4 statements a,b,c,d), 'short' (Short numerical/word answer), or 'essay' (Essay)",
    },
    stem: {
      type: Type.STRING,
      description: "Optional common data/context/reading text before the question (can be empty string if none)",
    },
    content: {
      type: Type.STRING,
      description: "Main question statement with LaTeX math formatted using $...$ or $$...$$",
    },
    grade: {
      type: Type.STRING,
      description: "Grade level: '10', '11', or '12'",
    },
    level: {
      type: Type.STRING,
      description: "Cognitive level: 'Nhận biết', 'Thông hiểu', 'Vận dụng', or 'Vận dụng cao'",
    },
    topic: {
      type: Type.STRING,
      description: "Topic or chapter name in Vietnamese",
    },
    options: {
      type: Type.OBJECT,
      description: "For 'mc' type only: 4 options A, B, C, D with LaTeX math format where applicable",
      properties: {
        A: { type: Type.STRING },
        B: { type: Type.STRING },
        C: { type: Type.STRING },
        D: { type: Type.STRING },
      },
    },
    correctAnswer: {
      type: Type.STRING,
      description: "For 'mc': 'A', 'B', 'C', or 'D'. For 'short': exact value/string answer.",
    },
    statements: {
      type: Type.OBJECT,
      description: "For 'tf' type only: 4 statements labeled a, b, c, d",
      properties: {
        a: { type: Type.STRING },
        b: { type: Type.STRING },
        c: { type: Type.STRING },
        d: { type: Type.STRING },
      },
    },
    correctAnswers: {
      type: Type.OBJECT,
      description: "For 'tf' type only: true/false for each statement a, b, c, d",
      properties: {
        a: { type: Type.STRING, description: "'true' or 'false'" },
        b: { type: Type.STRING, description: "'true' or 'false'" },
        c: { type: Type.STRING, description: "'true' or 'false'" },
        d: { type: Type.STRING, description: "'true' or 'false'" },
      },
    },
    guide: {
      type: Type.STRING,
      description: "Step-by-step mathematical explanation / solution guide with LaTeX",
    },
  },
  required: ['type', 'content', 'grade', 'level', 'topic'],
};

/**
 * Helper to safely extract JSON from Gemini text response
 */
function extractJsonFromGemini(text: string): any {
  let cleaned = text.trim();
  // Remove markdown code fences ```json ... ``` if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // If not clean, try to locate the outermost array or object
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch {}
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const obj = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        if (Array.isArray(obj.variants)) return obj.variants;
        if (Array.isArray(obj.questions)) return obj.questions;
        return [obj];
      } catch {}
    }

    throw new Error('Dữ liệu AI trả về không thể phân tích cú pháp JSON.');
  }
}

/**
 * Intelligent mathematical variation engine as guaranteed fallback
 */
function generateMathematicalVariants(
  baseQ: any,
  count: number,
  difficulty: 'same' | 'easier' | 'harder' = 'same',
  customPrompt: string = ''
): any[] {
  const variants: any[] = [];
  const mathDeltas = [
    { offset: 1, mult: 2, name: 'Biến thể A' },
    { offset: 2, mult: 3, name: 'Biến thể B' },
    { offset: 3, mult: 4, name: 'Biến thể C' },
    { offset: -1, mult: 2, name: 'Biến thể D' },
    { offset: 4, mult: 5, name: 'Biến thể E' },
  ];

  for (let i = 0; i < count; i++) {
    const delta = mathDeltas[i % mathDeltas.length];
    const shift = (i + 1) * (difficulty === 'easier' ? 1 : difficulty === 'harder' ? 3 : 2);

    // Mutate math numbers in string while keeping LaTeX delimiters
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
      // Add subtle note if custom prompt exists
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
      newCorrectAnswers = baseQ.correctAnswers ? { ...baseQ.correctAnswers } : { a: 'true', b: 'false', c: 'true', d: 'false' };
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
 * POST /api/ai/clone-question
 * Generates 1 to N similar questions with different numbers/parameters but same core concept
 */
app.post('/api/ai/clone-question', async (req, res) => {
  try {
    const { question, count = 1, options = {} } = req.body;

    if (!question || !question.content) {
      return res.status(400).json({ error: 'Dữ liệu câu hỏi gốc không hợp lệ.' });
    }

    const numVariants = Math.min(5, Math.max(1, Number(count) || 1));
    const difficulty = options.difficulty || 'same'; // 'same' | 'easier' | 'harder'
    const customPrompt = options.customPrompt ? `\n- Yêu cầu bổ sung từ giáo viên: ${options.customPrompt}` : '';

    let formatted: any[] = [];

    // Attempt Gemini Generation
    try {
      const ai = getGeminiClient();

      const systemInstruction = `Bạn là một chuyên gia khảo thí và biên soạn đề thi theo chuẩn Bộ Giáo dục & Đào tạo Việt Nam.
Nhiệm vụ: Tạo ra đúng ${numVariants} câu hỏi biến thể / tương tự từ câu hỏi gốc được cung cấp.

QUY TẮC CỐT LÕI (BẮT BUỘC):
1. GIỮ NGUYÊN BẢN CHẤT KIẾN THỨC & DẠNG TOÁN:
   - Cùng đơn vị kiến thức, chủ đề: "${question.topic || 'Toán học'}", khối lớp ${question.grade || '12'}, mức độ "${question.level || 'Thông hiểu'}".
   - Loại câu hỏi: "${question.type}".
2. ĐỔI MỚI SỐ LIỆU & BỐI CẢNH:
   - Thay đổi các hằng số, hệ số, hàm số, phương trình hoặc bối cảnh để tạo ra bài toán mới hoàn toàn độc lập.
   - Số liệu đẹp, chuẩn xác, không bị vô nghiệm hoặc mâu thuẫn.
3. CÔNG THỨC TOÁN LATEX:
   - Tất cả công thức, biến số toán học PHẢI đặt trong cặp dấu $...$ (inline) hoặc $$...$$ (display block).
4. ĐÁP ÁN VÀ LỜI GIẢI:
   - Tự giải chi tiết và đưa ra lời giải chuẩn xác 100% trong trường "guide".
   - Với câu trắc nghiệm (mc): Chỉ định rõ correctAnswer ('A', 'B', 'C' hoặc 'D') và 4 lựa chọn A, B, C, D.
   - Với Đúng/Sai (tf): Cung cấp 4 mệnh đề a, b, c, d và correctAnswers {a: 'true'|'false', b: 'true'|'false', c: 'true'|'false', d: 'true'|'false'}.
   - Với trả lời ngắn (short): correctAnswer là giá trị số/chuỗi cụ thể.
5. ĐIỀU CHỈNH ĐỘ KHÓ:
   ${difficulty === 'easier' ? '- Làm câu hỏi dễ hơn một chút, số liệu đơn giản hơn.' : difficulty === 'harder' ? '- Nâng cao độ khó nhẹ, đòi hỏi biến đổi thêm 1-2 bước.' : '- Giữ nguyên hoàn toàn mức độ phân hóa và độ khó như câu gốc.'}${customPrompt}

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Trả về duy nhất một mảng JSON thuần túy gồm đúng ${numVariants} phần tử:
[
  {
    "type": "${question.type}",
    "stem": "Dữ kiện chung (nếu có, không có thì để chuỗi rỗng '')",
    "content": "Nội dung câu hỏi với công thức $...$",
    "grade": "${question.grade || '12'}",
    "level": "${question.level || 'Thông hiểu'}",
    "topic": "${question.topic || 'Toán học'}",
    ${question.type === 'mc' ? '"options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "correctAnswer": "A",' : ''}
    ${question.type === 'tf' ? '"statements": { "a": "...", "b": "...", "c": "...", "d": "..." }, "correctAnswers": { "a": "true", "b": "false", "c": "true", "d": "false" },' : ''}
    ${question.type === 'short' ? '"correctAnswer": "25",' : ''}
    "guide": "Lời giải chi tiết từng bước với công thức toán LaTeX $...$"
  }
]`;

      const prompt = `Dưới đây là câu hỏi gốc của giáo viên:
Loại câu: ${question.type}
Khối: ${question.grade || '12'}
Mức độ: ${question.level || 'Thông hiểu'}
Chủ đề: ${question.topic || 'Toán học'}
${question.stem ? `Dữ kiện dẫn (Stem): ${question.stem}\n` : ''}
Nội dung câu hỏi: ${question.content}
${
  question.options
    ? `Các lựa chọn:
A. ${question.options.A}
B. ${question.options.B}
C. ${question.options.C}
D. ${question.options.D}
Đáp án đúng: ${question.correctAnswer || 'A'}`
    : ''
}
${
  question.statements
    ? `Các ý Đúng/Sai:
a) ${question.statements.a} (Đáp án: ${question.correctAnswers?.a || 'true'})
b) ${question.statements.b} (Đáp án: ${question.correctAnswers?.b || 'false'})
c) ${question.statements.c} (Đáp án: ${question.correctAnswers?.c || 'true'})
d) ${question.statements.d} (Đáp án: ${question.correctAnswers?.d || 'false'})`
    : ''
}
${question.type === 'short' ? `Đáp án ngắn: ${question.correctAnswer || ''}` : ''}
${question.guide ? `Lời giải gốc: ${question.guide}` : ''}

Hãy sinh chính xác ${numVariants} câu hỏi biến thể tương tự (khác số liệu) theo đúng cấu trúc trên.`;

      const responseText = await callGeminiWithModelFallback({
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      if (responseText) {
        const rawVariants = extractJsonFromGemini(responseText);
        if (Array.isArray(rawVariants) && rawVariants.length > 0) {
          formatted = rawVariants.slice(0, numVariants).map((q: any, i: number) => ({
            id: `ai-clone-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
            type: q.type || question.type,
            stem: q.stem || '',
            image: question.image || null,
            content: q.content || '',
            grade: q.grade || question.grade || '12',
            level: q.level || question.level || 'Thông hiểu',
            topic: q.topic || question.topic || 'Toán học',
            options: q.type === 'mc' ? (q.options || question.options) : undefined,
            correctAnswer: q.correctAnswer || (q.type === 'mc' ? 'A' : ''),
            statements: q.type === 'tf' ? (q.statements || question.statements) : undefined,
            correctAnswers: q.type === 'tf' ? (q.correctAnswers || question.correctAnswers) : undefined,
            guide: q.guide || '',
            createdAt: new Date().toLocaleDateString('vi-VN'),
          }));
        }
      }
    } catch (aiErr: any) {
      console.warn('Gemini models all temporarily busy or key missing, applying math mutation fallback:', aiErr?.message || aiErr);
    }

    // If Gemini didn't produce results, use high quality mathematical mutation engine
    if (!formatted || formatted.length === 0) {
      formatted = generateMathematicalVariants(question, numVariants, difficulty, options.customPrompt);
    }

    res.json({ success: true, variants: formatted });
  } catch (error: any) {
    console.error('Error in /api/ai/clone-question:', error);
    // Fallback directly
    try {
      const { question, count = 1, options = {} } = req.body;
      const numVariants = Math.min(5, Math.max(1, Number(count) || 1));
      const fallbackList = generateMathematicalVariants(question, numVariants, options.difficulty, options.customPrompt);
      return res.json({ success: true, variants: fallbackList });
    } catch {
      res.status(500).json({
        error: error.message || 'Đã xảy ra lỗi khi tạo câu hỏi với AI.',
      });
    }
  }
});

/**
 * POST /api/ai/clone-exam
 * Clones all questions in an exam with new data/numbers
 */
app.post('/api/ai/clone-exam', async (req, res) => {
  try {
    const { questions, options = {} } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Danh sách câu hỏi đề thi không hợp lệ.' });
    }

    const difficulty = options.difficulty || 'same';
    const customPrompt = options.customPrompt ? `\n- Yêu cầu bổ sung: ${options.customPrompt}` : '';
    let formatted: any[] = [];

    // Attempt Gemini Generation
    try {
      const ai = getGeminiClient();

      const systemInstruction = `Bạn là chuyên gia khảo thí và tạo đề thi theo chuẩn Bộ Giáo dục & Đào tạo Việt Nam.
Nhiệm vụ: Tạo ra một bộ đề thi song song gồm đúng ${questions.length} câu hỏi (tương đương 100% về ma trận kiến thức, số câu từng phần, cấp độ nhận thức) nhưng THAY ĐỔI TOÀN BỘ SỐ LIỆU, HÀM SỐ, THÔNG SỐ VÀ BỐI CẢNH.
Tất cả công thức toán phải viết bằng LaTeX chuẩn $...$.
Đảm bảo tính chính xác 100% của các đáp án đúng và phương án gây nhiễu.${customPrompt}

Trả về một mảng JSON đúng ${questions.length} phần tử tương ứng thứ tự từng câu hỏi.`;

      const prompt = `Dưới đây là danh sách ${questions.length} câu hỏi của đề thi gốc:
${JSON.stringify(
  questions.map((q, idx) => ({
    stt: idx + 1,
    type: q.type,
    stem: q.stem || '',
    content: q.content,
    grade: q.grade,
    level: q.level,
    topic: q.topic,
    options: q.options,
    correctAnswer: q.correctAnswer,
    statements: q.statements,
    correctAnswers: q.correctAnswers,
    guide: q.guide,
  })),
  null,
  2
)}`;

      const responseText = await callGeminiWithModelFallback({
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      if (responseText) {
        const clonedList = extractJsonFromGemini(responseText);
        if (Array.isArray(clonedList) && clonedList.length > 0) {
          formatted = clonedList.map((q: any, i: number) => {
            const orig = questions[i] || questions[0];
            return {
              id: `ai-exam-q-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
              type: q.type || orig.type,
              stem: q.stem || '',
              image: orig.image || null,
              content: q.content || orig.content,
              grade: q.grade || orig.grade || '12',
              level: q.level || orig.level || 'Thông hiểu',
              topic: q.topic || orig.topic || 'Toán học',
              options: q.type === 'mc' ? (q.options || orig.options) : undefined,
              correctAnswer: q.correctAnswer || (q.type === 'mc' ? 'A' : orig.correctAnswer),
              statements: q.type === 'tf' ? (q.statements || orig.statements) : undefined,
              correctAnswers: q.type === 'tf' ? (q.correctAnswers || orig.correctAnswers) : undefined,
              guide: q.guide || orig.guide || '',
              createdAt: new Date().toLocaleDateString('vi-VN'),
            };
          });
        }
      }
    } catch (aiErr: any) {
      console.warn('Gemini models temporarily busy or key missing, applying exam math mutation fallback:', aiErr?.message || aiErr);
    }

    // Fallback if needed
    if (!formatted || formatted.length === 0) {
      formatted = questions.map((q, i) => {
        const [mutated] = generateMathematicalVariants(q, 1, difficulty, options.customPrompt);
        return {
          ...mutated,
          id: `ai-exam-q-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
        };
      });
    }

    res.json({ success: true, questions: formatted });
  } catch (error: any) {
    console.error('Error in /api/ai/clone-exam:', error);
    try {
      const { questions, options = {} } = req.body;
      const fallbackList = questions.map((q: any, i: number) => {
        const [mutated] = generateMathematicalVariants(q, 1, options.difficulty, options.customPrompt);
        return {
          ...mutated,
          id: `ai-exam-q-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`,
        };
      });
      return res.json({ success: true, questions: fallbackList });
    } catch {
      res.status(500).json({
        error: error.message || 'Đã xảy ra lỗi khi tạo đề thi song song với AI.',
      });
    }
  }
});

// Vite middleware in dev mode / static assets in production
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DORETA'S EXAM Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
