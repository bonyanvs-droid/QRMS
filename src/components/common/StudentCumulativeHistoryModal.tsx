import React from 'react';
import { Student } from '../../types';
import {
  History,
  X,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface StudentCumulativeHistoryModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentCumulativeHistoryModal: React.FC<StudentCumulativeHistoryModalProps> = ({
  student,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const histories = student.termHistories || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-100 text-indigo-900 shrink-0">
              <History className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-2">{student.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {student.grade}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                السجل التراكمي<span className="hidden sm:inline"> وتاريخ الإنجاز عبر الفصول والسنوات الدراسية</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
          {histories.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">لا توجد فصول دراسية مؤرشفة لهذا الطالب بعد</p>
              <p className="text-[11px] text-slate-400 mt-1">
                تُسجل الفترات السابقة تلقائياً عند قيام الإدارة بإغلاق الفصل وأرشفة الدورة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {histories.map((hist, idx) => (
                <div
                  key={`${hist.termId}_${idx}`}
                  className="bg-slate-50 hover:bg-white rounded-2xl p-4 border border-slate-200 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {hist.academicYear}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{hist.termName}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        الحلقة: <span className="font-semibold text-slate-700">{hist.halaqahName}</span> • المعلم: {hist.teacherName}
                      </p>
                    </div>

                    <StatusBadge status={hist.finalStatus} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 text-xs text-center">
                    <div className="bg-white rounded-xl p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-400">الدرس المنجز</div>
                      <div className="font-bold text-emerald-800 mt-0.5">
                        الدرس {hist.spellingLessonReached}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-400">نسبة الحضور</div>
                      <div className="font-bold text-slate-800 mt-0.5">{hist.attendanceRate}%</div>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-400">الأوسمة المحققة</div>
                      <div className="font-bold text-amber-800 mt-0.5 flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>{hist.badgesCount}</span>
                      </div>
                    </div>
                  </div>

                  {hist.teacherEvaluationSummary && (
                    <div className="mt-2.5 p-2 bg-emerald-50/60 rounded-xl text-[11px] text-emerald-950 border border-emerald-100">
                      <span className="font-bold text-emerald-900 ml-1">ملخص التقييم:</span>
                      <span>{hist.teacherEvaluationSummary}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
