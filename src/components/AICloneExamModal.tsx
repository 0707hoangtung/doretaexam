import React, { useState } from 'react';
import { Question, Exam } from '../types';
import { cloneExamWithAI } from '../utils/aiService';
import {
  Sparkles,
  X,
  RefreshCw,
  Layers,
  FileText,
  Sliders,
  CheckCircle2,
  Wand2,
  ListOrdered,
  Rocket,
} from 'lucide-react';

interface AICloneExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | { title: string; questions: Question[] } | null;
  onClonedExamReady: (clonedQuestions: Question[], newTitle: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const AICloneExamModal: React.FC<AICloneExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  onClonedExamReady,
  showToast,
}) => {
  const [newTitle, setNewTitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'same' | 'easier' | 'harder'>('same');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && exam) {
      setNewTitle(`${exam.title} (Bản Song Song - Đổi Số Liệu)`);
      setDifficulty('same');
      setCustomPrompt('');
    }
  }, [isOpen, exam]);

  if (!isOpen || !exam || !exam.questions || exam.questions.length === 0) return null;

  const handleStartCloneExam = async () => {
    if (!newTitle.trim()) {
      showToast('Vui lòng nhập tên đề thi mới!', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      showToast(`AI đang tiến hành tạo song song ${exam.questions.length} câu hỏi mới...`, 'info');
      const clonedQuestions = await cloneExamWithAI(exam.questions, {
        difficulty,
        customPrompt: customPrompt.trim(),
      });

      showToast(`Tạo thành công ${clonedQuestions.length} câu hỏi song song cho đề thi mới!`, 'success');
      onClonedExamReady(clonedQuestions, newTitle.trim());
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Không thể tạo đề song song từ AI. Vui lòng thử lại!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 max-w-xl w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Tạo Đề Thi Song Song Với AI (Gemini)</h3>
              <p className="text-xs text-slate-400">
                Nhân bản toàn bộ <span className="text-indigo-400 font-bold">{exam.questions.length} câu hỏi</span> với 100% số liệu mới
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          {/* Tên đề thi mới */}
          <div>
            <label className="block text-slate-300 mb-1 flex items-center gap-1.5 font-bold">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tên Đề Thi Song Song Mới *</span>
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="VD: Đề Kiểm Tra Cuối Kỳ - Mã Song Song AI"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Ma trận tóm tắt */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              Cấu Trúc Đề Gốc Sẽ Được Giữ Nguyên Ma Trận:
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="bg-indigo-950/50 border border-indigo-800/40 p-2 rounded-xl">
                <div className="text-[10px] text-indigo-400 font-sans font-bold">Phần I (ABCD)</div>
                <div className="text-sm font-black text-white">
                  {exam.questions.filter((q) => q.type === 'mc').length} câu
                </div>
              </div>
              <div className="bg-amber-950/50 border border-amber-800/40 p-2 rounded-xl">
                <div className="text-[10px] text-amber-400 font-sans font-bold">Phần II (Đ/S)</div>
                <div className="text-sm font-black text-white">
                  {exam.questions.filter((q) => q.type === 'tf').length} câu
                </div>
              </div>
              <div className="bg-emerald-950/50 border border-emerald-800/40 p-2 rounded-xl">
                <div className="text-[10px] text-emerald-400 font-sans font-bold">Phần III (Ngắn)</div>
                <div className="text-sm font-black text-white">
                  {exam.questions.filter((q) => q.type === 'short').length} câu
                </div>
              </div>
            </div>
          </div>

          {/* Mức độ tư duy */}
          <div>
            <label className="block text-slate-300 mb-1.5 font-bold">
              Điều chỉnh độ khó tổng thể của đề mới:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDifficulty('easier')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  difficulty === 'easier'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                Dễ hơn một chút
              </button>
              <button
                type="button"
                onClick={() => setDifficulty('same')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  difficulty === 'same'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                Tương đương đề gốc
              </button>
              <button
                type="button"
                onClick={() => setDifficulty('harder')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  difficulty === 'harder'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                Nâng cao độ khó
              </button>
            </div>
          </div>

          {/* Yêu cầu thêm */}
          <div>
            <label className="block text-slate-300 mb-1 font-bold">
              Yêu cầu bổ sung cho AI (tùy chọn):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="VD: Ưu tiên các nghiệm nguyên đẹp, đổi bối cảnh bài toán thực tế..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartCloneExam}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang biên soạn song song toàn bộ đề thi...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Tạo Đề Thi Song Song Với AI Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
