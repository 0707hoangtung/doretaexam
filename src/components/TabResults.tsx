import React, { useState } from 'react';
import { Exam, ExamResult, UserAccount } from '../types';
import { exportResultsToExcel } from '../utils/examExporter';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Search,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  Shield,
  UserCheck,
  Lock,
} from 'lucide-react';

interface TabResultsProps {
  results: ExamResult[];
  exams?: Exam[];
  currentUser?: UserAccount | null;
  onClearResults: () => void;
  onDeleteResult: (id: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const TabResults: React.FC<TabResultsProps> = ({
  results,
  exams = [],
  currentUser = null,
  onClearResults,
  onDeleteResult,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('all');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Strict RBAC: Teachers only view results for exams they created. Super admin views all.
  const accessibleResults = results.filter((r) => {
    if (isSuperAdmin) return true;
    if (!currentUser) return false;

    // Check direct exam author ID if present
    if (r.examAuthorId && r.examAuthorId === currentUser.id) return true;

    // Cross-match with exams in system
    const matchedExam = exams.find(
      (e) => e.code.toUpperCase() === r.examCode.toUpperCase()
    );
    if (matchedExam) {
      if (matchedExam.authorId === currentUser.id) return true;
      if (
        matchedExam.authorUsername &&
        matchedExam.authorUsername.toLowerCase() === currentUser.username.toLowerCase()
      ) {
        return true;
      }
    }

    return false;
  });

  const filteredResults = accessibleResults.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.studentName.toLowerCase().includes(term) ||
      (r.studentSbd && r.studentSbd.toLowerCase().includes(term)) ||
      r.studentClass.toLowerCase().includes(term) ||
      r.examCode.toLowerCase().includes(term) ||
      (r.examTitle && r.examTitle.toLowerCase().includes(term));

    const matchesExam = selectedExamFilter === 'all' || r.examCode === selectedExamFilter;

    return matchesSearch && matchesExam;
  });

  const uniqueExamCodes = Array.from(new Set(accessibleResults.map((r) => r.examCode)));

  // Analytics calculation based ONLY on accessible results
  const totalSubmissions = accessibleResults.length;
  const avgScore =
    totalSubmissions > 0
      ? Math.round(
          (accessibleResults.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / totalSubmissions) * 100
        ) / 100
      : 0;
  const maxScore =
    totalSubmissions > 0 ? Math.max(...accessibleResults.map((r) => Number(r.score) || 0)) : 0;
  const passCount = accessibleResults.filter((r) => (Number(r.score) || 0) >= 5.0).length;
  const passRate =
    totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

  const handleExportExcel = () => {
    try {
      if (accessibleResults.length === 0) {
        showToast('Không có dữ liệu bài nộp để xuất tệp Excel!', 'error');
        return;
      }
      exportResultsToExcel(filteredResults.length > 0 ? filteredResults : accessibleResults);
      showToast('Đã xuất báo cáo Excel (.xlsx) chuẩn số liệu thành công!', 'success');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      showToast('Lỗi khi xuất tệp Excel: ' + (err?.message || 'Không xác định'), 'error');
    }
  };

  const handleExportCSV = () => {
    if (accessibleResults.length === 0) {
      showToast('Không có dữ liệu bài nộp để xuất tệp CSV!', 'error');
      return;
    }

    const exportList = filteredResults.length > 0 ? filteredResults : accessibleResults;
    let csv = '\uFEFFSTT,Số Báo Danh,Họ Và Tên,Lớp / Trường,Mã Đề,Tên Đề,Điểm Tổng,Phần I,Phần II,Phần III,Thời Gian Nộp,Số Lần Đổi Tab\n';
    exportList.forEach((r, idx) => {
      csv += `${idx + 1},"${r.studentSbd || ''}","${r.studentName}","${r.studentClass}","${r.examCode}","${r.examTitle || ''}",${r.score},${r.scoreBreakdown?.part1Earned || ''},${r.scoreBreakdown?.part2Earned || ''},${r.scoreBreakdown?.part3Earned || ''},"${r.submittedAt}",${r.tabSwitchCount || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCao_KetQuaThi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('Đã xuất báo cáo CSV thành công!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-black text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span>Báo Cáo &amp; Phổ Điểm Kết Quả</span>
            </h2>

            {/* Role indicator badge */}
            {isSuperAdmin ? (
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-xl border border-amber-500/30 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Quản Trị Viên: Toàn bộ hệ thống ({results.length} bài)</span>
              </span>
            ) : (
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-1 rounded-xl border border-indigo-500/30 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Giáo viên: {currentUser?.displayName || 'Tài khoản'} (Chỉ xem điểm đề của mình)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {isSuperAdmin
              ? 'Thống kê kết quả thi toàn diện của mọi đề thi và giáo viên trong trường.'
              : 'Thống kê chi tiết điểm số, số báo danh học sinh và bài thi thuộc các đề do Thầy/Cô tạo.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {accessibleResults.length > 0 && (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa Lịch Sử</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2"
            title="Xuất file Microsoft Excel (.xlsx) với mỗi thông tin một cột chuẩn số liệu"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5"
            title="Xuất tệp CSV phụ trợ"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {totalSubmissions > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Tổng Lượt Nộp</p>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{totalSubmissions}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Điểm Trung Bình</p>
              <h3 className="text-2xl font-black text-indigo-400 font-mono mt-1">{avgScore}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Điểm Cao Nhất</p>
              <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">{maxScore}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Tỉ Lệ Đạt (≥ 5.0)</p>
              <h3 className="text-2xl font-black text-amber-400 font-mono mt-1">{passRate}%</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold font-mono text-sm">
              {passCount}/{totalSubmissions}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search */}
      {accessibleResults.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Tìm kiếm theo họ tên, số báo danh (SBD), lớp, mã đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={selectedExamFilter}
              onChange={(e) => setSelectedExamFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả bài thi</option>
              {uniqueExamCodes.map((code) => (
                <option key={code} value={code}>
                  Mã đề: {code}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">STT</th>
                <th className="p-4">Số Báo Danh (SBD)</th>
                <th className="p-4">Họ Và Tên</th>
                <th className="p-4">Lớp / Trường</th>
                <th className="p-4">Mã Đề</th>
                <th className="p-4">Thời Gian Nộp</th>
                <th className="p-4 text-center">Đổi Tab</th>
                <th className="p-4 text-right">Điểm Số</th>
                <th className="p-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-200">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-bold">
                    {searchTerm
                      ? 'Không tìm thấy kết quả phù hợp với từ khóa tìm kiếm.'
                      : isSuperAdmin
                      ? 'Chưa có kết quả bài nộp nào trong hệ thống.'
                      : 'Chưa có học sinh nào nộp bài cho các đề thi do Thầy/Cô tạo.'}
                  </td>
                </tr>
              ) : (
                filteredResults.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-slate-500 font-mono font-bold text-center">
                      {index + 1}
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-300">
                      <span className="bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                        {r.studentSbd || 'SBD-' + String(index + 1).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-black text-xs">
                        {r.studentName.charAt(0).toUpperCase()}
                      </div>
                      <span>{r.studentName || '--'}</span>
                    </td>
                    <td className="p-4 text-slate-400">{r.studentClass || '--'}</td>
                    <td className="p-4 font-mono text-indigo-400 font-bold">{r.examCode}</td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {r.submittedAt && !isNaN(new Date(r.submittedAt).getTime())
                        ? new Date(r.submittedAt).toLocaleString('vi-VN')
                        : (r.submittedAt || '--')}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          r.tabSwitchCount > 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {r.tabSwitchCount > 0 && <AlertTriangle className="w-3 h-3" />}
                        <span>{r.tabSwitchCount || 0} lần</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-black font-mono text-sm px-2.5 py-1 rounded-xl ${
                          r.score >= 8
                            ? 'text-emerald-400 bg-emerald-950/40'
                            : r.score >= 5
                            ? 'text-indigo-300 bg-indigo-950/40'
                            : 'text-rose-400 bg-rose-950/40'
                        }`}
                      >
                        {r.score} điểm
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setDeletingResultId(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Xóa bài nộp này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Clear All Modal */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Xóa Toàn Bộ Lịch Sử Thi?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Toàn bộ {accessibleResults.length} bài nộp của thí sinh sẽ bị xóa khỏi bộ nhớ. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearResults();
                  setConfirmClearAll(false);
                  showToast('Đã xóa toàn bộ lịch sử điểm số!', 'info');
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md shadow-rose-600/30"
              >
                Xóa Hết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Single Result Modal */}
      {deletingResultId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Xóa Kết Quả Bài Thi?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Bạn có chắc chắn muốn xóa bài làm của thí sinh này khỏi hệ thống?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingResultId(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteResult(deletingResultId);
                  setDeletingResultId(null);
                  showToast('Đã xóa bài nộp thành công!', 'info');
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md shadow-rose-600/30"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
