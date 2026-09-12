import React, { useState, useEffect, useRef } from 'react';
import { UserAccount } from '../types';
import {
  Lock,
  KeyRound,
  X,
  Check,
  User,
  Shield,
  GraduationCap,
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  users: UserAccount[];
  systemPin: string;
  onChangePin?: (newPin: string) => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  users,
  systemPin,
  onChangePin,
  currentUser,
  onLogout,
}) => {
  const [tab, setTab] = useState<'account' | 'pin' | 'changepin'>('account');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const usernameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setUsernameInput('');
      setPasswordInput('');
      setPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setTimeout(() => {
        if (tab === 'account') {
          usernameRef.current?.focus();
        } else if (tab === 'pin') {
          pinRef.current?.focus();
        }
      }, 150);
    }
  }, [isOpen, tab]);

  if (!isOpen) return null;

  // Handle Account Login (Username/Password or Email/Password)
  const handleAccountLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser) {
      setError('Vui lòng nhập tên đăng nhập hoặc email!');
      return;
    }
    if (!trimmedPass) {
      setError('Vui lòng nhập mật khẩu!');
      return;
    }

    // Match in users list strictly with exact password
    const foundUser = users.find(
      (u) =>
        (u.username.toLowerCase() === trimmedUser || (u.email && u.email.toLowerCase() === trimmedUser)) &&
        u.password === trimmedPass
    );

    if (foundUser) {
      if (foundUser.isActive === false) {
        setError('Tài khoản này hiện đang bị tạm khóa bởi Quản trị viên!');
        return;
      }
      onLoginSuccess(foundUser);
      onClose();
      return;
    }

    // If database is first initializing and user list is empty, allow default root admin
    if (users.length === 0 && trimmedUser === 'admin' && trimmedPass === systemPin) {
      const rootAdmin: UserAccount = {
        id: 'user-admin-root',
        username: 'admin',
        displayName: 'Quản Trị Viên Tối Cao',
        email: 'hoangtuanh341992@gmail.com',
        role: 'super_admin',
        subject: 'Toán Học - Quản Trị',
        school: 'Hệ Thống DoretaExam',
        createdAt: '2026-08-28',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
      };
      onLoginSuccess(rootAdmin);
      onClose();
      return;
    }

    setError('Tên đăng nhập hoặc mật khẩu không chính xác!');
  };

  // Handle PIN quick access - STRICTLY matches systemPin only
  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const enteredPin = pinInput.trim();
    if (!enteredPin) {
      setError('Vui lòng nhập mã PIN!');
      return;
    }

    // ONLY the single active systemPin is valid
    if (enteredPin === systemPin) {
      // Find active admin or use super admin
      const adminUser = users.find((u) => u.role === 'super_admin') || {
        id: 'user-admin-root',
        username: 'admin',
        displayName: 'Quản Trị Viên Tối Cao',
        email: 'hoangtuanh341992@gmail.com',
        role: 'super_admin',
        subject: 'Toán Học - Quản Trị',
        school: 'Hệ Thống DoretaExam',
        createdAt: '2026-08-28',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
      };
      onLoginSuccess(adminUser);
      onClose();
    } else {
      setError('Mã PIN không chính xác!');
    }
  };

  // Handle Change PIN
  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (pinInput.trim() !== systemPin) {
      setError('Mã PIN hiện tại không chính xác!');
      return;
    }
    if (newPinInput.trim().length < 4) {
      setError('Mã PIN mới cần ít nhất 4 ký tự!');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setError('Xác nhận mã PIN mới không trùng khớp!');
      return;
    }

    if (onChangePin) {
      onChangePin(newPinInput.trim());
      setSuccessMsg('Đổi mã PIN thành công!');
      setTimeout(() => {
        setTab('pin');
        setPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        setSuccessMsg('');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Info Header if logged in */}
        {currentUser ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
              <Shield className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {currentUser.role === 'super_admin' ? 'Quản Trị Viên Tối Cao' : 'Tài Khoản Giáo Viên'}
              </span>
              <h3 className="text-xl font-black text-white mt-2">{currentUser.displayName}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">@{currentUser.username}</p>
              {currentUser.school && (
                <p className="text-xs text-slate-400 mt-1">{currentUser.school} • {currentUser.subject || 'Toán học'}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-md"
              >
                TIẾP TỤC LÀM VIỆC
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-4 py-3 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 font-bold rounded-xl text-xs border border-rose-800/40 transition-all"
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Đăng Nhập Quản Trị &amp; Giáo Viên</h3>
              <p className="text-xs text-slate-400">
                Đăng nhập để vào bảng Soạn đề, Quản lý đề thi và Báo cáo phổ điểm
              </p>
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setTab('account');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'account'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Tài Khoản Riêng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('pin');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'pin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Mã PIN Nhanh</span>
              </button>
              {onChangePin && (
                <button
                  type="button"
                  onClick={() => {
                    setTab('changepin');
                    setError('');
                  }}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1 ${
                    tab === 'changepin'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đổi PIN</span>
                </button>
              )}
            </div>

            {tab === 'account' && (
              <form onSubmit={handleAccountLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Tên Đăng Nhập / Email
                  </label>
                  <div className="relative">
                    <input
                      ref={usernameRef}
                      type="text"
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setError('');
                      }}
                      placeholder="Nhập tên đăng nhập (ví dụ: admin hoặc gv_toan)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Mật Khẩu Cá Nhân
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setError('');
                      }}
                      placeholder="Nhập mật khẩu riêng của bạn..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 absolute right-3.5 top-3"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs font-bold p-2.5 rounded-xl text-center">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ĐĂNG NHẬP</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                  >
                    Đóng
                  </button>
                </div>

                {/* Quick Hint for Administrator */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tài khoản Quản Trị Mặc Định:</span>
                  </p>
                  <p>
                    Tên đăng nhập: <strong className="text-indigo-400 font-mono">admin</strong> • Mật khẩu:{' '}
                    <strong className="text-indigo-400 font-mono">123</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    (Bạn có thể tạo tài khoản và phân quyền cho các giáo viên khác trong mục Quản Lý Giáo Viên)
                  </p>
                </div>
              </form>
            )}

            {tab === 'pin' && (
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Mã PIN Hệ Thống (Dành cho Quản Trị Viên)
                  </label>
                  <input
                    ref={pinRef}
                    type="password"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setError('');
                    }}
                    placeholder="Nhập mã PIN..."
                    maxLength={12}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center text-xl font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 tracking-widest"
                  />
                  {error && <p className="text-xs text-rose-400 font-bold mt-2 text-center">{error}</p>}
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>XÁC NHẬN PIN</span>
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
            )}

            {tab === 'changepin' && (
              <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Mã PIN Hiện Tại
                  </label>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Nhập mã PIN hiện tại..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-center tracking-widest"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Mã PIN Mới (Ít nhất 4 ký tự)
                  </label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Nhập mã PIN mới..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-center tracking-widest"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Xác Nhận Mã PIN Mới
                  </label>
                  <input
                    type="password"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder="Nhập lại mã PIN mới..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-center tracking-widest"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs font-bold p-2.5 rounded-xl text-center">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-bold p-2.5 rounded-xl text-center">
                    {successMsg}
                  </div>
                )}

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>LƯU MÃ PIN MỚI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('pin')}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                  >
                    Quay Lại
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
