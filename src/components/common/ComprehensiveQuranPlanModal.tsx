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
import { SURAHS_LIST } from '../../data/initialData';

type ViewVariant = 'teacher' | 'student' | 'parent';
type CalendarMode = 'hijri' | 'gregorian';

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
  const { getActiveStudentQuranPlan, sessionRecords } = useApp();
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

  const fmtDate = (d: string) =>
    calendar === 'hijri' ? formatHijriDate(d) : formatGregorianDate(d);

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
    const map = new Map<number, DailyPlanItem[]>();
    for (const d of dailyPlans) {
      const list = map.get(d.weekNumber) || [];
      list.push(d);
      map.set(d.weekNumber, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [dailyPlans]);

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

  const handlePrint = async () => {
    if (!printRef.current) return;
    await executePrintOrPdfFallback(printRef.current, {
      fileName: `الخطة_القرآنية_الشاملة_${student.fullName}.pdf`,
      title: `الخطة القرآنية الشاملة — ${student.fullName}`,
      orientation: 'portrait',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-[999] flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
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
            </div>
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              title="طباعة / PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body (printable) */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
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

              {/* Weekly timeline */}
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
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-slate-800">الأسبوع {weekNum}</span>
                        <span className="text-[10px] text-slate-400 font-bold truncate">
                          {fmtDate(days[0].date)} ← {fmtDate(days[days.length - 1].date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5">
                          {weekDone}/{days.length}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {open && (
                      <div className="divide-y divide-slate-100">
                        {days.map((d) => {
                          const meta = dayStatusMeta(d);
                          const isToday = d.date === todayIso;
                          const rec = recordsByDate.get(d.date);
                          const isHoliday = holidays.has(d.date);
                          const achieved = d.actualAchieved;
                          return (
                            <div
                              key={d.id}
                              className={`px-3 py-2.5 ${isToday ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300' : d.isHistorical ? 'bg-white' : 'bg-slate-50/40'}`}
                            >
                              {/* Day header */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[11px] font-black text-slate-800 whitespace-nowrap">
                                    {d.dayName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">
                                    {fmtDate(d.date)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {d.dayType && (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1 py-0.5">
                                      {DAY_TYPE_LABELS[d.dayType] || d.dayType}
                                    </span>
                                  )}
                                  {isHoliday && (
                                    <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 py-0.5">
                                      إجازة
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-black border rounded-lg px-2 py-0.5 ${meta.cls}`}>
                                    {meta.label}
                                  </span>
                                </div>
                              </div>

                              {/* Three tracks */}
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                                {/* Spelling (from session record) */}
                                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                                  <div className="flex items-center gap-1 font-black text-slate-500 mb-0.5">
                                    <Sparkles className="w-3 h-3 text-emerald-600" /> الهجاء
                                  </div>
                                  {rec?.spelling ? (
                                    <div className="text-slate-700 font-bold">
                                      الدرس {rec.spelling.lessonNumber} — {rec.spelling.finalScore}%
                                      <span className="block text-[9px] text-emerald-700">{rec.spelling.statusTag}</span>
                                    </div>
                                  ) : rec?.spellingDrillMinutes ? (
                                    <div className="text-slate-700 font-bold">تدريب {rec.spellingDrillMinutes} د</div>
                                  ) : (
                                    <div className="text-slate-400">—</div>
                                  )}
                                </div>

                                {/* Memorization */}
                                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                                  <div className="flex items-center gap-1 font-black text-slate-500 mb-0.5">
                                    <BookOpen className="w-3 h-3 text-blue-600" /> الحفظ
                                  </div>
                                  <div className="text-slate-700 font-bold leading-relaxed">
                                    {achieved ? achieved.unit.displayLabel : d.targetUnit.displayLabel}
                                  </div>
                                  {achieved && (
                                    <div className="text-[9px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {achieved.evaluation ? EVAL_LABELS[achieved.evaluation] : 'سُجّل'}
                                    </div>
                                  )}
                                </div>

                                {/* Revision */}
                                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                                  <div className="flex items-center gap-1 font-black text-slate-500 mb-0.5">
                                    <RotateCcw className="w-3 h-3 text-amber-600" /> المراجعة
                                  </div>
                                  {d.revisionDisplayLabel || rec?.revision ? (
                                    <div className="text-slate-700 font-bold leading-relaxed">
                                      {d.revisionDisplayLabel || `ص ${d.revisionPageStart}–${d.revisionPageEnd}`}
                                      {rec?.revision && (
                                        <span className="block text-[9px] text-amber-700">
                                          تقييم {rec.revision.score}%
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400">—</div>
                                  )}
                                </div>
                              </div>

                              {/* Notes / actual remarks */}
                              {(achieved?.notes || rec?.teacherRemarks) && (
                                <div className="mt-1.5 text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                                  {achieved?.notes || rec?.teacherRemarks}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="text-center text-[10px] text-slate-400 font-bold pb-2">
                الخطة ديناميكية — الأيام القادمة تعكس آخر إعادة جدولة بعد كل تسجيل إنجاز.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveQuranPlanModal;
