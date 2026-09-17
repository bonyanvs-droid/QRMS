import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sun,
  Calendar,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  User,
  Users,
  X,
  Target,
  Layers,
  MapPin,
  Award,
  BookOpen,
  Filter,
  Search,
  Check,
  AlertCircle,
  TrendingUp,
  Download,
  Share2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  SeasonalProgram,
  SeasonalActivity,
  SeasonalParticipation,
  SeasonalProgramStatus,
} from '../../types';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { StageHalaqahControlBar } from '../common/StageHalaqahControlBar';

export type SeasonType = 'summer' | 'ramadan' | 'spring' | 'winter' | 'enrichment' | string;

const SEASON_LABELS: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  summer: { label: 'برنامج صيفي', bg: 'bg-amber-100 text-amber-900 border-amber-300', text: 'text-amber-700', icon: '☀️' },
  ramadan: { label: 'موسم رمضاني', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', text: 'text-emerald-700', icon: '🌙' },
  spring: { label: 'إجازة الربيع', bg: 'bg-teal-100 text-teal-900 border-teal-300', text: 'text-teal-700', icon: '🌸' },
  winter: { label: 'موسم الشتاء', bg: 'bg-sky-100 text-sky-900 border-sky-300', text: 'text-sky-700', icon: '❄️' },
  enrichment: { label: 'برنامج إثرائي', bg: 'bg-purple-100 text-purple-900 border-purple-300', text: 'text-purple-700', icon: '✨' },
};

const STATUS_LABELS: Record<SeasonalProgramStatus, { label: string; badge: string }> = {
  planning: { label: 'قيد التخطيط', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  upcoming: { label: 'قادم قريباً', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  active: { label: 'نشط حالياً', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  completed: { label: 'مكتمل ومؤرشف', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
  archived: { label: 'مؤرشف', badge: 'bg-zinc-100 text-zinc-700 border-zinc-300' },
};

const ACTIVITY_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  spiritual: { label: 'إيماني وقيمي', icon: '🕌' },
  cultural: { label: 'ثقافي ومعرفي', icon: '📚' },
  sports: { label: 'رياضي وترفيهي', icon: '⚽' },
  field_trip: { label: 'رحلة وزيارة', icon: '🚌' },
  quranic_contest: { label: 'مسابقة قرآنية', icon: '🏆' },
  workshop: { label: 'ورشة مهارية', icon: '🛠️' },
};

export const SeasonalProgramsView: React.FC = () => {
  const {
    seasonalPrograms,
    seasonalActivities,
    seasonalParticipations,
    addSeasonalProgram,
    updateSeasonalProgram,
    deleteSeasonalProgram,
    addSeasonalActivity,
    updateSeasonalActivity,
    deleteSeasonalActivity,
    saveSeasonalParticipation,
    deleteSeasonalParticipation,
    currentUser,
    students,
    halaqahs,
    teachers,
    stages,
    activeTenantId,
    activeTenant,
  } = useApp();

  const canManage = Boolean(
    currentUser && (
      currentUser.role === 'admin' ||
      currentUser.role === 'system_admin' ||
      currentUser.role === 'campus_admin' ||
      currentUser.role === 'supervisor'
    )
  );

  // Active view tab
  const [activeTab, setActiveTab] = useState<'programs' | 'activities' | 'participation' | 'reports'>('programs');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SeasonalProgramStatus>('all');
  const [seasonFilter, setSeasonFilter] = useState<'all' | SeasonType>('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');

  // Modals state
  const [editingProgram, setEditingProgram] = useState<Partial<SeasonalProgram> | null>(null);
  const [isNewProgram, setIsNewProgram] = useState(false);

  const [editingActivity, setEditingActivity] = useState<Partial<SeasonalActivity> | null>(null);
  const [isNewActivity, setIsNewActivity] = useState(false);

  const [enrollStudentModalOpen, setEnrollStudentModalOpen] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState<string>('');

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState({ title: '', content: '' });

  // Filtered Programs for active tenant
  const tenantPrograms = useMemo(() => {
    return (seasonalPrograms || []).filter((p) => {
      if (activeTenantId && p.tenantId && p.tenantId !== activeTenantId) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (seasonFilter !== 'all' && p.season !== seasonFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSupervisor = p.supervisorName?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchSupervisor && !matchDesc) return false;
      }
      return true;
    });
  }, [seasonalPrograms, activeTenantId, statusFilter, seasonFilter, searchQuery]);

  // Filtered Activities
  const tenantActivities = useMemo(() => {
    return (seasonalActivities || []).filter((a) => {
      if (activeTenantId && a.tenantId && a.tenantId !== activeTenantId) return false;
      if (selectedProgramId !== 'all' && a.programId !== selectedProgramId) return false;
      return true;
    });
  }, [seasonalActivities, activeTenantId, selectedProgramId]);

  // Filtered Participations
  const tenantParticipations = useMemo(() => {
    return (seasonalParticipations || []).filter((p) => {
      if (activeTenantId && p.tenantId && p.tenantId !== activeTenantId) return false;
      if (selectedProgramId !== 'all' && p.programId !== selectedProgramId) return false;
      if (selectedActivityId !== 'all' && p.activityId && p.activityId !== selectedActivityId) return false;
      return true;
    });
  }, [seasonalParticipations, activeTenantId, selectedProgramId, selectedActivityId]);

  // Students enrolled in the selected program
  const programParticipants = useMemo(() => {
    if (selectedProgramId === 'all') return [];
    return tenantParticipations.filter((p) => p.programId === selectedProgramId);
  }, [tenantParticipations, selectedProgramId]);

  // Distinct enrolled student IDs in selected program
  const enrolledStudentIds = useMemo(() => {
    return Array.from(new Set(programParticipants.map((p) => p.studentId)));
  }, [programParticipants]);

  // Fast counts
  const totalProgramsCount = (seasonalPrograms || []).length;
  const activeProgramsCount = (seasonalPrograms || []).filter((p) => p.status === 'active').length;
  const totalActivitiesCount = (seasonalActivities || []).length;
  const totalParticipantsCount = new Set((seasonalParticipations || []).map((p) => p.studentId)).size;

  // Student map for fast lookup
  const studentMap = useMemo(() => {
    const map = new Map<string, typeof students[0]>();
    (students || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  // Halaqah map for fast lookup
  const halaqahMap = useMemo(() => {
    const map = new Map<string, typeof halaqahs[0]>();
    (halaqahs || []).forEach((h) => map.set(h.id, h));
    return map;
  }, [halaqahs]);

  // Handlers for Program
  const handleOpenAddProgram = () => {
    setIsNewProgram(true);
    setEditingProgram({
      title: '',
      code: `SEAS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      season: 'summer',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      description: '',
      supervisorName: currentUser?.name || 'المشرف التربوي',
      targetStageIds: [],
      maxCapacity: 40,
      location: 'مقر المجمع القرآني',
      tenantId: activeTenantId,
    });
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram || !editingProgram.title) return;

    if (isNewProgram) {
      await addSeasonalProgram(editingProgram as Omit<SeasonalProgram, 'id'>);
    } else if (editingProgram.id) {
      await updateSeasonalProgram(editingProgram.id, editingProgram);
    }
    setEditingProgram(null);
  };

  // Handlers for Activity
  const handleOpenAddActivity = (defaultProgramId?: string) => {
    setIsNewActivity(true);
    setEditingActivity({
      programId: defaultProgramId || (tenantPrograms[0]?.id || ''),
      title: '',
      description: '',
      activityType: 'cultural',
      date: new Date().toISOString().split('T')[0],
      time: '17:00 - 19:00',
      location: 'القاعة الرئيسية للمجمع',
      points: 15,
      status: 'planned',
      supervisorName: currentUser?.name || 'المشرف التربوي',
      tenantId: activeTenantId,
    });
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.title || !editingActivity.programId) return;

    if (isNewActivity) {
      await addSeasonalActivity(editingActivity as Omit<SeasonalActivity, 'id'>);
    } else if (editingActivity.id) {
      await updateSeasonalActivity(editingActivity.id, editingActivity);
    }
    setEditingActivity(null);
  };

  // Handlers for Student Enrollment
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId || selectedProgramId === 'all' || !selectedStudentToEnroll) return;
    const student = studentMap.get(selectedStudentToEnroll);
    if (!student) return;

    await saveSeasonalParticipation({
      programId: selectedProgramId,
      studentId: student.id,
      studentName: student.name,
      originalHalaqahId: student.halaqahId,
      attendanceStatus: 'present',
      achievementNote: 'تم القيد في البرنامج الموسمي بنجاح',
      pointsEarned: 10,
      tenantId: activeTenantId,
    });

    setSelectedStudentToEnroll('');
    setEnrollStudentModalOpen(false);
  };

  const handleToggleAttendance = async (part: SeasonalParticipation) => {
    const nextStatus: SeasonalParticipation['attendanceStatus'] =
      part.attendanceStatus === 'present'
        ? 'absent'
        : part.attendanceStatus === 'absent'
        ? 'excused'
        : part.attendanceStatus === 'excused'
        ? 'distinguished'
        : 'present';

    const points = nextStatus === 'distinguished' ? 25 : nextStatus === 'present' ? 15 : 0;

    await saveSeasonalParticipation({
      ...part,
      attendanceStatus: nextStatus,
      pointsEarned: points,
    });
  };

  const handleSendProgramAnnouncement = (prog: SeasonalProgram) => {
    const lines = [
      `☀️ *إعلان برنامج موسمي — ${activeTenant?.name || 'مجمع الغزاوي القرآني'}*`,
      `📌 *اسم البرنامج:* ${prog.title}`,
      `🏷️ *الموسم:* ${SEASON_LABELS[prog.season]?.label || prog.season}`,
      `📅 *الفترة:* من ${prog.startDate} إلى ${prog.endDate}`,
      `📍 *المقر:* ${prog.location || 'المجمع القرآني'}`,
      `👤 *المشرف المسؤول:* ${prog.supervisorName || 'المشرف التربوي'}`,
      prog.description ? `📝 *نبذة:* ${prog.description}` : '',
      `\n🌟 *ملاحظة:* المشاركة في البرامج الموسمية نشاط إثرائي تربوي مستقل يُعزز مهارات وقيم الطلاب دون التأثير على نصاب حلقتهم القرآنية الأساسية.`,
      `\nللاستفسار والتسجيل يرجى التواصل مع إدارة المجمع.`,
    ].filter(Boolean).join('\n');

    setReportData({
      title: `إعلان برنامج: ${prog.title}`,
      content: lines,
    });
    setReportModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl p-6 shadow-sm border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/40 text-amber-100 border border-amber-300/40 shrink-0 shadow-xs">
            <Sun className="w-8 h-8 text-amber-100 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-white">
                ☀️ البرامج والأنشطة الموسمية
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-800/80 text-amber-100 font-bold border border-amber-400/40">
                موديول تربوي مستقل
              </span>
            </div>
            <p className="text-xs text-amber-100/90 mt-1 max-w-2xl leading-relaxed">
              إدارة المخيمات الصيفية، البرامج الرمضانية، والأنشطة الموسمية المؤقتة ببياناتها وحضورها وإنجازها المستقل دون التأثير على حلقة الطالب القرآنية الأساسية.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-950/40 border border-amber-400/40 px-4 py-2 rounded-2xl text-xs text-amber-100 text-left sm:text-right">
            <span className="text-amber-200/80">البرامج النشطة:</span>
            <strong className="text-white block font-bold text-sm">{activeProgramsCount} برنامج نشط</strong>
          </div>

          {canManage && (
            <button
              onClick={handleOpenAddProgram}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-700" />
              <span>إضافة برنامج موسمي</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Fast Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي البرامج</span>
            <strong className="text-xl font-black text-slate-800">{totalProgramsCount}</strong>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <Sun className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">الفعاليات والأنشطة</span>
            <strong className="text-xl font-black text-emerald-700">{totalActivitiesCount}</strong>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">الطلاب المسجلون</span>
            <strong className="text-xl font-black text-blue-700">{totalParticipantsCount}</strong>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">حالة العزل الأكاديمي</span>
            <strong className="text-xs font-bold text-teal-800 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              حلقات الطلاب محفوظة
            </strong>
          </div>
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'programs'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>دليل البرامج الموسمية</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {tenantPrograms.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'activities'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>الأنشطة والفعاليات</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {tenantActivities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('participation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'participation'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>رصد الحضور والمشاركات</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {tenantParticipations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>الإحصائيات والتقارير</span>
          </button>
        </div>

        {/* Quick action buttons per tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'activities' && canManage && (
            <button
              onClick={() => handleOpenAddActivity(selectedProgramId !== 'all' ? selectedProgramId : undefined)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة نشاط</span>
            </button>
          )}

          {activeTab === 'participation' && canManage && (
            <button
              onClick={() => setEnrollStudentModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>قيد طالب في البرنامج</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Tab 1: Programs List & Cards */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم البرنامج، المشرف، أو الوصف..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط حالياً</option>
                <option value="upcoming">قادم</option>
                <option value="completed">مكتمل</option>
              </select>

              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700"
              >
                <option value="all">جميع المواسم</option>
                <option value="summer">برنامج صيفي</option>
                <option value="ramadan">موسم رمضاني</option>
                <option value="spring">إجازة الربيع</option>
                <option value="winter">موسم الشتاء</option>
                <option value="enrichment">برنامج إثرائي</option>
              </select>
            </div>
          </div>

          {/* Programs Grid */}
          {tenantPrograms.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
              <Sun className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">لا توجد برامج موسمية تطابق الفلترة</h3>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك إضافة برنامج صيفي أو رمضاني جديد بالنقر على زر «إضافة برنامج موسمي».
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenantPrograms.map((prog) => {
                const seasonInfo = SEASON_LABELS[prog.season] || SEASON_LABELS.summer;
                const statusInfo = STATUS_LABELS[prog.status] || STATUS_LABELS.active;
                const progActivities = (seasonalActivities || []).filter((a) => a.programId === prog.id);
                const progParticipants = (seasonalParticipations || []).filter((p) => p.programId === prog.id);
                const distinctStudents = new Set(progParticipants.map((p) => p.studentId)).size;

                return (
                  <div
                    key={prog.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${seasonInfo.bg}`}>
                          <span>{seasonInfo.icon}</span>
                          <span>{seasonInfo.label}</span>
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-snug">
                          {prog.title}
                        </h3>
                        {prog.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {prog.description}
                          </p>
                        )}
                      </div>

                      {/* Info Pills */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{prog.startDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{prog.location || 'المجمع القرآني'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{prog.supervisorName || 'المشرف التربوي'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{distinctStudents} / {prog.maxCapacity || 40} طالب</span>
                        </div>
                      </div>

                      {/* Activities Counter */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                        <span>الأنشطة المجدولة: <strong className="text-slate-800 font-bold">{progActivities.length} فعالية</strong></span>
                        {prog.budget ? (
                          <span>الميزانية: <strong className="text-emerald-700 font-bold">{prog.budget} ر.س</strong></span>
                        ) : null}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedProgramId(prog.id);
                            setActiveTab('activities');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          عرض الأنشطة
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProgramId(prog.id);
                            setActiveTab('participation');
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          رصد الطلاب
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendProgramAnnouncement(prog)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="إرسال إعلان عبر الواتساب"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setIsNewProgram(false);
                                setEditingProgram(prog);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="تعديل البرنامج"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف برنامج "${prog.title}" وجميع أنشطته وسجلاته؟`)) {
                                  deleteSeasonalProgram(prog.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="حذف البرنامج"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Activities & Events */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          {/* Program Switcher for Activities */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-700" />
              <span className="font-bold text-slate-700">تصفية حسب البرنامج الموسمي:</span>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
              >
                <option value="all">جميع البرامج الموسمية</option>
                {(seasonalPrograms || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({SEASON_LABELS[p.season]?.label || p.season})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-500 font-medium">
              إجمالي الأنشطة المعروضة: <strong className="text-slate-800">{tenantActivities.length} فعالية</strong>
            </span>
          </div>

          {/* Activities Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5 min-w-[200px]">النشاط والفعالية</th>
                    <th className="p-3.5 min-w-[150px]">البرنامج التابع له</th>
                    <th className="p-3.5 min-w-[120px]">الموعد والوقت</th>
                    <th className="p-3.5 min-w-[130px]">المقر والمشرف</th>
                    <th className="p-3.5 w-24 text-center">نقاط التميز</th>
                    <th className="p-3.5 w-28 text-center">حالة الفعالية</th>
                    <th className="p-3.5 w-28 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantActivities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        لم يتم تسجيل أي أنشطة أو فعاليات موسمية تطابق الفلترة الحالية.
                      </td>
                    </tr>
                  ) : (
                    tenantActivities.map((act) => {
                      const prog = (seasonalPrograms || []).find((p) => p.id === act.programId);
                      const typeInfo = ACTIVITY_TYPE_LABELS[act.activityType] || ACTIVITY_TYPE_LABELS.cultural;

                      return (
                        <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 align-top">
                            <div className="flex items-start gap-2">
                              <span className="text-lg shrink-0 mt-0.5">{typeInfo.icon}</span>
                              <div>
                                <strong className="text-slate-900 font-bold block">{act.title}</strong>
                                {act.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1">{act.description}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 align-top">
                            <span className="font-bold text-amber-800 block">{prog?.title || 'برنامج موسمي'}</span>
                            <span className="text-[10px] text-slate-500">{typeInfo.label}</span>
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="text-slate-700 font-medium">
                              <div>{act.date}</div>
                              {act.time && <div className="text-[10px] text-slate-500">{act.time}</div>}
                            </div>
                          </td>

                          <td className="p-3.5 align-top text-slate-600">
                            <div className="truncate">{act.location || 'المجمع'}</div>
                            <div className="text-[10px] text-slate-500 truncate">{act.supervisorName || 'المشرف'}</div>
                          </td>

                          <td className="p-3.5 align-top text-center">
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-black border border-amber-200">
                              +{act.points || 10} ن
                            </span>
                          </td>

                          <td className="p-3.5 align-top text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                act.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : act.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {act.status === 'completed'
                                ? 'مكتمل'
                                : act.status === 'in_progress'
                                ? 'جارٍ تنفيذه'
                                : 'مجدول'}
                            </span>
                          </td>

                          <td className="p-3.5 align-top text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canManage && (
                                <>
                                  <button
                                    onClick={() => {
                                      setIsNewActivity(false);
                                      setEditingActivity(act);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                                    title="تعديل النشاط"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`هل أنت متأكد من حذف نشاط "${act.title}"؟`)) {
                                        deleteSeasonalActivity(act.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                    title="حذف النشاط"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
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

      {/* 6. Tab 3: Participation & Attendance Matrix */}
      {activeTab === 'participation' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-700">البرنامج:</span>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="all">جميع البرامج</option>
                  {(seasonalPrograms || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-700">النشاط المحدد:</span>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                >
                  <option value="all">كافة سجلات البرنامج</option>
                  {tenantActivities.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">
                إجمالي السجلات: <strong className="text-slate-900">{tenantParticipations.length} سجل</strong>
              </span>
            </div>
          </div>

          {/* Academic Isolation Banner */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <strong className="font-bold">حماية السجل القرآني والأكاديمي للطالب:</strong>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  رصد حضور ومشاركات البرامج الموسمية يتم في سجل منفصل تماماً، مع حفظ حلقة الطالب القرآنية الأصلية دون أي خلط أو تعديل على التحصيل الأساسي.
                </p>
              </div>
            </div>
          </div>

          {/* Participations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5 min-w-[180px]">اسم الطالب</th>
                    <th className="p-3.5 min-w-[140px]">الحلقة الأصلية</th>
                    <th className="p-3.5 min-w-[160px]">البرنامج الموسمي</th>
                    <th className="p-3.5 min-w-[150px]">النشاط أو الملاحظة</th>
                    <th className="p-3.5 w-32 text-center">حالة الحضور والمشاركة</th>
                    <th className="p-3.5 w-24 text-center">النقاط</th>
                    <th className="p-3.5 w-24 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantParticipations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        لا توجد سجلات مشاركة مسجلة في هذا البرنامج. يمكنك قيد طالب باستخدام زر «قيد طالب في البرنامج».
                      </td>
                    </tr>
                  ) : (
                    tenantParticipations.map((part) => {
                      const student = studentMap.get(part.studentId);
                      const halaqah = student?.halaqahId ? halaqahMap.get(student.halaqahId) : undefined;
                      const prog = (seasonalPrograms || []).find((p) => p.id === part.programId);
                      const act = part.activityId ? (seasonalActivities || []).find((a) => a.id === part.activityId) : undefined;

                      return (
                        <tr key={part.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 align-top">
                            <strong className="text-slate-900 font-bold block">{part.studentName}</strong>
                            <span className="text-[10px] text-slate-400">ID: {part.studentId}</span>
                          </td>

                          <td className="p-3.5 align-top text-slate-600">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                              {halaqah?.name || 'الحلقة الأصلية'}
                            </span>
                          </td>

                          <td className="p-3.5 align-top">
                            <span className="font-bold text-amber-800">{prog?.title || 'برنامج موسمي'}</span>
                          </td>

                          <td className="p-3.5 align-top text-slate-600">
                            {act ? (
                              <div className="font-medium text-slate-800">{act.title}</div>
                            ) : null}
                            <p className="text-[11px] text-slate-500">{part.achievementNote || 'مشارك في البرنامج'}</p>
                          </td>

                          <td className="p-3.5 align-top text-center">
                            <button
                              onClick={() => handleToggleAttendance(part)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                part.attendanceStatus === 'distinguished'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : part.attendanceStatus === 'present'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : part.attendanceStatus === 'excused'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                              title="انقر لتغيير حالة الحضور"
                            >
                              {part.attendanceStatus === 'distinguished' && <span>⭐ متميز</span>}
                              {part.attendanceStatus === 'present' && <span>✔️ حاضر</span>}
                              {part.attendanceStatus === 'excused' && <span>⏳ معتذر</span>}
                              {part.attendanceStatus === 'absent' && <span>❌ غائب</span>}
                            </button>
                          </td>

                          <td className="p-3.5 align-top text-center">
                            <span className="font-black text-amber-700">+{part.pointsEarned || 0}</span>
                          </td>

                          <td className="p-3.5 align-top text-center">
                            {canManage && (
                              <button
                                onClick={() => {
                                  if (confirm(`حذف سجل مشاركة الطالب ${part.studentName}؟`)) {
                                    deleteSeasonalParticipation(part.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                title="حذف السجل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* 7. Tab 4: Insights & Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Participating Students */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-slate-900">أبرز الطلاب تميزاً في البرامج الموسمية</h3>
                </div>
                <span className="text-xs text-slate-500 font-bold">حسب مجموع النقاط</span>
              </div>

              <div className="space-y-2.5">
                {enrolledStudentIds.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">لا توجد بيانات مشاركات كافية بعد.</p>
                ) : (
                  enrolledStudentIds.slice(0, 5).map((studentId, idx) => {
                    const student = studentMap.get(studentId);
                    const participations = (seasonalParticipations || []).filter((p) => p.studentId === studentId);
                    const totalPoints = participations.reduce((acc, c) => acc + (c.pointsEarned || 0), 0);
                    const presentCount = participations.filter((p) => p.attendanceStatus === 'present' || p.attendanceStatus === 'distinguished').length;

                    return (
                      <div key={studentId} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <strong className="text-xs font-bold text-slate-900 block">{student?.name || 'طالب موسمي'}</strong>
                            <span className="text-[10px] text-slate-500">حضر {presentCount} فعالية</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs">
                          {totalPoints} نقطة
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Program Season Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">توزيع البرامج حسب المواسم</h3>
                </div>
                <span className="text-xs text-slate-500 font-bold">{totalProgramsCount} برنامج إجمالي</span>
              </div>

              <div className="space-y-3">
                {(['summer', 'ramadan', 'spring', 'winter', 'enrichment'] as SeasonType[]).map((st) => {
                  const sInfo = SEASON_LABELS[st];
                  const progsOfSeason = (seasonalPrograms || []).filter((p) => p.season === st);
                  const pct = totalProgramsCount > 0 ? Math.round((progsOfSeason.length / totalProgramsCount) * 100) : 0;

                  return (
                    <div key={st} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span>{sInfo.icon}</span>
                          <span>{sInfo.label}</span>
                        </span>
                        <span className="text-slate-500 font-bold">{progsOfSeason.length} برنامج ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Program Edit Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isNewProgram ? 'إضافة برنامج موسمي جديد' : 'تعديل بيانات البرنامج الموسمي'}
                </h3>
              </div>
              <button
                onClick={() => setEditingProgram(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان البرنامج الموسمي</label>
                <input
                  type="text"
                  required
                  value={editingProgram.title || ''}
                  onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })}
                  placeholder="مثال: المخيم الصيفي القرآني «فرسان القرآن»"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الموسم</label>
                  <select
                    value={editingProgram.season || 'summer'}
                    onChange={(e) => setEditingProgram({ ...editingProgram, season: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="summer">برنامج صيفي ☀️</option>
                    <option value="ramadan">موسم رمضاني 🌙</option>
                    <option value="spring">إجازة الربيع 🌸</option>
                    <option value="winter">موسم الشتاء ❄️</option>
                    <option value="enrichment">برنامج إثرائي ✨</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة البرنامج</label>
                  <select
                    value={editingProgram.status || 'active'}
                    onChange={(e) => setEditingProgram({ ...editingProgram, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="active">نشط حالياً</option>
                    <option value="upcoming">قادم قريباً</option>
                    <option value="completed">مكتمل ومؤرشف</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    required
                    value={editingProgram.startDate || ''}
                    onChange={(e) => setEditingProgram({ ...editingProgram, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    required
                    value={editingProgram.endDate || ''}
                    onChange={(e) => setEditingProgram({ ...editingProgram, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المشرف المسؤول</label>
                  <input
                    type="text"
                    value={editingProgram.supervisorName || ''}
                    onChange={(e) => setEditingProgram({ ...editingProgram, supervisorName: e.target.value })}
                    placeholder="اسم المشرف التربوي"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الطاقة الاستيعابية</label>
                  <input
                    type="number"
                    value={editingProgram.maxCapacity || 40}
                    onChange={(e) => setEditingProgram({ ...editingProgram, maxCapacity: parseInt(e.target.value) || 40 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المقر والمكان</label>
                  <input
                    type="text"
                    value={editingProgram.location || ''}
                    onChange={(e) => setEditingProgram({ ...editingProgram, location: e.target.value })}
                    placeholder="مقر المجمع القرآني"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الميزانية المعتمدة (ر.س)</label>
                  <input
                    type="number"
                    value={editingProgram.budget || 0}
                    onChange={(e) => setEditingProgram({ ...editingProgram, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الأهداف والوصف</label>
                <textarea
                  rows={3}
                  value={editingProgram.description || ''}
                  onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })}
                  placeholder="وصف تفصيلي لأهداف البرنامج الموسمي والأنشطة المقترحة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  حفظ البرنامج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Activity Edit Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {isNewActivity ? 'إضافة نشاط موسمي جديد' : 'تعديل بيانات النشاط'}
                </h3>
              </div>
              <button
                onClick={() => setEditingActivity(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">البرنامج الموسمي التابع له</label>
                <select
                  required
                  value={editingActivity.programId || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, programId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                >
                  {(seasonalPrograms || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان النشاط / الفعالية</label>
                <input
                  type="text"
                  required
                  value={editingActivity.title || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  placeholder="مثال: ورشة تدبر سورة الكهف والمسابقة الثقافية"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع النشاط</label>
                  <select
                    value={editingActivity.activityType || 'cultural'}
                    onChange={(e) => setEditingActivity({ ...editingActivity, activityType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                  >
                    <option value="spiritual">إيماني وقيمي 🕌</option>
                    <option value="cultural">ثقافي ومعرفي 📚</option>
                    <option value="sports">رياضي وترفيهي ⚽</option>
                    <option value="field_trip">رحلة وزيارة 🚌</option>
                    <option value="quranic_contest">مسابقة قرآنية 🏆</option>
                    <option value="workshop">ورشة مهارية 🛠️</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ النشاط</label>
                  <input
                    type="date"
                    required
                    value={editingActivity.date || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوقت</label>
                  <input
                    type="text"
                    value={editingActivity.time || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, time: e.target.value })}
                    placeholder="17:00 - 19:00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نقاط التميز</label>
                  <input
                    type="number"
                    value={editingActivity.points || 15}
                    onChange={(e) => setEditingActivity({ ...editingActivity, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تفاصيل النشاط</label>
                <textarea
                  rows={2}
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  placeholder="وصف مختصر للنشاط والمهام المطلوبة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  حفظ النشاط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Enroll Student Modal */}
      {enrollStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  قيد طالب في البرنامج الموسمي
                </h3>
              </div>
              <button
                onClick={() => setEnrollStudentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر البرنامج الموسمي</label>
                <select
                  required
                  value={selectedProgramId !== 'all' ? selectedProgramId : (tenantPrograms[0]?.id || '')}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                >
                  {(seasonalPrograms || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الطالب من قاعدة المجمع</label>
                <select
                  required
                  value={selectedStudentToEnroll}
                  onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                >
                  <option value="">-- اضغط لاختيار الطالب --</option>
                  {(students || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.halaqahName || 'حلقة غير محددة'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-800">
                💡 <strong>ملاحظة:</strong> قيد الطالب في البرنامج الموسمي لا يغير حلقته الأصلية المسجل بها، ويبقى تحصيله القرآني الأساسي معزولاً ومستقلاً.
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEnrollStudentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentToEnroll}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer"
                >
                  تأكيد القيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: WhatsApp Report Modal */}
      {reportModalOpen && (
        <ReportDispatchModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          title={reportData.title}
          reportContent={reportData.content}
          recipientName="جروب أولياء الأمور والطلاب"
          recipientType="prep_week"
          reportType="prep"
        />
      )}
    </div>
  );
};
