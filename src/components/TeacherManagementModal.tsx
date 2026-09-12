import React, { useState } from 'react';
import { UserAccount } from '../types';
import {
  Users,
  UserPlus,
  Shield,
  GraduationCap,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Search,
  School,
  BookOpen,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';

interface TeacherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount | null;
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  showToast,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('Toán Học');
  const [formSchool, setFormSchool] = useState('');
  const [formRole, setFormRole] = useState<'teacher' | 'super_admin'>('teacher');
  const [formActive, setFormActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setFormDisplayName('');
    setFormUsername('');
    setFormPassword('');
    setFormEmail('');
    setFormSubject('Toán Học');
    setFormSchool('');
    setFormRole('teacher');
    setFormActive(true);
    setIsAdding(false);
    setEditingUserId(null);
    setError('');
  };

  const startEdit = (user: UserAccount) => {
    setEditingUserId(user.id);
    setFormDisplayName(user.displayName);
    setFormUsername(user.username);
    setFormPassword(user.password || '');
    setFormEmail(user.email || '');
    setFormSubject(user.subject || 'Toán Học');
    setFormSchool(user.school || '');
    setFormRole(user.role);
    setFormActive(user.isActive);
    setIsAdding(true);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = formDisplayName.trim();
    const trimmedUsername = formUsername.trim().toLowerCase();
    const trimmedPassword = formPassword.trim();

    if (!trimmedName) {
      setError('Vui lòng nhập Họ và Tên giáo viên!');
      return;
    }
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setError('Tên đăng nhập cần ít nhất 3 ký tự (chữ thường, số, dấu gạch dưới)!');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 3) {
      setError('Mật khẩu cần ít nhất 3 ký tự!');
      return;
    }

    // Check duplicate username (except when editing self)
    const existing = users.find(
      (u) => u.username.toLowerCase() === trimmedUsername && u.id !== editingUserId
    );
    if (existing) {
      setError(`Tên đăng nhập "${trimmedUsername}" đã tồn tại! Vui lòng chọn tên khác.`);
      return;
    }

    const newUser: UserAccount = {
      id: editingUserId || 'user-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      displayName: trimmedName,
      username: trimmedUsername,
      password: trimmedPassword,
      email: formEmail.trim() || '',
      subject: formSubject.trim() || 'Toán Học',
      school: formSchool.trim() || 'Trường THPT',
      role: formRole,
      isActive: formActive,
      createdAt: editingUserId ? (users.find(u => u.id === editingUserId)?.createdAt || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
      lastLoginAt: editingUserId ? (users.find(u => u.id === editingUserId)?.lastLoginAt || '') : '',
    };

    onSaveUser(newUser);
    showToast(
      editingUserId
        ? `Đã cập nhật tài khoản giáo viên "${trimmedName}" thành công!`
        : `Đã tạo tài khoản giáo viên mới cho thầy/cô "${trimmedName}"!`,
      'success'
    );
    resetForm();
  };

  const handleCopyAccountInfo = (u: UserAccount) => {
    const text = `HỆ THỐNG THI TRỰC TUYẾN DORETA'S EXAM\n- Họ tên: ${u.displayName}\n- Tên đăng nhập: ${u.username}\n- Mật khẩu: ${u.password}\n- Vai trò: ${u.role === 'super_admin' ? 'Quản Trị Viên' : 'Giáo Viên'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    showToast(`Đã sao chép thông tin tài khoản của ${u.displayName}!`, 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.school && u.school.toLowerCase().includes(term)) ||
      (u.subject && u.subject.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Quản Lý Danh Sách Giáo Viên</h3>
                <span className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                  {users.length} tài khoản
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cấp phát tài khoản, đặt mật khẩu riêng và phân quyền cho từng giáo viên
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form to Add / Edit User */}
        {isAdding ? (
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-indigo-500/30 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-indigo-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>{editingUserId ? 'Chỉnh Sửa Tài Khoản Giáo Viên' : 'Thêm Giáo Viên Mới'}</span>
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Hủy bỏ
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Họ Và Tên Giáo Viên <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Ví dụ: Thầy Nguyễn Văn A"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Tên Đăng Nhập (Username) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ví dụ: gv_vana hoặc nguyenA"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Mật Khẩu Riêng <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Nhập mật khẩu cho giáo viên..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono pr-8"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 absolute right-2.5 top-2.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Bộ Môn Giảng Dạy
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Toán Học, Vật Lý, Hóa Học..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Trường / Đơn Vị Công Tác
                  </label>
                  <input
                    type="text"
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    placeholder="Trường THPT Chuyên..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Email Liên Hệ (Tùy chọn)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="giaovien@school.edu.vn"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={formRole === 'teacher'}
                      onChange={() => setFormRole('teacher')}
                      className="accent-indigo-600"
                    />
                    <span>Giáo Viên Soạn Đề</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={formRole === 'super_admin'}
                      onChange={() => setFormRole('super_admin')}
                      className="accent-indigo-600"
                    />
                    <span className="text-amber-300">Quản Trị Viên Cấp Cao</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span className={formActive ? 'text-emerald-400' : 'text-slate-500'}>
                      {formActive ? 'Đang hoạt động' : 'Tạm khóa'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>LƯU TÀI KHOẢN</span>
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-400 font-bold mt-2 text-center bg-rose-950/40 p-2 rounded-xl border border-rose-800/40">
                  {error}
                </p>
              )}
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, tên đăng nhập, bộ môn, trường..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Giáo Viên Mới</span>
            </button>
          </div>
        )}

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3.5">Giáo Viên</th>
                <th className="p-3.5">Tên Đăng Nhập</th>
                <th className="p-3.5">Mật Khẩu</th>
                <th className="p-3.5">Bộ Môn / Đơn Vị</th>
                <th className="p-3.5 text-center">Vai Trò</th>
                <th className="p-3.5 text-center">Trạng Thái</th>
                <th className="p-3.5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                    Không tìm thấy tài khoản giáo viên nào.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isRoot = u.role === 'super_admin' && u.username === 'admin';
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                          u.role === 'super_admin' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40' : 'bg-indigo-600/20 text-indigo-300'
                        }`}>
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="leading-snug">{u.displayName}</p>
                          {u.email && <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-indigo-300 font-bold">
                        <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                          @{u.username}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg font-bold text-amber-400">
                          {u.password || '******'}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400">
                        <p className="text-slate-200">{u.subject || 'Toán Học'}</p>
                        <p className="text-[10px] text-slate-500">{u.school || 'Trường THPT'}</p>
                      </td>

                      <td className="p-3.5 text-center">
                        {u.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            <span>Quản Trị</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <GraduationCap className="w-3 h-3" />
                            <span>Giáo Viên</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            u.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                          }`}
                          title={u.isActive ? 'Đang hoạt động' : 'Bị tạm khóa'}
                        />
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleCopyAccountInfo(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                            title="Sao chép thông tin tài khoản gửi cho giáo viên"
                          >
                            {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => startEdit(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                            title="Chỉnh sửa thông tin / đổi mật khẩu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isRoot && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của giáo viên "${u.displayName}"?`)) {
                                  onDeleteUser(u.id);
                                  showToast(`Đã xóa tài khoản "${u.displayName}" khỏi hệ thống!`, 'info');
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Xóa tài khoản này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & Done */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <p className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Mỗi giáo viên sẽ dùng tên đăng nhập và mật khẩu riêng do bạn cấp để vào hệ thống.</span>
          </p>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md"
          >
            HOÀN TẤT
          </button>
        </div>
      </div>
    </div>
  );
};
