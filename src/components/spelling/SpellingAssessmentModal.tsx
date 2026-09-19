import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, SpellingLesson } from '../../types';
import { Sparkles, CheckCircle2, AlertTriangle, X, Save, ArrowRight, BookOpen, Layers, Award } from 'lucide-react';

interface SpellingAssessmentModalProps {
  student: Student;
  onClose: () => void;
  onSaved?: () => void;
}

export const SpellingAssessmentModal: React.FC<SpellingAssessmentModalProps> = ({
  student,
  onClose,
  onSaved,
}) => {
  const {
    spellingLessons,
    academicConfig,
    recordDailySession,
    updateStudent,
    currentUser,
    halaqahs,
    teachers,
  } = useApp();

  const currentLesson =
    spellingLessons.find((l) => l.id === student.currentSpellingLessonId) || spellingLessons[0];

  const [selectedLessonId, setSelectedLessonId] = useState<string>(currentLesson?.id || spellingLessons[0]?.id);
  const activeLesson = spellingLessons.find((l) => l.id === selectedLessonId) || spellingLessons[0];

  // Sub-lesson scores initialized
  const initialScores: Record<string, number> = {};
  activeLesson?.subLessons?.forEach((sub) => {
    initialScores[sub.id] = 85;
  });

  const [subScores, setSubScores] = useState<Record<string, number>>(initialScores);
  const [overallScore, setOverallScore] = useState<number>(88);
  const [notes, setNotes] = useState<string>('');
  const [advanceStudent, setAdvanceStudent] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Recalculate average when subScores change
  const handleScoreChange = (subId: string, val: number) => {
    const updated = { ...subScores, [subId]: val };
    setSubScores(updated);

    const values: number[] = Object.values(updated);
    if (values.length > 0) {
      const avg = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
      setOverallScore(avg);
    }
  };

  const isMastered = overallScore >= (activeLesson?.passingThreshold || 85);
  const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
  const teacher = teachers.find((t) => t.id === student.teacherId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const todayStr = new Date().toISOString().split('T')[0];
    const statusTag = isMastered ? 'أتقن' : overallScore >= 70 ? 'يحتاج تثبيت' : 'لم يجتز';

    // 1. Record the daily session with spelling evaluation
    recordDailySession({
      studentId: student.id,
      teacherId: student.teacherId,
      halaqahId: student.halaqahId,
      date: todayStr,
      weekNumber: academicConfig.currentWeek,
      attendance: 'present',
      spelling: {
        lessonId: activeLesson.id,
        lessonNumber: activeLesson.lessonNumber,
        subLessonScores: subScores,
        finalScore: overallScore,
        isMastered,
        statusTag,
        notes: notes.trim() || `تم تقييم الدرس ${activeLesson.lessonNumber} بدرجة ${overallScore}% (${statusTag})`,
      },
    });

    // 2. If student mastered and advanceStudent is checked, find next lesson and advance
    if (isMastered && advanceStudent) {
      const nextLesson = spellingLessons.find((l) => l.lessonNumber === activeLesson.lessonNumber + 1);
      if (nextLesson) {
        updateStudent(student.id, {
          currentSpellingLessonId: nextLesson.id,
          currentSpellingScore: overallScore,
          status: 'advanced',
        });
      } else {
        updateStudent(student.id, {
          currentSpellingScore: overallScore,
          status: 'advanced',
        });
      }
    } else {
      updateStudent(student.id, {
        currentSpellingScore: overallScore,
        status: isMastered ? 'on_track' : 'needs_support',
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onSaved) onSaved();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-700 text-white font-black text-sm sm:text-lg flex items-center justify-center shrink-0">
              {(student.fullName || student.name || 'ط').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 line-clamp-2">
                  جلسة تقييم واختبار الهجاء القرآني
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {student.grade}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-700 mt-0.5">
                الطالب: <strong className="text-slate-900">{student.fullName}</strong> • {halaqah?.name}<span className="hidden sm:inline"> • المعلم: {teacher?.name}</span>
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto space-y-5 pl-1 text-xs">
          {/* Lesson Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-bold text-slate-900 mb-2">
              الدرس الهجائي المراد اختباره:
            </label>
            <select
              value={selectedLessonId}
              onChange={(e) => {
                setSelectedLessonId(e.target.value);
                const l = spellingLessons.find((les) => les.id === e.target.value);
                if (l?.subLessons) {
                  const sc: Record<string, number> = {};
                  l.subLessons.forEach((sub) => {
                    sc[sub.id] = 85;
                  });
                  setSubScores(sc);
                }
              }}
              className="w-full text-xs px-3 py-2.5 bg-white rounded-xl border border-slate-300 font-bold text-slate-800"
            >
              {spellingLessons.map((les) => (
                <option key={les.id} value={les.id}>
                  الدرس {les.lessonNumber}: {les.title} (الأسبوع {les.expectedWeek} - {les.targetGrade})
                </option>
              ))}
            </select>
          </div>

          {/* Sub-skills interactive rating */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>تقييم المهارات الجزئية للدرس ({(activeLesson?.subLessons || []).length} مهارات):</span>
              </h4>
              <span className="text-[11px] text-slate-700">
                حد الإتقان المطلوب: <strong>{activeLesson?.passingThreshold || 85}%</strong>
              </span>
            </div>

            <div className="space-y-3">
              {(activeLesson?.subLessons || []).map((sub) => {
                const currentVal = subScores[sub.id] ?? 85;
                return (
                  <div
                    key={sub.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{sub.title}</span>
                        {sub.description && (
                          <span className="text-[11px] text-slate-700 block">{sub.description}</span>
                        )}
                      </div>
                      <span className="text-sm font-black font-mono text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        {currentVal}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="40"
                        max="100"
                        step="1"
                        value={currentVal}
                        onChange={(e) => handleScoreChange(sub.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                      />
                      <div className="flex gap-1 shrink-0">
                        {[70, 85, 95, 100].map((quick) => (
                          <button
                            type="button"
                            key={quick}
                            onClick={() => handleScoreChange(sub.id, quick)}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors ${
                              currentVal === quick
                                ? 'bg-emerald-700 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {quick}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Evaluation Summary Card */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
              isMastered
                ? 'bg-emerald-50/80 border-emerald-500'
                : 'bg-amber-50/80 border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  isMastered ? 'bg-emerald-700 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {isMastered ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  النتيجة الإجمالية للدرس: {overallScore}%
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    isMastered ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  {isMastered ? '🟢 اجتاز بنجاح وأتقن المهارة' : '🟠 يحتاج تثبيت ومتابعة في الحصة القادمة'}
                </span>
              </div>
            </div>

            {isMastered && (
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-300">
                <input
                  type="checkbox"
                  checked={advanceStudent}
                  onChange={(e) => setAdvanceStudent(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-bold text-slate-900">
                  ترقية للدرس التالي تلقائياً
                </span>
              </label>
            )}
          </div>

          {/* Clinical Teacher Notes */}
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              ملاحظات المعلم وتوصيات النطق للطالب:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تميز في نطق الألف الصغيرة، يحتاج عناية طفيفة بزمن الغنة في الميم المشددة..."
              className="w-full text-xs p-3 bg-white rounded-xl border border-slate-300"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم الاعتماد والحفظ في قاعدة البيانات!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>اعتماد ورصد النتيجة في قاعدة البيانات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
