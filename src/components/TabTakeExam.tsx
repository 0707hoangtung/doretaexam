import React, { useState, useEffect, useRef } from 'react';
import { Exam, ExamResult, Question } from '../types';
import { MathText } from '../utils/mathRenderer';
import { calculateMOETScore, ScoreBreakdown } from '../utils/scoring';
import { shuffleExamQuestions, getExamParts } from '../utils/examStructure';
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  ActiveExamSession,
} from '../utils/storage';
import confetti from 'canvas-confetti';
import { AudioPlayer } from './AudioPlayer';
import {
  PenTool,
  Clock,
  Send,
  AlertTriangle,
  Trophy,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  School,
  Hash,
  CheckCircle2,
  X,
  AlertCircle,
  ShieldAlert,
  IdCard,
  Volume2,
} from 'lucide-react';

interface TabTakeExamProps {
  exams: Exam[];
  onExamSubmitted: (result: ExamResult) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  presetExamCode?: string | null;
  onClearPresetCode?: () => void;
}

export const TabTakeExam: React.FC<TabTakeExamProps> = ({
  exams,
  onExamSubmitted,
  showToast,
  presetExamCode,
  onClearPresetCode,
}) => {
  // Entry states
  const [examCode, setExamCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentSbd, setStudentSbd] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Active exam states
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [activeAnswers, setActiveAnswers] = useState<Record<string | number, any>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [examStartTime, setExamStartTime] = useState<number>(0);

  // Result popup state
  const [completedResult, setCompletedResult] = useState<{
    result: ExamResult;
    breakdown: ScoreBreakdown;
  } | null>(null);

  // Submit Confirmation Modal State
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  const timerRef = useRef<any>(null);

  // Restore unfinished active exam session upon page reload / reconnect
  useEffect(() => {
    const savedSession = getStorageItem<ActiveExamSession | null>(
      STORAGE_KEYS.ACTIVE_SESSION,
      null
    );

    if (savedSession && savedSession.exam && !activeExam) {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - savedSession.savedTimestamp) / 1000)
      );
      const remaining = Math.max(0, savedSession.secondsLeft - elapsedSeconds);

      if (remaining > 0) {
        setActiveExam(savedSession.exam);
        setActiveQuestions(savedSession.questions || []);
        setActiveAnswers(savedSession.answers || {});
        setSecondsLeft(remaining);
        setExamStartTime(savedSession.examStartTime || Date.now());
        setTabSwitchCount(savedSession.tabSwitchCount || 0);
        setStudentName(savedSession.studentName || '');
        setStudentSbd(savedSession.studentSbd || '');
        setStudentClass(savedSession.studentClass || '');
        setExamCode(savedSession.examCode || '');
        showToast(
          `Đã khôi phục bài thi đang làm dở của thí sinh "${savedSession.studentName}"!`,
          'success'
        );
      } else {
        removeStorageItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    }
  }, []);

  // Continuously sync active exam session to storage
  useEffect(() => {
    if (activeExam) {
      const session: ActiveExamSession = {
        exam: activeExam,
        questions: activeQuestions,
        answers: activeAnswers,
        secondsLeft,
        examStartTime,
        tabSwitchCount,
        studentName,
        studentSbd,
        studentClass,
        examCode,
        savedTimestamp: Date.now(),
      };
      setStorageItem(STORAGE_KEYS.ACTIVE_SESSION, session);
    }
  }, [
    activeExam,
    activeQuestions,
    activeAnswers,
    secondsLeft,
    examStartTime,
    tabSwitchCount,
    studentName,
    studentSbd,
    studentClass,
    examCode,
  ]);

  // Warn before closing tab or navigating away during active exam
  useEffect(() => {
    if (!activeExam) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Bạn đang trong quá trình làm bài thi. Toàn bộ câu trả lời đã được lưu trữ tự động.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeExam]);

  // Handle preset exam code (e.g. from manage tab "Thi Thử")
  useEffect(() => {
    if (presetExamCode) {
      setExamCode(presetExamCode);
      if (onClearPresetCode) onClearPresetCode();
    }
  }, [presetExamCode, onClearPresetCode]);

  // Anti-cheat visibility listener
  useEffect(() => {
    if (!activeExam) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          showToast(
            `CẢNH BÁO GIAN LẬN: Bạn vừa rời khỏi màn hình làm bài (${next} lần)! Hệ thống đã ghi nhận.`,
            'error'
          );
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeExam, showToast]);

  // Countdown timer effect
  useEffect(() => {
    if (!activeExam || secondsLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeExam, secondsLeft]);

  const handleStartExam = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanCode = examCode.trim().toUpperCase();
    const cleanName = studentName.trim();
    const cleanClass = studentClass.trim() || 'Tự do';

    if (!cleanCode || !cleanName) {
      showToast('Vui lòng nhập đầy đủ Mã đề thi và Họ tên học sinh!', 'error');
      return;
    }

    const found = exams.find((ex) => ex.code.toUpperCase() === cleanCode);
    if (!found) {
      showToast(`Không tìm thấy đề thi với mã "${cleanCode}"! Vui lòng kiểm tra lại.`, 'error');
      return;
    }

    if (!found.questions || found.questions.length === 0) {
      showToast('Đề thi này hiện chưa có câu hỏi nào!', 'error');
      return;
    }

    // Clone questions and apply MOET 3-part shuffles
    const preparedQs = shuffleExamQuestions(
      found.questions,
      !!found.shuffleQs,
      !!found.shuffleOpts
    );

    setActiveExam(found);
    setActiveQuestions(preparedQs);
    setActiveAnswers({});
    setTabSwitchCount(0);
    setSecondsLeft((found.duration || 45) * 60);
    setExamStartTime(Date.now());
    setCompletedResult(null);

    showToast(`Bắt đầu làm bài: ${found.title}`, 'success');
  };

  const handleAutoSubmit = () => {
    showToast('Đã hết thời gian làm bài! Hệ thống tự động nộp bài.', 'warning');
    performSubmit();
  };

  const handleManualSubmit = () => {
    setIsConfirmSubmitOpen(true);
  };

  const performSubmit = () => {
    if (!activeExam) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsConfirmSubmitOpen(false);

    try {
      const breakdown = calculateMOETScore(
        { ...activeExam, questions: activeQuestions },
        activeAnswers
      );

      const spentSeconds = Math.max(
        1,
        Math.round((Date.now() - examStartTime) / 1000)
      );

      // Extract part scores for breakdown reporting
      const part1Earned = Math.round(breakdown.partDetails.filter((p) => p.type === 'mc').reduce((sum, p) => sum + p.earned, 0) * 100) / 100;
      const part1Max = Math.round(breakdown.partDetails.filter((p) => p.type === 'mc').reduce((sum, p) => sum + p.max, 0) * 100) / 100;

      const part2Earned = Math.round(breakdown.partDetails.filter((p) => p.type === 'tf').reduce((sum, p) => sum + p.earned, 0) * 100) / 100;
      const part2Max = Math.round(breakdown.partDetails.filter((p) => p.type === 'tf').reduce((sum, p) => sum + p.max, 0) * 100) / 100;

      const part3Earned = Math.round(breakdown.partDetails.filter((p) => p.type === 'short').reduce((sum, p) => sum + p.earned, 0) * 100) / 100;
      const part3Max = Math.round(breakdown.partDetails.filter((p) => p.type === 'short').reduce((sum, p) => sum + p.max, 0) * 100) / 100;

      const part4Earned = Math.round(breakdown.partDetails.filter((p) => p.type === 'essay').reduce((sum, p) => sum + p.earned, 0) * 100) / 100;
      const part4Max = Math.round(breakdown.partDetails.filter((p) => p.type === 'essay').reduce((sum, p) => sum + p.max, 0) * 100) / 100;

      const resultEntry: ExamResult = {
        id: 'res-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        studentName: studentName.trim() || 'Học sinh',
        studentSbd: studentSbd.trim() || undefined,
        studentClass: studentClass.trim() || 'Tự do',
        examCode: activeExam.code,
        examTitle: activeExam.title,
        score: breakdown.finalScore,
        tabSwitchCount: tabSwitchCount,
        submittedAt: new Date().toISOString(),
        durationSpentSeconds: spentSeconds,
        answers: { ...activeAnswers },
        scoreBreakdown: {
          part1Earned,
          part1Max,
          part2Earned,
          part2Max,
          part3Earned,
          part3Max,
          part4Earned,
          part4Max,
        },
      };

      onExamSubmitted(resultEntry);
      setCompletedResult({ result: resultEntry, breakdown });

      // Fire celebration confetti for good score
      if (breakdown.finalScore >= 5) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }

      showToast('Đã nộp bài thi thành công!', 'success');
    } catch (err) {
      console.error('Lỗi khi nộp bài:', err);
      // Fallback submission if unexpected calculation issue occurs
      const resultEntry: ExamResult = {
        id: 'res-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        studentName: studentName.trim() || 'Học sinh',
        studentSbd: studentSbd.trim() || undefined,
        studentClass: studentClass.trim() || 'Tự do',
        examCode: activeExam.code,
        examTitle: activeExam.title,
        score: 0,
        tabSwitchCount: tabSwitchCount,
        submittedAt: new Date().toISOString(),
        durationSpentSeconds: 60,
        answers: { ...activeAnswers },
      };
      onExamSubmitted(resultEntry);
      setCompletedResult({
        result: resultEntry,
        breakdown: {
          finalScore: 0,
          totalEarnedWeight: 0,
          maxPossibleWeight: activeQuestions.length,
          partDetails: [],
        },
      });
      showToast('Đã ghi nhận bài nộp của bạn!', 'success');
    }

    removeStorageItem(STORAGE_KEYS.ACTIVE_SESSION);
    setActiveExam(null);
    setActiveQuestions([]);
    setActiveAnswers({});
  };

  const recordMcAnswer = (qIndex: number, optionKey: string) => {
    setActiveAnswers((prev) => ({
      ...prev,
      [qIndex]: optionKey,
    }));
  };

  const recordTfAnswer = (
    qIndex: number,
    statementKey: 'a' | 'b' | 'c' | 'd',
    value: 'true' | 'false'
  ) => {
    setActiveAnswers((prev) => {
      const currentQAns = prev[qIndex] && typeof prev[qIndex] === 'object' ? { ...prev[qIndex] } : {};
      currentQAns[statementKey] = value;
      return {
        ...prev,
        [qIndex]: currentQAns,
      };
    });
  };

  const recordTextAnswer = (qIndex: number, textVal: string) => {
    setActiveAnswers((prev) => ({
      ...prev,
      [qIndex]: textVal,
    }));
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollToQuestion = (idx: number) => {
    const el = document.getElementById(`live_question_${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isQuestionAnswered = (idx: number, q: Question) => {
    const ans = activeAnswers[idx];
    if (ans === undefined || ans === null) return false;
    if (q.type === 'mc') return Boolean(ans);
    if (q.type === 'tf') {
      return typeof ans === 'object' && Object.keys(ans).length > 0;
    }
    if (q.type === 'short' || q.type === 'essay') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    return false;
  };

  // Render Result Completion Modal
  if (completedResult) {
    const { result, breakdown } = completedResult;
    const isPass = result.score >= 5;

    return (
      <div className="max-w-2xl mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
        <div
          className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black shadow-xl ${
            isPass
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-500/10'
          }`}
        >
          <Trophy className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1 rounded-full">
            {result.examCode}
          </span>
          <h3 className="text-2xl font-black text-white mt-2">{result.examTitle}</h3>
          <p className="text-xs text-slate-400 mt-1">
            Thí sinh: <strong className="text-white">{result.studentName}</strong>
            {result.studentSbd && (
              <>
                {' '}• SBD: <strong className="text-indigo-400 font-mono">{result.studentSbd}</strong>
              </>
            )}
            {' '}• Lớp: <strong className="text-white">{result.studentClass}</strong>
          </p>
        </div>

        {/* Score Display Card */}
        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tổng Điểm Bài Thi (Tổng Điểm Thô Thực Tế)
          </p>
          <div className="text-5xl font-black font-mono text-emerald-400">
            {result.score}{' '}
            <span className="text-lg font-bold text-slate-500 font-sans">
              / {breakdown.rawMaxScore} điểm
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 pt-1">
            Tổng điểm đạt được:{' '}
            <span className="text-indigo-300 font-mono font-bold">
              {breakdown.rawEarnedScore} điểm
            </span>{' '}
            (trên tổng số <span className="font-mono text-white">{breakdown.rawMaxScore} điểm</span> tối đa của đề)
          </p>
        </div>

        {/* Scoring Rules Guide Card */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-left text-xs space-y-2">
          <p className="font-bold text-slate-300 uppercase text-[11px] tracking-wider">
            Quy tắc chấm điểm áp dụng:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
              <span><strong>Trắc nghiệm ABCD:</strong> 0.25 điểm / câu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span><strong>Trả lời ngắn:</strong> 0.5 điểm / câu</span>
            </div>
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span>
                <strong>Trắc nghiệm Đúng/Sai:</strong> Đúng 1/4 ý = 0.1đ | Đúng 2/4 ý = 0.25đ | Đúng 3/4 ý = 0.5đ | Đúng 4/4 ý = 1.0đ
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Question Scoring Table */}
        {breakdown.partDetails && breakdown.partDetails.length > 0 && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 text-left space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chi Tiết Điểm Từng Câu Hỏi:
            </h4>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 text-xs pr-1">
              {breakdown.partDetails.map((pd) => (
                <div
                  key={pd.qIndex}
                  className="py-2.5 flex items-center justify-between gap-3 text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-indigo-400 bg-indigo-950/60 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px]">
                      Câu {pd.qIndex + 1}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {pd.type === 'mc'
                        ? 'Trắc nghiệm ABCD'
                        : pd.type === 'tf'
                        ? 'Đúng/Sai'
                        : pd.type === 'short'
                        ? 'Trả lời ngắn'
                        : 'Tự luận'}
                    </span>
                    {pd.note && (
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        ({pd.note})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`font-black ${
                        pd.earned > 0 ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      +{pd.earned}đ
                    </span>
                    <span className="text-slate-600 text-[11px]">/ {pd.max}đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Thời Gian Làm Bài</span>
            <span className="font-mono font-bold text-white text-sm">
              {result.durationSpentSeconds
                ? `${Math.floor(result.durationSpentSeconds / 60)}p ${result.durationSpentSeconds % 60}s`
                : '--'}
            </span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Đổi Màn Hình</span>
            <span
              className={`font-mono font-bold text-sm ${
                result.tabSwitchCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {result.tabSwitchCount} lần
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Thời Gian Nộp</span>
            <span className="font-mono font-bold text-slate-200 text-xs">{result.submittedAt}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => setCompletedResult(null)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Về Phòng Thi / Làm Bài Khác</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Exam Screen
  if (activeExam) {
    const answeredCount = Object.keys(activeAnswers).length;
    const totalCount = activeQuestions.length;
    const progressPercent = Math.round((answeredCount / Math.max(1, totalCount)) * 100);

    return (
      <div className="space-y-6">
        {/* Sticky Exam Header */}
        <div className="sticky top-[80px] z-30 bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 backdrop-blur-md shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                  {activeExam.code}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white">{activeExam.title}</h3>
              </div>
              <p className="text-xs text-slate-400 font-semibold">
                Thí sinh: <span className="text-slate-200 font-bold">{studentName}</span>
                {studentSbd && (
                  <>
                    {' '}• SBD: <span className="text-indigo-400 font-mono font-bold">{studentSbd}</span>
                  </>
                )}
                {' '}• Lớp: <span className="text-slate-200 font-bold">{studentClass || 'Tự do'}</span>
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>Thời Gian Còn Lại</span>
                </span>
                <span
                  className={`font-mono text-xl font-black ${
                    secondsLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'
                  }`}
                >
                  {formatTime(secondsLeft)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleManualSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 uppercase tracking-wide"
              >
                <Send className="w-4 h-4" />
                <span>NỘP BÀI THI</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>
                Tiến độ: {answeredCount} / {totalCount} câu ({progressPercent}%)
              </span>
              {tabSwitchCount > 0 && (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Rời màn hình: {tabSwitchCount} lần</span>
                </span>
              )}
            </div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Layout: Main Questions + Question Navigator */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Questions List */}
          <div className="lg:col-span-3 space-y-6">
            {activeQuestions.map((q, idx) => {
              const currentAns = activeAnswers[idx];
              const prevQ = idx > 0 ? activeQuestions[idx - 1] : null;
              const isFirstOfPart = !prevQ || prevQ.type !== q.type;

              // Check if q starts a cluster with groupStem
              const isClusterStart = Boolean(
                q.type === 'mc' &&
                q.groupStem &&
                q.groupStem.trim() &&
                (!prevQ || prevQ.type !== 'mc' || prevQ.groupId !== q.groupId || prevQ.groupStem !== q.groupStem)
              );

              let clusterEndIdx = idx;
              if (isClusterStart) {
                while (
                  clusterEndIdx + 1 < activeQuestions.length &&
                  activeQuestions[clusterEndIdx + 1].type === 'mc' &&
                  activeQuestions[clusterEndIdx + 1].groupId === q.groupId &&
                  activeQuestions[clusterEndIdx + 1].groupStem === q.groupStem
                ) {
                  clusterEndIdx++;
                }
              }

              let partBanner = null;
              if (isFirstOfPart) {
                if (q.type === 'mc') {
                  partBanner = (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                          PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (A, B, C, D)
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Thí sinh chọn một phương án đúng duy nhất cho mỗi câu hỏi.
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        0.25 điểm / câu
                      </span>
                    </div>
                  );
                } else if (q.type === 'tf') {
                  partBanner = (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                          PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG / SAI (a, b, c, d)
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Trong mỗi ý a), b), c), d) ở từng câu, thí sinh chọn Đúng hoặc Sai.
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        Tối đa 1.0 điểm / câu
                      </span>
                    </div>
                  );
                } else if (q.type === 'short') {
                  partBanner = (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                          PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Thí sinh điền kết quả vào ô trống tương ứng.
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        0.50 điểm / câu
                      </span>
                    </div>
                  );
                } else if (q.type === 'essay') {
                  partBanner = (
                    <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-purple-400 uppercase tracking-wider">
                          PHẦN IV. CÂU HỎI TỰ LUẬN
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Thí sinh làm bài tự luận theo yêu cầu.
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        Tự luận
                      </span>
                    </div>
                  );
                }
              }

              return (
                <React.Fragment key={q.id || idx}>
                  {partBanner}
                  {isClusterStart && (
                    <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/70 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3 my-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/30 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow-sm uppercase tracking-wide">
                            DỮ KIỆN CHUNG CHO CỤM CÂU HỎI
                          </span>
                          <span className="text-xs font-bold text-indigo-300">
                            (Dùng chung cho các câu từ Câu {idx + 1} đến Câu {clusterEndIdx + 1})
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                          {clusterEndIdx - idx + 1} câu liên tiếp
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-100 bg-slate-950/70 p-4 rounded-2xl border border-indigo-500/20 leading-relaxed font-sans">
                        <MathText text={q.groupStem!} />
                      </div>
                    </div>
                  )}
                  <div
                    id={`live_question_${idx}`}
                    className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-xl">
                          Câu {idx + 1}
                        </span>
                        {q.type === 'mc' && q.groupStem && (
                          <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
                            Thuộc chùm câu có dữ kiện chung
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-400">
                          {q.type === 'mc' ? 'Phần I (ABCD)' : q.type === 'tf' ? 'Phần II (Đ/S)' : q.type === 'short' ? 'Phần III (Ngắn)' : 'Tự luận'}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">• {q.topic}</span>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                        {typeof q.points === 'number' && q.points > 0
                          ? `${q.points}đ`
                          : q.type === 'mc'
                          ? '0.25đ'
                          : q.type === 'tf'
                          ? '1.0đ'
                          : q.type === 'short'
                          ? '0.5đ'
                          : '1.0đ'}
                      </span>
                    </div>

                    {/* 1. Stem */}
                    {q.stem && (
                      <div className="text-xs text-slate-400 italic bg-slate-950 p-3.5 rounded-2xl border border-slate-800/60">
                        <MathText text={q.stem} />
                      </div>
                    )}

                    {/* 2. Image Attachment */}
                    {q.image && (
                      <div className="my-2">
                        <img
                          src={q.image}
                          alt="Question illustration"
                          className="max-h-60 rounded-2xl border border-slate-800 object-contain mx-auto"
                        />
                      </div>
                    )}

                    {/* 2b. Audio Attachment */}
                    {q.audio && (
                      <AudioPlayer
                        src={q.audio}
                        audioName={q.audioName}
                        className="my-2"
                      />
                    )}

                    {/* 3. Main Question Content */}
                    <div className="text-sm font-semibold text-white leading-relaxed">
                      <MathText text={q.content} />
                    </div>

                    {/* Multiple Choice Answers */}
                    {q.type === 'mc' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                          const optVal =
                            q.options?.[optKey] ?? (q.options as any)?.[optKey.toLowerCase()];
                          if (optVal === undefined || optVal === null) return null;
                          const isSelected =
                            currentAns === optKey ||
                            (typeof currentAns === 'string' && currentAns.toUpperCase() === optKey);
                          return (
                            <label
                              key={optKey}
                              className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`liveAns_${idx}`}
                                value={optKey}
                                checked={isSelected}
                                onChange={() => recordMcAnswer(idx, optKey)}
                                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700"
                              />
                              <div className="text-xs">
                                <strong className="text-indigo-400 mr-1.5">{optKey}.</strong>
                                <MathText text={optVal} className="inline" />
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* True / False Answers */}
                    {q.type === 'tf' && q.statements && (
                      <div className="space-y-2.5 pt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Chọn Đúng hoặc Sai cho từng khẳng định:
                        </p>
                        {(['a', 'b', 'c', 'd'] as const).map((stKey) => {
                          const stVal =
                            q.statements?.[stKey] ?? (q.statements as any)?.[stKey.toUpperCase()];
                          if (stVal === undefined || stVal === null) return null;
                          const currentTfVal =
                            currentAns?.[stKey] ?? (currentAns as any)?.[stKey.toUpperCase()];
                          return (
                            <div
                              key={stKey}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800"
                            >
                              <div className="text-xs text-slate-200 flex-1">
                                <strong className="text-indigo-400 lowercase mr-1.5">{stKey})</strong>
                                <MathText text={stVal} className="inline" />
                              </div>

                              <div className="flex gap-2 shrink-0">
                                <label
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                    currentTfVal === 'true'
                                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`liveAns_${idx}_${stKey}`}
                                    value="true"
                                    checked={currentTfVal === 'true'}
                                    onChange={() =>
                                      recordTfAnswer(idx, stKey, 'true')
                                    }
                                    className="w-3.5 h-3.5 text-emerald-600 bg-slate-950 border-slate-700"
                                  />
                                  <span>Đúng</span>
                                </label>

                                <label
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                    currentTfVal === 'false'
                                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`liveAns_${idx}_${stKey}`}
                                    value="false"
                                    checked={currentTfVal === 'false'}
                                    onChange={() =>
                                      recordTfAnswer(idx, stKey, 'false')
                                    }
                                    className="w-3.5 h-3.5 text-rose-600 bg-slate-950 border-slate-700"
                                  />
                                  <span>Sai</span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer Input */}
                    {q.type === 'short' && (
                      <div className="pt-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Nhập câu trả lời ngắn của bạn:
                        </label>
                        <input
                          type="text"
                          value={currentAns || ''}
                          onChange={(e) => recordTextAnswer(idx, e.target.value)}
                          placeholder="Điền đáp án chính xác..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                        />
                      </div>
                    )}

                    {/* Essay Answer Textarea */}
                    {q.type === 'essay' && (
                      <div className="pt-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Nhập bài làm tự luận của bạn:
                        </label>
                        <textarea
                          rows={5}
                          value={currentAns || ''}
                          onChange={(e) => recordTextAnswer(idx, e.target.value)}
                          placeholder="Trình bày các bước làm bài chi tiết..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 custom-scrollbar"
                        />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Question Navigator Sticky Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-44 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Mục Lục Câu Hỏi
                </h4>
                <span className="text-[11px] font-mono text-indigo-400 font-bold">
                  {answeredCount}/{totalCount}
                </span>
              </div>

              {/* Grouped by Parts Navigator */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {(() => {
                  const parts = [
                    { type: 'mc', title: 'Phần I: ABCD', color: 'text-indigo-400' },
                    { type: 'tf', title: 'Phần II: Đúng / Sai', color: 'text-amber-400' },
                    { type: 'short', title: 'Phần III: Trả lời ngắn', color: 'text-emerald-400' },
                    { type: 'essay', title: 'Tự luận', color: 'text-purple-400' },
                  ];

                  return parts.map((p) => {
                    const questionsInPart = activeQuestions
                      .map((q, idx) => ({ q, idx }))
                      .filter((item) => item.q.type === p.type);

                    if (questionsInPart.length === 0) return null;

                    return (
                      <div key={p.type} className="space-y-1.5">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${p.color}`}>
                          {p.title} ({questionsInPart.length})
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                          {questionsInPart.map(({ q, idx }) => {
                            const answered = isQuestionAnswered(idx, q);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => scrollToQuestion(idx)}
                                className={`h-8 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center border ${
                                  answered
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <button
                type="button"
                onClick={handleManualSubmit}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>NỘP BÀI THI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {isConfirmSubmitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 relative">
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Xác Nhận Nộp Bài Thi</h3>
                  <p className="text-xs text-slate-400 font-semibold">{activeExam.title}</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng câu</span>
                  <span className="text-lg font-black font-mono text-white">{totalCount}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Đã làm</span>
                  <span className="text-lg font-black font-mono text-emerald-400">{answeredCount}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Chưa làm</span>
                  <span
                    className={`text-lg font-black font-mono ${
                      totalCount - answeredCount > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {totalCount - answeredCount}
                  </span>
                </div>
              </div>

              {/* Warning if any unanswered */}
              {totalCount - answeredCount > 0 ? (
                <div className="bg-rose-950/30 border border-rose-800/40 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Bạn còn {totalCount - answeredCount} câu chưa trả lời:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {activeQuestions
                      .map((q, idx) => ({ q, idx }))
                      .filter(({ q, idx }) => !isQuestionAnswered(idx, q))
                      .map(({ idx }) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setIsConfirmSubmitOpen(false);
                            scrollToQuestion(idx);
                          }}
                          className="bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 text-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors font-mono"
                          title={`Bấm để chuyển đến Câu ${idx + 1}`}
                        >
                          Câu {idx + 1}
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tuyệt vời! Bạn đã trả lời toàn bộ {totalCount} câu hỏi.</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmSubmitOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Làm Tiếp
                </button>
                <button
                  type="button"
                  onClick={performSubmit}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 uppercase"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Nộp Bài Ngay</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Exam Entry Section (Default View)
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-slate-900/90 p-8 sm:p-9 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-indigo-500/10">
          <PenTool className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-2xl font-black text-white">Vào Phòng Thi Trực Tuyến</h3>
          <p className="text-xs text-slate-400 mt-1.5">
            Nhập mã đề thi do giáo viên cung cấp để bắt đầu bài thi trắc nghiệm.
          </p>
        </div>

        <form onSubmit={handleStartExam} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mã Đề Thi *</span>
            </label>
            <input
              type="text"
              required
              value={examCode}
              onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              placeholder="Ví dụ: TOAN-12 hoặc EX-8892"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 uppercase tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Họ Và Tên Học Sinh *</span>
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Số Báo Danh (SBD) *</span>
            </label>
            <input
              type="text"
              required
              value={studentSbd}
              onChange={(e) => setStudentSbd(e.target.value.toUpperCase())}
              placeholder="Ví dụ: SBD-00125 hoặc 1205"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 uppercase tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lớp / Trường</span>
            </label>
            <input
              type="text"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              placeholder="Ví dụ: 12A1 - THPT Chuyên"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30 uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
          >
            <span>BẮT ĐẦU LÀM BÀI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Available Exams Quick List */}
      {exams.length > 0 && (
        <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Đề Thi Đang Khả Dụng ({exams.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {exams.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  setExamCode(ex.code);
                  if (!studentName) setStudentName('Học Sinh Thử Nghiệm');
                }}
                className="text-left p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                    {ex.code}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">{ex.duration} phút</span>
                </div>
                <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-200">
                  {ex.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
