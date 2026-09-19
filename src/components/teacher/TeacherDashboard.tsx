import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Sparkles,
  BookOpen,
  RotateCcw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Send,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
  Star,
  Check,
  X,
  ExternalLink,
  Printer,
  FileSpreadsheet,
  Crown,
  Award,
  Activity,
  ChevronLeft,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  GraduationCap,
  School,
  ShieldCheck,
  Phone,
  Clock,
  Video,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import { filterHalaqahsByScope } from '../../lib/permissions';
import { QuickRecordModal } from './QuickRecordModal';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { OfficialPrintableReportModal } from '../common/OfficialPrintableReportModal';
import { BadgesManagementModal } from './BadgesManagementModal';
import { exportStudentsToExcel } from '../../utils/exportUtils';
import {
  generateParentWeeklyReport,
  generateTeacherWeeklyReport,
} from '../../utils/reportGenerator';
import { Student } from '../../types';
import { StudentQuranPlanModal } from '../quran/StudentQuranPlanModal';
import { ComprehensiveQuranPlanModal } from '../common/ComprehensiveQuranPlanModal';
import { getAcademicOutcome } from '../../quran/services/outcomeService';
import { isModuleEnabled } from '../../lib/moduleChecker';
import { calculateHalaqahTodaySession, formatHalaqahWeeklySummary } from '../../utils/scheduleCalculator';
import { OnlineModeTeacherWidget } from './OnlineModeTeacherWidget';
import { TeacherTrackNominationModal } from './TeacherTrackNominationModal';

interface TeacherDashboardProps {
  onSelectStudentProfile?: (studentId: string) => void;
}

interface ToolModalProps {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

const ToolModal: React.FC<ToolModalProps> = ({ title, icon, onClose, children, wide }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm md:text-base font-black text-slate-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق النافذة"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 max-h-[75vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onSelectStudentProfile }) => {
  const {
    currentUser,
    currentRole,
    teachers,
    halaqahs,
    students,
    spellingLessons,
    sessionRecords,
    academicConfig,
    bulkMarkAttendance,
    badges,
    remedialPlans,
    getActiveStudentQuranPlan,
    mosqueLogoUrl,
    stageLogoUrl,
    activeTenant,
    activeTenantId,
    tracks,
    stages,
    trackNominations,
    prayerTimesToday,
  } = useApp();

  const isLeader =
    currentUser &&
    ['campus_admin', 'system_admin', 'admin', 'supervisor'].includes(currentUser.role);
  const isTeacher = currentUser?.role === 'teacher';

  // Educational Stage Filter & Multi-Halaqah View Mode
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'single_halaqah' | 'all_halaqahs'>('single_halaqah');

  // Filter halaqahs for active tenant
  const tenantHalaqahs = useMemo(() => {
    return (halaqahs || []).filter((h) => !activeTenantId || h.tenantId === activeTenantId);
  }, [halaqahs, activeTenantId]);

  const teacherHalaqahs = useMemo(() => {
    if (!isTeacher || !currentUser) return tenantHalaqahs;
    return tenantHalaqahs.filter(
      h => h.teacherId === currentUser.id || h.assistantTeachers?.some(at => at.id === currentUser.id)
    );
  }, [isTeacher, currentUser, tenantHalaqahs]);

  // Filter halaqahs by stage (checks stageId directly or target grades)
  const visibleHalaqahs = useMemo(() => {
    // Supervisor: only halaqahs inside his assigned scope (stages/halaqahs/delegations)
    const scopedHalaqahs =
      currentUser?.role === 'supervisor'
        ? filterHalaqahsByScope(tenantHalaqahs, currentUser)
        : tenantHalaqahs;
    const baseHalaqahs = isTeacher ? teacherHalaqahs : scopedHalaqahs;
    if (selectedStageId === 'all') return baseHalaqahs;
    const stage = (stages || []).find((s) => s.id === selectedStageId);
    return baseHalaqahs.filter((h) => {
      if (h.stageId && h.stageId === selectedStageId) return true;
      if (stage?.targetGrades && stage.targetGrades.includes(h.grade as any)) return true;
      return false;
    });
  }, [tenantHalaqahs, teacherHalaqahs, isTeacher, selectedStageId, stages, currentUser]);

  // Handler for selecting an educational stage with auto-switching to matching halaqah
  const handleSelectStage = (stageId: string) => {
    setSelectedStageId(stageId);
    if (stageId === 'all') return;
    const stage = (stages || []).find((s) => s.id === stageId);
    const matching = tenantHalaqahs.filter((h) => {
      if (h.stageId && h.stageId === stageId) return true;
      if (stage?.targetGrades && stage.targetGrades.includes(h.grade as any)) return true;
      return false;
    });
    if (matching.length > 0 && !matching.some((h) => h.id === selectedHalaqahId)) {
      setSelectedHalaqahId(matching[0].id);
    }
  };

  // Authoritative module checks for active tenant
  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');

  // Per-halaqah track gating — undefined activeTrackIds = all tracks enabled (legacy default)
  const isHalaqahTrackEnabled = (halaqahId: string | undefined, trackId: string) => {
    const ids = halaqahs.find((h) => h.id === halaqahId)?.activeTrackIds;
    return !ids || ids.includes(trackId);
  };
  const isBadgesActive = isModuleEnabled(activeTenant, 'badges');

  // Modals
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);
  const [trackNominationModalOpen, setTrackNominationModalOpen] = useState(false);
  const [virtualModalOpen, setVirtualModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [interventionModalOpen, setInterventionModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedNominationStudent, setSelectedNominationStudent] = useState<Student | null>(null);

  // Find active halaqah / teacher
  const defaultTeacher =
    currentUser?.role === 'teacher'
      ? teachers.find((t) => t.id === currentUser.id) || teachers[0]
      : teachers[0];

  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>(
    currentUser?.halaqahId || tenantHalaqahs[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  // Active selected student for Quick Record
  const [activeStudentRecord, setActiveStudentRecord] = useState<Student | null>(null);

  // Active Report Modal Data
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [officialReportModalOpen, setOfficialReportModalOpen] = useState(false);
  const [selectedPlanStudent, setSelectedPlanStudent] = useState<Student | null>(null);
  const [comprehensivePlanStudent, setComprehensivePlanStudent] = useState<Student | null>(null);
  const [reportData, setReportData] = useState<{
    title: string;
    content: string;
    recipientName: string;
    recipientPhone: string;
    recipientType: any;
    reportType: any;
    studentId?: string;
    teacherId?: string;
  }>({
    title: '',
    content: '',
    recipientName: '',
    recipientPhone: '',
    recipientType: 'parent' as any,
    reportType: 'weekly' as any,
    studentId: '',
    teacherId: '',
  });

  // Attendance bulk state for today (present, late, absent)
  const [studentAttendanceMap, setStudentAttendanceMap] = useState<Record<string, 'present' | 'late' | 'absent'>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Determine strict halaqah ID based on role (Teacher is restricted to their halaqahs)


  const effectiveHalaqahId = useMemo(() => {
    if (isTeacher) {
      if (selectedHalaqahId && teacherHalaqahs.some(h => h.id === selectedHalaqahId)) {
        return selectedHalaqahId;
      }
      if (currentUser?.halaqahId && teacherHalaqahs.some(h => h.id === currentUser.halaqahId)) {
        return currentUser.halaqahId;
      }
      return teacherHalaqahs[0]?.id || '';
    }
    if (selectedHalaqahId && tenantHalaqahs.some((h) => h.id === selectedHalaqahId)) {
      return selectedHalaqahId;
    }
    return visibleHalaqahs[0]?.id || tenantHalaqahs[0]?.id || halaqahs[0]?.id || '';
  }, [isTeacher, currentUser, selectedHalaqahId, tenantHalaqahs, visibleHalaqahs, halaqahs, teacherHalaqahs]);

  // Active Halaqah and Teacher details
  const activeHalaqah = useMemo(() => {
    return halaqahs.find((h) => h.id === effectiveHalaqahId) || tenantHalaqahs[0] || halaqahs[0];
  }, [halaqahs, effectiveHalaqahId, tenantHalaqahs]);

  // Today session status calculated from halaqah weekly schedule & today prayer times
  const todaySession = useMemo(() => {
    if (!activeHalaqah) return null;
    return calculateHalaqahTodaySession(activeHalaqah, prayerTimesToday);
  }, [activeHalaqah, prayerTimesToday]);

  const activeTeacher = useMemo(() => {
    return teachers.find((t) => t.id === activeHalaqah?.teacherId) || defaultTeacher;
  }, [teachers, activeHalaqah, defaultTeacher]);

  const activeStage = useMemo(() => {
    if (!activeHalaqah) return stages[0];
    return (
      stages.find((s) => s.id === activeHalaqah.stageId) ||
      stages.find((s) => s.targetGrades?.includes(activeHalaqah.grade as any)) ||
      stages[0]
    );
  }, [activeHalaqah, stages]);

  // Filter students for current halaqah
  const halaqahStudents = students.filter((s) => s.halaqahId === activeHalaqah?.id);

  // Evaluated student list
  const evaluatedStudents = halaqahStudents.map((s) => ({
    student: s,
    eval: evaluateStudentStatus(s, sessionRecords, spellingLessons, academicConfig),
  }));

  // Smart decision support categorization
  const needingIntervention = evaluatedStudents.filter(
    (e) => e.eval.status === 'lagging' || e.eval.status === 'needs_support' || e.eval.status === 'not_moved_yet'
  );
  const advancedStudents = evaluatedStudents.filter((e) => e.eval.status === 'advanced');

  // Active halaqah nominations
  const halaqahNominations = (trackNominations || []).filter((n) =>
    halaqahStudents.some((s) => s.id === n.studentId)
  );

  // Filtered list for display
  const filteredStudents = evaluatedStudents.filter(({ student, eval: ev }) => {
    const matchesSearch =
      student.fullName.includes(searchTerm) ||
      student.currentSurah.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
    const matchesGrade = gradeFilter === 'all' || student.grade === gradeFilter;
    return matchesSearch && matchesStatus && matchesGrade;
  });

  // Cycle attendance status: present -> late -> absent -> present
  const cycleAttendance = (studentId: string) => {
    setStudentAttendanceMap((prev) => {
      const current = prev[studentId] || 'present';
      const next: 'present' | 'late' | 'absent' = current === 'present' ? 'late' : current === 'late' ? 'absent' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const handleSaveBulkAttendance = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const attendanceMap: Record<string, 'present' | 'late' | 'absent'> = {};
    halaqahStudents.forEach((s) => {
      attendanceMap[s.id] = studentAttendanceMap[s.id] || 'present';
    });
    bulkMarkAttendance(todayStr, academicConfig.currentWeek, activeHalaqah.id, attendanceMap);
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 2000);
  };

  // Open Parent Report
  const handleOpenParentReport = (student: Student) => {
    const text = generateParentWeeklyReport(
      student,
      sessionRecords,
      spellingLessons,
      halaqahs,
      teachers,
      academicConfig
    );
    setReportData({
      title: `تقرير أسبوعي – ${student.fullName}`,
      content: text,
      recipientName: `ولي أمر ${student.fullName}`,
      recipientPhone: student.parentPhone,
      recipientType: 'parent',
      reportType: 'weekly',
      studentId: student.id,
      teacherId: student.teacherId,
    });
    setReportModalOpen(true);
  };

  // Open Teacher Weekly Summary Report
  const handleOpenTeacherWeeklySummary = () => {
    if (!activeTeacher) return;
    const text = generateTeacherWeeklyReport(
      activeTeacher,
      students,
      sessionRecords,
      spellingLessons,
      academicConfig
    );
    setReportData({
      title: `التقرير الأسبوعي لمعلم الحلقة (${activeHalaqah?.name})`,
      content: text,
      recipientName: activeTeacher.name,
      recipientPhone: activeTeacher.phone,
      recipientType: 'teacher',
      reportType: 'weekly',
      teacherId: activeTeacher.id,
    });
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* NO-SESSION ALERT — first element, shown only when no halaqah is scheduled today */}
      {todaySession && !todaySession.isSessionDay && (
        <div className="rounded-xl px-3.5 py-2.5 border bg-slate-50 border-slate-200 flex items-center gap-2.5 text-xs">
          <Clock className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="font-bold text-slate-700">
            ⚪ لا توجد حلقة مجدولة اليوم ({todaySession.dayName})
          </span>
          {activeHalaqah && (
            <span className="hidden md:inline ms-auto text-[10px] text-slate-500 font-mono shrink-0">
              {formatHalaqahWeeklySummary(activeHalaqah, prayerTimesToday)}
            </span>
          )}
        </div>
      )}

      {/* Educational Stage & Halaqah Master Navigator (For Campus Admins, Supervisors & System Admins) */}
      {isLeader && (
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-black text-slate-900 leading-tight">
                  مركز التحكم بالمراحل والحلقات القرآنية
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeTenant?.name || ''} • {tenantHalaqahs.length} حلقات مسجلة • {stages.length} مراحل تعليمية
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewMode('single_halaqah')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'single_halaqah'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>عرض حلقة مفردة</span>
              </button>
              <button
                onClick={() => setViewMode('all_halaqahs')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'all_halaqahs'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>مصفوفة كافة الحلقات ({visibleHalaqahs.length})</span>
              </button>
            </div>
          </div>

          {/* Stages Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => handleSelectStage('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedStageId === 'all'
                  ? 'bg-emerald-800 text-white shadow-xs'
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
                {tenantHalaqahs.length}
              </span>
            </button>

            {stages.map((stg) => {
              const stageHalaqahsCount = tenantHalaqahs.filter((h) =>
                (h.stageId && h.stageId === stg.id) || (stg.targetGrades && stg.targetGrades.includes(h.grade as any))
              ).length;
              const isSelected = selectedStageId === stg.id;
              return (
                <button
                  key={stg.id}
                  onClick={() => handleSelectStage(stg.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-emerald-600/30'
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

          {/* Halaqah Quick Switcher Pills (in single_halaqah mode) */}
          {viewMode === 'single_halaqah' && (
            <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">الحلقات:</span>
              {visibleHalaqahs.length === 0 ? (
                <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                  لا توجد حلقات مسجلة في هذه المرحلة حالياً
                </span>
              ) : (
                visibleHalaqahs.map((h) => {
                  const isSelected = h.id === effectiveHalaqahId;
                  const teacherObj = teachers.find((t) => t.id === h.teacherId);
                  const count = students.filter((s) => s.halaqahId === h.id).length;
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedHalaqahId(h.id);
                        setViewMode('single_halaqah');
                      }}
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
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          isSelected ? 'bg-emerald-900 text-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {count} طلاب
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ALL HALAQAHS CAMPUS MATRIX VIEW */}
      {isLeader && viewMode === 'all_halaqahs' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
                  نظرة قيادية شاملة • {activeTenant?.name || ''}
                </span>
                <h2 className="text-xl md:text-2xl font-black mt-1">مصفوفة الحلقات والمراحل التعليمية</h2>
                <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
                  استعراض مباشر وموحد لكافة الحلقات القرآنية في المجمع ومتابعة نسب الإنجاز والمعلمين وحالات التدخل المبكر.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    exportStudentsToExcel(
                      students.filter((s) => !activeTenantId || s.tenantId === activeTenantId),
                      sessionRecords,
                      spellingLessons,
                      academicConfig,
                      { halaqahName: `كافة حلقات ${activeTenant?.name || 'المجمع'}` }
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>تصدير كشف شامل لكافة الحلقات (Excel)</span>
                </button>
              </div>
            </div>

            {/* Overview Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-800/60">
              <div className="bg-emerald-900/50 p-3 rounded-2xl border border-emerald-800">
                <span className="text-[11px] text-emerald-300 font-medium">إجمالي الحلقات المعروضة</span>
                <div className="text-xl font-black text-amber-300 mt-0.5">{visibleHalaqahs.length} حلقات</div>
              </div>
              <div className="bg-emerald-900/50 p-3 rounded-2xl border border-emerald-800">
                <span className="text-[11px] text-emerald-300 font-medium">إجمالي الطلاب المسجلين</span>
                <div className="text-xl font-black text-white mt-0.5">
                  {students.filter((s) => visibleHalaqahs.some((h) => h.id === s.halaqahId)).length} طالب
                </div>
              </div>
              <div className="bg-emerald-900/50 p-3 rounded-2xl border border-emerald-800">
                <span className="text-[11px] text-emerald-300 font-medium">المعلمون المشرفون</span>
                <div className="text-xl font-black text-white mt-0.5">
                  {new Set(visibleHalaqahs.map((h) => h.teacherId)).size} معلمين
                </div>
              </div>
              <div className="bg-emerald-900/50 p-3 rounded-2xl border border-emerald-800">
                <span className="text-[11px] text-emerald-300 font-medium">الأسبوع التشغيلي</span>
                <div className="text-xl font-black text-amber-300 mt-0.5">الأسبوع {academicConfig.currentWeek}</div>
              </div>
            </div>
          </div>

          {/* Cards for each halaqah in Campus Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleHalaqahs.map((h) => {
              const teacherObj = teachers.find((t) => t.id === h.teacherId);
              const hStudents = students.filter((s) => s.halaqahId === h.id);
              const hStage = stages.find((st) => st.targetGrades?.includes(h.grade as any)) || stages[0];
              const evals = hStudents.map((s) =>
                evaluateStudentStatus(s, sessionRecords, spellingLessons, academicConfig)
              );
              const laggingCount = evals.filter(
                (e) => e.status === 'lagging' || e.status === 'needs_support'
              ).length;
              const advancedCount = evals.filter((e) => e.status === 'advanced').length;
              const avgAttendance =
                hStudents.length > 0
                  ? Math.round(evals.reduce((acc, cur) => acc + cur.attendanceRate, 0) / hStudents.length)
                  : 0;

              return (
                <div
                  key={h.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-amber-300 font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                          {h?.name?.charAt(0) || 'ح'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {hStage?.name || 'مرحلة تعليمية'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {h.grade}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-slate-900 mt-1">{h.name}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Teacher info */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-700" />
                        <div>
                          <span className="text-slate-500 text-[11px] block">المعلم المشرف:</span>
                          <strong className="text-slate-900 font-bold">{teacherObj?.name || 'غير محدد'}</strong>
                        </div>
                      </div>
                      {teacherObj?.phone && (
                        <a
                          href={`tel:${teacherObj.phone}`}
                          className="p-1.5 rounded-lg bg-white text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                          title={`اتصال بالمعلم: ${teacherObj.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">الطلاب</span>
                        <strong className="text-xs font-black text-slate-900 font-mono">{hStudents.length}</strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">نسبة الحضور</span>
                        <strong className="text-xs font-black text-emerald-800 font-mono">{avgAttendance}%</strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">يحتاج دعم</span>
                        <strong
                          className={`text-xs font-black font-mono ${
                            laggingCount > 0 ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {laggingCount}
                        </strong>
                      </div>
                    </div>

                    {/* Target surah */}
                    <p className="text-[11px] text-slate-600 mt-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        المخرج المستهدف: <strong className="text-slate-900">{h.targetSurah || 'سورة الغاشية'}</strong>
                      </span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedHalaqahId(h.id);
                        setViewMode('single_halaqah');
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>فتح سجل وتسميع الحلقة</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-300 rotate-180" />
                    </button>
                    <button
                      onClick={() =>
                        exportStudentsToExcel(hStudents, sessionRecords, spellingLessons, academicConfig, {
                          halaqahName: h.name,
                        })
                      }
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                      title="تصدير بيانات الحلقة Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SINGLE HALAQAH VIEW */
        <>
          {/* UNIFIED HALAQAH CONTAINER — identity + 4-day strip + session line + 6 tools */}
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-xs space-y-4">
            {/* Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                {activeHalaqah?.name?.charAt(0) || 'ح'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="text-lg md:text-xl font-black text-slate-900">{activeHalaqah?.name}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {activeStage?.name || 'مرحلة تعليمية'} • {activeHalaqah?.grade}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  المعلم المشرف: <strong className="text-slate-800">{activeTeacher?.name}</strong>
                </p>
                <p className="hidden sm:block text-xs text-slate-600 mt-0.5">
                  الهدف المرجعي:{' '}
                  <strong className="text-emerald-800 font-semibold">
                    {getAcademicOutcome({ tenant: activeTenant, customTargetSurah: activeHalaqah?.targetSurah })}
                  </strong>{' '}
                  • {halaqahStudents.length} طالبًا مسجلًا
                </p>
              </div>
            </div>

            {/* Compact 4-day strip + scheduled-session line + week */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px]">
              <span className="text-slate-600 truncate">
                <strong className="text-emerald-800">
                  {isSpellingActive ? 'نظام الـ4 أيام' : 'الخطة القرآنية'}:
                </strong>{' '}
                {isSpellingActive
                  ? 'يوم هجاء مخصص + تسميع المحفوظ مع 10 دقائق هجاء يومية'
                  : 'حفظ جديد ومراجعة يومية وفق خطة المجمع الأكاديمية'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {todaySession?.isSessionDay && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Clock className="w-3 h-3" />
                    {todaySession.startTimeFormatted} - {todaySession.endTimeFormatted}
                    {todaySession.attendanceWindowOpen && ' • نافذة الرصد مفتوحة'}
                  </span>
                )}
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  أسبوع {academicConfig.currentWeek}
                </span>
              </div>
            </div>

            {/* HALAQAH TOOLS GRID — 6 tools only */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setAttendanceModalOpen(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-white hover:shadow-xs transition-all text-right cursor-pointer"
                title="رصد حضور طلاب الحلقة لجلسة اليوم وحفظ الكشف"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  <span className="hidden sm:inline">تحضير الطلاب</span>
                  <span className="sm:hidden">التحضير</span>
                </span>
              </button>

              <button
                onClick={() => setInterventionModalOpen(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-white hover:shadow-xs transition-all text-right cursor-pointer"
                title="المساعد الذكي اليومي — الطلاب الذين يحتاجون اهتمامك اليوم"
              >
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  <span className="hidden sm:inline">من يحتاجني اليوم؟</span>
                  <span className="sm:hidden">من يحتاجني؟</span>
                </span>
                {needingIntervention.length > 0 && (
                  <span className="ms-auto bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {needingIntervention.length}
                  </span>
                )}
              </button>

              {isBadgesActive && (
                <button
                  onClick={() => setBadgesModalOpen(true)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-white hover:shadow-xs transition-all text-right cursor-pointer"
                  title="إدارة ومنح وتتويج أوسمة الهجاء والحفظ للطلاب"
                >
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    <span className="hidden sm:inline">الأوسمة والحوافز</span>
                    <span className="sm:hidden">الأوسمة</span>
                  </span>
                  {badges.filter((b) => halaqahStudents.some((s) => s.id === b.studentId)).length > 0 && (
                    <span className="ms-auto bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {badges.filter((b) => halaqahStudents.some((s) => s.id === b.studentId)).length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedNominationStudent(null);
                  setTrackNominationModalOpen(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-400 hover:bg-white hover:shadow-xs transition-all text-right cursor-pointer"
                title="ترشيح طلاب الحلقة لاختبارات المسارات والجمعية المعتمدة"
              >
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  <span className="hidden sm:inline">ترشيحات المسارات</span>
                  <span className="sm:hidden">الترشيحات</span>
                </span>
                {halaqahNominations.length > 0 && (
                  <span className="ms-auto bg-teal-100 text-teal-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {halaqahNominations.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setReportsModalOpen(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 hover:bg-white hover:shadow-xs transition-all text-right cursor-pointer"
                title="تصدير وطباعة وإرسال تقارير وكشوف الحلقة"
              >
                <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  <span className="hidden sm:inline">التقارير والكشوف</span>
                  <span className="sm:hidden">التقارير</span>
                </span>
              </button>

              <button
                onClick={() => setVirtualModalOpen(true)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-white hover:shadow-xs transition-all text-right cursor-pointer"
                title="الغرفة الافتراضية للحلقة — رابط Meet / Zoom / Teams وبدء البث"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  <span className="hidden sm:inline">الحلقة الافتراضية</span>
                  <span className="sm:hidden">الافتراضية</span>
                </span>
              </button>
            </div>
          </div>

          {/* STUDENTS ROSTER TOOLBAR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث باسم الطالب أو السورة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pr-9 pl-4 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium"
              >
                <option value="all">جميع الحالات الأكاديمية</option>
                <option value="advanced">متقدم ومتميز</option>
                <option value="on_track">مطابق للخطة</option>
                <option value="needs_support">يحتاج دعم</option>
                <option value="lagging">متعثر</option>
              </select>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium"
              >
                <option value="all">جميع الصفوف</option>
                <option value="تمهيدي">تمهيدي</option>
                <option value="صف أول">صف أول</option>
                <option value="صف ثاني">صف ثاني</option>
              </select>
            </div>
          </div>

          {/* STUDENTS CARDS / GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(({ student, eval: ev }) => {
              const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);
              const studentTrackIds =
                halaqahs.find((h) => h.id === student.halaqahId)?.activeTrackIds ||
                ['track_quran', 'track_spelling', 'track_virtues'];
              const studentSpellingEnabled = studentTrackIds.includes('track_spelling');
              const studentQuranEnabled = studentTrackIds.includes('track_quran');
              // Dynamic tracks: every enabled track without a builtin section gets its own row
              const studentCustomTrackIds = studentTrackIds.filter(
                (tid) => !['track_quran', 'track_spelling'].includes(tid)
              );
              const latestRevisionScore = sessionRecords
                .filter(
                  (r) => r.studentId === student.id && r.revision && typeof r.revision.score === 'number'
                )
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.revision?.score;
              const studentPlan = getActiveStudentQuranPlan(student.id);
              const hasPlan = !!studentPlan;
              const studentNomination = (trackNominations || []).find((n) => n.studentId === student.id);

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {(student.fullName || student.name || 'ط').charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{student.fullName}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-700 font-medium">{student.grade}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-emerald-800 font-semibold">
                              الهدف: {student.minimumTargetSurah}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                      <span className="text-[11px] text-slate-700 font-mono">حضور: {ev.attendanceRate}%</span>
                    </div>

                    {/* Track Nomination Pill if exists */}
                    {studentNomination && (
                      <div className="mt-2.5 px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px] flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-teal-600" />
                          <span>
                            {studentNomination.trackName || 'المسار'}: {studentNomination.targetBranchOrLevel}
                          </span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white border border-teal-200 text-teal-800">
                          {studentNomination.status === 'approved_for_association'
                            ? 'معتمد'
                            : studentNomination.status === 'association_completed'
                            ? 'اجتاز 🎉'
                            : 'قيد التدقيق'}
                        </span>
                      </div>
                    )}

                    {/* Progress Indicators Bar */}
                    <div className="mt-4 space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      {/* Spelling Progress — module + halaqah track gated */}
                      {isSpellingActive && studentSpellingEnabled && (
                        <div>
                          <div className="flex items-center justify-between text-slate-700 mb-1">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>الهجاء: {currentLesson ? `الدرس ${currentLesson.lessonNumber}` : 'مسار الهجاء'}</span>
                            </span>
                            <span className="font-black text-emerald-800">{ev.spellingMasteryRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${ev.spellingMasteryRate}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Quran Progress — halaqah track gated, split: memorization + revision */}
                      {studentQuranEnabled && (
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between text-slate-700 mb-1">
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                <span>الحفظ: سورة {student.currentSurah}</span>
                              </span>
                              <span className="font-black text-blue-800">{ev.memorizationProgressRate}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, ev.memorizationProgressRate)}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-slate-700 mb-1">
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                <span>المراجعة</span>
                              </span>
                              <span className="font-black text-amber-800">
                                {latestRevisionScore !== undefined ? `${latestRevisionScore}%` : '—'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, latestRevisionScore || 0)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dynamic enabled tracks — one row per track, latest recorded score */}
                      {studentCustomTrackIds.map((tid) => {
                        const trackDef = tracks.find((tr) => tr.id === tid);
                        const latestScore = sessionRecords
                          .filter(
                            (r) =>
                              r.studentId === student.id &&
                              r.customTracks?.[tid] &&
                              typeof r.customTracks[tid].score === 'number'
                          )
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() - new Date(a.date).getTime()
                          )[0]?.customTracks?.[tid]?.score;
                        const label = (trackDef?.name || tid).replace(/^مسار\s*/, '');
                        return (
                          <div key={tid}>
                            <div className="flex items-center justify-between text-slate-700 mb-1">
                              <span className="flex items-center gap-1 font-semibold text-slate-800">
                                <Layers className="w-3.5 h-3.5 text-violet-600" />
                                <span>{label}</span>
                              </span>
                              <span className="font-black text-violet-800">
                                {latestScore !== undefined ? `${latestScore}%` : '—'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-violet-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, latestScore || 0)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Evaluation Reason Note */}
                    <p className="text-[11px] text-slate-700 mt-2.5 leading-relaxed bg-white px-2 py-1 rounded-md border border-slate-100">
                      {ev.reason}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setActiveStudentRecord(student)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>تسجيل إنجاز 📝</span>
                    </button>

                    <button
                      onClick={() => setSelectedPlanStudent(student)}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${
                        hasPlan
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                      title={
                        hasPlan
                          ? 'الخطة القرآنية العامة (ورد اليوم، الأسبوع، الشهر، الفصل)'
                          : 'يحتاج تحديد نقطة البداية'
                      }
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>الخطة القرآنية</span>
                      {!hasPlan && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                    </button>

                    <button
                      onClick={() => setComprehensivePlanStudent(student)}
                      className="inline-flex items-center justify-center p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs border border-indigo-200 transition-colors cursor-pointer"
                      title="عرض الخطة القرآنية الشاملة (من البداية إلى المستهدف)"
                    >
                      <Layers className="w-4 h-4 text-indigo-700" />
                    </button>

                    <button
                      onClick={() => handleOpenParentReport(student)}
                      className="inline-flex items-center justify-center p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs border border-emerald-200 transition-colors cursor-pointer"
                      title="إرسال تقرير الواتساب لولي الأمر"
                    >
                      <Send className="w-4 h-4 text-emerald-700" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedNominationStudent(student);
                        setTrackNominationModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center p-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs border border-teal-200 transition-colors cursor-pointer"
                      title="ترشيح الطالب لاختبار المسار المعتمد"
                    >
                      <Award className="w-4 h-4 text-teal-700" />
                    </button>

                    {onSelectStudentProfile && (
                      <button
                        onClick={() => onSelectStudentProfile(student.id)}
                        className="inline-flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
                        title="عرض السجل التاريخي الشامل للطالب"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Quick Record Modal */}
      {activeStudentRecord && (
        <QuickRecordModal
          isOpen={Boolean(activeStudentRecord)}
          onClose={() => setActiveStudentRecord(null)}
          student={activeStudentRecord}
          onOpenReportModal={(content, phone, name, studentId) => {
            setReportData({
              title: `تقرير إنجاز – ${name}`,
              content,
              recipientName: `ولي أمر ${name}`,
              recipientPhone: phone,
              recipientType: 'parent',
              reportType: 'weekly',
              studentId,
              teacherId: activeTeacher?.id,
            });
            setReportModalOpen(true);
          }}
        />
      )}

      {/* Report Dispatch Modal */}
      <ReportDispatchModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={reportData.title}
        reportContent={reportData.content}
        recipientName={reportData.recipientName}
        recipientPhone={reportData.recipientPhone}
        recipientType={reportData.recipientType}
        reportType={reportData.reportType}
        studentId={reportData.studentId}
        teacherId={reportData.teacherId}
      />

      {/* Official Certified Printable Report Modal */}
      <OfficialPrintableReportModal
        isOpen={officialReportModalOpen}
        onClose={() => setOfficialReportModalOpen(false)}
        students={halaqahStudents}
        records={sessionRecords}
        spellingLessons={spellingLessons}
        academicConfig={academicConfig}
        halaqah={activeHalaqah}
        teacher={activeTeacher}
        mosqueLogoUrl={mosqueLogoUrl}
        stageLogoUrl={stageLogoUrl}
      />

      {/* P2: Badges and Incentives Modal */}
      <BadgesManagementModal
        isOpen={badgesModalOpen}
        onClose={() => setBadgesModalOpen(false)}
        halaqahId={activeHalaqah?.id}
      />

      {/* Individual Quran Plan Modal */}
      {comprehensivePlanStudent && (
        <ComprehensiveQuranPlanModal
          student={comprehensivePlanStudent}
          variant="teacher"
          onClose={() => setComprehensivePlanStudent(null)}
        />
      )}

      <StudentQuranPlanModal
        isOpen={Boolean(selectedPlanStudent)}
        student={selectedPlanStudent}
        onClose={() => setSelectedPlanStudent(null)}
      />

      {/* Track Nomination Modal for Teacher */}
      <TeacherTrackNominationModal
        isOpen={trackNominationModalOpen}
        onClose={() => {
          setTrackNominationModalOpen(false);
          setSelectedNominationStudent(null);
        }}
        preSelectedStudent={selectedNominationStudent}
        halaqahId={activeHalaqah?.id || ''}
      />

      {/* Tool Modals — same widgets/components, presented in light modals */}
      {virtualModalOpen && activeHalaqah && (
        <ToolModal
          title="الغرفة الافتراضية للحلقة"
          icon={<Video className="w-5 h-5 text-emerald-700" />}
          onClose={() => setVirtualModalOpen(false)}
          wide
        >
          <OnlineModeTeacherWidget halaqah={activeHalaqah} students={halaqahStudents} />
        </ToolModal>
      )}

      {attendanceModalOpen && (
        <ToolModal
          title="رصد حضور الطلاب"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
          onClose={() => setAttendanceModalOpen(false)}
          wide
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              الافتراضي: جميع الطلاب حاضرون. انقر على اسم الطالب لتبديل حالته (حاضر ← متأخر ← غائب) ثم احفظ.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {halaqahStudents.map((s) => {
                const status = studentAttendanceMap[s.id] || 'present';
                return (
                  <button
                    key={s.id}
                    onClick={() => cycleAttendance(s.id)}
                    className={`text-xs px-2.5 py-2 rounded-xl border font-bold transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 h-14 w-full ${
                      status === 'absent'
                        ? 'bg-rose-100 border-rose-400 text-rose-800 line-through'
                        : status === 'late'
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <span className="truncate max-w-full leading-tight">{s.fullName.split(' ')[0]} {s.fullName.split(' ')[1] || ''}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 font-mono shrink-0">
                      {status === 'absent' ? 'غائب ✕' : status === 'late' ? 'متأخر ⏱️' : 'حاضر ✓'}
                    </span>
                  </button>
                );
              })}

            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveBulkAttendance}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {attendanceSaved ? 'تم الحفظ بنجاح ✓' : 'حفظ كشف الحضور'}
              </button>
            </div>
          </div>
        </ToolModal>
      )}

      {interventionModalOpen && (
        <ToolModal
          title="من يحتاجني اليوم؟"
          icon={<Sparkles className="w-5 h-5 text-amber-600" />}
          onClose={() => setInterventionModalOpen(false)}
          wide
        >
            {needingIntervention.length === 0 ? (
              <div className="text-xs text-emerald-800 font-bold bg-white/80 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>ما شاء الله! جميع طلاب الحلقة يسيرون بوتيرة ممتازة ومطابقة للخطة المقررة.</span>
              </div>
            ) : (
              <>
              {/* Mobile: vertical cards (no horizontal scroll) */}
              <div className="md:hidden space-y-3">
                {needingIntervention.map(({ student, eval: ev }, idx) => (
                  <div
                    key={student.id}
                    className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate">
                            {student.fullName}
                          </span>
                          <span className="text-[11px] text-slate-500">{student.grade}</span>
                        </div>
                      </div>
                      <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{ev.reason}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {isHalaqahTrackEnabled(student.halaqahId, 'track_spelling') && (
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 font-mono">
                          الهجاء: {ev.spellingMasteryRate}% (درس {ev.actualLessonNum})
                        </span>
                      )}
                      <button
                        onClick={() => setActiveStudentRecord(student)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs whitespace-nowrap inline-flex items-center gap-1"
                      >
                        <span>جلسة دعم</span>
                        <span>📝</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table layout */}
              <div className="hidden md:block bg-white rounded-xl border border-amber-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-amber-100/60 border-b border-amber-200 text-amber-950 font-bold">
                      <tr>
                        <th className="p-3 w-16 text-center">الأولوية</th>
                        <th className="p-3 min-w-[160px]">اسم الطالب والصف</th>
                        <th className="p-3 min-w-[260px]">سبب الاحتياج والتشخيص التربوي</th>
                        <th className="p-3 w-32 text-center">مستوى الهجاء</th>
                        <th className="p-3 w-32 text-center">الحالة</th>
                        <th className="p-3 w-28 text-center">الإجراء المباشر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {needingIntervention.map(({ student, eval: ev }, idx) => (
                        <tr
                          key={student.id}
                          className="hover:bg-amber-50/50 transition-colors"
                        >
                          <td className="p-3 text-center align-middle">
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3 align-middle">
                            <span className="font-bold text-slate-900 block text-xs">
                              {student.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {student.grade}
                            </span>
                          </td>
                          <td className="p-3 align-middle text-slate-700 text-xs">
                            {ev.reason}
                          </td>
                          <td className="p-3 text-center align-middle">
                            {isHalaqahTrackEnabled(student.halaqahId, 'track_spelling') ? (
                              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block font-mono">
                                {ev.spellingMasteryRate}% (درس {ev.actualLessonNum})
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center align-middle">
                            <StatusBadge status={ev.status} label={ev.statusLabel} size="sm" />
                          </td>
                          <td className="p-3 text-center align-middle">
                            <button
                              onClick={() => setActiveStudentRecord(student)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs whitespace-nowrap inline-flex items-center gap-1"
                            >
                              <span>جلسة دعم</span>
                              <span>📝</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
            )}
        </ToolModal>
      )}

      {reportsModalOpen && (
        <ToolModal
          title="التقارير والكشوف"
          icon={<Printer className="w-5 h-5 text-slate-700" />}
          onClose={() => setReportsModalOpen(false)}
        >
          <div className="space-y-2.5">
            <button
              onClick={() => {
                setReportsModalOpen(false);
                exportStudentsToExcel(halaqahStudents, sessionRecords, spellingLessons, academicConfig, {
                  halaqahName: activeHalaqah?.name,
                });
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all text-right cursor-pointer"
            >
              <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900">تصدير كشف Excel</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">تصدير بيانات الحلقة في ملف إكسل رسمي</span>
              </span>
            </button>

            <button
              onClick={() => {
                setReportsModalOpen(false);
                setOfficialReportModalOpen(true);
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-right cursor-pointer"
            >
              <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900">طباعة كشف معتمد (PDF)</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">معاينة وطباعة تقرير بالأختام والشعارات الرسمية</span>
              </span>
            </button>

            <button
              onClick={() => {
                setReportsModalOpen(false);
                handleOpenTeacherWeeklySummary();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all text-right cursor-pointer"
            >
              <span className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Send className="w-4 h-4 text-amber-300" />
              </span>
              <span>
                <span className="block text-xs font-bold text-slate-900">تقرير المعلم الأسبوعي</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">توليد وإرسال التقرير الأسبوعي عبر واتساب</span>
              </span>
            </button>
          </div>
        </ToolModal>
      )}
    </div>
  );
};

