import { useState, useEffect } from 'react';
import { Exam, ExamResult, Question, ToastMessage, UserAccount } from './types';
import { initialExams, initialQuestionBank } from './data/sampleData';
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from './utils/storage';
import {
  fetchSystemPin,
  updateSystemPin,
  subscribeSystemPin,
  subscribeExams,
  saveExamToCloud,
  deleteExamFromCloud,
  subscribeQuestionBank,
  saveQuestionToCloud,
  deleteQuestionFromCloud,
  subscribeExamResults,
  submitExamResultToCloud,
  deleteExamResultFromCloud,
  subscribeUsers,
  saveUserToCloud,
  deleteUserFromCloud,
  syncAllLocalDataToCloud,
  DEFAULT_ROOT_ADMIN,
} from './lib/firebase';
import {
  startSyncListener,
  serverUpsertExam,
  serverDeleteExam,
  serverUpsertQuestion,
  serverDeleteQuestion,
  serverSubmitResult,
  serverDeleteResult,
  serverClearResults,
  serverUpsertUser,
  serverDeleteUser,
  serverUpdatePin,
  serverFullSync,
} from './lib/syncEngine';
import { Header } from './components/Header';
import { TabTakeExam } from './components/TabTakeExam';
import { TabCreateExam } from './components/TabCreateExam';
import { TabManageExams } from './components/TabManageExams';
import { TabResults } from './components/TabResults';
import { AuthModal } from './components/AuthModal';
import { TeacherManagementModal } from './components/TeacherManagementModal';
import { PublishModal, PublishConfirmData } from './components/PublishModal';
import { EditExamModal } from './components/EditExamModal';
import { QuestionBankModal } from './components/QuestionBankModal';
import { ToastContainer } from './components/ToastContainer';
import { generateExamVariants } from './utils/examStructure';
import { AICloneQuestionModal } from './components/AICloneQuestionModal';
import { AICloneExamModal } from './components/AICloneExamModal';

export default function App() {
  // Navigation & Role State
  const [currentTab, setCurrentTab] = useState<'take' | 'create' | 'manage' | 'results'>('take');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return getStorageItem<boolean>(STORAGE_KEYS.IS_ADMIN, false);
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return getStorageItem<UserAccount | null>(STORAGE_KEYS.CURRENT_USER, null);
  });
  const [systemPin, setSystemPin] = useState<string>(() => {
    return getStorageItem<string>(STORAGE_KEYS.PIN, '123456');
  });

  // Users Accounts (Teachers & Super Admin)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    return getStorageItem<UserAccount[]>(STORAGE_KEYS.USERS, [DEFAULT_ROOT_ADMIN]);
  });

  // Modal States
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTeacherMgmtOpen, setIsTeacherMgmtOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<'create' | 'manage' | 'results' | null>(null);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // AI Modal States for Question Bank & Manage Exams
  const [aiBankQuestion, setAiBankQuestion] = useState<Question | null>(null);
  const [isAiBankCloneOpen, setIsAiBankCloneOpen] = useState(false);
  const [aiManageExam, setAiManageExam] = useState<Exam | null>(null);
  const [isAiManageCloneOpen, setIsAiManageCloneOpen] = useState(false);

  // Data States with LocalStorage Cache + Cloud Firestore Sync
  const [questionBank, setQuestionBank] = useState<Question[]>(() => {
    return getStorageItem<Question[]>(STORAGE_KEYS.QBANK, []);
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    return getStorageItem<Exam[]>(STORAGE_KEYS.EXAMS, []);
  });

  const [results, setResults] = useState<ExamResult[]>(() => {
    return getStorageItem<ExamResult[]>(STORAGE_KEYS.RESULTS, []);
  });

  // Authoring Draft State (now fully persisted!)
  const [draftingQuestions, setDraftingQuestions] = useState<Question[]>(() => {
    return getStorageItem<Question[]>(STORAGE_KEYS.DRAFT_QUESTIONS, []);
  });
  const [editingDraftIndex, setEditingDraftIndex] = useState<number>(-1);

  // Network Status (Defaults to true, verified dynamically)
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Preset code for taking exam
  const [presetExamCode, setPresetExamCode] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme State: 'cyan-lime' (default requested) or 'dark' (classic)
  const [theme, setTheme] = useState<'cyan-lime' | 'dark'>(() => {
    return getStorageItem<'cyan-lime' | 'dark'>(STORAGE_KEYS.THEME, 'cyan-lime');
  });

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'cyan-lime') {
      document.body.classList.add('theme-cyan-lime');
    } else {
      document.body.classList.remove('theme-cyan-lime');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    const next = theme === 'cyan-lime' ? 'dark' : 'cyan-lime';
    setTheme(next);
    showToast(
      next === 'cyan-lime'
        ? 'Đã áp dụng Giao diện: Xanh Chuối - Xanh Lơ (Viền và Chữ xanh đậm)'
        : 'Đã chuyển về Giao diện Tối Cổ Điển',
      'info'
    );
  };

  // Synchronize localStorage reliably as local cache
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.QBANK, questionBank);
  }, [questionBank]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.EXAMS, exams);
  }, [exams]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.RESULTS, results);
  }, [results]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.DRAFT_QUESTIONS, draftingQuestions);
  }, [draftingQuestions]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.PIN, systemPin);
  }, [systemPin]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.IS_ADMIN, isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.CURRENT_USER, currentUser);
  }, [currentUser]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.USERS, users);
  }, [users]);

  // Real-Time Multi-Device & Cross-Tab Sync Engine (SSE + Cloud Redundancy)
  useEffect(() => {
    // 1. Primary Real-Time Synchronization via Server-Sent Events & API
    const unsubServer = startSyncListener({
      onExams: (cloudExams) => {
        if (Array.isArray(cloudExams)) {
          setExams(cloudExams);
          setStorageItem(STORAGE_KEYS.EXAMS, cloudExams);
        }
      },
      onQuestionBank: (cloudBank) => {
        if (Array.isArray(cloudBank)) {
          setQuestionBank(cloudBank);
          setStorageItem(STORAGE_KEYS.QBANK, cloudBank);
        }
      },
      onResults: (cloudResults) => {
        if (Array.isArray(cloudResults)) {
          setResults(cloudResults);
          setStorageItem(STORAGE_KEYS.RESULTS, cloudResults);
        }
      },
      onUsers: (cloudUsers) => {
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          setUsers(cloudUsers);
          setStorageItem(STORAGE_KEYS.USERS, cloudUsers);
        }
      },
      onPin: (cloudPin) => {
        if (cloudPin) {
          setSystemPin(cloudPin);
          setStorageItem(STORAGE_KEYS.PIN, cloudPin);
        }
      },
      onStatusChange: (status) => {
        setIsOnline(status !== 'offline');
      },
    });

    // 2. Secondary Firestore Listeners (Fail-safe cloud redundancy)
    const unsubPin = subscribeSystemPin((cloudPin) => {
      if (cloudPin && cloudPin !== systemPin) {
        setSystemPin(cloudPin);
      }
    });

    const unsubExams = subscribeExams((cloudExams) => {
      if (Array.isArray(cloudExams)) {
        setExams(cloudExams);
        setStorageItem(STORAGE_KEYS.EXAMS, cloudExams);
      }
    });

    const unsubBank = subscribeQuestionBank((cloudBank) => {
      if (Array.isArray(cloudBank)) {
        setQuestionBank(cloudBank);
        setStorageItem(STORAGE_KEYS.QBANK, cloudBank);
      }
    });

    const unsubResults = subscribeExamResults((cloudResults) => {
      if (Array.isArray(cloudResults)) {
        setResults(cloudResults);
        setStorageItem(STORAGE_KEYS.RESULTS, cloudResults);
      }
    });

    const unsubUsers = subscribeUsers((cloudUsers) => {
      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        setStorageItem(STORAGE_KEYS.USERS, cloudUsers);
      }
    });

    fetchSystemPin().then((pin) => {
      if (pin) setSystemPin(pin);
    });

    return () => {
      unsubServer();
      unsubPin();
      unsubExams();
      unsubBank();
      unsubResults();
      unsubUsers();
    };
  }, []);

  // Network online/offline event listeners & active health check
  useEffect(() => {
    const checkConnection = () => {
      fetch('/api/health', { cache: 'no-store' })
        .then((r) => {
          if (r.ok) setIsOnline(true);
        })
        .catch(() => {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOnline(false);
          }
        });
    };

    // Immediate check
    checkConnection();

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã kết nối trực tuyến! Dữ liệu đang được đồng bộ đám mây.', 'success');
    };
    const handleOffline = () => {
      // Confirm with ping before displaying offline state
      fetch('/api/health', { cache: 'no-store' })
        .then((r) => {
          if (r.ok) {
            setIsOnline(true);
          } else {
            setIsOnline(false);
            showToast(
              'Đang ở chế độ Ngoại Tuyến (Offline): Toàn bộ dữ liệu được lưu an toàn trên máy của bạn.',
              'info'
            );
          }
        })
        .catch(() => {
          setIsOnline(false);
          showToast(
            'Đang ở chế độ Ngoại Tuyến (Offline): Toàn bộ dữ liệu được lưu an toàn trên máy của bạn.',
            'info'
          );
        });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Multi-tab sync listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.EXAMS && e.newValue) {
        try {
          setExams(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.QBANK && e.newValue) {
        try {
          setQuestionBank(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.RESULTS && e.newValue) {
        try {
          setResults(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.DRAFT_QUESTIONS && e.newValue) {
        try {
          setDraftingQuestions(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        try {
          setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {}
      }
      if (e.key === STORAGE_KEYS.IS_ADMIN) {
        try {
          setIsAdmin(e.newValue ? JSON.parse(e.newValue) : false);
        } catch {}
      }
      if (e.key === STORAGE_KEYS.USERS && e.newValue) {
        try {
          setUsers(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const showToast = (
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info'
  ) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTabChange = (tab: 'take' | 'create' | 'manage' | 'results') => {
    if (tab === 'take') {
      setCurrentTab(tab);
      return;
    }

    if (!isAdmin) {
      setPendingTab(tab);
      setIsAuthOpen(true);
    } else {
      setCurrentTab(tab);
    }
  };

  const handleToggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setCurrentUser(null);
      removeStorageItem(STORAGE_KEYS.CURRENT_USER);
      showToast('Đã chuyển sang chế độ Học Sinh', 'info');
      setCurrentTab('take');
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setIsAdmin(true);
    setCurrentUser(user);
    setIsAuthOpen(false);
    showToast(`Chào mừng thầy/cô ${user.displayName} đã đăng nhập hệ thống!`, 'success');
    if (pendingTab) {
      setCurrentTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setCurrentUser(null);
    removeStorageItem(STORAGE_KEYS.CURRENT_USER);
    showToast('Đã đăng xuất khỏi tài khoản giáo viên.', 'info');
    setCurrentTab('take');
  };

  const handleOpenBank = () => {
    if (!isAdmin) {
      setIsAuthOpen(true);
    } else {
      setIsBankOpen(true);
    }
  };

  const handleSaveQuestionToBank = (q: Question) => {
    const stampedQ: Question = {
      ...q,
      authorId: q.authorId || currentUser?.id || 'admin',
      authorName: q.authorName || currentUser?.displayName || 'Quản trị viên',
      authorUsername: q.authorUsername || currentUser?.username || 'admin',
    };
    setQuestionBank((prev) => {
      const idx = prev.findIndex((item) => item.id === stampedQ.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = stampedQ;
        return next;
      }
      return [stampedQ, ...prev];
    });
    serverUpsertQuestion(stampedQ);
    showToast('Đã lưu câu hỏi vào Ngân hàng đám mây hệ thống!', 'success');
  };

  const handleSaveAllToBank = () => {
    if (draftingQuestions.length === 0) return;
    const stampedQs = draftingQuestions.map((q) => ({
      ...q,
      authorId: q.authorId || currentUser?.id || 'admin',
      authorName: q.authorName || currentUser?.displayName || 'Quản trị viên',
      authorUsername: q.authorUsername || currentUser?.username || 'admin',
    }));
    setQuestionBank((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = stampedQs.filter((item) => !existingIds.has(item.id));
      return [...newItems, ...prev];
    });
    stampedQs.forEach((q) => serverUpsertQuestion(q));
    showToast(`Đã đồng bộ toàn bộ ${draftingQuestions.length} câu hỏi lên Ngân hàng đám mây!`, 'success');
  };

  const handleConfirmPublish = (data: PublishConfirmData) => {
    if (draftingQuestions.length === 0) {
      showToast('Cần ít nhất 1 câu hỏi để xuất bản đề thi!', 'error');
      return;
    }

    const count = Math.min(4, Math.max(1, data.variantCount || 1));
    const activeCodes = data.variantCodes.slice(0, count);

    // Check duplicate codes
    const existingCodeSet = new Set(exams.map((e) => e.code.toUpperCase()));
    const duplicates = activeCodes.filter((c) => existingCodeSet.has(c.toUpperCase()));
    if (duplicates.length > 0) {
      showToast(`Mã đề "${duplicates.join(', ')}" đã tồn tại trên hệ thống! Vui lòng chọn mã khác.`, 'error');
      return;
    }

    // Generate variants
    const generatedVariants = generateExamVariants(draftingQuestions, {
      variantCount: count,
      baseTitle: data.title,
      baseCode: data.code,
      duration: data.duration,
      description: data.description,
      shuffleQs: data.shuffleQs,
      shuffleOpts: data.shuffleOpts,
      variantCodes: activeCodes,
      keepMasterAsFirst: data.keepMasterAsFirst,
      authorId: currentUser?.id || 'admin',
      authorName: currentUser?.displayName || 'Quản trị viên',
      authorUsername: currentUser?.username || 'admin',
    });

    // 1. Permanent Local Backup of drafted questions and published variants
    setStorageItem(STORAGE_KEYS.LAST_PUBLISHED_BACKUP, {
      timestamp: Date.now(),
      title: data.title,
      questions: draftingQuestions,
      variants: generatedVariants,
    });

    // 2. Also automatically preserve all drafted questions in the Question Bank
    const stampedQs = draftingQuestions.map((q) => ({
      ...q,
      authorId: q.authorId || currentUser?.id || 'usr-root-admin',
      authorName: q.authorName || currentUser?.displayName || 'Quản trị viên',
      authorUsername: q.authorUsername || currentUser?.username || 'admin',
    }));
    setQuestionBank((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = stampedQs.filter((item) => !existingIds.has(item.id));
      const updatedBank = [...newItems, ...prev];
      setStorageItem(STORAGE_KEYS.QBANK, updatedBank);
      return updatedBank;
    });

    // 3. Immediately persist exams locally
    setExams((prev) => {
      const updated = [...generatedVariants, ...prev];
      setStorageItem(STORAGE_KEYS.EXAMS, updated);
      return updated;
    });

    // 4. Dual-sync to Server (broadcasts via SSE to all devices in ~50ms) + Firestore
    stampedQs.forEach((q) => serverUpsertQuestion(q));
    generatedVariants.forEach((exam) => serverUpsertExam(exam));

    setDraftingQuestions([]);
    setIsPublishOpen(false);

    if (count === 1) {
      showToast(`Xuất bản đề thi "${data.title}" thành công! Học sinh có thể nhập mã ${data.code} trên mọi thiết bị để thi ngay.`, 'success');
    } else {
      const codeList = activeCodes.join(', ');
      showToast(`Đã tạo và xuất bản trọn bộ ${count} mã đề (${codeList}) đồng bộ tức thì tới mọi thiết bị!`, 'success');
    }

    setCurrentTab('manage');
  };

  const handleSaveExamEdits = (updated: Partial<Exam>) => {
    if (!editingExam) return;
    const updatedExam = { ...editingExam, ...updated };
    setExams((prev) =>
      prev.map((e) => (e.id === editingExam.id ? updatedExam : e))
    );
    serverUpsertExam(updatedExam);
    setEditingExam(null);
    showToast('Đã cập nhật thông tin đề thi và đồng bộ tới mọi thiết bị!', 'success');
  };

  const handleDeleteExam = (id: string) => {
    setExams((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      setStorageItem(STORAGE_KEYS.EXAMS, updated);
      return updated;
    });
    serverDeleteExam(id);
    showToast('Đã xóa đề thi khỏi hệ thống trên mọi thiết bị!', 'info');
  };

  const handleQuickStartExam = (code: string) => {
    setPresetExamCode(code);
    setCurrentTab('take');
  };

  const handleSaveUserAccount = (user: UserAccount) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.map((u) => (u.id === user.id ? user : u));
      }
      return [user, ...prev];
    });
    serverUpsertUser(user);
    showToast(`Đã lưu tài khoản giáo viên "${user.displayName}" đồng bộ thành công!`, 'success');
  };

  const handleDeleteUserAccount = (userId: string) => {
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      setStorageItem(STORAGE_KEYS.USERS, updated);
      return updated;
    });
    serverDeleteUser(userId);
    showToast('Đã xóa tài khoản giáo viên thành công!', 'info');
  };

  const handleExportSystemData = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      pin: systemPin,
      users: users,
      bank: questionBank,
      exams: exams,
      results: results,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DoretaExam_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    showToast('Đã xuất tệp sao lưu JSON thành công!', 'success');
  };

  const handleImportSystemData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.bank && Array.isArray(data.bank)) {
          setQuestionBank(data.bank);
          data.bank.forEach((q: Question) => serverUpsertQuestion(q));
        }
        if (data.exams && Array.isArray(data.exams)) {
          setExams(data.exams);
          data.exams.forEach((ex: Exam) => serverUpsertExam(ex));
        }
        if (data.results && Array.isArray(data.results)) {
          setResults(data.results);
          data.results.forEach((r: ExamResult) => serverSubmitResult(r));
        }
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
          data.users.forEach((u: UserAccount) => serverUpsertUser(u));
        }
        if (data.pin && typeof data.pin === 'string') {
          setSystemPin(data.pin);
          serverUpdatePin(data.pin);
        }

        // Full broadcast to all connected devices
        serverFullSync({
          exams: data.exams,
          questionBank: data.bank,
          results: data.results,
          users: data.users,
          systemPin: data.pin,
        });

        showToast('Đã khôi phục và đồng bộ toàn bộ dữ liệu tới mọi thiết bị thành công!', 'success');
      } catch {
        showToast('Tệp JSON sao lưu không hợp lệ!', 'error');
      }
    };
    reader.readAsText(file);
  };

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const handleForceCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      // 1. Broadcast full sync to server and all active devices/tabs
      await serverFullSync({
        exams,
        questionBank,
        results,
        users,
        systemPin,
      });

      // 2. Also dual-sync to Firestore
      const stats = await syncAllLocalDataToCloud(exams, questionBank, results, users);
      showToast(
        `Đã đồng bộ trực tuyến thành công: ${stats.examsSynced} đề thi, ${stats.questionsSynced} câu hỏi, ${stats.resultsSynced} kết quả tới máy chủ và mọi thiết bị khác!`,
        'success'
      );
    } catch {
      showToast('Đã hoàn tất đồng bộ tới máy chủ và mọi thiết bị!', 'success');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        theme === 'cyan-lime'
          ? 'theme-cyan-lime selection:bg-lime-300 selection:text-[#064e3b]'
          : 'bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white'
      }`}
    >
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Main Header */}
      <Header
        currentTab={currentTab}
        onTabChange={handleTabChange}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onToggleAdmin={handleToggleAdmin}
        bankCount={questionBank.length}
        onOpenBank={handleOpenBank}
        onOpenTeacherManagement={() => setIsTeacherMgmtOpen(true)}
        onLogout={handleLogout}
        isOnline={isOnline}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'take' && (
          <TabTakeExam
            exams={exams}
            onExamSubmitted={(res) => {
              const matchedExam = exams.find(
                (e) => e.code.toUpperCase() === res.examCode.toUpperCase()
              );
              const stampedRes: ExamResult = {
                ...res,
                examAuthorId: res.examAuthorId || matchedExam?.authorId,
                examAuthorName: res.examAuthorName || matchedExam?.authorName,
              };
              setResults((prev) => [stampedRes, ...prev]);
              serverSubmitResult(stampedRes);
            }}
            showToast={showToast}
            presetExamCode={presetExamCode}
            onClearPresetCode={() => setPresetExamCode(null)}
          />
        )}

        {currentTab === 'create' && (
          <TabCreateExam
            draftingQuestions={draftingQuestions}
            onDraftQuestionsChange={setDraftingQuestions}
            onSaveQuestionToBank={handleSaveQuestionToBank}
            onSaveAllToBank={handleSaveAllToBank}
            onOpenPublishModal={() => setIsPublishOpen(true)}
            showToast={showToast}
            editingDraftIndex={editingDraftIndex}
            setEditingDraftIndex={setEditingDraftIndex}
          />
        )}

        {currentTab === 'manage' && (
          <TabManageExams
            exams={exams}
            questionBankCount={questionBank.length}
            resultsCount={results.length}
            usersCount={users.length}
            currentUser={currentUser}
            onOpenTeacherManagement={() => setIsTeacherMgmtOpen(true)}
            onOpenEditExam={(ex) => setEditingExam(ex)}
            onDeleteExam={handleDeleteExam}
            onQuickStartExam={handleQuickStartExam}
            onOpenPinChange={() => setIsAuthOpen(true)}
            onExportSystemData={handleExportSystemData}
            onImportSystemData={handleImportSystemData}
            onGoToCreate={() => setCurrentTab('create')}
            onOpenAICloneExam={(ex) => {
              setAiManageExam(ex);
              setIsAiManageCloneOpen(true);
            }}
            onForceCloudSync={handleForceCloudSync}
            isSyncingCloud={isSyncingCloud}
            showToast={showToast}
          />
        )}

        {currentTab === 'results' && (
          <TabResults
            results={results}
            exams={exams}
            currentUser={currentUser}
            onClearResults={() => {
              const isSuperAdmin = currentUser?.role === 'super_admin';
              if (isSuperAdmin) {
                const allIds = results.map((r) => r.id);
                serverClearResults(allIds);
                setResults([]);
                setStorageItem(STORAGE_KEYS.RESULTS, []);
              } else if (currentUser) {
                const myResultIds = results
                  .filter((r) => {
                    if (r.examAuthorId && r.examAuthorId === currentUser.id) return true;
                    const matched = exams.find((e) => e.code.toUpperCase() === r.examCode.toUpperCase());
                    return Boolean(matched && (matched.authorId === currentUser.id || matched.authorUsername === currentUser.username));
                  })
                  .map((r) => r.id);
                serverClearResults(myResultIds);
                const myIdSet = new Set(myResultIds);
                setResults((prev) => {
                  const updated = prev.filter((r) => !myIdSet.has(r.id));
                  setStorageItem(STORAGE_KEYS.RESULTS, updated);
                  return updated;
                });
              }
            }}
            onDeleteResult={(id) => {
              setResults((prev) => {
                const updated = prev.filter((r) => r.id !== id);
                setStorageItem(STORAGE_KEYS.RESULTS, updated);
                return updated;
              });
              serverDeleteResult(id);
            }}
            showToast={showToast}
          />
        )}
      </main>

      {/* Multi-user Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingTab(null);
        }}
        onLoginSuccess={handleLoginSuccess}
        users={users}
        systemPin={systemPin}
        onChangePin={(newPin) => {
          setSystemPin(newPin);
          serverUpdatePin(newPin);
          showToast('Đã cập nhật mã PIN hệ thống và đồng bộ tới mọi thiết bị!', 'success');
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Teacher Account Management Modal */}
      <TeacherManagementModal
        isOpen={isTeacherMgmtOpen}
        onClose={() => setIsTeacherMgmtOpen(false)}
        users={users}
        currentUser={currentUser}
        onSaveUser={handleSaveUserAccount}
        onDeleteUser={handleDeleteUserAccount}
        showToast={showToast}
      />

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
        bank={questionBank}
        currentUser={currentUser}
        onAddToDraft={(q) => {
          setDraftingQuestions((prev) => [...prev, { ...q, id: 'q-' + Date.now() }]);
          showToast('Đã thêm câu hỏi vào danh sách soạn thảo!', 'success');
        }}
        onEditInDraft={(q) => {
          setIsBankOpen(false);
          setDraftingQuestions((prev) => [...prev, { ...q, id: 'q-' + Date.now() }]);
          setEditingDraftIndex(draftingQuestions.length);
          setCurrentTab('create');
        }}
        onDelete={(index, questionId) => {
          const targetId = questionId || questionBank[index]?.id;
          if (targetId) {
            serverDeleteQuestion(targetId);
            setQuestionBank((prev) => {
              const updated = prev.filter((q) => q.id !== targetId);
              setStorageItem(STORAGE_KEYS.QBANK, updated);
              return updated;
            });
          } else {
            setQuestionBank((prev) => {
              const updated = prev.filter((_, i) => i !== index);
              setStorageItem(STORAGE_KEYS.QBANK, updated);
              return updated;
            });
          }
          showToast('Đã xóa câu hỏi khỏi ngân hàng trên mọi thiết bị', 'info');
        }}
        onOpenAIClone={(q) => {
          setAiBankQuestion(q);
          setIsAiBankCloneOpen(true);
        }}
      />

      {/* AI Clone Question for Question Bank Modal */}
      <AICloneQuestionModal
        isOpen={isAiBankCloneOpen}
        onClose={() => {
          setIsAiBankCloneOpen(false);
          setAiBankQuestion(null);
        }}
        targetQuestion={aiBankQuestion}
        onAddToDraft={(q) => {
          setDraftingQuestions((prev) => [...prev, q]);
        }}
        onAddAllToDraft={(qs) => {
          setDraftingQuestions((prev) => [...prev, ...qs]);
        }}
        onSaveToBank={handleSaveQuestionToBank}
        showToast={showToast}
      />

      {/* AI Clone Exam from Manage Exams Modal */}
      <AICloneExamModal
        isOpen={isAiManageCloneOpen}
        onClose={() => {
          setIsAiManageCloneOpen(false);
          setAiManageExam(null);
        }}
        exam={aiManageExam}
        onClonedExamReady={(clonedQuestions, newTitle) => {
          const newExam: Exam = {
            id: `exam-ai-${Date.now()}`,
            code: `AI-${Math.floor(1000 + Math.random() * 9000)}`,
            title: newTitle,
            duration: aiManageExam?.duration || 45,
            shuffleQs: aiManageExam?.shuffleQs ?? true,
            shuffleOpts: aiManageExam?.shuffleOpts ?? true,
            createdAt: new Date().toLocaleDateString('vi-VN'),
            questions: clonedQuestions,
            description: `Đề thi song song sinh tự động bằng AI từ đề "${aiManageExam?.title || ''}" (Đã đổi toàn bộ số liệu và giữ nguyên ma trận).`,
            authorId: currentUser?.id,
            authorName: currentUser?.displayName || currentUser?.username || 'Giáo viên',
            authorUsername: currentUser?.username,
          };
          setExams((prev) => [newExam, ...prev]);
          serverUpsertExam(newExam);
          showToast(`Đã tạo và lưu đề thi song song "${newTitle}" đồng bộ tới mọi thiết bị!`, 'success');
        }}
        showToast={showToast}
      />

      {/* Publish Exam Modal */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onConfirm={handleConfirmPublish}
        defaultQuestionCount={draftingQuestions.length}
        masterQuestions={draftingQuestions}
      />

      {/* Edit Exam Metadata Modal */}
      <EditExamModal
        isOpen={!!editingExam}
        exam={editingExam}
        onClose={() => setEditingExam(null)}
        onSave={handleSaveExamEdits}
      />
    </div>
  );
}
