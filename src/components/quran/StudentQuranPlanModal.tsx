import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Archive,
  BookOpen,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Check,
  User,
  Layers,
  History,
  Info,
  TrendingUp,
  Award,
  CalendarDays,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Student } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { useApp } from '../../context/AppContext';
import {
  StudentQuranPlan,
  DailyPlanItem,
  PlanDirection,
} from '../../quran/types/plan';
import { QuranPosition, PlanningUnitType, Ayah } from '../../quran/types';
import { RangeCalculator } from '../../quran/services/rangeCalculator';
import { SURAHS_LIST } from '../../data/initialData';
import { ALL_114_SURAHS, getSurahsByDirection, getSurahAyahsCount, getSurahArabicName } from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { BundledQuranProvider } from '../../quran/providers/BundledQuranProvider';
import { getArabicDayName, formatDateString } from '../../quran/utils/dateUtils';
import { formatHijriDate, formatGregorianDate } from '../../utils/hijriDate';
import { StageQuranConfig } from '../../quran/models/stageConfig';
import { formatQuranTextExpression } from '../../quran/utils/positionFormatter';

interface StudentQuranPlanModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onSavePlan?: (updatedStudent: Student) => void;
}

export const StudentQuranPlanModal: React.FC<StudentQuranPlanModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const {
    currentUser,
    currentRole,
    quranPlans,
    quranStageConfigs,
    previewStudentQuranPlan,
    approveStudentQuranPlan,
    archiveStudentQuranPlan,
    recordQuranPlanAchievement,
    getActiveStudentQuranPlan,
    academicConfig,
    halaqahs,
    teachers,
    activeTenant,
    sessionRecords,
  } = useApp();

  // Teachers can view the plan but never modify it — editing requires manage_quran_plan
  // within the student's actual scope (halaqah + stage → supervisor delegations enforced)
  const studentHalaqah = student
    ? halaqahs.find((h) => h.id === student.halaqahId)
    : undefined;
  const studentStageId = student?.stageId || studentHalaqah?.stageId;
  const canEditPlan = hasPermission(
    currentUser,
    'manage_quran_plan',
    student?.halaqahId,
    studentStageId,
    halaqahs,
    activeTenant
  );

  const provider = useMemo(() => new BundledQuranProvider(), []);
  const rangeCalculator = useMemo(() => new RangeCalculator(provider), [provider]);

  // Active Plan for this student
  const activePlan = useMemo(() => {
    if (!student) return null;
    return getActiveStudentQuranPlan(student.id);
  }, [student, getActiveStudentQuranPlan, quranPlans]);

  const planDailyItems = useMemo(
    () => activePlan?.generatedPlan?.dailyPlans || [],
    [activePlan]
  );

  // A persisted plan row whose generated payload is missing/incomplete
  // (legacy rows pre-dating plan_data persistence) must be flagged for
  // rebuild instead of rendering an empty plan.
  const planNeedsRebuild = !!activePlan && planDailyItems.length === 0;

  // Derived plan metrics — computed from the canonical daily items (the engine
  // does not store a metrics block).
  const planMetrics = useMemo(() => {
    const totalDaysPlanned = planDailyItems.length;
    const completedDaysCount = planDailyItems.filter(
      (d) => d.status === 'completed' || d.status === 'overachieved'
    ).length;
    const missedDaysCount = planDailyItems.filter(
      (d) => d.status === 'absent' || d.status === 'unrecited'
    ).length;
    const totalAyahsCompleted = planDailyItems.reduce(
      (sum, d) => sum + (d.actualAchieved?.unit?.totalAyahs || 0),
      0
    );
    const completionPercentage =
      totalDaysPlanned > 0 ? Math.round((completedDaysCount / totalDaysPlanned) * 100) : 0;
    return {
      totalDaysPlanned,
      completedDaysCount,
      missedDaysCount,
      totalAyahsCompleted,
      completionPercentage,
    };
  }, [planDailyItems]);

  // View Mode: 'today' | 'week' | 'month' | 'semester'
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'semester'>('today');

  // Selected date for Today's recitation view (defaults to today)
  const todayIso = useMemo(() => formatDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Actual week list of the plan (no truncation — the whole term).
  const planWeekNumbers = useMemo(
    () => Array.from(new Set(planDailyItems.map((d) => d.weekNumber))).sort((a, b) => a - b),
    [planDailyItems]
  );

  // Selected week for the Week view — defaults to the week containing the
  // selected date (or the first plan week).
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const activeWeekNumber = useMemo(() => {
    if (selectedWeek !== null && planWeekNumbers.includes(selectedWeek)) return selectedWeek;
    const selDay = planDailyItems.find((d) => d.date === selectedDate);
    if (selDay) return selDay.weekNumber;
    return planWeekNumbers[0] ?? null;
  }, [selectedWeek, planWeekNumbers, planDailyItems, selectedDate]);

  const weekDays = useMemo(
    () => planDailyItems.filter((d) => d.weekNumber === activeWeekNumber),
    [planDailyItems, activeWeekNumber]
  );

  // Sync selectedDate when plan loads
  useEffect(() => {
    if (activePlan && activePlan.generatedPlan?.dailyPlans?.length > 0) {
      const todayExists = activePlan.generatedPlan.dailyPlans.some((d) => d.date === todayIso);
      if (todayExists) {
        setSelectedDate(todayIso);
      } else {
        // Find first pending day or today
        const firstPending = activePlan.generatedPlan.dailyPlans.find((d) => d.status === 'pending');
        setSelectedDate(firstPending ? firstPending.date : activePlan.generatedPlan.dailyPlans[0].date);
      }
    }
  }, [activePlan, todayIso]);

  // Daily Achievement Recording Form State
  const [recordAction, setRecordAction] = useState<
    'completed' | 'overachieved' | 'partial' | 'absent' | 'unrecited' | 'custom'
  >('completed');
  const [customEndSurah, setCustomEndSurah] = useState<string>('');
  const [customEndAyah, setCustomEndAyah] = useState<number>(1);
  const [evaluation, setEvaluation] = useState<'excellent' | 'very_good' | 'good' | 'needs_practice'>('excellent');
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calendar display toggle: 'hijri' | 'gregorian' | 'none'
  const [calendarMode, setCalendarMode] = useState<'hijri' | 'gregorian' | 'none'>('hijri');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const fmtDate = useCallback(
    (d: string) => {
      if (calendarMode === 'none') return '';
      return calendarMode === 'hijri' ? formatHijriDate(d) : formatGregorianDate(d);
    },
    [calendarMode]
  );

  // Ref to prevent background re-renders/syncs from wiping form state while teacher is working
  const initializedStudentIdRef = useRef<string | null>(null);

  // Setup Form State (for students needing initial starting point setup)
  const [setupStartSurah, setSetupStartSurah] = useState<string>('الناس');
  const [setupDirection, setSetupDirection] = useState<PlanDirection>('backward');
  const [setupUnitType, setSetupUnitType] = useState<PlanningUnitType>('line');
  const [setupDailyAmount, setSetupDailyAmount] = useState<number>(3);
  const [setupSavingOffset, setSetupSavingOffset] = useState<number>(0);

  // Flexible Revision State
  const [setupLinkageMode, setSetupLinkageMode] = useState<'reverse' | 'forward' | 'none'>('reverse');
  const [setupRevStartSurah, setSetupRevStartSurah] = useState<string>('الناس');
  const [setupRevisionDirection, setSetupRevisionDirection] = useState<PlanDirection>('backward');
  const [setupRevisionUnit, setSetupRevisionUnit] = useState<'line' | 'ayah' | 'surah' | 'page'>('line');
  const [setupRevisionAmount, setSetupRevisionAmount] = useState<number>(30);
  const [setupRevisionOffset, setSetupRevisionOffset] = useState<number>(0);
  const [setupConsolidationDays, setSetupConsolidationDays] = useState<number>(3);
  const [setupWorkingDays, setSetupWorkingDays] = useState<number[]>([0, 1, 2, 3]);

  // Preview state — the generated plan awaits explicit approval before persistence
  const [previewPlan, setPreviewPlan] = useState<StudentQuranPlan | null>(null);
  const [isPersistedInDatabase, setIsPersistedInDatabase] = useState<boolean>(false);
  // Archive dialog state — explicit two-step confirmation (never instant)
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);
  const [archiveMode, setArchiveMode] = useState<'plan_only' | 'plan_and_achievements'>('plan_only');
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);

  // Auto-fill setup defaults ONCE when student modal opens — the suggested starting
  // position is the FIRST UNMEMORIZED verse after the last actually-recorded
  // achievement (session records are the source of truth, student record is
  // the fallback). Background syncs will never wipe the teacher's active inputs.
  useEffect(() => {
    if (!isOpen) {
      initializedStudentIdRef.current = null;
      setPreviewPlan(null);
      setIsPersistedInDatabase(false);
      return;
    }

    if (student && initializedStudentIdRef.current !== student.id) {
      initializedStudentIdRef.current = student.id;

      if (activePlan) {
        setPreviewPlan(activePlan);
        setIsPersistedInDatabase(true);
      } else {
        setIsPersistedInDatabase(false);
      }

      const latestMemRec = sessionRecords
        .filter((r) => r.studentId === student.id && r.memorization?.surahTo)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      let recordedSurah = latestMemRec?.memorization?.surahTo || student.currentSurah;
      let recordedAyah = latestMemRec?.memorization?.ayahTo || student.currentAyah || 1;

      // Advance to the next position in the plan's direction: ayah+1 within
      // the same surah, or the next surah's ayah 1 when the surah is done.
      if (recordedSurah) {
        const ayahsCount = getSurahAyahsCount(recordedSurah);
        if (ayahsCount > 0 && recordedAyah < ayahsCount) {
          recordedAyah = recordedAyah + 1;
        } else if (ayahsCount > 0) {
          const ordered = getSurahsByDirection(setupDirection);
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

      setSetupDailyAmount(3);
      setSetupUnitType('line');
      setSetupDirection('backward');
      setSetupRevisionUnit('line');
      setSetupRevisionAmount(30);
      setSetupConsolidationDays(3);
      setSetupLinkageMode('reverse');
      setSetupWorkingDays([0, 1, 2, 3]);
      setSetupSavingOffset(activePlan?.savingOffset || 0);
      setSetupRevisionOffset(activePlan?.revisionOffset || 0);
    }
  }, [isOpen, student, activePlan, sessionRecords, setupDirection]);

  // Inline dynamic recalculation handler for changing Surah or Ayah in preview table
  const handleInlineSurahOrAyahChange = async (
    dayId: string,
    newStartSurahNum: number,
    newStartAyahNum: number,
    newEndSurahNum?: number,
    newEndAyahNum?: number
  ) => {
    if (!previewPlan || !previewPlan.generatedPlan?.dailyPlans) return;
    const days = previewPlan.generatedPlan.dailyPlans.map((d) => ({ ...d }));
    const dayIndex = days.findIndex((d) => d.id === dayId);
    if (dayIndex === -1) return;

    const startAyahsMax = getSurahAyahsCount(newStartSurahNum) || 1;
    const startAyah = Math.min(Math.max(1, newStartAyahNum), startAyahsMax);
    const direction = previewPlan.direction || setupDirection || 'backward';
    const unitType = previewPlan.unitType || setupUnitType || 'line';
    const dailyAmount = previewPlan.dailyAmount || setupDailyAmount || 3;
    const revPages = previewPlan.revisionDailyPages || setupRevisionAmount || 1;
    const revDir = (previewPlan.revisionSettings?.direction || (setupLinkageMode === 'forward' ? 'forward' : 'backward')) as 'forward' | 'backward';
    const revUnitKind = (previewPlan.revisionSettings?.unitType === 'surah' ? 'surah' : 'page') as 'page' | 'surah';
    const revUnitsPerWin = previewPlan.revisionSettings?.surahsPerDay;
    const consolidationDaysCount = setupConsolidationDays !== undefined ? setupConsolidationDays : 3;

    if (dayIndex === 0) {
      setSetupStartSurah(getSurahArabicName(newStartSurahNum));
    }

    const targetEnd: QuranPosition = direction === 'backward'
      ? { surahNumber: 2, ayahNumber: 286 }
      : { surahNumber: 114, ayahNumber: 6 };

    let priorVerses: Ayah[] = [];
    try {
      priorVerses = await rangeCalculator.getCompletedMemorizedVerses(
        {
          surahNumber: newStartSurahNum,
          ayahNumber: Math.max(0, startAyah - 1),
        },
        direction
      );
    } catch {
      priorVerses = [];
    }

    try {
      const units = await rangeCalculator.partitionSurahsWithCumulativePaceAndConsolidation(
        { surahNumber: newStartSurahNum, ayahNumber: startAyah },
        targetEnd,
        unitType,
        dailyAmount,
        direction,
        consolidationDaysCount,
        revPages,
        priorVerses,
        revDir,
        revUnitKind,
        revUnitsPerWin,
        true
      );

      for (let i = dayIndex; i < days.length; i++) {
        const uIndex = i - dayIndex;
        const day = { ...days[i] };

        if (uIndex < units.length) {
          const u = units[uIndex];
          const isCons = Boolean(u.isConsolidation);

          day.planType = isCons ? 'revision' : 'memorization';
          day.dayType = isCons ? 'consolidation' : 'memorization';
          day.unitType = unitType;
          day.targetUnit = u;
          day.isConsolidationDay = isCons;
          day.consolidationDayIndex = u.consolidationDayIndex;
          day.consolidationSurahNumber = u.consolidationSurahNumber;
          day.revisionDisplayLabel = u.revisionDisplay || 'مراجعة: ما تم حفظه';
          day.revisionPagesAmount = u.revisionPages || revPages;
          day.revisionPageStart = u.revisionPageStart;
          day.revisionPageEnd = u.revisionPageEnd;
        } else {
          const lastUnit = units[units.length - 1];
          day.planType = 'revision';
          day.dayType = 'general_revision';
          day.isConsolidationDay = false;
          day.consolidationDayIndex = undefined;
          day.consolidationSurahNumber = undefined;
          day.targetUnit = {
            type: unitType,
            start: lastUnit ? lastUnit.end : targetEnd,
            end: lastUnit ? lastUnit.end : targetEnd,
            totalAyahs: 0,
            displayLabel: 'يوم تثبيت ومراجعة عامة (تم إنجاز المقرر)',
            isConsolidation: false,
          };
          day.revisionDisplayLabel = lastUnit?.revisionDisplay || 'مراجعة عامة';
        }

        days[i] = day;
      }

      const updatedPlan: StudentQuranPlan = {
        ...previewPlan,
        targetStart: dayIndex === 0 ? { surahNumber: newStartSurahNum, ayahNumber: startAyah } : previewPlan.targetStart,
        generatedPlan: {
          ...previewPlan.generatedPlan,
          dailyPlans: days,
        },
      };
      setPreviewPlan(updatedPlan);
    } catch {
      // Fallback
    }
  };

  const handleInlineConsolidationDaysChange = async (newConsolidationDays: number) => {
    if (!previewPlan || !previewPlan.generatedPlan?.dailyPlans) return;
    setSetupConsolidationDays(newConsolidationDays);

    const days = previewPlan.generatedPlan.dailyPlans.map((d) => ({ ...d }));
    if (days.length === 0) return;

    const firstDay = days[0];
    const startSurahNum = previewPlan.targetStart?.surahNumber || firstDay.targetUnit?.start?.surahNumber || 114;
    const startAyah = previewPlan.targetStart?.ayahNumber || firstDay.targetUnit?.start?.ayahNumber || 1;

    const direction = previewPlan.direction || setupDirection || 'backward';
    const unitType = previewPlan.unitType || setupUnitType || 'line';
    const dailyAmount = previewPlan.dailyAmount || setupDailyAmount || 3;
    const revPages = previewPlan.revisionDailyPages || setupRevisionAmount || 1;
    const revDir = (previewPlan.revisionSettings?.direction || (setupLinkageMode === 'forward' ? 'forward' : 'backward')) as 'forward' | 'backward';
    const revUnitKind = (previewPlan.revisionSettings?.unitType === 'surah' ? 'surah' : 'page') as 'page' | 'surah';
    const revUnitsPerWin = previewPlan.revisionSettings?.surahsPerDay;

    const targetEnd: QuranPosition = direction === 'backward'
      ? { surahNumber: 2, ayahNumber: 286 }
      : { surahNumber: 114, ayahNumber: 6 };

    let priorVerses: Ayah[] = [];
    try {
      priorVerses = await rangeCalculator.getCompletedMemorizedVerses(
        {
          surahNumber: startSurahNum,
          ayahNumber: Math.max(0, startAyah - 1),
        },
        direction
      );
    } catch {
      priorVerses = [];
    }

    try {
      const units = await rangeCalculator.partitionSurahsWithCumulativePaceAndConsolidation(
        { surahNumber: startSurahNum, ayahNumber: startAyah },
        targetEnd,
        unitType,
        dailyAmount,
        direction,
        newConsolidationDays,
        revPages,
        priorVerses,
        revDir,
        revUnitKind,
        revUnitsPerWin,
        true
      );

      for (let i = 0; i < days.length; i++) {
        const day = { ...days[i] };

        if (i < units.length) {
          const u = units[i];
          const isCons = Boolean(u.isConsolidation);

          day.planType = isCons ? 'revision' : 'memorization';
          day.dayType = isCons ? 'consolidation' : 'memorization';
          day.unitType = unitType;
          day.targetUnit = u;
          day.isConsolidationDay = isCons;
          day.consolidationDayIndex = u.consolidationDayIndex;
          day.consolidationSurahNumber = u.consolidationSurahNumber;
          day.revisionDisplayLabel = u.revisionDisplay || 'مراجعة: ما تم حفظه';
          day.revisionPagesAmount = u.revisionPages || revPages;
          day.revisionPageStart = u.revisionPageStart;
          day.revisionPageEnd = u.revisionPageEnd;
        } else {
          const lastUnit = units[units.length - 1];
          day.planType = 'revision';
          day.dayType = 'general_revision';
          day.isConsolidationDay = false;
          day.consolidationDayIndex = undefined;
          day.consolidationSurahNumber = undefined;
          day.targetUnit = {
            type: unitType,
            start: lastUnit ? lastUnit.end : targetEnd,
            end: lastUnit ? lastUnit.end : targetEnd,
            totalAyahs: 0,
            displayLabel: 'يوم تثبيت ومراجعة عامة (تم إنجاز المقرر)',
            isConsolidation: false,
          };
          day.revisionDisplayLabel = lastUnit?.revisionDisplay || 'مراجعة عامة';
        }

        days[i] = day;
      }

      const updatedPlan: StudentQuranPlan = {
        ...previewPlan,
        consolidationDaysPerSurah: newConsolidationDays,
        generatedPlan: {
          ...previewPlan.generatedPlan,
          dailyPlans: days,
        },
      };
      setPreviewPlan(updatedPlan);
    } catch {
      // Fallback
    }
  };

  /**
   * CRITICAL BUSINESS RULE (قاعدة التنسيق القرآني الأنيق - لا تحذف):
   * تحليل نصوص المراجعة الذكية التي تشمل "كاملة" أو "نهاية السورة" أو "من سورة X إلى سورة Y"
   * دون كتابة رقم الآية الأخيرة إذا كانت السورة كاملة
   */
  const parseRevisionLabel = (label?: string): {
    startSurah: number;
    startAyah: number;
    endSurah: number;
    endAyah: number;
    rawLabel: string;
  } => {
    const defaultRes = { startSurah: 114, startAyah: 1, endSurah: 114, endAyah: 6, rawLabel: label || 'مراجعة: ما تم حفظه' };
    if (!label) return defaultRes;

    // Pattern 1: "مراجعة: سورة الفاتحة كاملة" or "المرسلات كاملة"
    const completeSingleMatch = label.match(/(?:مراجعة:\s*)?(?:سورة\s+)?([^\(\d]+?)\s+كاملة/);
    if (completeSingleMatch) {
      const sName = completeSingleMatch[1].trim().replace(/^سورة\s+/, '');
      const s = SURAHS_LIST.find((item) => item.name === sName || item.name.includes(sName) || sName.includes(item.name))?.number || 114;
      const totalA = getSurahAyahsCount(s) || 1;
      return { startSurah: s, startAyah: 1, endSurah: s, endAyah: totalA, rawLabel: label };
    }

    // Pattern 2: "مراجعة: من سورة الفاتحة إلى سورة الناس"
    const surahToSurahMatch = label.match(/من\s+(?:سورة\s+)?([^\(\d]+?)\s+إلى\s+(?:سورة\s+)?([^\(\d]+?)(?:\s*$|\s*[\+\-])/);
    if (surahToSurahMatch) {
      const s1Name = surahToSurahMatch[1].trim().replace(/^سورة\s+/, '');
      const s2Name = surahToSurahMatch[2].trim().replace(/^سورة\s+/, '');
      const s1 = SURAHS_LIST.find((s) => s.name === s1Name || s.name.includes(s1Name) || s1Name.includes(s.name))?.number || 1;
      const s2 = SURAHS_LIST.find((s) => s.name === s2Name || s.name.includes(s2Name) || s2Name.includes(s.name))?.number || 114;
      return { startSurah: s1, startAyah: 1, endSurah: s2, endAyah: getSurahAyahsCount(s2) || 6, rawLabel: label };
    }

    // Pattern 3: "مراجعة: من الفاتحة (1) إلى الناس (6)"
    const rangeMatch = label.match(/من\s+([^\(]+)\s*\((\d+)\)\s*إلى\s+([^\(]+)\s*\((\d+)\)/);
    if (rangeMatch) {
      const s1Name = rangeMatch[1].trim().replace(/^سورة\s+/, '');
      const s1 = SURAHS_LIST.find((s) => s.name === s1Name || s.name.includes(s1Name) || s1Name.includes(s.name))?.number || 1;
      const a1 = parseInt(rangeMatch[2], 10) || 1;
      const s2Name = rangeMatch[3].trim().replace(/^سورة\s+/, '');
      const s2 = SURAHS_LIST.find((s) => s.name === s2Name || s.name.includes(s2Name) || s2Name.includes(s.name))?.number || 114;
      const a2 = parseInt(rangeMatch[4], 10) || 6;
      return { startSurah: s1, startAyah: a1, endSurah: s2, endAyah: a2, rawLabel: label };
    }

    // Pattern 4: "مراجعة: الناس (1 - 6)" or "الناس (1 - نهاية السورة)"
    const singleMatch = label.match(/([^\(\d]+)\s*\(?(\d+)\s*[-–]\s*([^\)]+)\)?/);
    if (singleMatch) {
      const sName = singleMatch[1].replace(/^مراجعة:\s*/, '').trim().replace(/^سورة\s+/, '');
      const s = SURAHS_LIST.find((item) => item.name === sName || item.name.includes(sName) || sName.includes(item.name))?.number || 114;
      const a1 = parseInt(singleMatch[2], 10) || 1;
      const endPart = singleMatch[3].trim();
      const a2 = endPart.includes('نهاية') ? (getSurahAyahsCount(s) || 1) : parseInt(endPart, 10) || (getSurahAyahsCount(s) || 1);
      return { startSurah: s, startAyah: a1, endSurah: s, endAyah: a2, rawLabel: label };
    }

    return defaultRes;
  };

  const handleInlineRevisionChange = (
    dayId: string,
    newStartSurahNum: number,
    newStartAyahNum: number,
    newEndSurahNum?: number,
    newEndAyahNum?: number
  ) => {
    if (!previewPlan || !previewPlan.generatedPlan?.dailyPlans) return;
    if (setupLinkageMode !== 'none' && previewPlan.autoMinorRevisionMode !== false) return;
    const days = previewPlan.generatedPlan.dailyPlans.map((d) => ({ ...d }));
    const dayIndex = days.findIndex((d) => d.id === dayId);
    if (dayIndex === -1) return;

    const startAyahsMax = getSurahAyahsCount(newStartSurahNum) || 1;
    const startAyah = Math.min(Math.max(1, newStartAyahNum), startAyahsMax);

    const endSurahNum = newEndSurahNum ?? newStartSurahNum;
    const endAyahsMax = getSurahAyahsCount(endSurahNum) || 1;
    const endAyah =
      newEndAyahNum !== undefined
        ? Math.min(Math.max(1, newEndAyahNum), endAyahsMax)
        : Math.min(startAyah + 5, endAyahsMax);

    const startSurahName = getSurahArabicName(newStartSurahNum);
    const endSurahName = getSurahArabicName(endSurahNum);

    // CRITICAL BUSINESS RULE (قاعدة التنسيق القرآني الأنيق - لا تحذف):
    // عدم كتابة رقم الآية الأخيرة إذا كانت السورة كاملة
    const isStartFull = startAyah === 1;
    const isEndFull = endAyah === endAyahsMax;

    let newRevisionLabel: string;
    if (newStartSurahNum === endSurahNum) {
      if (isStartFull && isEndFull) {
        newRevisionLabel = `مراجعة: سورة ${startSurahName} كاملة`;
      } else if (startAyah === endAyah) {
        newRevisionLabel = `مراجعة: ${startSurahName} (${startAyah})`;
      } else if (isEndFull) {
        newRevisionLabel = `مراجعة: ${startSurahName} (${startAyah} - نهاية السورة)`;
      } else {
        newRevisionLabel = `مراجعة: ${startSurahName} (${startAyah} - ${endAyah})`;
      }
    } else {
      if (isStartFull && isEndFull) {
        newRevisionLabel = `مراجعة: من سورة ${startSurahName} إلى سورة ${endSurahName}`;
      } else if (isStartFull) {
        newRevisionLabel = `مراجعة: من سورة ${startSurahName} إلى ${endSurahName} (${endAyah})`;
      } else if (isEndFull) {
        newRevisionLabel = `مراجعة: من ${startSurahName} (${startAyah}) إلى سورة ${endSurahName}`;
      } else {
        newRevisionLabel = `مراجعة: من ${startSurahName} (${startAyah}) إلى ${endSurahName} (${endAyah})`;
      }
    }

    days[dayIndex] = {
      ...days[dayIndex],
      revisionDisplayLabel: newRevisionLabel,
    };

    // Forward propagation for subsequent days
    const revDirection = (previewPlan.revisionSettings?.direction || setupRevisionDirection || 'backward') as 'forward' | 'backward';
    let currSurah = endSurahNum;
    let currAyah = endAyah;
    const chunkSpan = Math.max(1, endAyah - startAyah + 1);

    const advanceRevPos = (surahNum: number, ayahNum: number): { surah: number; ayah: number } | null => {
      const sMax = getSurahAyahsCount(surahNum) || 1;
      if (revDirection === 'backward') {
        if (ayahNum < sMax) {
          return { surah: surahNum, ayah: ayahNum + 1 };
        } else {
          if (surahNum <= 1) return null;
          return { surah: surahNum - 1, ayah: 1 };
        }
      } else {
        if (ayahNum < sMax) {
          return { surah: surahNum, ayah: ayahNum + 1 };
        } else {
          if (surahNum >= 114) return null;
          return { surah: surahNum + 1, ayah: 1 };
        }
      }
    };

    for (let i = dayIndex + 1; i < days.length; i++) {
      const nextPos = advanceRevPos(currSurah, currAyah);
      if (!nextPos) break;
      const nextSMax = getSurahAyahsCount(nextPos.surah) || 1;
      const nextEndAyah = Math.min(nextPos.ayah + chunkSpan - 1, nextSMax);
      const sName = getSurahArabicName(nextPos.surah);

      days[i] = {
        ...days[i],
        revisionDisplayLabel: `مراجعة: ${sName} (${nextPos.ayah} - ${nextEndAyah})`,
      };

      currSurah = nextPos.surah;
      currAyah = nextEndAyah;
    }

    setPreviewPlan({
      ...previewPlan,
      generatedPlan: {
        ...previewPlan.generatedPlan,
        dailyPlans: days,
      },
    });
  };

  // Find target day in plan
  const currentDayItem: DailyPlanItem | null = useMemo(() => {
    if (!activePlan?.generatedPlan?.dailyPlans) return null;
    return activePlan.generatedPlan.dailyPlans.find((d) => d.date === selectedDate) || null;
  }, [activePlan, selectedDate]);

  // Set default custom end when day item changes
  useEffect(() => {
    if (currentDayItem) {
      // Find surah name for target end
      provider.getSurah(currentDayItem.targetUnit.end.surahNumber).then((s) => {
        if (s) {
          setCustomEndSurah(s.name);
          setCustomEndAyah(currentDayItem.targetUnit.end.ayahNumber);
        }
      });
    }
  }, [currentDayItem, provider]);

  if (!isOpen || !student) return null;

  // Handler — Step 1: build the plan PREVIEW (nothing persisted yet)
  const handleCreatePlanFromSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    setFeedbackMessage(null);
    setPreviewPlan(null);

    try {
      // Resolve start position (Ayah is always 1)
      const allSurahs = await provider.getSurahs();
      const startSurahMeta = allSurahs.find(
        (s) => s.arabicName === setupStartSurah || s.nameArabic === setupStartSurah || s.name === setupStartSurah
      );

      if (!startSurahMeta) {
        throw new Error('يرجى التأكد من اختيار سورة البداية بشكل صحيح.');
      }

      const startPos: QuranPosition = {
        surahNumber: startSurahMeta.number,
        ayahNumber: 1,
      };

      // Resolve revision start (Ayah is always 1)
      const revStartMeta = allSurahs.find(
        (s) => s.arabicName === setupRevStartSurah || s.nameArabic === setupRevStartSurah || s.name === setupRevStartSurah
      );
      const revStartPos: QuranPosition = revStartMeta
        ? { surahNumber: revStartMeta.number, ayahNumber: 1 }
        : startPos;

      const isLinked = setupLinkageMode !== 'none';
      const effectiveRevDirection =
        setupLinkageMode === 'reverse'
          ? 'backward'
          : setupLinkageMode === 'forward'
            ? 'forward'
            : setupRevisionDirection;

      const manualRevisionRange = isLinked
        ? undefined
        : {
            start: revStartPos,
            end:
              effectiveRevDirection === 'backward'
                ? { surahNumber: 2, ayahNumber: 286 }
                : { surahNumber: 114, ayahNumber: 6 },
          };

      // Map revision amount to proper parameters
      let customRevisionDailyPages = 1;
      let customRevisionUnitsPerWindow: number | undefined = undefined;
      let customRevisionUnitKind: 'page' | 'surah' = 'page';
      let customRevisionMode: 'pages' | 'surahs' | 'quarters' | 'hizb' | 'juz' | 'lines' | 'ayahs' | 'custom' = 'pages';

      if (setupRevisionUnit === 'line') {
        customRevisionDailyPages = Math.max(1, Math.round(setupRevisionAmount / 15));
        customRevisionUnitKind = 'page';
        customRevisionMode = 'lines';
      } else if (setupRevisionUnit === 'ayah') {
        customRevisionDailyPages = 1;
        customRevisionUnitKind = 'page';
        customRevisionMode = 'ayahs';
      } else if (setupRevisionUnit === 'surah') {
        customRevisionUnitsPerWindow = Math.max(1, setupRevisionAmount);
        customRevisionDailyPages = 1;
        customRevisionUnitKind = 'surah';
        customRevisionMode = 'surahs';
      } else {
        customRevisionDailyPages = Math.max(1, setupRevisionAmount);
        customRevisionUnitKind = 'page';
        customRevisionMode = 'pages';
      }

      const built = await previewStudentQuranPlan({
        customRevisionUnitsPerWindow,
        customRevisionUnitKind,
        customRevisionMode,
        student,
        customTargetStart: startPos,
        // customTargetEnd is omitted so the engine dynamically computes it based on the calendar!
        customDirection: setupDirection,
        customRevisionDirection: effectiveRevDirection,
        customUnitType: setupUnitType,
        customDailyAmount: setupDailyAmount,
        customRevisionDailyPages,
        customConsolidationDays: setupConsolidationDays,
        customWorkingDays: setupWorkingDays,
        customSavingOffset: setupSavingOffset,
        customRevisionOffset: setupRevisionOffset,
        autoMinorRevisionMode: isLinked,
        manualRevisionRange,
      });

      // Step 2 requires explicit approval — nothing is persisted yet.
      setPreviewPlan(built);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذر توليد معاينة الخطة، يرجى مراجعة المدخلات.',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Handler — Step 2: approve & persist the previewed plan
  const handleApprovePreviewedPlan = async () => {
    if (!previewPlan) return;
    setIsSettingUp(true);
    setFeedbackMessage(null);
    try {
      await approveStudentQuranPlan(previewPlan, student);
      setIsPersistedInDatabase(true);
      setFeedbackMessage({
        type: 'success',
        text: 'تم اعتماد الخطة القرآنية وحفظها في قاعدة البيانات بنجاح.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذر حفظ الخطة المعتمدة، يرجى المحاولة مجددًا.',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Handler for recording achievement
  const handleRecordAchievement = async () => {
    if (!activePlan || !currentDayItem) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      let actualEndPosition: QuranPosition | undefined = undefined;

      if (recordAction === 'overachieved' || recordAction === 'partial' || recordAction === 'custom') {
        const allSurahs = await provider.getSurahs();
        const endMeta = allSurahs.find((s) => s.name === customEndSurah || s.name.replace(/^سورة\s+/, '') === customEndSurah);
        if (endMeta) {
          actualEndPosition = {
            surahNumber: endMeta.number,
            ayahNumber: Math.min(customEndAyah, endMeta.totalAyahs),
          };
        }
      }

      const mappedStatus =
        recordAction === 'overachieved'
          ? 'overachieved'
          : recordAction === 'partial'
          ? 'partial'
          : recordAction === 'absent'
          ? 'absent'
          : recordAction === 'unrecited'
          ? 'unrecited'
          : 'completed';

      await recordQuranPlanAchievement({
        planId: activePlan.id,
        dayDate: selectedDate,
        status: mappedStatus,
        actualEndPosition,
        evaluation,
        notes: teacherNotes,
      });

      setFeedbackMessage({
        type: 'success',
        text: 'تم تحديث الخطة المستقبلية بناءً على الإنجاز الفعلي المسجل اليوم — تم قفل اليوم في السجل التاريخي وإعادة توزيع الأيام القادمة.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء تسجيل الإنجاز.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive confirm — executes only after the explicit dialog choice
  const handleConfirmArchive = async () => {
    if (!activePlan) return;
    setIsArchiving(true);
    setFeedbackMessage(null);
    try {
      await archiveStudentQuranPlan({
        planId: activePlan.id,
        archiveMode,
      });
      setShowArchiveDialog(false);
      setFeedbackMessage({
        type: 'success',
        text:
          archiveMode === 'plan_and_achievements'
            ? 'تمت أرشفة الخطة وفصل إنجازاتها عن الحالة النشطة — محفوظة بالكامل في السجل التاريخي.'
            : 'تمت أرشفة الخطة — محفوظة بالكامل في السجل التاريخي مع إنجازاتها.',
      });
    } catch (err: any) {
      setShowArchiveDialog(false);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذرت أرشفة الخطة، يرجى المحاولة مجددًا.',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-all ${
        isFullscreen
          ? 'p-0 bg-white flex flex-col overflow-hidden'
          : 'flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto'
      }`}
    >
      <div
        className={`bg-white overflow-hidden flex flex-col transition-all ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none shadow-none'
            : 'w-full max-w-[97vw] 2xl:max-w-[1680px] h-[95vh] rounded-3xl shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-3 sm:p-4 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-lg font-black tracking-tight line-clamp-2">{student.fullName}</h3>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-white/10 text-emerald-200 border border-white/15">
                  {student.grade}
                </span>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-800/80 text-emerald-100 border border-emerald-600/40">
                  {halaqahs.find((h) => h.id === student.halaqahId)?.name || 'الحلقة'}
                </span>
                {activePlan && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    v{activePlan.planVersion || activePlan.version || 1}
                  </span>
                )}
                {activePlan && canEditPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setArchiveMode('plan_only');
                      setShowArchiveDialog(true);
                    }}
                    title="أرشفة الخطة الحالية دون حذفها — تبقى في السجل التاريخي"
                    className="px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-rose-500/15 text-rose-200 border border-rose-400/40 hover:bg-rose-500/25 hover:text-white transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Archive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline sm:inline">أرشفة الخطة</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-emerald-100/80 mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="hidden sm:inline">المعلم: {teachers.find((t) => t.id === student.teacherId)?.name || 'معلم الحلقة'}</span>
                <span className="hidden sm:inline">•</span>
                <span>الخطة القرآنية<span className="hidden sm:inline"> العامة (Universal Quran Plan)</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-white/15 rounded-lg p-0.5 flex text-[10px] sm:text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCalendarMode('hijri')}
                className={`px-2 py-1 rounded-md transition-colors ${calendarMode === 'hijri' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white hover:bg-white/10'}`}
              >
                هجري
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('gregorian')}
                className={`px-2 py-1 rounded-md transition-colors ${calendarMode === 'gregorian' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white hover:bg-white/10'}`}
              >
                ميلادي
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('none')}
                className={`px-2 py-1 rounded-md transition-colors ${calendarMode === 'none' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white hover:bg-white/10'}`}
              >
                إخفاء التاريخ
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة بالكامل'}
              aria-label={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة بالكامل'}
            >
              {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`px-5 py-3 text-xs font-bold flex items-center justify-between gap-2 border-b ${
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
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {canEditPlan ? (
            <div className="space-y-6">
              {planNeedsRebuild && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-rose-900">الخطة الحالية تحتاج إلى إعادة بناء</h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      توجد خطة مسجلة لهذا الطالب لكن بياناتها اليومية غير مكتملة. اعتماد نقطة بداية
                      جديدة أدناه سيبني خطة فصلية كاملة محفوظة في قاعدة البيانات دون المساس بسجلات
                      التسميع السابقة.
                    </p>
                  </div>
                </div>
              )}
              {/* Setup Form */}
              <form onSubmit={handleCreatePlanFromSetup} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>تحديد معايير الخطة القرآنية الفردية</span>
                </h5>

                {/* Section 1: Memorization Parameters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <span>📖</span>
                    <span>ضوابط الحفظ اليومي (البداية من الآية 1 تلقائياً — والنهاية تُحسب ديناميكياً من التقويم والمقدار)</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">سورة بداية الحفظ</label>
                      <select
                        value={setupStartSurah}
                        onChange={(e) => setSetupStartSurah(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        {getSurahsByDirection(setupDirection).map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">وحدة التخطيط</label>
                      <select
                        value={setupUnitType}
                        onChange={(e) => setSetupUnitType(e.target.value as PlanningUnitType)}
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        <option value="line">سطر مصحف (مصحف المدينة)</option>
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
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">اتجاه الحفظ</label>
                      <select
                        value={setupDirection}
                        onChange={(e) => setSetupDirection(e.target.value as PlanDirection)}
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        <option value="backward">تنازلي (الناس ← البقرة)</option>
                        <option value="forward">تصاعدي (البقرة ← الناس)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        إزاحة الحفظ (أيام)
                        {setupRevisionOffset > 0 && (
                          <span className="text-[9px] text-amber-600 font-normal mr-1">(مغلق لوجود إزاحة مراجعة)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={setupSavingOffset}
                        disabled={setupRevisionOffset > 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSetupSavingOffset(val);
                          if (val > 0) setSetupRevisionOffset(0);
                        }}
                        className={`w-full text-xs px-2.5 py-2 rounded-xl border font-bold ${
                          setupRevisionOffset > 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-900 border-slate-200'
                        }`}
                        title={
                          setupRevisionOffset > 0
                            ? 'مغلق: تم تعيين إزاحة للمراجعة (لا يمكن تفعيل إزاحتين معاً)'
                            : 'عدد أيام العمل لتأخير بدء الحفظ الجديد (فترة تهيئة وتمهيد)'
                        }
                        placeholder="0 = بدون تأخير"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Flexible Revision Parameters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                      <span>🔄</span>
                      <span>ضوابط المراجعة والتثبيت والربط التفاعلي</span>
                    </span>
                  </div>

                  {/* 3-Way Linkage Switch */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">نمط ربط المراجعة بحفظ الطالب:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSetupLinkageMode('reverse')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-right flex flex-col gap-0.5 cursor-pointer ${
                          setupLinkageMode === 'reverse'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>🔄</span>
                          <span>ربط عكسي (تلقائي)</span>
                        </div>
                        <span className={`text-[10px] ${setupLinkageMode === 'reverse' ? 'text-blue-100' : 'text-slate-600'}`}>
                          من أحدث سورة مثبتة للأقدم
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSetupLinkageMode('forward')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-right flex flex-col gap-0.5 cursor-pointer ${
                          setupLinkageMode === 'forward'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>➡️</span>
                          <span>ربط طردي (تلقائي)</span>
                        </div>
                        <span className={`text-[10px] ${setupLinkageMode === 'forward' ? 'text-blue-100' : 'text-slate-600'}`}>
                          من أول سورة محفوظة للأحدث
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSetupLinkageMode('none')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-right flex flex-col gap-0.5 cursor-pointer ${
                          setupLinkageMode === 'none'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>❌</span>
                          <span>بدون ربط (مسار مستقل)</span>
                        </div>
                        <span className={`text-[10px] ${setupLinkageMode === 'none' ? 'text-blue-100' : 'text-slate-600'}`}>
                          تحديد نطاق مراجعة حر
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {setupLinkageMode === 'none' ? (
                      <>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">سورة بداية المراجعة</label>
                          <select
                            value={setupRevStartSurah}
                            onChange={(e) => setSetupRevStartSurah(e.target.value)}
                            className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                          >
                            {ALL_114_SURAHS.map((s) => (
                              <option key={s.number} value={s.name}>
                                {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">اتجاه مسار المراجعة</label>
                          <select
                            value={setupRevisionDirection}
                            onChange={(e) => setSetupRevisionDirection(e.target.value as PlanDirection)}
                            className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                          >
                            <option value="backward">تنازلي (الناس ← البقرة)</option>
                            <option value="forward">تصاعدي (البقرة ← الناس)</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-2 bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl text-blue-900 text-xs flex items-center gap-2">
                        <span className="text-base">ℹ️</span>
                        <div>
                          <strong>نطاق المراجعة متصل تلقائياً:</strong>{' '}
                          {setupLinkageMode === 'reverse'
                            ? 'يبدأ من أحدث سورة مثبتة للطالب ويدور تنازلياً، وتدخل كل سورة جديدة فور تثبيتها.'
                            : 'يبدأ من أول سورة حُفظت ويتصاعد نحو آخر سورة مثبتة، وتتسع الدورة مع كل سورة تكتمل.'}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">وحدة المراجعة</label>
                      <select
                        value={setupRevisionUnit}
                        onChange={(e) => {
                          const u = e.target.value as 'line' | 'ayah' | 'surah' | 'page';
                          setSetupRevisionUnit(u);
                          setSetupRevisionAmount(1);
                        }}
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        <option value="line">سطور مصحف المدينة</option>
                        <option value="ayah">آيات</option>
                        <option value="surah">سور</option>
                        <option value="page">صفحات</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">مقدار المراجعة اليومية</label>
                      {setupRevisionUnit === 'line' ? (
                        <select
                          value={setupRevisionAmount}
                          onChange={(e) => setSetupRevisionAmount(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                        >
                          <option value="1">سطر واحد (1)</option>
                          <option value="2">سطران (2)</option>
                          <option value="3">3 أسطر</option>
                          <option value="5">5 أسطر</option>
                          <option value="7">7 أسطر (نصف صفحة تقريباً)</option>
                          <option value="15">15 سطراً (صفحة مصحف كاملة)</option>
                          <option value="30">30 سطراً (صفحتان)</option>
                        </select>
                      ) : setupRevisionUnit === 'ayah' ? (
                        <select
                          value={setupRevisionAmount}
                          onChange={(e) => setSetupRevisionAmount(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                        >
                          <option value="1">آية واحدة</option>
                          <option value="2">آيتان</option>
                          <option value="3">3 آيات</option>
                          <option value="5">5 آيات</option>
                          <option value="10">10 آيات</option>
                          <option value="15">15 آية</option>
                        </select>
                      ) : setupRevisionUnit === 'surah' ? (
                        <select
                          value={setupRevisionAmount}
                          onChange={(e) => setSetupRevisionAmount(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                        >
                          <option value="1">سورة واحدة (1)</option>
                          <option value="2">سورتان (2)</option>
                          <option value="3">3 سور</option>
                          <option value="4">4 سور</option>
                          <option value="5">5 سور</option>
                        </select>
                      ) : (
                        <select
                          value={setupRevisionAmount}
                          onChange={(e) => setSetupRevisionAmount(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">أيام تثبيت السورة المنتهية</label>
                      <select
                        value={setupConsolidationDays}
                        onChange={(e) => setSetupConsolidationDays(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        <option value="3">3 أيام متتالية (المعيار التربوي المعتمد)</option>
                        <option value="2">يومان</option>
                        <option value="1">يوم واحد</option>
                        <option value="0">بدون أيام تثبيت</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        إزاحة المراجعة (أيام)
                        {setupSavingOffset > 0 && (
                          <span className="text-[9px] text-amber-600 font-normal mr-1">(مغلق لوجود إزاحة حفظ)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={setupRevisionOffset}
                        disabled={setupSavingOffset > 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSetupRevisionOffset(val);
                          if (val > 0) setSetupSavingOffset(0);
                        }}
                        className={`w-full text-xs px-2.5 py-2 rounded-xl border font-bold ${
                          setupSavingOffset > 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-900 border-slate-200'
                        }`}
                        title={
                          setupSavingOffset > 0
                            ? 'مغلق: تم تعيين إزاحة للحفظ (لا يمكن تفعيل إزاحتين معاً)'
                            : 'عدد أيام العمل لتأخير بدء المراجعة وترحيل خطة المراجعة'
                        }
                        placeholder="0 = فورية"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 block">أيام التسميع الأسبوعية المعتمدة</label>
                        <button
                          type="button"
                          onClick={() => setSetupWorkingDays([0, 1, 2, 3])}
                          className="text-[9px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                          title="تطبيق الأحد إلى الأربعاء"
                        >
                          (الأحد - الأربعاء)
                        </button>
                      </div>
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
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {day.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSettingUp}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isSettingUp ? 'جارٍ توليد المعاينة...' : 'توليد معاينة الخطة القرآنية'}</span>
                  </button>
                </div>
              </form>

              {/* =====================================================
                  PREVIEW PANEL — generated plan awaiting explicit approval
                  (nothing persisted until "اعتماد وحفظ" is pressed)
                  ===================================================== */}
              {previewPlan && (
                <div
                  className={`border-2 rounded-2xl p-5 space-y-4 transition-all ${
                    isPersistedInDatabase
                      ? 'bg-slate-900/[0.03] border-emerald-700/60 shadow-md ring-1 ring-emerald-600/30'
                      : 'bg-blue-50/60 border-blue-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-5 h-5 ${isPersistedInDatabase ? 'text-emerald-700' : 'text-blue-700'}`}
                      />
                      <h5
                        className={`text-sm font-black ${
                          isPersistedInDatabase ? 'text-slate-900' : 'text-blue-950'
                        }`}
                      >
                        {isPersistedInDatabase
                          ? 'الخطة القرآنية المعتمدة (قابلة للتعديل والتحديث التلقائي)'
                          : 'معاينة الخطة المولّدة — جاهزة للاعتماد'}
                      </h5>
                    </div>
                    {isPersistedInDatabase && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <Check className="w-3.5 h-3.5" />
                        مثبتة في قاعدة البيانات
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">النموذج</span>
                      <span className="font-black text-slate-900">{previewPlan.title}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">الفترة</span>
                      <span className="font-black text-slate-900">
                        {fmtDate(previewPlan.startDate) || previewPlan.startDate} ← {fmtDate(previewPlan.endDate) || previewPlan.endDate}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">أيام العمل المولدة</span>
                      <span className="font-black text-slate-900">
                        {previewPlan.generatedPlan?.dailyPlans?.length ?? 0} يوم
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">مصدر المستهدف</span>
                      <span className="font-black text-slate-900">
                        {previewPlan.targetSource === 'explicit'
                          ? 'اختيار المعلم'
                          : previewPlan.targetSource === 'personal'
                            ? 'المستهدف الشخصي'
                            : previewPlan.targetSource === 'academic_year'
                              ? 'المستهدف الأكاديمي للصف'
                              : previewPlan.targetSource === 'student_minimum'
                                ? 'الحد الأدنى للطالب'
                                : previewPlan.targetSource === 'halaqah'
                                  ? 'مستهدف الحلقة'
                                  : previewPlan.targetSource === 'stage'
                                    ? 'مستهدف المرحلة'
                                    : previewPlan.targetSource === 'tenant'
                                      ? 'مستهدف المجمع'
                                      : 'افتراضي النموذج'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">اتجاه الحفظ</span>
                      <span className="font-black text-slate-900">
                        {previewPlan.direction === 'backward' ? 'تنازلي (الناس ← البقرة)' : 'تصاعدي (البقرة ← الناس)'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">اتجاه المراجعة</span>
                      <span className="font-black text-slate-900">
                        {previewPlan.revisionDirection === 'forward'
                          ? 'مع اتجاه الحفظ'
                          : 'عكسي (الأحدث أولًا)'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">نمط المراجعة</span>
                      <span className="font-black text-slate-900">
                        {previewPlan.autoMinorRevisionMode !== false
                          ? 'تلقائية (الأحدث أولوية)'
                          : 'يدوية (نطاق ثابت)'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">وحدة المراجعة</span>
                      <span className="font-black text-slate-900">
                        {previewPlan.revisionSettings?.unitType === 'surah'
                          ? `${previewPlan.revisionSettings?.surahsPerDay ?? 1} سور يوميًا`
                          : `${previewPlan.revisionDailyPages ?? 1} صفحة يوميًا`}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">المسارات المفعلة</span>
                      <span className="font-black text-slate-900">
                        {(previewPlan.activeTrackIds || []).includes('track_spelling')
                          ? 'قرآن + هجاء'
                          : 'قرآن فقط'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">أول يوم مقرر</span>
                      <span className="font-black text-emerald-900 font-['Amiri',serif]">
                        {previewPlan.generatedPlan?.dailyPlans?.[0]?.targetUnit?.displayLabel || '—'}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                      <span className="text-[10px] text-slate-500 block">مراجعة اليوم الأول</span>
                      <span className="font-black text-blue-900 font-['Amiri',serif]">
                        {previewPlan.generatedPlan?.dailyPlans?.[0]?.revisionDisplayLabel || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Feasibility diagnostic */}
                  {previewPlan.targetAtRiskDiagnostic?.isAtRisk && (
                    <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs">
                      <span className="font-black text-rose-900 block">⚠ تنبيه الجدوى:</span>
                      <p className="text-rose-800 mt-1 leading-relaxed">
                        {previewPlan.targetAtRiskDiagnostic.warningMessage}
                      </p>
                    </div>
                  )}

                  {/* Full-term simulation — every generated working day,
                      grouped by week. Renders the exact dailyPlans that will be
                      persisted on approval (no separate computation). */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-black text-slate-900">
                      <span>المحاكاة الكاملة للخطة — {previewPlan.generatedPlan?.dailyPlans?.length ?? 0} يوم عمل</span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {setupLinkageMode === 'none' || previewPlan.autoMinorRevisionMode === false
                          ? '(انقر على سورة الحفظ أو المراجعة للتعديل الفوري لكلا المسارين المستقلين)'
                          : '(انقر على سورة الحفظ أو الآية للتعديل الفوري — المراجعة مرتبطة ومحسوبة تلقائياً 🔒)'}
                      </span>
                    </div>
                    <div className="max-h-[calc(100vh-320px)] min-h-[420px] overflow-y-auto">
                      <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-slate-600 shadow-2xs">
                          <tr className="text-[10px]">
                            {calendarMode !== 'none' && (
                              <th className="px-3 py-2 text-right font-black whitespace-nowrap">التاريخ</th>
                            )}
                            <th className="px-3 py-2 text-right font-black whitespace-nowrap">
                              {calendarMode === 'none' ? 'اليوم المنهجي' : 'اليوم'}
                            </th>
                            <th className="px-3 py-2 text-right font-black">الحفظ والتثبيت (تعديل فوري ذكي)</th>
                            <th className="px-3 py-2 text-right font-black">
                              {setupLinkageMode === 'none' || previewPlan.autoMinorRevisionMode === false
                                ? 'المراجعة (تعديل فوري حر)'
                                : 'المراجعة (ربط آلي مع الحفظ 🔒)'}
                            </th>
                            <th className="px-3 py-2 text-right font-black">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const holidayDates = new Set(previewPlan.schedule?.holidays || []);
                            const allDays = previewPlan.generatedPlan?.dailyPlans || [];
                            const days = allDays.filter((d) => {
                              const isHoliday = d.dayType === 'holiday' || holidayDates.has(d.date);
                              if (calendarMode === 'none' && isHoliday) return false;
                              return true;
                            });

                            const weeks = new Map<number, DailyPlanItem[]>();
                            for (const d of days) {
                              const list = weeks.get(d.weekNumber) || [];
                              list.push(d);
                              weeks.set(d.weekNumber, list);
                            }
                            const statusLabel = (d: DailyPlanItem): string =>
                              d.isConsolidationDay
                                ? 'تثبيت'
                                : (
                                    {
                                      pending: 'مخطط',
                                      completed: 'مكتمل',
                                      partial: 'جزئي',
                                      overachieved: 'متجاوز',
                                      absent: 'غائب',
                                      excused: 'مستأذن',
                                      unrecited: 'لم يسمّع',
                                    } as Record<string, string>
                                  )[d.status] || 'مخطط';
                            return Array.from(weeks.entries()).map(([wNum, wDays]) => (
                              <React.Fragment key={wNum}>
                                <tr>
                                  <td
                                    colSpan={calendarMode !== 'none' ? 5 : 4}
                                    className="px-3 py-1.5 bg-blue-50/70 text-[10px] font-black text-blue-900 border-y border-blue-100"
                                  >
                                    الأسبوع {wNum}{calendarMode !== 'none' && wDays.length > 0 ? ` — ${fmtDate(wDays[0].date) || wDays[0].date} ← ${fmtDate(wDays[wDays.length - 1].date) || wDays[wDays.length - 1].date}` : ''}
                                  </td>
                                </tr>
                                {wDays.map((d) => {
                                  const isHoliday = d.dayType === 'holiday' || holidayDates.has(d.date);
                                  if (isHoliday) {
                                    return (
                                      <tr key={d.id} className="bg-purple-50/70 border-y border-purple-100/90">
                                        <td
                                          colSpan={calendarMode !== 'none' ? 5 : 4}
                                          className="px-3 py-2 text-center text-purple-950 font-bold text-xs"
                                        >
                                          <div className="flex items-center justify-center gap-2">
                                            <span className="text-sm">🏖️</span>
                                            <span className="font-extrabold text-purple-950">إجازة رسمية معتمدة (لا يوجد تسميع)</span>
                                            <span className="text-purple-300 font-sans text-xs">•</span>
                                            <span className="text-purple-800 font-sans text-[11px] font-bold">
                                              {fmtDate(d.date) || d.date} ({d.dayName})
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                                    {calendarMode !== 'none' && (
                                      <td className="px-3 py-1.5 whitespace-nowrap font-bold text-slate-700 text-[10px]">
                                        {fmtDate(d.date) || d.date}
                                      </td>
                                    )}
                                    <td className="px-3 py-1.5 whitespace-nowrap text-slate-800 font-bold text-[10px]">
                                      {calendarMode === 'none' ? `اليوم ${d.itemIndex}` : d.dayName}
                                    </td>
                                    <td className="px-3 py-1.5 font-bold text-slate-900 font-['Amiri',serif]">
                                      {d.isConsolidationDay ? (
                                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 shadow-2xs font-['Amiri',serif]">
                                          <span className="text-amber-950 font-black text-xs">
                                            تثبيت سورة {getSurahArabicName(d.consolidationSurahNumber || 114)}
                                          </span>
                                          <span className="text-slate-300 font-sans text-[10px]">|</span>
                                          <span className="text-xs font-bold text-amber-900 font-sans">
                                            تكرار {d.consolidationDayIndex || 1}
                                          </span>
                                          <select
                                            value={previewPlan.consolidationDaysPerSurah || 3}
                                            onChange={(e) => handleInlineConsolidationDaysChange(Number(e.target.value))}
                                            className="bg-white/95 border border-amber-300 text-amber-950 font-bold rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 text-[11px] font-sans"
                                            title="تعديل إجمالي عدد مرات التكرار"
                                          >
                                            <option value={1}>تكرار 1</option>
                                            <option value={2}>تكرار 2</option>
                                            <option value={3}>تكرار 3</option>
                                            <option value={4}>تكرار 4</option>
                                            <option value={5}>تكرار 5</option>
                                          </select>
                                        </div>
                                      ) : d.dayType === 'general_revision' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold font-['Amiri',serif]">
                                          تثبيت ومراجعة عامة
                                        </span>
                                      ) : (
                                        <div className="inline-flex items-center gap-1.5 font-['Amiri',serif] text-slate-900 font-bold bg-white/90 hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 rounded-lg px-2.5 py-1 transition-all shadow-2xs">
                                          <select
                                            value={d.targetUnit?.start?.surahNumber || 114}
                                            onChange={(e) =>
                                              handleInlineSurahOrAyahChange(
                                                d.id,
                                                Number(e.target.value),
                                                1
                                              )
                                            }
                                            className="bg-transparent font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 hover:bg-blue-100/50 text-xs"
                                            title="تغيير سورة الحفظ"
                                          >
                                            {SURAHS_LIST.map((s) => (
                                              <option key={s.number} value={s.number}>
                                                سورة {s.name}
                                              </option>
                                            ))}
                                          </select>
                                          {d.targetUnit && (
                                            <span className="text-blue-900/80 font-sans text-[11px] font-bold">
                                              {d.targetUnit.start?.ayahNumber === 1 &&
                                              d.targetUnit.end?.ayahNumber ===
                                                (getSurahAyahsCount(d.targetUnit.start?.surahNumber || 114) || 1)
                                                ? '(كاملة)'
                                                : `(${d.targetUnit.start?.ayahNumber || 1} - ${
                                                    d.targetUnit.end?.ayahNumber ===
                                                    (getSurahAyahsCount(d.targetUnit.end?.surahNumber || 114) || 1)
                                                      ? 'نهاية السورة'
                                                      : d.targetUnit.end?.ayahNumber
                                                  })`}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-slate-700 font-['Amiri',serif]">
                                      {(() => {
                                        const isRevisionLinked = setupLinkageMode !== 'none' && previewPlan.autoMinorRevisionMode !== false;
                                        if (isRevisionLinked) {
                                          return (
                                            <div
                                              className="inline-flex items-center gap-1.5 font-['Amiri',serif] text-slate-800 font-bold bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 shadow-2xs"
                                              title="المراجعة مرتبطة آلياً بحفظ الطالب ومحسوبة تلقائياً (غير قابلة للتعديل اليدوي في وضع الربط)"
                                            >
                                              <span className="text-[10px] text-slate-400 font-sans">🔒</span>
                                              <span className="text-emerald-950 font-bold">
                                                {d.revisionDisplayLabel || '—'}
                                              </span>
                                            </div>
                                          );
                                        }

                                        const parsedRev = parseRevisionLabel(d.revisionDisplayLabel);
                                        return (
                                          <div className="inline-flex items-center gap-1 font-['Amiri',serif] text-slate-800 font-bold bg-white/90 hover:bg-emerald-50/80 border border-slate-200/90 hover:border-emerald-300 rounded-lg px-2 py-0.5 transition-all shadow-2xs">
                                            <span className="text-emerald-800 font-sans text-[10px]">مراجعة:</span>
                                            <select
                                              value={parsedRev.startSurah}
                                              onChange={(e) =>
                                                handleInlineRevisionChange(
                                                  d.id,
                                                  Number(e.target.value),
                                                  parsedRev.startAyah,
                                                  Number(e.target.value),
                                                  parsedRev.endAyah
                                                )
                                              }
                                              className="bg-transparent font-bold text-emerald-950 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 hover:bg-emerald-100/50 text-xs"
                                              title="تغيير سورة المراجعة"
                                            >
                                              {SURAHS_LIST.map((s) => (
                                                <option key={s.number} value={s.number}>
                                                  سورة {s.name}
                                                </option>
                                              ))}
                                            </select>
                                            <span className="text-slate-400 font-sans text-[10px]">من</span>
                                            <select
                                              value={parsedRev.startAyah}
                                              onChange={(e) =>
                                                handleInlineRevisionChange(
                                                  d.id,
                                                  parsedRev.startSurah,
                                                  Number(e.target.value),
                                                  parsedRev.endSurah,
                                                  parsedRev.endAyah
                                                )
                                              }
                                              className="bg-transparent font-bold text-emerald-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 hover:bg-emerald-100/50 font-sans text-[11px]"
                                              title="آية بداية المراجعة"
                                            >
                                              {Array.from(
                                                { length: getSurahAyahsCount(parsedRev.startSurah) || 1 },
                                                (_, i) => i + 1
                                              ).map((a) => (
                                                <option key={a} value={a}>
                                                  آية {a}
                                                </option>
                                              ))}
                                            </select>
                                            <span className="text-slate-400 font-sans text-[10px]">إلى</span>
                                            <select
                                              value={parsedRev.endAyah}
                                              onChange={(e) =>
                                                handleInlineRevisionChange(
                                                  d.id,
                                                  parsedRev.startSurah,
                                                  parsedRev.startAyah,
                                                  parsedRev.endSurah,
                                                  Number(e.target.value)
                                                )
                                              }
                                              className="bg-transparent font-bold text-emerald-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 py-0.5 hover:bg-emerald-100/50 font-sans text-[11px]"
                                              title="آية نهاية المراجعة"
                                            >
                                              {Array.from(
                                                {
                                                  length:
                                                    getSurahAyahsCount(parsedRev.endSurah) || 1,
                                                },
                                                (_, i) => i + 1
                                              ).map((a, _, arr) => (
                                                <option key={a} value={a}>
                                                  {a === arr.length ? 'نهاية السورة' : `آية ${a}`}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                          d.isConsolidationDay
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {statusLabel(d)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleApprovePreviewedPlan}
                      disabled={isSettingUp}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {isSettingUp
                          ? 'جارٍ الحفظ...'
                          : isPersistedInDatabase
                          ? 'حفظ التعديلات في قاعدة البيانات'
                          : 'اعتماد وحفظ الخطة في قاعدة البيانات'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            ) : (
            /* Read-only view: teacher sees the student's Quran data without edit surfaces */
            <div className="space-y-4">
              {planNeedsRebuild && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-bold text-rose-800">
                  توجد خطة مسجلة لهذا الطالب لكن بياناتها غير مكتملة وتحتاج إعادة بناء من قبل المشرف المختص.
                </div>
              )}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h4 className="text-xs font-black text-slate-900 mb-3">بيانات الطالب القرآنية الحالية</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">نقطة البداية</span>
                    <span className="font-black text-slate-900">
                      سورة {student.currentSurah || '—'} • آية {student.currentAyah || '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">النهاية (المستهدف)</span>
                    <span className="font-black text-slate-900">
                      سورة {student.minimumTargetSurah || '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">مقدار الحفظ اليومي</span>
                    <span className="font-black text-slate-900">
                      {activePlan?.dailyAmount
                        ? `${activePlan.dailyAmount} ${
                            (
                              {
                                ayah: 'آيات',
                                line: 'أسطر',
                                half_page: 'نصف صفحة',
                                quarter_page: 'ربع صفحة',
                                page: 'صفحة',
                                surah: 'سورة',
                                juz: 'جزء',
                                quarter: 'ربع حزب',
                                hizb: 'حزب',
                              } as Record<string, string>
                            )[activePlan.unitType] || ''
                          }`
                        : '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">مقدار المراجعة اليومية</span>
                    <span className="font-black text-slate-900">
                      {activePlan?.revisionDailyPages !== undefined
                        ? `${activePlan.revisionDailyPages} صفحة`
                        : '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">اتجاه الحفظ</span>
                    <span className="font-black text-slate-900">
                      {activePlan?.direction === 'forward'
                        ? 'تصاعدي (البقرة ← الناس)'
                        : activePlan?.direction === 'backward'
                          ? 'تنازلي (الناس ← البقرة)'
                          : '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">الحلقة</span>
                    <span className="font-black text-slate-900">
                      {halaqahs.find((h) => h.id === student.halaqahId)?.name || '—'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-center text-[11px] text-slate-500">
                لا توجد خطة قرآنية معتمدة لهذا الطالب حتى الآن — عرض فقط، ويتم اعتماد الخطة من قبل الإدارة أو المشرف المختص.
              </p>
            </div>
          )}
        </div>
        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>نظام التخطيط القرآني العام – معتمد وفق الضوابط الشرعية والتربوية</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
        {/* =====================================================
            ARCHIVE CONFIRMATION DIALOG — two explicit options,
            no action until "أرشفة الخطة" is pressed.
            ===================================================== */}
        {showArchiveDialog && activePlan && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
              {/* Dialog header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="w-4.5 h-4.5 w-5 h-5 text-amber-300" />
                  <h4 className="text-sm font-black">أرشفة الخطة الحالية</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowArchiveDialog(false)}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  سيتم إيقاف الخطة الحالية ونقلها إلى الأرشيف الزمني.
                  لن يتم حذفها نهائيًا — تبقى كاملة في السجل التاريخي.
                </p>

                {/* Option cards */}
                <label
                  className={`block rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                    archiveMode === 'plan_only'
                      ? 'border-emerald-500 bg-emerald-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="archive_mode"
                      checked={archiveMode === 'plan_only'}
                      onChange={() => setArchiveMode('plan_only')}
                      className="mt-0.5 accent-emerald-700"
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">أرشفة الخطة فقط</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        يتم أرشفة الخطة الحالية مع الاحتفاظ بجميع الإنجازات والتقييمات
                        والتسجيلات المرتبطة بها.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                    archiveMode === 'plan_and_achievements'
                      ? 'border-amber-500 bg-amber-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="archive_mode"
                      checked={archiveMode === 'plan_and_achievements'}
                      onChange={() => setArchiveMode('plan_and_achievements')}
                      className="mt-0.5 accent-amber-700"
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        أرشفة الخطة والإنجازات المرتبطة بها
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        يتم أرشفة الخطة الحالية وجميع الإنجازات والتسجيلات المرتبطة بها
                        ضمن السجل التاريخي، لتبدأ الخطة الجديدة دون اعتبار هذه الإنجازات
                        جزءًا من الخطة النشطة.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Warning */}
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    تنبيه مهم
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    هذه العملية ستنهي الخطة الحالية وتحوّلها إلى سجل تاريخي غير نشط.
                    لا يمكن استخدام إنجازاتها كأساس للخطة الجديدة إلا من خلال السجل التاريخي.
                  </p>
                  {archiveMode === 'plan_and_achievements' && (
                    <p className="text-[11px] text-amber-900 font-bold leading-relaxed border-t border-amber-200 pt-1.5">
                      سيتم فصل الإنجازات الحالية عن الخطة النشطة حتى تبدأ الخطة الجديدة
                      من نقطة مستقلة.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowArchiveDialog(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmArchive}
                    disabled={isArchiving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isArchiving ? 'جارٍ الأرشفة...' : 'أرشفة الخطة'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
