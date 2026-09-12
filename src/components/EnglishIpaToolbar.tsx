import React, { useState } from 'react';
import { Underline, Languages, ChevronDown, ChevronUp, Sparkles, Hash } from 'lucide-react';

export interface EnglishIpaToolbarProps {
  onInsertText: (text: string, isWrap?: boolean, wrapPrefix?: string, wrapSuffix?: string) => void;
  currentTargetLabel?: string;
  onSelectTarget?: (targetKey: string) => void;
  availableTargets?: Array<{ key: string; label: string }>;
  currentTargetKey?: string;
  className?: string;
}

// 8 IPA symbols explicitly requested by user in prompt (/æ/, /ə/, /ɪ/, /i:/, /θ/, /ð/, /ʃ/, /tʃ/)
const REQUESTED_IPA_WITH_SLASHES = [
  { symbol: '/æ/', raw: 'æ', desc: 'e bẹt', example: 'c<u>a</u>t, b<u>a</u>g' },
  { symbol: '/ə/', raw: 'ə', desc: 'schwa', example: '<u>a</u>bout, sof<u>a</u>' },
  { symbol: '/ɪ/', raw: 'ɪ', desc: 'i ngắn', example: 's<u>i</u>t, f<u>i</u>t' },
  { symbol: '/i:/', raw: 'i:', desc: 'i dài', example: 's<u>ee</u>, t<u>ea</u>' },
  { symbol: '/θ/', raw: 'θ', desc: 'th vô thanh', example: '<u>th</u>ink, <u>th</u>ank' },
  { symbol: '/ð/', raw: 'ð', desc: 'th hữu thanh', example: '<u>th</u>is, mo<u>th</u>er' },
  { symbol: '/ʃ/', raw: 'ʃ', desc: 's dài / sh', example: '<u>sh</u>e, wa<u>sh</u>' },
  { symbol: '/tʃ/', raw: 'tʃ', desc: 'ch', example: '<u>ch</u>air, wat<u>ch</u>' },
];

// Additional common IPA symbols in high school English tests
const MORE_IPA_WITH_SLASHES = [
  { symbol: '/dʒ/', raw: 'dʒ', desc: 'âm j', example: '<u>j</u>ob, a<u>ge</u>' },
  { symbol: '/ʌ/', raw: 'ʌ', desc: 'á ngắn', example: 'c<u>u</u>p, l<u>u</u>ck' },
  { symbol: '/ʊ/', raw: 'ʊ', desc: 'u ngắn', example: 'p<u>u</u>t, b<u>oo</u>k' },
  { symbol: '/u:/', raw: 'u:', desc: 'u dài', example: 't<u>oo</u>, bl<u>ue</u>' },
  { symbol: '/ɔ:/', raw: 'ɔ:', desc: 'o dài', example: 's<u>aw</u>, d<u>oo</u>r' },
  { symbol: '/ɒ/', raw: 'ɒ', desc: 'o ngắn', example: 'h<u>o</u>t, d<u>o</u>g' },
  { symbol: '/ɑ:/', raw: 'ɑ:', desc: 'a dài', example: 'c<u>a</u>r, st<u>ar</u>' },
  { symbol: '/ɜ:/', raw: 'ɜ:', desc: 'ơ dài', example: 'b<u>ir</u>d, l<u>ea</u>rn' },
  { symbol: '/e/', raw: 'e', desc: 'e thường', example: 'b<u>e</u>d, p<u>e</u>n' },
  { symbol: '/eɪ/', raw: 'eɪ', desc: 'nguyên âm đôi', example: 's<u>ay</u>, d<u>ay</u>' },
  { symbol: '/aɪ/', raw: 'aɪ', desc: 'nguyên âm đôi', example: 'm<u>y</u>, l<u>i</u>ke' },
  { symbol: '/ɔɪ/', raw: 'ɔɪ', desc: 'nguyên âm đôi', example: 'b<u>oy</u>, c<u>oi</u>n' },
  { symbol: '/aʊ/', raw: 'aʊ', desc: 'nguyên âm đôi', example: 'h<u>ow</u>, n<u>ow</u>' },
  { symbol: '/əʊ/', raw: 'əʊ', desc: 'nguyên âm đôi', example: 'g<u>o</u>, n<u>o</u>' },
  { symbol: '/eə/', raw: 'eə', desc: 'nguyên âm đôi', example: '<u>air</u>, h<u>air</u>' },
  { symbol: '/ɪə/', raw: 'ɪə', desc: 'nguyên âm đôi', example: 'h<u>ear</u>, n<u>ear</u>' },
  { symbol: '/ʊə/', raw: 'ʊə', desc: 'nguyên âm đôi', example: 'p<u>oor</u>, t<u>our</u>' },
  { symbol: '/ŋ/', raw: 'ŋ', desc: 'ng', example: 'si<u>ng</u>, lo<u>ng</u>' },
  { symbol: '/ʒ/', raw: 'ʒ', desc: 'gi / s mềm', example: 'vi<u>si</u>on, plea<u>su</u>re' },
  { symbol: '/j/', raw: 'j', desc: 'y', example: '<u>y</u>es, <u>y</u>ou' },
];

export const EnglishIpaToolbar: React.FC<EnglishIpaToolbarProps> = ({
  onInsertText,
  currentTargetLabel = '3. Nội dung câu hỏi',
  onSelectTarget,
  availableTargets,
  currentTargetKey,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'slashes' | 'raw'>('slashes');
  const [showMoreIpa, setShowMoreIpa] = useState<boolean>(false);

  return (
    <div
      className={`bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-2 border-indigo-500/40 hover:border-indigo-500/60 rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-3 transition-all ${className}`}
    >
      {/* Top Header: Title, Target indicator & Expand/Collapse */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold shrink-0">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-indigo-200 tracking-wide uppercase">
                KÝ HIỆU &amp; ĐỊNH DẠNG TIẾNG ANH (1-CHẠM)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                1-Tap Insert
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chèn nhanh gạch chân phát âm <u>...</u>, dấu trọng âm chính ˈ, ký tự phiên âm IPA quốc tế
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target input info */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-indigo-500/30 text-xs">
            <span className="text-slate-400 text-[11px]">Đang trỏ vào:</span>
            <span className="font-bold text-amber-300">{currentTargetLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-indigo-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick target selector pills (if targets provided) */}
      {availableTargets && availableTargets.length > 0 && onSelectTarget && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Chèn vào ô:</span>
          {availableTargets.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelectTarget(t.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                currentTargetKey === t.key
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* CORE 1-TAP ACTION BAR: Always Visible (Underline + Primary Stress + Secondary Stress + Phonetic Slashes) */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-2.5 sm:p-3 flex flex-wrap items-center gap-2">
        {/* 1. Gạch chân phát âm <u>...</u> */}
        <button
          type="button"
          onClick={() => onInsertText('', true, '<u>', '</u>')}
          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="Bọc phần phát âm cần gạch chân <u>...</u> (Nếu bôi đen chữ thì bọc ngay, nếu chưa bôi đen thì chèn <u></u> và đưa con trỏ vào giữa)"
        >
          <Underline className="w-3.5 h-3.5 text-amber-400" />
          <span>&lt;u&gt;Gạch Chân Phát Âm&lt;/u&gt;</span>
        </button>

        {/* 2. Dấu trọng âm chính ˈ (Primary stress mark \u02C8) */}
        <button
          type="button"
          onClick={() => onInsertText('ˈ')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 active:scale-95"
          title="Chèn dấu trọng âm chính ˈ (Primary stress mark: \u02C8) trước âm tiết nhấn trọng âm"
        >
          <span className="font-mono text-base leading-none text-amber-300">ˈ</span>
          <span>Dấu Trọng Âm Chính ( ˈ )</span>
        </button>

        {/* 3. Dấu trọng âm phụ ˌ (Secondary stress mark \u02CC) */}
        <button
          type="button"
          onClick={() => onInsertText('ˌ')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          title="Chèn dấu trọng âm phụ ˌ (Secondary stress mark: \u02CC)"
        >
          <span className="font-mono text-base leading-none text-indigo-300">ˌ</span>
          <span>Trọng âm phụ ( ˌ )</span>
        </button>

        {/* 4. Cặp dấu gạch xiên phiên âm /.../ */}
        <button
          type="button"
          onClick={() => onInsertText('', true, '/', '/')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
          title="Chèn cặp dấu gạch xiên phiên âm /.../"
        >
          <span className="font-mono text-xs font-black text-emerald-400">/ ... /</span>
          <span>Gạch xiên</span>
        </button>
      </div>

      {/* EXPANDED SECTION: IPA Symbols */}
      {isExpanded && (
        <div className="space-y-2.5 pt-1">
          {/* Sub-header for IPA symbols: Toggle between /.../ version vs raw characters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Ký tự IPA Quốc Tế:
              </span>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('slashes')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    activeTab === 'slashes'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Phiên bản có gạch xiên /.../
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    activeTab === 'raw'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ký tự đơn lẻ
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreIpa(!showMoreIpa)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
            >
              {showMoreIpa ? 'Ẩn bớt ký tự' : '+ Thêm nhiều ký tự IPA khác'}
            </button>
          </div>

          {/* Row 1: The 8 Key Requested IPA symbols */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              CÁC KÝ HIỆU PHỔ BIẾN NHẤT TRONG ĐỀ THI:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {REQUESTED_IPA_WITH_SLASHES.map((item) => {
                const insertVal = activeTab === 'slashes' ? item.symbol : item.raw;
                return (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => onInsertText(insertVal)}
                    className="group bg-slate-900 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-500/60 p-2 rounded-xl text-center transition-all flex flex-col items-center justify-center active:scale-95 shadow-sm"
                    title={`Chèn ${insertVal} (${item.desc} - VD: ${item.example.replace(/<[^>]*>/g, '')})`}
                  >
                    <span className="font-mono text-sm sm:text-base font-black text-emerald-400 group-hover:text-emerald-300">
                      {insertVal}
                    </span>
                    <span className="text-[9px] text-slate-400 group-hover:text-indigo-300 truncate max-w-full font-sans">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2 (Optional expanded): More IPA symbols */}
          {showMoreIpa && (
            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                CÁC NGUYÊN ÂM &amp; PHỤ ÂM IPA BỔ SUNG:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-1.5">
                {MORE_IPA_WITH_SLASHES.map((item) => {
                  const insertVal = activeTab === 'slashes' ? item.symbol : item.raw;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => onInsertText(insertVal)}
                      className="group bg-slate-900/80 hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-500/40 p-1.5 rounded-lg text-center transition-all flex flex-col items-center justify-center active:scale-95"
                      title={`Chèn ${insertVal} (${item.desc} - VD: ${item.example.replace(/<[^>]*>/g, '')})`}
                    >
                      <span className="font-mono text-xs sm:text-sm font-bold text-indigo-300 group-hover:text-white">
                        {insertVal}
                      </span>
                      <span className="text-[9px] text-slate-500 group-hover:text-slate-300 truncate max-w-full font-sans">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guidance note */}
          <div className="text-[10px] text-slate-500 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 flex items-start gap-1.5">
            <span className="text-amber-400 font-bold shrink-0">Mẹo:</span>
            <span>
              Để tạo câu hỏi phát âm (Pronunciation), bạn có thể bôi đen chữ cái (ví dụ chữ <strong>i</strong> trong từ <strong>climb</strong>) rồi bấm nút <strong>&lt;u&gt;Gạch Chân Phát Âm&lt;/u&gt;</strong>. Hệ thống sẽ tự động bọc thành <strong>cl&lt;u&gt;i&lt;/u&gt;mb</strong> và hiển thị gạch chân đẹp mắt khi thi và khi xuất file Word/PDF.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
