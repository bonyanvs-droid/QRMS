import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import { Student } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { useApp } from '../../context/AppContext';
import {
  StudentQuranPlan,
  DailyPlanItem,
  PlanDirection,
} from '../../quran/types/plan';
import { QuranPosition, PlanningUnitType } from '../../quran/types';
import { SURAHS_LIST } from '../../data/initialData';
import { ALL_114_SURAHS, getSurahsByDirection, getSurahAyahsCount } from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { BundledQuranProvider } from '../../quran/providers/BundledQuranProvider';
import { getArabicDayName, formatDateString } from '../../quran/utils/dateUtils';
import { StageQuranConfig } from '../../quran/models/stageConfig';
import { formatQuranTextExpression } from '../../quran/utils/positionFormatter';
import { StageConfigModal } from './StageConfigModal';
import { Sliders } from 'lucide-react';

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
    createStudentQuranPlan,
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

  // Setup Form State (for students needing initial starting point setup)
  const [showStageConfigsModal, setShowStageConfigsModal] = useState<boolean>(false);
  const [selectedStageConfigId, setSelectedStageConfigId] = useState<string>('');
  const [setupStartSurah, setSetupStartSurah] = useState<string>('الناس');
  const [setupStartAyah, setSetupStartAyah] = useState<number>(1);
  const [setupEndSurah, setSetupEndSurah] = useState<string>('الفيل');
  const [setupEndAyah, setSetupEndAyah] = useState<number>(5);
  const [setupDirection, setSetupDirection] = useState<PlanDirection>('backward');
  const [setupUnitType, setSetupUnitType] = useState<PlanningUnitType>('ayah');
  const [setupDailyAmount, setSetupDailyAmount] = useState<number>(2);
  const [setupRevisionDailyPages, setSetupRevisionDailyPages] = useState<number>(1);
  const [setupConsolidationDays, setSetupConsolidationDays] = useState<number>(3);
  const [setupWorkingDays, setSetupWorkingDays] = useState<number[]>([0, 1, 2, 3]);
  const [setupAutoMinorRevision, setSetupAutoMinorRevision] = useState<boolean>(true);
  // Manual minor-revision range (required when auto mode is off)
  const [setupRevStartSurah, setSetupRevStartSurah] = useState<string>('الفاتحة');
  const [setupRevStartAyah, setSetupRevStartAyah] = useState<number>(1);
  const [setupRevEndSurah, setSetupRevEndSurah] = useState<string>('الناس');
  const [setupRevEndAyah, setSetupRevEndAyah] = useState<number>(6);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);

  // Stage config matched to the student's grade (used for setup defaults & read-only summary)
  const matchedStageConfig = useMemo(
    () =>
      student
        ? quranStageConfigs.find((c) => c.targetGrades.includes(student.grade) && c.isActive) ||
          quranStageConfigs[0]
        : undefined,
    [student, quranStageConfigs]
  );

  // Auto-fill setup defaults when student changes — the suggested starting
  // position is the FIRST UNMEMORIZED verse after the last actually-recorded
  // achievement (session records are the source of truth, student record is
  // the fallback). A rebuilt plan always continues forward from actual
  // achievement — it never replays or loses recorded progress.
  useEffect(() => {
    if (student) {
      const latestMemRec = sessionRecords
        .filter((r) => r.studentId === student.id && r.memorization?.surahTo)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      let recordedSurah = latestMemRec?.memorization?.surahTo || student.currentSurah;
      let recordedAyah = latestMemRec?.memorization?.ayahTo || student.currentAyah || 1;

      // Advance to the next position in the plan's direction: ayah+1 within
      // the same surah, or the next surah's ayah 1 when the surah is done.
      if (recordedSurah) {
        const directionForAdvance =
          (quranStageConfigs.find((c) => c.targetGrades.includes(student.grade) && c.isActive) ||
            quranStageConfigs[0])?.memorization?.defaultDirection || setupDirection;
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

      // Match a stage config template
      const matchedConfig = quranStageConfigs.find((c) =>
        c.targetGrades.includes(student.grade) && c.isActive
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

  // When stage config template changes in setup form
  const handleStageConfigChange = async (configId: string) => {
    setSelectedStageConfigId(configId);
    const cfg = quranStageConfigs.find((c) => c.id === configId);
    if (!cfg) return;

    if (cfg.memorization) {
      setSetupDailyAmount(cfg.memorization.defaultDailyAmount);
      setSetupUnitType(cfg.memorization.unitType as any);
      setSetupDirection(cfg.memorization.defaultDirection);

      // Resolve surah names
      const startMeta = await provider.getSurah(cfg.memorization.defaultTargetStart.surahNumber);
      const endMeta = await provider.getSurah(cfg.memorization.defaultTargetEnd.surahNumber);
      if (startMeta) setSetupStartSurah(startMeta.arabicName || startMeta.name);
      if (endMeta) setSetupEndSurah(endMeta.arabicName || endMeta.name);
      setSetupStartAyah(cfg.memorization.defaultTargetStart.ayahNumber);
      setSetupEndAyah(cfg.memorization.defaultTargetEnd.ayahNumber);
    }

    if (cfg.revision) {
      setSetupRevisionDailyPages(cfg.revision.defaultDailyPages ?? 1);
    }
    if (cfg.consolidationDays !== undefined) {
      setSetupConsolidationDays(cfg.consolidationDays);
    }
    if (cfg.schedule?.workingDays) {
      setSetupWorkingDays(cfg.schedule.workingDays);
    }
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

  // Handler for creating plan from Setup Form
  const handleCreatePlanFromSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    setFeedbackMessage(null);

    try {
      // Resolve start and end positions
      const allSurahs = await provider.getSurahs();
      const startSurahMeta = allSurahs.find(
        (s) => s.arabicName === setupStartSurah || s.nameArabic === setupStartSurah || s.name === setupStartSurah
      );
      const endSurahMeta = allSurahs.find(
        (s) => s.arabicName === setupEndSurah || s.nameArabic === setupEndSurah || s.name === setupEndSurah
      );

      if (!startSurahMeta || !endSurahMeta) {
        throw new Error('يرجى التأكد من اختيار السور بشكل صحيح.');
      }

      const startPos: QuranPosition = {
        surahNumber: startSurahMeta.number,
        ayahNumber: Math.min(setupStartAyah, startSurahMeta.totalAyahs),
      };

      const endPos: QuranPosition = {
        surahNumber: endSurahMeta.number,
        ayahNumber: Math.min(setupEndAyah, endSurahMeta.totalAyahs),
      };

      // Manual minor-revision range — required when auto mode is off
      let manualRevisionRange: { start: QuranPosition; end: QuranPosition } | undefined;
      if (!setupAutoMinorRevision) {
        const revStartMeta = allSurahs.find(
          (s) => s.arabicName === setupRevStartSurah || s.nameArabic === setupRevStartSurah || s.name === setupRevStartSurah
        );
        const revEndMeta = allSurahs.find(
          (s) => s.arabicName === setupRevEndSurah || s.nameArabic === setupRevEndSurah || s.name === setupRevEndSurah
        );
        if (!revStartMeta || !revEndMeta) {
          throw new Error('يرجى تحديد نطاق المراجعة (البداية والنهاية) بشكل صحيح.');
        }
        manualRevisionRange = {
          start: {
            surahNumber: revStartMeta.number,
            ayahNumber: Math.min(setupRevStartAyah, revStartMeta.totalAyahs),
          },
          end: {
            surahNumber: revEndMeta.number,
            ayahNumber: Math.min(setupRevEndAyah, revEndMeta.totalAyahs),
          },
        };
      }

      await createStudentQuranPlan({
        student,
        customTargetStart: startPos,
        customTargetEnd: endPos,
        customDirection: setupDirection,
        customUnitType: setupUnitType,
        customDailyAmount: setupDailyAmount,
        customRevisionDailyPages: setupRevisionDailyPages,
        customConsolidationDays: setupConsolidationDays,
        customWorkingDays: setupWorkingDays,
        autoMinorRevisionMode: setupAutoMinorRevision,
        manualRevisionRange,
      });

      setFeedbackMessage({
        type: 'success',
        text: 'تم اعتماد نقطة البداية وتوليد الخطة القرآنية بنجاح.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'تعذر إنشاء الخطة، يرجى مراجعة المدخلات.',
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
        text: 'تم قفل اليوم التاريخي وإعادة جدولة الأيام المستقبلية بنجاح.',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-3 sm:p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
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
              </div>
              <p className="text-[10px] sm:text-xs text-emerald-100/80 mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="hidden sm:inline">المعلم: {teachers.find((t) => t.id === student.teacherId)?.name || 'معلم الحلقة'}</span>
                <span className="hidden sm:inline">•</span>
                <span>الخطة القرآنية<span className="hidden sm:inline"> العامة (Universal Quran Plan)</span></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
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
          {!activePlan || planNeedsRebuild ? (
            /* ============================================================
               STATE 1: Student Needs Starting Point Setup (يحتاج تحديد نقطة البداية)
               ============================================================ */
            canEditPlan ? (
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
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">
                    يحتاج تحديد نقطة البداية (Starting Point Setup Required)
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                    لا تتوفر لهذا الطالب خطة قرآنية معتمدة حتى الآن، أو أن بيانات موضع الحفظ بحاجة إلى
                    تأكيد. تطبيقاً للقواعد الوقائية للمنظومة، لا يتم تخمين الموضع أو إنشاء نقاط عشوائية، بل
                    يجب اعتماد نقطة البداية والمستهدف من قِبل المعلم لبناء الخطة الفعلية.
                  </p>
                </div>
              </div>

              {/* Setup Form */}
              <form onSubmit={handleCreatePlanFromSetup} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>تحديد معايير الخطة القرآنية الفردية</span>
                </h5>

                {/* Stage Template Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      اختر نموذج المرحلة المعتمد (أو خصص يدوياً)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowStageConfigsModal(true)}
                      className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-emerald-100/80 hover:bg-emerald-200/90 px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs transition-all"
                      title="فتح إدارة وتعديل وإضافة نماذج وقوالب المراحل المعتمدة"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                      <span>⚙️ إدارة وتعديل النماذج</span>
                    </button>
                  </div>
                  <select
                    value={selectedStageConfigId}
                    onChange={(e) => handleStageConfigChange(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-emerald-700 shadow-2xs text-slate-900"
                  >
                    {quranStageConfigs.map((cfg) => (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.name} – {cfg.memorization?.defaultDirection === 'backward' ? 'تنازلي (جزء عم)' : 'تصاعدي'} ({cfg.memorization?.defaultDailyAmount || 1}{' '}
                        {cfg.memorization?.unitType === 'ayah' ? 'آيات' : 'صفحة'} يومياً)
                      </option>
                    ))}
                  </select>
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
                            if (setupStartAyah > maxAyahs) {
                              setSetupStartAyah(maxAyahs);
                            }
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
                            if (setupEndAyah > maxAyahs) {
                              setSetupEndAyah(maxAyahs);
                            }
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

                {/* Additional Settings: Revision Pages, Consolidation Days, Working Days */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">مقدار المراجعة اليومية</label>
                    <select
                      value={setupRevisionDailyPages}
                      onChange={(e) => setSetupRevisionDailyPages(parseFloat(e.target.value) || 1)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
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
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">تثبيت السورة المنتهية</label>
                    <select
                      value={setupConsolidationDays}
                      onChange={(e) => setSetupConsolidationDays(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="3">3 أيام متتالية (معياري)</option>
                      <option value="2">يومان</option>
                      <option value="1">يوم واحد</option>
                      <option value="0">بدون أيام تثبيت</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 block">أيام التسميع</label>
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
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
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

                {/* Auto Minor Revision toggle — ON by default for new plans */}
                <label className="flex items-center justify-between gap-3 bg-emerald-50/60 border border-emerald-200 rounded-xl px-3.5 py-2.5 cursor-pointer">
                  <span className="min-w-0">
                    <span className="text-xs font-bold text-emerald-950 block">المراجعة الصغرى التلقائية</span>
                    <span className="text-[10px] text-emerald-800/80 block mt-0.5">
                      يحدد المحرك نطاق المراجعة اليومية تلقائيًا من المحفوظ السابق + الجديد (يبقى مقدار المراجعة قابلًا للضبط أعلاه)
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={setupAutoMinorRevision}
                    onChange={(e) => setSetupAutoMinorRevision(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700 shrink-0"
                  />
                </label>

                {/* Manual minor-revision range — shown when auto mode is OFF */}
                {!setupAutoMinorRevision && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-3">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      نطاق المراجعة اليدوي — حدد بداية ونهاية ما يراجعه الطالب
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[11px] font-bold text-amber-800 block">بداية المراجعة</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">السورة</label>
                            <select
                              value={setupRevStartSurah}
                              onChange={(e) => {
                                const ns = e.target.value;
                                setSetupRevStartSurah(ns);
                                const max = getSurahAyahsCount(ns);
                                if (setupRevStartAyah > max) setSetupRevStartAyah(max);
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
                              id="setup_rev_start_ayah"
                              surah={setupRevStartSurah}
                              value={setupRevStartAyah}
                              onChange={setSetupRevStartAyah}
                              label="الآية"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[11px] font-bold text-amber-800 block">نهاية المراجعة</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">السورة</label>
                            <select
                              value={setupRevEndSurah}
                              onChange={(e) => {
                                const ns = e.target.value;
                                setSetupRevEndSurah(ns);
                                const max = getSurahAyahsCount(ns);
                                if (setupRevEndAyah > max) setSetupRevEndAyah(max);
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
                              id="setup_rev_end_ayah"
                              surah={setupRevEndSurah}
                              value={setupRevEndAyah}
                              onChange={setSetupRevEndAyah}
                              label="الآية"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-800/80">
                      يُزرع هذا النطاق كمجموعة المراجعة الصغرى للطالب — مقدار المراجعة اليومية يُضبط من الحقل أعلاه.
                    </p>
                  </div>
                )}

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSettingUp}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isSettingUp ? 'جارٍ توليد الخطة...' : 'اعتماد نقطة البداية وتوليد الخطة القرآنية'}</span>
                  </button>
                </div>
              </form>
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
                      {matchedStageConfig?.memorization
                        ? `${matchedStageConfig.memorization.defaultDailyAmount} ${
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
                            )[matchedStageConfig.memorization.unitType] || ''
                          }`
                        : '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">مقدار المراجعة اليومية</span>
                    <span className="font-black text-slate-900">
                      {matchedStageConfig?.revision?.defaultDailyPages !== undefined
                        ? `${matchedStageConfig.revision.defaultDailyPages} صفحة`
                        : '—'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <span className="text-[10px] text-slate-500 block mb-0.5">اتجاه الحفظ</span>
                    <span className="font-black text-slate-900">
                      {matchedStageConfig?.memorization?.defaultDirection === 'forward'
                        ? 'تصاعدي (الفاتحة ← الناس)'
                        : 'تنازلي (الناس ← الفاتحة)'}
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
            )
          ) : (
            /* ============================================================
               STATE 2: Student HAS Active Plan (View & Record Achievement)
               ============================================================ */
            <div className="space-y-6">
              {/* At-Risk Warning Diagnostic Banner */}
              {activePlan.targetAtRiskDiagnostic?.isAtRisk && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black text-rose-900">
                      تنبيه تشخيصي: الخطة معرضة لخطر التأخر عن الهدف الفصلي
                    </h5>
                    <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                      {activePlan.targetAtRiskDiagnostic.warningMessage}
                    </p>
                    {(activePlan.targetAtRiskDiagnostic.actionableRecommendations || []).length > 0 && (
                      <ul className="text-[11px] text-rose-950 mt-1.5 space-y-0.5 list-disc list-inside font-semibold">
                        {activePlan.targetAtRiskDiagnostic.actionableRecommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* View Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('today')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'today'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📌 ورد اليوم والتسميع
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'week'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 الأسبوع
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'month'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗓️ الشهر
                  </button>
                  <button
                    onClick={() => setViewMode('semester')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'semester'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎯 الفصل والمسار
                  </button>
                </div>

                {/* Quick Indicators */}
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    <span>المستهدف: {activePlan.originalTarget?.displayTarget || 'محدد بالخطة'}</span>
                  </span>
                  <span>•</span>
                  <span>{planMetrics.completionPercentage}% منجز</span>
                </div>
              </div>

              {/* TAB 1: TODAY'S RECITATION & ACHIEVEMENT RECORDING */}
              {viewMode === 'today' && (
                <div className="space-y-5">
                  {/* Date Navigation Bar */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-800">
                        {currentDayItem
                          ? `${currentDayItem.dayName} (${currentDayItem.date})`
                          : selectedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600"
                      >
                        {activePlan.generatedPlan?.dailyPlans?.map((d) => (
                          <option key={d.date} value={d.date}>
                            {d.dayName} {d.date} {d.status === 'completed' ? '✓' : d.status === 'absent' ? '✗' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Today's Assigned Portion Card */}
                  {currentDayItem ? (
                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white rounded-2xl p-5 border border-emerald-200/80 shadow-2xs space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                            📖 ورد اليوم المقرر (Assigned Portion)
                          </span>
                          <h4 className="text-lg font-black text-slate-900 font-['Amiri',serif]">
                            {formatQuranTextExpression(currentDayItem.targetUnit?.displayLabel) || 'المقرر اليومي'}
                          </h4>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            currentDayItem.status === 'completed' || currentDayItem.status === 'overachieved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : currentDayItem.status === 'partial'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : currentDayItem.status === 'absent'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : currentDayItem.status === 'unrecited'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {currentDayItem.status === 'completed'
                            ? 'أنجز بالكامل ✓'
                            : currentDayItem.status === 'overachieved'
                            ? 'فائض إنجاز ★'
                            : currentDayItem.status === 'partial'
                            ? 'إنجاز جزئي'
                            : currentDayItem.status === 'absent'
                            ? 'غياب'
                            : currentDayItem.status === 'unrecited'
                            ? 'لم يسمّع'
                            : 'في انتظار التسميع'}
                        </span>
                      </div>

                      {/* Specs Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-500 block">من</span>
                          <span className="font-bold text-slate-800">
                            آية {currentDayItem.targetUnit?.start?.ayahNumber}
                          </span>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-500 block">إلى</span>
                          <span className="font-bold text-slate-800">
                            آية {currentDayItem.targetUnit?.end?.ayahNumber}
                          </span>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-500 block">المقدار المقرر</span>
                          <span className="font-bold text-slate-800">
                            {currentDayItem.targetUnit?.totalAyahs || activePlan.dailyAmount} آيات
                          </span>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                          <span className="text-[10px] text-slate-500 block">
                            {currentDayItem.targetUnit?.revisionDisplay || currentDayItem.revisionDisplayLabel ? 'المراجعة المقررة' : 'الأسبوع الدراسي'}
                          </span>
                          <span className="font-bold text-blue-800">
                            {currentDayItem.targetUnit?.revisionDisplay || currentDayItem.revisionDisplayLabel 
                              ? (currentDayItem.targetUnit?.revisionDisplay || currentDayItem.revisionDisplayLabel)
                              : `الأسبوع ${currentDayItem.weekNumber}`}
                          </span>
                        </div>
                      </div>

                      {/* If Already Recorded, Show Historical Locked Achievement */}
                      {currentDayItem.isLocked && currentDayItem.actualAchieved && (
                        <div className="bg-white rounded-xl p-3.5 border border-slate-200 mt-2 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تم قفل وتسجيل هذا اليوم في السجل التاريخي</span>
                            </span>
                            <span className="text-[11px] text-slate-500">
                              سُجّل بواسطة: {currentDayItem.actualAchieved.recordedBy}
                            </span>
                          </div>
                          {currentDayItem.actualAchieved.notes && (
                            <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg mt-1">
                              ملاحظة: {currentDayItem.actualAchieved.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-500 text-xs">
                      هذا اليوم غير مدرج في جدول أيام الحفظ المعتمدة للطالب.
                    </div>
                  )}

                  {/* Interactive Achievement Recording Section — permission-gated */}
                  {currentDayItem && canEditPlan && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                      <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>تسجيل الإنجاز الفعلي لليوم (Daily Recitation Recording)</span>
                      </h5>

                      {/* Action Choice Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setRecordAction('completed')}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-right cursor-pointer ${
                            recordAction === 'completed'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🟢</span>
                            {recordAction === 'completed' && <Check className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <span className="block font-bold">أنجز المخطط</span>
                          <span className="text-[10px] text-slate-500 font-normal">تمت تلاوة الورد المقرر بالكامل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordAction('overachieved')}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-right cursor-pointer ${
                            recordAction === 'overachieved'
                              ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🔵</span>
                            {recordAction === 'overachieved' && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                          <span className="block font-bold">أنجز أكثر (فائض)</span>
                          <span className="text-[10px] text-slate-500 font-normal">تجاوز الورد وحفظ آيات إضافية</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordAction('partial')}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-right cursor-pointer ${
                            recordAction === 'partial'
                              ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🟡</span>
                            {recordAction === 'partial' && <Check className="w-4 h-4 text-amber-600" />}
                          </div>
                          <span className="block font-bold">أنجز أقل (جزئي)</span>
                          <span className="text-[10px] text-slate-500 font-normal">سمّع جزءاً فقط من المقرر</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordAction('absent')}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-right cursor-pointer ${
                            recordAction === 'absent'
                              ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🔴</span>
                            {recordAction === 'absent' && <Check className="w-4 h-4 text-rose-600" />}
                          </div>
                          <span className="block font-bold">غياب</span>
                          <span className="text-[10px] text-slate-500 font-normal">ترحيل الورد للأيام القادمة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordAction('unrecited')}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-right cursor-pointer ${
                            recordAction === 'unrecited'
                              ? 'bg-slate-100 border-slate-500 text-slate-900 ring-2 ring-slate-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">⚪</span>
                            {recordAction === 'unrecited' && <Check className="w-4 h-4 text-slate-600" />}
                          </div>
                          <span className="block font-bold">لم يسمّع</span>
                          <span className="text-[10px] text-slate-500 font-normal">حاضر وتأجل تسميعه</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordAction('custom')}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-right cursor-pointer ${
                            recordAction === 'custom'
                              ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm">🟣</span>
                            {recordAction === 'custom' && <Check className="w-4 h-4 text-purple-600" />}
                          </div>
                          <span className="block font-bold">إنجاز مخصص</span>
                          <span className="text-[10px] text-slate-500 font-normal">تحديد الموضع الفعلي المنجز</span>
                        </button>
                      </div>

                      {/* Custom Position Picker if Overachieved, Partial, or Custom */}
                      {(recordAction === 'overachieved' || recordAction === 'partial' || recordAction === 'custom') && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <span className="text-xs font-bold text-slate-800 block">
                            الموضع الفعلي الذي وصل إليه الطالب:
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">السورة الفعلية</label>
                              <select
                                value={customEndSurah}
                                onChange={(e) => {
                                  const newSurah = e.target.value;
                                  setCustomEndSurah(newSurah);
                                  const maxAyahs = getSurahAyahsCount(newSurah);
                                  if (customEndAyah > maxAyahs) {
                                    setCustomEndAyah(maxAyahs);
                                  }
                                }}
                                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                              >
                                {getSurahsByDirection(activePlan?.direction || 'backward').map((s) => (
                                  <option key={s.number} value={s.name}>
                                    {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <QuranAyahSelect
                                id="custom_end_ayah"
                                surah={customEndSurah}
                                value={customEndAyah}
                                onChange={setCustomEndAyah}
                                label="آخر آية أنجزها"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Evaluation and Teacher Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">التقييم العام للورد</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEvaluation('excellent')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                evaluation === 'excellent'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              ممتاز ⭐
                            </button>
                            <button
                              type="button"
                              onClick={() => setEvaluation('very_good')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                evaluation === 'very_good'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              جيد جداً
                            </button>
                            <button
                              type="button"
                              onClick={() => setEvaluation('good')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                evaluation === 'good'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              جيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setEvaluation('needs_practice')}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                evaluation === 'needs_practice'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              يحتاج تثبيت
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">ملاحظات التسميع والتجويد</label>
                          <textarea
                            rows={2}
                            value={teacherNotes}
                            onChange={(e) => setTeacherNotes(e.target.value)}
                            placeholder="ملاحظات حول مخارج الحروف، الترتيل، أو التثبيت..."
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-emerald-600 bg-white"
                          />
                        </div>
                      </div>

                      {/* Rule Reminder & Submit */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500">
                          🔒 <strong>قاعدة الأمان:</strong> التاريخ يُقفل ولا يتغير؛ إعادة الجدولة تبدأ فقط من أول يوم مستقبلي.
                        </span>

                        <button
                          type="button"
                          onClick={handleRecordAchievement}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>{isSubmitting ? 'جارٍ المعالجة والإعادة...' : 'حفظ الإنجاز الفعلي وتحديث الخطة'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WEEK VIEW — a REAL selected week of the full-term plan */}
              {viewMode === 'week' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-emerald-700" />
                      <span>
                        جدول الأسبوع {activeWeekNumber ?? '—'} (من أصل {planWeekNumbers.length} أسبوعًا)
                      </span>
                    </h5>
                    <div className="flex items-center gap-2">
                      <select
                        value={activeWeekNumber ?? ''}
                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600"
                      >
                        {planWeekNumbers.map((w) => (
                          <option key={w} value={w}>
                            الأسبوع {w}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-slate-500 font-medium">
                        المقدار اليومي: {activePlan.dailyAmount} {activePlan.unitType === 'ayah' ? 'آيات' : 'صفحة'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {weekDays.map((day) => (
                      <div
                        key={day.date}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          day.date === selectedDate
                            ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              day.status === 'completed' || day.status === 'overachieved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : day.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {day.dayName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{day.dayName}</span>
                              <span className="text-[11px] text-slate-500">({day.date})</span>
                            </div>
                            <span className="text-xs font-medium text-slate-700 font-['Amiri',serif]">
                              {formatQuranTextExpression(day.targetUnit?.displayLabel)}
                            </span>
                            {(day.targetUnit?.revisionDisplay || day.revisionDisplayLabel) && (
                              <span className="block text-[11px] font-bold text-blue-700 mt-0.5">
                                🔄 {day.targetUnit?.revisionDisplay || day.revisionDisplayLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                              day.status === 'completed' || day.status === 'overachieved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : day.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {day.status === 'completed'
                              ? 'أنجز ✓'
                              : day.status === 'overachieved'
                              ? 'فائض ★'
                              : day.status === 'absent'
                              ? 'غياب'
                              : 'معلق'}
                          </span>

                          <button
                            onClick={() => {
                              setSelectedDate(day.date);
                              setViewMode('today');
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 rounded-lg hover:bg-emerald-50"
                          >
                            فتح التسميع ←
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: MONTH VIEW */}
              {viewMode === 'month' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-slate-900">إحصائيات الشهر القرآني</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        متابعة وتيرة الإنجاز والالتزام بجلسات التسميع
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="text-xl font-black text-emerald-800">
                        {planMetrics.completionPercentage}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">نسبة الإنجاز الكلية</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">إجمالي أيام الخطة</span>
                      <span className="text-base font-black text-slate-800">
                        {planMetrics.totalDaysPlanned}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">الأيام المنجزة</span>
                      <span className="text-base font-black text-emerald-700">
                        {planMetrics.completedDaysCount}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">أيام الغياب / لم يسمّع</span>
                      <span className="text-base font-black text-rose-700">
                        {planMetrics.missedDaysCount}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">الآيات المنجزة</span>
                      <span className="text-base font-black text-blue-700">
                        {planMetrics.totalAyahsCompleted}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SEMESTER / PATH VIEW */}
              {viewMode === 'semester' && (
                <div className="space-y-4">
                  {/* Original Target Card (Immutable) */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-emerald-700" />
                        <span>الهدف الفصلي الأصلي (Immutable Original Target)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                        ثابت وغير قابل للتعديل
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      المستهدف المعتمد:{' '}
                      <span className="font-bold text-slate-900">
                        {activePlan.originalTarget?.displayTarget || 'المسار الفصلي'}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                      <div>تاريخ الانطلاق: {activePlan.startDate}</div>
                      <div>تاريخ الإنجاز المتوقع: {activePlan.originalTarget?.expectedEndDate}</div>
                      <div>إجمالي الآيات: {activePlan.originalTarget?.totalAyahs} آية</div>
                    </div>
                  </div>

                  {/* Revisions & Recalculation History */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-600" />
                      <span>سجل التعديلات وإعادة الجدولة (Audit Revisions Log)</span>
                    </h5>

                    {activePlan.versionHistory && activePlan.versionHistory.length > 1 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(activePlan.versionHistory || []).map((rev) => (
                          <div
                            key={rev.version}
                            className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">إصدار v{rev.version}</span>
                                <span className="text-[10px] text-slate-500">({rev.createdAt?.split('T')[0]})</span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">{rev.reason}</p>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              متبقٍ: {rev.remainingUnitsAtVersion ?? 0} وحدة
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                        لا توجد عمليات إعادة جدولة سابقة؛ الخطة تسير وفق المسار المبدئي.
                      </p>
                    )}
                  </div>
                </div>
              )}
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
        {/* Stage Configs Management Modal */}
        <StageConfigModal
          isOpen={showStageConfigsModal}
          onClose={() => setShowStageConfigsModal(false)}
          initialSelectedId={selectedStageConfigId}
        />
      </div>
    </div>
  );
};
