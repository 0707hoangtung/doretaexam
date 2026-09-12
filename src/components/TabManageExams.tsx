import React, { useState, useRef } from 'react';
import { Exam, UserAccount } from '../types';
import { exportExamToWord, exportExamToPDF } from '../utils/examExporter';
import {
  FileSpreadsheet,
  Database,
  Users,
  KeyRound,
  Download,
  Upload,
  Plus,
  Copy,
  Edit3,
  Trash2,
  PlayCircle,
  Clock,
  HelpCircle,
  Search,
  Check,
  FileType,
  Printer,
  Shield,
  UserCheck,
  User,
  Lock,
  Sparkles,
  CloudUpload,
} from 'lucide-react';

interface TabManageExamsProps {
  exams: Exam[];
  questionBankCount: number;
  resultsCount: number;
  usersCount?: number;
  currentUser?: UserAccount | null;
  onOpenTeacherManagement?: () => void;
  onOpenEditExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onQuickStartExam: (code: string) => void;
  onOpenPinChange: () => void;
  onExportSystemData: () => void;
  onImportSystemData: (file: File) => void;
  onGoToCreate: () => void;
  onOpenAICloneExam?: (exam: Exam) => void;
  onForceCloudSync?: () => void;
  isSyncingCloud?: boolean;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const TabManageExams: React.FC<TabManageExamsProps> = ({
  exams,
  questionBankCount,
  resultsCount,
  usersCount = 1,
  currentUser = null,
  onOpenTeacherManagement,
  onOpenEditExam,
  onDeleteExam,
  onQuickStartExam,
  onOpenPinChange,
  onExportSystemData,
  onImportSystemData,
  onGoToCreate,
  onOpenAICloneExam,
  onForceCloudSync,
  isSyncingCloud = false,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [examScopeFilter, setExamScopeFilter] = useState<'all' | 'mine'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.authorName && e.authorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const isMyExam = Boolean(
      currentUser && (
        e.authorId === currentUser.id ||
        (e.authorUsername && e.authorUsername.toLowerCase() === currentUser.username.toLowerCase())
      )
    );

    const matchesScope = examScopeFilter === 'all' || isMyExam;

    return matchesSearch && matchesScope;
  });

  const myExamsCount = exams.filter(
    (e) =>
      currentUser && (
        e.authorId === currentUser.id ||
        (e.authorUsername && e.authorUsername.toLowerCase() === currentUser.username.toLowerCase())
      )
  ).length;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã đề: ${code}`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportSystemData(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Đề Thi</p>
            <h3 className="text-2xl font-black text-indigo-400 mt-1 font-mono">{exams.length}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-bold text-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngân Hàng Câu</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{questionBankCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center font-bold text-xl">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lượt Nộp Bài</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{resultsCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center font-bold text-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tài Khoản Giáo Viên</p>
            <h3 className="text-2xl font-black text-sky-400 mt-1 font-mono">{usersCount}</h3>
          </div>
          <div className="w-12 h-12 bg-sky-600/20 text-sky-400 border border-sky-500/30 rounded-2xl flex items-center justify-center font-bold text-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Banner & Quick Actions */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Quản Lý &amp; Phân Phối Đề Thi</h2>
            {isSuperAdmin ? (
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" /> Admin Toàn Quyền
              </span>
            ) : (
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-400" /> {currentUser?.displayName || 'Giáo viên'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Xuất bản đề thi, in ấn PDF/Word, chia sẻ mã đề cho học sinh và quản lý ngân hàng câu hỏi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Super admin teacher management shortcut */}
          {isSuperAdmin && onOpenTeacherManagement && (
            <button
              onClick={onOpenTeacherManagement}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>Quản Lý Giáo Viên</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={onOpenPinChange}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5"
              title="Đổi mã PIN Quản Trị Viên"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Đổi PIN</span>
            </button>
          )}

          {onForceCloudSync && (
            <button
              type="button"
              onClick={onForceCloudSync}
              disabled={isSyncingCloud}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              title="Đồng bộ ngay toàn bộ đề thi, câu hỏi và kết quả lên Đám mây trực tuyến"
            >
              <CloudUpload className={`w-4 h-4 text-cyan-400 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Đang Đồng Bộ...' : 'Đồng Bộ Đám Mây'}</span>
            </button>
          )}

          <button
            onClick={onExportSystemData}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5"
            title="Sao lưu toàn bộ đề thi, ngân hàng câu hỏi &amp; kết quả"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Sao Lưu Data</span>
          </button>

          <label
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="Khôi phục dữ liệu hệ thống từ file .json đã lưu"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Khôi Phục Data</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
          </label>

          <button
            onClick={onGoToCreate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Soạn Đề Mới</span>
          </button>
        </div>
      </div>

      {/* Scope filter and Search box */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExamScopeFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              examScopeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>Tất Cả Đề Thi ({exams.length})</span>
          </button>
          {currentUser && (
            <button
              type="button"
              onClick={() => setExamScopeFilter('mine')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                examScopeFilter === 'mine'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đề Thi Của Tôi ({myExamsCount})</span>
            </button>
          )}
        </div>

        {exams.length > 0 && (
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm đề thi theo tên, mã đề, tác giả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Grid of Exams */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800 space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
          <p className="text-sm font-bold text-slate-400">
            {searchTerm
              ? 'Không tìm thấy đề thi nào khớp với từ khóa.'
              : examScopeFilter === 'mine'
              ? 'Thầy/Cô chưa xuất bản đề thi nào. Hãy bấm "Soạn Đề Mới" để tạo đề thi đầu tiên!'
              : 'Chưa có đề thi nào được xuất bản.'}
          </p>
          <button
            onClick={onGoToCreate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Bắt Đầu Soạn Đề Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((ex) => {
            const isMyExam = Boolean(
              currentUser && (
                ex.authorId === currentUser.id ||
                (ex.authorUsername &&
                  ex.authorUsername.toLowerCase() === currentUser.username.toLowerCase())
              )
            );
            const canManage = isSuperAdmin || isMyExam;

            return (
              <div
                key={ex.id}
                className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600/20 text-indigo-300 font-mono font-black text-xs px-3 py-1 rounded-xl border border-indigo-500/30">
                        {ex.code}
                      </span>
                      {ex.authorName ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 border ${
                            isMyExam
                              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <User className="w-3 h-3 text-indigo-400" />
                          <span>{isMyExam ? 'Tôi tạo' : ex.authorName}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700">
                          <Shield className="w-3 h-3 text-amber-400" />
                          <span>Hệ Thống</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">{ex.createdAt}</span>
                  </div>

                  <h4 className="font-extrabold text-base text-white leading-snug group-hover:text-indigo-200 transition-colors">
                    {ex.title}
                  </h4>

                  {ex.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{ex.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{ex.duration} phút</span>
                    </span>
                    <span>•</span>
                    <span>{ex.questions?.length || 0} câu hỏi</span>
                    {ex.shuffleQs && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 text-[11px]">Xáo câu</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  {/* Download Word & PDF Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        exportExamToWord(ex, { includeAnswers: true });
                        showToast(`Đã xuất đề "${ex.title}" sang file Word (.doc)!`, 'success');
                      }}
                      className="bg-blue-950/50 hover:bg-blue-900/70 text-blue-300 border border-blue-800/40 text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      title="Tải đề thi dạng file Word (hỗ trợ MathJax, Katex, LaTeX và bảng đáp án)"
                    >
                      <FileType className="w-3.5 h-3.5 text-blue-400" />
                      <span>Tải Word (.doc)</span>
                    </button>

                    <button
                      onClick={() => {
                        exportExamToPDF(ex);
                        showToast(`Đang mở giao diện in / lưu PDF đề "${ex.title}"...`, 'info');
                      }}
                      className="bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 border border-purple-800/40 text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      title="In đề thi hoặc lưu thành file PDF chuẩn A4"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-400" />
                      <span>In / Tải PDF</span>
                    </button>
                  </div>

                  {/* AI Clone Exam Button */}
                  {onOpenAICloneExam && (
                    <button
                      onClick={() => onOpenAICloneExam(ex)}
                      className="w-full bg-gradient-to-r from-indigo-950/70 via-purple-950/70 to-indigo-950/70 hover:from-indigo-900/90 hover:to-purple-900/90 text-indigo-300 hover:text-white border border-indigo-500/40 text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      title="Dùng AI nhân bản đề thi này thành 1 đề song song với 100% số liệu mới"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Tạo Đề Song Song (AI Đổi Số Liệu)</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(ex.code)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      {copiedCode === ex.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Đã Chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Sao Chép Mã</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onQuickStartExam(ex.code)}
                      className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1"
                      title="Vào thi thử trực tiếp"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Thi Thử</span>
                    </button>

                    {canManage ? (
                      <>
                        <button
                          onClick={() => onOpenEditExam(ex)}
                          className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 text-xs font-bold p-2.5 rounded-xl transition-all"
                          title="Chỉnh sửa đề thi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingExam(ex)}
                          className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold p-2.5 rounded-xl transition-all"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span
                        className="bg-slate-800/60 border border-slate-700 text-slate-500 text-[10px] font-semibold px-2 py-2.5 rounded-xl flex items-center gap-1 cursor-not-allowed select-none"
                        title={`Chỉ tác giả (${ex.authorName || 'Hệ thống'}) hoặc Quản trị viên tối cao mới có quyền sửa/xóa đề thi này`}
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Exam Modal */}
      {deletingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Xóa Đề Thi "{deletingExam.title}"?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Học sinh sẽ không thể nhập mã <strong className="text-indigo-400">{deletingExam.code}</strong> để làm bài nữa. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExam(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExam(deletingExam.id);
                  setDeletingExam(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md shadow-rose-600/30"
              >
                Xóa Đề
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
