import React, { useState } from 'react';
import {
  Sparkles,
  Edit2,
  Trash2,
  Send,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  DollarSign,
  Coffee,
  Bookmark,
  Flag,
} from 'lucide-react';
import { EducationalPlanWeek, EducationalStage } from '../../types';
import { formatWeekDayDate } from '../../utils/educationalPlanUtils';

interface EducationalPlanMatrixProps {
  weeks: EducationalPlanWeek[];
  stage?: EducationalStage;
  currentAcademicWeek?: number;
  canManage: boolean;
  isStaff: boolean;
  selectedWeekIds?: string[];
  onToggleSelectWeek?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onEditWeek: (week: EducationalPlanWeek) => void;
  onDeleteWeek: (id: string, weekNumber: number, title?: string) => void;
  onToggleStatus: (week: EducationalPlanWeek) => void;
  onSendAnnouncement: (week: EducationalPlanWeek) => void;
}

export const EducationalPlanMatrix: React.FC<EducationalPlanMatrixProps> = ({
  weeks,
  stage,
  currentAcademicWeek,
  canManage,
  isStaff,
  selectedWeekIds = [],
  onToggleSelectWeek,
  onToggleSelectAll,
  onEditWeek,
  onDeleteWeek,
  onToggleStatus,
  onSendAnnouncement,
}) => {
  const [selectedDay, setSelectedDay] = useState<'saturday' | 'thursday' | 'friday'>('saturday');
  const totalBudget = weeks.reduce((sum, w) => sum + (w.budget || 0), 0);
  const allSelected = weeks.length > 0 && selectedWeekIds.length === weeks.length;
  const isIndeterminate = selectedWeekIds.length > 0 && selectedWeekIds.length < weeks.length;

  const getWeekTypeBadge = (weekType?: string, specialTitle?: string) => {
    switch (weekType) {
      case 'long_weekend':
        return (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border-y-2 border-amber-300 text-amber-900 font-black text-sm rounded-xl">
            <Coffee className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{specialTitle || 'إجازة نهاية أسبوع مطولة ☕'}</span>
          </div>
        );
      case 'founding_day':
        return (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-900/15 via-amber-800/20 to-amber-900/15 border-y-2 border-amber-800/40 text-amber-950 font-black text-sm rounded-xl">
            <Flag className="w-5 h-5 text-amber-800 shrink-0" />
            <span>{specialTitle || 'إجازة يوم التأسيس السعودي 🇸🇦'}</span>
          </div>
        );
      case 'national_day':
        return (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-700/15 via-emerald-600/20 to-emerald-700/15 border-y-2 border-emerald-600 text-emerald-950 font-black text-sm rounded-xl">
            <Flag className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{specialTitle || 'إجازة اليوم الوطني 🇸🇦'}</span>
          </div>
        );
      case 'dead_week':
        return (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-y-2 border-slate-300 text-slate-800 font-black text-sm rounded-xl">
            <AlertCircle className="w-5 h-5 text-slate-600 shrink-0" />
            <span>{specialTitle || 'الأسبوع الميت / استكمال المناهج وتثبيت المحفوظات 📖'}</span>
          </div>
        );
      case 'exams':
        return (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-700/15 via-blue-600/20 to-indigo-700/15 border-y-2 border-indigo-400 text-indigo-950 font-black text-sm rounded-xl">
            <Award className="w-5 h-5 text-indigo-700 shrink-0" />
            <span>{specialTitle || 'فترة الاختبارات النهائية وتكريم المتميزين 🎯'}</span>
          </div>
        );
      case 'midterm_break':
      case 'vacation':
        return (
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-500/15 via-emerald-400/20 to-teal-500/15 border-y-2 border-teal-300 text-teal-950 font-black text-sm rounded-xl">
            <Coffee className="w-5 h-5 text-teal-700 shrink-0" />
            <span>{specialTitle || 'إجازة ما بين الفصلين الدراسيين 🌴'}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getDomainColor = (domain?: string) => {
    switch (domain) {
      case 'faith':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'behavioral':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'skills':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'quranic':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
      {/* 1. Official Table Header for Printing / Display */}
      <div className="p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-800 text-white font-black text-xs">
                مصفوفة الخطة المعتمدة
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {stage ? stage.name : 'البرنامج التربوي العام للمجمع'}
              </h3>
            </div>
            {stage?.outcomeSummary && (
              <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed bg-emerald-50/70 border border-emerald-200/70 p-2.5 rounded-xl max-w-4xl">
                <strong className="text-emerald-900 font-bold ml-1">مخرج المرحلة:</strong>
                {stage.outcomeSummary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-left sm:text-right bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 block text-[10px]">إجمالي الأسابيع</span>
              <span className="font-black text-slate-900 text-sm">{weeks.length} أسبوعاً</span>
            </div>
            {isStaff && (
              <div className="text-left sm:text-right bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-xs">
                <span className="text-emerald-700 block text-[10px]">الميزانية التقديرية</span>
                <span className="font-black text-emerald-900 text-sm">{totalBudget} ر.س</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Structured Full Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          {/* Header Row 1: Merged Group Headers */}
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-center border-b border-slate-800">
              {canManage && (
                <th rowSpan={2} className="p-2.5 w-10 text-center border-l border-slate-800">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    title="تحديد الكل / إلغاء تحديد الكل"
                  />
                </th>
              )}
              <th rowSpan={2} className="p-3 w-16 border-l border-slate-800">
                الأسبوع
              </th>
              <th rowSpan={2} className="p-2.5 bg-slate-800 text-white border-l border-slate-700 min-w-[140px] text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-black text-xs">يوم وتاريخ النشاط</span>
                  <div className="inline-flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedDay('saturday')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        selectedDay === 'saturday'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="عرض يوم وتاريخ السبت (المعتمد)"
                    >
                      السبت
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDay('thursday')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        selectedDay === 'thursday'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="عرض يوم وتاريخ الخميس"
                    >
                      الخميس
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDay('friday')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        selectedDay === 'friday'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="عرض يوم وتاريخ الجمعة"
                    >
                      الجمعة
                    </button>
                  </div>
                </div>
              </th>
              <th colSpan={5} className="p-2.5 bg-emerald-950 border-l border-emerald-800">
                الأهداف والقيم والموضوعات التربوية
              </th>
              <th colSpan={4} className="p-2.5 bg-amber-950 border-l border-amber-800">
                الفقرة الثقافية والتفاعلية والمسؤوليات
              </th>
              <th colSpan={2} className="p-2.5 bg-purple-950 border-l border-purple-800">
                البرنامج القرآني والميزانية
              </th>
              <th rowSpan={2} className="p-3 w-28 text-center">
                الإجراءات
              </th>
            </tr>

            {/* Header Row 2: Sub-Column Headers */}
            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
              {/* Goals */}
              <th className="p-2.5 w-20 text-center border-l border-slate-200 bg-emerald-50/50 text-emerald-950">
                المجال
              </th>
              <th className="p-2.5 min-w-[140px] border-l border-slate-200 bg-emerald-50/50 text-emerald-950">
                القيمة
              </th>
              <th className="p-2.5 min-w-[150px] border-l border-slate-200 bg-emerald-50/50 text-emerald-950">
                الشعار
              </th>
              <th className="p-2.5 min-w-[200px] border-l border-slate-200 bg-emerald-50/50 text-emerald-950">
                مواضيع الهدف المعتمد
              </th>
              <th className="p-2.5 min-w-[140px] border-l border-slate-200 bg-emerald-50/50 text-emerald-950">
                المقدم والمكان
              </th>

              {/* Activities */}
              <th className="p-2.5 min-w-[160px] border-l border-slate-200 bg-amber-50/50 text-amber-950">
                الفقرة التفاعلية
              </th>
              <th className="p-2.5 min-w-[110px] border-l border-slate-200 bg-amber-50/50 text-amber-950">
                مقدم الفقرة
              </th>
              <th className="p-2.5 min-w-[100px] border-l border-slate-200 bg-amber-50/50 text-amber-950">
                مكان النشاط
              </th>
              <th className="p-2.5 min-w-[110px] border-l border-slate-200 bg-amber-50/50 text-amber-950">
                المشرف المسؤول
              </th>

              {/* Quranic & Budget */}
              <th className="p-2.5 min-w-[150px] border-l border-slate-200 bg-purple-50/50 text-purple-950">
                البرنامج القرآني
              </th>
              <th className="p-2.5 w-24 text-center border-l border-slate-200 bg-purple-50/50 text-purple-950">
                الميزانية
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {weeks.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 15 : 14} className="p-12 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-3">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700">لا توجد أسابيع مسجلة في خطة هذه المرحلة بعد</p>
                    <p className="text-xs text-slate-500">
                      يمكنك توليد أسابيع الفصل بضغطة زر، أو رفع ملف إكسيل، أو استخدام برومبت الذكاء الاصطناعي.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              weeks.map((week) => {
                const isCurrent = week.weekNumber === currentAcademicWeek;
                const isVacation = week.weekType && week.weekType !== 'normal';
                const isCompleted = week.status === 'completed';
                const isInProgress = week.status === 'in_progress';
                const isSelected = selectedWeekIds.includes(week.id);

                if (isVacation) {
                  return (
                    <tr
                      key={week.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 ring-2 ring-emerald-500/50'
                          : isCurrent
                          ? 'bg-amber-50/90 ring-2 ring-amber-400'
                          : 'bg-slate-50/60'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      {canManage && (
                        <td className="p-2.5 text-center border-l border-slate-200">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelectWeek?.(week.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            title={`تحديد الأسبوع ${week.weekNumber}`}
                          />
                        </td>
                      )}

                      {/* Week Number */}
                      <td className="p-3 text-center font-black text-slate-900 border-l border-slate-200">
                        <span className="w-8 h-8 mx-auto rounded-xl bg-slate-200 text-slate-800 font-bold flex items-center justify-center">
                          {week.weekNumber}
                        </span>
                      </td>

                      {/* Single Day & Date Column */}
                      <td className="p-2.5 text-center text-xs font-bold text-amber-900 border-l border-slate-200 whitespace-nowrap bg-amber-100/50">
                        {formatWeekDayDate(week, selectedDay)}
                      </td>

                      {/* Full Width Vacation Banner */}
                      <td colSpan={11} className="p-3 border-l border-slate-200">
                        {getWeekTypeBadge(week.weekType, week.specialEventTitle || week.valueTitle || week.educationalGoal)}
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canManage && (
                            <>
                              <button
                                onClick={() => onEditWeek(week)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg cursor-pointer"
                                title="تعديل الأسبوع"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteWeek(week.id, week.weekNumber, week.specialEventTitle || week.valueTitle || week.educationalGoal)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="حذف الأسبوع"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={week.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 ring-2 ring-emerald-500/50'
                        : isCurrent
                        ? 'bg-amber-50/60 ring-2 ring-amber-400'
                        : isCompleted
                        ? 'hover:bg-slate-50/80'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    {canManage && (
                      <td className="p-2.5 text-center align-top border-l border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectWeek?.(week.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 mt-2"
                          title={`تحديد الأسبوع ${week.weekNumber}`}
                        />
                      </td>
                    )}

                    {/* Week Number */}
                    <td className="p-3 text-center align-top border-l border-slate-200">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-2xs ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                              : isCompleted
                              ? 'bg-emerald-800 text-white'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {week.weekNumber}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black mt-1 px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 whitespace-nowrap">
                            الحالي
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Single Day & Date Column */}
                    <td className="p-2.5 text-center align-top text-xs font-bold text-slate-900 border-l border-slate-200 whitespace-nowrap bg-slate-50/70">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-900 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{formatWeekDayDate(week, selectedDay)}</span>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="p-2.5 text-center align-top border-l border-slate-200">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDomainColor(
                          week.domain
                        )}`}
                      >
                        {week.domainLabel ||
                          (week.domain === 'faith'
                            ? 'إيماني'
                            : week.domain === 'behavioral'
                            ? 'سلوكي'
                            : week.domain === 'skills'
                            ? 'مهاري'
                            : 'قرآني')}
                      </span>
                    </td>

                    {/* Value Title */}
                    <td className="p-2.5 align-top font-bold text-slate-900 border-l border-slate-200">
                      {week.valueTitle || '-'}
                    </td>

                    {/* Motto */}
                    <td className="p-2.5 align-top font-black text-emerald-900 border-l border-slate-200">
                      {week.motto || '-'}
                    </td>

                    {/* Goal Topic & Description */}
                    <td className="p-2.5 align-top border-l border-slate-200">
                      <div className="space-y-1">
                        {week.goalTopic && week.goalTopic !== week.educationalGoal && (
                          <span className="font-bold text-slate-900 block text-[11px]">
                            {week.goalTopic}
                          </span>
                        )}
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {week.educationalGoal}
                        </p>
                      </div>
                    </td>

                    {/* Goal Presenter & Location */}
                    <td className="p-2.5 align-top border-l border-slate-200">
                      {week.goalPresenter ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block text-[11px]">
                            {week.goalPresenter}
                          </span>
                          {week.goalLocation && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              {week.goalLocation}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Interactive Activity */}
                    <td className="p-2.5 align-top border-l border-slate-200 bg-amber-50/20">
                      <span className="font-bold text-amber-950 block">
                        {week.activity || '-'}
                      </span>
                    </td>

                    {/* Activity Presenter */}
                    <td className="p-2.5 align-top border-l border-slate-200 bg-amber-50/20">
                      <span className="font-medium text-slate-800 text-[11px]">
                        {week.activityPresenter || '-'}
                      </span>
                    </td>

                    {/* Activity Location */}
                    <td className="p-2.5 align-top border-l border-slate-200 bg-amber-50/20">
                      <span className="text-[11px] text-slate-600">
                        {week.activityLocation || '-'}
                      </span>
                    </td>

                    {/* Week Responsible Supervisor */}
                    <td className="p-2.5 align-top border-l border-slate-200 font-bold text-slate-900">
                      {week.responsiblePerson || '-'}
                    </td>

                    {/* Quranic Program */}
                    <td className="p-2.5 align-top border-l border-slate-200 bg-purple-50/20">
                      <div className="space-y-0.5">
                        <span className="font-bold text-purple-950 block text-[11px]">
                          {week.quranicProgram || '-'}
                        </span>
                        {week.overallProjectBudget && (
                          <span className="text-[10px] text-purple-700 font-medium block">
                            (ميزانية المشروع: {week.overallProjectBudget} ر.س)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="p-2.5 align-top text-center border-l border-slate-200 font-black text-slate-900">
                      {week.budget ? `${week.budget} ر.س` : '-'}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center align-top">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSendAnnouncement(week)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="إرسال إعلان تحضيري للواتساب"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onToggleStatus(week)}
                          className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                            isCompleted
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : isInProgress
                              ? 'text-amber-700 hover:bg-amber-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={`تغيير الحالة: ${week.status || 'مجدول'}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => onEditWeek(week)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="تعديل الأسبوع"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteWeek(week.id, week.weekNumber, week.valueTitle || week.educationalGoal || week.motto)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="حذف الأسبوع"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer with Summaries */}
          {weeks.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs">
                <td colSpan={canManage ? 14 : 13} className="p-3 text-right">
                  إجمالي الميزانية المعتمدة لجميع أسابيع الخطة:
                </td>
                <td colSpan={2} className="p-3 text-center text-emerald-300 font-black text-sm">
                  {totalBudget} ر.س
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 3. Official Signatures Block (Visible in Print or PDF Export) */}
      <div className="hidden print:grid grid-cols-3 gap-8 p-8 border-t border-slate-300 text-center text-xs font-bold text-slate-800">
        <div className="space-y-8">
          <p>مُعِدّ الخطة التربوية</p>
          <p className="border-t border-dotted border-slate-400 pt-2 text-slate-600">التوقيع / التاريخ</p>
        </div>
        <div className="space-y-8">
          <p>مشرف المرحلة</p>
          <p className="border-t border-dotted border-slate-400 pt-2 text-slate-600">التوقيع / التاريخ</p>
        </div>
        <div className="space-y-8">
          <p>مدير المجمع القرآني</p>
          <p className="border-t border-dotted border-slate-400 pt-2 text-slate-600">الختم والاعتماد</p>
        </div>
      </div>
    </div>
  );
};
