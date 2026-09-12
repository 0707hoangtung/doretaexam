import React, { useState, useRef } from 'react';
import { Question } from '../types';
import { MathText } from '../utils/mathRenderer';
import { cloneQuestionWithAI } from '../utils/aiService';
import {
  Sparkles,
  X,
  Bot,
  RefreshCw,
  Plus,
  BookmarkPlus,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Layers,
  ArrowRight,
  Sliders,
  Check,
  Edit2,
  Trash2,
  FileQuestion,
  Lightbulb,
} from 'lucide-react';

interface AICloneQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetQuestion: Question | null;
  onAddToDraft: (q: Question) => void;
  onAddAllToDraft?: (qs: Question[]) => void;
  onSaveToBank: (q: Question) => void;
  onReplaceOriginal?: (newQ: Question) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const AICloneQuestionModal: React.FC<AICloneQuestionModalProps> = ({
  isOpen,
  onClose,
  targetQuestion,
  onAddToDraft,
  onAddAllToDraft,
  onSaveToBank,
  onReplaceOriginal,
  showToast,
}) => {
  const [variantCount, setVariantCount] = useState<number>(2);
  const [difficulty, setDifficulty] = useState<'same' | 'easier' | 'harder'>('same');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<Question[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [savedBankIds, setSavedBankIds] = useState<Set<string>>(new Set());
  const rightScrollRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !targetQuestion) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      showToast(`AI đang tiến hành phân tích và sinh ${variantCount} câu hỏi biến thể...`, 'info');
      const results = await cloneQuestionWithAI(targetQuestion, variantCount, {
        difficulty,
        customPrompt: customPrompt.trim(),
      });
      if (!results || results.length === 0) {
        throw new Error('AI không trả về biến thể nào. Vui lòng bấm thử lại!');
      }
      setGeneratedVariants(results);
      setAddedIds(new Set());
      setSavedBankIds(new Set());
      showToast(`AI đã tạo thành công ${results.length} câu hỏi biến thể tương tự!`, 'success');

      // Auto scroll right panel to top
      if (rightScrollRef.current) {
        rightScrollRef.current.scrollTop = 0;
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Không thể tạo câu hỏi từ AI. Vui lòng thử lại!';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSingleToDraft = (q: Question) => {
    onAddToDraft(q);
    setAddedIds((prev) => new Set(prev).add(q.id));
    showToast('Đã thêm câu hỏi vào danh sách soạn đề!', 'success');
  };

  const handleAddAllToDraft = () => {
    if (generatedVariants.length === 0) return;
    if (onAddAllToDraft) {
      onAddAllToDraft(generatedVariants);
    } else {
      generatedVariants.forEach((q) => onAddToDraft(q));
    }
    const allIds = new Set(generatedVariants.map((q) => q.id));
    setAddedIds(allIds);
    showToast(`Đã thêm toàn bộ ${generatedVariants.length} câu hỏi vào đề đang soạn!`, 'success');
  };

  const handleSaveSingleToBank = (q: Question) => {
    onSaveToBank(q);
    setSavedBankIds((prev) => new Set(prev).add(q.id));
    showToast('Đã lưu câu hỏi vào Ngân hàng câu hỏi đám mây!', 'success');
  };

  const handleReplace = (q: Question) => {
    if (onReplaceOriginal) {
      onReplaceOriginal(q);
      showToast('Đã thay thế câu hỏi gốc bằng câu hỏi AI mới!', 'success');
      onClose();
    }
  };

  const handleApplyQuickPrompt = (text: string) => {
    setCustomPrompt((prev) => (prev ? `${prev}, ${text}` : text));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 max-w-6xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[94vh] flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white">Tạo Câu Hỏi Tương Tự Bằng AI (Gemini)</h3>
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono uppercase">
                  Đổi Số Liệu & Bối Cảnh
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Thiết lập thông số bên trái và xem các câu hỏi biến thể được sinh ra tức thì ở cột bên phải.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-COLUMN SPLIT LAYOUT */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
          {/* CỘT BÊN TRÁI: CÂU HỎI MẪU & CẤU HÌNH AI (5 Cột) */}
          <div className="lg:col-span-5 flex flex-col space-y-3 overflow-y-auto custom-scrollbar pr-1">
            {/* CÂU HỎI GỐC BAN ĐẦU */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-bold px-2 py-0.5 rounded-md text-[11px]">
                    Câu hỏi gốc làm mẫu
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {targetQuestion.type === 'mc'
                      ? 'Phần I (ABCD)'
                      : targetQuestion.type === 'tf'
                      ? 'Phần II (Đúng/Sai)'
                      : targetQuestion.type === 'short'
                      ? 'Phần III (Trả lời ngắn)'
                      : 'Tự luận'}
                  </span>
                  <span className="text-slate-500 text-[11px]">• {targetQuestion.level}</span>
                </div>
              </div>

              {targetQuestion.stem && (
                <div className="text-xs text-slate-400 italic bg-slate-900 p-2 rounded-xl border border-slate-800/60">
                  <MathText text={targetQuestion.stem} />
                </div>
              )}

              <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                <MathText text={targetQuestion.content} />
              </div>

              {targetQuestion.options && (
                <div className="grid grid-cols-2 gap-1.5 text-xs pt-1">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div
                      key={opt}
                      className={`p-1.5 rounded-lg border text-[11px] ${
                        targetQuestion.correctAnswer === opt
                          ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-200 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="font-bold mr-1">{opt}.</span>
                      <MathText text={targetQuestion.options![opt] || ''} />
                    </div>
                  ))}
                </div>
              )}

              {targetQuestion.statements && (
                <div className="space-y-1 text-xs pt-1">
                  {(['a', 'b', 'c', 'd'] as const).map((st) => (
                    <div key={st} className="p-1 rounded bg-slate-900/60 border border-slate-800 text-slate-300 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold mr-1.5">{st})</span>
                        <MathText text={targetQuestion.statements![st] || ''} />
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        targetQuestion.correctAnswers?.[st] === 'true'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                      }`}>
                        {targetQuestion.correctAnswers?.[st] === 'true' ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CẤU HÌNH SINH CÂU HỎI */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3 shrink-0">
              {/* Số lượng câu */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Số lượng câu biến thể cần tạo:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setVariantCount(cnt)}
                      className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                        variantCount === cnt
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {cnt} câu
                    </button>
                  ))}
                </div>
              </div>

              {/* Điều chỉnh độ khó */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Mức độ yêu cầu tư duy:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDifficulty('easier')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
                      difficulty === 'easier'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Dễ hơn chút
                  </button>
                  <button
                    type="button"
                    onClick={() => setDifficulty('same')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
                      difficulty === 'same'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Giữ nguyên
                  </button>
                  <button
                    type="button"
                    onClick={() => setDifficulty('harder')}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
                      difficulty === 'harder'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Nâng cao
                  </button>
                </div>
              </div>

              {/* Yêu cầu thêm từ giáo viên */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Yêu cầu bổ sung cho AI (tùy chọn):
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="VD: Số nguyên chẵn, gắn thực tế..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />

                {/* Quick Prompt suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Nghiệm nguyên đẹp',
                    'Đổi hàm số tương đương',
                    'Bài toán thực tế',
                    'Đổi hằng số $a, b, c$',
                  ].map((txt) => (
                    <button
                      key={txt}
                      type="button"
                      onClick={() => handleApplyQuickPrompt(txt)}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 border border-slate-800 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      + {txt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nút hành động Tạo */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>AI đang phân tích & sinh số liệu mới...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>
                        {generatedVariants.length > 0
                          ? `Tạo Lại ${variantCount} Câu Biến Thể Khác`
                          : `Bắt Đầu Sinh ${variantCount} Câu Hỏi Tương Tự (AI)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* CỘT BÊN PHẢI: KẾT QUẢ CÂU HỎI AI TẠO RA (7 Cột) */}
          <div
            ref={rightScrollRef}
            className="lg:col-span-7 flex flex-col bg-slate-950/90 rounded-2xl border border-slate-800 p-4 overflow-y-auto custom-scrollbar space-y-3"
          >
            {/* Header Cột Phải */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">
                    Kết Quả Câu Hỏi Biến Thể
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {generatedVariants.length > 0
                      ? `Đã tạo ${generatedVariants.length} câu hỏi mới tương đương về mặt kiến thức`
                      : 'Khu vực hiển thị danh sách câu hỏi AI sau khi sinh'}
                  </p>
                </div>
              </div>

              {generatedVariants.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllToDraft}
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Tất Cả {generatedVariants.length} Câu</span>
                </button>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse shadow-lg shadow-indigo-600/20">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Đang Tạo Câu Hỏi Tương Tự...</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Hệ thống đang bảo toàn dạng toán, thay đổi các tham số, tự giải lại đáp án chính xác và xuất mã công thức LaTeX chuẩn.
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMessage && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-3 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl my-auto">
                <div className="w-12 h-12 rounded-2xl bg-rose-900/40 border border-rose-700/50 flex items-center justify-center text-rose-400 shadow-md">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-rose-200">Không Thể Tạo Biến Thể</h4>
                  <p className="text-xs text-rose-300/80 max-w-sm mx-auto">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử Lại Ngay</span>
                </button>
              </div>
            )}

            {/* Empty State (Chưa bấm tạo) */}
            {!isLoading && !errorMessage && generatedVariants.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 text-center border-2 border-dashed border-slate-800/80 rounded-2xl my-auto">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
                  <FileQuestion className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Chưa Có Câu Hỏi Biến Thể Nào</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Hãy xem câu hỏi mẫu và tùy chỉnh cấu hình ở cột bên trái, sau đó bấm nút <strong className="text-indigo-400 font-bold">"Bắt Đầu Sinh Câu Hỏi (AI)"</strong> để xem kết quả tại đây.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Mẹo: AI sẽ tự động giải và đưa ra cả lời giải chi tiết cho câu hỏi mới!</span>
                </div>
              </div>
            )}

            {/* Danh sách các câu hỏi biến thể kết quả */}
            {!isLoading && generatedVariants.length > 0 && (
              <div className="space-y-3">
                {generatedVariants.map((varQ, vIdx) => {
                  const isAdded = addedIds.has(varQ.id);
                  const isSavedBank = savedBankIds.has(varQ.id);

                  return (
                    <div
                      key={varQ.id || vIdx}
                      className="bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30 shadow-md space-y-2.5 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-black px-2.5 py-0.5 rounded-lg">
                            Biến thể #{vIdx + 1}
                          </span>
                          <span className="text-[11px] font-bold bg-slate-950 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-800">
                            {varQ.level}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {onReplaceOriginal && (
                            <button
                              type="button"
                              onClick={() => handleReplace(varQ)}
                              className="text-[11px] font-bold bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-800/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                              title="Thay thế câu hỏi mẫu ban đầu bằng câu biến thể này"
                            >
                              <Check className="w-3 h-3" />
                              <span>Thay câu gốc</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveSingleToBank(varQ)}
                            disabled={isSavedBank}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                              isSavedBank
                                ? 'bg-slate-950 text-slate-500 border-slate-800'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                            }`}
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            <span>{isSavedBank ? 'Đã lưu kho' : 'Lưu Ngân hàng'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSingleToDraft(varQ)}
                            disabled={isAdded}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                              isAdded
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã thêm</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Thêm vào Đề</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {varQ.stem && (
                        <div className="text-xs text-slate-400 italic bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <MathText text={varQ.stem} />
                        </div>
                      )}

                      <div className="text-sm font-semibold text-white leading-relaxed">
                        <MathText text={varQ.content} />
                      </div>

                      {/* Options */}
                      {varQ.options && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                            <div
                              key={opt}
                              className={`p-2 rounded-xl border ${
                                varQ.correctAnswer === opt
                                  ? 'bg-indigo-950/80 border-indigo-500/70 text-indigo-200 font-bold'
                                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="font-bold mr-1 text-indigo-400">{opt}.</span>
                              <MathText text={varQ.options![opt] || ''} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* True / False statements */}
                      {varQ.statements && (
                        <div className="space-y-1 text-xs pt-1">
                          {(['a', 'b', 'c', 'd'] as const).map((st) => (
                            <div key={st} className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center justify-between">
                              <div>
                                <span className="font-bold mr-1.5 text-indigo-400">{st})</span>
                                <MathText text={varQ.statements![st] || ''} />
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                varQ.correctAnswers?.[st] === 'true'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                              }`}>
                                {varQ.correctAnswers?.[st] === 'true' ? 'ĐÚNG' : 'SAI'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Short answer */}
                      {varQ.type === 'short' && (
                        <div className="text-xs bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                          <span className="text-slate-400">Đáp án ngắn:</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {varQ.correctAnswer || '--'}
                          </span>
                        </div>
                      )}

                      {/* Solution guide */}
                      {varQ.guide && (
                        <div className="text-xs text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="font-bold text-slate-300 block mb-0.5">Lời giải / Hướng dẫn:</span>
                          <MathText text={varQ.guide} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

