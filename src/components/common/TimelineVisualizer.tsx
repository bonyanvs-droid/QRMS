import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, CheckCircle2, Clock, Sparkles, Target, AlertCircle } from 'lucide-react';

interface TimelineVisualizerProps {
  onSelectWeek?: (weekNumber: number) => void;
  selectedWeek?: number;
}

export const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({ onSelectWeek, selectedWeek }) => {
  const { academicConfig, educationalPlan, currentUser } = useApp();
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  const isStaff = Boolean(
    currentUser && (
      currentUser.role === 'admin' ||
      currentUser.role === 'system_admin' ||
      currentUser.role === 'campus_admin' ||
      currentUser.role === 'supervisor' ||
      currentUser.role === 'teacher'
    )
  );

  const startWeek = academicConfig.operationalStartWeek; // 3
  const endWeek = academicConfig.operationalEndWeek; // 14
  const currentWeek = academicConfig.currentWeek; // e.g. 6
  const totalOperationalWeeks = endWeek - startWeek + 1; // 12
  const elapsedWeeks = Math.max(0, currentWeek - startWeek);
  const remainingWeeks = Math.max(0, endWeek - currentWeek);
  const progressPct = Math.min(100, Math.round((elapsedWeeks / totalOperationalWeeks) * 100));

  const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === currentWeek);
  const activeDetailWeek = hoveredWeek || selectedWeek || currentWeek;
  const activeWeekPlan = educationalPlan.find((w) => w.weekNumber === activeDetailWeek);

  // Generate array of operational weeks
  const weeksArray = Array.from({ length: totalOperationalWeeks }, (_, i) => startWeek + i);

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
              <Clock className="w-5 h-5 text-emerald-700" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">المؤشر والخط الزمني للمرحلة التشغيلية</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              12 أسبوعًا تشغيليًا
            </span>
          </div>
          <p className="text-xs text-slate-700 mt-1">
            تمتد المرحلة التشغيلية الحالية من{' '}
            <strong className="text-slate-800">الأسبوع {startWeek}</strong> حتى{' '}
            <strong className="text-slate-800">الأسبوع {endWeek}</strong> ({academicConfig.semester} - {academicConfig.name})
          </p>
        </div>

        {/* Quick metrics summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 text-center">
            <span className="text-xs text-emerald-700 block font-medium">الأسبوع الحالي</span>
            <span className="text-xl font-black text-emerald-900">الأسبوع {currentWeek}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
            <span className="text-xs text-slate-700 block font-medium">المنقضية / المتبقية</span>
            <span className="text-base font-bold text-slate-800">
              {elapsedWeeks} <span className="text-xs text-slate-600 font-normal">منقضٍ</span> | {remainingWeeks}{' '}
              <span className="text-xs text-slate-600 font-normal">متبقٍ</span>
            </span>
          </div>
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-2 text-center">
            <span className="text-xs text-amber-800 block font-medium">نسبة الإنجاز الزمني</span>
            <span className="text-base font-black text-amber-900">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Bar with Interactive Nodes */}
      <div className="mt-6">
        <div className="text-[11px] text-slate-500 font-medium md:hidden mb-2 flex items-center justify-between">
          <span>← اسحب أفقياً لاستعراض أسابيع الخطة الـ 12 →</span>
          <span className="font-bold text-emerald-800">الأسبوع الحالي: {currentWeek}</span>
        </div>
        <div className="overflow-x-auto pb-3 pt-1 -mx-2 px-2 scrollbar-thin">
          <div className="min-w-[560px] md:min-w-0 relative py-2">
            {/* Background Track Line */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-1.5 bg-slate-200 rounded-full"></div>
            {/* Active Completed Track Line */}
            <div
              className="absolute top-1/2 -translate-y-1/2 right-4 h-1.5 bg-emerald-600 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, ((currentWeek - startWeek) / (totalOperationalWeeks - 1)) * 100))}%`,
              }}
            ></div>

            {/* Interactive Week Nodes */}
            <div className="relative flex justify-between items-center z-10">
              {weeksArray.map((weekNum) => {
                const isPast = weekNum < currentWeek;
                const isCurrent = weekNum === currentWeek;
                const isFuture = weekNum > currentWeek;
                const isSelected = selectedWeek === weekNum;
                const plan = educationalPlan.find((p) => p.weekNumber === weekNum);

                return (
                  <button
                    key={weekNum}
                    onClick={() => onSelectWeek && onSelectWeek(weekNum)}
                    onMouseEnter={() => setHoveredWeek(weekNum)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    className="group flex flex-col items-center focus:outline-hidden px-1 cursor-pointer"
                    title={`الأسبوع ${weekNum}: ${plan?.motto || 'الخطة التربوية'}`}
                  >
                    {/* Node Circle */}
                    <div
                      className={`w-8 h-8 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                        isCurrent
                          ? 'bg-emerald-700 text-white ring-4 ring-emerald-200 shadow-md scale-110'
                          : isSelected
                          ? 'bg-amber-500 text-white ring-3 ring-amber-200'
                          : isPast
                          ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500 hover:bg-emerald-200'
                          : 'bg-white text-slate-600 border-2 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : weekNum}
                    </div>

                    {/* Week Label */}
                    <span
                      className={`text-[10px] md:text-xs mt-1.5 font-medium whitespace-nowrap transition-colors ${
                        isCurrent
                          ? 'text-emerald-800 font-bold'
                          : isSelected
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-600 group-hover:text-slate-800'
                      }`}
                    >
                      {isCurrent ? `(الحالي) ${weekNum}` : `أسبوع ${weekNum}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Selected/Current Week Spotlight Banner */}
      {activeWeekPlan && (
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
          <div className="flex items-start md:items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">
                  الأسبوع {activeWeekPlan.weekNumber} ({activeWeekPlan.startDate} إلى {activeWeekPlan.endDate})
                </span>
                {activeWeekPlan.weekNumber === currentWeek && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    الأسبوع النشط الآن
                  </span>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                  {activeWeekPlan.motto}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                <strong>الهدف التربوي:</strong> {activeWeekPlan.educationalGoal} • <strong>النشاط:</strong>{' '}
                {activeWeekPlan.activity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">
            <span>
              <strong>المشرف:</strong> {activeWeekPlan.responsiblePerson}
            </span>
            {isStaff && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-800 font-semibold">
                  <strong>الميزانية:</strong> {activeWeekPlan.budget} ر.س
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
