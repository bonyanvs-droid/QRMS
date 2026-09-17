import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TimelineVisualizer } from '../common/TimelineVisualizer';
import { StatCard } from '../common/StatCard';
import {
  Sparkles,
  BookOpen,
  Target,
  Award,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Send,
  Users,
  HeartHandshake,
  Star,
  Activity,
  Layers,
} from 'lucide-react';
import { calculateAggregateMetrics } from '../../utils/statusCalculator';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { generateGeneralParentsGroupReport, generatePrepWeekAnnouncement } from '../../utils/reportGenerator';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import { StageLogo } from '../common/logos/StageLogo';
import { GraduationCap, UserPlus } from 'lucide-react';
import { PublicAdmissionModal } from '../admissions/PublicAdmissionModal';

interface PublicDashboardProps {
  onNavigateToParent?: () => void;
  onNavigateToEducational?: () => void;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  onNavigateToParent,
  onNavigateToEducational,
}) => {
  const {
    currentRole,
    academicConfig,
    educationalPlan,
    students,
    sessionRecords,
    spellingLessons,
    publicSummary,
  } = useApp();
  const [selectedWeek, setSelectedWeek] = useState<number>(academicConfig.currentWeek);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [reportData, setReportData] = useState({
    title: '',
    content: '',
    recipientName: '',
    recipientPhone: '',
    recipientType: 'general_group' as any,
    reportType: 'general' as any,
  });

  const calculatedMetrics = useMemo(() => {
    return calculateAggregateMetrics(students, sessionRecords, spellingLessons, academicConfig);
  }, [students, sessionRecords, spellingLessons, academicConfig]);

  // Use publicSummary from secure cloud aggregate when available
  const metrics = (students.length > 0 ? calculatedMetrics : (publicSummary || calculatedMetrics));
  const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === selectedWeek);

  const handleOpenBroadcast = (type: 'current' | 'prep') => {
    if (type === 'current') {
      const content = generateGeneralParentsGroupReport(academicConfig, currentWeekPlan, metrics);
      setReportData({
        title: `تقرير إنجاز الأسبوع ${academicConfig.currentWeek} لجروب أولياء الأمور`,
        content,
        recipientName: 'مجموعة أولياء أمور المجمع القرآني',
        recipientPhone: '',
        recipientType: 'general_group',
        reportType: 'general',
      });
    } else {
      const nextWeekPlan = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek + 1);
      const content = generatePrepWeekAnnouncement(academicConfig.currentWeek + 1, nextWeekPlan);
      setReportData({
        title: `الرسالة التحضيرية للأسبوع القادم (${academicConfig.currentWeek + 1})`,
        content,
        recipientName: 'مجموعة أولياء الأمور والمعلمين',
        recipientPhone: '',
        recipientType: 'prep_week',
        reportType: 'prep',
      });
    }
    setShowReportModal(true);
  };

  // Grade level distribution counts (strictly privacy-safe)
  const tamheediCount =
    students.length > 0
      ? students.filter((s) => s.grade === 'تمهيدي').length
      : (publicSummary?.gradeCounts?.tamheedi ?? 0);
  const grade1Count =
    students.length > 0
      ? students.filter((s) => s.grade === 'صف أول').length
      : (publicSummary?.gradeCounts?.grade1 ?? 0);
  const grade2Count =
    students.length > 0
      ? students.filter((s) => s.grade === 'صف ثاني').length
      : (publicSummary?.gradeCounts?.grade2 ?? 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Institutional Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white p-6 md:p-10 shadow-xl overflow-hidden border border-emerald-800/60">
        {/* Background Islamic Geometric Motif overlay */}
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-emerald-700/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Main Text Content */}
          <div className="max-w-3xl flex-1 text-right">
            {/* Mosque & Stage Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>جامع الغزاوي بمدينة جدة</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-600 text-emerald-200 text-xs font-bold">
                <span>مجمع حلقات القرآن الكريم</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              لوحة الإنجاز والمتابعة العامة للمخرجات القرآنية والتعليمية
            </h2>

            <p className="mt-3 text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl font-light">
              منظومة مؤسسية ذكية لقياس المخرج القرآني المرجعي:{' '}
              <strong className="text-amber-300 font-semibold font-quran text-lg">
                «متقنٌ لهجاء القرآن وحفظه إلى الغاشية»
              </strong>{' '}
              عبر متابعة دقيقة لمسار الهجاء الأسبوعي والحفظ التراكمي والقيم التربوية.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {currentRole === 'public' ? (
                <>
                  <button
                    onClick={() => setShowAdmissionModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-black text-xs md:text-sm shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>طلب تسجيل وقبول طالب جديد ✨</span>
                  </button>
                  {onNavigateToParent && (
                    <button
                      onClick={onNavigateToParent}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs md:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>بوابة ولي الأمر (الاستعلام برقم الجوال) 🎓</span>
                    </button>
                  )}
                  {onNavigateToEducational && (
                    <button
                      onClick={onNavigateToEducational}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/70 hover:bg-emerald-800 border border-emerald-600/60 text-emerald-100 font-semibold text-xs md:text-sm transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-amber-300" />
                      <span>الخطة التربوية والزمنية المعتمدة</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleOpenBroadcast('current')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs md:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>نشر تقرير الأسبوع لجروب أولياء الأمور 📲</span>
                  </button>

                  <button
                    onClick={() => handleOpenBroadcast('prep')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/70 hover:bg-emerald-800 border border-emerald-600/60 text-emerald-100 font-semibold text-xs md:text-sm transition-all cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-amber-300" />
                    <span>إعلان تحضير الأسبوع القادم</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Official Complex Identity Showcase Card */}
          <div
            className="shrink-0 flex flex-col items-center bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/20 shadow-2xl max-w-xs w-full"
            title="الشعار الرسمي المعتمد لمجمع جامع الغزاوي القرآني"
          >
            <div className="flex items-center justify-center pb-3 border-b border-white/10 w-full">
              <div className="p-2 bg-white/95 rounded-2xl shadow-md">
                <MosqueLogo size="md" />
              </div>
            </div>

            <div className="text-center mt-3 space-y-1">
              <div className="font-serif font-black text-lg text-amber-300">
                «نَغْرِسُ اليوم .. لنَحْصُدَ غَداً»
              </div>
              <div className="text-[11px] text-emerald-200 font-bold">
                نَبْتَدِي بالقرآن ونرتقي بالعِلْمِ وبالعمل
              </div>
            </div>

            {/* 5 Pillars Mini Badges */}
            <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-white/10 w-full text-center">
              <span className="text-[10px] font-bold bg-amber-400/20 text-amber-200 px-1 py-1 rounded-lg border border-amber-400/30">قرآن</span>
              <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-200 px-1 py-1 rounded-lg border border-emerald-400/30">إيمان</span>
              <span className="text-[10px] font-bold bg-sky-400/20 text-sky-200 px-1 py-1 rounded-lg border border-sky-400/30">آداب</span>
              <span className="text-[10px] font-bold bg-orange-400/20 text-orange-200 px-1 py-1 rounded-lg border border-orange-400/30">نشاط</span>
              <span className="text-[10px] font-bold bg-purple-400/20 text-purple-200 px-1 py-1 rounded-lg border border-purple-400/30">تميز</span>
            </div>

            <div className="mt-2.5 flex items-center justify-between w-full text-[10px] text-slate-300 font-medium px-1">
              <span>محبة • انتماء • عطاء</span>
              <span className="text-emerald-300 flex items-center gap-1 font-semibold">
                <span>معتمد رسمياً</span>
                <span>✓</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Week Operational Interactive Timeline */}
      <TimelineVisualizer selectedWeek={selectedWeek} onSelectWeek={(w) => setSelectedWeek(w)} />

      {/* Primary Key Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          title="متوسط إتقان الهجاء القرآني"
          value={`${metrics.spellingAvgMastery}%`}
          subtitle={`متوسط الدرس الحالي: الدرس ${metrics.spellingAvgLesson}`}
          icon={<Sparkles className="w-6 h-6 text-emerald-700" />}
          color="emerald"
          progress={metrics.spellingAvgMastery}
          trend="↑ +3.4% مقارنة بالأسبوع الماضي"
        />

        <StatCard
          title="نسبة تحقيق المستهدف القرآني"
          value={`${metrics.quranAvgProgress}%`}
          subtitle="مقارنة بالحد الأدنى المقرر لكل صف"
          icon={<Target className="w-6 h-6 text-blue-700" />}
          color="blue"
          progress={metrics.quranAvgProgress}
          trend={`${metrics.quranAdvancedPct}% تجاوزوا المستهدف الأساسي ⭐`}
        />

        <StatCard
          title="نسبة المواظبة والانتظام"
          value={`${metrics.overallAttendancePct}%`}
          subtitle="حضور جلسات التسميع ويوم الهجاء"
          icon={<Users className="w-6 h-6 text-amber-700" />}
          color="amber"
          progress={metrics.overallAttendancePct}
          trend="انضباط عالي في دورة الـ 4 أيام"
        />

        <StatCard
          title="الطلاب الملتزمون والمتقدمون"
          value={`${metrics.spellingOnTrackPct + metrics.spellingAdvancedPct}%`}
          subtitle={`${metrics.statusCounts.advanced} متقدم • ${metrics.statusCounts.on_track} على الخطة`}
          icon={<Award className="w-6 h-6 text-purple-700" />}
          color="purple"
          progress={metrics.spellingOnTrackPct + metrics.spellingAdvancedPct}
          trend="وتيرة تعليمية مستقرة ومتزنة"
        />
      </div>

      {/* 2-Column Analytical Depth Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Quranic & Spelling Pillars Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Surahs per Grade Benchmark Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    الحد الأدنى المستهدف للحفظ حسب المرحلة الدراسية
                  </h3>
                  <p className="text-xs text-slate-700">المخرجات القرآنية المرحلية للوصول إلى سورة الغاشية</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                إجمالي {metrics.totalStudents} طالب
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {/* Tamheedi */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    تمهيدي
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">مرحلة التمهيدي (KG)</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                        الحد الأدنى: الفاتحة + الناس إلى قريش
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      التركيز: الحروف المفردة والمركبة وتأسيس النطق الصحيح.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-700 block text-[10px]">عدد الطلاب</span>
                  <strong className="text-emerald-800 font-bold">{tamheediCount} طلاب</strong>
                </div>
              </div>

              {/* Grade 1 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    أول
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">الصف الأول الابتدائي</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
                        الحد الأدنى: سورة البينة
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      التركيز: الحركات والمدود والتنوين وقراءة كلمات قرآنية من المصحف.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-700 block text-[10px]">عدد الطلاب</span>
                  <strong className="text-blue-800 font-bold">{grade1Count} طلاب</strong>
                </div>
              </div>

              {/* Grade 2 */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    ثاني
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">الصف الثاني الابتدائي (المخرج المرجعي)</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold">
                        الحد الأدنى: سورة الغاشية
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      التركيز: إتقان السكون والشدات والهمزات والتلاوة المسترسلة بهجاء متقن.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-xs">
                  <span className="text-slate-700 block text-[10px]">عدد الطلاب</span>
                  <strong className="text-amber-900 font-bold">{grade2Count} طلاب</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Spelling 4-Day Cycle Structure */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
                <Layers className="w-5 h-5 text-purple-700" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">هيكلية الدورة الأسبوعية (4 أيام أسبوعياً)</h3>
                <p className="text-xs text-slate-700">تكامل تعليم الهجاء مع التسميع والمراجعة اليومية</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>اليوم الأول: يوم الهجاء القرآني المخصص</span>
                </div>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  يُخصص هذا اليوم كاملاً لتدريس الدرس الهجائي الجديد، ونطق الحروف والمقاطع وتطبيقها على آيات القرآن، مع
                  تقييم المهام الفرعية ورصد درجة الإتقان لكل طالب.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>الأيام الثلاثة التالية: تسميع + 10 دقائق هجاء</span>
                </div>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  تسميع المحفوظ الجديد والمراجعة القريبة والبعيدة، مع تخصيص <strong>10 دقائق إلزامية يومياً</strong>{' '}
                  لتثبيت مهارات الهجاء ومراجعة المقاطع المشكلة قبل فتح المصحف.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Current Week Educational Spotlight & Status Distribution */}
        <div className="space-y-6">
          {/* Status Distribution Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Activity className="w-5 h-5 text-amber-700" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">توزيع الحالات التعليمية</h3>
                <p className="text-xs text-slate-700">مؤشرات الأداء التراكمي</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span>⭐</span> طلاب متقدمون عن الخطة
                </span>
                <span className="font-black text-emerald-800 px-2.5 py-0.5 bg-emerald-100 rounded-full">
                  {metrics.statusCounts.advanced} ({metrics.spellingAdvancedPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span>🔵</span> طلاب على الخطة تماماً
                </span>
                <span className="font-black text-blue-800 px-2.5 py-0.5 bg-blue-100 rounded-full">
                  {metrics.statusCounts.on_track} ({metrics.spellingOnTrackPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <span>🟣</span> قيد التثبيت (قرار تربوي)
                </span>
                <span className="font-black text-purple-800 px-2.5 py-0.5 bg-purple-100 rounded-full">
                  {metrics.statusCounts.not_moved_yet}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span>🟠</span> يحتاجون دعماً ومتابعة
                </span>
                <span className="font-black text-amber-800 px-2.5 py-0.5 bg-amber-100 rounded-full">
                  {metrics.statusCounts.needs_support}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <span>🔴</span> متأخرون (خطة علاجية)
                </span>
                <span className="font-black text-rose-800 px-2.5 py-0.5 bg-rose-100 rounded-full">
                  {metrics.statusCounts.lagging}
                </span>
              </div>
            </div>
          </div>

          {/* Educational Plan Weekly Feature */}
          {currentWeekPlan && (
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-6 shadow-md border border-emerald-800">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>الخطة التربوية للأسبوع {currentWeekPlan.weekNumber}</span>
              </div>

              <h4 className="text-lg font-bold text-white mt-2 leading-snug">
                شعار الأسبوع: {currentWeekPlan.motto}
              </h4>

              <div className="mt-4 space-y-2.5 text-xs text-slate-200">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                  <strong className="text-amber-300 block mb-1">الهدف التربوي والقرآني:</strong>
                  <span>{currentWeekPlan.educationalGoal}</span>
                </div>

                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                  <strong className="text-amber-300 block mb-1">النشاط التطبيقي:</strong>
                  <span>{currentWeekPlan.activity}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between text-[11px] text-slate-300">
                <span>المشرف: {currentWeekPlan.responsiblePerson}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    currentWeekPlan.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : currentWeekPlan.status === 'in_progress'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {currentWeekPlan.status === 'completed'
                    ? 'تم التنفيذ بنجاح'
                    : currentWeekPlan.status === 'in_progress'
                    ? 'جارٍ التنفيذ'
                    : 'مجدول'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Identity & 5 Pillars Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 md:p-8 text-white shadow-lg border border-emerald-700/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-white rounded-2xl shadow-md shrink-0">
              <StageLogo stageId="baraem" size="lg" variant="compact" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  الهوية التربوية المعتمدة
                </span>
                <span className="text-xs font-medium text-emerald-200">جامع الغزاوي بمدينة جدة</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mt-1">
                مرتكزات وقيم الحلقات القرآنية
              </h3>
              <p className="text-xs md:text-sm text-emerald-100/90 mt-0.5">
                «نَبْتَدِي بالقرآن ونرتقي بالعِلْمِ وبالعمل • نَغْرِسُ اليوم .. لنَحْصُدَ غَداً»
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-xs border border-white/10">
            <MosqueLogo size="sm" />
            <div className="text-right">
              <div className="text-xs font-bold text-amber-300">جامع الغزاوي</div>
              <div className="text-[10px] text-emerald-100">رعاية القرآن الكريم ونشء الحلقات</div>
            </div>
          </div>
        </div>

        {/* 5 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-lg mb-2 border border-amber-400/30">
              📖
            </div>
            <h4 className="font-bold text-amber-300 text-sm">١. قـــرآن</h4>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              إتقان حروف القرآن وهجائه والتدرج في حفظ قصار السور حتى الغاشية بإتقان تام.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold text-lg mb-2 border border-emerald-400/30">
              🤍
            </div>
            <h4 className="font-bold text-emerald-300 text-sm">٢. إيـمـان</h4>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              غرس محبة الله ورسوله وتعظيم كلام الله وربط النشء ببيوت الله بالسكينة والطمأنينة.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-sky-400/20 text-sky-300 flex items-center justify-center font-bold text-lg mb-2 border border-sky-400/30">
              🤲
            </div>
            <h4 className="font-bold text-sky-300 text-sm">٣. آداب</h4>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              التخلق بأخلاق القرآن، بر الوالدين، احترام المعلم، والتأدب في المجلس والمسجد.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-orange-400/20 text-orange-300 flex items-center justify-center font-bold text-lg mb-2 border border-orange-400/30">
              👥
            </div>
            <h4 className="font-bold text-orange-300 text-sm">٤. نـشـاط</h4>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              المسابقات القرآنية والأنشطة الترويحية الهادفة لتعزيز روح الأخوة والتفاعل الإيجابي.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center font-bold text-lg mb-2 border border-purple-400/30">
              🏆
            </div>
            <h4 className="font-bold text-purple-300 text-sm">٥. تـمـيـز</h4>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              تكريم المتفوقين وتحفيز الطلاب وإبراز المتميزين في التسميع والهجاء والأخلاق.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-emerald-200/90 font-medium tracking-wide">
          شعارنا الدائم: <strong className="text-white font-bold">محبة • انتماء • عطاء</strong>
        </div>
      </div>

      {/* WhatsApp Broadcast Modal */}
      <ReportDispatchModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={reportData.title}
        reportContent={reportData.content}
        recipientName={reportData.recipientName}
        recipientPhone={reportData.recipientPhone}
        recipientType={reportData.recipientType}
        reportType={reportData.reportType}
      />

      {/* Public Admission Registration Modal */}
      <PublicAdmissionModal
        isOpen={showAdmissionModal}
        onClose={() => setShowAdmissionModal(false)}
      />
    </div>
  );
};
