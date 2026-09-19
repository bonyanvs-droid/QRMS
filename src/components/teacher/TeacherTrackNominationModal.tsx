import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, TrackDefinition, TrackNomination } from '../../types';
import {
  Award,
  X,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  FileCheck,
  ChevronLeft,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface TeacherTrackNominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedStudent?: Student | null;
  halaqahId: string;
}

export const TeacherTrackNominationModal: React.FC<TeacherTrackNominationModalProps> = ({
  isOpen,
  onClose,
  preSelectedStudent,
  halaqahId,
}) => {
  const {
    students,
    halaqahs,
    teachers,
    tracks,
    trackNominations,
    saveTrackNomination,
    academicConfig,
    currentUser,
    activeTenant,
    activeTenantId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'new' | 'list'>(preSelectedStudent ? 'new' : 'list');

  // Halaqah & Students
  const halaqah = halaqahs.find((h) => h.id === halaqahId);
  const halaqahStudents = useMemo(() => {
    return students.filter((s) => s.halaqahId === halaqahId);
  }, [students, halaqahId]);

  // Active tracks available for this halaqah or tenant
  const availableTracks = useMemo(() => {
    const activeIds = halaqah?.activeTrackIds;
    if (activeIds && activeIds.length > 0) {
      return tracks.filter((t) => activeIds.includes(t.id) && t.isActive);
    }
    return tracks.filter((t) => t.isActive);
  }, [tracks, halaqah]);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preSelectedStudent?.id || halaqahStudents[0]?.id || ''
  );
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    availableTracks[0]?.id || 'track_quran'
  );

  const selectedTrack = useMemo(() => {
    return tracks.find((t) => t.id === selectedTrackId) || availableTracks[0] || tracks[0];
  }, [tracks, selectedTrackId, availableTracks]);

  const [targetBranch, setTargetBranch] = useState<string>(
    selectedTrack?.nominationConfig?.branchesOrLevels?.[0] || 'الفرع الخامس (5 أجزاء)'
  );
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [teacherNotes, setTeacherNotes] = useState<string>('متقن ومستعد تماماً للاختبار');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize rubric scores whenever selected track changes
  React.useEffect(() => {
    if (selectedTrack?.nominationConfig?.rubricItems) {
      const initial: Record<string, number> = {};
      selectedTrack.nominationConfig.rubricItems.forEach((r) => {
        initial[r.id] = Math.round(r.maxScore * 0.95);
      });
      setRubricScores(initial);
      if (selectedTrack.nominationConfig.branchesOrLevels?.length) {
        setTargetBranch(selectedTrack.nominationConfig.branchesOrLevels[0]);
      }
    }
  }, [selectedTrack]);

  // If preSelectedStudent changed, update state
  React.useEffect(() => {
    if (preSelectedStudent) {
      setSelectedStudentId(preSelectedStudent.id);
      setActiveTab('new');
    }
  }, [preSelectedStudent]);

  // Calculate score and pass status
  const rubricItems = selectedTrack?.nominationConfig?.rubricItems || [];
  const { totalScore, percentageScore, isPassed } = useMemo(() => {
    let earned = 0;
    let max = 0;
    rubricItems.forEach((item) => {
      earned += rubricScores[item.id] ?? item.maxScore;
      max += item.maxScore;
    });
    const percentage = max > 0 ? Math.round((earned / max) * 100) : 95;
    const passingScore = selectedTrack?.nominationConfig?.passingScore || 90;
    return {
      totalScore: earned,
      percentageScore: percentage,
      isPassed: percentage >= passingScore,
    };
  }, [rubricItems, rubricScores, selectedTrack]);

  // Halaqah nominations
  const halaqahNominations = useMemo(() => {
    const studentIds = new Set(halaqahStudents.map((s) => s.id));
    return (trackNominations || []).filter((n) => studentIds.has(n.studentId));
  }, [trackNominations, halaqahStudents]);

  const handleSubmitNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = halaqahStudents.find((s) => s.id === selectedStudentId);
    if (!student || !selectedTrack) return;

    setIsSubmitting(true);
    try {
      const teacher = teachers.find((t) => t.id === halaqah?.teacherId);

      await saveTrackNomination({
        tenantId: activeTenantId || student.tenantId || activeTenant?.id || 'al_ghazzawi',
        trackId: selectedTrack.id,
        trackName: selectedTrack.name,
        studentId: student.id,
        studentName: student.fullName,
        halaqahId: halaqah?.id || student.halaqahId || '',
        halaqahName: halaqah?.name || student.halaqahName || 'الحلقة',
        teacherId: teacher?.id || currentUser?.id || 'teacher',
        teacherName: teacher?.name || currentUser?.name || 'معلم الحلقة',
        targetBranchOrLevel: targetBranch,
        nominationCardNumber: '',
        internalExam: {
          examinerId: currentUser?.id || teacher?.id || 'teacher',
          examinerName: currentUser?.name || teacher?.name || 'معلم الحلقة',
          examDate: new Date().toISOString().split('T')[0],
          scores: rubricScores,
          totalScore: percentageScore,
          passed: isPassed,
          recommendation: isPassed ? 'nominate' : 'reinforce',
          notes: teacherNotes,
          rubricSnapshot: rubricItems,
        },
        updatedAt: new Date().toISOString(),
      });

      setSuccessMessage(`تم رفع ترشيح الطالب (${student.fullName}) بنجاح للمشرف التربوي`);
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('list');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>مرفوع للمشرف</span>
          </span>
        );
      case 'examiner_assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            <span>مسند لمختبر</span>
          </span>
        );
      case 'internal_exam_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <FileCheck className="w-3 h-3 text-amber-600" />
            <span>تم التقييم الداخلي</span>
          </span>
        );
      case 'approved_for_association':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>معتمد رسمياً للجمعية</span>
          </span>
        );
      case 'association_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300">
            <Award className="w-3 h-3 text-teal-600" />
            <span>اجتاز اختبار الجمعية 🎉</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg font-serif">
                <span className="hidden sm:inline">ترشيحات واختبارات المسارات التعليمية</span>
                <span className="sm:hidden">ترشيحات المسارات</span>
              </h3>
              <p className="hidden sm:block text-xs text-emerald-100">
                حلقة: {halaqah?.name} • رفع وتتبع اختبارات وترشيحات الطلاب للجمعية
              </p>
              <p className="sm:hidden text-[11px] text-emerald-100">حلقة: {halaqah?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'new'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            + ترشيح طالب جديد
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ترشيحات الحلقة المرفوعة ({halaqahNominations.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'new' ? (
            <form onSubmit={handleSubmitNomination} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Student Select */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اختر الطالب المرشح *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    {halaqahStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.grade} • محفوظه: سورة {s.currentSurah})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Track Select */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المسار التعليمي المستهدف *</label>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    {availableTracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (درجة الاجتياز: {t.nominationConfig?.passingScore}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Branch or Level */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">الفرع أو المقدار المرشح له *</label>
                {selectedTrack.nominationConfig?.branchesOrLevels && selectedTrack.nominationConfig.branchesOrLevels.length > 0 ? (
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                    required
                  >
                    {selectedTrack.nominationConfig.branchesOrLevels.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    placeholder="مثال: حفظ 3 أجزاء متتالية / كتاب القواعد الأربع"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                    required
                  />
                )}
              </div>

              {/* Rubric Evaluation (Internal Teacher Pre-assessment) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>تقييم المعلم الداخلي لمعايير المسار</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">الدرجة الكلية: </span>
                    <strong className={`text-sm ${isPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {percentageScore}% ({isPassed ? 'مؤهل للاختبار' : 'أقل من حد الاجتياز'})
                    </strong>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-200">
                  {rubricItems.map((item) => {
                    const score = rubricScores[item.id] ?? item.maxScore;
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium">{item.label}</span>
                          <span className="font-bold text-emerald-800">
                            {score} / {item.maxScore}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={Math.round(item.maxScore * 0.5)}
                          max={item.maxScore}
                          value={score}
                          onChange={(e) =>
                            setRubricScores({
                              ...rubricScores,
                              [item.id]: Number(e.target.value),
                            })
                          }
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات وتوصية المعلم</label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  placeholder="ملاحظات حول استعداد الطالب أو تركيزه في مراجعة الأوجه..."
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-amber-300" />
                  <span>{isSubmitting ? 'جاري الرفع...' : 'رفع الترشيح للمشرف التربوي'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2: Nominations List for this halaqah */
            <div className="space-y-3">
              {halaqahNominations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                  <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="font-bold text-slate-800 text-sm">لا توجد ترشيحات مرفوعة لهذه الحلقة حالياً</div>
                  <p className="text-xs text-slate-500 mt-1">
                    يمكنك ترشيح طلاب الحلقة المتفوقين عبر التبويب بالأعلى لدخول اختبارات الجمعية المعتمدة.
                  </p>
                </div>
              ) : (
                halaqahNominations.map((nom) => (
                  <div
                    key={nom.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{nom.studentName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {nom.trackName || 'القرآن الكريم'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          المقدار: <strong>{nom.targetBranchOrLevel}</strong>
                        </div>
                      </div>
                      <div>{getStatusBadge(nom.status)}</div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-500">التقييم الداخلي: </span>
                        <strong className="text-emerald-700">{nom.internalExam?.totalScore || 95}%</strong>
                      </div>
                      {nom.nominationCardNumber && (
                        <div className="text-[11px] font-bold text-slate-800">
                          رقم البطاقة: <span className="text-emerald-800 font-mono">{nom.nominationCardNumber}</span>
                        </div>
                      )}
                      {nom.associationExam && (
                        <div className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          الجمعية: {nom.associationExam.score}% ({nom.associationExam.gradeText})
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
