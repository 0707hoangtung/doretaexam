import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, QuestionLevel } from '../types';
import { MathText } from '../utils/mathRenderer';
import { getExamParts, sortQuestionsByMOETStructure } from '../utils/examStructure';
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
} from '../utils/storage';
import {
  FileText,
  Sparkles,
  Plus,
  BookmarkPlus,
  RotateCcw,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Copy,
  ArrowUp,
  ArrowDown,
  Rocket,
  Layers,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  ListOrdered,
  Wand2,
  Volume2,
  Link as LinkIcon,
  Award,
  BookOpen,
  Underline,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { AICloneQuestionModal } from './AICloneQuestionModal';
import { AICloneExamModal } from './AICloneExamModal';
import { EnglishIpaToolbar } from './EnglishIpaToolbar';

interface TabCreateExamProps {
  draftingQuestions: Question[];
  onDraftQuestionsChange: (qs: Question[]) => void;
  onSaveQuestionToBank: (q: Question) => void;
  onSaveAllToBank: () => void;
  onOpenPublishModal: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  editingDraftIndex: number;
  setEditingDraftIndex: (idx: number) => void;
}

export const TabCreateExam: React.FC<TabCreateExamProps> = ({
  draftingQuestions,
  onDraftQuestionsChange,
  onSaveQuestionToBank,
  onSaveAllToBank,
  onOpenPublishModal,
  showToast,
  editingDraftIndex,
  setEditingDraftIndex,
}) => {
  // Load saved draft form if available (prevents loss on reload or network drops)
  const savedDraftForm = getStorageItem<any>(STORAGE_KEYS.DRAFT_FORM, null);

  const [createMode, setCreateMode] = useState<'form' | 'raw'>(() => {
    return savedDraftForm?.createMode || 'form';
  });

  // Form states
  const [currentFmType, setCurrentFmType] = useState<QuestionType>(() => {
    return savedDraftForm?.currentFmType || 'mc';
  });
  const [fmGrade, setFmGrade] = useState<'10' | '11' | '12'>(() => {
    return savedDraftForm?.fmGrade || '12';
  });
  const [fmLevel, setFmLevel] = useState<QuestionLevel>(() => {
    return savedDraftForm?.fmLevel || 'Nhận biết';
  });
  const [fmTopic, setFmTopic] = useState<string>(() => {
    return savedDraftForm?.fmTopic || 'Hàm số & Đồ thị';
  });

  // Dữ kiện chung cho cụm câu hỏi liên tiếp (Phần I - Trắc nghiệm ABCD, tối đa 10 câu)
  const [fmGroupStem, setFmGroupStem] = useState<string>(() => {
    return savedDraftForm?.fmGroupStem || '';
  });
  const [fmGroupId, setFmGroupId] = useState<string>(() => {
    return savedDraftForm?.fmGroupId || '';
  });
  const [fmGroupQuestionCount, setFmGroupQuestionCount] = useState<number>(() => {
    return savedDraftForm?.fmGroupQuestionCount || 3;
  });
  const [keepClusterStemForNext, setKeepClusterStemForNext] = useState<boolean>(true);
  const [fmGroupRangeStart, setFmGroupRangeStart] = useState<number>(1);
  const [fmGroupRangeEnd, setFmGroupRangeEnd] = useState<number>(1);

  const [fmStem, setFmStem] = useState<string>(() => {
    return savedDraftForm?.fmStem || '';
  });
  const [fmImage, setFmImage] = useState<string | null>(() => {
    return savedDraftForm?.fmImage || null;
  });
  const [fmAudio, setFmAudio] = useState<string | null>(() => {
    return savedDraftForm?.fmAudio || null;
  });
  const [fmAudioName, setFmAudioName] = useState<string>(() => {
    return savedDraftForm?.fmAudioName || '';
  });
  const [showAudioUrlInput, setShowAudioUrlInput] = useState<boolean>(false);
  const [audioUrlInput, setAudioUrlInput] = useState<string>('');
  const [fmContent, setFmContent] = useState<string>(() => {
    return savedDraftForm?.fmContent || '';
  });

  // MC Options
  const [fmMcOptions, setFmMcOptions] = useState(() => {
    return savedDraftForm?.fmMcOptions || {
      A: '',
      B: '',
      C: '',
      D: '',
    };
  });
  const [fmMcCorrect, setFmMcCorrect] = useState<'A' | 'B' | 'C' | 'D'>(() => {
    return savedDraftForm?.fmMcCorrect || 'A';
  });

  // TF Statements
  const [fmTfStatements, setFmTfStatements] = useState(() => {
    return savedDraftForm?.fmTfStatements || {
      a: '',
      b: '',
      c: '',
      d: '',
    };
  });
  const [fmTfCorrects, setFmTfCorrects] = useState<{
    a: 'true' | 'false';
    b: 'true' | 'false';
    c: 'true' | 'false';
    d: 'true' | 'false';
  }>(() => {
    return savedDraftForm?.fmTfCorrects || {
      a: 'true',
      b: 'true',
      c: 'true',
      d: 'false',
    };
  });

  // Short answer
  const [fmShortAnswer, setFmShortAnswer] = useState<string>(() => {
    return savedDraftForm?.fmShortAnswer || '';
  });

  // Points (PHẦN I & PHẦN III)
  const [fmPoints, setFmPoints] = useState<string>(() => {
    return savedDraftForm?.fmPoints !== undefined && savedDraftForm?.fmPoints !== null
      ? String(savedDraftForm.fmPoints)
      : '';
  });

  // Essay guide
  const [fmEssayGuide, setFmEssayGuide] = useState<string>(() => {
    return savedDraftForm?.fmEssayGuide || '';
  });

  // Raw text state
  const [rawText, setRawText] = useState<string>(() => {
    return savedDraftForm?.rawText || '';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // English & IPA input target tracking
  const [activeInsertTarget, setActiveInsertTarget] = useState<string>('content');
  const inputElementsRef = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const handleRegisterFocus = (key: string, e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setActiveInsertTarget(key);
    inputElementsRef.current[key] = e.target;
    lastSelectionRef.current = {
      start: e.target.selectionStart ?? 0,
      end: e.target.selectionEnd ?? 0,
    };
  };

  const handleRegisterBlur = (_key: string, e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    lastSelectionRef.current = {
      start: e.target.selectionStart ?? 0,
      end: e.target.selectionEnd ?? 0,
    };
  };

  const handleRegisterSelect = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    lastSelectionRef.current = {
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? 0,
    };
  };

  const getTargetLabel = (key: string): string => {
    switch (key) {
      case 'content':
        return '3. Nội dung câu hỏi';
      case 'stem':
        return '1. Đoạn dẫn';
      case 'groupStem':
        return 'Dữ kiện chung cụm';
      case 'opt_A':
        return 'Phương án A';
      case 'opt_B':
        return 'Phương án B';
      case 'opt_C':
        return 'Phương án C';
      case 'opt_D':
        return 'Phương án D';
      case 'tf_a':
        return 'Mệnh đề a)';
      case 'tf_b':
        return 'Mệnh đề b)';
      case 'tf_c':
        return 'Mệnh đề c)';
      case 'tf_d':
        return 'Mệnh đề d)';
      case 'short':
        return 'Đáp án ngắn';
      case 'guide':
        return 'Hướng dẫn chấm';
      default:
        return '3. Nội dung câu hỏi';
    }
  };

  const handleEnglishInsert = (
    text: string,
    isWrap: boolean = false,
    wrapPrefix: string = '<u>',
    wrapSuffix: string = '</u>',
    explicitTargetKey?: string
  ) => {
    const targetKey = explicitTargetKey || activeInsertTarget || 'content';
    const el = inputElementsRef.current[targetKey];

    let currentVal = '';
    if (targetKey === 'content') currentVal = fmContent;
    else if (targetKey === 'stem') currentVal = fmStem;
    else if (targetKey === 'groupStem') currentVal = fmGroupStem;
    else if (targetKey === 'opt_A') currentVal = fmMcOptions.A;
    else if (targetKey === 'opt_B') currentVal = fmMcOptions.B;
    else if (targetKey === 'opt_C') currentVal = fmMcOptions.C;
    else if (targetKey === 'opt_D') currentVal = fmMcOptions.D;
    else if (targetKey === 'tf_a') currentVal = fmTfStatements.a;
    else if (targetKey === 'tf_b') currentVal = fmTfStatements.b;
    else if (targetKey === 'tf_c') currentVal = fmTfStatements.c;
    else if (targetKey === 'tf_d') currentVal = fmTfStatements.d;
    else if (targetKey === 'short') currentVal = fmShortAnswer;
    else if (targetKey === 'guide') currentVal = fmEssayGuide;

    let start = lastSelectionRef.current.start;
    let end = lastSelectionRef.current.end;

    if (el && typeof el.selectionStart === 'number') {
      start = el.selectionStart;
      end = el.selectionEnd ?? start;
    }

    if (start < 0 || start > currentVal.length) start = currentVal.length;
    if (end < 0 || end > currentVal.length) end = currentVal.length;
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    let newVal = '';
    let newCursor = 0;

    if (isWrap) {
      if (start !== end) {
        const selected = currentVal.substring(start, end);
        newVal = currentVal.slice(0, start) + wrapPrefix + selected + wrapSuffix + currentVal.slice(end);
        newCursor = start + wrapPrefix.length + selected.length + wrapSuffix.length;
      } else {
        newVal = currentVal.slice(0, start) + wrapPrefix + wrapSuffix + currentVal.slice(end);
        newCursor = start + wrapPrefix.length;
      }
    } else {
      newVal = currentVal.slice(0, start) + text + currentVal.slice(end);
      newCursor = start + text.length;
    }

    // Update state
    if (targetKey === 'content') setFmContent(newVal);
    else if (targetKey === 'stem') setFmStem(newVal);
    else if (targetKey === 'groupStem') setFmGroupStem(newVal);
    else if (targetKey === 'opt_A') setFmMcOptions((prev) => ({ ...prev, A: newVal }));
    else if (targetKey === 'opt_B') setFmMcOptions((prev) => ({ ...prev, B: newVal }));
    else if (targetKey === 'opt_C') setFmMcOptions((prev) => ({ ...prev, C: newVal }));
    else if (targetKey === 'opt_D') setFmMcOptions((prev) => ({ ...prev, D: newVal }));
    else if (targetKey === 'tf_a') setFmTfStatements((prev) => ({ ...prev, a: newVal }));
    else if (targetKey === 'tf_b') setFmTfStatements((prev) => ({ ...prev, b: newVal }));
    else if (targetKey === 'tf_c') setFmTfStatements((prev) => ({ ...prev, c: newVal }));
    else if (targetKey === 'tf_d') setFmTfStatements((prev) => ({ ...prev, d: newVal }));
    else if (targetKey === 'short') setFmShortAnswer(newVal);
    else if (targetKey === 'guide') setFmEssayGuide(newVal);

    lastSelectionRef.current = { start: newCursor, end: newCursor };

    if (el) {
      setTimeout(() => {
        try {
          el.focus();
          el.setSelectionRange(newCursor, newCursor);
        } catch {
          // ignore
        }
      }, 0);
    }

    showToast(`Đã chèn ký hiệu vào [${getTargetLabel(targetKey)}]`, 'info');
  };

  const getAvailableTargets = () => {
    const targets = [{ key: 'content', label: '3. Nội Dung' }];
    if (currentFmType === 'mc') {
      targets.push(
        { key: 'opt_A', label: 'A' },
        { key: 'opt_B', label: 'B' },
        { key: 'opt_C', label: 'C' },
        { key: 'opt_D', label: 'D' }
      );
      if (fmGroupStem) {
        targets.push({ key: 'groupStem', label: 'Dữ Kiện Cụm' });
      }
    } else if (currentFmType === 'tf') {
      targets.push(
        { key: 'tf_a', label: 'a)' },
        { key: 'tf_b', label: 'b)' },
        { key: 'tf_c', label: 'c)' },
        { key: 'tf_d', label: 'd)' }
      );
    } else if (currentFmType === 'short') {
      targets.push({ key: 'short', label: 'Đáp Án' });
    } else if (currentFmType === 'essay') {
      targets.push({ key: 'guide', label: 'Hướng Dẫn' });
    }
    targets.push({ key: 'stem', label: '1. Đoạn Dẫn' });
    return targets;
  };

  // Auto-save form draft so reloading or network cuts never lose work
  useEffect(() => {
    if (editingDraftIndex === -1) {
      setStorageItem(STORAGE_KEYS.DRAFT_FORM, {
        createMode,
        currentFmType,
        fmGrade,
        fmLevel,
        fmTopic,
        fmGroupStem,
        fmGroupId,
        fmGroupQuestionCount,
        fmStem,
        fmImage,
        fmAudio,
        fmAudioName,
        fmContent,
        fmMcOptions,
        fmMcCorrect,
        fmTfStatements,
        fmTfCorrects,
        fmShortAnswer,
        fmPoints,
        fmEssayGuide,
        rawText,
      });
    }
  }, [
    createMode,
    currentFmType,
    fmGrade,
    fmLevel,
    fmTopic,
    fmGroupStem,
    fmGroupId,
    fmGroupQuestionCount,
    fmStem,
    fmImage,
    fmAudio,
    fmAudioName,
    fmContent,
    fmMcOptions,
    fmMcCorrect,
    fmTfStatements,
    fmTfCorrects,
    fmShortAnswer,
    fmPoints,
    fmEssayGuide,
    rawText,
    editingDraftIndex,
  ]);

  const resetForm = (keepClusterStem: boolean = false) => {
    if (!keepClusterStem) {
      setFmGroupStem('');
      setFmGroupId('');
      setFmGroupQuestionCount(3);
    }
    setFmStem('');
    setFmImage(null);
    setFmAudio(null);
    setFmAudioName('');
    setFmContent('');
    setFmMcOptions({ A: '', B: '', C: '', D: '' });
    setFmMcCorrect('A');
    setFmTfStatements({ a: '', b: '', c: '', d: '' });
    setFmTfCorrects({ a: 'true', b: 'true', c: 'true', d: 'false' });
    setFmShortAnswer('');
    setFmPoints('');
    setFmEssayGuide('');
    setRawText('');
    setEditingDraftIndex(-1);
    removeStorageItem(STORAGE_KEYS.DRAFT_FORM);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const loadQuestionToForm = (q: Question, index: number) => {
    setCurrentFmType(q.type);
    setFmGrade(q.grade);
    setFmLevel(q.level);
    setFmTopic(q.topic || '');
    if (q.type === 'mc') {
      setFmGroupStem(q.groupStem || '');
      setFmGroupId(q.groupId || '');
    } else {
      setFmGroupStem('');
      setFmGroupId('');
    }
    setFmStem(q.stem || '');
    setFmImage(q.image || null);
    setFmAudio(q.audio || null);
    setFmAudioName(q.audioName || '');
    setFmContent(q.content || '');
    setFmPoints(q.points !== undefined && q.points !== null ? String(q.points) : '');

    if (q.type === 'mc' && q.options) {
      setFmMcOptions({
        A: q.options.A || '',
        B: q.options.B || '',
        C: q.options.C || '',
        D: q.options.D || '',
      });
      setFmMcCorrect((q.correctAnswer as 'A' | 'B' | 'C' | 'D') || 'A');
    } else if (q.type === 'tf' && q.statements) {
      setFmTfStatements({
        a: q.statements.a || '',
        b: q.statements.b || '',
        c: q.statements.c || '',
        d: q.statements.d || '',
      });
      setFmTfCorrects({
        a: q.correctAnswers?.a || 'true',
        b: q.correctAnswers?.b || 'true',
        c: q.correctAnswers?.c || 'true',
        d: q.correctAnswers?.d || 'false',
      });
    } else if (q.type === 'short') {
      setFmShortAnswer(q.correctAnswer || '');
    } else if (q.type === 'essay') {
      setFmEssayGuide(q.guide || '');
    }

    setEditingDraftIndex(index);
    setCreateMode('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Đang chỉnh sửa câu số ${index + 1}`, 'info');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Kích thước ảnh không được vượt quá 3MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFmImage(event.target?.result as string);
      showToast('Đã tải ảnh đính kèm thành công!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const processAudioFile = (file: File) => {
    if (!file) return;

    // Check if valid audio file or audio extension
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i.test(file.name)) {
      showToast('Vui lòng chọn tệp âm thanh hợp lệ (MP3, WAV, M4A, OGG, AAC)!', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước file âm thanh tối đa 10MB. Vui lòng nén hoặc chọn file dung lượng nhỏ hơn!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFmAudio(event.target?.result as string);
      setFmAudioName(file.name);
      showToast(`Đã tải file âm thanh "${file.name}" thành công!`, 'success');
    };
    reader.onerror = () => {
      showToast('Không thể đọc tệp âm thanh. Vui lòng thử lại!', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAudioFile(file);
    }
  };

  const handleAttachmentDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      if (file.size > 3 * 1024 * 1024) {
        showToast('Kích thước ảnh không được vượt quá 3MB!', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFmImage(event.target?.result as string);
        showToast('Đã tải ảnh đính kèm thành công!', 'success');
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i.test(file.name)) {
      processAudioFile(file);
    } else {
      showToast('Vui lòng kéo thả tệp hình ảnh hoặc âm thanh hợp lệ!', 'warning');
    }
  };

  const collectFormData = (): Question | null => {
    if (!fmContent.trim()) {
      showToast('Vui lòng nhập nội dung câu hỏi!', 'error');
      return null;
    }

    const hasGroupStem = currentFmType === 'mc' && Boolean(fmGroupStem.trim());
    const assignedGroupId = hasGroupStem ? (fmGroupId.trim() || `grp-${Date.now()}`) : undefined;
    if (hasGroupStem && !fmGroupId) {
      setFmGroupId(assignedGroupId!);
    }

    const newQ: Question = {
      id: editingDraftIndex >= 0 ? draftingQuestions[editingDraftIndex].id : ('q-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
      type: currentFmType,
      groupStem: hasGroupStem ? fmGroupStem.trim() : undefined,
      groupId: assignedGroupId,
      stem: fmStem.trim(),
      image: fmImage,
      audio: fmAudio,
      audioName: fmAudioName || undefined,
      content: fmContent.trim(),
      grade: fmGrade,
      level: fmLevel,
      topic: fmTopic.trim() || 'Tổng hợp',
    };

    if (currentFmType === 'mc') {
      newQ.options = {
        A: fmMcOptions.A.trim() || 'Phương án A',
        B: fmMcOptions.B.trim() || 'Phương án B',
        C: fmMcOptions.C.trim() || 'Phương án C',
        D: fmMcOptions.D.trim() || 'Phương án D',
      };
      newQ.correctAnswer = fmMcCorrect;
    } else if (currentFmType === 'tf') {
      newQ.statements = {
        a: fmTfStatements.a.trim() || 'Mệnh đề a',
        b: fmTfStatements.b.trim() || 'Mệnh đề b',
        c: fmTfStatements.c.trim() || 'Mệnh đề c',
        d: fmTfStatements.d.trim() || 'Mệnh đề d',
      };
      newQ.correctAnswers = { ...fmTfCorrects };
    } else if (currentFmType === 'short') {
      newQ.correctAnswer = fmShortAnswer.trim();
    } else if (currentFmType === 'essay') {
      newQ.guide = fmEssayGuide.trim();
    }

    // Gán điểm số cho Phần I (Trắc nghiệm ABCD) & Phần III (Trả lời ngắn)
    if (currentFmType === 'mc' || currentFmType === 'short') {
      const p = parseFloat(fmPoints.trim().replace(',', '.'));
      if (!isNaN(p) && p > 0) {
        newQ.points = Math.round(p * 100) / 100;
      }
    }

    return newQ;
  };

  const handleSaveQuestion = () => {
    const q = collectFormData();
    if (!q) return;

    if (editingDraftIndex >= 0) {
      const updated = [...draftingQuestions];
      updated[editingDraftIndex] = q;
      onDraftQuestionsChange(updated);
      showToast('Đã cập nhật câu hỏi thành công!', 'success');
    } else {
      onDraftQuestionsChange([...draftingQuestions, q]);
      showToast('Đã thêm câu hỏi vào đề thi!', 'success');
    }

    if (q.type === 'mc' && q.groupStem && keepClusterStemForNext) {
      resetForm(true);
      showToast('Dữ kiện chung cụm vẫn được giữ cho câu tiếp theo!', 'info');
    } else {
      resetForm(false);
    }
  };

  // Áp dụng dữ kiện chung cho một dải câu hỏi liên tiếp trong danh sách đang soạn (Phần I, tối đa 10 câu)
  const handleApplyGroupStemToRange = (startNum: number, endNum: number) => {
    if (!fmGroupStem.trim()) {
      showToast('Vui lòng nhập nội dung dữ kiện chung trước khi gán cho cụm câu hỏi!', 'error');
      return;
    }
    const startIdx = startNum - 1;
    const endIdx = endNum - 1;
    if (startIdx < 0 || endIdx >= draftingQuestions.length || startIdx > endIdx) {
      showToast('Phạm vi câu hỏi không hợp lệ!', 'error');
      return;
    }
    const count = endIdx - startIdx + 1;
    if (count > 10) {
      showToast('Số lượng câu hỏi trong một cụm tối đa là 10 câu liên tiếp!', 'error');
      return;
    }
    for (let i = startIdx; i <= endIdx; i++) {
      if (draftingQuestions[i].type !== 'mc') {
        showToast(`Câu ${i + 1} không phải là Trắc nghiệm ABCD (Phần I). Cụm dữ kiện chỉ áp dụng cho Phần I!`, 'error');
        return;
      }
    }
    const gid = fmGroupId.trim() || `grp-${Date.now()}`;
    setFmGroupId(gid);

    const updated = [...draftingQuestions];
    for (let i = startIdx; i <= endIdx; i++) {
      updated[i] = {
        ...updated[i],
        groupStem: fmGroupStem.trim(),
        groupId: gid,
      };
    }
    onDraftQuestionsChange(updated);
    showToast(`Đã gán dữ kiện chung cho cụm gồm ${count} câu hỏi (từ Câu ${startNum} đến Câu ${endNum})!`, 'success');
  };

  const handleRemoveClusterGroup = (groupIdOrStem: string) => {
    const updated = draftingQuestions.map((q) => {
      if (q.groupId === groupIdOrStem || q.groupStem === groupIdOrStem) {
        const copy = { ...q };
        delete copy.groupStem;
        delete copy.groupId;
        return copy;
      }
      return q;
    });
    onDraftQuestionsChange(updated);
    showToast('Đã tách cụm câu hỏi thành các câu độc lập!', 'info');
  };

  const handleEditClusterStem = (groupStem: string, groupId?: string) => {
    setFmGroupStem(groupStem);
    if (groupId) setFmGroupId(groupId);
    setCurrentFmType('mc');
    setCreateMode('form');
    setTimeout(() => {
      const el = document.getElementById('cluster-stem-input-box');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    showToast('Đã tải dữ kiện chung của cụm lên biểu mẫu soạn thảo!', 'info');
  };

  const handleSaveToBankDirectly = () => {
    const q = collectFormData();
    if (!q) return;

    onSaveQuestionToBank(q);
    resetForm();
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftingQuestions.length) return;

    const copy = [...draftingQuestions];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    onDraftQuestionsChange(copy);
  };

  const handleDuplicateQuestion = (index: number) => {
    const q = draftingQuestions[index];
    const duplicated: Question = {
      ...JSON.parse(JSON.stringify(q)),
      id: 'q-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    };
    const copy = [...draftingQuestions];
    copy.splice(index + 1, 0, duplicated);
    onDraftQuestionsChange(copy);
    showToast('Đã nhân bản câu hỏi!', 'info');
  };

  const handleUpdateQuestionPoints = (index: number, newPoints: number) => {
    if (index < 0 || index >= draftingQuestions.length) return;
    const copy = [...draftingQuestions];
    copy[index] = {
      ...copy[index],
      points: newPoints,
    };
    onDraftQuestionsChange(copy);
  };

  // AI Clone States
  const [aiCloneTargetQuestion, setAiCloneTargetQuestion] = useState<Question | null>(null);
  const [isAiCloneModalOpen, setIsAiCloneModalOpen] = useState(false);
  const [aiTargetDraftIndex, setAiTargetDraftIndex] = useState<number | null>(null);
  const [isAiCloneExamModalOpen, setIsAiCloneExamModalOpen] = useState(false);

  const handleOpenAICloneForDraftItem = (q: Question, idx: number) => {
    setAiCloneTargetQuestion(q);
    setAiTargetDraftIndex(idx);
    setIsAiCloneModalOpen(true);
  };

  const handleOpenAICloneFromForm = () => {
    const q = collectFormData();
    if (!q) return;
    setAiCloneTargetQuestion(q);
    setAiTargetDraftIndex(editingDraftIndex >= 0 ? editingDraftIndex : null);
    setIsAiCloneModalOpen(true);
  };

  const handleReplaceDraftQuestion = (newQ: Question) => {
    if (aiTargetDraftIndex !== null && aiTargetDraftIndex >= 0 && aiTargetDraftIndex < draftingQuestions.length) {
      const updated = [...draftingQuestions];
      updated[aiTargetDraftIndex] = newQ;
      onDraftQuestionsChange(updated);
    }
  };

  const handleAddAIQuestionsToDraft = (qs: Question[]) => {
    onDraftQuestionsChange([...draftingQuestions, ...qs]);
  };

  const handleClonedExamReady = (clonedQuestions: Question[]) => {
    onDraftQuestionsChange(clonedQuestions);
    showToast('Đã nạp toàn bộ đề thi song song (số liệu mới) vào bảng soạn thảo!', 'success');
  };

  const handleDeleteQuestion = (index: number) => {
    const copy = draftingQuestions.filter((_, i) => i !== index);
    onDraftQuestionsChange(copy);
    if (editingDraftIndex === index) {
      resetForm();
    }
    showToast('Đã xóa câu hỏi khỏi bản nháp', 'info');
  };

  const handleAutoSortMOET = () => {
    if (draftingQuestions.length === 0) return;
    const sorted = sortQuestionsByMOETStructure(draftingQuestions);
    onDraftQuestionsChange(sorted);
    showToast('Đã tự động sắp xếp cấu trúc 3 phần (Phần I -> Phần II -> Phần III)!', 'success');
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) {
      showToast('Vui lòng dán nội dung văn bản đề thi!', 'error');
      return;
    }

    // Split text into question blocks: Câu 1, Câu 2, Bài 1, Question 1...
    // Also handle blocks split by 2+ newlines or starting with numbers
    const cleanRaw = rawText.replace(/\r\n/g, '\n');
    let rawBlocks = cleanRaw.split(/\n(?=(?:Câu|Bài|Question)\s+\d+[:\.\s])/i);

    // If no "Câu X" prefix found, try splitting by double newlines
    if (rawBlocks.length <= 1 && cleanRaw.includes('\n\n')) {
      const altBlocks = cleanRaw.split(/\n\s*\n+/);
      if (altBlocks.length > 1) {
        rawBlocks = altBlocks;
      }
    }

    const parsedList: Question[] = [];

    rawBlocks.forEach((block, blockIdx) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return;

      const lines = trimmedBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length === 0) return;

      // Extract Level & Grade & Topic if annotated in bracket e.g. [Nhận biết] [Lớp 12] [Khảo sát hàm số]
      let level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao' = 'Thông hiểu';
      let grade: '10' | '11' | '12' = '12';
      let topic = 'Tổng hợp';

      if (/\[(?:NB|Nhận\s*biết|Mức\s*1)\]/i.test(trimmedBlock)) level = 'Nhận biết';
      else if (/\[(?:TH|Thông\s*hiểu|Mức\s*2)\]/i.test(trimmedBlock)) level = 'Thông hiểu';
      else if (/\[(?:VD|Vận\s*dụng|Mức\s*3)\]/i.test(trimmedBlock)) level = 'Vận dụng';
      else if (/\[(?:VDC|Vận\s*dụng\s*cao|Mức\s*4)\]/i.test(trimmedBlock)) level = 'Vận dụng cao';

      if (/\[(?:Lớp\s*10|10)\]/i.test(trimmedBlock)) grade = '10';
      else if (/\[(?:Lớp\s*11|11)\]/i.test(trimmedBlock)) grade = '11';
      else if (/\[(?:Lớp\s*12|12)\]/i.test(trimmedBlock)) grade = '12';

      // Extract custom points if annotated e.g. [0.5đ], (0.5 điểm), [1đ], (1.0đ), [1.5 điểm]
      let customPoints: number | undefined = undefined;
      const pointMatch = trimmedBlock.match(/(?:\[|\()(?:\*?\s*(?:Điểm|Điểm\s*số|Points?)\s*[:\.]?\s*)?(\d+(?:[\.,]\d+)?)\s*(?:đ|điểm|pts?)(?:\]|\))/i);
      if (pointMatch) {
        const val = parseFloat(pointMatch[1].replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          customPoints = Math.round(val * 100) / 100;
        }
      }

      // Check for guide/explanation lines (*Lời giải:, *Hướng dẫn giải:, *HDG:)
      let guide = '';
      const filteredLines: string[] = [];
      let isCapturingGuide = false;

      for (const line of lines) {
        if (/^\*?(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|HD|Giải\s*chi\s*tiết)\s*[:\.]/i.test(line)) {
          isCapturingGuide = true;
          guide = line.replace(/^\*?(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|HD|Giải\s*chi\s*tiết)\s*[:\.]\s*/i, '');
        } else if (isCapturingGuide) {
          guide += '\n' + line;
        } else {
          filteredLines.push(line);
        }
      }

      if (filteredLines.length === 0) return;

      // Extract stem/content from header lines
      let firstLine = filteredLines[0];
      firstLine = firstLine
        .replace(/^(?:Câu|Bài|Question)\s+\d+[:\.\s]*/i, '')
        .replace(/\[(?:NB|TH|VD|VDC|Nhận\s*biết|Thông\s*hiểu|Vận\s*dụng|Vận\s*dụng\s*cao|Lớp\s*\d+)\]/gi, '')
        .replace(/(?:\[|\()(?:\*?\s*(?:Điểm|Điểm\s*số|Points?)\s*[:\.]?\s*)?\d+(?:[\.,]\d+)?\s*(?:đ|điểm|pts?)(?:\]|\))/gi, '')
        .trim();

      // Detection Logic:
      // 1. Check for Uppercase Multiple Choice options (A. B. C. D. or A) B) C) D)) -> MUST be capital A-D
      // Exclude lowercase [a-d] to avoid false positive!
      const hasMcOptions = filteredLines.some((l) =>
        /^(?:[A-D][\.\:\)\-]|[\(\[]?[A-D][\)\]])\s+/.test(l) ||
        /(?:^|\s+)A[\.\)]\s+.*?(?:^|\s+)B[\.\)]\s+/i.test(l)
      );

      // 2. Check for Lowercase True/False statements (a) b) c) d) or a. b. c. d.) -> lowercase a-d only
      const hasTfStatements = filteredLines.some((l) =>
        /^(?:[a-d][\.\:\)\-]|[\(\[][a-d][\)\]])\s+/.test(l)
      );

      // 3. Check for Short Answer indicators (*Đáp án: 12.5 or explicit Phần III)
      const hasAnswerLine = filteredLines.find((l) => /^\*?(?:Đáp\s*án|ĐA|Đ\/A|Key|Kết\s*quả|Ans)\s*[:\.]?\s*(.*)/i.test(l));

      if (hasMcOptions) {
        // === PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN (MC) ===
        const options: { A: string; B: string; C: string; D: string } = { A: '', B: '', C: '', D: '' };
        let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
        const contentLines: string[] = [firstLine];
        let foundFirstOption = false;

        for (let i = 1; i < filteredLines.length; i++) {
          const l = filteredLines[i];

          // Check if line contains single or multiple options
          const singleOptMatch = l.match(/^(?:([A-D])[\.\:\)\-]|[\(\[]([A-D])[\)\]])\s*(.*)/);
          const multiOptMatch = l.match(/A[\.\)]\s*(.*?)\s+B[\.\)]\s*(.*?)\s+C[\.\)]\s*(.*?)\s+D[\.\)]\s*(.*)/);

          if (multiOptMatch) {
            foundFirstOption = true;
            options.A = multiOptMatch[1].trim();
            options.B = multiOptMatch[2].trim();
            options.C = multiOptMatch[3].trim();
            options.D = multiOptMatch[4].trim();
          } else if (singleOptMatch) {
            foundFirstOption = true;
            const optKey = (singleOptMatch[1] || singleOptMatch[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
            options[optKey] = singleOptMatch[3].trim();
          } else if (/^\*?(?:Đáp\s*án|ĐA|Đ\/A|Key|Chọn|Ans)\s*[:\.]?\s*([A-D])/i.test(l)) {
            const m = l.match(/^\*?(?:Đáp\s*án|ĐA|Đ\/A|Key|Chọn|Ans)\s*[:\.]?\s*([A-D])/i);
            if (m) correctAnswer = m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          } else if (!foundFirstOption) {
            // Continuation of question content
            contentLines.push(l);
          }
        }

        // If no explicit answer line was found, check if an option has * mark or (Đúng)
        Object.keys(options).forEach((k) => {
          const key = k as 'A' | 'B' | 'C' | 'D';
          if (options[key].includes('*') || /\(Đúng\)/i.test(options[key])) {
            correctAnswer = key;
            options[key] = options[key].replace(/\*|\(Đúng\)/gi, '').trim();
          }
        });

        parsedList.push({
          id: `q-${Date.now()}-${blockIdx}-${Math.floor(Math.random() * 10000)}`,
          type: 'mc',
          points: customPoints,
          stem: '',
          content: contentLines.join('\n').trim(),
          grade,
          level: level === 'Thông hiểu' ? 'Nhận biết' : level,
          topic,
          options: {
            A: options.A || 'Phương án A',
            B: options.B || 'Phương án B',
            C: options.C || 'Phương án C',
            D: options.D || 'Phương án D',
          },
          correctAnswer,
          guide: guide || undefined,
        });
      } else if (hasTfStatements) {
        // === PHẦN II: TRẮC NGHIỆM ĐÚNG/SAI (TF) ===
        const statements: { a: string; b: string; c: string; d: string } = { a: '', b: '', c: '', d: '' };
        const corrects: { a: 'true' | 'false'; b: 'true' | 'false'; c: 'true' | 'false'; d: 'true' | 'false' } = {
          a: 'true',
          b: 'false',
          c: 'true',
          d: 'false',
        };
        const contentLines: string[] = [firstLine];
        let foundFirstStmt = false;

        for (let i = 1; i < filteredLines.length; i++) {
          const l = filteredLines[i];
          const stmtMatch = l.match(/^(?:([a-d])[\.\:\)\-]|[\(\[]([a-d])[\)\]])\s*(.*)/);

          if (stmtMatch) {
            foundFirstStmt = true;
            const stmtKey = (stmtMatch[1] || stmtMatch[2]).toLowerCase() as 'a' | 'b' | 'c' | 'd';
            let text = stmtMatch[3].trim();

            // Detect correctness marked at the end of the statement line e.g. "- Đúng", "[Đ]", "(Sai)", ": S"
            if (/[-:\*\[\(]\s*(?:sai|false|s)[\)\]]?\s*$/i.test(text) || /\b(sai|false)\b/i.test(text)) {
              corrects[stmtKey] = 'false';
              text = text.replace(/[-:\*\[\(]\s*(?:sai|false|s)[\)\]]?\s*$/i, '').trim();
            } else if (/[-:\*\[\(]\s*(?:đúng|true|đ)[\)\]]?\s*$/i.test(text) || /\b(đúng|true)\b/i.test(text)) {
              corrects[stmtKey] = 'true';
              text = text.replace(/[-:\*\[\(]\s*(?:đúng|true|đ)[\)\]]?\s*$/i, '').trim();
            }

            statements[stmtKey] = text;
          } else if (/^\*?(?:Đáp\s*án|ĐA|Key)\s*[:\.]?\s*(.*)/i.test(l)) {
            // If answer is listed as: * Đáp án: a-Đ, b-S, c-Đ, d-S
            const ansStr = l.replace(/^\*?(?:Đáp\s*án|ĐA|Key)\s*[:\.]?\s*/i, '');
            ['a', 'b', 'c', 'd'].forEach((k) => {
              const kRegex = new RegExp(`${k}\\s*[:\\-=\\)]\\s*(đ|đúng|true|s|sai|false)`, 'i');
              const km = ansStr.match(kRegex);
              if (km) {
                const val = km[1].toLowerCase();
                corrects[k as 'a' | 'b' | 'c' | 'd'] = val.startsWith('đ') || val.startsWith('t') ? 'true' : 'false';
              }
            });
          } else if (!foundFirstStmt) {
            contentLines.push(l);
          }
        }

        parsedList.push({
          id: `q-${Date.now()}-${blockIdx}-${Math.floor(Math.random() * 10000)}`,
          type: 'tf',
          stem: '',
          content: contentLines.join('\n').trim(),
          grade,
          level: 'Thông hiểu',
          topic,
          statements: {
            a: statements.a || 'Mệnh đề a',
            b: statements.b || 'Mệnh đề b',
            c: statements.c || 'Mệnh đề c',
            d: statements.d || 'Mệnh đề d',
          },
          correctAnswers: corrects,
          guide: guide || undefined,
        });
      } else if (hasAnswerLine && !/^[A-D]$/i.test(hasAnswerLine.replace(/^\*?(?:Đáp\s*án|ĐA|Đ\/A|Key|Kết\s*quả|Ans)\s*[:\.]?\s*/i, '').trim())) {
        // === PHẦN III: TRẢ LỜI NGẮN (SHORT ANSWER) ===
        const ansVal = hasAnswerLine.replace(/^\*?(?:Đáp\s*án|ĐA|Đ\/A|Key|Kết\s*quả|Ans)\s*[:\.]?\s*/i, '').trim();
        const contentLines = filteredLines.filter((l) => l !== hasAnswerLine);

        parsedList.push({
          id: `q-${Date.now()}-${blockIdx}-${Math.floor(Math.random() * 10000)}`,
          type: 'short',
          points: customPoints,
          stem: '',
          content: contentLines.join('\n').replace(/^(?:Câu|Bài|Question)\s+\d+[:\.\s]*/i, '').trim(),
          grade,
          level: 'Vận dụng',
          topic,
          correctAnswer: ansVal || '0',
          guide: guide || undefined,
        });
      } else {
        // === MẶC ĐỊNH / TỰ LUẬN HOẶC CÂU HỎI THÔNG THƯỜNG ===
        const contentLines = filteredLines.join('\n').replace(/^(?:Câu|Bài|Question)\s+\d+[:\.\s]*/i, '').trim();
        parsedList.push({
          id: `q-${Date.now()}-${blockIdx}-${Math.floor(Math.random() * 10000)}`,
          type: guide ? 'essay' : 'short',
          stem: '',
          content: contentLines,
          grade,
          level: 'Vận dụng',
          topic,
          correctAnswer: '',
          guide: guide || undefined,
        });
      }
    });

    if (parsedList.length === 0) {
      showToast('Không thể nhận diện câu hỏi từ văn bản. Vui lòng kiểm tra định dạng!', 'error');
      return;
    }

    onDraftQuestionsChange([...draftingQuestions, ...parsedList]);
    setRawText('');
    showToast(`Đã phân tích và thêm thành công ${parsedList.length} câu hỏi vào đề thi!`, 'success');
  };

  const insertSampleRaw = () => {
    setRawText(`Câu 1: Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Mệnh đề nào dưới đây đúng?
A. Hàm số đồng biến trên khoảng $(-\\infty; 1)$
B. Hàm số nghịch biến trên khoảng $(1; +\\infty)$
C. Giá trị cực đại của hàm số bằng $3$
D. Hàm số đạt cực tiểu tại $x = 2$
*Đáp án: C

Câu 2: Một vật chuyển động thẳng với gia tốc $a(t) = 3t^2 + 2t$ (m/s²). Tìm vận tốc tại thời điểm $t = 2\\text{s}$ biết $v(0) = 4\\text{ m/s}$.
A. $v = 16\\text{ m/s}$
B. $v = 20\\text{ m/s}$
C. $v = 24\\text{ m/s}$
D. $v = 12\\text{ m/s}$
*Đáp án: A

Câu 3: Các khẳng định sau đây về số phức $z = 3 - 4i$ là Đúng hay Sai?
a) Phần thực của $z$ bằng $3$ - Đúng
b) Phần ảo của $z$ bằng $4$ - Sai
c) Mô đun của $z$ bằng $|z| = 5$ - Đúng
d) Số phức liên hợp là $\\bar{z} = -3 + 4i$ - Sai`);
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <span>Soạn Thảo &amp; Tạo Đề Thi</span>
            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full">
              Quyền Giáo Viên
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Tạo câu hỏi thủ công hoặc Phân tích văn bản tự động, hỗ trợ công thức Toán LaTeX ($...$ và $$...$$).
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setCreateMode('form')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              createMode === 'form'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tạo Theo Form
          </button>
          <button
            onClick={() => setCreateMode('raw')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              createMode === 'raw'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Phân Tích Văn Bản
          </button>
        </div>
      </div>

      {/* FORM MODE */}
      {createMode === 'form' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-6">
          {/* Question Type selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dạng Câu Hỏi &amp; Phần Thi Tương Ứng
              </label>
              <span className="text-[11px] font-medium text-indigo-400">
                Đề thi chuẩn cấu trúc 3 phần: Phần I &rarr; Phần II &rarr; Phần III
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { type: 'mc', part: 'PHẦN I', label: 'Trắc nghiệm ABCD', sub: 'Xáo trộn câu & phương án (A,B,C,D)' },
                { type: 'tf', part: 'PHẦN II', label: 'Trắc nghiệm Đúng/Sai', sub: 'Xáo trộn câu, KHÔNG xáo trộn ý a,b,c,d' },
                { type: 'short', part: 'PHẦN III', label: 'Trả lời ngắn', sub: 'Xáo trộn thứ tự các câu' },
                { type: 'essay', part: 'MỞ RỘNG', label: 'Tự luận', sub: 'Dàn ý & chấm điểm giáo viên' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setCurrentFmType(item.type as QuestionType)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    currentFmType === item.type
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      currentFmType === item.type
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-950 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {item.part}
                    </span>
                    {currentFmType === item.type && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="text-xs font-black">{item.label}</div>
                  <div className={`text-[10px] mt-0.5 leading-tight line-clamp-1 ${
                    currentFmType === item.type ? 'text-indigo-100' : 'text-slate-500'
                  }`}>
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Meta Grade, Level, Topic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Khối Lớp
              </label>
              <div className="flex gap-2">
                {(['10', '11', '12'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFmGrade(g)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                      fmGrade === g
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    Lớp {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mức Độ Nhận Thức
              </label>
              <div className="flex gap-1.5">
                {(['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFmLevel(lvl)}
                    className={`flex-1 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                      fmLevel === lvl
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {lvl.replace('Vận dụng cao', 'VDC')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Chủ Đề / Bài Học
              </label>
              <input
                type="text"
                value={fmTopic}
                onChange={(e) => setFmTopic(e.target.value)}
                placeholder="Ví dụ: Khảo Sát Hàm Số, Sóng Cơ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* THANH CÔNG CỤ ĐỊNH DẠNG & KÝ HIỆU TIẾNG ANH (1-CHẠM) */}
          <EnglishIpaToolbar
            onInsertText={handleEnglishInsert}
            currentTargetLabel={getTargetLabel(activeInsertTarget)}
            currentTargetKey={activeInsertTarget}
            availableTargets={getAvailableTargets()}
            onSelectTarget={(key) => {
              setActiveInsertTarget(key);
              const el = inputElementsRef.current[key];
              if (el) {
                el.focus();
              }
            }}
          />

          {/* Stem, Image, and Main Content - STRICT ORDER: 1. STEM -> 2. IMAGE -> 3. CONTENT */}
          <div className="space-y-4">
            {/* HỘP DỮ KIỆN CHUNG CHO CỤM CÂU HỎI LIÊN TIẾP (TỐI ĐA 10 CÂU) - DÀNH CHO PHẦN I TRẮC NGHIỆM ABCD */}
            {currentFmType === 'mc' && (
              <div
                id="cluster-stem-input-box"
                className="bg-indigo-950/30 border-2 border-indigo-500/40 hover:border-indigo-500/60 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2.5">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-indigo-200 tracking-wide uppercase">
                          DỮ KIỆN CHUNG CHO CỤM CÂU HỎI LIÊN TIẾP (TỐI ĐA 10 CÂU)
                        </span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                          Phần I
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        Nhập nội dung dữ kiện chung (văn bản bài đọc, ngữ cảnh, số liệu thực nghiệm...) cho một cụm câu hỏi liên tiếp nhau. Dữ kiện này sẽ xuất hiện đầu tiên, phía dưới là chùm câu hỏi liên quan. Nếu để trống, hệ thống hiểu câu hỏi là độc lập không chung dữ kiện.
                      </p>
                    </div>
                  </div>

                  {fmGroupStem.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setFmGroupStem('');
                        setFmGroupId('');
                        showToast('Đã xóa dữ kiện cụm (câu hỏi sẽ độc lập)', 'info');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 px-2.5 py-1 rounded-lg border border-rose-500/30 flex items-center gap-1 transition-colors self-start sm:self-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa dữ kiện cụm</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <textarea
                    ref={(el) => {
                      inputElementsRef.current['groupStem'] = el;
                    }}
                    rows={3}
                    value={fmGroupStem}
                    onFocus={(e) => handleRegisterFocus('groupStem', e)}
                    onBlur={(e) => handleRegisterBlur('groupStem', e)}
                    onSelect={handleRegisterSelect}
                    onChange={(e) => setFmGroupStem(e.target.value)}
                    placeholder="Ví dụ: Đọc đoạn thông tin sau và trả lời các câu hỏi từ 1 đến 4: (hoặc Cho đồ thị chuyển động / bảng số liệu thực nghiệm sau...)"
                    className="w-full bg-slate-950 border border-indigo-500/30 focus:border-indigo-400 rounded-xl p-3 text-xs text-slate-100 focus:outline-none font-mono transition-colors"
                  />
                  {fmGroupStem.includes('$') && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-indigo-500/30 text-xs text-indigo-200">
                      <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Xem trước công thức toán học:</div>
                      <MathText text={fmGroupStem} />
                    </div>
                  )}
                </div>

                {/* Tùy chỉnh cụm câu hỏi khi có nội dung dữ kiện */}
                {fmGroupStem.trim() && (
                  <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-indigo-300">Số câu trong cụm này:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setFmGroupQuestionCount(num)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                                fmGroupQuestionCount === num
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                          <span className="text-[11px] text-slate-400 ml-1">câu</span>
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keepClusterStemForNext}
                          onChange={(e) => setKeepClusterStemForNext(e.target.checked)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px]">Giữ dữ kiện cụm này khi thêm câu tiếp theo</span>
                      </label>
                    </div>

                    {/* Gán nhanh cho dải câu hỏi trong đề (nếu đã có câu hỏi Phần I) */}
                    {draftingQuestions.filter((q) => q.type === 'mc').length >= 2 && (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-400 font-medium">Áp dụng cho dải câu trong đề:</span>
                          <span className="text-slate-400">Từ câu</span>
                          <select
                            value={fmGroupRangeStart}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFmGroupRangeStart(val);
                              if (fmGroupRangeEnd < val) setFmGroupRangeEnd(val);
                              if (fmGroupRangeEnd - val + 1 > 10) setFmGroupRangeEnd(val + 9);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            {draftingQuestions.map((q, qIdx) =>
                              q.type === 'mc' ? (
                                <option key={qIdx} value={qIdx + 1}>
                                  Câu {qIdx + 1}
                                </option>
                              ) : null
                            )}
                          </select>
                          <span className="text-slate-400">đến câu</span>
                          <select
                            value={fmGroupRangeEnd}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFmGroupRangeEnd(val);
                              if (val < fmGroupRangeStart) setFmGroupRangeStart(val);
                              if (val - fmGroupRangeStart + 1 > 10) setFmGroupRangeStart(val - 9);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            {draftingQuestions.map((q, qIdx) =>
                              q.type === 'mc' ? (
                                <option key={qIdx} value={qIdx + 1}>
                                  Câu {qIdx + 1}
                                </option>
                              ) : null
                            )}
                          </select>
                          <span className="text-[11px] text-indigo-400">
                            ({Math.max(1, fmGroupRangeEnd - fmGroupRangeStart + 1)} câu liên tiếp, tối đa 10)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyGroupStemToRange(fmGroupRangeStart, fmGroupRangeEnd)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shadow"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gán Cho Cụm Này</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 1. Stem */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>1. Đoạn Văn Dẫn / Dữ Kiện Chung (Tùy chọn)</span>
                <span className="text-[10px] text-slate-500">Ngữ cảnh hoặc bảng biểu chung</span>
              </label>
              <textarea
                ref={(el) => {
                  inputElementsRef.current['stem'] = el;
                }}
                rows={2}
                value={fmStem}
                onFocus={(e) => handleRegisterFocus('stem', e)}
                onBlur={(e) => handleRegisterBlur('stem', e)}
                onSelect={handleRegisterSelect}
                onChange={(e) => setFmStem(e.target.value)}
                placeholder="Ví dụ: Cho hàm số bậc ba $y = f(x)$ có bảng biến thiên như sau..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* 2. Image & Audio Attachment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  2. HÌNH ẢNH &amp; FILE ÂM THANH ĐÍNH KÈM (NẾU CÓ)
                </label>
                <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">
                  Hỗ trợ tải ảnh minh họa hoặc file nghe âm thanh (MP3, WAV, M4A tối đa 10MB)
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleAttachmentDrop}
                className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                {/* Image Upload Button */}
                <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span>Chọn Ảnh Từ Máy</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                </label>

                {/* Audio Upload Button */}
                <label className="cursor-pointer bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Tải File Âm Thanh (Tối đa 10MB)</span>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    className="hidden"
                    onChange={handleAudioFileChange}
                  />
                </label>

                {/* Audio URL Button */}
                <button
                  type="button"
                  onClick={() => setShowAudioUrlInput((prev) => !prev)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dán Link Âm Thanh</span>
                </button>

                <span className="text-[11px] text-slate-500 italic hidden lg:inline">
                  (Hỗ trợ file âm thanh đến 10MB hoặc đường dẫn online)
                </span>

                {/* Image Preview */}
                {fmImage && (
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-sm">
                    <img
                      src={fmImage}
                      alt="Uploaded preview"
                      className="h-10 w-10 object-cover rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFmImage(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                )}

                {/* Audio Preview with AudioPlayer */}
                {fmAudio && (
                  <AudioPlayer
                    src={fmAudio}
                    audioName={fmAudioName}
                    onDelete={() => {
                      setFmAudio(null);
                      setFmAudioName('');
                      if (audioInputRef.current) audioInputRef.current.value = '';
                    }}
                    className="w-full sm:w-auto"
                  />
                )}
              </div>

              {/* Online Audio URL Input drawer */}
              {showAudioUrlInput && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    value={audioUrlInput}
                    onChange={(e) => setAudioUrlInput(e.target.value)}
                    placeholder="Dán link âm thanh trực tuyến (VD: https://example.com/audio.mp3)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = audioUrlInput.trim();
                        if (!trimmed) {
                          showToast('Vui lòng nhập đường link âm thanh hợp lệ!', 'error');
                          return;
                        }
                        setFmAudio(trimmed);
                        setFmAudioName(trimmed.split('/').pop()?.split('?')[0] || 'Link trực tuyến');
                        setShowAudioUrlInput(false);
                        setAudioUrlInput('');
                        showToast('Đã gán link file nghe thành công!', 'success');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm shrink-0"
                    >
                      Áp Dụng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAudioUrlInput(false);
                        setAudioUrlInput('');
                      }}
                      className="text-xs text-slate-400 hover:text-white px-2 py-2"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Main Question Content */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>3. Nội Dung Câu Hỏi * (Hỗ trợ $...$ LaTeX &amp; &lt;u&gt;...)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInsertTarget('content');
                        handleEnglishInsert('', true, '<u>', '</u>', 'content');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                      title="Gạch chân phát âm <u>...</u> (Bọc từ đang chọn hoặc chèn thẻ <u></u>)"
                    >
                      <Underline className="w-3 h-3 text-amber-400" />
                      <span>&lt;u&gt;Gạch chân&lt;/u&gt;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInsertTarget('content');
                        handleEnglishInsert('ˈ', false, '', '', 'content');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 transition-all active:scale-95 shadow-sm"
                      title="Dấu trọng âm chính ˈ"
                    >
                      <span>Trọng âm ( ˈ )</span>
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-indigo-400 font-mono">{"VD: cl<u>i</u>mb hoặc $\\sqrt{x-1}$"}</span>
              </label>
              <textarea
                ref={(el) => {
                  inputElementsRef.current['content'] = el;
                }}
                rows={3}
                required
                value={fmContent}
                onFocus={(e) => handleRegisterFocus('content', e)}
                onBlur={(e) => handleRegisterBlur('content', e)}
                onSelect={handleRegisterSelect}
                onChange={(e) => setFmContent(e.target.value)}
                placeholder="Nhập nội dung chính của câu hỏi... VD: Which word has the underlined part pronounced differently? hoặc Tìm tập xác định..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Live LaTeX preview for question */}
            {fmContent && (
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Xem trước công thức:</p>
                <div className="text-sm font-semibold text-white">
                  <MathText text={fmContent} />
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Answer Inputs Container */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800/90 space-y-3">
            {currentFmType === 'mc' && (
              <>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  4 Tùy Chọn Lựa Chọn (Tích chọn phương án đúng)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div
                      key={opt}
                      className={`flex items-center gap-2.5 bg-slate-900/90 p-2.5 rounded-xl border transition-all ${
                        fmMcCorrect === opt ? 'border-indigo-500/80 bg-indigo-950/20' : 'border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fmMcCorrect"
                        id={`optRadio_${opt}`}
                        value={opt}
                        checked={fmMcCorrect === opt}
                        onChange={() => setFmMcCorrect(opt)}
                        className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                      <label htmlFor={`optRadio_${opt}`} className="text-xs font-black text-indigo-400 cursor-pointer w-4">
                        {opt}.
                      </label>
                      <input
                        ref={(el) => {
                          inputElementsRef.current[`opt_${opt}`] = el;
                        }}
                        type="text"
                        value={fmMcOptions[opt]}
                        onFocus={(e) => handleRegisterFocus(`opt_${opt}`, e)}
                        onBlur={(e) => handleRegisterBlur(`opt_${opt}`, e)}
                        onSelect={handleRegisterSelect}
                        onChange={(e) =>
                          setFmMcOptions({ ...fmMcOptions, [opt]: e.target.value })
                        }
                        placeholder={`Nội dung phương án ${opt}`}
                        className="flex-1 bg-transparent text-xs text-white focus:outline-none font-mono"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveInsertTarget(`opt_${opt}`);
                            handleEnglishInsert('', true, '<u>', '</u>', `opt_${opt}`);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 transition-all active:scale-95"
                          title={`Gạch chân phát âm <u>...</u> cho phương án ${opt}`}
                        >
                          <u>u</u>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveInsertTarget(`opt_${opt}`);
                            handleEnglishInsert('ˈ', false, '', '', `opt_${opt}`);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 transition-all active:scale-95"
                          title={`Dấu trọng âm chính ˈ cho phương án ${opt}`}
                        >
                          ˈ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gán điểm số cho câu trắc nghiệm (Phần I) */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-200">Gán Điểm Số Cho Câu Này:</span>
                      <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                        (Mặc định Bộ GD&amp;ĐT: <strong className="text-indigo-400">0.25đ</strong>)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[0.25, 0.5, 0.75, 1.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFmPoints(String(preset))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                            (fmPoints === String(preset) || (!fmPoints && preset === 0.25))
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {preset}đ
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="10"
                        value={fmPoints}
                        onChange={(e) => setFmPoints(e.target.value)}
                        placeholder="0.25"
                        className="w-16 bg-transparent text-xs font-mono font-bold text-amber-300 focus:outline-none text-right"
                      />
                      <span className="text-xs font-bold text-slate-400">đ</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentFmType === 'tf' && (
              <>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  4 Ý Khẳng Định (Chọn Đúng / Sai cho từng mệnh đề theo chuẩn Bộ GD&amp;ĐT)
                </label>
                <div className="space-y-2.5">
                  {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                    <div
                      key={opt}
                      className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800"
                    >
                      <span className="text-xs font-black text-indigo-400 uppercase w-5">{opt})</span>
                      <input
                        ref={(el) => {
                          inputElementsRef.current[`tf_${opt}`] = el;
                        }}
                        type="text"
                        value={fmTfStatements[opt]}
                        onFocus={(e) => handleRegisterFocus(`tf_${opt}`, e)}
                        onBlur={(e) => handleRegisterBlur(`tf_${opt}`, e)}
                        onSelect={handleRegisterSelect}
                        onChange={(e) =>
                          setFmTfStatements({ ...fmTfStatements, [opt]: e.target.value })
                        }
                        placeholder={`Nội dung mệnh đề ${opt}`}
                        className="flex-1 bg-transparent text-xs text-white focus:outline-none font-mono"
                      />
                      <select
                        value={fmTfCorrects[opt]}
                        onChange={(e) =>
                          setFmTfCorrects({
                            ...fmTfCorrects,
                            [opt]: e.target.value as 'true' | 'false',
                          })
                        }
                        className={`border rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                          fmTfCorrects[opt] === 'true'
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                        }`}
                      >
                        <option value="true">Đúng</option>
                        <option value="false">Sai</option>
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}

            {currentFmType === 'short' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Đáp Án Chuẩn Của Câu Hỏi Trả Lời Ngắn
                  </label>
                  <input
                    ref={(el) => {
                      inputElementsRef.current['short'] = el;
                    }}
                    type="text"
                    value={fmShortAnswer}
                    onFocus={(e) => handleRegisterFocus('short', e)}
                    onBlur={(e) => handleRegisterBlur('short', e)}
                    onSelect={handleRegisterSelect}
                    onChange={(e) => setFmShortAnswer(e.target.value)}
                    placeholder="Nhập giá trị hoặc từ khóa đáp án đúng... VD: 20 hoặc /æ/ hoặc 3sqrt(2)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Gán điểm số cho câu trả lời ngắn (Phần III) */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-200">Gán Điểm Số Cho Câu Này:</span>
                      <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                        (Mặc định Bộ GD&amp;ĐT: <strong className="text-emerald-400">0.50đ</strong>)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[0.5, 0.75, 1.0, 1.5, 2.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFmPoints(String(preset))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                            (fmPoints === String(preset) || (!fmPoints && preset === 0.5))
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {preset}đ
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="10"
                        value={fmPoints}
                        onChange={(e) => setFmPoints(e.target.value)}
                        placeholder="0.5"
                        className="w-16 bg-transparent text-xs font-mono font-bold text-amber-300 focus:outline-none text-right"
                      />
                      <span className="text-xs font-bold text-slate-400">đ</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentFmType === 'essay' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Hướng Dẫn Chấm / Gợi Ý Tự Luận
                </label>
                <textarea
                  ref={(el) => {
                    inputElementsRef.current['guide'] = el;
                  }}
                  rows={2}
                  value={fmEssayGuide}
                  onFocus={(e) => handleRegisterFocus('guide', e)}
                  onBlur={(e) => handleRegisterBlur('guide', e)}
                  onSelect={handleRegisterSelect}
                  onChange={(e) => setFmEssayGuide(e.target.value)}
                  placeholder="Nhập dàn ý chấm điểm chi tiết..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveQuestion}
              className="flex-1 min-w-[180px] bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 px-5 rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>{editingDraftIndex >= 0 ? 'CẬP NHẬT CÂU HỎI' : 'THÊM CÂU HỎI VÀO ĐỀ'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAICloneFromForm}
              className="min-w-[170px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 hover:text-white border border-purple-500/40 font-black py-3.5 px-5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm"
              title="Dùng AI tạo thêm các câu hỏi tương tự với số liệu mới từ câu hỏi đang nhập"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI BIẾN THỂ</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToBankDirectly}
              className="flex-1 min-w-[200px] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-5 rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>LƯU VÀO NGÂN HÀNG HỆ THỐNG</span>
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>HỦY</span>
            </button>
          </div>
        </div>
      )}

      {/* RAW PARSER MODE */}
      {createMode === 'raw' && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Dán Văn Bản Đề Thi Đã Định Dạng</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hệ thống tự động phân loại chính xác <strong>Phần I (Trắc nghiệm ABCD)</strong>, <strong>Phần II (Đúng / Sai)</strong>, <strong>Phần III (Trả lời ngắn)</strong> và <strong>Tự luận</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={insertSampleRaw}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nạp Mẫu Đề Thử Nghiệm</span>
            </button>
          </div>

          {/* Quick Syntax Legend for Teachers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="font-bold text-indigo-400">Phần I (Trắc nghiệm ABCD):</span>
              <p className="text-slate-400 font-mono text-[10px] mt-1 leading-relaxed">
                Câu 1: Nội dung...<br />
                A. Phương án 1<br />
                B. Phương án 2<br />
                *Đáp án: A
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="font-bold text-emerald-400">Phần II (Đúng/Sai a,b,c,d):</span>
              <p className="text-slate-400 font-mono text-[10px] mt-1 leading-relaxed">
                Câu 2: Khẳng định...<br />
                a) Mệnh đề 1 - Đúng<br />
                b) Mệnh đề 2 - Sai<br />
                c) Mệnh đề 3 - Đúng
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="font-bold text-amber-400">Phần III (Trả lời ngắn):</span>
              <p className="text-slate-400 font-mono text-[10px] mt-1 leading-relaxed">
                Câu 3: Tính giá trị...<br />
                *Đáp án: 12.5<br />
                *Lời giải: Bước 1...
              </p>
            </div>
          </div>

          <textarea
            rows={11}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Câu 1: Cho hàm số y = f(x)... Mệnh đề nào dưới đây đúng?
A. Đồng biến trên (0; 1)
B. Nghịch biến trên (1; 2)
C. Cực đại tại x = 1
D. Cực tiểu tại x = 2
*Đáp án: A

Câu 2: Các khẳng định sau đây là Đúng hay Sai?
a) Hàm số liên tục trên R - Đúng
b) f'(x) > 0 với mọi x - Sai
c) Đồ thị có tiệm cận đứng - Đúng
d) Có đúng 2 điểm cực trị - Sai

Câu 3: Tìm giá trị lớn nhất của hàm số trên đoạn [0; 3].
*Đáp án: 25`}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 custom-scrollbar leading-relaxed"
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleParseRawText}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3.5 px-6 rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 uppercase tracking-wide"
            >
              <Sparkles className="w-4 h-4" />
              <span>Phân Tích &amp; Thêm Vào Đề</span>
            </button>
          </div>
        </div>
      )}

      {/* DRAFTING QUESTIONS PREVIEW LIST */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Cấu Trúc &amp; Danh Sách Câu Hỏi Đang Soạn</span>
              <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 font-mono">
                Tổng {draftingQuestions.length} câu
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Đề thi tuân thủ cấu trúc 3 phần từ trên xuống dưới theo quy chuẩn Bộ GD&amp;ĐT.
            </p>
          </div>

          {draftingQuestions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setIsAiCloneExamModalOpen(true)}
                className="bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/40 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 shadow-md shadow-indigo-600/20"
                title="Dùng AI nhân bản toàn bộ đề thi hiện tại sang một đề song song với 100% số liệu mới"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>AI Tạo Đề Song Song</span>
              </button>

              <button
                type="button"
                onClick={handleAutoSortMOET}
                className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 shadow-sm"
                title="Tự động xếp Phần I (Trắc nghiệm ABCD) -> Phần II (Đúng/Sai) -> Phần III (Trả lời ngắn)"
              >
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                <span>Sắp Xếp Chuẩn 3 Phần</span>
              </button>
            </div>
          )}
        </div>

        {/* 3-Part Summary Badges */}
        {draftingQuestions.length > 0 && (() => {
          const { part1, part2, part3, part4 } = getExamParts(draftingQuestions);
          const part1Points = part1.reduce((sum, q) => sum + (typeof q.points === 'number' && q.points > 0 ? q.points : 0.25), 0);
          const part2Points = part2.length * 1.0;
          const part3Points = part3.reduce((sum, q) => sum + (typeof q.points === 'number' && q.points > 0 ? q.points : 0.5), 0);
          const totalPoints = Math.round((part1Points + part2Points + part3Points + part4.length * 1.0) * 100) / 100;

          return (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">PHẦN I: Trắc nghiệm ABCD</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Xáo câu &amp; xáo phương án (A,B,C,D)</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-2.5 py-1 rounded-xl inline-block">
                      {part1.length} câu
                    </span>
                    <div className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                      {Math.round(part1Points * 100) / 100} điểm
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">PHẦN II: Đúng / Sai</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Xáo câu, KHÔNG xáo ý a,b,c,d</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono bg-amber-950 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-xl inline-block">
                      {part2.length} câu
                    </span>
                    <div className="text-[11px] font-mono font-bold text-slate-400 mt-1">
                      Tối đa {part2Points}đ
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">PHẦN III: Trả lời ngắn</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Xáo trộn thứ tự các câu</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-xl inline-block">
                      {part3.length} câu
                    </span>
                    <div className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                      {Math.round(part3Points * 100) / 100} điểm
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Exam Score Strip */}
              <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold flex-wrap">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Tổng điểm đề thi dự kiến:</span>
                  <span className="font-mono font-black text-amber-300 text-sm">{totalPoints} điểm</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (Phần I: {Math.round(part1Points * 100) / 100}đ + Phần II: {part2Points}đ + Phần III: {Math.round(part3Points * 100) / 100}đ)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  * Điểm số Phần I và Phần III có thể tùy chỉnh riêng cho từng câu
                </div>
              </div>
            </div>
          );
        })()}

        {draftingQuestions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800 space-y-3 px-4">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
            <p className="text-sm font-bold text-slate-400">Chưa có câu hỏi nào trong danh sách soạn thảo.</p>
            <p className="text-xs text-slate-500">
              Hãy nhập câu hỏi ở form phía trên hoặc dán văn bản để phân tích tự động.
            </p>
            {(() => {
              const lastBackup = getStorageItem<any>(STORAGE_KEYS.LAST_PUBLISHED_BACKUP, null);
              if (lastBackup && Array.isArray(lastBackup.questions) && lastBackup.questions.length > 0) {
                return (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDraftQuestionsChange(lastBackup.questions);
                        showToast(`Đã khôi phục ${lastBackup.questions.length} câu hỏi từ bộ soạn gần nhất!`, 'success');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.02]"
                    >
                      <RotateCcw className="w-4 h-4 text-indigo-400" />
                      <span>Khôi phục {lastBackup.questions.length} câu hỏi từ bộ vừa soạn/xuất bản ({lastBackup.title || 'Gần nhất'})</span>
                    </button>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        ) : (
          <div className="space-y-4">
            {draftingQuestions.map((q, idx) => {
              // Check if this question starts a new part
              const prevQ = idx > 0 ? draftingQuestions[idx - 1] : null;
              const isFirstOfPart = !prevQ || prevQ.type !== q.type;

              // Check if q starts a cluster with groupStem in Part I
              const isClusterStart = Boolean(
                q.type === 'mc' &&
                q.groupStem &&
                q.groupStem.trim() &&
                (!prevQ || prevQ.type !== 'mc' || prevQ.groupId !== q.groupId || prevQ.groupStem !== q.groupStem)
              );

              let clusterEndIdx = idx;
              if (isClusterStart) {
                while (
                  clusterEndIdx + 1 < draftingQuestions.length &&
                  draftingQuestions[clusterEndIdx + 1].type === 'mc' &&
                  draftingQuestions[clusterEndIdx + 1].groupId === q.groupId &&
                  draftingQuestions[clusterEndIdx + 1].groupStem === q.groupStem
                ) {
                  clusterEndIdx++;
                }
              }

              let partHeader = null;
              if (isFirstOfPart) {
                if (q.type === 'mc') {
                  partHeader = (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 mt-6 first:mt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                          PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (A, B, C, D)
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Thí sinh chọn một phương án đúng duy nhất. Cho phép xáo trộn câu và xáo trộn 4 phương án (trình tự luôn giữ A, B, C, D).
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        0.25đ / câu (hoặc theo điểm gán)
                      </span>
                    </div>
                  );
                } else if (q.type === 'tf') {
                  partHeader = (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                          PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG / SAI (4 Ý a, b, c, d)
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Trong mỗi ý a), b), c), d) chọn Đúng hoặc Sai. Cho phép xáo trộn câu, <strong className="text-amber-300">TUYỆT ĐỐI KHÔNG xáo trộn các ý trong mỗi câu</strong> (luôn giữ nguyên a, b, c, d).
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        Tối đa 1.0đ / câu
                      </span>
                    </div>
                  );
                } else if (q.type === 'short') {
                  partHeader = (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                          PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Thí sinh điền kết quả vào ô trống tương ứng. Cho phép xáo trộn thứ tự các câu hỏi.
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg self-start sm:self-auto font-mono">
                        0.50đ / câu (hoặc theo điểm gán)
                      </span>
                    </div>
                  );
                } else if (q.type === 'essay') {
                  partHeader = (
                    <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                  {partHeader}
                  {isClusterStart && (
                    <div className="bg-indigo-950/60 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow-sm uppercase tracking-wide">
                            DỮ KIỆN CHUNG CHO CỤM CÂU HỎI
                          </span>
                          <span className="text-xs font-bold text-indigo-300">
                            (Dùng chung cho các câu từ Câu {idx + 1} đến Câu {clusterEndIdx + 1})
                          </span>
                          <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                            {clusterEndIdx - idx + 1} câu liên tiếp
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClusterStem(q.groupStem!, q.groupId)}
                            className="text-xs font-bold text-indigo-200 hover:text-white bg-indigo-900/60 hover:bg-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-500/40 transition-colors flex items-center gap-1 shadow-sm"
                            title="Tải dữ kiện này lên form soạn thảo để chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa Dữ Kiện</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveClusterGroup(q.groupId || q.groupStem!)}
                            className="text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-950/60 hover:bg-rose-900 px-2.5 py-1 rounded-lg border border-rose-500/40 transition-colors flex items-center gap-1 shadow-sm"
                            title="Tách các câu hỏi trong cụm này thành các câu độc lập (không chung dữ kiện)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Tách Độc Lập</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-slate-100 bg-slate-950/70 p-3.5 rounded-xl border border-indigo-500/20 leading-relaxed font-sans">
                        <MathText text={q.groupStem!} />
                      </div>
                    </div>
                  )}
                  <div
                    className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 relative hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-xl">
                          Câu {idx + 1}
                        </span>
                        {q.type === 'mc' && q.groupStem && (
                          <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Thuộc chùm câu có dữ kiện chung</span>
                          </span>
                        )}
                        <span className="text-[11px] font-bold bg-slate-800 text-indigo-300 px-2.5 py-1 rounded-xl uppercase">
                          {q.type === 'mc' ? 'Phần I (ABCD)' : q.type === 'tf' ? 'Phần II (Đ/S)' : q.type === 'short' ? 'Phần III (Ngắn)' : 'Tự luận'}
                        </span>
                        <span className="text-[11px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl">
                          {q.level}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">• {q.topic}</span>

                        {/* Điểm số câu hỏi - Cho phép xem và chỉnh sửa trực tiếp */}
                        {(q.type === 'mc' || q.type === 'short') && (
                          <div className="flex items-center gap-1.5 bg-slate-950 border border-amber-500/40 px-2.5 py-0.5 rounded-xl shadow-inner">
                            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-[11px] font-bold text-amber-300/80">Điểm:</span>
                            <input
                              type="number"
                              step="0.05"
                              min="0.05"
                              max="10"
                              value={q.points !== undefined && q.points !== null ? q.points : (q.type === 'mc' ? 0.25 : 0.5)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  handleUpdateQuestionPoints(idx, Math.round(val * 100) / 100);
                                }
                              }}
                              className="w-14 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-0.5 text-center text-xs font-mono font-black text-amber-300 focus:outline-none"
                              title="Bấm để chỉnh sửa trực tiếp điểm số cho câu này"
                            />
                            <span className="text-[11px] font-black text-amber-400">đ</span>
                          </div>
                        )}
                        {q.type === 'tf' && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                            Tối đa 1.0đ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenAICloneForDraftItem(q, idx)}
                          className="text-xs font-bold text-indigo-300 hover:text-white px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900/80 rounded-xl border border-indigo-800/50 transition-all flex items-center gap-1 shadow-sm"
                          title="Tạo câu hỏi tương tự với AI (Đổi số liệu, giữ nguyên dạng toán)"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>AI Biến Thể</span>
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={idx === draftingQuestions.length - 1}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuestion(idx)}
                          className="p-1.5 rounded-lg bg-slate-800 text-indigo-300 hover:text-white"
                          title="Nhân bản câu này"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => loadQuestionToForm(q, idx)}
                          className="text-xs font-bold text-amber-400 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 rounded-xl border border-amber-800/40 transition-all flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(idx)}
                          className="text-xs font-bold text-rose-400 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/40 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>

                    {/* STRICT ORDER: 1. STEM -> 2. IMAGE -> 3. CONTENT */}
                    {q.stem && (
                      <div className="text-xs text-slate-400 italic bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                        <MathText text={q.stem} />
                      </div>
                    )}

                    {q.image && (
                      <div>
                        <img
                          src={q.image}
                          alt="Question attachment"
                          className="max-h-48 rounded-xl border border-slate-800 my-1 object-contain"
                        />
                      </div>
                    )}

                    {q.audio && (
                      <AudioPlayer
                        src={q.audio}
                        audioName={q.audioName}
                        compact
                        className="my-1"
                      />
                    )}

                    <div className="text-sm font-semibold text-white leading-relaxed">
                      <MathText text={q.content} />
                    </div>

                    {/* Multiple choice options */}
                    {q.type === 'mc' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                          const optVal =
                            q.options?.[optKey] ?? (q.options as any)?.[optKey.toLowerCase()];
                          if (optVal === undefined || optVal === null) return null;
                          const isCorrect = q.correctAnswer === optKey;
                          return (
                            <div
                              key={optKey}
                              className={`p-2.5 rounded-xl border ${
                                isCorrect
                                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="font-black text-indigo-400 mr-1.5">{optKey}.</span>
                              <MathText text={optVal} className="inline" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False statements */}
                    {q.type === 'tf' && q.statements && (
                      <div className="space-y-1.5 text-xs pt-1">
                        {(['a', 'b', 'c', 'd'] as const).map((stKey) => {
                          const stVal =
                            q.statements?.[stKey] ?? (q.statements as any)?.[stKey.toUpperCase()];
                          if (stVal === undefined || stVal === null) return null;
                          const isTrue =
                            (q.correctAnswers?.[stKey] ??
                              (q.correctAnswers as any)?.[stKey.toUpperCase()]) === 'true';
                          return (
                            <div
                              key={stKey}
                              className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800"
                            >
                              <div className="flex items-center gap-1.5 text-slate-200">
                                <strong className="text-indigo-400 lowercase w-4">{stKey})</strong>
                                <MathText text={stVal} className="inline" />
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isTrue
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {isTrue ? 'Đúng' : 'Sai'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'short' && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-400 font-bold">Đáp án đúng chuẩn: </span>
                        <strong className="text-emerald-400 font-mono font-bold">
                          {q.correctAnswer || '--'}
                        </strong>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* BOTTOM PUBLISH & SAVE ACTIONS */}
            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={onSaveAllToBank}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <BookmarkPlus className="w-5 h-5" />
                <span>LƯU NGUYÊN ĐỀ VÀO NGÂN HÀNG HỆ THỐNG</span>
              </button>

              <button
                type="button"
                onClick={onOpenPublishModal}
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 rounded-2xl text-base transition-all shadow-xl shadow-indigo-600/30 uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                <span>XUẤT BẢN ĐỀ THI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Question Clone Modal */}
      <AICloneQuestionModal
        isOpen={isAiCloneModalOpen}
        onClose={() => {
          setIsAiCloneModalOpen(false);
          setAiCloneTargetQuestion(null);
          setAiTargetDraftIndex(null);
        }}
        targetQuestion={aiCloneTargetQuestion}
        onAddToDraft={(q) => {
          onDraftQuestionsChange([...draftingQuestions, q]);
        }}
        onAddAllToDraft={handleAddAIQuestionsToDraft}
        onSaveToBank={onSaveQuestionToBank}
        onReplaceOriginal={handleReplaceDraftQuestion}
        showToast={showToast}
      />

      {/* AI Exam Clone Modal */}
      <AICloneExamModal
        isOpen={isAiCloneExamModalOpen}
        onClose={() => setIsAiCloneExamModalOpen(false)}
        exam={{
          title: 'Đề Thi Đang Soạn',
          questions: draftingQuestions,
        }}
        onClonedExamReady={(cloned) => handleClonedExamReady(cloned)}
        showToast={showToast}
      />
    </div>
  );
};
