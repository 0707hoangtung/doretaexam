import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, X, Check } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  systemPin: string;
  onChangePin: (newPin: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  systemPin,
  onChangePin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setIsChangingPin(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === systemPin) {
      onSuccess();
    } else {
      setError('Mã PIN không chính xác! (Mặc định: 123456)');
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPinInput.trim() !== systemPin) {
      setError('Mã PIN hiện tại không đúng!');
      return;
    }
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      setError('Mã PIN mới cần ít nhất 4 ký tự!');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setError('Xác nhận mã PIN mới không khớp!');
      return;
    }

    onChangePin(newPinInput.trim());
    setIsChangingPin(false);
    setError('');
    setPin(newPinInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-indigo-500/10">
          <Lock className="w-7 h-7" />
        </div>

        {!isChangingPin ? (
          <>
            <div>
              <h3 className="text-lg font-black text-white">Xác Nhận Quyền Giáo Viên</h3>
              <p className="text-xs text-slate-400 mt-1">
                Vui lòng nhập Mã PIN Quản Trị để thao tác (Mặc định:{' '}
                <strong className="text-indigo-400 font-mono">123456</strong>)
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  placeholder="Nhập mã PIN..."
                  maxLength={12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center text-xl font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 tracking-widest"
                />
                {error && <p className="text-xs text-rose-400 font-bold mt-2">{error}</p>}
              </div>

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>XÁC NHẬN</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  HỦY
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPin(true);
                    setError('');
                    setOldPinInput('');
                    setNewPinInput('');
                    setConfirmPinInput('');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Đổi mã PIN Quản trị</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-black text-white">Thiết Lập Mã PIN Mới</h3>
              <p className="text-xs text-slate-400 mt-1">Cập nhật mã PIN bảo mật cho tài khoản Giáo viên</p>
            </div>

            <form onSubmit={handleSaveNewPin} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Mã PIN hiện tại</label>
                <input
                  type="password"
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value)}
                  placeholder="Mã PIN cũ (123456)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Mã PIN mới</label>
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Nhập mã PIN mới..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Xác nhận mã PIN mới</label>
                <input
                  type="password"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  placeholder="Nhập lại mã PIN mới..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {error && <p className="text-xs text-rose-400 font-bold mt-1 text-center">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md"
                >
                  LƯU MÃ PIN
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPin(false)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  QUAY LẠI
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
