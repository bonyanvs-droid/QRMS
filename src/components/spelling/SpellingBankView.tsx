import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  BookOpen,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Eye,
  X,
  Award,
  PlayCircle,
  Printer,
  Compass,
  FileText,
  UserCheck,
} from 'lucide-react';
import { SpellingLesson, SubLesson, Student } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import { SpellingStudentProfileModal } from './SpellingStudentProfileModal';
import { SpellingInteractiveBoard } from './SpellingInteractiveBoard';
import { SpellingAssessmentModal } from './SpellingAssessmentModal';
import { SpellingTranscriptModal } from './SpellingTranscriptModal';
import { SpellingPedagogyGuide } from './SpellingPedagogyGuide';

export const SpellingBankView: React.FC = () => {
  const {
    spellingLessons,
    addSpellingLesson,
    updateSpellingLesson,
    deleteSpellingLesson,
    addSubLesson,
    updateSubLesson,
    deleteSubLesson,
    students,
    teachers,
    halaqahs,
    activeTenantId,
    sessionRecords,
    academicConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'students' | 'board' | 'bank' | 'guide'>('students');

  // Modals state
  const [selectedProfileStudentId, setSelectedProfileStudentId] = useState<string | null>(null);
  const [assessingStudent, setAssessingStudent] = useState<Student | null>(null);
  const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(null);

  // Lesson Edit/Create Modal
  const [editingLesson, setEditingLesson] = useState<Partial<SpellingLesson> | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);

  // Sub-lesson Edit/Create Modal
  const [activeLessonForSub, setActiveLessonForSub] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<Partial<SubLesson> | null>(null);
  const [isNewSub, setIsNewSub] = useState(false);

  // Search and filters for students tab
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [halaqahFilter, setHalaqahFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter halaqahs for active tenant
  const tenantHalaqahs = useMemo(() => {
    return (halaqahs || []).filter((h) => !activeTenantId || h.tenantId === activeTenantId);
  }, [halaqahs, activeTenantId]);

  const visibleTeachers = useMemo(() => {
    return teachers.filter(
      (t) =>
        t.tenantId === activeTenantId ||
        (!t.tenantId && activeTenantId === 'ghazzawi') ||
        halaqahs.some(
          (h) =>
            h.teacherId === t.id &&
            (h.tenantId === activeTenantId || (!h.tenantId && activeTenantId === 'ghazzawi'))
        )
    );
  }, [teachers, activeTenantId, halaqahs]);

  // Dynamically extract unique grades present in the current student list
  const availableGrades = useMemo(() => {
    const gradesMap = new Map<string, number>();
    (students || []).forEach((s) => {
      const g = (s.grade || '').trim();
      if (g) {
        gradesMap.set(g, (gradesMap.get(g) || 0) + 1);
      }
    });
    return Array.from(gradesMap.entries()).map(([grade, count]) => ({ grade, count }));
  }, [students]);

  // Evaluated Students for spelling
  const evaluatedStudents = useMemo(() => {
    return (students || []).map((s) => ({
      student: s,
      eval: evaluateStudentStatus(s, sessionRecords, spellingLessons, academicConfig),
      halaqah: halaqahs.find((h) => h.id === s.halaqahId),
      teacher: teachers.find((t) => t.id === s.teacherId),
    }));
  }, [students, sessionRecords, spellingLessons, academicConfig, halaqahs, teachers]);

  // Normalization helper for robust grade matching
  const normalizeGradeStr = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/^الصف\s+/, '')
      .replace(/^صف\s+/, '')
      .replace(/^ال/, '')
      .replace(/\s+/g, '')
      .trim();
  };

  const filteredStudents = useMemo(() => {
    return evaluatedStudents.filter(({ student, eval: ev, teacher, halaqah }) => {
      // 1. Search term match
      const searchNormalized = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchNormalized ||
        student.fullName?.toLowerCase().includes(searchNormalized) ||
        (student.name && student.name.toLowerCase().includes(searchNormalized)) ||
        (teacher?.name && teacher.name.toLowerCase().includes(searchNormalized)) ||
        (halaqah?.name && halaqah.name.toLowerCase().includes(searchNormalized));

      // 2. Grade match
      let matchesGrade = true;
      if (gradeFilter !== 'all') {
        if (!student.grade) {
          matchesGrade = false;
        } else if (student.grade === gradeFilter) {
          matchesGrade = true;
        } else {
          const normStudentGrade = normalizeGradeStr(student.grade);
          const normFilter = normalizeGradeStr(gradeFilter);
          matchesGrade =
            normStudentGrade === normFilter ||
            normStudentGrade.includes(normFilter) ||
            normFilter.includes(normStudentGrade);
        }
      }

      // 3. Halaqah match
      const matchesHalaqah = halaqahFilter === 'all' || student.halaqahId === halaqahFilter;

      // 4. Teacher match
      const matchesTeacher = teacherFilter === 'all' || student.teacherId === teacherFilter;

      // 5. Status match
      const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;

      return matchesSearch && matchesGrade && matchesHalaqah && matchesTeacher && matchesStatus;
    });
  }, [evaluatedStudents, searchTerm, gradeFilter, halaqahFilter, teacherFilter, statusFilter]);

  // Calculate high-level spelling statistics based ONLY on evaluated students
  const assessedEvaluations = evaluatedStudents.filter((e) => e.eval.hasSpellingEvaluation);
  const totalAssessed = assessedEvaluations.length;
  const totalMastered = assessedEvaluations.filter((e) => e.eval.spellingMasteryRate >= 85).length;
  const averageMastery =
    totalAssessed > 0
      ? Math.round(
          assessedEvaluations.reduce((acc, curr) => acc + curr.eval.spellingMasteryRate, 0) /
            totalAssessed
        )
      : null;

  const handleOpenAddLesson = () => {
    setIsNewLesson(true);
    setEditingLesson({
      lessonNumber: spellingLessons.length + 1,
      title: '',
      expectedWeek: academicConfig.operationalStartWeek + spellingLessons.length,
      targetGrade: 'صف أول',
      coreSkills: [],
      passingThreshold: 85,
      order: spellingLessons.length + 1,
      subLessons: [],
    });
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title) return;

    if (isNewLesson) {
      addSpellingLesson(editingLesson as Omit<SpellingLesson, 'id'>);
    } else if (editingLesson.id) {
      updateSpellingLesson(editingLesson.id, editingLesson);
    }
    setEditingLesson(null);
  };

  const handleSaveSubLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editingSub.title || !activeLessonForSub) return;

    if (isNewSub) {
      addSubLesson(activeLessonForSub, editingSub as Omit<SubLesson, 'id'>);
    } else if (editingSub.id) {
      updateSubLesson(activeLessonForSub, editingSub.id, editingSub);
    }
    setEditingSub(null);
    setActiveLessonForSub(null);
  };

  // Reordering Lessons
  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === spellingLessons.length - 1)
    ) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const cloned = [...spellingLessons];
    const temp = cloned[index];
    cloned[index] = cloned[newIndex];
    cloned[newIndex] = temp;

    // Update orders
    cloned.forEach((item, idx) => {
      updateSpellingLesson(item.id, { order: idx + 1, lessonNumber: idx + 1 });
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-12">
      {/* 1. Simplified, Mobile-Responsive System Banner */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900">
                  منظومة الهجاء القرآني وضبط المخارج
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/70">
                  {spellingLessons.length} درساً معيارياً
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                المرتكز الأساسي لإتقان القراءة من المصحف الشريف، الربط بالأسبوع التشغيلي، واختبار المهارات الجزئية
              </p>
            </div>
          </div>

          {/* Clean Compact Statistics Bar */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-emerald-50/80 p-2.5 px-4 rounded-xl sm:rounded-2xl border border-emerald-200 text-xs shrink-0">
            <div className="text-center sm:text-right">
              <span className="text-[10px] text-emerald-800 font-bold block">متوسط الإتقان العام</span>
              <span className="text-sm sm:text-base font-black text-emerald-950 font-mono">
                {averageMastery !== null ? `${averageMastery}%` : '—'}
              </span>
              <span className="text-[9px] text-emerald-700 block">
                {totalAssessed > 0 ? `(من ${totalAssessed} مقيّم)` : 'بانتظار رصد التقييمات'}
              </span>
            </div>
            <div className="w-px h-7 bg-emerald-300/80" />
            <div className="text-center sm:text-right">
              <span className="text-[10px] text-emerald-800 font-bold block">المتقنون للمسار</span>
              <span className="text-sm sm:text-base font-black text-emerald-950 font-mono">
                {totalMastered} / {totalAssessed > 0 ? totalAssessed : students.length}
              </span>
              <span className="text-[9px] text-emerald-700 block">
                {totalAssessed > 0
                  ? `(${Math.round((totalMastered / totalAssessed) * 100)}% من المقيّمين)`
                  : 'لم يُقيّم أحد بعد'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main View Switcher Tabs */}
      <div className="bg-white rounded-2xl p-1.5 sm:p-2 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'students'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مصفوفة إتقان الطلاب ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'board'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>اللوحة التفاعلية والنطق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'bank'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>بنك الدروس ({spellingLessons.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>دليل المعلم</span>
          </button>
        </div>

        {activeTab === 'bank' && (
          <button
            type="button"
            onClick={handleOpenAddLesson}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة درس هجائي جديد</span>
          </button>
        )}
      </div>

      {/* TAB 1: STUDENTS SPELLING MASTERY MATRIX */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الطالب أو المعلم أو الحلقة..."
                className="w-full text-xs pr-9 pl-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-emerald-600 focus:bg-white transition-colors"
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Dynamic Grades Filter */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="text-xs px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold focus:outline-emerald-600 bg-white"
              >
                <option value="all">جميع الصفوف ({students.length})</option>
                {availableGrades.map(({ grade, count }) => (
                  <option key={grade} value={grade}>
                    {grade} ({count})
                  </option>
                ))}
              </select>

              {/* Halaqah Filter */}
              <select
                value={halaqahFilter}
                onChange={(e) => setHalaqahFilter(e.target.value)}
                className="text-xs px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold focus:outline-emerald-600 bg-white"
              >
                <option value="all">جميع الحلقات ({tenantHalaqahs.length})</option>
                {tenantHalaqahs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>

              {/* Teacher Filter */}
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="text-xs px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold focus:outline-emerald-600 bg-white"
              >
                <option value="all">جميع المعلمين ({visibleTeachers.length})</option>
                {visibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold focus:outline-emerald-600 bg-white"
              >
                <option value="all">جميع الحالات</option>
                <option value="advanced">متقدم ⭐</option>
                <option value="on_track">على الخطة 🔵</option>
                <option value="not_moved_yet">تثبيت 🟣</option>
                <option value="needs_support">يحتاج دعم 🟠</option>
                <option value="lagging">متأخر 🔴</option>
              </select>
            </div>
          </div>

          {/* Results Counter & Reset */}
          {(searchTerm || gradeFilter !== 'all' || halaqahFilter !== 'all' || teacherFilter !== 'all' || statusFilter !== 'all') && (
            <div className="flex items-center justify-between px-2 text-xs text-slate-600">
              <span>
                عرض <strong>{filteredStudents.length}</strong> من أصل <strong>{students.length}</strong> طالباً
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setGradeFilter('all');
                  setHalaqahFilter('all');
                  setTeacherFilter('all');
                  setStatusFilter('all');
                }}
                className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          )}

          {/* 1. Mobile Cards View (No Horizontal Scrollbar on Mobile) */}
          <div className="block md:hidden space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200 text-xs">
                لا توجد نتائج مطابقة لمعايير البحث في مصفوفة الهجاء.
              </div>
            ) : (
              filteredStudents.map(({ student, eval: ev, halaqah, teacher }) => {
                const currentLesson = spellingLessons.find(
                  (l) => l.id === student.currentSpellingLessonId
                );

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                  >
                    {/* Header: Name, Grade & Status */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-black text-slate-900 text-sm block">
                          {student.fullName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {student.grade && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                              {student.grade}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {halaqah?.name || 'حلقة عامة'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                    </div>

                    {/* Quick Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">الدرس المسجل</span>
                        <span className="font-bold text-emerald-800 text-[11px] block mt-0.5 truncate">
                          {currentLesson
                            ? `د ${currentLesson.lessonNumber}: ${currentLesson.title}`
                            : 'الدرس 1'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">
                          المتوقع (أسبوع {academicConfig.currentWeek})
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-bold text-slate-700 text-[11px]">
                            الدرس {ev.expectedLessonNum}
                          </span>
                          <span className="text-[10px] font-bold">
                            {ev.differenceFromPlan > 0 ? (
                              <span className="text-emerald-700">(+{ev.differenceFromPlan})</span>
                            ) : ev.differenceFromPlan < 0 ? (
                              <span className="text-rose-600">({ev.differenceFromPlan})</span>
                            ) : (
                              <span className="text-blue-700">(مطابق)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-600 font-bold">درجة الإتقان:</span>
                        {ev.hasSpellingEvaluation ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-xs font-black font-mono ${
                              ev.spellingMasteryRate >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.spellingMasteryRate >= 70
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ev.spellingMasteryRate}%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                            غير مقيّم بعد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setAssessingStudent(student)}
                        className="py-2 px-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>تقييم فوري</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedProfileStudentId(student.id)}
                        className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>المسار</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTranscriptStudent(student)}
                        className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>كشف</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">اسم الطالب</th>
                    <th className="p-3.5">المعلم والحلقة</th>
                    <th className="p-3.5">الدرس الفعلي المسجل</th>
                    <th className="p-3.5">المتوقع للأسبوع {academicConfig.currentWeek}</th>
                    <th className="p-3.5">فارق الخطة</th>
                    <th className="p-3.5">درجة الإتقان</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات التفاعلية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        لا توجد نتائج مطابقة لمعايير البحث في مصفوفة الهجاء.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(({ student, eval: ev, halaqah, teacher }) => {
                      const currentLesson = spellingLessons.find(
                        (l) => l.id === student.currentSpellingLessonId
                      );

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{student.fullName}</span>
                            <span className="text-[10px] text-slate-500 block">{student.grade}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 block">{teacher?.name}</span>
                            <span className="text-[10px] text-slate-500 block">{halaqah?.name}</span>
                          </td>
                          <td className="p-3.5 font-bold text-emerald-800">
                            {currentLesson
                              ? `الدرس ${currentLesson.lessonNumber}: ${currentLesson.title}`
                              : 'الدرس 1'}
                          </td>
                          <td className="p-3.5 text-slate-600 font-mono">
                            الدرس {ev.expectedLessonNum}
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            {ev.differenceFromPlan > 0 ? (
                              <span className="text-emerald-700">+{ev.differenceFromPlan} متقدم</span>
                            ) : ev.differenceFromPlan < 0 ? (
                              <span className="text-rose-600">{ev.differenceFromPlan} متأخر</span>
                            ) : (
                              <span className="text-blue-700">مطابق (0)</span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold font-mono">
                            {ev.hasSpellingEvaluation ? (
                              <span
                                className={`px-2.5 py-1 rounded-lg ${
                                  ev.spellingMasteryRate >= 85
                                    ? 'bg-emerald-100 text-emerald-800 font-black'
                                    : ev.spellingMasteryRate >= 70
                                    ? 'bg-amber-100 text-amber-800 font-black'
                                    : 'bg-rose-100 text-rose-800 font-black'
                                }`}
                              >
                                {ev.spellingMasteryRate}%
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                                غير مقيّم بعد
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAssessingStudent(student)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                                title="اختبار وتقييم الهجاء المباشر"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>تقييم فوري</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedProfileStudentId(student.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                title="عرض المسار التراكمي للطالب"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>المسار</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTranscriptStudent(student)}
                                className="p-1 text-slate-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="طباعة كشف الإتقان المعتمد"
                              >
                                <Printer className="w-4 h-4" />
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
        </div>
      )}

      {/* TAB 2: INTERACTIVE PHONETICS & ORTHOGRAPHY BOARD */}
      {activeTab === 'board' && <SpellingInteractiveBoard />}

      {/* TAB 3: CURRICULUM BANK */}
      {activeTab === 'bank' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spellingLessons.map((lesson, index) => {
            const isCurrentWeekLesson = lesson.expectedWeek === academicConfig.currentWeek;
            const studentsInThisLesson = students.filter(
              (s) => s.currentSpellingLessonId === lesson.id
            ).length;

            return (
              <div
                key={lesson.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isCurrentWeekLesson
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {lesson.lessonNumber}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{lesson.title}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                            {lesson.targetGrade}
                          </span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                            الأسبوع {lesson.expectedWeek}
                          </span>
                          <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                            {studentsInThisLesson} طلاب
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Controls */}
                    <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(index, 'down')}
                        disabled={index === spellingLessons.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Core Skills Chips */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(lesson.coreSkills || []).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                      >
                        • {skill}
                      </span>
                    ))}
                  </div>

                  {/* Sub Lessons list */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>المهام الجزئية ({(lesson.subLessons || []).length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLessonForSub(lesson.id);
                          setIsNewSub(true);
                          setEditingSub({
                            title: '',
                            maxScore: 100,
                            description: '',
                          });
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>مهمة</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(lesson.subLessons || []).map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-slate-50 p-2 rounded-xl text-xs flex items-center justify-between border border-slate-100 group"
                        >
                          <div className="flex-1 truncate">
                            <span className="font-semibold text-slate-800">{sub.title}</span>
                            {sub.description && (
                              <p className="text-[10px] text-slate-700 truncate">
                                {sub.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLessonForSub(lesson.id);
                                setIsNewSub(false);
                                setEditingSub(sub);
                              }}
                              className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSubLesson(lesson.id, sub.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lesson Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-700 font-medium">
                    معيار الإتقان: <strong>{lesson.passingThreshold}%</strong>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewLesson(false);
                        setEditingLesson(lesson);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-slate-100 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `هل أنت متأكد من حذف الدرس ${lesson.lessonNumber} (${lesson.title})؟`
                          )
                        ) {
                          deleteSpellingLesson(lesson.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: TEACHER'S PEDAGOGY GUIDE */}
      {activeTab === 'guide' && <SpellingPedagogyGuide />}

      {/* Modal 1: Lesson Edit / Create Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isNewLesson ? 'إضافة درس هجائي جديد' : 'تعديل بيانات الدرس الهجائي'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الدرس</label>
                <input
                  type="text"
                  required
                  value={editingLesson.title || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  placeholder="مثال: الحروف بالحركات الثلاث (الفتح والكسر والضم)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الدرس</label>
                  <input
                    type="number"
                    required
                    value={editingLesson.lessonNumber || 1}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, lessonNumber: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الأسبوع المستهدف</label>
                  <input
                    type="number"
                    required
                    value={editingLesson.expectedWeek || 3}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, expectedWeek: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الصف المستهدف</label>
                  <select
                    value={editingLesson.targetGrade || 'صف أول'}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, targetGrade: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="تمهيدي">تمهيدي</option>
                    <option value="صف أول">صف أول</option>
                    <option value="صف ثاني">صف ثاني</option>
                    <option value="مشترك">مشترك لكافة الصفوف</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">معيار الإتقان (%)</label>
                  <input
                    type="number"
                    value={editingLesson.passingThreshold || 85}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        passingThreshold: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المهارات الأساسية (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  value={editingLesson.coreSkills?.join('، ') || ''}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      coreSkills: e.target.value
                        .split(/[,،]/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="مثال: تمييز الحركات، نطق الحرف المفتوح، التطبيق على كلمات"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ الدرس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Sub Lesson Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isNewSub ? 'إضافة مهمة جزئية للدرس' : 'تعديل المهمة الجزئية'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubLesson} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان المهمة الجزئية</label>
                <input
                  type="text"
                  required
                  value={editingSub.title || ''}
                  onChange={(e) => setEditingSub({ ...editingSub, title: e.target.value })}
                  placeholder="مثال: نطق حروف المد الثلاثة (الألف والواو والياء)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وصف المهمة ومثالها</label>
                <input
                  type="text"
                  value={editingSub.description || ''}
                  onChange={(e) => setEditingSub({ ...editingSub, description: e.target.value })}
                  placeholder="مثال: التدرب على كلمة «قال، يقول، قيل»"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Live Assessment Modal */}
      {assessingStudent && (
        <SpellingAssessmentModal
          student={assessingStudent}
          onClose={() => setAssessingStudent(null)}
        />
      )}

      {/* Modal 4: Student Comprehensive Pathway Profile */}
      {selectedProfileStudentId && (
        <SpellingStudentProfileModal
          studentId={selectedProfileStudentId}
          onClose={() => setSelectedProfileStudentId(null)}
        />
      )}

      {/* Modal 5: Printable Official Transcript */}
      {transcriptStudent && (
        <SpellingTranscriptModal
          student={transcriptStudent}
          onClose={() => setTranscriptStudent(null)}
        />
      )}
    </div>
  );
};
