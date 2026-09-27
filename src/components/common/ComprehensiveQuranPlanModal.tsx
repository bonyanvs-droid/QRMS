import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Printer,
  BookOpen,
  RotateCcw,
  Sparkles,
  CalendarDays,
  ChevronDown,
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
} from 'lucide-react';
import { Student, DailySessionRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  StudentQuranPlan,
  DailyPlanItem,
  PlanDirection,
  PlanningUnitType,
} from '../../quran/types/plan';
import {
  formatHijriDate,
  formatGregorianDate,
  getTodayLocalIso,
} from '../../utils/hijriDate';
import { executePrintOrPdfFallback } from '../../utils/pdfExportUtils';
import { getHalaqahActiveTrackIds } from '../../utils/trackAdapter';
import { SURAHS_LIST } from '../../data/initialData';
import {
  ALL_114_SURAHS,
  getSurahsByDirection,
  getSurahAyahsCount,
  findSurahMetadata,
} from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { StageConfigModal } from '../quran/StageConfigModal';

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
    activeTenant,
    quranStageConfigs,
    academicConfig,
    stages,
    spellingLessons,
    previewStudentQuranPlan,
    approveStudentQuranPlan,
    archiveStudentQuranPlan,
    currentRole,
  } = useApp();

  const printRef = useRef<HTMLDivElement>(null);

  // Active persisted plan
  const activePlan: StudentQuranPlan | undefined = useMemo(
    () => getActiveStudentQuranPlan(student.id),
    [getActiveStudentQuranPlan, student.id]
  );

  const canEdit =
    variant === 'teacher' &&
    ['teacher', 'admin', 'system_admin', 'campus_admin', 'supervisor'].includes(currentRole);

  // Calendar Mode: Hijri / Gregorian / None (إخفاء التاريخ)
  const [calendar, setCalendar] = useState<CalendarMode>('hijri');

  // Preview plan waiting for approval
  const [previewPlan, setPreviewPlan] = useState<StudentQuranPlan | null>(null);

  // Configuration Mode (when no plan exists, or teacher wants to rebuild)
  const [isConfiguring, setIsConfiguring] = useState<boolean>(() => {
    if (initialMode === 'setup') return true;
    if (!activePlan) return true;
    return false;
  });

  const [justApproved, setJustApproved] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);
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
  const [useStageTemplate, setUseStageTemplate] = useState<boolean>(true);
  const [selectedStageConfigId, setSelectedStageConfigId] = useState<string>('');
  const [setupStartSurah, setSetupStartSurah] = useState<string>('الناس');
  const [setupStartAyah, setSetupStartAyah] = useState<number>(1);
  const [setupEndSurah, setSetupEndSurah] = useState<string>(
    student.minimumTargetSurah || 'الفاتحة'
  );
  const [setupEndAyah, setSetupEndAyah] = useState<number>(() =>
    getSurahAyahsCount(student.minimumTargetSurah || 'الفاتحة') || 7
  );
  const [setupDailyAmount, setSetupDailyAmount] = useState<number>(1);
  const [setupUnitType, setSetupUnitType] = useState<PlanningUnitType>('page');
  const [setupDirection, setSetupDirection] = useState<PlanDirection>('backward');
  const [setupRevisionDailyPages, setSetupRevisionDailyPages] = useState<number>(1);
  const [setupRevisionUnitsPerWindow, setSetupRevisionUnitsPerWindow] = useState<number>(2);
  const [setupConsolidationDays, setSetupConsolidationDays] = useState<number>(3);
  const [setupWorkingDays, setSetupWorkingDays] = useState<number[]>([0, 1, 2, 3]);
  const [setupAutoMinorRevision, setSetupAutoMinorRevision] = useState<boolean>(true);
  const [setupRevisionDirection, setSetupRevisionDirection] = useState<PlanDirection>('backward');
  const [setupRevStartSurah, setSetupRevStartSurah] = useState<string>('الفاتحة');
  const [setupRevStartAyah, setSetupRevStartAyah] = useState<number>(1);
  const [setupRevEndSurah, setSetupRevEndSurah] = useState<string>('الناس');
  const [setupRevEndAyah, setSetupRevEndAyah] = useState<number>(6);

  const todayIso = getTodayLocalIso();

  // Active tracks — resolved from halaqah
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

  // Effective plan to display (preview takes precedence, then active)
  const effectivePlan: StudentQuranPlan | undefined = previewPlan || activePlan;

  // Auto-fill setup defaults
  useEffect(() => {
    if (student) {
      const latestMemRec = sessionRecords
        .filter((r) => r.studentId === student.id && r.memorization?.surahTo)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      let recordedSurah = latestMemRec?.memorization?.surahTo || student.currentSurah;
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
          (c) => c.targetGrades.includes(student.grade) && c.isActive
        ) || quranStageConfigs[0];

      if (matchedConfig) {
        setSelectedStageConfigId(matchedConfig.id);
        if (matchedConfig.memorization) {
          setSetupDailyAmount(matchedConfig.memorization.defaultDailyAmount);
          setSetupUnitType(matchedConfig.memorization.unitType as any);
          setSetupDirection(matchedConfig.memorization.defaultDirection);
        }
        if (matchedConfig.revision) {
          setSetupRevisionDailyPages(matchedConfig.revision.defaultDailyPages ?? 1);
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
  }, [student, quranStageConfigs, sessionRecords]);

  // Stage Config Change handler
  const handleStageConfigChange = (configId: string) => {
    setSelectedStageConfigId(configId);
    const cfg = quranStageConfigs.find((c) => c.id === configId);
    if (!cfg) return;

    if (cfg.memorization) {
      setSetupDailyAmount(cfg.memorization.defaultDailyAmount);
      setSetupUnitType(cfg.memorization.unitType as any);
      setSetupDirection(cfg.memorization.defaultDirection);
    }
    if (cfg.revision) {
      setSetupRevisionDailyPages(cfg.revision.defaultDailyPages ?? 1);
      if (cfg.revision.defaultDirection) {
        setSetupRevisionDirection(cfg.revision.defaultDirection);
      }
    }
    if (cfg.consolidationDays !== undefined) {
      setSetupConsolidationDays(cfg.consolidationDays);
    }
    if (cfg.schedule?.workingDays) {
      setSetupWorkingDays(cfg.schedule.workingDays);
    }
  };

  // Generate & Preview Plan
  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    setFeedbackMessage(null);

    const startSurahMeta = findSurahMetadata(setupStartSurah);
    const endSurahMeta = findSurahMetadata(setupEndSurah);
    if (!startSurahMeta || !endSurahMeta) {
      setFeedbackMessage({ type: 'error', text: 'يرجى اختيار سور بداية ونهاية صالحة.' });
      setIsSettingUp(false);
      return;
    }

    try {
      const revStartMeta = findSurahMetadata(setupRevStartSurah);
      const revEndMeta = findSurahMetadata(setupRevEndSurah);
      const manualRevisionRange = !setupAutoMinorRevision
        ? {
            start: { surahNumber: revStartMeta?.number ?? 1, ayahNumber: setupRevStartAyah },
            end: { surahNumber: revEndMeta?.number ?? 114, ayahNumber: setupRevEndAyah },
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
        customTargetStart: { surahNumber: startSurahMeta.number, ayahNumber: setupStartAyah },
        customTargetEnd: { surahNumber: endSurahMeta.number, ayahNumber: setupEndAyah },
        customDirection: setupDirection,
        customRevisionDirection: setupRevisionDirection,
        customUnitType: setupUnitType,
        customDailyAmount: setupDailyAmount,
        customRevisionDailyPages: setupRevisionDailyPages,
        customRevisionUnitsPerWindow: setupRevisionUnitsPerWindow,
        customConsolidationDays: setupConsolidationDays,
        customWorkingDays: setupWorkingDays,
        autoMinorRevisionMode: setupAutoMinorRevision,
        manualRevisionRange,
        sessionRecords: (sessionRecords || []).filter((r) => r.studentId === student.id),
        halaqah: halaqahs.find((h) => h.id === student.halaqahId),
        tenant: activeTenant,
        academicConfig,
        stages,
        spellingLessons,
      });

      setPreviewPlan(built);
      setIsConfiguring(false);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذر توليد معاينة الخطة، يرجى مراجعة المدخلات.',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Approve & Persist Plan
  const handleApprovePlan = async () => {
    if (!previewPlan) return;
    setIsApproving(true);
    setFeedbackMessage(null);
    try {
      await approveStudentQuranPlan(previewPlan, student);
      setPreviewPlan(null);
      setIsConfiguring(false);
      setJustApproved(true);
      setFeedbackMessage({
        type: 'success',
        text: 'تم اعتماد الخطة القرآنية وحفظها كخطة نشطة بنجاح ✓',
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
    if (!activePlan) return;
    setIsArchiving(true);
    try {
      await archiveStudentQuranPlan({ planId: activePlan.id, archiveMode });
      setShowArchiveDialog(false);
      setIsConfiguring(true);
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

  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailySessionRecord>();
    for (const r of sessionRecords) {
      if (r.studentId !== student.id) continue;
      const prev = map.get(r.date);
      if (!prev || new Date(r.id) > new Date(prev.id)) map.set(r.date, r);
    }
    return map;
  }, [sessionRecords, student.id]);

  const rawDailyPlans = effectivePlan?.generatedPlan?.dailyPlans || [];
  const holidays = new Set(effectivePlan?.schedule?.holidays || []);

  // Filter days: When calendar === 'none', filter out holidays to present a clean sequential syllabus (اليوم 1، 2، 3...)
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
    if (currentWeek === undefined || isConfiguring) return;
    const el = document.getElementById(`quran-plan-week-${currentWeek}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentWeek, isConfiguring]);

  const priorMemRecords = useMemo(() => {
    if (!effectivePlan?.startDate) return [];
    return sessionRecords
      .filter(
        (r) =>
          r.studentId === student.id &&
          r.memorization &&
          r.memorization.surahTo &&
          r.date < effectivePlan.startDate
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessionRecords, student.id, effectivePlan?.startDate]);

  const completedCount = dailyPlans.filter(
    (d) => d.status === 'completed' || d.status === 'overachieved'
  ).length;

  const currentDayItem = useMemo(() => {
    if (!dailyPlans.length) return undefined;
    return (
      dailyPlans.find((d) => d.date === todayIso) ||
      dailyPlans.find((d) => d.date > todayIso && !d.isHistorical && d.status === 'pending')
    );
  }, [dailyPlans, todayIso]);

  const dayStatusMeta = (d: DailyPlanItem): { label: string; cls: string } => {
    if (d.date === todayIso) {
      const base = STATUS_META[d.status] || STATUS_META.pending;
      return { label: `اليوم — ${base.label}`, cls: 'bg-blue-600 text-white border-blue-600' };
    }
    if (d.date < todayIso && d.status === 'pending' && !d.isHistorical) {
      return { label: 'فائت بلا تسجيل', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
    return STATUS_META[d.status] || STATUS_META.pending;
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!printRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      await executePrintOrPdfFallback(printRef.current, {
        fileName: `الخطة_القرآنية_الشاملة_${student.fullName}.pdf`,
        title: `الخطة القرآنية الشاملة — ${student.fullName}`,
        orientation: 'portrait',
      });
    } finally {
      setTimeout(() => setIsPrinting(false), 1200);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-2 sm:p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-800 to-teal-700 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 shrink-0 text-amber-300" />
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-base truncate">
                الخطة القرآنية الشاملة — {student.fullName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-emerald-100 truncate">
                {isConfiguring
                  ? 'تهيئة وإعداد معايير الخطة القرآنية الفردية'
                  : previewPlan
                  ? 'معاينة تفاعلية كاملة قبل الاعتماد'
                  : 'العرض التشغيلي المعتمد — موحد للعرض والطباعة والـ PDF'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Calendar Selector (3 Modes: Hijri / Gregorian / Hide Date) */}
            {!isConfiguring && (
              <div className="bg-white/15 rounded-lg p-0.5 flex text-[11px] font-bold">
                <button
                  onClick={() => setCalendar('hijri')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    calendar === 'hijri' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white'
                  }`}
                  title="عرض التواريخ بالتقويم الهجري"
                >
                  هجري
                </button>
                <button
                  onClick={() => setCalendar('gregorian')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    calendar === 'gregorian' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white'
                  }`}
                  title="عرض التواريخ بالتقويم الميلادي"
                >
                  ميلادي
                </button>
                <button
                  onClick={() => setCalendar('none')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    calendar === 'none' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white'
                  }`}
                  title="إخفاء التواريخ والاعتماد على تسلسل الحصص المنهجية (دفتر متابعة بدون تواريخ)"
                >
                  إخفاء التاريخ
                </button>
              </div>
            )}

            {/* Print / PDF Button */}
            {!isConfiguring && (
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPrinting
                    ? 'bg-white/10 text-white/50 cursor-not-allowed opacity-60'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title={isPrinting ? 'جاري تجهيز المستند...' : 'طباعة / تصدير PDF'}
              >
                <Printer className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
              </button>
            )}

            {/* Reconfigure / Setup Toggle for Teachers/Supervisors */}
            {canEdit && !isConfiguring && (
              <button
                onClick={() => setIsConfiguring(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="تعديل معايير الخطة أو إعادة بنائها"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إعادة ضبط</span>
              </button>
            )}

            {/* Archive Plan for Teachers/Supervisors */}
            {canEdit && !isConfiguring && activePlan && !previewPlan && (
              <button
                onClick={() => setShowArchiveDialog(true)}
                className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                title="أرشفة الخطة الحالية"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
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
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Preview Persistent Banner */}
        {previewPlan && !isConfiguring && (
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 border-b border-amber-800">
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-amber-200 shrink-0" />
              <div>
                <span className="font-black text-xs sm:text-sm block">
                  معاينة الخطة المقترحة (مسودة تفاعلية قبل الاعتماد)
                </span>
                <span className="text-[10px] text-amber-100 block">
                  راجع الواجبات أدناه ثم اضغط اعتماد الخطة. ستبقى الشاشة ثابتة وتتحول إلى الخطة النشطة فوراً.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfiguring(true)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                تعديل الإعدادات ✎
              </button>
              <button
                type="button"
                onClick={handleApprovePlan}
                disabled={isApproving}
                className="px-4 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isApproving ? 'جاري الحفظ...' : 'اعتماد الخطة وحفظها ✓'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Just Approved Success Banner */}
        {justApproved && !previewPlan && !isConfiguring && (
          <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="font-bold text-xs">
                تم اعتماد الخطة وحفظها في قاعدة البيانات — الخطة الآن نشطة وتتحدث تلقائياً مع جلسات التسميع.
              </span>
            </div>
            <button
              onClick={() => setJustApproved(false)}
              className="text-emerald-200 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {/* ============================================================
              VIEW 1: SETUP & CONFIGURATION FORM
              ============================================================ */}
          {isConfiguring ? (
            <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-amber-900">
                    {activePlan ? 'إعادة ضبط وبناء الخطة القرآنية' : 'تأسيس الخطة القرآنية الفردية'}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    حدد معايير الحفظ والمراجعة للطالب. عند الضغط على «توليد ومعاينة الخطة»، ستظهر لك الخطة كاملة
                    في نفس التصميم المعتمد للطباعة مع إمكانية مراجعتها واعتمادها دون تشتت.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGeneratePreview} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>معايير الخطة ومسارات التسميع</span>
                  </h5>
                  {activePlan && (
                    <button
                      type="button"
                      onClick={() => setIsConfiguring(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      إلغاء والعودة للخطة الحالية ✕
                    </button>
                  )}
                </div>

                {/* Stage Template Selector */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useStageTemplate}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseStageTemplate(checked);
                          if (checked && quranStageConfigs.length > 0) {
                            handleStageConfigChange(selectedStageConfigId || quranStageConfigs[0].id);
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-800">
                        تطبيق خطة من قالب معتمد (اختر قالباً)
                      </span>
                    </label>
                    {useStageTemplate && (
                      <button
                        type="button"
                        onClick={() => setShowStageConfigsModal(true)}
                        className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all shrink-0"
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                        <span>⚙️ إدارة النماذج</span>
                      </button>
                    )}
                  </div>

                  {useStageTemplate && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        اختر نموذج المرحلة المعتمد:
                      </label>
                      <select
                        value={selectedStageConfigId}
                        onChange={(e) => handleStageConfigChange(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-700 shadow-2xs text-slate-900"
                      >
                        {quranStageConfigs.map((cfg) => (
                          <option key={cfg.id} value={cfg.id}>
                            {cfg.name} – {cfg.memorization?.defaultDirection === 'backward' ? 'تنازلي (جزء عم)' : 'تصاعدي'} ({cfg.memorization?.defaultDailyAmount || 1}{' '}
                            {cfg.memorization?.unitType === 'ayah' ? 'آيات' : 'صفحة'} يومياً)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Target Start & End Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Position */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-800 block">نقطة البداية (الموضع الحالي)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">السورة</label>
                        <select
                          value={setupStartSurah}
                          onChange={(e) => {
                            const newSurah = e.target.value;
                            setSetupStartSurah(newSurah);
                            const maxAyahs = getSurahAyahsCount(newSurah);
                            if (setupStartAyah > maxAyahs) setSetupStartAyah(maxAyahs);
                          }}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {getSurahsByDirection(setupDirection).map((s) => (
                            <option key={s.number} value={s.name}>
                              {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <QuranAyahSelect
                          id="setup_start_ayah"
                          surah={setupStartSurah}
                          value={setupStartAyah}
                          onChange={setSetupStartAyah}
                          label="الآية"
                        />
                      </div>
                    </div>
                  </div>

                  {/* End Position */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-blue-800 block">نقطة النهاية (المستهدف الفصلي)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">السورة</label>
                        <select
                          value={setupEndSurah}
                          onChange={(e) => {
                            const newSurah = e.target.value;
                            setSetupEndSurah(newSurah);
                            const maxAyahs = getSurahAyahsCount(newSurah);
                            if (setupEndAyah > maxAyahs) setSetupEndAyah(maxAyahs);
                          }}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {getSurahsByDirection(setupDirection).map((s) => (
                            <option key={s.number} value={s.name}>
                              {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <QuranAyahSelect
                          id="setup_end_ayah"
                          surah={setupEndSurah}
                          value={setupEndAyah}
                          onChange={setSetupEndAyah}
                          label="الآية"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parameters: Unit Type, Daily Amount, Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">وحدة التخطيط</label>
                    <select
                      value={setupUnitType}
                      onChange={(e) => setSetupUnitType(e.target.value as PlanningUnitType)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="line">سطر مصحف (توزيع ذكي)</option>
                      <option value="ayah">آيات محددة (بالآيات)</option>
                      <option value="quarter_page">ربع صفحة</option>
                      <option value="half_page">نصف صفحة</option>
                      <option value="page">صفحة كاملة</option>
                      <option value="quarter">ربع حزب</option>
                      <option value="surah">سورة كاملة</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">المقدار اليومي (حفظ)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={setupDailyAmount}
                      onChange={(e) => setSetupDailyAmount(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">اتجاه الحفظ</label>
                    <select
                      value={setupDirection}
                      onChange={(e) => setSetupDirection(e.target.value as PlanDirection)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="backward">تنازلي (الناس ← البقرة)</option>
                      <option value="forward">تصاعدي (الفاتحة ← الناس)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Settings: Revision, Consolidation, Working Days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    {(() => {
                      const effectiveTemplate = quranStageConfigs.find((c) => c.id === selectedStageConfigId);
                      const isSurahMode = effectiveTemplate?.revision?.mode === 'surahs';
                      return isSurahMode ? (
                        <>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">المراجعة (سور)</label>
                          <select
                            value={setupRevisionUnitsPerWindow}
                            onChange={(e) => setSetupRevisionUnitsPerWindow(parseInt(e.target.value, 10) || 1)}
                            className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-200 bg-white"
                          >
                            <option value="1">سورة واحدة (1)</option>
                            <option value="2">سورتان (2)</option>
                            <option value="3">3 سور</option>
                            <option value="4">4 سور</option>
                            <option value="5">5 سور</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">المراجعة (صفحات)</label>
                          <select
                            value={setupRevisionDailyPages}
                            onChange={(e) => setSetupRevisionDailyPages(parseFloat(e.target.value) || 1)}
                            className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-200 bg-white"
                          >
                            <option value="0.5">نصف صفحة</option>
                            <option value="1">صفحة واحدة (1)</option>
                            <option value="2">صفحتان (2)</option>
                            <option value="3">3 صفحات</option>
                            <option value="4">4 صفحات</option>
                            <option value="5">5 صفحات</option>
                            <option value="10">نصف جزء (10 ص)</option>
                            <option value="20">جزء كامل (20 ص)</option>
                          </select>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">تثبيت السورة المنتهية</label>
                    <select
                      value={setupConsolidationDays}
                      onChange={(e) => setSetupConsolidationDays(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="3">3 أيام متتالية (معياري)</option>
                      <option value="2">يومان</option>
                      <option value="1">يوم واحد</option>
                      <option value="0">بدون أيام تثبيت</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">اتجاه المراجعة (مستقل)</label>
                    <select
                      value={setupRevisionDirection}
                      onChange={(e) => setSetupRevisionDirection(e.target.value as PlanDirection)}
                      className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="backward">عكسي (الأحدث ← الأقدم)</option>
                      <option value="forward">مع اتجاه الحفظ</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">أيام التسميع</label>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { d: 0, l: 'أحد' },
                        { d: 1, l: 'اثنين' },
                        { d: 2, l: 'ثلاثاء' },
                        { d: 3, l: 'أربعاء' },
                        { d: 4, l: 'خميس' },
                        { d: 5, l: 'جمعة' },
                        { d: 6, l: 'سبت' },
                      ].map((day) => {
                        const isChecked = setupWorkingDays.includes(day.d);
                        return (
                          <button
                            key={day.d}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSetupWorkingDays(setupWorkingDays.filter((w) => w !== day.d));
                              } else {
                                setSetupWorkingDays([...setupWorkingDays, day.d]);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-emerald-800 text-white'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {day.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Auto Minor Revision Toggle */}
                <label className="flex items-center justify-between gap-3 bg-emerald-50/60 border border-emerald-200 rounded-xl px-3.5 py-2.5 cursor-pointer">
                  <span className="min-w-0">
                    <span className="text-xs font-bold text-emerald-950 block">المراجعة الصغرى التلقائية</span>
                    <span className="text-[10px] text-emerald-800/80 block mt-0.5">
                      يحدد المحرك نطاق المراجعة اليومية تلقائياً من المحفوظ السابق + الجديد
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={setupAutoMinorRevision}
                    onChange={(e) => setSetupAutoMinorRevision(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700 shrink-0"
                  />
                </label>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={isSettingUp}
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4 text-amber-300" />
                    <span>{isSettingUp ? 'جارٍ توليد المعاينة...' : 'توليد ومعاينة الخطة القرآنية 👁️'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ============================================================
               VIEW 2: UNIFIED COMPREHENSIVE PLAN (Official, Print, PDF)
               ============================================================ */
            <div ref={printRef} className="p-3 sm:p-4 space-y-3">
              {/* Official Document Letterhead */}
              {effectivePlan && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    {activeTenant?.logoUrl ? (
                      <img
                        src={activeTenant.logoUrl}
                        alt={activeTenant.name}
                        className="w-12 h-12 rounded-xl object-contain border border-slate-100 bg-white shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-800 text-amber-300 font-black text-xl flex items-center justify-center shrink-0">
                        ق
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {activeTenant?.name || 'المجمع القرآني'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        وثيقة الخطة القرآنية الشاملة — {effectivePlan.termName || 'الفصل الدراسي الحالي'}
                      </div>
                    </div>
                    <div className="text-left text-[10px] text-slate-500 font-bold shrink-0">
                      <div>الإصدار: v{effectivePlan.planVersion || 1}</div>
                      <div>
                        {calendar !== 'none'
                          ? `تاريخ الإصدار: ${fmtDate(todayIso)}`
                          : 'نمط الحصص المنهجية'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">الطالب</span>
                      <span className="font-black text-slate-800">{student.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المرحلة / الصف</span>
                      <span className="font-black text-slate-800">{student.grade}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الحلقة</span>
                      <span className="font-black text-slate-800">{studentHalaqah?.name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المعلم</span>
                      <span className="font-black text-slate-800">{teacherName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">فترة الخطة</span>
                      <span className="font-black text-slate-800">
                        {calendar !== 'none'
                          ? `${fmtDate(effectivePlan.startDate)} ← ${fmtDate(effectivePlan.endDate)}`
                          : `مقرر فصلي (${dailyPlans.length} يوماً منهجياً)`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">مصدر المستهدف</span>
                      <span className="font-black text-slate-800">
                        {effectivePlan.targetSource === 'explicit'
                          ? 'اختيار المعلم'
                          : effectivePlan.targetSource === 'personal'
                          ? 'المستهدف الشخصي'
                          : effectivePlan.targetSource === 'academic_year'
                          ? 'المستهدف الأكاديمي'
                          : effectivePlan.targetSource === 'student_minimum'
                          ? 'الحد الأدنى للطالب'
                          : 'افتراضي النموذج'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المسارات المفعلة</span>
                      <span className="font-black text-slate-800">
                        {spellingTrackOn ? 'القرآن + الهجاء' : 'القرآن فقط'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">اتجاه الحفظ / المراجعة</span>
                      <span className="font-black text-slate-800">
                        {effectivePlan.direction === 'backward' ? 'تنازلي' : 'تصاعدي'} /{' '}
                        {(effectivePlan.revisionDirection || effectivePlan.revisionSettings?.direction) === 'forward'
                          ? 'مع الحفظ'
                          : 'عكسي'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!effectivePlan ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600 text-sm">لا توجد خطة قرآنية نشطة لهذا الطالب بعد.</p>
                  {canEdit && (
                    <button
                      onClick={() => setIsConfiguring(true)}
                      className="mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>تأسيس خطة قرآنية جديدة</span>
                    </button>
                  )}
                </div>
              ) : dailyPlans.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                  <BookOpen className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="font-bold text-amber-900 text-sm">الخطة تحتاج إلى إعادة بناء</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    توجد خطة مسجلة لهذا الطالب لكن بياناتها اليومية غير مكتملة في قاعدة البيانات.
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => setIsConfiguring(true)}
                      className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Settings className="w-4 h-4" />
                      <span>إعادة ضبط الخطة الآن</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Flag className="w-3 h-3" /> بداية الخطة
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {calendar !== 'none' ? fmtDate(effectivePlan.startDate) : 'اليوم المنهجي 1'}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> أيام منجزة
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {completedCount} / {dailyPlans.length} يوم
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                      <div className="text-[10px] text-slate-400 font-bold">الموضع الحالي</div>
                      <div className="text-xs font-black text-emerald-800 mt-0.5 truncate">
                        سورة {surahName(effectivePlan.currentPosition?.surahNumber)} — آية{' '}
                        {effectivePlan.currentPosition?.ayahNumber ?? '—'}
                      </div>
                    </div>
                    <div className="bg-emerald-700 rounded-xl p-2.5 text-white">
                      <div className="text-[10px] font-bold text-emerald-100 flex items-center gap-1">
                        <Target className="w-3 h-3" /> المستهدف لنهاية الخطة
                      </div>
                      <div className="text-xs font-black mt-0.5 truncate">
                        سورة {surahName(effectivePlan.targetEnd?.surahNumber)} — آية{' '}
                        {effectivePlan.targetEnd?.ayahNumber ?? '—'}
                      </div>
                    </div>
                  </div>

                  {/* Prior Achievements from Session Records */}
                  {(priorMemRecords.length > 0 ||
                    (student.currentSurah &&
                      effectivePlan.targetStart &&
                      (effectivePlan.targetStart.surahNumber !== 1 || effectivePlan.targetStart.ayahNumber !== 1))) && (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
                      <div className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        الإنجاز السابق (قبل بدء هذه الخطة)
                      </div>
                      {priorMemRecords.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-[11px] text-indigo-800 font-bold">
                            جلسات تسميع سابقة: {priorMemRecords.length}
                          </div>
                          <div className="text-[11px] text-indigo-700">
                            آخر موضع مثبت: سورة {priorMemRecords[priorMemRecords.length - 1].memorization?.surahTo} — آية{' '}
                            {priorMemRecords[priorMemRecords.length - 1].memorization?.ayahTo}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-indigo-800">
                          الموضع المسجل في ملف الطالب: سورة {student.currentSurah} — آية {student.currentAyah ?? 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CURRENT DAY Panel */}
                  {currentDayItem && (
                    <div className="bg-blue-50/80 border border-blue-300 rounded-xl p-3 shadow-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <span className="text-[11px] font-black text-blue-900 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {calendar === 'none'
                            ? `الحصة المنهجية الحالية (${currentDayItem.dayName})`
                            : `اليوم الحالي — ${currentDayItem.dayName} ${fmtDate(currentDayItem.date)}`}
                        </span>
                        <span
                          className={`text-[10px] font-black border rounded-lg px-2 py-0.5 ${
                            dayStatusMeta(currentDayItem).cls
                          }`}
                        >
                          {dayStatusMeta(currentDayItem).label}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-white rounded-lg border border-blue-100 p-2">
                          <span className="text-[9px] text-slate-400 font-bold block">المقرر (حفظ/تثبيت)</span>
                          <span className="font-black text-slate-900 font-['Amiri',serif]">
                            {currentDayItem.targetUnit?.displayLabel}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-2">
                          <span className="text-[9px] text-slate-400 font-bold block">المراجعة المقررة</span>
                          <span className="font-black text-slate-900">
                            {currentDayItem.revisionDisplayLabel || '—'}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg border border-blue-100 p-2">
                          <span className="text-[9px] text-slate-400 font-bold block">الإنجاز الفعلي بالجلسة</span>
                          <span className="font-black text-emerald-800 font-['Amiri',serif]">
                            {currentDayItem.actualAchieved?.unit?.displayLabel ||
                              'لم يُسجَّل بعد — بانتظار التسميع'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WEEKLY TIMELINE TABLE */}
                  {weeks.map(([weekNum, days]) => {
                    const open = isWeekOpen(weekNum);
                    const weekDone = days.filter(
                      (d) => d.status === 'completed' || d.status === 'overachieved'
                    ).length;

                    return (
                      <div
                        key={weekNum}
                        id={`quran-plan-week-${weekNum}`}
                        className={`bg-white rounded-xl border overflow-hidden scroll-mt-24 ${
                          weekNum === currentWeek ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
                        }`}
                      >
                        <button
                          onClick={() => toggleWeek(weekNum)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-black text-slate-800">الأسبوع {weekNum}</span>
                            {calendar !== 'none' && days[0] && days[days.length - 1] && (
                              <span className="text-[10px] text-slate-400 font-bold truncate">
                                {fmtDate(days[0].date)} ← {fmtDate(days[days.length - 1].date)}
                              </span>
                            )}
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                              {weekDone}/{days.length} يوم منجز
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {open && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                              <thead className="bg-slate-50 text-slate-600 font-black border-y border-slate-200">
                                <tr>
                                  {calendar !== 'none' && (
                                    <th className="px-3 py-2 text-right whitespace-nowrap">التاريخ</th>
                                  )}
                                  <th className="px-3 py-2 text-right whitespace-nowrap">
                                    {calendar === 'none' ? 'اليوم المنهجي' : 'اليوم'}
                                  </th>
                                  <th className="px-3 py-2 text-right">الحفظ والتثبيت (المقرر / الفعلي)</th>
                                  <th className="px-3 py-2 text-right">المراجعة</th>
                                  {spellingTrackOn && (
                                    <th className="px-3 py-2 text-right">التهجئة</th>
                                  )}
                                  <th className="px-3 py-2 text-right whitespace-nowrap">الحالة</th>
                                  <th className="px-3 py-2 text-right">ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {days.map((d, idx) => {
                                  const meta = dayStatusMeta(d);
                                  const isToday = d.date === todayIso;
                                  const isHoliday = d.dayType === 'holiday' || holidays.has(d.date);
                                  const rec = recordsByDate.get(d.date);
                                  const achieved = d.actualAchieved;

                                  if (isHoliday && calendar !== 'none') {
                                    return (
                                      <tr key={d.id || idx} className="bg-purple-50/70 border-y border-purple-100/90">
                                        <td
                                          colSpan={spellingTrackOn ? 7 : 6}
                                          className="px-3 py-2 text-center text-purple-950 font-bold text-xs"
                                        >
                                          <div className="flex items-center justify-center gap-2">
                                            <span className="text-sm">🏖️</span>
                                            <span className="font-extrabold text-purple-950">
                                              إجازة رسمية معتمدة ({fmtDate(d.date)})
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr
                                      key={d.id || idx}
                                      className={`transition-colors ${
                                        isToday
                                          ? 'bg-blue-50/70 font-semibold'
                                          : d.status === 'completed' || d.status === 'overachieved'
                                          ? 'bg-emerald-50/30'
                                          : idx % 2 === 0
                                          ? 'bg-slate-50/50'
                                          : 'hover:bg-slate-50/40'
                                      }`}
                                    >
                                      {/* Date column (hidden when calendar === 'none') */}
                                      {calendar !== 'none' && (
                                        <td className="px-3 py-1.5 whitespace-nowrap font-bold text-slate-700 text-[10px]">
                                          {fmtDate(d.date)}
                                        </td>
                                      )}

                                      {/* Day Column */}
                                      <td className="px-3 py-1.5 whitespace-nowrap font-bold text-slate-800 text-[10px]">
                                        {calendar === 'none'
                                          ? `اليوم ${d.itemIndex || (idx + 1)}`
                                          : d.dayName}
                                      </td>

                                      {/* Memorization / Consolidation */}
                                      <td className="px-3 py-1.5 font-bold text-slate-900 font-['Amiri',serif]">
                                        {d.isConsolidationDay ? (
                                          <div>
                                            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                              تثبيت: {surahName(d.consolidationSurahNumber)} (اليوم{' '}
                                              {d.consolidationDayIndex}/
                                              {effectivePlan.consolidationDaysPerSurah || 3})
                                            </span>
                                            {achieved && (
                                              <div className="text-[9px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1 font-sans">
                                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                                <span className="font-['Amiri',serif]">
                                                  {achieved.unit?.displayLabel}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div>
                                            <span>{d.targetUnit?.displayLabel}</span>
                                            {achieved && (
                                              <div className="text-[9px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1 font-sans">
                                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                                <span className="font-['Amiri',serif]">
                                                  {achieved.unit?.displayLabel}
                                                </span>
                                                <span>
                                                  {achieved.evaluation ? `(${EVAL_LABELS[achieved.evaluation] || achieved.evaluation})` : ''}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      {/* Revision */}
                                      <td className="px-2 py-2">
                                        {d.revisionDisplayLabel || d.revisionPageStart ? (
                                          <div className="font-bold text-slate-700 leading-relaxed">
                                            {d.revisionDisplayLabel ||
                                              `ص ${d.revisionPageStart}–${d.revisionPageEnd}`}
                                            {rec?.revision && (
                                              <span className="block text-[9px] text-amber-700">
                                                تقييم {rec.revision.score}%
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>

                                      {/* Spelling track */}
                                      {spellingTrackOn && (
                                        <td className="px-2 py-2">
                                          {rec?.spelling ? (
                                            <div className="font-bold text-slate-700">
                                              الدرس {rec.spelling.lessonNumber} — {rec.spelling.finalScore}%
                                              <span className="block text-[9px] text-emerald-700">
                                                {rec.spelling.statusTag}
                                              </span>
                                            </div>
                                          ) : d.spellingAssignment ? (
                                            <div className="font-bold text-slate-600">
                                              الدرس {d.spellingAssignment.lessonNumber}:{' '}
                                              {d.spellingAssignment.title}
                                              <span className="block text-[8px] text-slate-400">مقرر</span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )}
                                        </td>
                                      )}

                                      {/* Status */}
                                      <td className="px-2 py-2 whitespace-nowrap">
                                        <span
                                          className={`inline-block text-[9px] font-black border rounded-lg px-1.5 py-0.5 ${meta.cls}`}
                                        >
                                          {meta.label}
                                        </span>
                                      </td>

                                      {/* Notes */}
                                      <td className="px-2 py-2 text-slate-500">
                                        {achieved?.notes || rec?.teacherRemarks ? (
                                          <span>{achieved?.notes || rec?.teacherRemarks}</span>
                                        ) : (
                                          <span className="text-slate-300">—</span>
                                        )}
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

                  <p className="text-center text-[10px] text-slate-400 font-bold pb-1">
                    الخطة تفاعلية ديناميكية — الأيام القادمة تعكس آخر إعادة جدولة وترحيل بعد كل تسجيل إنجاز.
                  </p>

                  {/* Official Signature Footer */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold text-slate-700">
                      <div>
                        <div className="mb-6">معلم الحلقة</div>
                        <div className="border-t border-slate-300 pt-1.5">{teacherName}</div>
                      </div>
                      <div>
                        <div className="mb-6">مشرف القرآن</div>
                        <div className="border-t border-slate-300 pt-1.5">
                          {activeTenant?.supervisorName || 'المشرف التربوي'}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2">إدارة {activeTenant?.name || 'المجمع'}</div>
                        {activeTenant?.reportsConfig?.signatureImageUrl ? (
                          <img
                            src={activeTenant.reportsConfig.signatureImageUrl}
                            alt="التوقيع والختم"
                            className="mx-auto h-10 object-contain"
                          />
                        ) : (
                          <div className="h-6" />
                        )}
                        <div className="border-t border-slate-300 pt-1.5">التوقيع والختم الرسمي</div>
                      </div>
                    </div>
                    {activeTenant?.reportsConfig?.footerText && (
                      <p className="text-center text-[9px] text-slate-400 font-bold mt-3 pt-2 border-t border-slate-100">
                        {activeTenant.reportsConfig.footerText}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stage Configs Management Modal */}
      {showStageConfigsModal && (
        <StageConfigModal
          isOpen={showStageConfigsModal}
          onClose={() => setShowStageConfigsModal(false)}
        />
      )}

      {/* Archive Plan Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-700">
              <Archive className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-black">أرشفة الخطة القرآنية الحالية</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ستتم أرشفة الخطة النشطة للطالب (حفظها كسجل تاريخي دون حذفها). يرجى اختيار نمط التعامل مع سجلات التسميع:
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="archiveMode"
                  checked={archiveMode === 'plan_only'}
                  onChange={() => setArchiveMode('plan_only')}
                  className="mt-0.5 text-emerald-700"
                />
                <div>
                  <span className="text-xs font-black text-slate-800 block">أرشفة الخطة فقط (موصى به)</span>
                  <span className="text-[10px] text-slate-500 block">
                    تبقى سجلات التسميع السابقة ويستمر موضع الطالب الحالي كأساس لأي خطة جديدة.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="archiveMode"
                  checked={archiveMode === 'plan_and_achievements'}
                  onChange={() => setArchiveMode('plan_and_achievements')}
                  className="mt-0.5 text-rose-700"
                />
                <div>
                  <span className="text-xs font-black text-rose-900 block">أرشفة الخطة مع ربط سجلاتها</span>
                  <span className="text-[10px] text-slate-500 block">
                    تُحفظ السجلات في الأرشيف وتُعزل عن الخطة الجديدة لبدء سجلات جديدة تماماً.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowArchiveDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleArchivePlan}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isArchiving ? 'جارٍ الأرشفة...' : 'تأكيد الأرشفة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveQuranPlanModal;
