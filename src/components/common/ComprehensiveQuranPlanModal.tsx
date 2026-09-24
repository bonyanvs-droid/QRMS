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
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Student, DailySessionRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { StudentQuranPlan, DailyPlanItem } from '../../quran/types/plan';
import {
  formatHijriDate,
  formatGregorianDate,
  getTodayLocalIso,
} from '../../utils/hijriDate';
import { executePrintOrPdfFallback } from '../../utils/pdfExportUtils';
import { getHalaqahActiveTrackIds } from '../../utils/trackAdapter';
import { SURAHS_LIST } from '../../data/initialData';

type ViewVariant = 'teacher' | 'student' | 'parent';
type CalendarMode = 'hijri' | 'gregorian' | 'none';

interface Props {
  student: Student;
  variant?: ViewVariant;
  onClose: () => void;
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

const DAY_TYPE_LABELS: Record<string, string> = {
  memorization: 'حفظ',
  consolidation: 'تثبيت',
  revision: 'مراجعة',
  general_revision: 'مراجعة عامة',
};

export const ComprehensiveQuranPlanModal: React.FC<Props> = ({
  student,
  variant = 'teacher',
  onClose,
}) => {
  const { getActiveStudentQuranPlan, sessionRecords, halaqahs, teachers, activeTenant } = useApp();
  const [calendar, setCalendar] = useState<CalendarMode>('hijri');
  // Weeks are fully expanded by default so the WHOLE term plan is visible;
  // collapsedWeeks tracks only the weeks the user explicitly folds away.
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const plan: StudentQuranPlan | undefined = useMemo(
    () => getActiveStudentQuranPlan(student.id),
    [getActiveStudentQuranPlan, student.id]
  );

  const todayIso = getTodayLocalIso();

  // Active tracks — resolved from the halaqah subscription through the single
  // track authority. The spelling column only renders when subscribed.
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

  const fmtDate = (d: string) => {
    if (calendar === 'none') return '';
    return calendar === 'hijri' ? formatHijriDate(d) : formatGregorianDate(d);
  };

  const surahName = (n: number) =>
    SURAHS_LIST.find((s) => s.number === n)?.name || `${n}`;

  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailySessionRecord>();
    for (const r of sessionRecords) {
      if (r.studentId !== student.id) continue;
      const prev = map.get(r.date);
      if (!prev || new Date(r.id) > new Date(prev.id)) map.set(r.date, r);
    }
    return map;
  }, [sessionRecords, student.id]);

  const dailyPlans = plan?.generatedPlan?.dailyPlans || [];

  const weeks = useMemo(() => {
    const holidayDates = new Set(plan?.schedule?.holidays || []);
    const filteredDays = dailyPlans.filter((d) => {
      const isHol = d.dayType === 'holiday' || holidayDates.has(d.date);
      if (calendar === 'none' && isHol) return false;
      return true;
    });

    const map = new Map<number, DailyPlanItem[]>();
    for (const d of filteredDays) {
      const list = map.get(d.weekNumber) || [];
      list.push(d);
      map.set(d.weekNumber, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [dailyPlans, calendar, plan?.schedule?.holidays]);

  // The week containing today (or the first pending week) — used for
  // highlighting and auto-scroll, never to hide the rest of the plan.
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

  // Scroll the current week into view once the full plan renders.
  useEffect(() => {
    if (currentWeek === undefined) return;
    const el = document.getElementById(`quran-plan-week-${currentWeek}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentWeek]);

  // Prior achievement recorded BEFORE this plan's start date — the "إنجاز سابق"
  // section is built strictly from real session records (no fabricated days).
  const priorMemRecords = useMemo(() => {
    if (!plan?.startDate) return [];
    return sessionRecords
      .filter(
        (r) =>
          r.studentId === student.id &&
          r.memorization &&
          r.memorization.surahTo &&
          r.date < plan.startDate
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessionRecords, student.id, plan?.startDate]);

  const holidays = new Set(plan?.schedule?.holidays || []);

  const completedCount = dailyPlans.filter(
    (d) => d.status === 'completed' || d.status === 'overachieved'
  ).length;
  const pastCount = dailyPlans.filter((d) => d.date < todayIso || d.isHistorical).length;

  const academicLabel = () => plan?.termName || 'الفصل الدراسي الحالي';

  // The canonical "current day" — today when inside the plan, else the first
  // pending day. Drives the dedicated current-day panel (Phase M).
  const currentDayItem = useMemo(() => {
    if (!dailyPlans.length) return undefined;
    return (
      dailyPlans.find((d) => d.date === todayIso) ||
      dailyPlans.find((d) => d.date > todayIso && !d.isHistorical && d.status === 'pending')
    );
  }, [dailyPlans, todayIso]);

  const subtitle =
    variant === 'student'
      ? 'رحلتك القرآنية من البداية إلى المستهدف — يومًا بيوم'
      : variant === 'parent'
      ? 'الخطة القرآنية كاملة لابنكم/ابنتكم: المنجز والحالي والقادم'
      : 'العرض التشغيلي الكامل للخطة — من أول يوم فعلي إلى المستهدف الحالي';

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
  const [isFullscreen, setIsFullscreen] = useState(true);

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
      // Delay releasing lock to prevent accidental double clicks
      setTimeout(() => setIsPrinting(false), 1200);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[999] transition-all ${
        isFullscreen
          ? 'p-0 bg-white flex flex-col overflow-hidden'
          : 'flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto'
      }`}
      dir="rtl"
    >
      <div
        className={`bg-white flex flex-col overflow-hidden transition-all ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none shadow-none'
            : 'w-full max-w-[97vw] 2xl:max-w-[1680px] h-[95vh] rounded-3xl shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-800 to-teal-700 text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-black text-sm sm:text-base truncate">
                الخطة القرآنية الشاملة — {student.fullName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-emerald-100 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-white/15 rounded-lg p-0.5 flex text-[11px] font-bold">
              <button
                onClick={() => setCalendar('hijri')}
                className={`px-2 py-1 rounded-md transition-colors ${calendar === 'hijri' ? 'bg-white text-emerald-800' : 'text-white'}`}
              >
                هجري
              </button>
              <button
                onClick={() => setCalendar('gregorian')}
                className={`px-2 py-1 rounded-md transition-colors ${calendar === 'gregorian' ? 'bg-white text-emerald-800' : 'text-white'}`}
              >
                ميلادي
              </button>
              <button
                onClick={() => setCalendar('none')}
                className={`px-2 py-1 rounded-md transition-colors ${calendar === 'none' ? 'bg-white text-emerald-800' : 'text-white'}`}
              >
                إخفاء التاريخ
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة بالكامل'}
              aria-label={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة بالكامل'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`p-1.5 rounded-lg transition-colors ${
                isPrinting
                  ? 'bg-white/10 text-white/50 cursor-not-allowed opacity-60'
                  : 'bg-white/15 hover:bg-white/25 text-white cursor-pointer'
              }`}
              title={isPrinting ? 'جاري تجهيز الطباعة...' : 'طباعة / PDF'}
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-pulse' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body (printable) */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
          {/* Official document letterhead — tenant identity on screen + PDF */}
          {plan && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-3">
                {activeTenant?.logoUrl ? (
                  <img
                    src={activeTenant.logoUrl}
                    alt={activeTenant.name}
                    className="w-11 h-11 rounded-xl object-contain border border-slate-100 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-emerald-800 text-amber-300 font-black text-lg flex items-center justify-center shrink-0">
                    ق
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 truncate">
                    {activeTenant?.name || 'المجمع القرآني'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    وثيقة الخطة القرآنية الشاملة — {academicLabel()}
                  </div>
                </div>
                <div className="text-left text-[10px] text-slate-500 font-bold shrink-0">
                  <div>الإصدار: v{plan.planVersion || 1}</div>
                  <div>تاريخ الإصدار: {fmtDate(todayIso)}</div>
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
                    {fmtDate(plan.startDate)} ← {fmtDate(plan.endDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">مصدر المستهدف</span>
                  <span className="font-black text-slate-800">
                    {plan.targetSource === 'explicit'
                      ? 'اختيار المعلم'
                      : plan.targetSource === 'personal'
                        ? 'المستهدف الشخصي'
                        : plan.targetSource === 'academic_year'
                          ? 'المستهدف الأكاديمي'
                          : plan.targetSource === 'student_minimum'
                            ? 'الحد الأدنى للطالب'
                            : plan.targetSource === 'halaqah'
                              ? 'مستهدف الحلقة'
                              : plan.targetSource === 'stage'
                                ? 'مستهدف المرحلة'
                                : plan.targetSource === 'tenant'
                                  ? 'مستهدف المجمع'
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
                    {plan.direction === 'backward' ? 'تنازلي' : 'تصاعدي'} /{' '}
                    {(plan.revisionDirection || plan.revisionSettings?.direction) === 'forward'
                      ? 'مع الحفظ'
                      : 'عكسي'}
                  </span>
                </div>
              </div>
            </div>
          )}
          {!plan ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-600 text-sm">لا توجد خطة قرآنية نشطة لهذا الطالب بعد.</p>
              <p className="text-xs text-slate-400 mt-1">تُنشأ الخطة من «الخطة القرآنية» ثم تظهر هنا كاملة.</p>
            </div>
          ) : dailyPlans.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
              <BookOpen className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="font-bold text-amber-900 text-sm">الخطة تحتاج إلى إعادة بناء</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                توجد خطة مسجلة لهذا الطالب لكن بياناتها اليومية غير مكتملة في قاعدة البيانات.
                أعد إنشاء الخطة من «الخطة القرآنية» لاستعادة الجدول الكامل دون فقدان موضع الطالب الحالي.
              </p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white rounded-xl border border-slate-200 p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Flag className="w-3 h-3" /> بداية الخطة
                  </div>
                  <div className="text-xs font-black text-slate-800 mt-0.5">{fmtDate(plan.startDate)}</div>
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
                    سورة {surahName(plan.currentPosition?.surahNumber)} — آية {plan.currentPosition?.ayahNumber ?? '—'}
                  </div>
                </div>
                <div className="bg-emerald-700 rounded-xl p-2.5 text-white">
                  <div className="text-[10px] font-bold text-emerald-100 flex items-center gap-1">
                    <Target className="w-3 h-3" /> المستهدف الحالي لنهاية الخطة
                  </div>
                  <div className="text-xs font-black mt-0.5 truncate">
                    سورة {surahName(plan.targetEnd?.surahNumber)} — آية {plan.targetEnd?.ayahNumber ?? '—'}
                  </div>
                  {plan.status === 'at_risk' && (
                    <div className="text-[9px] text-amber-200 font-bold mt-0.5">⚠ الخطة متعثرة — تتطلب تعديل الوتيرة</div>
                  )}
                </div>
              </div>

              {/* Prior achievement (before this plan was created) — real session
                  records only, never fabricated days */}
              {(priorMemRecords.length > 0 ||
                (student.currentSurah &&
                  plan.targetStart &&
                  (plan.targetStart.surahNumber !== 1 || plan.targetStart.ayahNumber !== 1))) && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
                  <div className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    الإنجاز السابق (قبل إنشاء هذه الخطة)
                  </div>
                  {priorMemRecords.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-indigo-800 font-bold">
                        جلسات تسميع موثقة: {priorMemRecords.length} — من {fmtDate(priorMemRecords[0].date)} إلى{' '}
                        {fmtDate(priorMemRecords[priorMemRecords.length - 1].date)}
                      </div>
                      <div className="text-[11px] text-indigo-700">
                        آخر موضع مثبت: سورة{' '}
                        {priorMemRecords[priorMemRecords.length - 1].memorization?.surahTo} — آية{' '}
                        {priorMemRecords[priorMemRecords.length - 1].memorization?.ayahTo}
                      </div>
                      <div className="text-[10px] text-indigo-600">
                        السور التي عمل عليها:{' '}
                        {Array.from(
                          new Set(priorMemRecords.map((r) => r.memorization?.surahTo).filter(Boolean))
                        ).join('، ')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-indigo-800">
                      الموضع المسجل في ملف الطالب عند بدء الخطة: سورة {student.currentSurah} — آية{' '}
                      {student.currentAyah ?? 1}
                    </div>
                  )}
                </div>
              )}

              {/* Student days note */}
              {student.quranPlan?.preferredWorkingDays && student.quranPlan.preferredWorkingDays.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-[11px] font-bold text-blue-800">
                  أيام دراسة هذا الطالب: {plan.schedule?.workingDays?.length ?? 0} يومًا أسبوعيًا (تُبنى الخطة على أيامه الفعلية فقط)
                </div>
              )}

              {/* CURRENT DAY panel — latest confirmed position + today's task
                  + actual vs planned (Phase M) */}
              {currentDayItem && (
                <div className="bg-blue-50/70 border border-blue-300 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className="text-[11px] font-black text-blue-900 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      اليوم الحالي — {currentDayItem.dayName} {fmtDate(currentDayItem.date)}
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
                      <span className="text-[9px] text-slate-400 font-bold block">المقرر اليوم</span>
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
                      <span className="text-[9px] text-slate-400 font-bold block">الإنجاز الفعلي</span>
                      <span className="font-black text-emerald-800 font-['Amiri',serif]">
                        {currentDayItem.actualAchieved?.unit?.displayLabel ||
                          'لم يُسجَّل بعد — بانتظار التسميع'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-blue-800 font-bold">
                    آخر موضع مثبت: سورة {surahName(plan.currentPosition?.surahNumber)} — آية{' '}
                    {plan.currentPosition?.ayahNumber ?? '—'}
                  </div>
                </div>
              )}

              {/* Unified Full Plan Table — matching preview style without vertical bloat */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-black text-slate-800">
                  <span>جدول الخطة القرآنية الشاملة — {dailyPlans.length} يوم عمل</span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    المنجز: {completedCount} من {dailyPlans.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-black border-b border-slate-200 sticky top-0 z-10">
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
                      {weeks.map(([weekNum, days]) => {
                        const weekDone = days.filter(
                          (d) => d.status === 'completed' || d.status === 'overachieved'
                        ).length;
                        return (
                          <React.Fragment key={weekNum}>
                            <tr>
                              <td
                                colSpan={spellingTrackOn ? (calendar !== 'none' ? 7 : 6) : (calendar !== 'none' ? 6 : 5)}
                                className="px-3 py-1.5 bg-blue-50/70 text-[10px] font-black text-blue-900 border-y border-blue-100"
                              >
                                الأسبوع {weekNum}{calendar !== 'none' ? ` — ${fmtDate(days[0].date)} ← ${fmtDate(days[days.length - 1].date)}` : ''} ({weekDone}/{days.length} يوم منجز)
                              </td>
                            </tr>
                            {days.map((d) => {
                              const meta = dayStatusMeta(d);
                              const isToday = d.date === todayIso;
                              const rec = recordsByDate.get(d.date);
                              const isHoliday = d.dayType === 'holiday' || holidays.has(d.date);
                              const achieved = d.actualAchieved;
                              const locked = d.isHistorical || d.isLocked || d.status === 'completed' || d.status === 'overachieved';

                              if (isHoliday) {
                                return (
                                  <tr key={d.id} className="bg-purple-50/70 border-y border-purple-100/90">
                                    <td
                                      colSpan={spellingTrackOn ? (calendar !== 'none' ? 7 : 6) : (calendar !== 'none' ? 6 : 5)}
                                      className="px-3 py-2 text-center text-purple-950 font-bold text-xs"
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        <span className="text-sm">🏖️</span>
                                        <span className="font-extrabold text-purple-950">إجازة رسمية معتمدة (لا يوجد تسميع)</span>
                                        <span className="text-purple-300 font-sans text-xs">•</span>
                                        <span className="text-purple-800 font-sans text-[11px] font-bold">
                                          {fmtDate(d.date)} ({d.dayName})
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr
                                  key={d.id}
                                  className={`transition-colors ${
                                    isToday
                                      ? 'bg-amber-50/80 font-semibold'
                                      : locked
                                        ? 'bg-emerald-50/40'
                                        : d.date < todayIso && d.status === 'pending'
                                          ? 'bg-slate-50/60'
                                          : 'hover:bg-slate-50/50'
                                  }`}
                                >
                                  {/* Date Column */}
                                  {calendar !== 'none' && (
                                    <td className="px-3 py-1.5 whitespace-nowrap font-bold text-slate-700 text-[10px]">
                                      {fmtDate(d.date)}
                                    </td>
                                  )}

                                  {/* Day Column */}
                                  <td className="px-3 py-1.5 whitespace-nowrap font-bold text-slate-800 text-[10px]">
                                    {calendar === 'none' ? `اليوم ${d.itemIndex}` : d.dayName}
                                  </td>

                                  {/* Memorization & Consolidation */}
                                  <td className="px-3 py-1.5 font-bold text-slate-900 font-['Amiri',serif]">
                                    {d.isConsolidationDay ? (
                                      <div>
                                        <span className="font-bold text-amber-900 bg-amber-100/80 border border-amber-200/90 px-2 py-0.5 rounded text-[11px]">
                                          تثبيت سورة {surahName(d.consolidationSurahNumber)} (تكرار {d.consolidationDayIndex || 1})
                                        </span>
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
                                    ) : d.dayType === 'general_revision' ? (
                                      <span className="font-bold text-purple-900 bg-purple-100/70 border border-purple-200/80 px-2 py-0.5 rounded text-[11px]">
                                        تثبيت ومراجعة عامة
                                      </span>
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
                                  <td className="px-3 py-1.5 text-slate-700 font-['Amiri',serif] text-[10px]">
                                    {d.revisionDisplayLabel || d.revisionPageStart ? (
                                      <span>{d.revisionDisplayLabel || `ص ${d.revisionPageStart}–${d.revisionPageEnd}`}</span>
                                    ) : (
                                      <span className="text-slate-400 font-sans font-normal">—</span>
                                    )}
                                  </td>

                                  {/* Spelling Track */}
                                  {spellingTrackOn && (
                                    <td className="px-3 py-1.5 text-[10px]">
                                      {rec?.spelling ? (
                                        <div className="font-bold text-slate-700">
                                          الدرس {rec.spelling.lessonNumber}
                                          <span className="mr-1 text-[8px] text-emerald-700 font-bold">
                                            {rec.spelling.statusTag}
                                          </span>
                                        </div>
                                      ) : d.spellingAssignment ? (
                                        <div className="font-bold text-slate-600">
                                          الدرس {d.spellingAssignment.lessonNumber}: {d.spellingAssignment.title}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                  )}

                                  {/* Status */}
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    <span
                                      className={`inline-block text-[9px] font-black border rounded-md px-1.5 py-0.5 ${meta.cls}`}
                                    >
                                      {meta.label}
                                    </span>
                                  </td>

                                  {/* Notes */}
                                  <td className="px-3 py-1.5 text-[10px] text-slate-500">
                                    {achieved?.notes || rec?.teacherRemarks || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-400 font-bold pb-2">
                الخطة ديناميكية — الأيام القادمة تعكس آخر إعادة جدولة بعد كل تسجيل إنجاز.
              </p>

              {/* Official signature footer — teacher / Quran supervisor /
                  complex director. Reads the tenant reportsConfig (signature
                  image, footer text) which was previously write-only. */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold text-slate-700">
                  <div>
                    <div className="mb-6">معلم الحلقة</div>
                    <div className="border-t border-slate-300 pt-1.5">
                      {teacherName}
                    </div>
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
                    <div className="border-t border-slate-300 pt-1.5">التوقيع والختم</div>
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
      </div>
    </div>
  );
};

export default ComprehensiveQuranPlanModal;
