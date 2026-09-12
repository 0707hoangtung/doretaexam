export type QuestionType = 'mc' | 'tf' | 'short' | 'essay';

export type QuestionLevel = 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';

export interface Question {
  id: string;
  type: QuestionType;
  points?: number; // Điểm số tùy chỉnh cho câu hỏi (mặc định: 0.25 cho Phần I, 0.5 cho Phần III)
  groupStem?: string; // Dữ kiện chung cho cụm câu hỏi liên tiếp nhau (tối đa 10 câu, Phần I)
  groupId?: string; // Mã định danh nhóm/cụm câu hỏi chung dữ kiện
  stem?: string; // Đoạn văn dẫn / dữ kiện riêng của câu hỏi
  image?: string | null; // Hình ảnh đính kèm base64 hoặc URL
  audio?: string | null; // Tệp âm thanh đính kèm base64 hoặc URL
  audioName?: string | null; // Tên tệp âm thanh (ví dụ: track01.mp3)
  content: string; // Nội dung câu hỏi
  grade: '10' | '11' | '12';
  level: QuestionLevel;
  topic: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: string; // e.g. 'A' | 'B' | 'C' | 'D' or short answer string
  statements?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswers?: {
    a: 'true' | 'false';
    b: 'true' | 'false';
    c: 'true' | 'false';
    d: 'true' | 'false';
  };
  guide?: string; // Hướng dẫn chấm / tự luận
  authorId?: string; // ID tài khoản giáo viên tạo câu hỏi
  authorName?: string; // Tên hiển thị giáo viên tạo câu hỏi
  authorUsername?: string; // Tên đăng nhập giáo viên tạo câu hỏi
  createdAt?: string;
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  duration: number; // minutes
  shuffleQs: boolean;
  shuffleOpts: boolean;
  createdAt: string;
  questions: Question[];
  description?: string;
  authorId?: string; // ID tài khoản giáo viên tạo đề
  authorName?: string; // Tên hiển thị giáo viên tạo đề
  authorUsername?: string;
}

export interface ExamResult {
  id: string;
  studentName: string;
  studentSbd?: string; // Số báo danh thí sinh
  studentClass: string;
  examCode: string;
  examTitle: string;
  score: number;
  tabSwitchCount: number;
  submittedAt: string;
  durationSpentSeconds?: number;
  answers?: Record<string, any>;
  examAuthorId?: string; // ID giáo viên sở hữu đề thi này
  examAuthorName?: string;
  scoreBreakdown?: {
    part1Earned?: number;
    part1Max?: number;
    part2Earned?: number;
    part2Max?: number;
    part3Earned?: number;
    part3Max?: number;
    part4Earned?: number;
    part4Max?: number;
  };
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export type UserRole = 'super_admin' | 'teacher';

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  password?: string; // Mật khẩu định danh
  subject?: string;
  school?: string;
  createdAt: string;
  isActive: boolean;
  lastLoginAt?: string;
}
