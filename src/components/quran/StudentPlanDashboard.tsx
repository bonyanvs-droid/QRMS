import React, { useState } from 'react';
import {
  StudentQuranPlan,
  DailyPlanItem,
  WeeklyPlanSummary,
  MonthlyPlanSummary,
  TermPlanSummary,
} from '../../quran/types/plan';
import { formatQuranTextExpression, QuranPositionFormatter } from '../../quran/utils/positionFormatter';
import { getSurahArabicName } from '../../quran/utils/planNormalizer';
import {
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';

interface StudentPlanDashboardProps {
  plan: StudentQuranPlan;
  onRecordDay?: (day: DailyPlanItem) => void;
  readOnly?: boolean;
}

export const StudentPlanDashboard: React.FC<StudentPlanDashboardProps> = ({
  plan,
  onRecordDay,
  readOnly = false,
}) => {
  const [viewLevel, setViewLevel] = useState<'day' | 'week' | 'month' | 'term'>('day');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  if (
    !plan ||
    !plan.generatedPlan ||
    !Array.isArray(plan.generatedPlan.dailyPlans) ||
    plan.generatedPlan.dailyPlans.length === 0
  ) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
          <BookOpen className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800">بيانات الخطة القرآنية قيد التجهيز</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          لم يتم العثور على جدول يومي مكتمل لهذه الخطة بعد، يمكنك توليد الخطة أو تطبيق الخطة من معالج الخطط.
        </p>
      </div>
    );
  }

  const { generatedPlan, status, targetAtRiskDiagnostic } = plan;
  const originalTarget = plan.originalTarget || {
    totalAyahs: 0,
    totalUnits: 0,
    displayTarget: '',
    targetStart: plan.targetStart,
    targetEnd: plan.targetEnd,
    direction: plan.direction,
    unitType: plan.unitType,
    dailyAmount: plan.dailyAmount,
    snapshotDate: '',
  };
  const currentPosition = plan.currentPosition || plan.targetStart || { surahNumber: 1, ayahNumber: 1 };
  const dailyPlans = generatedPlan?.dailyPlans || [];
  const weeklyPlans = generatedPlan?.weeklyPlans || [];
  const monthlyPlans = generatedPlan?.monthlyPlans || [];
  const termPlan = generatedPlan?.termPlan || {
    termName: 'خطة الحفظ للفصل الدراسي',
    startDate: plan.startDate || '',
    endDate: plan.endDate || '',
    startPosition: plan.targetStart,
    endPosition: plan.targetEnd,
    displayLabel: originalTarget.displayTarget || '',
    totalAyahs: originalTarget.totalAyahs || 0,
    totalUnits: originalTarget.totalUnits || 0,
    totalWorkingDays: dailyPlans.length,
    direction: plan.direction || 'backward',
  };

  // Completed metrics
  const completedDays = dailyPlans.filter(
    (d) => d.status === 'completed' || d.status === 'overachieved'
  ).length;
  const absentDays = dailyPlans.filter((d) => d.status === 'absent').length;
  const totalDays = dailyPlans.length;
  const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Active or upcoming day
  const todayIso = new Date().toISOString().split('T')[0];
  const activeDayIndex = dailyPlans.findIndex(
    (d) => d.date >= todayIso && d.status === 'pending'
  );
  const currentDay = activeDayIndex !== -1 ? dailyPlans[activeDayIndex] : dailyPlans[0];

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. At-Risk Warning Callout (if pace is behind) */}
      {status === 'at_risk' && targetAtRiskDiagnostic && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-xs animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-200/80 rounded-xl text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-bold text-base text-amber-950">
                  تنبيه تعثر الخطة (المستهدف في خطر - Target At Risk)
                </h4>
                <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 text-xs font-black rounded-full">
                  عجز متوقع: {targetAtRiskDiagnostic.deficitUnits} وحدة
                </span>
              </div>
              <p className="text-sm text-amber-900 mt-1 leading-relaxed">
                {targetAtRiskDiagnostic.warningMessage}
              </p>

              {/* Actionable recommendations */}
              <div className="mt-3 p-3 bg-white/80 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-950 block mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  توصيات تصحيحية مقترحة:
                </span>
                <ul className="text-xs space-y-1 text-amber-900 list-disc list-inside">
                  {(targetAtRiskDiagnostic.actionableRecommendations || []).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Summary KPI Cards (Comparison: Original Target vs Current vs Progress) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Original Target */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">المستهدف الأصلي</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 truncate" title={originalTarget.displayTarget}>
            {originalTarget.totalAyahs} آية ({originalTarget.totalUnits} وحدة)
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>محفوظ وثابت منذ البداية</span>
          </div>
        </div>

        {/* Current Position */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">الموقع الفعلي الحالي</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            {QuranPositionFormatter.getSurahName((currentPosition as any).surahName || (currentPosition as any).surahNumber || (currentPosition as any).surah || 1)} [آية {(currentPosition as any).ayahNumber || (currentPosition as any).ayah || 1}]
          </div>
          <div className="text-[11px] text-blue-700 mt-1">
            اتجاه {plan.direction === 'backward' ? 'تنازلي (نحو الغاشية)' : 'تصاعدي'}
          </div>
        </div>

        {/* Completion Progress */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">نسبة إنجاز الأيام</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-800">
            {completedDays} من {totalDays} يوم ({progressPercent}%)
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Plan Version & Status */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">إصدار الخطة</span>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>السجل</span>
            </button>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            الإصدار v{plan.planVersion}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'at_risk'
                  ? 'bg-amber-500'
                  : status === 'completed'
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
              }`}
            ></span>
            <span>
              {status === 'at_risk'
                ? 'متعثر / تحت الملاحظة'
                : status === 'completed'
                  ? 'مكتمل'
                  : 'منتظم ونشط'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Multi-Level View Selector (Day | Week | Month | Term) */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 ml-2 hidden sm:inline">مستوى العرض:</span>
          {(['day', 'week', 'month', 'term'] as const).map((lvl) => {
            const labels = {
              day: 'اليومي (Day)',
              week: 'الأسبوعي (Week)',
              month: 'الشهري (Month)',
              term: 'الفصلي الشامل (Term)',
            };
            return (
              <button
                key={lvl}
                onClick={() => setViewLevel(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewLevel === lvl
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {labels[lvl]}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          مربوط بمصدر موحد: {dailyPlans.length} يوماً دراسياً
        </div>
      </div>

      {/* 4. LEVEL CONTENT */}

      {/* LEVEL A: DAILY VIEW */}
      {viewLevel === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>جدول الأوراد اليومية (مرتبة تسلسلياً يوماً بيوم)</span>
            </h3>
            <span className="text-xs text-slate-500">
              الأيام السابقة مقفلة ومصانة • المستقبلية يعاد حسابها بمرونة
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5 w-36">اليوم والتاريخ</th>
                    <th className="p-3.5 w-24 text-center">الأسبوع</th>
                    <th className="p-3.5 min-w-[220px]">المقرر المستهدف</th>
                    <th className="p-3.5 min-w-[200px]">الإنجاز الفعلي والتقييم</th>
                    <th className="p-3.5 w-36 text-center">الحالة</th>
                    <th className="p-3.5 w-28 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyPlans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        لا توجد أوراد يومية مسجلة لهذه الخطة حالياً.
                      </td>
                    </tr>
                  ) : (
                    dailyPlans.map((day) => {
                      const isLocked = day.isLocked || day.isHistorical;
                      const statusBadges = {
                        completed: 'bg-emerald-50 text-emerald-900 border-emerald-300',
                        overachieved: 'bg-blue-50 text-blue-900 border-blue-300',
                        partial: 'bg-amber-50 text-amber-900 border-amber-300',
                        absent: 'bg-rose-50 text-rose-900 border-rose-300',
                        excused: 'bg-purple-50 text-purple-900 border-purple-300',
                        pending: 'bg-slate-50 text-slate-700 border-slate-200',
                      };

                      const badgeTexts = {
                        completed: 'تم الإنجاز بنجاح ✓',
                        overachieved: 'إنجاز متفوق / فائض 🌟',
                        partial: 'إنجاز جزئي ⏳',
                        absent: 'غياب الطالب ✗',
                        excused: 'استئذان بعذر 📝',
                        pending: 'قيد الانتظار 📅',
                      };

                      return (
                        <tr
                          key={day.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            day.status === 'completed'
                              ? 'bg-emerald-50/20'
                              : day.status === 'overachieved'
                              ? 'bg-blue-50/20'
                              : ''
                          }`}
                        >
                          {/* Day & Date */}
                          <td className="p-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              {isLocked && (
                                <span
                                  title="سجل تاريخي محفوظ ومقفل"
                                  className="p-1 rounded-md bg-slate-200 text-slate-600 text-[10px]"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <div>
                                <span className="font-black text-slate-900 block text-xs">
                                  {day.dayName}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono block">
                                  {day.date}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Week */}
                          <td className="p-3.5 text-center align-middle">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                              الأسبوع {day.weekNumber}
                            </span>
                          </td>

                          {/* Target Unit */}
                          <td className="p-3.5 align-middle">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                    day.planType === 'memorization'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {day.planType === 'memorization' ? 'حفظ جديد' : 'مراجعة وتثبيت'}
                                </span>
                                {day.targetUnit.totalAyahs > 0 && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    ({day.targetUnit.totalAyahs} آية)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug font-quran">
                                {formatQuranTextExpression(day.targetUnit.displayLabel)}
                              </div>

                              {/* Revision Details for Memorization Day (if accompanying revision exists) */}
                              {day.planType === 'memorization' && (day.targetUnit?.revisionDisplay || day.targetUnit?.revisionPages || day.revisionDisplayLabel) && (
                                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-2 flex-wrap text-[11px]">
                                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                                    🔄 {day.targetUnit.revisionDisplay || day.revisionDisplayLabel || `مراجعة: ${day.targetUnit.revisionPages} ص`}
                                  </span>
                                  {(day.revisionPageStart || day.revisionPageEnd) && (
                                    <span className="text-slate-600 font-medium">
                                      (من ص {day.revisionPageStart || 1} إلى ص {day.revisionPageEnd || day.revisionPageStart || 1})
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Start/End explicit details for pure revision days if pages or range available */}
                              {day.planType === 'revision' && (day.revisionPageStart || day.revisionPageEnd || day.targetUnit?.pageStart) && (
                                <div className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                  <span>نطاق الصفحات:</span>
                                  <span className="font-bold text-slate-700">
                                    ص {day.revisionPageStart || day.targetUnit?.pageStart || 1} 
                                    {day.revisionPageEnd && day.revisionPageEnd !== (day.revisionPageStart || day.targetUnit?.pageStart)
                                      ? ` إلى ص ${day.revisionPageEnd}`
                                      : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actual Record */}
                          <td className="p-3.5 align-middle">
                            {day.actualAchieved ? (
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-950">
                                <div className="font-bold flex items-center justify-between">
                                  <span>{formatQuranTextExpression(day.actualAchieved.unit.displayLabel)}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900">
                                    {day.actualAchieved.evaluation || 'معتمد'}
                                  </span>
                                </div>
                                {day.actualAchieved.notes && (
                                  <div className="text-[11px] text-slate-600 mt-1 italic">
                                    «{day.actualAchieved.notes}»
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs italic">
                                بانتظار التسميع...
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5 text-center align-middle">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-xl border inline-block whitespace-nowrap ${
                                statusBadges[day.status]
                              }`}
                            >
                              {badgeTexts[day.status]}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="p-3.5 text-center align-middle">
                            {!readOnly && onRecordDay && day.status === 'pending' ? (
                              <button
                                onClick={() => onRecordDay(day)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                              >
                                تسجيل الإنجاز
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL B: WEEKLY VIEW */}
      {viewLevel === 'week' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>الخطة الأسبوعية التراكمية ({weeklyPlans.length} أسابيع)</span>
            </h3>
            <span className="text-xs text-slate-500">
              ملخص الأهداف الأسبوعية مجمّعة تلقائياً
            </span>
          </div>

          <div className="space-y-3">
            {weeklyPlans.map((w) => {
              const completedCount = w.days.filter(
                (d) => d.status === 'completed' || d.status === 'overachieved'
              ).length;
              const percent = w.days.length > 0 ? Math.round((completedCount / w.days.length) * 100) : 0;

              return (
                <div
                  key={w.weekNumber}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                        {w.weekNumber}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        الأسبوع {w.weekNumber} ({w.startDate} إلى {w.endDate})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {w.totalAyahs} آية مقررة
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                        {completedCount}/{(w.days || []).length} أيام مكتملة ({percent}%)
                      </span>
                    </div>
                  </div>

                  {/* Day Pills inside Week */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-100">
                    {(w.days || []).map((d) => (
                      <div
                        key={d.id}
                        className={`p-2 rounded-xl text-xs border ${
                          d.status === 'completed' || d.status === 'overachieved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : d.status === 'absent'
                              ? 'bg-rose-50 border-rose-200 text-rose-950'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="font-bold text-[11px] flex items-center justify-between">
                          <span>{d.dayName}</span>
                          {d.isLocked && <Lock className="w-2.5 h-2.5 text-slate-500" />}
                        </div>
                        <div className="text-[10px] mt-0.5 truncate font-quran" title={formatQuranTextExpression(d.targetUnit.displayLabel)}>
                          {formatQuranTextExpression(d.targetUnit.displayLabel)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL C: MONTHLY VIEW */}
      {viewLevel === 'month' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>الخطة الشهرية ومحطات الإنجاز ({monthlyPlans.length} أشهر)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthlyPlans.map((m) => (
              <div
                key={m.monthNumber}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-xl bg-emerald-800 text-white font-black text-xs">
                    {m.monthName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {m.startDate} ~ {m.endDate}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base mb-1 font-quran">
                  {formatQuranTextExpression(m.displayLabel)}
                </h4>

                <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
                  <span>إجمالي الآيات: <b>{m.totalAyahs} آية</b></span>
                  <span>عدد الأسابيع: <b>{(m.weeks || []).length} أسابيع</b></span>
                </div>

                <div className="mt-4 space-y-2">
                  {(m.weeks || []).map((w) => (
                    <div
                      key={w.weekNumber}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold">الأسبوع {w.weekNumber}</span>
                      <span className="font-quran text-slate-700">{formatQuranTextExpression(w.displayLabel)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL D: TERM SUMMARY VIEW */}
      {viewLevel === 'term' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>الميثاق الفصلي الشامل (Term Plan Contract)</span>
            </h3>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
              {termPlan.termName}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold mb-1">النطاق والاتجاه المعتمد:</div>
              <div className="text-sm font-bold text-slate-900 font-quran">
                {formatQuranTextExpression(termPlan.displayLabel)}
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                الاتجاه: {termPlan.direction === 'backward' ? 'تنازلي (الناس ← البقرة)' : 'تصاعدي (البقرة ← الناس)'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold mb-1">الفترة الزمنية وأيام الدراسة:</div>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {termPlan.startDate} إلى {termPlan.endDate}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                إجمالي أيام الدراسة المتاحة: {termPlan.totalWorkingDays} يوم
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
            <b>مبدأ وثيقة الخطة:</b> المستهدف الأصلي يُحفظ في الذاكرة كسجل تعاقدي ثابت. أي تعديل في وتيرة الطالب لا يُلغي أو يُقلص المستهدف سراً، بل يُعيد جدولة الأيام المتبقية أو يُسجل حالة «تعثر الوتيرة» مع توصيات للمعلم وولي الأمر.
          </div>
        </div>
      )}

      {/* 5. HISTORY & AUDIT MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-700" />
                <span>سجل الرقابة وإصدارات الخطة (Audit & Version History)</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Version History */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 mb-2">إصدارات الخطة المتتابعة:</h4>
              <div className="space-y-2">
                {(plan.versionHistory || []).map((vh) => (
                  <div
                    key={vh.version}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-emerald-800">إصدار v{vh.version}</span>
                      <span className="text-slate-600 mr-2">— {vh.reason}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(vh.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recalculation History */}
            {(plan.recalculationHistory || []).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2">سجل أحداث إعادة الحساب التلقائي:</h4>
                <div className="space-y-2">
                  {(plan.recalculationHistory || []).map((rh) => (
                    <div
                      key={rh.id}
                      className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-amber-950">
                        <span>السبب: {rh.trigger}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{rh.timestamp.split('T')[0]}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1">{rh.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher Overrides */}
            {(plan.teacherOverrides || []).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2">سجل تعديلات المعلم المباشرة (Teacher Overrides):</h4>
                <div className="space-y-2">
                  {(plan.teacherOverrides || []).map((to) => (
                    <div
                      key={to.id}
                      className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-blue-950">
                        <span>المعلم: {to.teacherName || to.teacherId}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{to.effectiveFromDate}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-0.5">{to.reasonArabicText || to.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
