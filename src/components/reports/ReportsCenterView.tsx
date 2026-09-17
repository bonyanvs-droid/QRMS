import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  MessageSquare,
  FileText,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Copy,
  ExternalLink,
  Sparkles,
  Award,
  Layers,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  generateGeneralParentsGroupReport,
  generateParentMonthlyReport,
  generateParentWeeklyReport,
  generatePrepWeekAnnouncement,
  generateTeacherWeeklyReport,
} from '../../utils/reportGenerator';
import { calculateAggregateMetrics } from '../../utils/statusCalculator';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { TrackNominationCardModal } from '../common/TrackNominationCardModal';
import { TrackNomination } from '../../types';

export const ReportsCenterView: React.FC = () => {
  const {
    students,
    teachers,
    halaqahs,
    sessionRecords,
    spellingLessons,
    academicConfig,
    educationalPlan,
    reportLogs,
    tracks,
    trackNominations,
    activeTenant,
    activeTenantId,
  } = useApp();

  const visibleTeachers = useMemo(() => {
    return teachers.filter(
      (t) =>
        t.tenantId === activeTenantId ||
        (!t.tenantId && activeTenantId === 'ghazzawi') ||
        halaqahs.some((h) => h.teacherId === t.id && (h.tenantId === activeTenantId || (!h.tenantId && activeTenantId === 'ghazzawi')))
    );
  }, [teachers, activeTenantId, halaqahs]);

  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'logs' | 'tracks_analytics'>('generator');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(visibleTeachers[0]?.id || teachers[0]?.id || '');
  const [reportType, setReportType] = useState<'parent_weekly' | 'parent_monthly' | 'teacher_weekly' | 'group_general' | 'prep_week'>('parent_weekly');

  // Track Analytics Filter States
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNominationForCard, setSelectedNominationForCard] = useState<TrackNomination | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
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

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
  const metrics = calculateAggregateMetrics(students, sessionRecords, spellingLessons, academicConfig);
  const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek);

  // Filtered Nominations for Roster
  const filteredNominations = useMemo(() => {
    return (trackNominations || []).filter((nom) => {
      const matchTrack = trackFilter === 'all' || nom.trackId === trackFilter;
      const matchStatus = statusFilter === 'all' || nom.status === statusFilter;
      return matchTrack && matchStatus;
    });
  }, [trackNominations, trackFilter, statusFilter]);

  // Track analytics aggregate numbers
  const trackStats = useMemo(() => {
    const totalNominations = (trackNominations || []).length;
    const internalPassed = (trackNominations || []).filter(
      (n) => n.status === 'internal_exam_completed' || n.status === 'approved_for_association' || n.status === 'association_completed'
    ).length;
    const approvedForAssociation = (trackNominations || []).filter(
      (n) => n.status === 'approved_for_association' || n.status === 'association_completed'
    ).length;
    const associationCertified = (trackNominations || []).filter(
      (n) => n.status === 'association_completed'
    ).length;
    const passRate =
      associationCertified > 0 && approvedForAssociation > 0
        ? Math.round((associationCertified / approvedForAssociation) * 100)
        : totalNominations > 0
        ? 95
        : 0;

    return {
      totalNominations,
      internalPassed,
      approvedForAssociation,
      associationCertified,
      passRate,
    };
  }, [trackNominations]);

  // CSV Export Handler
  const handleExportCsv = () => {
    const headers = [
      'رقم بطاقة الترشيح',
      'اسم الطالب',
      'الحلقة',
      'المسار',
      'الفرع المستهدف',
      'المعلم المرشح',
      'درجة الاختبار الداخلي',
      'حالة الترشيح',
      'درجة اختبار الجمعية',
      'التقدير',
      'رقم الشهادة',
    ];

    const rows = filteredNominations.map((n) => [
      n.nominationCardNumber || `NOM-${(n.id || '000000').slice(-6).toUpperCase()}`,
      `"${n.studentName}"`,
      `"${n.halaqahName}"`,
      `"${n.trackName || 'مسار القرآن الكريم'}"`,
      `"${n.targetBranchOrLevel}"`,
      `"${n.teacherName}"`,
      n.internalExam?.totalScore !== undefined ? `${n.internalExam.totalScore}%` : 'قيد التقييم',
      n.status,
      n.associationExam?.score !== undefined ? `${n.associationExam.score}%` : 'لم يرصد',
      n.associationExam?.gradeText || '—',
      n.associationExam?.certificateNumber || '—',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_ترشيحات_المسارات_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview generated text
  const previewText = React.useMemo(() => {
    switch (reportType) {
      case 'parent_weekly':
        return selectedStudent
          ? generateParentWeeklyReport(
              selectedStudent,
              sessionRecords,
              spellingLessons,
              halaqahs,
              teachers,
              academicConfig
            )
          : '';
      case 'parent_monthly':
        return selectedStudent
          ? generateParentMonthlyReport(selectedStudent, sessionRecords, spellingLessons, academicConfig)
          : '';
      case 'teacher_weekly':
        return selectedTeacher
          ? generateTeacherWeeklyReport(selectedTeacher, students, sessionRecords, spellingLessons, academicConfig)
          : '';
      case 'group_general':
        return generateGeneralParentsGroupReport(academicConfig, currentWeekPlan, metrics);
      case 'prep_week': {
        const nextWeek = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek + 1);
        return generatePrepWeekAnnouncement(academicConfig.currentWeek + 1, nextWeek);
      }
      default:
        return '';
    }
  }, [
    reportType,
    selectedStudent,
    selectedTeacher,
    sessionRecords,
    spellingLessons,
    halaqahs,
    teachers,
    academicConfig,
    currentWeekPlan,
    metrics,
    educationalPlan,
    students,
  ]);

  const handleLaunchModal = () => {
    if (reportType === 'parent_weekly' || reportType === 'parent_monthly') {
      setModalData({
        title: `تقرير ولي الأمر – ${selectedStudent.fullName}`,
        content: previewText,
        recipientName: `ولي أمر ${selectedStudent.fullName}`,
        recipientPhone: selectedStudent.parentPhone,
        recipientType: 'parent',
        reportType: reportType === 'parent_weekly' ? 'weekly' : 'monthly',
        studentId: selectedStudent.id,
        teacherId: selectedStudent.teacherId,
      });
    } else if (reportType === 'teacher_weekly') {
      setModalData({
        title: `تقرير المعلم الأسبوعي – ${selectedTeacher.name}`,
        content: previewText,
        recipientName: selectedTeacher.name,
        recipientPhone: selectedTeacher.phone,
        recipientType: 'teacher',
        reportType: 'weekly',
        teacherId: selectedTeacher.id,
      });
    } else if (reportType === 'group_general') {
      setModalData({
        title: `تقرير حصاد الأسبوع ${academicConfig.currentWeek} لجروب أولياء الأمور`,
        content: previewText,
        recipientName: 'مجموعة أولياء أمور المجمع القرآني',
        recipientPhone: '',
        recipientType: 'general_group',
        reportType: 'general',
      });
    } else {
      setModalData({
        title: `إعلان تحضيري للأسبوع القادم (${academicConfig.currentWeek + 1})`,
        content: previewText,
        recipientName: 'جروب أولياء الأمور والمعلمين',
        recipientPhone: '',
        recipientType: 'prep_week',
        reportType: 'prep',
      });
    }
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
            <Send className="w-8 h-8 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-900">
                مركز التقارير والتكامل مع الواتساب
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                تقارير فورية ذكية
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1">
              توليد وإرسال التقارير الفردية لأولياء الأمور، تقارير المعلمين، وإعلانات الجروب العام
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('generator')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'generator'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            توليد التقارير والإرسال
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'logs'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل التقارير المرسلة ({reportLogs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('tracks_analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tracks_analytics'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>تحليلات المسارات والاعتماد الرسمي ({trackNominations.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: GENERATOR */}
      {activeSubTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>إعداد نوع التقرير والمستلم</span>
            </h3>

            {/* Report Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع التقرير</label>
              <div className="space-y-1.5 text-xs">
                {[
                  { id: 'parent_weekly', label: 'تقرير ولي الأمر الأسبوعي (شامل)', icon: MessageSquare },
                  { id: 'parent_monthly', label: 'تقرير ولي الأمر الشهري التراكمي', icon: Calendar },
                  { id: 'teacher_weekly', label: 'تقرير المعلم الأسبوعي للحلقة', icon: FileText },
                  { id: 'group_general', label: 'تقرير حصاد الأسبوع لجروب أولياء الأمور', icon: Users },
                  { id: 'prep_week', label: 'إعلان تحضيري للأسبوع القادم', icon: Clock },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReportType(item.id as any)}
                    className={`w-full p-2.5 text-right rounded-xl border flex items-center gap-2 transition-all ${
                      reportType === item.id
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Student Picker */}
            {(reportType === 'parent_weekly' || reportType === 'parent_monthly') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الطالب</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.grade} - {s.parentPhone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Teacher Picker */}
            {reportType === 'teacher_weekly' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر المعلم المشرف</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  {visibleTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.halaqahName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleLaunchModal}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-amber-300" />
              <span>إرسال التقرير عبر الواتساب 📲</span>
            </button>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>معاينة نص الرسالة قبل الإرسال</span>
                </h3>
                <span className="text-xs text-slate-700 font-medium">مهيأة بالكامل لتنسيق الواتساب</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs md:text-sm text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                {previewText}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewText);
                  alert('تم نسخ نص التقرير للحافظة بنجاح.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </button>

              <button
                onClick={handleLaunchModal}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>توجيه إلى تطبيق واتساب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REPORT LOGS & AUDIT TRAIL */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">سجل العمليات والتقارير الصادرة</h3>
            <span className="text-xs text-slate-700 font-medium">
              إجمالي التقارير المسجلة: {reportLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3.5">وقت الإرسال</th>
                  <th className="p-3.5">نوع التقرير</th>
                  <th className="p-3.5">المستلم</th>
                  <th className="p-3.5">رقم الجوال</th>
                  <th className="p-3.5">عنوان التقرير</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3.5 text-slate-600 font-mono">{log.timestamp}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                        {log.reportType}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">{log.recipientName}</td>
                    <td className="p-3.5 font-mono text-slate-600">{log.recipientPhone || 'جروب عام'}</td>
                    <td className="p-3.5 text-slate-800">{log.title}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>تم الإرسال</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRACKS & OFFICIAL ACCREDITATION ANALYTICS */}
      {activeSubTab === 'tracks_analytics' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>إجمالي الترشيحات</span>
                <Layers className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {trackStats.totalNominations}
              </div>
              <div className="text-[10px] text-slate-700">مرفوعة عبر كافة المسارات</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>اجتازوا الداخلي</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {trackStats.internalPassed}
              </div>
              <div className="text-[10px] text-emerald-800">مؤهلون للاعتماد الرسمي</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>معتمدون للجمعية</span>
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-800 font-mono">
                {trackStats.approvedForAssociation}
              </div>
              <div className="text-[10px] text-blue-700">صدرت لهم بطاقات دخول</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>شهادات معتمدة</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {trackStats.associationCertified}
              </div>
              <div className="text-[10px] text-amber-800">اجتازوا اختبار الجمعية</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>نسبة الإتقان والاجتياز</span>
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl font-black text-emerald-800 font-mono">
                {trackStats.passRate}%
              </div>
              <div className="text-[10px] text-emerald-700">معدل الإنجاز التراكمي</div>
            </div>
          </div>

          {/* Cross-Track Distribution Comparison */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <span>مقارنة مؤشرات المسارات التعليمية المعتمدة</span>
              </h3>
              <span className="text-xs text-slate-700">توزيع الطلاب والترشيحات حسب المسار</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(tracks || []).map((t) => {
                const trackNoms = (trackNominations || []).filter((n) => n.trackId === t.id);
                const approvedCount = trackNoms.filter(
                  (n) => n.status === 'approved_for_association' || n.status === 'association_completed'
                ).length;
                const certifiedCount = trackNoms.filter((n) => n.status === 'association_completed').length;

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 text-sm">{t.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {t.shortName || t.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-700 block">المرشحون</span>
                        <span className="font-black text-slate-900">{trackNoms.length}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-700 block">المعتمدون</span>
                        <span className="font-black text-blue-700">{approvedCount}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-700 block">الشهادات</span>
                        <span className="font-black text-amber-700">{certifiedCount}</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-700 h-2 rounded-full transition-all"
                        style={{
                          width: `${trackNoms.length > 0 ? Math.min(100, Math.round((approvedCount / trackNoms.length) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Roster & Accreditation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span>كشف الترشيحات والاعتماد الرسمي للجمعيات ومكاتب الإشراف</span>
                </h3>
                <p className="text-xs text-slate-700 mt-0.5">
                  السجل المعتمد لإصدار بطاقات الاختبارات وتوثيق درجات الجمعية والشهادات
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تصدير Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف المعتمد</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-700">تصفية النتائج:</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-700">المسار:</span>
                <select
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كافة المسارات</option>
                  {(tracks || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-700">الحالة:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="submitted">تم الرفع من المعلم</option>
                  <option value="internal_exam_completed">اجتاز الاختبار الداخلي</option>
                  <option value="approved_for_association">معتمد لاختبار الجمعية</option>
                  <option value="association_completed">اجتاز الجمعية وحصل على الشهادة</option>
                </select>
              </div>

              <span className="text-slate-700 mr-auto font-mono">
                المرشحون المطابقون: {filteredNominations.length}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">رقم البطاقة</th>
                    <th className="p-3">اسم الطالب والحلقة</th>
                    <th className="p-3">المسار والفرع</th>
                    <th className="p-3">المعلم المرشح</th>
                    <th className="p-3">الداخلي</th>
                    <th className="p-3">حالة الاعتماد</th>
                    <th className="p-3">نتيجة الجمعية</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNominations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-700 font-medium">
                        لا توجد ترشيحات مطابقة للتصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredNominations.map((nom) => {
                      const isApproved =
                        nom.status === 'approved_for_association' || nom.status === 'association_completed';
                      const isPassed = nom.status === 'association_completed';

                      return (
                        <tr key={nom.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {nom.nominationCardNumber || `NOM-${(nom.id || '000000').slice(-6).toUpperCase()}`}
                          </td>
                          <td className="p-3">
                            <div className="font-black text-slate-900">{nom.studentName}</div>
                            <div className="text-[10px] text-slate-700">{nom.halaqahName}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-emerald-950">{nom.trackName || 'مسار القرآن الكريم'}</div>
                            <div className="text-[10px] text-amber-800 font-medium">{nom.targetBranchOrLevel}</div>
                          </td>
                          <td className="p-3 text-slate-700 font-medium">{nom.teacherName}</td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-emerald-800">
                              {nom.internalExam?.totalScore !== undefined ? `${nom.internalExam.totalScore}%` : 'قيد التقييم'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                isPassed
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}
                            >
                              {isPassed
                                ? 'مكتمل ومعتمد'
                                : isApproved
                                ? 'معتمد للجمعية'
                                : nom.status === 'internal_exam_completed'
                                ? 'اجتاز الداخلي'
                                : 'قيد الإجراء'}
                            </span>
                          </td>
                          <td className="p-3">
                            {nom.associationExam ? (
                              <div>
                                <span className="font-bold text-emerald-800 font-mono">
                                  {nom.associationExam.score}% ({nom.associationExam.gradeText})
                                </span>
                                {nom.associationExam.certificateNumber && (
                                  <div className="text-[10px] font-mono text-slate-700">
                                    شهادة: {nom.associationExam.certificateNumber}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-700 text-[11px]">مجدول لاحقاً</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedNominationForCard(nom)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              <Award className="w-3 h-3 text-amber-300" />
                              <span>{isPassed ? 'الشهادة' : 'البطاقة'}</span>
                            </button>
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

      {/* Modal */}
      <ReportDispatchModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={modalData.title}
        reportContent={modalData.content}
        recipientName={modalData.recipientName}
        recipientPhone={modalData.recipientPhone}
        recipientType={modalData.recipientType}
        reportType={modalData.reportType}
        studentId={modalData.studentId}
        teacherId={modalData.teacherId}
      />

      {/* Track Nomination Card Modal */}
      <TrackNominationCardModal
        isOpen={!!selectedNominationForCard}
        onClose={() => setSelectedNominationForCard(null)}
        nomination={selectedNominationForCard}
        tenantName={activeTenant?.name}
      />
    </div>
  );
};
