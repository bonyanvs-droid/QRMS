import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Target,
  Search,
  Eye,
  TrendingUp,
  Clock,
  Send,
  RotateCcw,
  ChevronDown,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  FileEdit,
  ShieldCheck,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import { SURAHS_LIST } from '../../data/initialData';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { generateParentWeeklyReport } from '../../utils/reportGenerator';
import { StudentQuranPlanModal } from './StudentQuranPlanModal';
import { Student } from '../../types';

export const QuranOutcomesView: React.FC = () => {
  const {
    currentRole,
    currentUser,
    students,
    sessionRecords,
    spellingLessons,
    academicConfig,
    halaqahs,
    teachers,
    stages,
    activeTenant,
    activeTenantId,
    updateAcademicOutcome,
  } = useApp();

  // Anyone who is an administrative or teaching staff member (including system_admin, campus_admin, admin, supervisor, teacher, charity_supervisor)
  const isStaff =
    Boolean(currentUser) &&
    ['system_admin', 'campus_admin', 'admin', 'supervisor', 'teacher', 'charity_supervisor'].includes(
      currentUser?.role || currentRole
    );

  const canEditOutcome =
    currentUser?.role === 'system_admin' ||
    (currentUser?.role as any) === 'admin' ||
    currentUser?.role === 'campus_admin';

  const currentOutcomeText =
    activeTenant?.referenceOutcome ||
    (activeTenant?.targetSurahDefault
      ? `«متقنٌ لهجاء القرآن وحفظه إلى ${activeTenant.targetSurahDefault}»`
      : '«متقنٌ لهجاء القرآن وحفظه إلى الغاشية»');

  // Outcome edit state
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({
    outcomeText: currentOutcomeText,
    targetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
  });
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeSavedToast, setOutcomeSavedToast] = useState(false);

  const handleOpenOutcomeModal = () => {
    setOutcomeForm({
      outcomeText: currentOutcomeText,
      targetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
    });
    setIsOutcomeModalOpen(true);
  };

  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeForm.outcomeText.trim()) return;
    try {
      setOutcomeSaving(true);
      await updateAcademicOutcome(
        outcomeForm.outcomeText.trim(),
        outcomeForm.targetSurah,
        activeTenantId
      );
      setIsOutcomeModalOpen(false);
      setOutcomeSavedToast(true);
      setTimeout(() => setOutcomeSavedToast(false), 3500);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ المخرج القرآني');
    } finally {
      setOutcomeSaving(false);
    }
  };

  // Filters & Accordion States
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLadderOpen, setIsLadderOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(true);

  // Modals state
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<string | null>(null);
  const [selectedSurahForDetail, setSelectedSurahForDetail] = useState<any | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<'records' | 'plan_summary'>('records');
  const [selectedStudentForPlan, setSelectedStudentForPlan] = useState<Student | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState({
    title: '',
    content: '',
    recipientName: '',
    recipientPhone: '',
    studentId: '',
    teacherId: '',
  });

  // Filter students based on teacher role if needed
  const accessibleStudents = useMemo(() => {
    if (!isStaff) return [];
    let list = students || [];
    if (currentRole === 'teacher' && currentUser?.halaqahId) {
      list = list.filter((s) => s.halaqahId === currentUser.halaqahId);
    }
    return list;
  }, [students, isStaff, currentRole, currentUser]);

  const evaluatedStudents = useMemo(() => {
    return accessibleStudents.map((s) => ({
      student: s,
      eval: evaluateStudentStatus(s, sessionRecords, spellingLessons, academicConfig),
    }));
  }, [accessibleStudents, sessionRecords, spellingLessons, academicConfig]);

  // Status Counts for KPI Summary Bar
  const statusStats = useMemo(() => {
    const counts = {
      total: evaluatedStudents.length,
      advanced: 0,
      on_track: 0,
      not_moved_yet: 0,
      needs_support: 0,
      lagging: 0,
    };
    evaluatedStudents.forEach(({ eval: ev }) => {
      if (ev.status === 'advanced') counts.advanced++;
      else if (ev.status === 'on_track') counts.on_track++;
      else if (ev.status === 'not_moved_yet') counts.not_moved_yet++;
      else if (ev.status === 'needs_support') counts.needs_support++;
      else if (ev.status === 'lagging') counts.lagging++;
    });
    return counts;
  }, [evaluatedStudents]);

  const filtered = useMemo(() => {
    return evaluatedStudents.filter(({ student, eval: ev }) => {
      const matchSearch =
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.currentSurah.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGrade = gradeFilter === 'all' || student.grade === gradeFilter;
      const matchStatus = statusFilter === 'all' || ev.status === statusFilter;
      return matchSearch && matchGrade && matchStatus;
    });
  }, [evaluatedStudents, searchTerm, gradeFilter, statusFilter]);

  // Calculate Surah Distribution across all 114 surahs
  const surahCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    accessibleStudents.forEach((s) => {
      const clean = (s.currentSurah || '').replace(/^سورة\s+/, '').trim();
      counts[clean] = (counts[clean] || 0) + 1;
    });
    return counts;
  }, [accessibleStudents]);

  // Known Milestone Educational Targets Map (covers standard stages and sub-stages)
  const milestoneTargetsMap: Record<string, { stageName: string; gradeText: string; description: string }> = useMemo(() => ({
    'الفيل': {
      stageName: 'مرحلة البراعم (المستوى الأول)',
      gradeText: 'فئة التمهيدي',
      description: 'المستهدف المرحلي: 10 سور قصيرة (من الناس إلى الفيل) مع التلقين الصوتي وضبط مخارج الحروف وأذكار المسجد.',
    },
    'الضحى': {
      stageName: 'مرحلة البراعم (المستوى الثاني)',
      gradeText: 'الصف الأول الابتدائي',
      description: 'المستهدف المرحلي: 22 سورة (من الناس إلى الضحى) مع دروس الهجاء والتهجي القرآني وإتقان الغنن والمدود.',
    },
    'الغاشية': {
      stageName: 'مرحلة البراعم (المخرج التتويجي)',
      gradeText: 'الصف الثاني الابتدائي',
      description: 'المخرج النهائي للمرحلة: 27 سورة (من الناس إلى الغاشية)؛ متقن للتهجي القرآني وحفظه إلى سورة الغاشية.',
    },
    'النبأ': {
      stageName: 'مرحلة البراعم / الأشبال',
      gradeText: 'إتمام جزء عمّ',
      description: 'المستهدف المرحلي: إتمام جزء عمّ كاملاً (37 سورة) والتمهيد للانتقال إلى جزء تبارك.',
    },
    'الملك': {
      stageName: 'مرحلة الأشبال',
      gradeText: 'الصفوف 3 - 4',
      description: 'المستهدف القرآني: حفظ جزئي عمّ وتبارك كاملاً إلى سورة الملك مع التمكين التجويدي وحفظ الأذكار.',
    },
    'النساء': {
      stageName: 'مرحلة الفتيان',
      gradeText: 'الصفوف 5 - 6',
      description: 'المستهدف القرآني: حفظ 5 أجزاء ومواصلة السير المنهجي مع ترسيخ الحفظ التراكمي وتجويد التلاوة.',
    },
    'التوبة': {
      stageName: 'مرحلة الشباب',
      gradeText: 'المرحلة المتوسطة',
      description: 'المستهدف القرآني: حفظ 10 أجزاء وإتقان المتون التجويدية الأساسية والمشاركة في الأنشطة التطوعية.',
    },
    'الكهف': {
      stageName: 'مرحلة الفرسان',
      gradeText: 'المرحلة الثانوية',
      description: 'المستهدف القرآني: حفظ 15 جزءاً مع التطوع والتأهيل للمسابقات والمناشط الإرشادية.',
    },
    'البقرة': {
      stageName: 'مرحلة النخبة وحفاظ الوحيين',
      gradeText: 'الجامعي وما بعده',
      description: 'المخرج النهائي والختام: إتمام حفظ القرآن الكريم كاملاً والإجازة بالسند المتصل إلى رسول الله ﷺ.',
    },
  }), []);

  const getSurahTargetInfo = (surahName: string) => {
    const clean = (surahName || '').replace(/^سورة\s+/, '').trim();
    if (milestoneTargetsMap[clean]) {
      return milestoneTargetsMap[clean];
    }
    const matchedStage = (stages || []).find((s) => {
      const stageSurah = (s.defaultTargetSurah || '').replace(/^سورة\s+/, '').trim();
      return stageSurah === clean;
    });
    if (matchedStage) {
      return {
        stageName: matchedStage.name,
        gradeText: (matchedStage.targetGrades || []).join('، ') || matchedStage.ageRange,
        description: matchedStage.outcomeSummary || matchedStage.curriculumFocus || `المستهدف المعتمد لمرحلة ${matchedStage.name}`,
      };
    }
    return null;
  };

  // Students in currently selected Surah for detail modal
  const studentsInSelectedSurah = useMemo(() => {
    if (!selectedSurahForDetail) return [];
    const cleanName = (selectedSurahForDetail.name || '').replace(/^سورة\s+/, '').trim();
    return accessibleStudents.filter((s) => {
      const studentSurahClean = (s.currentSurah || '').replace(/^سورة\s+/, '').trim();
      return studentSurahClean === cleanName;
    });
  }, [selectedSurahForDetail, accessibleStudents]);

  const handleOpenReport = (student: any) => {
    const text = generateParentWeeklyReport(
      student,
      sessionRecords,
      spellingLessons,
      halaqahs,
      teachers,
      academicConfig
    );
    setReportData({
      title: `تقرير الحفظ القرآني – ${student.fullName}`,
      content: text,
      recipientName: `ولي أمر ${student.fullName}`,
      recipientPhone: student.parentPhone,
      studentId: student.id,
      teacherId: student.teacherId,
    });
    setReportModalOpen(true);
  };

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentForProfile);
  }, [students, selectedStudentForProfile]);

  const selectedStudentHalaqah = useMemo(() => {
    if (!selectedStudent?.halaqahId) return null;
    return (halaqahs || []).find((h) => h.id === selectedStudent.halaqahId);
  }, [selectedStudent, halaqahs]);

  const selectedStudentTeacher = useMemo(() => {
    if (!selectedStudent?.teacherId) return null;
    return (teachers || []).find((t) => t.id === selectedStudent.teacherId);
  }, [selectedStudent, teachers]);

  const selectedStudentEval = useMemo(() => {
    if (!selectedStudent) return null;
    return evaluateStudentStatus(selectedStudent, sessionRecords, spellingLessons, academicConfig);
  }, [selectedStudent, sessionRecords, spellingLessons, academicConfig]);

  const selectedStudentRecords = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return sessionRecords
      .filter((r) => r.studentId === selectedStudentForProfile && (r.memorization || r.revision))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessionRecords, selectedStudentForProfile]);

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Sleek Compact Header Banner */}
      <div className="bg-white rounded-2xl px-4 py-3 sm:py-3.5 sm:px-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900">
                متابعة المخرج القرآني والحفظ التراكمي
              </h2>
              <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {currentRole === 'teacher' ? 'حلقة المعلم' : 'شامل المجمع'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              متابعة مواضع حفظ وتسميع الطلاب، مقارنة الإنجاز بالحدود الدنيا المستهدفة، ودعم المتعثرين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200/90 px-3.5 py-1.5 rounded-xl text-[11px] shrink-0 font-bold text-emerald-950 self-start md:self-auto shadow-2xs">
          <Target className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-800/80 font-bold">المخرج القرآني المعتمد:</span>
            <span className="text-emerald-950 font-black">{currentOutcomeText}</span>
          </div>
          {canEditOutcome && (
            <button
              type="button"
              onClick={handleOpenOutcomeModal}
              className="mr-1 px-2 py-0.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 text-[10px] font-black border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              title="تعديل نص المخرج القرآني المعتمد"
            >
              <FileEdit className="w-3 h-3 text-emerald-700" />
              <span>تعديل</span>
            </button>
          )}
        </div>
      </div>

      {isStaff ? (
        <>
          {/* 2. Interactive KPI Status Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>الكل</span>
                <Users className="w-3.5 h-3.5 opacity-70" />
              </div>
              <div className="text-lg font-black">{statusStats.total}</div>
              <div className="text-[10px] opacity-75">إجمالي الطلاب</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'advanced' ? 'all' : 'advanced')}
              className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                statusFilter === 'advanced'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>متقدم ⭐</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-black">{statusStats.advanced}</div>
              <div className="text-[10px] opacity-80">متجاوز للمستهدف</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'on_track' ? 'all' : 'on_track')}
              className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                statusFilter === 'on_track'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>على الخطة 🔵</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-black">{statusStats.on_track}</div>
              <div className="text-[10px] opacity-80">ملتزم بالجدول</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'not_moved_yet' ? 'all' : 'not_moved_yet')}
              className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                statusFilter === 'not_moved_yet'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                  : 'bg-purple-50/70 hover:bg-purple-100/70 border-purple-200 text-purple-900'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>تثبيت 🟣</span>
                <Clock className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-black">{statusStats.not_moved_yet}</div>
              <div className="text-[10px] opacity-80">إتقان ومراجعة</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'needs_support' ? 'all' : 'needs_support')}
              className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                statusFilter === 'needs_support'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>يحتاج دعم 🟠</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-black">{statusStats.needs_support}</div>
              <div className="text-[10px] opacity-80">تنبيه متابعة</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'lagging' ? 'all' : 'lagging')}
              className={`p-3 rounded-2xl text-right transition-all border cursor-pointer ${
                statusFilter === 'lagging'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                  : 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>متأخر 🔴</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-lg font-black">{statusStats.lagging}</div>
              <div className="text-[10px] opacity-80">تدخل عاجل</div>
            </button>
          </div>

          {/* 3. Collapsible Accordions: Educational Stages Matrix + Surah Ladder */}
          <div className="space-y-2.5">
            {/* Collapsible Stages Matrix - Fully Responsive without horizontal scroll on mobile (Now immediately after stat cards) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsStagesOpen(!isStagesOpen)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-right cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <Target className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>مصفوفة مخرجات المراحل التعليمية الست ومستهدفاتها</span>
                  <span className="text-slate-500 font-normal text-xs">({stages.length} مراحل معتمدة)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 shrink-0">
                  <span>{isStagesOpen ? 'طي المصفوفة' : 'عرض مصفوفة المراحل ▾'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isStagesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isStagesOpen && (
                <div className="border-t border-slate-100 animate-fadeIn">
                  {/* Mobile Cards View (md:hidden) - Eliminates horizontal scrollbar completely */}
                  <div className="md:hidden p-3 space-y-3 bg-slate-50/40">
                    {stages.map((stg) => {
                      const stageStudentsCount = (accessibleStudents || []).filter(
                        (s) => s.stageId === stg.id || (!s.stageId && stg.id === 'baraem')
                      ).length;

                      return (
                        <div
                          key={stg.id}
                          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-1 rounded-xl font-black text-xs bg-emerald-50 text-emerald-900 border border-emerald-200">
                                {stg.name}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{stg.ageRange}</span>
                            </div>
                            <span className="font-bold text-slate-800 font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                              {stageStudentsCount} طلاب
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500">
                            الصفوف المستهدفة: {(stg.targetGrades || []).join('، ')}
                          </div>

                          <div className="bg-amber-50/70 border border-amber-200/70 p-2.5 rounded-xl text-xs">
                            <div className="text-[10px] text-amber-800 font-bold mb-0.5">
                              المقدار والمخرج القرآني:
                            </div>
                            <div className="font-bold text-amber-950">
                              {stg.targetQuranAmount || `سورة ${stg.defaultTargetSurah}`}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              المرجع: سورة {stg.defaultTargetSurah}
                            </div>
                          </div>

                          {stg.outcomeSummary ? (
                            <div className="text-[11px] text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                              «{stg.outcomeSummary}»
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">
                              {stg.curriculumFocus}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View (hidden md:block) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="p-3 w-32 text-center">المرحلة</th>
                          <th className="p-3 w-40">الفئة والصفوف</th>
                          <th className="p-3 min-w-[160px]">المقدار والمخرج القرآني</th>
                          <th className="p-3 min-w-[280px]">نص المخرج التربوي والشامل</th>
                          <th className="p-3 w-28 text-center">الطلاب</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stages.map((stg) => {
                          const stageStudentsCount = (accessibleStudents || []).filter(
                            (s) => s.stageId === stg.id || (!s.stageId && stg.id === 'baraem')
                          ).length;

                          return (
                            <tr key={stg.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3 text-center align-top">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                                  <span>{stg.name}</span>
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 align-top">
                                <div className="font-bold text-slate-900">{stg.ageRange}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {(stg.targetGrades || []).join('، ')}
                                </div>
                              </td>
                              <td className="p-3 font-bold text-slate-900 align-top">
                                <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block w-fit mb-1">
                                  {stg.targetQuranAmount || `سورة ${stg.defaultTargetSurah}`}
                                </span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  المرجع: سورة {stg.defaultTargetSurah}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 align-top">
                                {stg.outcomeSummary ? (
                                  <p className="leading-relaxed font-medium text-slate-800 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px]">
                                    «{stg.outcomeSummary}»
                                  </p>
                                ) : (
                                  <p className="text-slate-600 text-[11px] leading-relaxed">{stg.curriculumFocus}</p>
                                )}
                              </td>
                              <td className="p-3 text-center align-top">
                                <span className="font-bold text-slate-900 font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100">
                                  {stageStudentsCount} طلاب
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Surah Map across all 114 Surahs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setIsLadderOpen(!isLadderOpen)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-right cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>خريطة توزيع الطلاب على سور القرآن الكريم</span>
                  <span className="text-slate-500 font-normal text-xs">
                    ({accessibleStudents.length} طالب موزعين على {SURAHS_LIST.length} سورة)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 shrink-0">
                  <span>{isLadderOpen ? 'طي الخريطة' : 'عرض خريطة توزيع السور ▾'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isLadderOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isLadderOpen && (
                <div className="p-3.5 sm:p-5 border-t border-slate-100 bg-slate-50/40 animate-fadeIn space-y-3">
                  {/* Legend / Guidance note */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                        <span className="font-bold text-amber-900">⭐ سور المستهدفات المرحلية</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        <span className="font-bold text-emerald-900">سور بها طلاب حالياً</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block"></span>
                        <span className="text-slate-500">باقي سور المصحف</span>
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      (انقر على أي سورة لعرض تفاصيل المستهدف وقائمة الطلاب)
                    </span>
                  </div>

                  {/* Responsive Grid: 4 equal-width cards on mobile, 6-12 on larger screens */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 sm:gap-2">
                    {SURAHS_LIST.map((surah) => {
                      const cleanName = (surah.name || '').replace(/^سورة\s+/, '').trim();
                      const count = surahCounts[cleanName] || 0;
                      const targetInfo = getSurahTargetInfo(cleanName);
                      const isTarget = Boolean(targetInfo);

                      return (
                        <button
                          key={surah.number}
                          type="button"
                          onClick={() => setSelectedSurahForDetail(surah)}
                          className={`p-1.5 sm:p-2 rounded-xl text-center border transition-all flex flex-col justify-between items-center cursor-pointer min-h-[66px] sm:min-h-[72px] active:scale-95 select-none ${
                            isTarget
                              ? count > 0
                                ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-2xs hover:bg-amber-100 ring-1 ring-amber-300/60'
                                : 'bg-amber-50/50 border-amber-200/90 text-amber-900 hover:bg-amber-100/60'
                              : count > 0
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs hover:bg-emerald-100/80'
                              : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-full flex items-center justify-between text-[9px] font-mono leading-none">
                            <span className={isTarget ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                              #{surah.number}
                            </span>
                            {isTarget && (
                              <span title="مستهدف مرحلي" className="text-amber-500 text-[10px] leading-none">
                                ⭐
                              </span>
                            )}
                          </div>

                          <div
                            className={`font-bold text-[11px] sm:text-xs truncate w-full my-0.5 ${
                              isTarget ? 'text-amber-950' : count > 0 ? 'text-emerald-950' : 'text-slate-700'
                            }`}
                          >
                            {surah.name}
                          </div>

                          <div className="w-full flex items-center justify-center min-h-[16px]">
                            {count > 0 ? (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-700 text-white shadow-2xs leading-tight">
                                {count} {count === 1 ? 'طالب' : 'طلاب'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300">-</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Collapsible Students Quran Outcomes Records with integrated search/filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header with Accordion Toggle */}
            <button
              type="button"
              onClick={() => setIsRecordsOpen(!isRecordsOpen)}
              className="w-full p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-right cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  سجل المخرجات القرآنية ({filtered.length} من أصل {accessibleStudents.length} طالب)
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-500 font-normal">
                  (انقر على اسم الطالب لفتح بطاقته الشاملة)
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-white px-3 py-1 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
                <span>{isRecordsOpen ? 'طي السجل' : 'عرض السجل ▾'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isRecordsOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {isRecordsOpen && (
              <div className="animate-fadeIn">
                {/* Search and Filters Bar - placed directly between Header and Table */}
                <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="بحث فوري باسم الطالب أو السورة المحفوظة..."
                      className="w-full text-xs pr-9 pl-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="text-xs px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium"
                    >
                      <option value="all">جميع الصفوف</option>
                      <option value="تمهيدي">تمهيدي</option>
                      <option value="صف أول">صف أول</option>
                      <option value="صف ثاني">صف ثاني</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium"
                    >
                      <option value="all">جميع الحالات القرآنية</option>
                      <option value="advanced">متقدم ⭐</option>
                      <option value="on_track">على الخطة 🔵</option>
                      <option value="not_moved_yet">لم ينتقل بعد (تثبيت) 🟣</option>
                      <option value="needs_support">يحتاج دعم 🟠</option>
                      <option value="lagging">متأخر 🔴</option>
                    </select>

                    {(searchTerm || gradeFilter !== 'all' || statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setGradeFilter('all');
                          setStatusFilter('all');
                        }}
                        className="text-xs px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                      >
                        إعادة ضبط
                      </button>
                    )}
                  </div>
                </div>

                {/* Responsive Students View: Mobile Cards (no horizontal scroll) & Desktop Table */}
                {/* 1. Mobile Cards View (md:hidden) */}
                <div className="md:hidden divide-y divide-slate-100 bg-slate-50/40 p-3 space-y-3">
                  {filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                      لا توجد نتائج مطابقة لخيارات البحث المحددة.
                    </div>
                  ) : (
                    filtered.map(({ student, eval: ev }) => {
                      const halaqahObj = (halaqahs || []).find((h) => h.id === student.halaqahId);

                      return (
                        <div
                          key={student.id}
                          className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3 active:border-emerald-300 transition-colors"
                          onClick={() => setSelectedStudentForProfile(student.id)}
                        >
                          {/* Top: Student name + Grade + Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                                {(student.fullName || 'ط').charAt(0)}
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {student.fullName}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {student.grade} {halaqahObj ? `• ${halaqahObj.name}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                            </div>
                          </div>

                          {/* Positions & Targets Grid */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-[11px] border border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px]">الموضع الحالي:</span>
                              <span className="font-bold text-blue-900 leading-tight block mt-0.5">
                                سورة {student.currentSurah} (آية {student.currentAyah})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">المستهدف الأدنى:</span>
                              <span className="font-bold text-slate-700 leading-tight block mt-0.5">
                                سورة {student.minimumTargetSurah}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar & Actions */}
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-[11px] font-mono font-bold text-slate-800 shrink-0">
                                {ev.memorizationProgressRate}%
                              </span>
                              <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    ev.memorizationProgressRate >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${Math.min(100, ev.memorizationProgressRate)}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForProfile(student.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition-colors border border-emerald-200 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                <span>البطاقة</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenReport(student)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors border border-emerald-200 cursor-pointer"
                                title="إرسال تقرير الواتساب لولي الأمر"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-700" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Desktop Table View (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">اسم الطالب</th>
                        <th className="p-3.5">الصف والحلقة</th>
                        <th className="p-3.5">الموضع الحالي</th>
                        <th className="p-3.5">الحد الأدنى المستهدف</th>
                        <th className="p-3.5">الهدف الشخصي</th>
                        <th className="p-3.5">نسبة الإنجاز</th>
                        <th className="p-3.5">الحالة القرآنية</th>
                        <th className="p-3.5 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            لا توجد نتائج مطابقة لخيارات البحث المحددة.
                          </td>
                        </tr>
                      ) : (
                        filtered.map(({ student, eval: ev }) => {
                          const halaqahObj = (halaqahs || []).find((h) => h.id === student.halaqahId);

                          return (
                            <tr
                              key={student.id}
                              className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                              onClick={() => setSelectedStudentForProfile(student.id)}
                            >
                              <td className="p-3.5 font-bold text-slate-900 group-hover:text-emerald-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                                    {(student.fullName || 'ط').charAt(0)}
                                  </div>
                                  <span className="underline-offset-2 group-hover:underline">
                                    {student.fullName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-600">
                                <div>{student.grade}</div>
                                {halaqahObj && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {halaqahObj.name}
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5 font-bold text-blue-900">
                                سورة {student.currentSurah} (آية {student.currentAyah})
                              </td>
                              <td className="p-3.5 text-slate-700">سورة {student.minimumTargetSurah}</td>
                              <td className="p-3.5 text-emerald-800 font-semibold">
                                {student.personalTargetSurah ? `سورة ${student.personalTargetSurah} ⭐` : 'الحد الأدنى'}
                              </td>
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900">
                                    {ev.memorizationProgressRate}%
                                  </span>
                                  <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        ev.memorizationProgressRate >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                                      }`}
                                      style={{ width: `${Math.min(100, ev.memorizationProgressRate)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                              </td>
                              <td
                                className="p-3.5 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentForProfile(student.id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition-colors border border-emerald-200 cursor-pointer"
                                    title="عرض بطاقة الطالب الشاملة"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>البطاقة</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenReport(student)}
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors border border-emerald-200 cursor-pointer"
                                    title="إرسال تقرير الواتساب لولي الأمر"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-700" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 6. Public Institutional Curriculum Overview (Strict Zero-PII) */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
              معايير المنهج القرآني المعتمدة
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
              المستويات القرآنية المستهدفة لمرحلة البراعم
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              تعتمد منظومة جامع الغزاوي خطة تصاعدية متقنة تضمن ربط حفظ القرآن الكريم بالهجاء الصحيح والتمكين التجويدي من سورة الناس وصولاً إلى سورة الغاشية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-md">
                  المستوى الأول
                </span>
                <span className="text-xs text-slate-500 font-medium">فئة التمهيدي</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">من سورة الناس إلى سورة الفيل</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                التركيز على مخارج الحروف، التلقين الصوتي المنضبط، تصحيح قصار السور مع الأذكار اليومية الأساسية.
              </p>
              <div className="pt-2 border-t border-amber-200/50 text-[11px] font-semibold text-amber-800">
                المستهدف الأدنى: 10 سور قصيرة
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 bg-blue-200/70 px-2.5 py-0.5 rounded-md">
                  المستوى الثاني
                </span>
                <span className="text-xs text-slate-500 font-medium">الصف الأول الابتدائي</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">من سورة الناس إلى سورة الضحى</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                الربط التام بين دروس الهجاء وقراءة المصحف، إتقان الغنن والمدود الطبيعية، الحفظ المتسلسل مع التسميع التراكمي.
              </p>
              <div className="pt-2 border-t border-blue-200/50 text-[11px] font-semibold text-blue-800">
                المستهدف الأدنى: 22 سورة
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 bg-emerald-200/70 px-2.5 py-0.5 rounded-md">
                  المستوى النهائي
                </span>
                <span className="text-xs text-slate-500 font-medium">الصف الثاني الابتدائي</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">من سورة الناس إلى سورة الغاشية</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                المخرج التتويجي للمرحلة: «متقنٌ لهجاء القرآن وحفظه إلى الغاشية»، مع القدرة على قراءة أي كلمة قرآنية مجردة.
              </p>
              <div className="pt-2 border-t border-emerald-200/50 text-[11px] font-semibold text-emerald-800">
                المستهدف الأدنى: 27 سورة (المخرج المعتمد)
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-right">
              <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                هل أنت ولي أمر وترغب في متابعة إنجاز ابنك؟
              </h5>
              <p className="text-[11px] sm:text-xs text-slate-600">
                بيانات الطلاب وتقارير الإنجاز الفردية محفوظة بخصوصية تامة عبر بوابة ولي الأمر برقم الجوال المسجل.
              </p>
            </div>
            <div className="text-xs text-emerald-800 font-bold bg-emerald-100/70 px-4 py-2 rounded-xl border border-emerald-300 shrink-0">
              استعلم عبر تبويب «بوابة ولي الأمر»
            </div>
          </div>
        </div>
      )}

      {/* 7. Unified Comprehensive Student Quran Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[90vh] animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-800 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {(selectedStudent.fullName || 'ط').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-black text-slate-900">
                      {selectedStudent.fullName}
                    </h3>
                    {selectedStudentEval && (
                      <StatusBadge
                        status={selectedStudentEval.status}
                        label={selectedStudentEval.statusLabel}
                        size="sm"
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedStudent.grade} • {selectedStudentHalaqah?.name || 'حلقة غير محددة'} • المعلم: {selectedStudentTeacher?.name || 'غير محدد'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForProfile(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar inside Modal */}
            <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">الموضع الحالي</span>
                <span className="font-bold text-xs text-blue-900">
                  سورة {selectedStudent.currentSurah}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">المستهدف الأدنى</span>
                <span className="font-bold text-xs text-slate-800">
                  سورة {selectedStudent.minimumTargetSurah}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">نسبة الإنجاز</span>
                <span className="font-bold text-xs text-emerald-800">
                  {selectedStudentEval?.memorizationProgressRate || 0}%
                </span>
              </div>
            </div>

            {/* Internal Subtabs */}
            <div className="flex items-center gap-2 mt-4 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setProfileModalTab('records')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  profileModalTab === 'records'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>سجل التسميع والمراجعة ({selectedStudentRecords.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileModalTab('plan_summary')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  profileModalTab === 'plan_summary'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>الخطة الفردية التفصيلية</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              {profileModalTab === 'records' ? (
                selectedStudentRecords.length === 0 ? (
                  <div className="bg-slate-50 p-6 rounded-2xl text-slate-500 text-center border border-dashed border-slate-200">
                    لا توجد جلسات تسميع سابقة مسجلة لهذا الطالب حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedStudentRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          {rec.memorization && (
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-bold text-slate-900">
                                حفظ جديد: سورة {rec.memorization.surahFrom} ({rec.memorization.ayahFrom}) إلى {rec.memorization.surahTo} ({rec.memorization.ayahTo})
                              </span>
                              <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.2 rounded-md text-[10px]">
                                {rec.memorization.score}%
                              </span>
                            </div>
                          )}

                          {rec.revision && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                مراجعة {rec.revision.type}: من سورة {rec.revision.surahFrom} إلى {rec.revision.surahTo}
                              </span>
                              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md text-[10px]">
                                {rec.revision.score}%
                              </span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-500">
                            التاريخ: {rec.date} (الأسبوع {rec.weekNumber})
                          </div>
                          {rec.teacherRemarks && (
                            <p className="text-[11px] text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100">
                              ملاحظة المعلم: {rec.teacherRemarks}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Plan Summary & Direct Editor Launcher */
                <div className="space-y-3">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <h4 className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>بيانات الخطة الفردية للطالب</span>
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      يتم اعتماد الخطة الفردية بناءً على المرحلة الدراسية ({selectedStudent.grade})، مع توزيع ورد الحفظ الجديد على مدار 4 أيام أسبوعياً والمراجعة الصغرى والكبرى.
                    </p>
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">الهدف الشخصي المحفز:</span>
                      <span className="font-bold text-emerald-900">
                        {selectedStudent.personalTargetSurah
                          ? `سورة ${selectedStudent.personalTargetSurah}`
                          : 'مطابق للحد الأدنى المرجعي للمرحلة'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-right">
                      <h5 className="font-bold text-slate-900 text-xs">
                        تعديل وتخصيص جدول الـ 4 أيام والمقادير
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        يمكنك فتح محرر الخطة الفردية لضبط أيام التسميع والمقدار بالسورة أو الآية
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedStudent;
                        setSelectedStudentForProfile(null);
                        setSelectedStudentForPlan(s);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>فتح محرر الخطة التفصيلية</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForProfile(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="button"
                onClick={() => handleOpenReport(selectedStudent)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>إرسال تقرير الواتساب لولي الأمر 📲</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Surah Milestone & Student Distribution Modal */}
      {selectedSurahForDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          onClick={() => setSelectedSurahForDetail(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-serif text-lg font-black shrink-0 border border-emerald-200">
                  {selectedSurahForDetail.number}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedSurahForDetail.name.startsWith('سورة')
                        ? selectedSurahForDetail.name
                        : `سورة ${selectedSurahForDetail.name}`}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      السورة رقم {selectedSurahForDetail.number} من 114
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedSurahForDetail.numberOfAyahs ? `${selectedSurahForDetail.numberOfAyahs} آية` : 'من سور القرآن الكريم'}{' '}
                    {selectedSurahForDetail.revelationType === 'Meccan' ? '• مكية' : selectedSurahForDetail.revelationType === 'Medinan' ? '• مدنية' : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSurahForDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto flex-1 py-4 space-y-4 text-right">
              {/* Target / Milestone Information Card (if applicable) */}
              {(() => {
                const cleanName = (selectedSurahForDetail.name || '').replace(/^سورة\s+/, '').trim();
                const targetInfo = getSurahTargetInfo(cleanName);

                if (targetInfo) {
                  return (
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>مستهدف مرحلي معتمد في المنهج</span>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-bold">
                          {targetInfo.gradeText}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-amber-950">
                        {targetInfo.stageName}
                      </div>
                      <p className="text-[11px] text-amber-900/90 leading-relaxed">
                        {targetInfo.description}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-slate-600 text-xs">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>هذه السورة تقع ضمن المسار التتابعي للحفظ القرآني والتسميع التراكمي للطلاب.</span>
                  </div>
                );
              })()}

              {/* Quick Distribution Summary Metric & Progress bar */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">عدد الطلاب في هذه السورة حالياً:</span>
                  <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-sm">
                    {studentsInSelectedSurah.length} طالب
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>نسبة طلاب السورة من إجمالي المجمع:</span>
                    <span className="font-mono font-bold">
                      {accessibleStudents.length > 0
                        ? Math.round((studentsInSelectedSurah.length / accessibleStudents.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          accessibleStudents.length > 0
                            ? Math.min(
                                100,
                                Math.round((studentsInSelectedSurah.length / accessibleStudents.length) * 100)
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* List of Students in this Surah */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
                  <span>قائمة طلاب السورة ({studentsInSelectedSurah.length}):</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (انقر على اسم الطالب للانتقال لبطاقته)
                  </span>
                </div>

                {studentsInSelectedSurah.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-xs space-y-1">
                    <p className="font-medium text-slate-700">لا يوجد طلاب متوقفون عند هذه السورة حالياً.</p>
                    <p className="text-[11px] text-slate-400">
                      قد يكون الطلاب في مراحل سابقة أو تجاوزوا هذه السورة في خطتهم القرآنية.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                    {studentsInSelectedSurah.map((st) => {
                      const halaqahObj = (halaqahs || []).find((h) => h.id === st.halaqahId);
                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            setSelectedSurahForDetail(null);
                            setSelectedStudentForProfile(st.id);
                          }}
                          className="p-3 bg-slate-50 hover:bg-emerald-50/70 rounded-xl border border-slate-200/80 hover:border-emerald-300 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                              {(st.fullName || 'ط').charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">
                                {st.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {st.grade} {halaqahObj ? `• ${halaqahObj.name}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              آية {st.currentAyah}
                            </span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedSurahForDetail(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
              >
                إغلاق
              </button>

              {studentsInSelectedSurah.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const cleanName = (selectedSurahForDetail.name || '').replace(/^سورة\s+/, '').trim();
                    setSearchTerm(cleanName);
                    setIsRecordsOpen(true);
                    setSelectedSurahForDetail(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
                >
                  فلترة جدول الطلاب بهذه السورة 🔍
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <StudentQuranPlanModal
        isOpen={Boolean(selectedStudentForPlan)}
        student={selectedStudentForPlan}
        onClose={() => setSelectedStudentForPlan(null)}
      />

      {/* 9. Report Modal */}
      <ReportDispatchModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={reportData.title}
        reportContent={reportData.content}
        recipientName={reportData.recipientName}
        recipientPhone={reportData.recipientPhone}
        recipientType="parent"
        reportType="weekly"
        studentId={reportData.studentId}
        teacherId={reportData.teacherId}
      />

      {/* 10. Edit Academic Outcome Modal */}
      {isOutcomeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOutcomeModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    تعديل المخرج القرآني المرجعي المعتمد
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeTenant?.name ? `خاص بمجمع: ${activeTenant.name}` : 'اعتماد الصياغة الرسمية للمخرج القرآني'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOutcomeModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutcome} className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  نص المخرج القرآني المرجعي المعتمد (العبارة الرسمية) *
                </label>
                <input
                  type="text"
                  required
                  value={outcomeForm.outcomeText}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcomeText: e.target.value })}
                  placeholder="مثال: «متقنٌ لهجاء القرآن وحفظه إلى الغاشية»"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-amber-300 focus:border-amber-600 focus:outline-none bg-white shadow-inner"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  هذا النص يتزامن فوراً مع إعدادات المجمع الأكاديمية (/#/admin/academic) ولوحة التحكم وكافة التقارير.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  السورة المستهدفة للمخرج
                </label>
                <select
                  value={outcomeForm.targetSurah}
                  onChange={(e) => {
                    const newSurah = e.target.value;
                    setOutcomeForm((prev) => ({
                      ...prev,
                      targetSurah: newSurah,
                      outcomeText: prev.outcomeText.includes('إلى')
                        ? prev.outcomeText.replace(/إلى\s+[^\s»]+/, `إلى ${newSurah}`)
                        : `«متقنٌ لهجاء القرآن وحفظه إلى ${newSurah}»`,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-amber-300 focus:border-amber-600 focus:outline-none bg-white"
                >
                  {SURAHS_LIST.map((surah) => (
                    <option key={surah.number} value={surah.name}>
                      سورة {surah.name} (رقم {surah.number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  تعديل المخرج من هذه الشاشة يحفظ التغيير مباشرة في قاعدة البيانات المركزية للمجمع، وينعكس في صفحة الإعدادات الأكاديمية وصفحة المتابعة القرآنية فوراً.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsOutcomeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={outcomeSaving || !outcomeForm.outcomeText.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {outcomeSaving ? 'جارٍ الحفظ...' : 'حفظ واعتماد المخرج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outcome Saved Toast */}
      {outcomeSavedToast && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 bg-emerald-900 text-emerald-100 border-emerald-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>تم حفظ وتحديث المخرج القرآني المعتمد بنجاح ومزامنته مع النظام.</span>
        </div>
      )}
    </div>
  );
};
