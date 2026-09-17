import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Building2,
  Calendar,
  Crown,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ArrowUpRight,
  UserCheck,
  Award,
  Wallet,
  CalendarCheck2,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Student, Halaqah, Teacher, AcademicYearConfig, DailySessionRecord, SpellingLesson, MosqueComplexTenant } from '../../types';
import { isModuleEnabled } from '../../lib/moduleChecker';

interface AdminOverviewDashboardProps {
  students: Student[];
  halaqahs: Halaqah[];
  teachers: Teacher[];
  supervisorsCount?: number;
  sessionRecords: DailySessionRecord[];
  spellingLessons: SpellingLesson[];
  academicConfig: AcademicYearConfig;
  activeTenant: MosqueComplexTenant | null;
  admissionsCount: number;
  nominationsCount: number;
  isSysAdmin: boolean;
  onOpenWhatsAppModal?: () => void;
  onOpenBadgesModal: () => void;
  onOpenRadarModal: () => void;
  onExportExcel: () => void;
  onOpenOfficialReport: () => void;
}

export const AdminOverviewDashboard: React.FC<AdminOverviewDashboardProps> = ({
  students,
  halaqahs,
  teachers,
  supervisorsCount = 0,
  academicConfig,
  activeTenant,
  admissionsCount,
  nominationsCount,
  onOpenBadgesModal,
  onOpenRadarModal,
  onExportExcel,
  onOpenOfficialReport,
}) => {
  const navigate = useNavigate();

  const isBadgesActive = isModuleEnabled(activeTenant, 'badges');
  const isAdmissionsActive = isModuleEnabled(activeTenant, 'admissions');
  const isAssociationActive = isModuleEnabled(activeTenant, 'association');
  const isFinancesActive = isModuleEnabled(activeTenant, 'finances');

  // Operational metrics
  const totalStudents = students.length;
  const totalHalaqahs = halaqahs.length;
  const totalTeachers = teachers.length;
  const totalStaff = totalTeachers + supervisorsCount;

  // Dynamic student breakdown by grade / stage (Data-driven from actual student list)
  const studentBreakdownText = React.useMemo(() => {
    if (students.length === 0) return 'لا يوجد طلاب مسجلون';
    const map: Record<string, number> = {};
    students.forEach((s) => {
      const key = s.grade || 'غير محدد';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([grade, count]) => `${grade}: ${count}`)
      .join(' • ');
  }, [students]);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Bulk Onboarding / Import Callout - Only shown when there are no halaqahs yet */}
      {totalHalaqahs === 0 && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-emerald-600/40 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white font-serif">
                الاستيراد الشامل وتأسيس بيانات المجمع دفعة واحدة 🚀
              </h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                رفع وتسكين كافة الطلاب، الحلقات، المعلمين، وأولياء الأمور من ملف Excel واحد مع إنشاء حسابات الدخول تلقائياً.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/bulk_import')}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>فتح مركز الاستيراد الشامل</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: Primary Statistics (الإحصائيات الرئيسية)
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>الإحصائيات الرئيسية</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">مؤشرات الأداء التشغيلي المباشر</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* KPI 1: Students */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/students')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/admin/students'))}
            aria-label={`إجمالي الطلاب المقيدين: ${totalStudents} طالب`}
            className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/80 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">الطلاب المقيدون</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl sm:text-3xl font-black text-slate-900 tabular-nums leading-none">
                  {totalStudents}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate" title={studentBreakdownText}>
              {studentBreakdownText}
            </div>
          </div>

          {/* KPI 2: Halaqahs */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/halaqahs')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/admin/halaqahs'))}
            aria-label={`الحلقات القرآنية: ${totalHalaqahs} حلقة`}
            className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/80 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">الحلقات القرآنية</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl sm:text-3xl font-black text-slate-900 tabular-nums leading-none">
                  {totalHalaqahs}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate">
              {totalHalaqahs > 0 ? `معدل ${Math.round(totalStudents / totalHalaqahs)} طالب/حلقة` : 'لا توجد حلقات'}
            </div>
          </div>

          {/* KPI 3: Staff (Teachers & Supervisors) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/teachers')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/admin/teachers'))}
            aria-label={`الكادر التعليمي والإشرافي: ${totalStaff} كادر`}
            className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/80 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">الكادر التعليمي</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl sm:text-3xl font-black text-slate-900 tabular-nums leading-none">
                  {totalStaff}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-indigo-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate">
              {totalTeachers} معلماً • {supervisorsCount} مشرفاً
            </div>
          </div>

          {/* KPI 4: Academic Progress */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/academic')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/admin/academic'))}
            aria-label={`الأسبوع التشغيلي: الأسبوع ${academicConfig.currentWeek}`}
            className="bg-white rounded-2xl p-3 sm:p-4.5 border border-slate-200/80 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2 gap-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">الأسبوع التشغيلي</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-lg sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
                  الأسبوع {academicConfig.currentWeek}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 truncate" title={`${academicConfig.name} • ${academicConfig.semester}`}>
              {academicConfig.name} • {academicConfig.semester}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: Direct Administrative Actions (الإجراءات الإدارية المباشرة - 4 Cards Only)
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>الإجراءات الإدارية المباشرة</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              الوظائف الميدانية لتنفيذ ومتابعة الإجراءات الإدارية الأساسية للمجمع
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Admissions */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admissions')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/admissions'))}
            aria-label="طلبات القبول والتسجيل"
            className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100/80 text-emerald-800 shrink-0">
                  {admissionsCount} طلب
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                طلبات القبول والتسجيل
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                مراجعة واعتماد ملفات الطلاب الجدد وتعيين الحلقات
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-emerald-700 group-hover:text-emerald-800">
              <span>فتح بوابة القبول</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Association Nominations */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/nominations')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/nominations'))}
            aria-label="اختبارات الجمعية الرسمية"
            className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100/80 text-amber-800 shrink-0">
                  {nominationsCount} مرشح
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                اختبارات الجمعية الرسمية
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                إدارة ترشيحات وتأهيل الطلاب لاختبارات الجمعيات القرآنية
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-800 group-hover:text-amber-900">
              <span>متابعة الترشيحات</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Finances */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/finances')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/finances'))}
            aria-label="الاشتراكات والرسوم الدراسية"
            className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100/80 text-blue-800 shrink-0">
                  سداد ومتابعة
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                الاشتراكات والرسوم الدراسية
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                تسجيل ومتابعة سداد الرسوم الفصلية والإعفاءات
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-blue-800 group-hover:text-blue-900">
              <span>فتح السجل المالي</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Meetings Management (الاجتماعات والمحاضر) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/meetings')}
            onKeyDown={(e) => handleKeyDown(e, () => navigate('/admin/meetings'))}
            aria-label="الاجتماعات والمحاضر"
            className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100/80 text-indigo-800 shrink-0">
                  إدارة وتوثيق
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                الاجتماعات والمحاضر
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                إنشاء الاجتماعات، تحديد المدعوين، ورصد التوصيات والقرارات
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-indigo-800 group-hover:text-indigo-900">
              <span>إدارة الاجتماعات</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: Cloud Monitoring, Documentation & Approved Reports (4 Cards Only)
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>الرصد السحابي، التوثيق والتقارير المعتمدة</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              أدوات الرصد الميداني السحابي، التوثيق، استخراج الكشوفات والتقارير المعتمدة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Official Certified Printable Report (التقرير الرسمي PDF) */}
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenOfficialReport}
            onKeyDown={(e) => handleKeyDown(e, onOpenOfficialReport)}
            aria-label="التقرير الرسمي المعتمد PDF"
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-700 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-slate-700"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-800 shrink-0">
                  معتمد للطباعة
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                التقرير الرسمي (PDF)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                استعراض وطباعة التقرير الدوري المعتمد للمجمع
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-slate-950">
              <span>طباعة التقرير</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Badges & Points System */}
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenBadgesModal}
            onKeyDown={(e) => handleKeyDown(e, onOpenBadgesModal)}
            aria-label="منظومة الأوسمة والتحفيز"
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-800 shrink-0">
                  تحفيز الطلاب
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                منظومة الأوسمة
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                إدارة أوسمة التميز ونقاط الطلاب والتشجيع
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-800 group-hover:text-amber-900">
              <span>لوحة الأوسمة</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Early Intervention Radar */}
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenRadarModal}
            onKeyDown={(e) => handleKeyDown(e, onOpenRadarModal)}
            aria-label="رادار التدخل السريع"
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-rose-50 text-rose-800 shrink-0">
                  رصد ومتابعة
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                رادار التدخل السريع
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                متابعة حالات التعثر والغياب والتدخل التربوي
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-rose-800 group-hover:text-rose-900">
              <span>فتح الرادار</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Excel Export */}
          <div
            role="button"
            tabIndex={0}
            onClick={onExportExcel}
            onKeyDown={(e) => handleKeyDown(e, onExportExcel)}
            aria-label="تصدير كشف Excel"
            className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-0 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-800 shrink-0">
                  كشف شامل
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1">
                تصدير كشف Excel
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                تصدير كشوفات الطلاب والحلقات وسجلات الرصد
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-emerald-800 group-hover:text-emerald-900">
              <span>تنزيل الملف</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

