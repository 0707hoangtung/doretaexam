import React, { useState, useEffect } from 'react';
import { Exam } from '../types';
import { exportExamToWord, exportExamToPDF } from '../utils/examExporter';
import { Edit3, X, Clock, FileText, FileType, Printer, Calendar, CalendarCheck, AlertCircle } from 'lucide-react';

interface EditExamModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Exam>) => void;
}

export const EditExamModal: React.FC<EditExamModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [shuffleQs, setShuffleQs] = useState(false);
  const [shuffleOpts, setShuffleOpts] = useState(false);
  const [description, setDescription] = useState('');
  const [hasTimeSchedule, setHasTimeSchedule] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const toLocalIso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (exam) {
      setTitle(exam.title || '');
      setDuration(exam.duration || 45);
      setShuffleQs(!!exam.shuffleQs);
      setShuffleOpts(!!exam.shuffleOpts);
      setDescription(exam.description || '');
      const hasSched = Boolean(exam.startTime || exam.endTime);
      setHasTimeSchedule(hasSched);
      setStartTime(exam.startTime || '');
      setEndTime(exam.endTime || '');
    }
  }, [exam]);

  if (!isOpen || !exam) return null;

  const isTimeInvalid = Boolean(
    hasTimeSchedule &&
    startTime &&
    endTime &&
    new Date(endTime).getTime() <= new Date(startTime).getTime()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isTimeInvalid) {
      alert('Thời gian đóng đề thi phải sau thời gian bắt đầu mở đề!');
      return;
    }

    onSave({
      title: title.trim(),
      duration: Number(duration) || 45,
      shuffleQs,
      shuffleOpts,
      description: description.trim(),
      startTime: hasTimeSchedule && startTime ? startTime : null,
      endTime: hasTimeSchedule && endTime ? endTime : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Chỉnh Sửa Thông Tin Đề</h3>
              <p className="text-[11px] font-mono text-indigo-400">{exam.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Tên Đề Thi</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Mã Đề (Cố định)</label>
              <input
                type="text"
                readOnly
                value={exam.code}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-slate-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Thời Gian (Phút)</span>
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Mô tả đề thi</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Cài đặt khung giờ thi */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-200 font-bold">
                <input
                  type="checkbox"
                  checked={hasTimeSchedule}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasTimeSchedule(checked);
                    if (checked && !startTime) {
                      const now = new Date();
                      setStartTime(toLocalIso(now));
                      const end = new Date(now.getTime() + (Number(duration) || 45) * 60 * 1000 + 60 * 60 * 1000);
                      setEndTime(toLocalIso(end));
                    }
                  }}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-600 focus:ring-0"
                />
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">Khung Giờ Mở & Đóng Bài Thi</span>
                </div>
              </label>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors ${
                  hasTimeSchedule
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {hasTimeSchedule ? 'Có Giới Hạn Giờ' : 'Mở Tự Do'}
              </span>
            </div>

            {hasTimeSchedule && (
              <div className="space-y-3 pt-1 border-t border-slate-800/60 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Giờ Bắt Đầu Mở Đề:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>Giờ Đóng Đề Hoàn Toàn:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                {isTimeInvalid && (
                  <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-2.5 text-[11px] text-rose-300 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Giờ đóng đề thi phải diễn ra sau giờ bắt đầu mở đề!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={shuffleQs}
                onChange={(e) => setShuffleQs(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-600 focus:ring-0"
              />
              <span>Xáo trộn thứ tự câu hỏi</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={shuffleOpts}
                onChange={(e) => setShuffleOpts(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-600 focus:ring-0"
              />
              <span>Xáo trộn các phương án đáp án</span>
            </label>
          </div>

          {/* Export options inside edit modal */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">Tải xuống đề thi:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => exportExamToWord(exam, { includeAnswers: true })}
                className="bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <FileType className="w-4 h-4 text-blue-400" />
                <span>Tải Word (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => exportExamToPDF(exam)}
                className="bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-purple-400" />
                <span>In / Tải PDF</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 uppercase"
            >
              LƯU THAY ĐỔI
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
            >
              HỦY
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
