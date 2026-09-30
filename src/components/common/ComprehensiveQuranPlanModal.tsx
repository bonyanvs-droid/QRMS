  import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  X,
  Printer,
  BookOpen,
  RotateCcw,
  Sparkles,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Target,
  Flag,
  CheckCircle2,
  Sliders,
  Layers,
  Settings,
  AlertTriangle,
  Archive,
  Eye,
  Check,
  Calendar,
  Lock,
  ShieldCheck,
  Clock,
  Info,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Student, DailySessionRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  StudentQuranPlan,
  DailyPlanItem,
  PlanDirection,
  PlanningUnitType,
  StudentPlanRevisionMode,
} from '../../quran/types/plan';
import {
  formatHijriDate,
  formatGregorianDate,
  getTodayLocalIso,
} from '../../utils/hijriDate';
import { executePrintOrPdfFallback, exportElementToPdf } from '../../utils/pdfExportUtils';
import { MosqueLogo } from './logos/MosqueLogo';
import { getHalaqahActiveTrackIds } from '../../utils/trackAdapter';
import { SURAHS_LIST } from '../../data/initialData';
import {
  ALL_114_SURAHS,
  getSurahsByDirection,
  getSurahAyahsCount,
  findSurahMetadata,
} from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { QURAN_SURAHS } from '../../quran/data/quranMeta';
import { StageConfigModal } from '../quran/StageConfigModal';
import { hasPermission } from '../../lib/permissions';

type ViewVariant = 'teacher' | 'student' | 'parent';
type CalendarMode = 'hijri' | 'gregorian' | 'none';

interface Props {
  student: Student;
  variant?: ViewVariant;
  onClose: () => void;
  initialMode?: 'view' | 'setup';
  isOpen?: boolean;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  completed: { label: 'أُنجز', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  overachieved: { label: 'إنجاز أعلى', cls: 'bg-emerald-600 text-white border-emerald-600' },
  partial: { label: 'إنجاز جزئي', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  absent: { label: 'غياب', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  excused: { label: 'بعذر', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  unrecited: { label: 'لم يُسمّع', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  pending: { label: 'قادم', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const EVAL_LABELS: Record<string, string> = {
  excellent: 'ممتاز',
  very_good: 'جيد جدًا',
  good: 'جيد',
  needs_practice: 'يحتاج تدريب',
};

export const ComprehensiveQuranPlanModal: React.FC<Props> = ({
  student,
  variant = 'teacher',
  onClose,
  initialMode,
  isOpen = true,
}) => {
  const {
    getActiveStudentQuranPlan,
    sessionRecords,
    halaqahs,
    teachers,
    stages,
    activeTenant,
    academicConfig,
    spellingLessons,
    quranStageConfigs,
    previewStudentQuranPlan,
    approveStudentQuranPlan,
    archiveStudentQuranPlan,
    currentRole,
    currentUser,
  } = useApp();

  const printRef = useRef<HTMLDivElement>(null);
  const studentDisplayName = student.name || student.fullName || 'الطالب';

  // Active persisted plan
  const activePlan: StudentQuranPlan | undefined = useMemo(
    () => getActiveStudentQuranPlan(student.id) ?? undefined,
    [getActiveStudentQuranPlan, student.id]
  );

  // Active tracks & halaqah resolution
  const studentHalaqah = useMemo(
    () =>
      halaqahs.find((h) => h.id === student.halaqahId) ||
      halaqahs.find((h) => h.name === student.halaqahName),
    [halaqahs, student.halaqahId, student.halaqahName]
  );
  const enabledTrackIds = useMemo(() => getHalaqahActiveTrackIds(studentHalaqah), [studentHalaqah]);
  const spellingTrackOn = enabledTrackIds.includes('track_spelling');

  const teacherName =
    teachers.find((t) => t.id === student.teacherId)?.name ||
    studentHalaqah?.teacherName ||
    '—';

  // Authority check: Teacher CANNOT create or modify plans to prevent tampering!
  // Only the supervisor whose scope covers the halaqah, or system/campus/school admin can manage plans.
  const canManagePlan = useMemo(() => {
    if (variant === 'student' || variant === 'parent') return false;
    if (currentRole === 'teacher') return false; // Teachers can NEVER edit/create plans!
    if (['system_admin', 'campus_admin', 'admin'].includes(currentRole)) return true;
    if (currentRole === 'supervisor') {
      const studentHId = student.halaqahId || studentHalaqah?.id;
      const stageId = student.stageId || studentHalaqah?.stageId;
      return hasPermission(
        currentUser,
        'manage_quran_plan',
        studentHId,
        stageId,
        halaqahs,
        activeTenant
      );
    }
    return false;
  }, [variant, currentRole, currentUser, student.halaqahId, student.stageId, studentHalaqah?.id, studentHalaqah?.stageId, halaqahs, activeTenant]);

  // Calendar Mode: Hijri / Gregorian / None (إخفاء التاريخ)
  const [calendar, setCalendar] = useState<CalendarMode>('hijri');

  // Preview plan generated reactively or manually
  const [previewPlan, setPreviewPlan] = useState<StudentQuranPlan | null>(null);

  // Collapsible Settings Bar state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(() => {
    if (!canManagePlan) return false;
    if (initialMode === 'setup' || !activePlan) return true;
    return false;
  });

  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const initializedStudentIdRef = useRef<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [showStageConfigsModal, setShowStageConfigsModal] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Archive dialog state
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [archiveMode, setArchiveMode] = useState<'plan_only' | 'plan_and_achievements'>('plan_only');
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  // Weeks fold/unfold state
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());

  // Setup Form State
  const [useStageTemplate, setUseStageTemplate] = useState<boolean>(false);
  const [selectedStageConfigId, setSelectedStageConfigId] = useState<string>('');

  // Plan Track: 'combined' (حفظ ومراجعة) | 'memorization' (حفظ فقط) | 'revision' (مراجعة فقط)
  const [setupPlanType, setSetupPlanType] = useState<'combined' | 'memorization' | 'revision'>(() => {
    if (activePlan?.planType === 'revision') return 'revision';
    if (activePlan?.planType === 'memorization' || activePlan?.revisionMode === 'none') return 'memorization';
    return 'combined';
  });

  // Memorization parameters (Start point only — end point is resolved academically)
  const [setupStartSurah, setSetupStartSurah] = useState<string>('الناس');
  const [setupStartAyah, setSetupStartAyah] = useState<number>(1);
  const [setupDailyAmount, setSetupDailyAmount] = useState<number>(1);
  const [setupUnitType, setSetupUnitType] = useState<PlanningUnitType>('page');
  const [setupDirection, setSetupDirection] = useState<PlanDirection>('backward');
  const [setupConsolidationDays, setSetupConsolidationDays] = useState<number>(3);

  // Revision parameters (Cumulative toggle FIRST)
  const [setupAutoMinorRevision, setSetupAutoMinorRevision] = useState<boolean>(true);
  const [setupRevisionMode, setSetupRevisionMode] = useState<StudentPlanRevisionMode>('pages');
  const [setupRevisionDailyPages, setSetupRevisionDailyPages] = useState<number>(1);
  const [setupRevisionUnitsPerWindow, setSetupRevisionUnitsPerWindow] = useState<number>(2);
  const [setupRevisionDirection, setSetupRevisionDirection] = useState<PlanDirection>('backward');
  const [setupRevStartSurah, setSetupRevStartSurah] = useState<string>('الفاتحة');
  const [setupRevStartAyah, setSetupRevStartAyah] = useState<number>(1);
  // Manual revision starts from setupRevStartSurah/Ayah and proceeds according to setupRevisionDirection

  // Offsets (Mutual Exclusivity)
  const [setupSavingOffset, setSetupSavingOffset] = useState<number>(0);
  const [setupRevisionOffset, setSetupRevisionOffset] = useState<number>(0);

  const handleSavingOffsetChange = (val: number) => {
    const clamped = Math.max(0, val);
    setSetupSavingOffset(clamped);
    if (clamped > 0) {
      setSetupRevisionOffset(0);
    }
  };

  const handleRevisionOffsetChange = (val: number) => {
    const clamped = Math.max(0, val);
    setSetupRevisionOffset(clamped);
    if (clamped > 0) {
      setSetupSavingOffset(0);
    }
  };

  const [setupWorkingDays, setSetupWorkingDays] = useState<number[]>([0, 1, 2, 3]);
  const todayIso = getTodayLocalIso();

  // Effective plan to display (preview takes precedence, then active)
  const effectivePlan: StudentQuranPlan | undefined = previewPlan || activePlan;
  const isRevisionActive = (effectivePlan?.planType || setupPlanType) !== 'memorization' && (effectivePlan?.revisionMode || setupRevisionMode) !== 'none';

  // Auto-fill setup defaults ONLY once per student modal session
  useEffect(() => {
    if (!isOpen) {
      initializedStudentIdRef.current = null;
      return;
    }
    if (student && initializedStudentIdRef.current !== student.id) {
      initializedStudentIdRef.current = student.id;

      const latestMemRec = sessionRecords
        .filter((r) => r.studentId === student.id && r.memorization?.surahTo)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      // Older records/student pointer may store the English provider name
      // (e.g. 'Al-Faatiha') — normalize so the select matches an option and
      // findSurahMetadata resolves the position.
      let recordedSurah =
        resolveSurahName(latestMemRec?.memorization?.surahTo) ||
        resolveSurahName(student.currentSurah);
      let recordedAyah = latestMemRec?.memorization?.ayahTo || student.currentAyah || 1;

      if (recordedSurah) {
        const directionForAdvance = setupDirection;
        const ayahsCount = getSurahAyahsCount(recordedSurah);
        if (ayahsCount > 0 && recordedAyah < ayahsCount) {
          recordedAyah = recordedAyah + 1;
        } else if (ayahsCount > 0) {
          const ordered = getSurahsByDirection(directionForAdvance);
          const idx = ordered.findIndex((s) => s.name === recordedSurah);
          if (idx !== -1 && idx + 1 < ordered.length) {
            recordedSurah = ordered[idx + 1].name;
            recordedAyah = 1;
          }
        }
        setSetupStartSurah(recordedSurah);
      } else {
        setSetupStartSurah('الناس');
      }
      setSetupStartAyah(recordedAyah);

      const matchedConfig =
        quranStageConfigs.find(
          (c) => c.targetGrades?.includes(student.grade) && c.isActive
        ) || quranStageConfigs[0];

      if (matchedConfig) {
        setSelectedStageConfigId(matchedConfig.id);
        if (matchedConfig.memorization) {
          setSetupDailyAmount(matchedConfig.memorization.defaultDailyAmount);
          setSetupUnitType(matchedConfig.memorization.unitType as any);
          setSetupDirection(matchedConfig.memorization.defaultDirection);
        }
        if (matchedConfig.revision) {
          const mode = (matchedConfig.revision.mode as 'pages' | 'surahs' | 'lines' | 'none') || 'pages';
          setSetupRevisionMode(mode);
          setSetupRevisionDailyPages(matchedConfig.revision.defaultDailyPages ?? 1);
          if (matchedConfig.revision.surahsPerDay) {
            setSetupRevisionUnitsPerWindow(matchedConfig.revision.surahsPerDay);
          }
          if (matchedConfig.revision.defaultDirection) {
            setSetupRevisionDirection(matchedConfig.revision.defaultDirection);
          }
        }
        if (matchedConfig.consolidationDays !== undefined) {
          setSetupConsolidationDays(matchedConfig.consolidationDays);
        }
        if (matchedConfig.schedule?.workingDays) {
          setSetupWorkingDays(matchedConfig.schedule.workingDays);
        }
      }
    }
  }, [isOpen, student?.id]);

  // Reactive Debounced Plan Preview Generator
  const generateReactivePreview = useCallback(async () => {
    if (!canManagePlan) return;
    setIsGenerating(true);

    const startSurahMeta = findSurahMetadata(setupStartSurah);
    const revStartMeta = findSurahMetadata(setupRevStartSurah);
    

    if (!startSurahMeta && setupPlanType !== 'revision') {
      setIsGenerating(false);
      return;
    }

    try {
      const manualRevisionRange =
        setupPlanType !== "memorization" && !setupAutoMinorRevision && revStartMeta
          ? {
              start: { surahNumber: revStartMeta.number, ayahNumber: setupRevStartAyah },
              end:
                setupRevisionDirection === "forward"
                  ? { surahNumber: 114, ayahNumber: 6 }
                  : { surahNumber: 1, ayahNumber: 1 },
            }
          : undefined;

      const stageConfig =
        useStageTemplate && selectedStageConfigId
          ? quranStageConfigs.find((c) => c.id === selectedStageConfigId)
          : undefined;

      const built = await previewStudentQuranPlan({
        student,
        stageConfig,
        allStageConfigs: quranStageConfigs,
        customTargetStart: startSurahMeta ? { surahNumber: startSurahMeta.number, ayahNumber: setupStartAyah } : undefined,
        customDirection: setupDirection,
        customRevisionDirection: setupRevisionDirection,
        customUnitType: setupUnitType,
        planType: setupPlanType,
        customDailyAmount: setupDailyAmount,
        customRevisionDailyPages:
          setupPlanType === 'memorization' ? 0 : setupRevisionDailyPages,
        customRevisionUnitsPerWindow:
          setupPlanType === 'memorization' ? undefined
            : setupRevisionMode === 'pages' ? undefined
            : setupRevisionUnitsPerWindow,
        revisionMode: setupPlanType === 'memorization' ? 'none' : setupRevisionMode,
        savingOffset: setupPlanType === 'revision' ? 0 : setupSavingOffset,
        revisionOffset: setupPlanType === 'memorization' ? 0 : setupRevisionOffset,
        customConsolidationDays: setupPlanType === 'revision' ? 0 : setupConsolidationDays,
        customWorkingDays: setupWorkingDays,
        autoMinorRevisionMode:
          setupPlanType !== 'memorization' && setupAutoMinorRevision,
        manualRevisionRange,
        sessionRecords: (sessionRecords || []).filter((r) => r.studentId === student.id),
        halaqah: studentHalaqah,
        tenant: activeTenant,
        academicConfig,
        stages,
        spellingLessons,
      });

      setPreviewPlan(built);
    } catch (err: any) {
      console.warn('Reactive preview generation warning:', err?.message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    canManagePlan,
    setupStartSurah,
    setupStartAyah,
    setupDirection,
    setupRevisionDirection,
    setupUnitType,
    setupPlanType,
    setupDailyAmount,
    setupRevisionDailyPages,
    setupRevisionUnitsPerWindow,
    setupRevisionMode,
    setupSavingOffset,
    setupRevisionOffset,
    setupConsolidationDays,
    setupWorkingDays,
    setupAutoMinorRevision,
    setupRevStartSurah,
    setupRevStartAyah,
    useStageTemplate,
    selectedStageConfigId,
    student,
    quranStageConfigs,
    previewStudentQuranPlan,
    sessionRecords,
    studentHalaqah,
    activeTenant,
    academicConfig,
    stages,
    spellingLessons,
  ]);

  // Trigger reactive preview on parameter changes (debounced 250ms)
  useEffect(() => {
    if (!canManagePlan) return;
    const timer = setTimeout(() => {
      generateReactivePreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [generateReactivePreview, canManagePlan]);

  // Approve & Persist Plan
  const handleApprovePlan = async () => {
    const planToSave = previewPlan || activePlan;
    if (!planToSave) return;
    if (!canManagePlan) {
      setFeedbackMessage({
        type: 'error',
        text: 'تأسيس واعتماد الخطط القرآنية مخصص للمشرف التربوي المسؤول فقط.',
      });
      return;
    }
    setIsApproving(true);
    setFeedbackMessage(null);
    try {
      await approveStudentQuranPlan(planToSave, student);
      setPreviewPlan(null);
      setIsSettingsOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: 'تم اعتماد الخطة القرآنية وتثبيتها بنجاح ✓',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذر حفظ الخطة المعتمدة، يرجى المحاولة مجددًا.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Archive Plan
  const handleArchivePlan = async () => {
    if (!activePlan || !canManagePlan) return;
    setIsArchiving(true);
    try {
      await archiveStudentQuranPlan({
        planId: activePlan.id,
        archiveMode,
      });
      setShowArchiveDialog(false);
      setIsSettingsOpen(true);
      setPreviewPlan(null);
      setFeedbackMessage({
        type: 'success',
        text: 'تمت أرشفة الخطة السابقة بنجاح. يمكنك الآن تهيئة خطة جديدة للطالب.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذر أرشفة الخطة.',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const fmtDate = (d: string) => {
    if (calendar === 'none') return '';
    return calendar === 'hijri' ? formatHijriDate(d) : formatGregorianDate(d);
  };

  const surahName = (n?: number) => {
    if (!n) return '—';
    return SURAHS_LIST.find((s) => s.number === n)?.name || `${n}`;
  };

  // Older session records may store the English provider name (e.g.
  // 'Al-Faatiha') — normalize to Arabic before rendering.
  const resolveSurahName = (v?: string): string => {
    if (!v) return '';
    if (findSurahMetadata(v)) return findSurahMetadata(v)!.name;
    return QURAN_SURAHS.find((s) => s.name === v)?.arabicName || v;
  };

  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailySessionRecord>();
    for (const r of sessionRecords) {
      if (r.studentId !== student.id) continue;
      const prev = map.get(r.date);
      // r.id is opaque (e.g. 'rec_…') — a record carrying real track data
      // wins over an attendance-only one; ties resolve to the latest createdAt
      const hasData = (x: DailySessionRecord) =>
        Boolean(x.memorization?.surahFrom || x.revision?.surahFrom || x.spelling?.lessonId);
      if (
        !prev ||
        (hasData(r) && !hasData(prev)) ||
        (hasData(r) === hasData(prev) && new Date(r.createdAt || 0) >= new Date(prev.createdAt || 0))
      ) {
        map.set(r.date, r);
      }
    }
    return map;
  }, [sessionRecords, student.id]);

  const rawDailyPlans = effectivePlan?.generatedPlan?.dailyPlans || [];
  const holidays = new Set(effectivePlan?.schedule?.holidays || []);

  // Filter days: When calendar === 'none', filter out holidays to present a clean sequential syllabus (الحصة 1، 2، 3...)
  const dailyPlans = useMemo(() => {
    if (calendar === 'none') {
      return rawDailyPlans.filter((d) => d.dayType !== 'holiday' && !holidays.has(d.date));
    }
    return rawDailyPlans;
  }, [rawDailyPlans, calendar, holidays]);

  const weeks = useMemo(() => {
    const map = new Map<number, DailyPlanItem[]>();
    for (const d of dailyPlans) {
      const list = map.get(d.weekNumber) || [];
      list.push(d);
      map.set(d.weekNumber, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [dailyPlans]);

  const currentWeek = useMemo(() => {
    const todayDay = dailyPlans.find((d) => d.date === todayIso);
    if (todayDay) return todayDay.weekNumber;
    const next = dailyPlans.find((d) => d.date > todayIso && !d.isHistorical);
    return next?.weekNumber;
  }, [dailyPlans, todayIso]);

  const toggleWeek = (w: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  const isWeekOpen = (w: number) => !collapsedWeeks.has(w);

  useEffect(() => {
    if (currentWeek === undefined) return;
    const el = document.getElementById(`quran-plan-week-${currentWeek}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentWeek]);

  // Print & PDF Handlers — orientation is chosen here, not left to the browser dialog
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const handlePrint = async () => {
    if (!printRef.current || !effectivePlan) return;
    setIsPrinting(true);
    try {
      const fileName = `الخطة_القرآنية_${studentDisplayName.replace(/\s+/g, '_')}`;
      const title = `الخطة القرآنية المعتمدة — ${studentDisplayName}`;
      await executePrintOrPdfFallback(printRef.current, {
        fileName,
        title,
        orientation: printOrientation,
      });
    } catch (err) {
      console.error('Print generation failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Direct PDF download — skips the browser print dialog entirely, slices at
  // week boundaries so no week card is ever cut across pages.
  const handlePdfDownload = async () => {
    if (!printRef.current || !effectivePlan) return;
    setIsPrinting(true);
    try {
      const fileName = `الخطة_القرآنية_${studentDisplayName.replace(/\s+/g, '_')}`;
      await exportElementToPdf(printRef.current, {
        fileName,
        orientation: printOrientation,
        blockSelector: '.week-block',
      });
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/70 backdrop-blur-xs overflow-hidden">
      <div className="relative w-full h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/15 rounded-xl shrink-0">
              <BookOpen className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black truncate flex items-center gap-2">
                <span>الخطة القرآنية المعتمدة</span>
                <span className="text-xs font-normal text-emerald-200 truncate">
                  — {studentDisplayName}
                </span>
                {previewPlan && (
                  <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black animate-pulse">
                    معاينة حية
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-emerald-100/90 truncate">
                {studentHalaqah?.name || 'الحلقة'} • المعلم: {teacherName} • الصف: {student.grade || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Calendar Selector */}
            <div className="bg-white/15 rounded-lg p-0.5 flex text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCalendar('hijri')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  calendar === 'hijri' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
                title="عرض بالتقويم الهجري"
              >
                هجري
              </button>
              <button
                type="button"
                onClick={() => setCalendar('gregorian')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  calendar === 'gregorian' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
                title="عرض بالتقويم الميلادي"
              >
                ميلادي
              </button>
              <button
                type="button"
                onClick={() => setCalendar('none')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  calendar === 'none' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
                title="إخفاء التاريخ وعرض الحصص تسلسلياً"
              >
                إخفاء التاريخ
              </button>
            </div>

            {/* Page Orientation — applies to print AND PDF download */}
            <div className="bg-white/15 rounded-lg p-0.5 flex text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  printOrientation === 'portrait' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
                title="صفحة طولية (رأسية) A4"
              >
                رأسي
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  printOrientation === 'landscape' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white hover:bg-white/10'
                }`}
                title="صفحة عرضية (أفقية) A4"
              >
                أفقي
              </button>
            </div>

            {/* Direct PDF Download — no print dialog, weeks never split */}
            {effectivePlan && (
              <button
                type="button"
                onClick={handlePdfDownload}
                disabled={isPrinting}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPrinting
                    ? 'bg-white/10 text-white/50 cursor-not-allowed opacity-60'
                    : 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-xs'
                }`}
                title="تنزيل PDF جاهز (بدون حوار الطباعة)"
              >
                <Download className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
              </button>
            )}

            {/* Print / PDF Button */}
            {effectivePlan && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPrinting
                    ? 'bg-white/10 text-white/50 cursor-not-allowed opacity-60'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="طباعة / تصدير PDF"
              >
                <Printer className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
              </button>
            )}

            {/* Supervisor Settings Drawer Toggle */}
            {canManagePlan && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shadow-xs ${
                  isSettingsOpen
                    ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isSettingsOpen ? 'إغلاق لوحة الضبط' : 'فتح لوحة ضبط محددات الخطة'}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isSettingsOpen ? 'طي الإعدادات' : 'تعديل المحددات'}
                </span>
                {isSettingsOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}

            {/* Archive Plan (Supervisor only) */}
            {canManagePlan && activePlan && !previewPlan && (
              <button
                type="button"
                onClick={() => setShowArchiveDialog(true)}
                className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                title="أرشفة الخطة الحالية"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Bar */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-2 border-b shrink-0 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Preview Persistent Banner */}
        {previewPlan && (
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 border-b border-amber-800">
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-amber-200 shrink-0 animate-pulse" />
              <div>
                <span className="font-black text-xs sm:text-sm block">
                  معاينة الخطة المقترحة (محدثة لحظياً وفق المحددات)
                </span>
                <span className="text-[10px] text-amber-100 block">
                  راجع الوثيقة أدناه ثم اضغط «اعتماد وتثبيت الخطة» لحفظها فوراً في مكانها.
                </span>
              </div>
            </div>
            {canManagePlan && (
              <button
                type="button"
                onClick={handleApprovePlan}
                disabled={isApproving}
                className="px-4 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isApproving ? 'جاري الحفظ...' : 'اعتماد وتثبيت الخطة ✓'}</span>
              </button>
            )}
          </div>
        )}

        {/* MAIN BODY CONTAINER: Collapsible Settings Bar + Live Unified Document */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-5 space-y-4">
          {/* 1. COLLAPSIBLE TOP SETTINGS PANEL (Supervisor Only) */}
          {canManagePlan && isSettingsOpen && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-amber-300 shadow-md transition-all space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      لوحة ضبط وتعديل محددات الخطة القرآنية
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      أي تعديل هنا يعيد توليد المعاينة الحية فوراً في الوثيقة الرسمية أدناه.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isGenerating && (
                    <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      جاري التحديث...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleApprovePlan}
                    disabled={isApproving}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isApproving ? 'جاري الاعتماد...' : 'اعتماد الخطة'}</span>
                  </button>
                </div>
              </div>

              {/* TRACK SELECTOR TABS */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-2">
                  نوع الخطة القرآنية ومساراتها:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupPlanType('combined')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      setupPlanType === 'combined'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>حفظ ومراجعة (المسار المزدوج)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupPlanType('memorization')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      setupPlanType === 'memorization'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>حفظ فقط (بدون مراجعة)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupPlanType('revision')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      setupPlanType === 'revision'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>مراجعة فقط (تثبيت وخاتمين)</span>
                  </button>
                </div>
              </div>

              {/* 1. MEMORIZATION SECTION (Hidden if 'revision') */}
              {setupPlanType !== 'revision' && (
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>محددات مسار الحفظ الجديد:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Start Surah & Ayah */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        سورة وآية البداية:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={setupStartSurah}
                          onChange={(e) => {
                            setSetupStartSurah(e.target.value);
                            setSetupStartAyah(1);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        >
                          {getSurahsByDirection(setupDirection).map((s) => (
                            <option key={s.number} value={s.name}>
                              {s.number}. {s.name}
                            </option>
                          ))}
                        </select>
                        <QuranAyahSelect
                          surah={setupStartSurah}
                          value={setupStartAyah}
                          onChange={setSetupStartAyah}
                        />
                      </div>
                    </div>

                    {/* Memorization Direction */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        اتجاه الحفظ:
                      </label>
                      <select
                        value={setupDirection}
                        onChange={(e) => setSetupDirection(e.target.value as PlanDirection)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                      >
                        <option value="backward">عكسي (من الناس صعوداً نحو الفاتحة)</option>
                        <option value="forward">طردي (من الفاتحة نزولاً نحو الناس)</option>
                      </select>
                    </div>

                    {/* Planning Unit Type */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        وحدة التخطيط:
                      </label>
                      <select
                        value={setupUnitType}
                        onChange={(e) => setSetupUnitType(e.target.value as PlanningUnitType)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                      >
                        <option value="line">أسطر مصحف المدينة (الوحدة الذرية)</option>
                        <option value="rub">ثمن صفحة (سطران)</option>
                        <option value="quarter_page">ربع صفحة (4 أسطر)</option>
                        <option value="third_page">ثلث صفحة (5 أسطر)</option>
                        <option value="half_page">نصف صفحة (8 أسطر)</option>
                        <option value="page">صفحة كاملة (15 سطراً)</option>
                        <option value="ayah">آيات محددة</option>
                        <option value="surah">سورة كاملة</option>
                        <option value="quarter">ربع حزب</option>
                        <option value="hizb">نصف جزء (حزب)</option>
                        <option value="juz">جزء كامل</option>
                      </select>
                    </div>

                    {/* Daily Amount & Consolidation Days */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          المقدار اليومي:
                        </label>
                        <input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={setupDailyAmount}
                          onChange={(e) => setSetupDailyAmount(parseFloat(e.target.value) || 1)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          أيام التثبيت:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={setupConsolidationDays}
                          onChange={(e) => setSetupConsolidationDays(parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. REVISION SECTION (Hidden if 'memorization') */}
              {setupPlanType !== 'memorization' && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                      <RotateCcw className="w-4 h-4 text-amber-700" />
                      <span>محددات مسار المراجعة والتثبيت:</span>
                    </div>

                    {/* Toggle: Automatic Cumulative Revision FIRST */}
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-lg border border-amber-300 text-xs font-black text-amber-900 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={setupAutoMinorRevision}
                        onChange={(e) => setSetupAutoMinorRevision(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span>المراجعة التراكمية التلقائية (تبدأ عند اكتمال السورة وتثبيتها)</span>
                    </label>
                  </div>

                  {/* If Auto Cumulative is Enabled */}
                  {setupAutoMinorRevision ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          اتجاه المراجعة التراكمية:
                        </label>
                        <select
                          value={setupRevisionDirection}
                          onChange={(e) => setSetupRevisionDirection(e.target.value as PlanDirection)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        >
                          <option value="backward">عكسي (المحفوظ الأحدث أولاً)</option>
                          <option value="forward">طردي (من أول المحفوظ نحو آخره)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          وحدة المراجعة اليومية:
                        </label>
                        <select
                          value={setupRevisionMode}
                          onChange={(e) => setSetupRevisionMode(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        >
                          <option value="lines">أسطر مصحف المدينة</option>
                          <option value="rub_pages">ثمن صفحة (سطران)</option>
                          <option value="quarter_pages">ربع صفحة (4 أسطر)</option>
                          <option value="third_pages">ثلث صفحة (5 أسطر)</option>
                          <option value="half_pages">نصف صفحة (8 أسطر)</option>
                          <option value="pages">صفحات (15 سطراً/صفحة)</option>
                          <option value="surahs">سور كاملة</option>
                          <option value="quarters">أرباع الأحزاب</option>
                          <option value="hizb">أحزاب</option>
                          <option value="juz">أجزاء</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          مقدار الورد اليومي:
                        </label>
                        {setupRevisionMode === 'pages' ? (
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={setupRevisionDailyPages}
                            onChange={(e) => setSetupRevisionDailyPages(parseFloat(e.target.value) || 1)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                            placeholder="عدد الصفحات"
                          />
                        ) : (
                          <input
                            type="number"
                            min="1"
                            value={setupRevisionUnitsPerWindow}
                            onChange={(e) => setSetupRevisionUnitsPerWindow(parseInt(e.target.value) || 1)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                            placeholder={
                              setupRevisionMode === 'lines'
                                ? 'عدد الأسطر يومياً (مثال: 5، 7، 8)'
                                : setupRevisionMode === 'surahs'
                                  ? 'عدد السور يومياً'
                                  : 'عدد الوحدات يومياً'
                            }
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    /* If Manual Range is Selected */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          بداية نطاق المراجعة:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={setupRevStartSurah}
                            onChange={(e) => {
                              setSetupRevStartSurah(e.target.value);
                              setSetupRevStartAyah(1);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                          >
                            {ALL_114_SURAHS.map((s) => (
                              <option key={s.number} value={s.name}>
                                {s.number}. {s.name}
                              </option>
                            ))}
                          </select>
                          <QuranAyahSelect
                            surah={setupRevStartSurah}
                            value={setupRevStartAyah}
                            onChange={setSetupRevStartAyah}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          اتجاه المراجعة:
                        </label>
                        <select
                          value={setupRevisionDirection}
                          onChange={(e) => setSetupRevisionDirection(e.target.value as PlanDirection)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        >
                          <option value="backward">عكسي (من الناس نحو الفاتحة)</option>
                          <option value="forward">طردي (من الفاتحة نحو الناس)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          مقدار المراجعة اليومي:
                        </label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={setupRevisionDailyPages}
                          onChange={(e) => setSetupRevisionDailyPages(parseFloat(e.target.value) || 1)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. OFFSETS & SCHEDULE DAYS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Offsets (Mutual Exclusivity) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    إزاحة بدء المسار (تأجيل البداية لعدد من الحصص):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {setupPlanType !== 'revision' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          إزاحة بدء الحفظ:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={setupSavingOffset}
                          onChange={(e) => handleSavingOffsetChange(parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                          placeholder="0 حصص"
                        />
                      </div>
                    )}
                    {setupPlanType !== 'memorization' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          إزاحة بدء المراجعة:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={setupRevisionOffset}
                          onChange={(e) => handleRevisionOffsetChange(parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
                          placeholder="0 حصص"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * يتم تفعيل إزاحة واحدة فقط بالتناوب الإقصائي.
                  </p>
                </div>

                {/* Working Days */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    أيام الدراسة الأسبوعية للحلقة:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { day: 0, label: 'الأحد' },
                      { day: 1, label: 'الاثنين' },
                      { day: 2, label: 'الثلاثاء' },
                      { day: 3, label: 'الأربعاء' },
                      { day: 4, label: 'الخميس' },
                      { day: 5, label: 'الجمعة' },
                      { day: 6, label: 'السبت' },
                    ].map(({ day, label }) => {
                      const active = setupWorkingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (active) {
                              if (setupWorkingDays.length > 1) {
                                setSetupWorkingDays(setupWorkingDays.filter((d) => d !== day));
                              }
                            } else {
                              setSetupWorkingDays([...setupWorkingDays, day].sort((a, b) => a - b));
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. THE UNIFIED OFFICIAL PLAN DOCUMENT (Always Visible & Printable) */}
          <div
            ref={printRef}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-7 space-y-6 text-slate-900"
          >
            {/* Document Header with Logos & Identification */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <MosqueLogo size="md" className="shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    وثيقة الخطة القرآنية المعتمدة
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeTenant?.name || 'مجمع حلقات القرآن الكريم'} • {studentHalaqah?.name || 'الحلقة'}
                  </p>
                </div>
              </div>

              <div className="text-left text-xs font-bold space-y-0.5">
                <div className="text-emerald-800 font-black text-sm">{studentDisplayName}</div>
                <div className="text-slate-500">المعلم: {teacherName}</div>
                <div className="text-slate-400 text-[10px]">
                  {effectivePlan?.startDate && fmtDate(effectivePlan.startDate)} — {effectivePlan?.endDate && fmtDate(effectivePlan.endDate)}
                </div>
              </div>
            </div>

            {/* Plan Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">مسار الخطة</span>
                <span className="text-xs font-black text-slate-900">
                  {effectivePlan?.planType === 'revision'
                    ? 'مراجعة فقط'
                    : effectivePlan?.planType === 'memorization' || effectivePlan?.revisionMode === 'none'
                    ? 'حفظ فقط'
                    : 'حفظ ومراجعة'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">المستهدف الدراسي</span>
                <span className="text-xs font-black text-emerald-800">
                  {effectivePlan?.originalTarget?.displayTarget || 'قيد الاحتساب...'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">إجمالي الحصص الدراسية</span>
                <span className="text-xs font-black text-slate-900">
                  {dailyPlans.filter((d) => d.dayType !== 'holiday').length} حصة فعلية
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">أيام الإجازات المعتمدة</span>
                <span className="text-xs font-black text-purple-900">
                  {rawDailyPlans.filter((d) => d.dayType === 'holiday').length} يوم إجازة
                </span>
              </div>
            </div>

            {/* Diagnostic Alert if Plan is At Risk */}
            {effectivePlan?.status === 'at_risk' && effectivePlan.targetAtRiskDiagnostic && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-black text-amber-950">
                    {effectivePlan.targetAtRiskDiagnostic.warningMessage}
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800">
                    {effectivePlan.targetAtRiskDiagnostic.actionableRecommendations?.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* WEEKS ACCORDION / SCHEDULE TABLE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-700" />
                  <span>الجدول التفصيلي للأسابيع والحصص الدراسية</span>
                </h4>
                <div className="text-[11px] text-slate-400">
                  {weeks.length} أسابيع دراسية
                </div>
              </div>

              {weeks.map(([weekNum, days]) => {
                const isOpenWeek = isWeekOpen(weekNum);
                const weekTotalAyahs = days.reduce((sum, d) => sum + (d.targetUnit?.totalAyahs || 0), 0);
                const isCurrent = weekNum === currentWeek;

                return (
                  <div
                    key={weekNum}
                    id={`quran-plan-week-${weekNum}`}
                    className={`week-block rounded-xl border transition-all overflow-hidden ${
                      isCurrent
                        ? 'border-emerald-500 shadow-sm'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Week Accordion Header */}
                    <div
                      onClick={() => toggleWeek(weekNum)}
                      className={`week-block-header px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50 text-emerald-950'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                        <span>الأسبوع {weekNum}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            الأسبوع الحالي
                          </span>
                        )}
                        <span className="text-[11px] font-normal text-slate-500">
                          ({days.length} أيام • {weekTotalAyahs} آية)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 text-[11px] hidden sm:inline">
                          {calendar !== 'none' && `${fmtDate(days[0].date)} - ${fmtDate(days[days.length - 1].date)}`}
                        </span>
                        {isOpenWeek ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* Week Days Table */}
                    {isOpenWeek && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50/80 text-slate-600 border-y border-slate-200 font-black text-[11px]">
                            <tr>
                              <th className="py-2 px-3 w-28">اليوم / التاريخ</th>
                              <th className="py-2 px-3">الورد القرآني المقرر</th>
                              {isRevisionActive && (
                                <th className="py-2 px-3 min-w-[200px]">المراجعة والتثبيت</th>
                              )}
                              {spellingTrackOn && (
                                <th className="py-2 px-3 w-32">مسار الهجاء</th>
                              )}
                              <th className="py-2 px-3 w-24 text-center">حالة الإنجاز</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {days.map((day) => {
                              const isToday = day.date === todayIso;
                              const isHoliday = day.dayType === 'holiday';

                              // HOLIDAY ROW RENDERING
                              if (isHoliday) {
                                if (calendar === 'none') return null; // filtered out in sequential view
                                return (
                                  <tr
                                    key={day.id}
                                    className="bg-purple-50/70 border-y border-purple-100 text-purple-950 font-bold text-xs"
                                  >
                                    <td className="py-2 px-3">
                                      {day.dayName} {fmtDate(day.date)}
                                    </td>
                                    <td
                                      colSpan={spellingTrackOn ? (isRevisionActive ? 4 : 3) : (isRevisionActive ? 3 : 2)}
                                      className="py-2 px-3 text-center text-purple-800"
                                    >
                                      🏖️ إجازة رسمية معتمدة
                                    </td>
                                  </tr>
                                );
                              }

                              const rec = recordsByDate.get(day.date);
                              const statusKey = rec?.status || day.status || 'pending';
                              const meta = STATUS_META[statusKey] || STATUS_META.pending;

                              return (
                                <tr
                                  key={day.id}
                                  className={`hover:bg-slate-50/60 transition-colors ${
                                    isToday ? 'bg-amber-50/40 font-bold' : ''
                                  }`}
                                >
                                  {/* Date / Item Index */}
                                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-900">
                                    {calendar !== 'none' ? (
                                      <div>
                                        <span className="font-black">{day.dayName}</span>{' '}
                                        <span className="text-slate-500 font-normal">
                                          {fmtDate(day.date)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-black">الحصة {day.itemIndex}</span>
                                    )}
                                  </td>

                                  {/* Target Memorization Unit (+ actual achieved inline when it differs) */}
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5 flex-wrap text-slate-900 font-bold">
                                      {day.isConsolidationDay ? (
                                        <span className="inline-flex items-center gap-1.5 text-amber-800">
                                          <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span>{day.targetUnit.displayLabel}</span>
                                        </span>
                                      ) : (
                                        <span>
                                          {day.targetUnit.displayLabel || (
                                            <span className="text-slate-400 font-normal">—</span>
                                          )}
                                        </span>
                                      )}
                                      {(() => {
                                        // Show the actually-achieved range when it differs from
                                        // the planned assignment. Compare POSITIONS (not labels):
                                        // older rows inherited the target's displayLabel even when
                                        // the achieved end moved beyond it.
                                        const au = day.actualAchieved?.unit;
                                        const posDiffers = Boolean(
                                          au &&
                                          (au.end?.surahNumber !== day.targetUnit?.end?.surahNumber ||
                                            au.end?.ayahNumber !== day.targetUnit?.end?.ayahNumber ||
                                            au.start?.surahNumber !== day.targetUnit?.start?.surahNumber ||
                                            au.start?.ayahNumber !== day.targetUnit?.start?.ayahNumber)
                                        );
                                        const actualLabel = posDiffers
                                          ? au!.displayLabel &&
                                            au!.displayLabel !== day.targetUnit.displayLabel
                                            ? au!.displayLabel
                                            : `سورة ${surahName(au!.start?.surahNumber)} (الآيات ${au!.start?.ayahNumber} - ${au!.end?.ayahNumber})`
                                          : rec?.memorization?.surahFrom && rec.memorization.surahTo
                                            ? `${resolveSurahName(rec.memorization.surahFrom)} ${rec.memorization.ayahFrom} – ${resolveSurahName(rec.memorization.surahTo)} ${rec.memorization.ayahTo}`
                                            : undefined;
                                        if (!actualLabel || actualLabel === day.targetUnit.displayLabel) return null;
                                        return (
                                          <span className="print:hidden pdf-hidden inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                                            <Check className="w-3 h-3" />
                                            <span>المنجز: {actualLabel}</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </td>

                                  {/* Revision Assignment — condensed label (column already
                                      says "المراجعة"), "(+N سطر)" suffix on a muted 2nd line */}
                                  {isRevisionActive && (
                                    <td className="py-2.5 px-3 text-slate-700 min-w-[200px]">
                                      {day.revisionDisplayLabel ? (
                                        (() => {
                                          // "مراجعة: من سورة الفاتحة (1) إلى سورة الماعون إلى آخرها"
                                          // → "من الفاتحة (1) إلى الماعون آخرها"
                                          const short = day.revisionDisplayLabel
                                            .replace(/^مراجعة:\s*/, '')
                                            .replace(/سورة\s+/g, '')
                                            .replace(/إلى آخرها/g, 'آخرها');
                                          const m = short.match(
                                            /^(.*?)\s*(\(\+?\d+\s*سطر[^)]*\))\s*$/
                                          );
                                          return (
                                            <span className="inline-block text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 shadow-2xs leading-relaxed">
                                              {m ? m[1] : short}
                                              {m && (
                                                <span className="print:hidden pdf-hidden block text-[9px] font-medium text-amber-700/90">
                                                  {m[2]}
                                                </span>
                                              )}
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  )}

                                  {/* Spelling Lesson (If active) */}
                                  {spellingTrackOn && (
                                    <td className="py-2.5 px-3 text-slate-700">
                                      {day.spellingAssignment?.title ? (
                                        <span className="text-[11px] text-teal-800 font-bold">
                                          {day.spellingAssignment.title}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  )}

                                  {/* Status */}
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${meta.cls}`}
                                    >
                                      {meta.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام الخطط المعتمد • QRMS Unified Engine</span>
          </div>

          <div className="flex items-center gap-2">
            {canManagePlan && previewPlan && (
              <button
                type="button"
                onClick={handleApprovePlan}
                disabled={isApproving}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isApproving ? 'جاري الاعتماد...' : 'اعتماد وتثبيت الخطة'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-right">
            <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>تأكيد أرشفة الخطة الحالية</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في أرشفة الخطة النشطة الحالية للطالب (<strong>{studentDisplayName}</strong>)؟
              سيتم نقل الخطة للأرشيف التاريخي مع الاحتفاظ بسجلات الإنجاز السابقة كاملة.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowArchiveDialog(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleArchivePlan}
                disabled={isArchiving}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isArchiving ? 'جاري الأرشفة...' : 'نعم، أرشف الخطة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
