import React, { useState, useEffect } from 'react';
import {
  Rocket,
  X,
  Shuffle,
  Clock,
  FileText,
  Sparkles,
  Layers,
  FileDown,
  Printer,
  CheckCircle2,
  ListOrdered,
} from 'lucide-react';
import { Question } from '../types';
import { generateExamVariants } from '../utils/examStructure';
import { exportMultiVariantExamToWord, exportMultiVariantExamToPDF } from '../utils/examExporter';

export interface PublishConfirmData {
  title: string;
  code: string;
  duration: number;
  shuffleQs: boolean;
  shuffleOpts: boolean;
  description: string;
  variantCount: number;
  variantCodes: string[];
  keepMasterAsFirst: boolean;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PublishConfirmData) => void;
  defaultQuestionCount: number;
  masterQuestions?: Question[];
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultQuestionCount,
  masterQuestions = [],
}) => {
  const [title, setTitle] = useState('');
  const [baseCode, setBaseCode] = useState('101');
  const [duration, setDuration] = useState(45);
  const [variantCount, setVariantCount] = useState<number>(1);
  const [variantCodes, setVariantCodes] = useState<string[]>(['101', '102', '103', '104']);
  const [keepMasterAsFirst, setKeepMasterAsFirst] = useState(true);
  const [shuffleQs, setShuffleQs] = useState(true);
  const [shuffleOpts, setShuffleOpts] = useState(true);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      const randomBase = 100 + Math.floor(Math.random() * 8) * 100 + 1; // 101, 201, 301...
      setBaseCode(String(randomBase));
      setVariantCodes([
        String(randomBase),
        String(randomBase + 1),
        String(randomBase + 2),
        String(randomBase + 3),
      ]);
      setDuration(45);
      setVariantCount(1);
      setKeepMasterAsFirst(true);
      setShuffleQs(true);
      setShuffleOpts(true);
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (type: '100' | '200' | '300' | 'letter' | 'custom_ex') => {
    if (type === '100') {
      setBaseCode('101');
      setVariantCodes(['101', '102', '103', '104']);
    } else if (type === '200') {
      setBaseCode('201');
      setVariantCodes(['201', '202', '203', '204']);
    } else if (type === '300') {
      setBaseCode('301');
      setVariantCodes(['301', '302', '303', '304']);
    } else if (type === 'letter') {
      setBaseCode('Mã A');
      setVariantCodes(['Mã A', 'Mã B', 'Mã C', 'Mã D']);
    } else if (type === 'custom_ex') {
      const rand = Math.floor(1000 + Math.random() * 9000);
      setBaseCode(`EX-${rand}-1`);
      setVariantCodes([`EX-${rand}-1`, `EX-${rand}-2`, `EX-${rand}-3`, `EX-${rand}-4`]);
    }
  };

  const handleBaseCodeChange = (val: string) => {
    setBaseCode(val);
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (!isNaN(num)) {
      setVariantCodes([
        val,
        String(num + 1),
        String(num + 2),
        String(num + 3),
      ]);
    } else {
      setVariantCodes([
        val,
        `${val}-2`,
        `${val}-3`,
        `${val}-4`,
      ]);
    }
  };

  const handleSingleCodeChange = (idx: number, val: string) => {
    const updated = [...variantCodes];
    updated[idx] = val;
    setVariantCodes(updated);
  };

  const getPayload = (): PublishConfirmData => {
    const activeCodes = variantCodes.slice(0, variantCount).map((c, i) => c.trim() || `EX-${101 + i}`);
    return {
      title: title.trim() || 'Đề Kiểm Tra Mới',
      code: activeCodes[0],
      duration: Number(duration) || 45,
      shuffleQs,
      shuffleOpts,
      description: description.trim(),
      variantCount,
      variantCodes: activeCodes,
      keepMasterAsFirst,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm(getPayload());
  };

  // Quick export Word directly from modal
  const handleExportWordDirect = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi trước khi xuất Word!');
      return;
    }
    const payload = getPayload();
    const variants = generateExamVariants(masterQuestions, {
      variantCount: payload.variantCount,
      baseTitle: payload.title,
      baseCode: payload.code,
      duration: payload.duration,
      description: payload.description,
      shuffleQs: payload.shuffleQs,
      shuffleOpts: payload.shuffleOpts,
      variantCodes: payload.variantCodes,
      keepMasterAsFirst: payload.keepMasterAsFirst,
    });
    exportMultiVariantExamToWord(variants, { includeAnswers: true });
  };

  // Quick export PDF directly from modal
  const handleExportPDFDirect = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi trước khi in/xuất PDF!');
      return;
    }
    const payload = getPayload();
    const variants = generateExamVariants(masterQuestions, {
      variantCount: payload.variantCount,
      baseTitle: payload.title,
      baseCode: payload.code,
      duration: payload.duration,
      description: payload.description,
      shuffleQs: payload.shuffleQs,
      shuffleOpts: payload.shuffleOpts,
      variantCodes: payload.variantCodes,
      keepMasterAsFirst: payload.keepMasterAsFirst,
    });
    exportMultiVariantExamToPDF(variants);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Xuất Bản & Tạo Đề Thi (1 - 4 Mã Đề)</h3>
              <p className="text-[11px] text-slate-400">
                Đề gốc đang gồm <span className="text-indigo-400 font-bold">{defaultQuestionCount} câu hỏi</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          {/* Tên Đề Thi */}
          <div>
            <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tên Đề Thi Gốc *</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Đề Kiểm Tra Giữa Kỳ I - Môn Toán 12"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* SỐ LƯỢNG MÃ ĐỀ THI MUỐN TẠO (1 ĐẾN 4 ĐỀ) */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Số Lượng Mã Đề Cần Tạo:</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded-lg">
                Tạo {variantCount} mã đề thi
              </span>
            </div>

            {/* 4 Variant Count Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setVariantCount(cnt)}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                    variantCount === cnt
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="font-mono text-sm">{cnt} Đề</span>
                  <span className="text-[9px] opacity-75">{cnt === 1 ? 'Đề Gốc' : `${cnt} Mã Con`}</span>
                </button>
              ))}
            </div>

            {/* PRESETS CHO MÃ ĐỀ */}
            {variantCount > 1 && (
              <div className="pt-2 border-t border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Mẫu mã đề chuẩn nhanh:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('100')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px] transition-colors"
                  >
                    101, 102, 103, 104
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('200')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px] transition-colors"
                  >
                    201, 202, 203, 204
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('300')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px] transition-colors"
                  >
                    301, 302, 303, 304
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('letter')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px] transition-colors"
                  >
                    Mã A, B, C, D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('custom_ex')}
                    className="px-2.5 py-1 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/50 text-indigo-300 rounded-lg text-[11px] transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> EX-xxxx
                  </button>
                </div>

                {/* DANH SÁCH MÃ ĐỀ ĐƯỢC TẠO */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {Array.from({ length: variantCount }).map((_, idx) => (
                    <div key={idx} className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <label className="text-[10px] text-slate-400 block mb-0.5 font-medium flex items-center justify-between">
                        <span>Đề {idx + 1} {idx === 0 && '(Gốc)'}:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={variantCodes[idx] || ''}
                        onChange={(e) => handleSingleCodeChange(idx, e.target.value.toUpperCase())}
                        placeholder={`Mã ${101 + idx}`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-xs uppercase focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Khi chỉ tạo 1 đề */}
            {variantCount === 1 && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1 flex items-center justify-between">
                    <span>Mã Đề Thi *</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('custom_ex')}
                      className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Tạo lại
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={baseCode}
                    onChange={(e) => handleBaseCodeChange(e.target.value.toUpperCase())}
                    placeholder="101 hoặc EX-101"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Thời Gian (Phút)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Thời gian làm bài khi tạo nhiều đề */}
          {variantCount > 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Thời Gian (Phút)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={keepMasterAsFirst}
                    onChange={(e) => setKeepMasterAsFirst(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-[11px] leading-tight">Đề số 1 là Đề Gốc chuẩn</span>
                </label>
              </div>
            </div>
          )}

          {/* Mô tả */}
          <div>
            <label className="block text-slate-400 mb-1">Mô tả hoặc hướng dẫn làm bài</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Không sử dụng tài liệu, máy tính cầm tay được phép mang vào phòng thi..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Cấu hình xáo trộn đề */}
          <div className="space-y-2 pt-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={shuffleQs}
                onChange={(e) => setShuffleQs(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
              <div className="flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Xáo trộn thứ tự các câu hỏi trong từng phần</span>
              </div>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={shuffleOpts}
                onChange={(e) => setShuffleOpts(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Xáo trộn nội dung lựa chọn đáp án (A, B, C, D ở Phần I)</span>
            </label>
          </div>

          {/* HÀNH ĐỘNG: XUẤT BẢN / TẢI WORD / PDF */}
          <div className="space-y-2.5 pt-2">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Rocket className="w-4 h-4" />
              <span>
                {variantCount === 1
                  ? 'XUẤT BẢN LÊN HỆ THỐNG CLOUD'
                  : `XUẤT BẢN TRỌN BỘ ${variantCount} MÃ ĐỀ LÊN CLOUD`}
              </span>
            </button>

            {/* Quick Word & PDF buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportWordDirect}
                className="bg-blue-950/70 hover:bg-blue-900/80 border border-blue-800/60 text-blue-300 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Tải Word {variantCount > 1 ? `(${variantCount} Mã Đề)` : ''}</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDFDirect}
                className="bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 font-bold py-2.5 px-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In / PDF {variantCount > 1 ? `(${variantCount} Mã Đề)` : ''}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
