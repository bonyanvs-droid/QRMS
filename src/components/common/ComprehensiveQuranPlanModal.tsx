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
  Lock,
  ShieldCheck,
  Clock,
  Info,
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

  // Active persisted plan
  const activePlan: StudentQuranPlan | undefined = useMemo(
    () => getActiveStudentQuranPlan(student.id),
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

  // Preview plan waiting for approval
  const [previewPlan, setPreviewPlan] = useState<StudentQuranPlan | null>(null);

  // Configuration Mode: Only enabled if user has management authority and either requests it or has no plan
  const [isConfiguring, setIsConfiguring] = useState<boolean>(() => {
    if (!canManagePlan) return false;
    if (initialMode === 'setup') return true;
    if (!activePlan) return true;
    return false;
  });

  const [justApproved, setJustApproved] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);
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

  // Overall Quran Plan Type: 'combined' (حفظ ومراجعة) | 'memorization' (حفظ فقط) | 'revision' (مراجعة فقط)
  const [setupPlanType, setSetupPlanType] = useState<'combined' | 'memorization' | 'revision'>(() => {
    if (activePlan?.planType === 'revision') return 'revision';
    if (activePlan?.planType === 'memorization' || activePlan?.revisionMode === 'none') return 'memorization';
    return 'combined';
  });

  // Target Boundaries
  const [setupStartSurah, setSetupStartSurah] = useState<string>('الناس');
  const [setupStartAyah, setSetupStartAyah] = useState<number>(1);
  const [setupEndSurah, setSetupEndSurah] = useState<string>(
    student.minimumTargetSurah || 'الفاتحة'
  );
  const [setupEndAyah, setSetupEndAyah] = useState<number>(() =>
    getSurahAyahsCount(student.minimumTargetSurah || 'الفاتحة') || 7
  );

  // Memorization parameters
  const [setupDailyAmount, setSetupDailyAmount] = useState<number>(1);
  const [setupUnitType, setSetupUnitType] = useState<PlanningUnitType>('page');
  const [setupDirection, setSetupDirection] = useState<PlanDirection>('backward');

  // Revision parameters (dedicated independent section)
  const [setupRevisionMode, setSetupRevisionMode] = useState<'pages' | 'surahs' | 'none'>('pages');
  const [setupRevisionDailyPages, setSetupRevisionDailyPages] = useState<number>(1);
  const [setupRevisionUnitsPerWindow, setSetupRevisionUnitsPerWindow] = useState<number>(2);
  const [setupRevisionDirection, setSetupRevisionDirection] = useState<PlanDirection>('backward');
  const [setupAutoMinorRevision, setSetupAutoMinorRevision] = useState<boolean>(true);
  const [setupRevStartSurah, setSetupRevStartSurah] = useState<string>('الفاتحة');
  const [setupRevStartAyah, setSetupRevStartAyah] = useState<number>(1);
  const [setupRevEndSurah, setSetupRevEndSurah] = useState<string>('الناس');
  const [setupRevEndAyah, setSetupRevEndAyah] = useState<number>(6);

  // Mutual Exclusivity of Offsets
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

  // Consolidation & Schedule
  const [setupConsolidationDays, setSetupConsolidationDays] = useState<number>(3);
  const [setupWorkingDays, setSetupWorkingDays] = useState<number[]>([0, 1, 2, 3]);

  const todayIso = getTodayLocalIso();

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
          const mode = (matchedConfig.revision.mode as 'pages' | 'surahs' | 'none') || 'pages';
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
      const mode = (cfg.revision.mode as 'pages' | 'surahs' | 'none') || 'pages';
      setSetupRevisionMode(mode);
      setSetupRevisionDailyPages(cfg.revision.defaultDailyPages ?? 1);
      if (cfg.revision.surahsPerDay) {
        setSetupRevisionUnitsPerWindow(cfg.revision.surahsPerDay);
      }
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
    if (!canManagePlan) {
      setFeedbackMessage({
        type: 'error',
        text: 'تأسيس واعتماد الخطط القرآنية مخصص للمشرف التربوي المسؤول عن الحلقة فقط.',
      });
      return;
    }

    setIsSettingUp(true);
    setFeedbackMessage(null);

    const startSurahMeta = findSurahMetadata(setupStartSurah);
    const endSurahMeta = findSurahMetadata(setupEndSurah);
    const revStartMeta = findSurahMetadata(setupRevStartSurah);
    const revEndMeta = findSurahMetadata(setupRevEndSurah);

    if (!startSurahMeta || !endSurahMeta) {
      setFeedbackMessage({ type: 'error', text: 'يرجى اختيار سور بداية ونهاية صالحة.' });
      setIsSettingUp(false);
      return;
    }

    try {
      const manualRevisionRange: { start: { surahNumber: number; ayahNumber: number }; end: { surahNumber: number; ayahNumber: number } } | undefined =
        setupRevisionMode !== 'none' && !setupAutoMinorRevision && revStartMeta && revEndMeta
          ? {
              start: { surahNumber: revStartMeta.number, ayahNumber: setupRevStartAyah },
              end: { surahNumber: revEndMeta.number, ayahNumber: setupRevEndAyah },
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
        planType: setupPlanType,
        customDailyAmount: setupDailyAmount,
        customRevisionDailyPages: setupPlanType === 'memorization' || setupRevisionMode === 'none' ? 0 : setupRevisionDailyPages,
        customRevisionUnitsPerWindow: setupPlanType === 'memorization' || setupRevisionMode === 'none' ? undefined : (setupRevisionMode === 'surahs' ? setupRevisionUnitsPerWindow : undefined),
        revisionMode: setupPlanType === 'memorization' ? 'none' : setupRevisionMode,
        savingOffset: setupPlanType === 'revision' ? 0 : setupSavingOffset,
        revisionOffset: setupPlanType === 'memorization' ? 0 : setupRevisionOffset,
        customConsolidationDays: setupPlanType === 'revision' ? 0 : setupConsolidationDays,
        customWorkingDays: setupWorkingDays,
        autoMinorRevisionMode: setupPlanType !== 'memorization' && setupRevisionMode !== 'none' && setupAutoMinorRevision,
        manualRevisionRange,
        sessionRecords: (sessionRecords || []).filter((r) => r.studentId === student.id),
        halaqah: studentHalaqah,
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
    if (!canManagePlan) {
      setFeedbackMessage({
        type: 'error',
        text: 'اعتماد الخطط القرآنية مخصص للمشرف التربوي فقط لمنع التلاعب.',
      });
      return;
    }

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
    if (!activePlan || !canManagePlan) return;
    setIsArchiving(true);
    try {
      await archiveStudentQuranPlan({
        planId: activePlan.id,
        archiveMode,
      });
      setShowArchiveDialog(false);
      setIsConfiguring(canManagePlan);
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
      dailyPlans.find((d) => d.date > todayIso && !d.isHistorical) ||
      dailyPlans[dailyPlans.length - 1]
    );
  }, [dailyPlans, todayIso]);

  const currentDayRecord = currentDayItem ? recordsByDate.get(currentDayItem.date) : undefined;

  const handlePrint = async () => {
    if (!printRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      await executePrintOrPdfFallback(printRef.current, {
        fileName: `خطة_القرآن_${student.fullName.replace(/\s+/g, '_')}`,
        title: `الخطة القرآنية الشاملة — ${student.fullName}`,
      });
    } catch (err) {
      console.error('Failed to export PDF/print:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate flex items-center gap-2">
                <span>الخطة القرآنية الشاملة — {student.fullName}</span>
                {effectivePlan?.termName && (
                  <span className="text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-md px-2 py-0.5 hidden sm:inline">
                    {effectivePlan.termName}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-emerald-100/90 truncate">
                {isConfiguring
                  ? 'تهيئة وإعداد معايير ومحددات الخطة القرآنية الفردية'
                  : previewPlan
                  ? 'معاينة تفاعلية كاملة قبل الاعتماد'
                  : 'العرض التشغيلي المعتمد — موحد للعرض والطباعة والـ PDF'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Calendar Selector (3 Modes: Hijri / Gregorian / Hide Date) */}
            {!isConfiguring && effectivePlan && (
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
            {!isConfiguring && effectivePlan && (
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

            {/* Reconfigure / Setup Toggle for Supervisors/Admins only */}
            {canManagePlan && !isConfiguring && (
              <button
                onClick={() => setIsConfiguring(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="تعديل محددات الخطة أو إعادة بنائها"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إعادة ضبط</span>
              </button>
            )}

            {/* Archive Plan for Supervisors/Admins only */}
            {canManagePlan && !isConfiguring && activePlan && !previewPlan && (
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
                  راجع الواجبات والمحددات أدناه ثم اضغط اعتماد الخطة. ستبقى الشاشة ثابتة وتتحول إلى الخطة المعتمدة النشطة فوراً.
                </span>
              </div>
            </div>
            {canManagePlan && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfiguring(true)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  تعديل المحددات ✎
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
            )}
          </div>
        )}

        {/* Just Approved Success Toast */}
        {justApproved && !isConfiguring && (
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
              VIEW 1: SETUP & CONFIGURATION FORM (Supervisors / Admins only)
              ============================================================ */}
          {isConfiguring && canManagePlan ? (
            <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-amber-900">
                    {activePlan ? 'إعادة ضبط وبناء الخطة القرآنية' : 'تأسيس الخطة القرآنية الفردية'}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    حدد معايير ومحددات الحفظ والمراجعة للطالب. عند الضغط على «توليد ومعاينة الخطة»، ستظهر لك الخطة كاملة
                    في نفس التصميم المعتمد للطباعة مع إمكانية مراجعتها واعتمادها دون تشتت.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGeneratePreview} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>محددات الخطة ومسارات التسميع</span>
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

                {/* 0. اختيار نوع الخطة القرآنية المطلوب اعتمادها */}
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                  <label className="text-xs font-black text-emerald-950 block mb-2">
                    نوع ومسار الخطة القرآنية المطلوب تأسيسها:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSetupPlanType('combined');
                        if (setupRevisionMode === 'none') setSetupRevisionMode('pages');
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                        setupPlanType === 'combined'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      حفظ ومراجعة (شامل)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSetupPlanType('memorization');
                        setSetupRevisionMode('none');
                        setSetupRevisionOffset(0);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                        setupPlanType === 'memorization'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      حفظ فقط (الاستغناء عن المراجعة)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSetupPlanType('revision');
                        if (setupRevisionMode === 'none') setSetupRevisionMode('pages');
                        setSetupSavingOffset(0);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                        setupPlanType === 'revision'
                          ? 'bg-indigo-700 text-white border-indigo-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                      }`}
                    >
                      مراجعة فقط (بدون حفظ جديد)
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-800 mt-2 font-medium">
                    {setupPlanType === 'combined' && 'المسار المتكامل: إنجاز يومي متزامن للحفظ الجديد مع مراجعة تراكمية متدحرجة أو بالسور.'}
                    {setupPlanType === 'memorization' && 'الاستغناء عن المراجعة: يركز الطالب على مقرر الحفظ الجديد فقط، ويكون ويزارد المعلم مخصصاً للحفظ دون إجبار على المراجعة.'}
                    {setupPlanType === 'revision' && 'مسار المراجعة والتثبيت: يركز الطالب على مراجعة المحفوظ السابق دون تكليفه بحفظ جديد في ويزارد المعلم.'}
                  </p>
                </div>

                {/* Optional Stage Template Selector */}
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
                        تطبيق خطة من قالب معتمد (اختياري كدليل استرشادي)
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

                {/* ============================================================
                    قسم مسار ونمط المراجعة (منفصل ومستقل بصرياً عن الحفظ)
                    ============================================================ */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border-2 border-indigo-200/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-indigo-700" />
                      <span className="text-xs font-black text-indigo-950">
                        مسار ونمط المراجعة (منفصل ومستقل عن الحفظ)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                      مسار مستقل
                    </span>
                  </div>

                  {/* 1. اختيار نمط المراجعة */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      نمط المراجعة المطلوب:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSetupRevisionMode('pages');
                          if (setupPlanType === 'memorization') setSetupPlanType('combined');
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                          setupRevisionMode === 'pages'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        مراجعة صفحات (متدحرجة)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSetupRevisionMode('surahs');
                          if (setupPlanType === 'memorization') setSetupPlanType('combined');
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                          setupRevisionMode === 'surahs'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        مراجعة بالسور
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSetupRevisionMode('none');
                          setSetupRevisionOffset(0);
                          if (setupPlanType !== 'revision') setSetupPlanType('memorization');
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                          setupRevisionMode === 'none'
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        بدون مراجعة (الاستغناء)
                      </button>
                    </div>
                  </div>

                  {setupRevisionMode !== 'none' && (
                    <>
                      {/* 2. اتجاه ومقدار المراجعة */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            اتجاه المراجعة (مستقل)
                          </label>
                          <select
                            value={setupRevisionDirection}
                            onChange={(e) => setSetupRevisionDirection(e.target.value as PlanDirection)}
                            className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                          >
                            <option value="backward">عكسي (الأحدث حفظاً ← الأقدم)</option>
                            <option value="forward">طردي (من أول المحفوظ باتجاه الأحدث)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            {setupRevisionMode === 'surahs' ? 'المقدار اليومي (سور)' : 'المقدار اليومي (صفحات)'}
                          </label>
                          {setupRevisionMode === 'surahs' ? (
                            <select
                              value={setupRevisionUnitsPerWindow}
                              onChange={(e) => setSetupRevisionUnitsPerWindow(parseInt(e.target.value, 10) || 1)}
                              className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                            >
                              <option value="1">سورة واحدة (1)</option>
                              <option value="2">سورتان (2)</option>
                              <option value="3">3 سور</option>
                              <option value="4">4 سور</option>
                              <option value="5">5 سور</option>
                            </select>
                          ) : (
                            <select
                              value={setupRevisionDailyPages}
                              onChange={(e) => setSetupRevisionDailyPages(parseFloat(e.target.value) || 1)}
                              className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                            >
                              <option value="0.5">نصف صفحة (0.5)</option>
                              <option value="1">صفحة واحدة (1)</option>
                              <option value="2">صفحتان (2)</option>
                              <option value="3">3 صفحات</option>
                              <option value="4">4 صفحات</option>
                              <option value="5">5 صفحات</option>
                              <option value="10">نصف جزء (10 صفحات)</option>
                              <option value="20">جزء كامل (20 صفحة)</option>
                            </select>
                          )}
                        </div>
                      </div>

                      {/* 3. نطاق المراجعة: تلقائي أو يدوي مخصص */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-200/80 space-y-2">
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="min-w-0">
                            <span className="text-xs font-bold text-indigo-950 block">المراجعة التراكمية التلقائية</span>
                            <span className="text-[10px] text-slate-500 block">
                              تبدأ تلقائياً عند اكتمال السورة وتثبيتها من المحفوظ المعتمد
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={setupAutoMinorRevision}
                            onChange={(e) => setSetupAutoMinorRevision(e.target.checked)}
                            className="w-4 h-4 accent-indigo-700"
                          />
                        </label>

                        {!setupAutoMinorRevision && (
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-slate-600 block">
                              تحديد نطاق مراجعة يدوي ثابت:
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {/* Rev Start */}
                              <div>
                                <label className="text-[10px] text-slate-500 block">من سورة</label>
                                <select
                                  value={setupRevStartSurah}
                                  onChange={(e) => setSetupRevStartSurah(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                                >
                                  {SURAHS_LIST.map((s) => (
                                    <option key={s.number} value={s.name}>
                                      {s.number}. {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Rev End */}
                              <div>
                                <label className="text-[10px] text-slate-500 block">إلى سورة</label>
                                <select
                                  value={setupRevEndSurah}
                                  onChange={(e) => setSetupRevEndSurah(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                                >
                                  {SURAHS_LIST.map((s) => (
                                    <option key={s.number} value={s.name}>
                                      {s.number}. {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* ============================================================
                    قسم الإزاحة التبادلية (Saving / Revision Offsets)
                    قاعدة حاسمة: تفعيل إحداهما يلغي الأخرى
                    ============================================================ */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-black text-amber-950">
                        منطق الإزاحة التبادلية (تأجيل البداية)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      إزاحة متبادلة حصرية
                    </span>
                  </div>

                  <p className="text-[10px] text-amber-800 leading-relaxed">
                    يسمح النظام بتأجيل انطلاق مسار الحفظ أو المراجعة لعدد محدد من الحصص للتهيئة. 
                    <strong> قاعدة حاسمة:</strong> لا يمكن الجمع بين إزاحة الحفظ والمراجعة معاً، تفعيل أي منهما يُلغي ويُقفل الآخر تلقائياً.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* إزاحة الحفظ */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      setupRevisionOffset > 0
                        ? 'bg-slate-100 border-slate-200 opacity-60'
                        : setupSavingOffset > 0
                        ? 'bg-white border-amber-400 ring-2 ring-amber-200'
                        : 'bg-white border-slate-200'
                    }`}>
                      <label className="text-[11px] font-bold text-slate-800 block mb-1">
                        إزاحة بداية الحفظ (savingOffset)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={setupSavingOffset}
                        disabled={setupRevisionOffset > 0}
                        onChange={(e) => handleSavingOffsetChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-[9px] text-slate-500 block mt-1">
                        {setupRevisionOffset > 0
                          ? '⚠️ مقفل لوجود إزاحة مراجعة'
                          : setupSavingOffset > 0
                          ? `تأجيل الحفظ الجديد أول ${setupSavingOffset} حصص والتركيز على المراجعة والتهيئة`
                          : 'عدد الحصص المؤجلة قبل بدء الحفظ الجديد'}
                      </span>
                    </div>

                    {/* إزاحة المراجعة */}
                    <div className={`p-3 rounded-xl border transition-all ${
                      setupSavingOffset > 0 || setupRevisionMode === 'none'
                        ? 'bg-slate-100 border-slate-200 opacity-60'
                        : setupRevisionOffset > 0
                        ? 'bg-white border-amber-400 ring-2 ring-amber-200'
                        : 'bg-white border-slate-200'
                    }`}>
                      <label className="text-[11px] font-bold text-slate-800 block mb-1">
                        إزاحة بداية المراجعة (revisionOffset)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={setupRevisionOffset}
                        disabled={setupSavingOffset > 0 || setupRevisionMode === 'none'}
                        onChange={(e) => handleRevisionOffsetChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-[9px] text-slate-500 block mt-1">
                        {setupSavingOffset > 0
                          ? '⚠️ مقفل لوجود إزاحة حفظ'
                          : setupRevisionMode === 'none'
                          ? '⚠️ مسار المراجعة متوقف'
                          : setupRevisionOffset > 0
                          ? `تأجيل المراجعة أول ${setupRevisionOffset} حصص حتى يتم حفظ قدر كافٍ`
                          : 'عدد الحصص المؤجلة قبل بدء المراجعة'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Settings: Consolidation & Working Days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
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
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">أيام التسميع الأسبوعية</label>
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
          ) : !effectivePlan && !canManagePlan ? (
            /* ============================================================
               VIEW 2: TEACHER / UNAUTHORIZED — WAITING FOR SUPERVISOR PLAN
               ============================================================ */
            <div className="p-6 max-w-xl mx-auto my-10 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5 text-center">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-amber-700 shadow-2xs">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  لم يتم اعتماد خطة قرآنية لهذا الطالب بعد
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  وفقاً لضوابط الجودة المعتمدة لمنع التلاعب، يتولى <strong className="text-emerald-800">المشرف التربوي</strong> المسؤول عن الحلقة تأسيس الخطة القرآنية واعتماد محددات الحفظ والمراجعة. يطّلع المعلم على الخطة فور اعتمادها دون صلاحية تعديلها.
                </p>
              </div>

              {/* بطاقة محددات الطالب الأولية */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right space-y-2.5 text-xs">
                <div className="font-black text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span>المحددات الأولية المسجلة للطالب:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">الطالب:</span>
                    <span className="font-bold text-slate-800">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">الحلقة:</span>
                    <span className="font-bold text-slate-800">{studentHalaqah?.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">الموضع الحالي المسجل:</span>
                    <span className="font-bold text-slate-800">
                      سورة {student.currentSurah || 'الناس'} (آية {student.currentAyah || 1})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">المستهدف المسجل:</span>
                    <span className="font-bold text-slate-800">
                      سورة {student.minimumTargetSurah || student.personalTargetSurah || 'الفاتحة'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================
               VIEW 3: UNIFIED COMPREHENSIVE PLAN (Official, Print, PDF)
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
                          ? 'تحديد مباشر'
                          : effectivePlan.targetSource === 'academic_year'
                          ? 'مستهدف السنة الأكاديمية'
                          : effectivePlan.targetSource === 'template'
                          ? 'قالب المرحلة'
                          : 'خطة فردية'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">نوع ومسار الخطة</span>
                      <span className="font-black text-emerald-800">
                        {effectivePlan.planType === 'revision'
                          ? 'مراجعة فقط (بدون حفظ جديد)'
                          : effectivePlan.planType === 'memorization' || effectivePlan.revisionMode === 'none'
                          ? 'حفظ فقط (الاستغناء عن المراجعة)'
                          : 'حفظ ومراجعة متكاملة'}
                        {spellingTrackOn ? ' + هجاء' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">نسبة الإنجاز</span>
                      <span className="font-black text-emerald-800">
                        {dailyPlans.length
                          ? `${Math.round((completedCount / dailyPlans.length) * 100)}% (${completedCount}/${dailyPlans.length})`
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  محددات الخطة القرآنية المعتمدة (لوحة التفاصيل المعيارية)
                  المعلم يرى كافة المحددات مع شارة القراءة فقط لمنع التلاعب
                  ============================================================ */}
              {effectivePlan && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-black text-slate-900">محددات الخطة القرآنية المعتمدة</span>
                    </div>
                    {!canManagePlan ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                        <Lock className="w-3 h-3 text-amber-700" />
                        وضع الاطلاع فقط للمعلم — معتمدة من المشرف التربوي لمنع التلاعب
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        معتمدة رسمياً — إدارة المشرف التربوي
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    {/* نقطة البداية */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">بداية الحفظ (نقطة الانطلاق)</span>
                      <span className="font-black text-slate-800">
                        سورة {surahName(effectivePlan.targetStart?.surahNumber)} (آية {effectivePlan.targetStart?.ayahNumber || 1})
                      </span>
                    </div>

                    {/* المستهدف النهائي */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">مستهدف الحفظ (نهاية الخطة)</span>
                      <span className="font-black text-slate-800">
                        سورة {surahName(effectivePlan.targetEnd?.surahNumber)} (آية {effectivePlan.targetEnd?.ayahNumber || 1})
                      </span>
                    </div>

                    {/* مقدار الحفظ واتجاهه */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">مقدار الحفظ واتجاهه</span>
                      <span className="font-black text-slate-800">
                        {effectivePlan.dailyAmount || 1} {effectivePlan.unitType === 'page' ? 'صفحة' : effectivePlan.unitType === 'line' ? 'أسطر' : effectivePlan.unitType === 'ayah' ? 'آيات' : effectivePlan.unitType} يومياً • {effectivePlan.direction === 'backward' ? 'تنازلي (الناس ← الفاتحة)' : 'تصاعدي (الفاتحة ← الناس)'}
                      </span>
                    </div>

                    {/* مسار المراجعة */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">مسار ونمط المراجعة</span>
                      <span className="font-black text-slate-800">
                        {effectivePlan.revisionSettings?.mode === 'none'
                          ? 'بدون مراجعة (متوقف)'
                          : effectivePlan.revisionSettings?.mode === 'surahs'
                          ? `مراجعة بالسور (${effectivePlan.revisionSettings?.surahsPerDay || 1} سورة)`
                          : `مراجعة صفحات (${effectivePlan.dailyRevisionPages || 1} ص يومياً)`}
                        {effectivePlan.revisionSettings?.mode !== 'none' && (
                          <span className="text-[10px] text-slate-500 block font-normal">
                            اتجاه: {effectivePlan.revisionDirection === 'forward' ? 'طردي' : 'عكسي (الأحدث أولاً)'}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* التثبيت */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">تثبيت السورة المنتهية</span>
                      <span className="font-black text-slate-800">
                        {effectivePlan.consolidationDays ? `${effectivePlan.consolidationDays} أيام تثبيت متتالية` : 'بدون تثبيت'}
                      </span>
                    </div>

                    {/* أيام التسميع */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">أيام التسميع الأسبوعية</span>
                      <span className="font-black text-slate-800">
                        {effectivePlan.schedule?.workingDays?.map(d => ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'][d]).join('، ') || 'الأحد إلى الأربعاء'}
                      </span>
                    </div>

                    {/* إزاحة الحفظ / المراجعة */}
                    {(effectivePlan.savingOffset || effectivePlan.revisionOffset) ? (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] font-bold">إزاحة المسارات</span>
                        <span className="font-black text-amber-800">
                          {effectivePlan.savingOffset
                            ? `إزاحة الحفظ: تأجيل ${effectivePlan.savingOffset} حصص للتهيئة`
                            : `إزاحة المراجعة: تأجيل ${effectivePlan.revisionOffset} حصص`}
                        </span>
                      </div>
                    ) : null}

                    {/* حالة الاعتماد والتاريخ */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[10px] font-bold">حالة الخطة والاعتماد</span>
                      <span className="font-black text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{previewPlan ? 'مسودة قيد المراجعة' : 'معتمدة ونشطة'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Day Progress Panel */}
              {currentDayItem && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-emerald-800" />
                      <span className="text-xs font-black text-slate-900">
                        {calendar !== 'none'
                          ? `حصة اليوم: ${fmtDate(currentDayItem.date)}`
                          : `حصة المنهج رقم: ${currentDayItem.itemIndex}`}
                      </span>
                      {currentDayItem.isConsolidationDay && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          يوم تثبيت ({currentDayItem.consolidationDayIndex}/
                          {effectivePlan?.consolidationDays || 3})
                        </span>
                      )}
                    </div>
                    {currentDayRecord && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          STATUS_META[currentDayRecord.status]?.cls || 'bg-slate-100'
                        }`}
                      >
                        حالة التسميع:{' '}
                        {STATUS_META[currentDayRecord.status]?.label || currentDayRecord.status}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* Memorization */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        مقرر الحفظ اليومي
                      </span>
                      <span className="font-black text-slate-800">
                        {currentDayItem.targetUnit?.displayLabel || '—'}
                      </span>
                    </div>

                    {/* Revision */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        مقرر المراجعة اليومي
                      </span>
                      <span className="font-black text-slate-800">
                        {currentDayItem.revisionDisplayLabel || '—'}
                      </span>
                    </div>

                    {/* Actual Achievement / Recitation */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        الإنجاز الفعلي المسجل
                      </span>
                      <span className="font-black text-emerald-800">
                        {currentDayRecord?.memorization?.surahTo
                          ? `${currentDayRecord.memorization.surahTo} (${currentDayRecord.memorization.ayahTo})`
                          : currentDayItem.status === 'completed'
                          ? 'مكتمل وفق المقرر'
                          : 'بانتظار التسميع'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Comprehensive Day-by-Day Table Grouped by Week */}
              <div className="space-y-2.5">
                {weeks.map(([weekNum, days]) => {
                  const weekDone = days.filter(
                    (d) => d.status === 'completed' || d.status === 'overachieved'
                  ).length;
                  const open = isWeekOpen(weekNum);
                  const isCurrent = weekNum === currentWeek;

                  return (
                    <div
                      key={weekNum}
                      id={`quran-plan-week-${weekNum}`}
                      className={`bg-white border rounded-xl overflow-hidden transition-all shadow-xs ${
                        isCurrent ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200'
                      }`}
                    >
                      {/* Week Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleWeek(weekNum)}
                        className={`w-full px-3 py-2 flex items-center justify-between text-xs font-black cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-emerald-50 text-emerald-950'
                            : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                          <span>الأسبوع {weekNum}</span>
                          {calendar !== 'none' && days.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({fmtDate(days[0].date)} ← {fmtDate(days[days.length - 1].date)})
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded-full font-bold">
                              الأسبوع الحالي
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <span className="text-slate-500">
                            {weekDone} / {days.length} حصص منجزة
                          </span>
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{
                                width: days.length
                                  ? `${(weekDone / days.length) * 100}%`
                                  : '0%',
                              }}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Day Rows Table */}
                      {open && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-[11px]">
                            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[10px]">
                              <tr>
                                {calendar !== 'none' ? (
                                  <th className="py-2 px-2.5 font-bold">اليوم والتاريخ</th>
                                ) : (
                                  <th className="py-2 px-2.5 font-bold">الحصة</th>
                                )}
                                <th className="py-2 px-2.5 font-bold">مقرر الحفظ</th>
                                <th className="py-2 px-2.5 font-bold">مقرر المراجعة</th>
                                {spellingTrackOn && (
                                  <th className="py-2 px-2.5 font-bold">الهجاء</th>
                                )}
                                <th className="py-2 px-2.5 font-bold">الإنجاز الفعلي</th>
                                <th className="py-2 px-2.5 font-bold">التقييم</th>
                                <th className="py-2 px-2.5 font-bold">الحالة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {days.map((day) => {
                                const rec = recordsByDate.get(day.date);
                                const isToday = day.date === todayIso;
                                const isHoliday = day.dayType === 'holiday';

                                if (isHoliday && calendar !== 'none') {
                                  return (
                                    <tr key={day.id} className="bg-purple-50/70 border-y border-purple-100/90 text-purple-950 font-bold text-xs">
                                      <td className="py-2 px-2.5">
                                        {fmtDate(day.date)}
                                      </td>
                                      <td colSpan={spellingTrackOn ? 6 : 5} className="py-2 px-2.5 text-center">
                                        🏖️ إجازة رسمية معتمدة
                                      </td>
                                    </tr>
                                  );
                                }

                                const actualSurah = rec?.memorization?.surahTo;
                                const actualAyah = rec?.memorization?.ayahTo;
                                const hasActual = Boolean(actualSurah);
                                const statusKey = rec?.status || day.status || 'pending';
                                const statusMeta = STATUS_META[statusKey] || STATUS_META.pending;

                                return (
                                  <tr
                                    key={day.id}
                                    className={`hover:bg-slate-50/80 transition-colors ${
                                      isToday ? 'bg-amber-50/50 font-bold' : ''
                                    }`}
                                  >
                                    {/* Date / Day Number */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <div className="font-bold text-slate-900">
                                        {calendar !== 'none' ? (
                                          <>
                                            {new Date(day.date).toLocaleDateString('ar-SA', {
                                              weekday: 'short',
                                            })}{' '}
                                            <span className="text-slate-500 font-normal">
                                              {fmtDate(day.date)}
                                            </span>
                                          </>
                                        ) : (
                                          <span>الحصة {day.itemIndex}</span>
                                        )}
                                      </div>
                                      {day.isConsolidationDay && (
                                        <span className="text-[9px] text-amber-700 block font-bold">
                                          تثبيت {day.consolidationDayIndex}/
                                          {effectivePlan?.consolidationDays || 3}
                                        </span>
                                      )}
                                    </td>

                                    {/* Memorization Target */}
                                    <td className="py-2 px-2.5">
                                      <div className="font-bold text-slate-900">
                                        {day.targetUnit?.displayLabel || '—'}
                                      </div>
                                    </td>

                                    {/* Revision Target */}
                                    <td className="py-2 px-2.5">
                                      <div className="text-slate-700">
                                        {day.revisionDisplayLabel || '—'}
                                      </div>
                                    </td>

                                    {/* Spelling */}
                                    {spellingTrackOn && (
                                      <td className="py-2 px-2.5 text-slate-600">
                                        {day.spellingAssignment?.title || '—'}
                                      </td>
                                    )}

                                    {/* Actual Recitation */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      {hasActual ? (
                                        <span className="font-bold text-emerald-800">
                                          {actualSurah} ({actualAyah})
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Evaluation */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      {rec?.memorization?.evaluation ? (
                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                          {EVAL_LABELS[rec.memorization.evaluation] ||
                                            rec.memorization.evaluation}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta.cls}`}
                                      >
                                        {statusMeta.label}
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

              {/* Document Signatures Footer */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-600 font-bold">
                <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-slate-400 block mb-3">توقيع المعلم</span>
                  <span>{teacherName}</span>
                </div>
                <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-slate-400 block mb-3">توقيع المشرف التربوي</span>
                  <span>المشرف المسؤول</span>
                </div>
                <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-slate-400 block mb-3">اعتماد إدارة المجمع</span>
                  <span>{activeTenant?.name || 'المجمع القرآني'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Archive Confirmation Dialog */}
        {showArchiveDialog && activePlan && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2.5 text-rose-800">
                <Archive className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-black">أرشفة الخطة القرآنية للطالب</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في أرشفة الخطة الحالية؟ لا يتم حذف أي سجل من قاعدة البيانات، بل تُحفظ كأرشيف تاريخي موثق.
              </p>

              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="archive_mode"
                    value="plan_only"
                    checked={archiveMode === 'plan_only'}
                    onChange={() => setArchiveMode('plan_only')}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">أرشفة الخطة فقط</span>
                    <span className="text-[10px] text-slate-500">
                      تبقى إنجازات التسميع كما هي، وتبدأ الخطة الجديدة من آخر إنجاز فعلي للطالب.
                    </span>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="archive_mode"
                    value="plan_and_achievements"
                    checked={archiveMode === 'plan_and_achievements'}
                    onChange={() => setArchiveMode('plan_and_achievements')}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">أرشفة الخطة مع الإنجازات السابقة</span>
                    <span className="text-[10px] text-slate-500">
                      تعتبر جلسات الخطة كأرشيف تاريخي وتبدأ الخطة الجديدة من نقطة بداية مستقلة.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isArchiving ? 'جارٍ الأرشفة...' : 'تأكيد الأرشفة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage Configs Modal */}
        {showStageConfigsModal && (
          <StageConfigModal
            isOpen={showStageConfigsModal}
            onClose={() => setShowStageConfigsModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ComprehensiveQuranPlanModal;
