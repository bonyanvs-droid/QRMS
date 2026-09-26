import React, { useState, useMemo } from 'react';
import {
  Student,
  SpellingLesson,
  DailySessionRecord,
  EducationalPlanWeek,
  AcademicYearConfig,
} from '../../types';
import {
  StudentQuranPlan,
  DailyPlanItem,
  WeeklyPlanSummary,
  MonthlyPlanSummary,
  TermPlanSummary,
} from '../../quran/types/plan';
import { SURAHS_LIST } from '../../data/initialData';
import { formatQuranTextExpression } from '../../quran/utils/positionFormatter';
import {
  getSurahArabicName,
  getSurahNumberFromInput,
  normalizeStudentQuranPlan,
} from '../../quran/utils/planNormalizer';
import { useApp } from '../../context/AppContext';
import { isModuleEnabled } from '../../lib/moduleChecker';
import {
  BookOpen,
  Sparkles,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Bookmark,
  HeartHandshake,
  Lock,
  ArrowDownLeft,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Award,
  BookMarked,
  RotateCcw,
} from 'lucide-react';

interface StudentProgressPortalViewProps {
  student: Student;
  quranPlan: StudentQuranPlan | null;
  studentPlans?: StudentQuranPlan[];
  sessionRecords: DailySessionRecord[];
  spellingLessons: SpellingLesson[];
  educationalPlan: EducationalPlanWeek[];
  academicConfig: AcademicYearConfig;
}

export function getUnitTypeArabicLabel(unitType?: string): string {
  switch (unitType) {
    case 'ayah':
      return 'آيات';
    case 'half_page':
      return 'نصف صفحة';
    case 'page':
      return 'صفحة كاملة';
    case 'quarter':
      return 'ربع حزب';
    case 'surah':
      return 'سورة كاملة';
    case 'hizb':
      return 'حزب';
    case 'juz':
      return 'جزء';
    default:
      return 'وحدات مقررة';
  }
}

export const StudentProgressPortalView: React.FC<StudentProgressPortalViewProps> = ({
  student,
  quranPlan,
  studentPlans = [],
  sessionRecords,
  spellingLessons,
  educationalPlan,
  academicConfig,
}) => {
  const { activeTenant } = useApp();
  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');

  // Timeframe selector for Future Plan
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'semester'>('today');
  // Expanded week in weekly view
  const [expandedWeekNum, setExpandedWeekNum] = useState<number | null>(null);

  // Active or main memorization plan (safely normalized)
  const memorizationPlan = useMemo(() => {
    let candidate: StudentQuranPlan | null = null;
    if (quranPlan && (quranPlan.planType === 'memorization' || quranPlan.planType === 'combined')) {
      candidate = quranPlan;
    } else {
      candidate =
        studentPlans.find((p) => p.planType === 'memorization' || p.planType === 'combined') ||
        quranPlan;
    }
    return candidate ? normalizeStudentQuranPlan(candidate, student) : null;
  }, [quranPlan, studentPlans, student]);

  // Separate Revision Plan (if any exists, safely normalized)
  const revisionPlan = useMemo(() => {
    const raw =
      studentPlans.find((p) => p.planType === 'revision') ||
      (quranPlan?.planType === 'revision' ? quranPlan : null);
    return raw ? normalizeStudentQuranPlan(raw, student) : null;
  }, [studentPlans, quranPlan, student]);

  // Current Spelling Lesson & details
  const currentSpellingLesson = useMemo(() => {
    return spellingLessons.find((l) => l.id === student.currentSpellingLessonId) || null;
  }, [spellingLessons, student.currentSpellingLessonId]);

  // Next Spelling Lesson in order
  const nextSpellingLesson = useMemo(() => {
    if (!currentSpellingLesson) return null;
    return spellingLessons.find((l) => l.order === currentSpellingLesson.order + 1) || null;
  }, [spellingLessons, currentSpellingLesson]);

  // Current Educational Week - Prioritizing student's stage
  const currentEduWeek = useMemo(() => {
    const studentStageId = student.stageId || 'baraem';
    const weekPlans = (educationalPlan || []).filter(
      (w) => w.weekNumber === academicConfig.currentWeek && w.isVisible !== false
    );
    const stageMatch = weekPlans.find((w) => w.stageId === studentStageId);
    if (stageMatch) return stageMatch;
    const baraemMatch = weekPlans.find((w) => w.stageId === 'baraem');
    return baraemMatch || weekPlans[0] || educationalPlan[0] || null;
  }, [educationalPlan, academicConfig.currentWeek, student.stageId]);

  // Calculated Progress Metrics for Memorization
  const memMetrics = useMemo(() => {
    if (!memorizationPlan) {
      return {
        completedDays: 0,
        totalDays: 0,
        completedUnits: 0,
        totalUnits: 0,
        progressPercent: 0,
        currentPosLabel: `سورة ${student.currentSurah || 'الفاتحة'} (آية ${student.currentAyah || 1})`,
        nextPortion: null as DailyPlanItem | null,
        remainingUnits: 0,
      };
    }

    const dailyPlans = memorizationPlan.generatedPlan?.dailyPlans || [];
    const totalDays = dailyPlans.length;
    const completedItems = dailyPlans.filter(
      (d) => d.status === 'completed' || d.status === 'overachieved'
    );
    const completedDays = completedItems.length;

    const totalUnits = memorizationPlan.originalTarget?.totalUnits || totalDays || 1;
    const completedUnits = Math.min(completedDays, totalUnits);
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((completedUnits / totalUnits) * 100))
    );

    // Safely resolve current position label
    const rawPos = memorizationPlan.currentPosition || memorizationPlan.targetStart;
    const sNum = getSurahNumberFromInput(rawPos, getSurahNumberFromInput(student.currentSurah, 114));
    const sName =
      getSurahArabicName(rawPos) ||
      getSurahArabicName(student.currentSurah) ||
      getSurahArabicName(sNum) ||
      'الناس';
    const aNum = rawPos?.ayahNumber ?? (rawPos as any)?.ayah ?? student.currentAyah ?? 1;
    const currentPosLabel = `سورة ${sName} (الآية ${aNum})`;

    // Next pending day
    const nextPortion = dailyPlans.find((d) => d.status === 'pending') || null;
    const remainingUnits = Math.max(0, totalUnits - completedUnits);

    return {
      completedDays,
      totalDays,
      completedUnits,
      totalUnits,
      progressPercent,
      currentPosLabel,
      nextPortion,
      remainingUnits,
    };
  }, [memorizationPlan, student]);

  // Revision Details
  const revisionInfo = useMemo(() => {
    // 1. From dedicated revision plan
    if (revisionPlan) {
      const daily = revisionPlan.generatedPlan?.dailyPlans || [];
      const nextPending = daily.find((d) => d.status === 'pending') || null;
      return {
        hasPlan: true,
        source: 'engine_revision_plan' as const,
        targetLabel: formatQuranTextExpression(revisionPlan.originalTarget?.displayTarget) || 'مراجعة المحفوظ المعتمد',
        unitLabel: getUnitTypeArabicLabel(revisionPlan.unitType),
        dailyAmount: `${revisionPlan.dailyAmount} ${getUnitTypeArabicLabel(revisionPlan.unitType)} يومياً`,
        nextAssignment: formatQuranTextExpression(nextPending?.targetUnit?.displayLabel) || 'المراجعة مستمرة',
        days: daily,
      };
    }

    // 2. From student's registered roster revisionDays (e.g. Sunday: An-Nas + Al-Falaq)
    if (student.quranPlan?.revisionDays && student.quranPlan.revisionDays.length > 0) {
      const days = student.quranPlan.revisionDays;
      const firstDay = days[0];
      return {
        hasPlan: true,
        source: 'student_roster_schedule' as const,
        targetLabel: `تثبيت السور المقررة حتى سورة ${student.minimumTargetSurah}`,
        unitLabel: 'سور كاملة',
        dailyAmount: 'سورة إلى سورتين يومياً حسب جدول الأسبوع',
        nextAssignment: `${firstDay.day}: من سورة ${firstDay.surahFrom} إلى ${firstDay.surahTo}`,
        daysList: days,
      };
    }

    // 3. From memorization plan revision settings
    if (memorizationPlan?.revisionSettings) {
      return {
        hasPlan: true,
        source: 'plan_settings' as const,
        targetLabel: 'تثبيت ومراجعة المحفوظ التراكمي',
        unitLabel: memorizationPlan.revisionSettings.mode === 'surahs' ? 'سور' : 'صفحات',
        dailyAmount: `${memorizationPlan.revisionSettings.surahsPerDay || 1} سور يومياً`,
        nextAssignment: 'مراجعة السور السابقة مع المعلم',
      };
    }

    // 4. Default graceful state
    return {
      hasPlan: false,
      source: 'none' as const,
      targetLabel: `تثبيت السور السابقة حتى سورة ${student.minimumTargetSurah}`,
      unitLabel: 'غير محدد بعد',
      dailyAmount: 'مراجعة مستمرة بحسب توجيه المعلم',
      nextAssignment: 'مراجعة وتثبيت ما حفظه الطالب',
    };
  }, [revisionPlan, student, memorizationPlan]);

  // Educational Metrics
  const eduMetrics = useMemo(() => {
    const totalGoals = educationalPlan.length;
    const completedGoals = educationalPlan.filter((w) => w.executionStatus === 'completed').length;
    const inProgressGoals = Math.max(0, totalGoals - completedGoals);

    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
    };
  }, [educationalPlan]);

  // Is at risk diagnostic
  const targetAtRisk =
    memorizationPlan?.targetAtRiskDiagnostic?.isAtRisk || memorizationPlan?.status === 'at_risk';

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. القسم الأول: الملخص العام (Holy Quran & Holistic Progress Summary)     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-emerald-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              منظومة المتابعة الشاملة لولي الأمر
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              الملخص العام لمسار الطالب القرآني والتربوي
            </h3>
            <p className="text-xs text-slate-500">
              بيانات حقيقية معتمدة مستخرجة مباشرة من سجلات المعلم ومحرك التخطيط القرآني العام.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
              الأسبوع التشغيلي: {academicConfig.currentWeek}
            </span>
          </div>
        </div>

        {/* 4 Pillars Grid: Memorization, Revision, Spelling, Educational */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pillar 1: Memorization (الحفظ) */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  الحفظ القرآني
                </span>
                <span className="text-[11px] font-mono font-bold bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-md">
                  {memMetrics.progressPercent}%
                </span>
              </div>
              <div className="text-xs text-slate-600">
                الهدف الأصلي للفصل:
                <div className="font-bold text-slate-900 mt-0.5 line-clamp-1 font-quran">
                  {formatQuranTextExpression(memorizationPlan?.originalTarget?.displayTarget) ||
                    `من الناس إلى سورة ${student.minimumTargetSurah}`}
                </div>
              </div>
              <div className="text-xs text-slate-600">
                الموضع الحالي:
                <div className="font-bold text-emerald-900 mt-0.5">{memMetrics.currentPosLabel}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 space-y-1 text-xs">
              <div className="text-slate-600">
                الإنجاز: <strong>{memMetrics.completedUnits} وحدة</strong> من {memMetrics.totalUnits}
              </div>
              <div className="text-slate-700 font-medium">
                المقرر القادم:{' '}
                <span className="font-bold text-emerald-950">
                  {memMetrics.nextPortion?.targetUnit?.displayLabel || 'اكتمل المقرر'}
                </span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Revision (المراجعة) */}
          <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-100 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-teal-900">
                  <RotateCcw className="w-4 h-4 text-teal-700" />
                  المراجعة والتثبيت
                </span>
                <span className="text-[11px] font-bold bg-teal-200/80 text-teal-950 px-2 py-0.5 rounded-md">
                  {revisionInfo.unitLabel}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                هدف المراجعة:
                <div className="font-bold text-slate-900 mt-0.5 line-clamp-1">
                  {revisionInfo.targetLabel}
                </div>
              </div>
              <div className="text-xs text-slate-600">
                المقدار المعتمد:
                <div className="font-bold text-teal-900 mt-0.5">{revisionInfo.dailyAmount}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-teal-200/60 space-y-1 text-xs">
              <div className="text-slate-700 font-medium">
                المقرر القادم:{' '}
                <span className="font-bold text-teal-950">{revisionInfo.nextAssignment}</span>
              </div>
              <div className="text-[11px] text-teal-800">
                تثبيت السور السابقة لترسيخ الحفظ في الصدر
              </div>
            </div>
          </div>

          {/* Pillar 3: Spelling (التهجي القرآني) */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                  <BookMarked className="w-4 h-4 text-blue-700" />
                  التهجي القرآني
                </span>
                <span className="text-[11px] font-mono font-bold bg-blue-200/80 text-blue-950 px-2 py-0.5 rounded-md">
                  {student.currentSpellingScore}% إتقان
                </span>
              </div>
              <div className="text-xs text-slate-600">
                الهدف الحالي:
                <div className="font-bold text-slate-900 mt-0.5">
                  {currentSpellingLesson
                    ? `الدرس ${currentSpellingLesson.lessonNumber}: ${currentSpellingLesson.title}`
                    : 'مسار الهجاء الأساسي'}
                </div>
              </div>
              <div className="text-xs text-slate-600">
                المهارة المستهدفة:
                <div className="font-medium text-blue-950 mt-0.5 line-clamp-1">
                  {currentSpellingLesson?.skill || 'نطق وضبط حروف ورسم المصحف الشريف'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/60 space-y-1 text-xs">
              <div className="text-slate-700">
                القادم:{' '}
                <span className="font-bold text-blue-950">
                  {nextSpellingLesson ? `الدرس ${nextSpellingLesson.lessonNumber}: ${nextSpellingLesson.title}` : 'إتمام مهارات الهجاء'}
                </span>
              </div>
              <div className="text-[11px] text-blue-800">
                تدريب يومي لتأسيس القراءة من المصحف
              </div>
            </div>
          </div>

          {/* Pillar 4: Educational Plan (الجانب التربوي) */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <HeartHandshake className="w-4 h-4 text-amber-700" />
                  الخطة التربوية والآداب
                </span>
                <span className="text-[11px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md">
                  {eduMetrics.completedGoals}/{eduMetrics.totalGoals} هدف
                </span>
              </div>
              <div className="text-xs text-slate-600">
                قيمة وشعار الأسبوع:
                <div className="font-bold text-amber-950 mt-0.5 line-clamp-1">
                  {currentEduWeek?.motto || '«قرآني نوري»'}
                </div>
              </div>
              <div className="text-xs text-slate-600">
                الهدف الجاري:
                <div className="font-medium text-slate-800 mt-0.5 line-clamp-1">
                  {currentEduWeek?.educationalGoal || 'تعظيم القرآن الكريم وآداب التلاوة'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 space-y-1 text-xs">
              <div className="text-slate-700">
                الأهداف المتقنة: <strong>{eduMetrics.completedGoals}</strong> | قيد المتابعة:{' '}
                <strong>{eduMetrics.inProgressGoals}</strong>
              </div>
              <div className="text-[11px] text-amber-900 font-medium">
                غرس القيم الإسلامية والآداب القرآنية
              </div>
            </div>
          </div>
        </div>

        {/* Positive Pedagogical Advisory Indicator (مؤشر التعثر التربوي الإيجابي) */}
        {targetAtRisk && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <h5 className="font-bold text-amber-950">
                إرشاد وتوصية تربوية لمسار الطالب القرآني
              </h5>
              <p className="text-amber-900 leading-relaxed">
                ⚠️ يحتاج الطالب إلى دعم إضافي ومتابعة مستمرة في المنزل للمحافظة على المسار المستهدف وإتمام المقدار المحدد في وقته. نوصي بتخصيص 10 دقائق يومياً بعد صلاة المغرب لمراجعة الورد القرآني بالتنسيق المباشر مع معلم الحلقة.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. القسم الثاني: الهدف الأصلي الثابت (Original Target)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                🎯 الهدف الأصلي المتوقع والموضع الحالي
              </h3>
            </div>
            <p className="text-xs text-slate-500 pr-9">
              المستهدف الأصلي ثابت ومحمي كمرجع تقييمي موثوق للطالب طوال الفصل الدراسي ولا يتم تقليصه سراً عند التأخر أو الزيادة.
            </p>
          </div>

          <div className="flex items-center gap-2 pr-9 sm:pr-0">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              <Lock className="w-3 h-3 text-slate-500" />
              مستهدف أصلي ثابت
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card A: Original Target */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-700" />
              الهدف الأصلي المعتمد للفصل
            </div>
            <div className="text-lg font-black text-slate-900 font-quran">
              {formatQuranTextExpression(memorizationPlan?.originalTarget?.displayTarget) ||
                `من سورة الناس إلى سورة ${student.minimumTargetSurah}`}
            </div>
            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-amber-200/60">
              <div>
                الوحدة المقررة: <strong>{getUnitTypeArabicLabel(memorizationPlan?.originalTarget?.unitType)}</strong>
              </div>
              <div>
                إجمالي الوحدات: <strong>{memorizationPlan?.originalTarget?.totalUnits || '—'} وحدة</strong> ({memorizationPlan?.originalTarget?.totalAyahs || '—'} آية)
              </div>
              <div>
                المقدار اليومي المعتمد: <strong>{memorizationPlan?.originalTarget?.dailyAmount || 1} {getUnitTypeArabicLabel(memorizationPlan?.originalTarget?.unitType)} يومياً</strong>
              </div>
            </div>
          </div>

          {/* Card B: Current Position */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              الموضع الحالي المتحقق
            </div>
            <div className="text-lg font-black text-emerald-950">{memMetrics.currentPosLabel}</div>
            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-emerald-200/60">
              <div>
                الإنجاز الفعلي:{' '}
                <strong className="text-emerald-900">{memMetrics.completedUnits} وحدة منجزة</strong>
              </div>
              <div>
                نسبة إنجاز المستهدف الأصلي:{' '}
                <strong className="text-emerald-900">{memMetrics.progressPercent}%</strong>
              </div>
              <div>
                أيام الإنجاز الموثقة: <strong>{memMetrics.completedDays} أيام دراسية</strong>
              </div>
            </div>
          </div>

          {/* Card C: Remaining */}
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-blue-700" />
              المتبقي لبلوغ الهدف النهائي
            </div>
            <div className="text-lg font-black text-slate-900">
              {memMetrics.remainingUnits} وحدة متبقية
            </div>
            <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-blue-200/60">
              <div>
                المقرر القادم المباشر:{' '}
                <strong>{memMetrics.nextPortion?.targetUnit?.displayLabel || 'تم إتمام المقرر بحمد الله'}</strong>
              </div>
              <div>
                الاتجاه التشغيلي:{' '}
                <strong>
                  {memorizationPlan?.direction === 'backward'
                    ? 'تنازلي (الناس ← البقرة)'
                    : 'تصاعدي (البقرة ← الناس)'}
                </strong>
              </div>
              <div className="text-[11px] text-blue-900 font-medium">
                تُعاد جدولة المتبقي بمرونة مع كل تسميع يومي
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. القسم الثالث: الخطة المستقبلية ومحدد الفترات (Timeframe Selector)     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                الخطة التنفيذية والتاريخ الإنجازي
              </h3>
            </div>
            <p className="text-xs text-slate-500 pr-9">
              تصفح خطة الطالب الحقيقية حسب النطاق الزمني؛ الأيام السابقة مقفلة وموثقة، والأيام القادمة تتكيف مع إنجاز الطالب.
            </p>
          </div>

          {/* Timeframe Selector Pills: اليوم | الأسبوع | الشهر | الفصل */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeframe === 'today'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeframe === 'week'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              الأسبوع
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeframe === 'month'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              الشهر
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('semester')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeframe === 'semester'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              الفصل
            </button>
          </div>
        </div>

        {/* View Mode 1: Daily (اليوم والتفصيل اليومي الكامل) */}
        {timeframe === 'today' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>عرض تفصيلي لجميع الأيام الدراسية المقررة والموثقة</span>
              <span className="flex items-center gap-1 text-slate-700 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                الأيام السابقة غير قابلة للتعديل
              </span>
            </div>

            {memorizationPlan?.generatedPlan?.dailyPlans &&
            memorizationPlan.generatedPlan.dailyPlans.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-3 px-4">التاريخ واليوم</th>
                      <th className="py-3 px-4">المقرر (المستهدف)</th>
                      <th className="py-3 px-4">المنجز الفعلي</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(memorizationPlan?.generatedPlan?.dailyPlans || []).map((item) => {
                      const isPastOrRecorded = item.isHistorical || item.status !== 'pending';
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isPastOrRecorded ? 'bg-slate-50/40 hover:bg-slate-50' : 'bg-white hover:bg-blue-50/30'
                          }`}
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{item.dayName}</div>
                            <div className="font-mono text-[11px] text-slate-500 mt-0.5">{item.date}</div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {item.targetUnit.displayLabel}
                            <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                              {item.targetUnit.totalAyahs} آيات • {getUnitTypeArabicLabel(item.unitType)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {item.actualAchieved ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-emerald-950 block">
                                  {item.actualAchieved.unit?.displayLabel || item.targetUnit.displayLabel}
                                </span>
                                {item.actualAchieved.notes && (
                                  <span className="text-[11px] text-slate-500 block">
                                    {item.actualAchieved.notes}
                                  </span>
                                )}
                              </div>
                            ) : item.status === 'absent' ? (
                              <span className="text-rose-700 font-medium">غياب (تم ترحيل الورد)</span>
                            ) : item.status === 'unrecited' ? (
                              <span className="text-slate-600 font-medium">لم يسمّع (تم ترحيل الورد)</span>
                            ) : (
                              <span className="text-slate-400 font-normal">قادم ومجدول</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {item.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                مكتمل
                              </span>
                            )}
                            {item.status === 'overachieved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 text-[11px] font-bold">
                                <Sparkles className="w-3 h-3 text-purple-700" />
                                إنجاز مضاعف
                              </span>
                            )}
                            {item.status === 'partial' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                                <Clock className="w-3 h-3 text-amber-700" />
                                إنجاز جزئي
                              </span>
                            )}
                            {item.status === 'absent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 text-[11px] font-bold">
                                غياب
                              </span>
                            )}
                            {item.status === 'unrecited' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                                لم يُسمّع
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                                قادم
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
                لا توجد أيام مجدولة مسجلة حالياً لهذه الخطة.
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Weekly (الأسبوع) */}
        {timeframe === 'week' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 px-1">
              ملخص تقدم ومقررات الطالب أسبوعاً بأسبوع خلال الفصل الدراسي
            </div>

            {memorizationPlan?.generatedPlan?.weeklyPlans &&
            memorizationPlan.generatedPlan.weeklyPlans.length > 0 ? (
              <div className="space-y-3">
                {(memorizationPlan?.generatedPlan?.weeklyPlans || []).map((wk) => {
                  const isExpanded = expandedWeekNum === wk.weekNumber;
                  return (
                    <div
                      key={wk.weekNumber}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs"
                    >
                      <div
                        onClick={() => setExpandedWeekNum(isExpanded ? null : wk.weekNumber)}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-950 font-black text-sm flex items-center justify-center shrink-0">
                            {wk.weekNumber}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-900">
                              الأسبوع {wk.weekNumber}: {wk.displayLabel}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              من {wk.startDate} إلى {wk.endDate} • {wk.totalUnits} وحدات ({wk.totalAyahs} آية)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              wk.isCompleted
                                ? 'bg-emerald-100 text-emerald-900'
                                : wk.completedDaysCount > 0
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {wk.isCompleted
                              ? 'مكتمل'
                              : `${wk.completedDaysCount}/${(wk.days || []).length} أيام منجزة`}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expandable days of this week */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 divide-y divide-slate-200/70 text-xs">
                          {(wk.days || []).map((d) => (
                            <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{d.dayName}</span>
                                <span className="font-mono text-slate-500">({d.date})</span>
                                <span className="text-slate-700 font-medium mr-2">
                                  {d.targetUnit.displayLabel}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  d.status === 'completed' || d.status === 'overachieved'
                                    ? 'bg-emerald-200 text-emerald-950'
                                    : d.status === 'partial'
                                    ? 'bg-amber-200 text-amber-950'
                                    : d.status === 'absent'
                                    ? 'bg-rose-200 text-rose-950'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {d.status === 'completed'
                                  ? 'منجز'
                                  : d.status === 'overachieved'
                                  ? 'إنجاز مضاعف'
                                  : d.status === 'partial'
                                  ? 'جزئي'
                                  : d.status === 'absent'
                                  ? 'غياب'
                                  : 'قادم'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
                لا تتوفر ملخصات أسبوعية لهذه الخطة.
              </div>
            )}
          </div>
        )}

        {/* View Mode 3: Monthly (الشهر) */}
        {timeframe === 'month' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 px-1">
              الملخص التراكمي للشهور التشغيلية للفصل الدراسي
            </div>

            {memorizationPlan?.generatedPlan?.monthlyPlans &&
            memorizationPlan.generatedPlan.monthlyPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(memorizationPlan?.generatedPlan?.monthlyPlans || []).map((m) => (
                  <div
                    key={m.monthNumber}
                    className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900">
                        الشهر {m.monthNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {m.startDate} ← {m.endDate}
                      </span>
                    </div>

                    <h4 className="font-black text-base text-slate-900">{m.monthName}</h4>
                    <p className="text-xs text-emerald-900 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                      المقرر الشهري: {m.displayLabel}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <span>إجمالي الآيات: <strong>{m.totalAyahs} آية</strong></span>
                      <span>عدد الأسابيع: <strong>{m.weeks.length} أسابيع</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
                لا تتوفر ملخصات شهرية لهذه الخطة.
              </div>
            )}
          </div>
        )}

        {/* View Mode 4: Semester (الفصل الدراسي كاملاً) */}
        {timeframe === 'semester' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 px-1">
              المسار العام والشامل للخطة من بداية الفصل الدراسي حتى نهايته
            </div>

            {memorizationPlan?.generatedPlan?.termPlan ? (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                  <div>
                    <h4 className="font-black text-lg text-slate-900">
                      {memorizationPlan.generatedPlan.termPlan.termName || 'الفصل الدراسي الثاني'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      النطاق الزمني: من {memorizationPlan.generatedPlan.termPlan.startDate} إلى{' '}
                      {memorizationPlan.generatedPlan.termPlan.endDate}
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-700 text-white font-black text-xs self-start sm:self-center">
                    {memMetrics.progressPercent}% إنجاز تراكمي
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 block">إجمالي أيام الدراسة</span>
                    <span className="font-black text-slate-900 text-base">
                      {memorizationPlan.generatedPlan.termPlan.totalWorkingDays} يوماً
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 block">إجمالي الوحدات المقررة</span>
                    <span className="font-black text-slate-900 text-base">
                      {memorizationPlan.generatedPlan.termPlan.totalUnits} وحدة
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 block">إجمالي الآيات</span>
                    <span className="font-black text-slate-900 text-base">
                      {memorizationPlan.generatedPlan.termPlan.totalAyahs} آية
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] text-slate-500 block">اتجاه الحفظ</span>
                    <span className="font-black text-emerald-900 text-xs">
                      {memorizationPlan.generatedPlan.termPlan.direction === 'backward'
                        ? 'تنازلي (قصار السور)'
                        : 'تصاعدي'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">المسار الكلي المنجز:</span>
                    <span className="font-black text-emerald-900">{memMetrics.progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-emerald-500 to-teal-700 rounded-full transition-all duration-500"
                      style={{ width: `${memMetrics.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm">
                لا يتوفر مسار فصلي عام مسجل.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. قسم تفاصيل الحفظ القرآني (Memorization Details)                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-emerald-100 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-900">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">تفاصيل مسار الحفظ القرآني</h3>
            <p className="text-xs text-slate-500">
              بيانات ومعايير الحفظ الدقيقة والانتقال السلس بين السور
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">السورة والآية الحالية:</span>
            <span className="font-black text-slate-900 text-sm">{memMetrics.currentPosLabel}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">نقطة البداية والنهاية:</span>
            <span className="font-black text-slate-900 text-sm">
              من سورة {getSurahArabicName(memorizationPlan?.targetStart) || 'الناس'} إلى سورة{' '}
              {getSurahArabicName(memorizationPlan?.targetEnd) || 'الغاشية'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">الوحدة والمقدار اليومي:</span>
            <span className="font-black text-slate-900 text-sm">
              {memorizationPlan?.dailyAmount || 1}{' '}
              {getUnitTypeArabicLabel(memorizationPlan?.unitType)} يومياً
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">اتجاه الحفظ التخطيطي:</span>
            <span className="font-black text-emerald-900 text-sm">
              {memorizationPlan?.direction === 'backward'
                ? 'تنازلي (الناس ← البقرة)'
                : 'تصاعدي (البقرة ← الناس)'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">المقرر القادم:</span>
            <span className="font-black text-emerald-950 text-sm">
              {memMetrics.nextPortion?.targetUnit?.displayLabel || 'تم إتمام المقرر'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 block">حالة الانتقال بين السور:</span>
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              انتقال سلس تلقائي عبر حدود السور
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. قسم تفاصيل المراجعة القرآنية المستقل (Revision Deep Dive)              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-teal-100 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-900">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                منظومة المراجعة وتثبيت المحفوظ (مستقلة عن الحفظ)
              </h3>
              <p className="text-xs text-slate-500">
                تثبيت القرآن التراكمي بحسب الوحدة المختارة (سور كاملة، صفحات، أو أرباع)
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-bold self-start sm:self-center">
            الوحدة: {revisionInfo.unitLabel}
          </span>
        </div>

        {/* Display schedule: Surah list e.g. Sunday: An-Nas + Al-Falaq, or pages */}
        {revisionInfo.daysList && revisionInfo.daysList.length > 0 ? (
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700">جدول المراجعة الأسبوعي بالسور:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(revisionInfo.daysList || []).map((d, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-teal-950">{d.day}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-200 text-teal-950">
                      مراجعة
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {d.surahFrom === d.surahTo
                      ? `سورة ${d.surahFrom}`
                      : `${d.surahFrom} + ${d.surahTo}`}
                  </div>
                  {d.description && (
                    <p className="text-[11px] text-slate-600 leading-relaxed">{d.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : revisionInfo.days && revisionInfo.days.length > 0 ? (
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700">الأيام المقررة للمراجعة:</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(revisionInfo.days || []).slice(0, 8).map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{d.dayName}</span>
                    <span className="font-mono text-[10px] text-slate-500">{d.date}</span>
                  </div>
                  <div className="font-black text-teal-950 text-xs">
                    {d.targetUnit.displayLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-teal-50/40 border border-teal-100 text-slate-700 text-xs space-y-2">
            <div className="font-bold text-slate-900">خطة المراجعة اليومية مع المعلم:</div>
            <p className="leading-relaxed">
              يراجع الطالب يومياً السور المحفوظة بالتوازي مع درسه الجديد لتثبيت السور في صدره. يتابع المعلم التسميع والتصحيح بصورة دورية في جامع الغزاوي.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. قسم التهجي القرآني (Quran Spelling Deep Dive)                          */}
      {/* ========================================================================= */}
      {isSpellingActive && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-blue-100 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-900">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">مسار الهجاء القرآني</h3>
              <p className="text-xs text-slate-500">
                تأسيس النطق الصحيح ورسم المصحف الشريف وضبط مخارج الحروف
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Current Lesson Card */}
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">الدرس الحالي للطالب:</span>
                <span className="font-mono font-bold text-xs bg-blue-200 text-blue-950 px-2 py-0.5 rounded">
                  درجة الإتقان: {student.currentSpellingScore}%
                </span>
              </div>

              <h4 className="font-black text-base text-slate-900">
                {currentSpellingLesson
                  ? `الدرس ${currentSpellingLesson.lessonNumber}: ${currentSpellingLesson.title}`
                  : 'الدرس الأساسي'}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed">
                {currentSpellingLesson?.description ||
                  'تدريب هجاء مكثف لتأسيس النطق السليم للحروف والكلمات القرآنية.'}
              </p>

              {currentSpellingLesson?.subLessons && currentSpellingLesson.subLessons.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-blue-200/60">
                  <span className="text-[11px] font-bold text-blue-950 block">المهارات الفرعية للدرس:</span>
                  <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-700">
                    {(currentSpellingLesson.subLessons || []).map((sub) => (
                      <div key={sub.id} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming & Guidance Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700">المرحلة القادمة والتوجيه المنزلي:</span>

              <div className="space-y-1">
                <div className="text-xs text-slate-500">الدرس القادم المتوقع:</div>
                <div className="font-bold text-slate-900 text-sm">
                  {nextSpellingLesson
                    ? `الدرس ${nextSpellingLesson.lessonNumber}: ${nextSpellingLesson.title}`
                    : 'إتمام كامل دروس الهجاء والانتقال للمصاحف'}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <strong>توجيه ولي الأمر:</strong> نوصي بتخصيص 5 دقائق يومياً في المنزل لتهجئة الكلمات من كتاب الهجاء المعتمد مع الاستماع لمخارج الحروف.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. قسم الخطة التربوية الشاملة (Educational Plan Deep Dive)                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-amber-100 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-900">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">الخطة والآداب التربوية</h3>
            <p className="text-xs text-slate-500">
              القيم الإسلامية والآداب القرآنية المصاحبة لحلقات القرآن الكريم
            </p>
          </div>
        </div>

        {/* Current Week Motto & Goal */}
        {currentEduWeek && (
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                قيمة وشعار الأسبوع الحالي (الأسبوع {currentEduWeek.weekNumber})
                {currentEduWeek.stageName ? ` - ${currentEduWeek.stageName}` : ''}:
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                {currentEduWeek.motto}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{currentEduWeek.educationalGoal}</h4>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-slate-600">النشاط العملي: {currentEduWeek.activity}</span>
              {currentEduWeek.showSupervisorName !== false && currentEduWeek.responsiblePerson && (
                <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  المشرف المسؤول: {currentEduWeek.responsiblePerson}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Educational Weeks Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-4">الأسبوع</th>
                <th className="py-3 px-4">الهدف التربوي والآداب</th>
                <th className="py-3 px-4">الشعار</th>
                <th className="py-3 px-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(educationalPlan || []).slice(0, 8).map((week) => (
                <tr key={week.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    الأسبوع {week.weekNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-800">{week.educationalGoal}</td>
                  <td className="py-3 px-4 font-bold text-amber-900 whitespace-nowrap">
                    {week.motto}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        week.executionStatus === 'completed'
                          ? 'bg-emerald-100 text-emerald-900'
                          : week.weekNumber === academicConfig.currentWeek
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {week.executionStatus === 'completed'
                        ? 'متقن'
                        : week.weekNumber === academicConfig.currentWeek
                        ? 'جاري'
                        : 'قيد المتابعة'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
