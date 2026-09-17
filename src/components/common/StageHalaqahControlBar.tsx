import React from 'react';
import { Layers, CheckCircle2, Users } from 'lucide-react';
import { EducationalStage, Halaqah, Teacher } from '../../types';

interface StageHalaqahControlBarProps {
  stages: EducationalStage[];
  selectedStageId: string;
  onSelectStage: (stageId: string) => void;
  halaqahs: Halaqah[];
  selectedHalaqahId?: string;
  onSelectHalaqah?: (halaqahId: string) => void;
  teachers?: Teacher[];
  studentsCountByHalaqah?: Record<string, number>;
  showHalaqahSelector?: boolean;
  title?: string;
  subtitle?: string;
}

export const StageHalaqahControlBar: React.FC<StageHalaqahControlBarProps> = ({
  stages = [],
  selectedStageId = 'all',
  onSelectStage,
  halaqahs = [],
  selectedHalaqahId,
  onSelectHalaqah,
  teachers = [],
  studentsCountByHalaqah = {},
  showHalaqahSelector = true,
  title = 'مركز التحكم بالمراحل والحلقات القرآنية',
  subtitle = 'الفلترة الموحدة ومتابعة مسارات الحفظ والمراحل التعليمية',
}) => {
  const safeStages = Array.isArray(stages) ? stages : [];
  const safeHalaqahs = Array.isArray(halaqahs) ? halaqahs : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];

  return (
    <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200 shadow-xs space-y-3">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-800 text-white shadow-2xs">
            <Layers className="w-4 h-4 text-amber-300" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-600 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <Users className="w-3.5 h-3.5 text-emerald-700" />
          <span>إجمالي الحلقات: {safeHalaqahs.length}</span>
        </div>
      </div>

      {/* Stages Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectStage('all')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedStageId === 'all'
              ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30 font-black'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>كافة المراحل</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              selectedStageId === 'all' ? 'bg-emerald-900 text-amber-200' : 'bg-white text-slate-700'
            }`}
          >
            {safeHalaqahs.length}
          </span>
        </button>

        {safeStages.map((stg) => {
          const stageHalaqahsCount = safeHalaqahs.filter(
            (h) =>
              (h.stageId && h.stageId === stg.id) ||
              (stg.targetGrades && stg.targetGrades.includes(h.grade as any))
          ).length;
          const isSelected = selectedStageId === stg.id;
          return (
            <button
              key={stg.id}
              onClick={() => onSelectStage(stg.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30 font-black'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{stg.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-emerald-900 text-amber-200' : 'bg-white text-slate-700'
                }`}
              >
                {stageHalaqahsCount}
              </span>
              {stg.ageRange && (
                <span className="text-[10px] opacity-75 hidden sm:inline">({stg.ageRange})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Halaqah Quick Switcher Pills */}
      {showHalaqahSelector && onSelectHalaqah && (
        <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">الحلقات:</span>
          {safeHalaqahs.length === 0 ? (
            <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
              لا توجد حلقات مسجلة في هذه المرحلة حالياً
            </span>
          ) : (
            safeHalaqahs.map((h) => {
              const isSelected = h.id === selectedHalaqahId;
              const teacherObj = safeTeachers.find((t) => t.id === h.teacherId);
              const count = studentsCountByHalaqah[h.id] ?? 0;
              return (
                <button
                  key={h.id}
                  onClick={() => onSelectHalaqah(h.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-800 border-emerald-900 text-white font-black shadow-xs ring-2 ring-emerald-500/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-slate-300'}`} />
                  <span>{h.name}</span>
                  <span className={`text-[11px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    ({h.grade})
                  </span>
                  {teacherObj && (
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-amber-200' : 'text-emerald-800'}`}>
                      • أ. {teacherObj.name.replace(/^أ\.\s*/, '').split(' ')[0]}
                    </span>
                  )}
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected ? 'bg-emerald-900 text-amber-200' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {count} طلاب
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
