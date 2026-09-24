import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, CheckCircle2, Clock, BookOpen, Send, X, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { generateParentWeeklyReport } from '../../utils/reportGenerator';
import { isReadOnlyViewer } from '../../lib/permissions';

interface SpellingStudentProfileModalProps {
  studentId: string;
  onClose: () => void;
}

export const SpellingStudentProfileModal: React.FC<SpellingStudentProfileModalProps> = ({
  studentId,
  onClose,
}) => {
  const { students, sessionRecords, spellingLessons, academicConfig, halaqahs, teachers, currentUser } = useApp();
  const readOnlyViewer = isReadOnlyViewer(currentUser);
  const [showReportModal, setShowReportModal] = useState(false);

  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
  const teacher = teachers.find((t) => t.id === student.teacherId);
  const evalResult = evaluateStudentStatus(student, sessionRecords, spellingLessons, academicConfig);

  const studentRecords = sessionRecords
    .filter((r) => r.studentId === student.id && r.spelling)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);

  const handleOpenReport = () => {
    setShowReportModal(true);
  };

  const reportText = generateParentWeeklyReport(
    student,
    sessionRecords,
    spellingLessons,
    halaqahs,
    teachers,
    academicConfig
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black text-lg flex items-center justify-center">
                {(student.fullName || student.name || 'ط').charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-bold text-slate-900">{student.fullName}</h3>
                  <StatusBadge status={evalResult.status} label={evalResult.statusLabel} size="sm" />
                </div>
                <p className="text-xs text-slate-700 mt-0.5">
                  {student.grade} • {halaqah?.name} • المعلم: {teacher?.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-5 pl-1 text-xs">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-800 font-semibold block">الدرس الحالي</span>
                <span className="text-base font-black text-emerald-950">
                  الدرس {currentLesson ? currentLesson.lessonNumber : 1}
                </span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                <span className="text-[11px] text-blue-800 font-semibold block">درجة الإتقان</span>
                <span className="text-base font-black text-blue-950 font-mono">
                  {evalResult.hasSpellingEvaluation ? `${evalResult.spellingMasteryRate}%` : 'غير مقيّم'}
                </span>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-center">
                <span className="text-[11px] text-purple-800 font-semibold block">المتوقع للأسبوع</span>
                <span className="text-base font-black text-purple-950">الدرس {evalResult.expectedLessonNum}</span>
              </div>
            </div>

            {/* Curriculum Visual Journey Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>مسار الهجاء القرآني المعتمد (12 درساً)</span>
              </h4>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {spellingLessons.map((lesson) => {
                  const isCompleted = lesson.lessonNumber < (currentLesson?.lessonNumber || 1);
                  const isCurrent = lesson.lessonNumber === (currentLesson?.lessonNumber || 1);

                  return (
                    <div
                      key={lesson.id}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        isCurrent
                          ? 'bg-emerald-700 text-white font-bold ring-2 ring-emerald-300 shadow-sm'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium'
                          : 'bg-white text-slate-600 border-slate-200 opacity-60'
                      }`}
                    >
                      <span className="text-[10px] block">درس {lesson.lessonNumber}</span>
                      <span className="text-[11px] font-bold block truncate">{lesson.title}</span>
                      {isCompleted && <span className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ تم</span>}
                      {isCurrent && <span className="text-[10px] text-amber-300 font-bold mt-0.5">● حالي</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Historical Session Records */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>سجل تقييمات الهجاء السابقة</span>
              </h4>

              {studentRecords.length === 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-center">
                  لا توجد جلسات هجاء مسجلة سابقاً لهذا الطالب.
                </div>
              ) : (
                <div className="space-y-2">
                  {studentRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            الدرس {rec.spelling?.lessonNumber}: {spellingLessons.find((l) => l.id === rec.spelling?.lessonId)?.title || 'درس هجاء'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                            {rec.spelling?.statusTag || 'أتقن'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600 mt-0.5 block">
                          التاريخ: {rec.date} (الأسبوع {rec.weekNumber})
                        </span>
                        {rec.spelling?.notes && (
                          <p className="text-[11px] text-slate-600 mt-1">ملاحظة: {rec.spelling.notes}</p>
                        )}
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-sm font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
                          {rec.spelling?.finalScore || 85}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium"
            >
              إغلاق
            </button>

            {!readOnlyViewer && (
            <button
              onClick={handleOpenReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span>إرسال تقرير الواتساب لولي الأمر 📲</span>
            </button>
            )}
          </div>
        </div>
      </div>

      <ReportDispatchModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={`تقرير إنجاز الهجاء – ${student.fullName}`}
        reportContent={reportText}
        recipientName={`ولي أمر ${student.fullName}`}
        recipientPhone={student.parentPhone}
        recipientType="parent"
        reportType="weekly"
        studentId={student.id}
        teacherId={student.teacherId}
      />
    </>
  );
};
