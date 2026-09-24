import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AssociationNominationsTab } from '../admin/AssociationNominationsTab';
import { isModuleEnabled } from '../../lib/moduleChecker';
import {
  SUPERVISOR_ROLES_CONFIG,
  filterNominationsForSupervisor,
  filterHalaqahsForSupervisor,
  filterAccessibleTracksForUser,
} from '../../utils/trackAdapter';
import { SupervisorType, SupervisorScope } from '../../types';
import { SmartAttendanceWidget } from '../common/SmartAttendanceWidget';
import { filterStudentsByScope, filterHalaqahsByScope, hasPermission } from '../../lib/permissions';
import { StudentQuranPlanModal } from '../quran/StudentQuranPlanModal';
import { ComprehensiveQuranPlanModal } from '../common/ComprehensiveQuranPlanModal';
import { Student } from '../../types';
import {
  ShieldCheck,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Layers,
  Sparkles,
  TrendingUp,
  Calendar,
  Clock,
  Heart,
  ChevronRight,
  Flame,
  Star,
  Check,
  Target,
  ArrowRight,
  Sliders,
  Navigation,
} from 'lucide-react';

export const SupervisorDashboard: React.FC = () => {
  const {
    activeTenant,
    activeTenantId,
    students,
    halaqahs,
    teachers,
    sessionRecords,
    spellingLessons,
    educationalPlan,
    quranPlans,
    associationNominations,
    trackNominations,
    academicConfig,
    currentUser,
    tracks,
    stages,
  } = useApp();

  // Active Scope State (Role + Scope Architecture)
  const initialScopeType: SupervisorType =
    currentUser?.supervisorScope?.type || 'general_supervisor';
  const [selectedScopeType, setSelectedScopeType] = useState<SupervisorType>(initialScopeType);

  // Active Tab
  type SupTab =
    | 'overview' | 'attendance' | 'students' | 'spelling'
    | 'educational' | 'interventions' | 'nominations' | 'halaqahs';
  const VALID_TABS: SupTab[] = [
    'overview', 'attendance', 'students', 'spelling',
    'educational', 'interventions', 'nominations', 'halaqahs',
  ];
  const initialTab: SupTab = (() => {
    // HashRouter: query lives inside the hash — "#/supervisor?tab=students"
    const hashQuery = window.location.hash.split('?')[1] || '';
    const t = new URLSearchParams(hashQuery).get('tab');
    return VALID_TABS.includes(t as SupTab) ? (t as SupTab) : 'overview';
  })();
  const [activeTab, setActiveTab] = useState<SupTab>(initialTab);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [planModalStudent, setPlanModalStudent] = useState<Student | null>(null);
  const [comprehensiveStudent, setComprehensiveStudent] = useState<Student | null>(null);

  const isAssociationActive = isModuleEnabled(activeTenant, 'association');
  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');
  const isEducationalActive = isModuleEnabled(activeTenant, 'educational');

  // Active Role Config
  const activeRoleConfig = useMemo(() => {
    return (
      SUPERVISOR_ROLES_CONFIG.find((c) => c.type === selectedScopeType) ||
      SUPERVISOR_ROLES_CONFIG[0]
    );
  }, [selectedScopeType]);

  // Dynamic Effective Scope for filtering
  const effectiveScope: SupervisorScope = useMemo(() => {
    return {
      type: selectedScopeType,
      trackIds: activeRoleConfig.defaultTrackIds,
    };
  }, [selectedScopeType, activeRoleConfig]);

  // Filter students for active tenant
  const tenantStudents = useMemo(() => {
    return students.filter((s) => !activeTenantId || s.tenantId === activeTenantId);
  }, [students, activeTenantId]);

  // Filter halaqahs for active tenant & supervisor scope — permission-driven
  // (assignedStageIds / assignedHalaqahIds / supervisorScope / delegations)
  const rawTenantHalaqahs = useMemo(() => {
    return halaqahs.filter((h) => !activeTenantId || h.tenantId === activeTenantId);
  }, [halaqahs, activeTenantId]);

  const tenantHalaqahs = useMemo(() => {
    return filterHalaqahsByScope(rawTenantHalaqahs, currentUser);
  }, [rawTenantHalaqahs, currentUser]);

  // Filtered student list by the supervisor's actual permission scope
  const scopedStudents = useMemo(() => {
    return filterStudentsByScope(tenantStudents, currentUser, rawTenantHalaqahs);
  }, [tenantStudents, currentUser, rawTenantHalaqahs]);

  // Students tab — search + halaqah + stage filters
  const visibleStudents = useMemo(() => {
    return scopedStudents.filter((s) => {
      if (selectedHalaqahId !== 'all' && s.halaqahId !== selectedHalaqahId) return false;
      const halObj = rawTenantHalaqahs.find((h) => h.id === s.halaqahId);
      const stageId = s.stageId || halObj?.stageId;
      if (selectedStageFilter !== 'all' && stageId !== selectedStageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.trim();
        return (
          s.fullName.includes(q) ||
          (s.halaqahName || halObj?.name || '').includes(q)
        );
      }
      return true;
    });
  }, [scopedStudents, selectedHalaqahId, selectedStageFilter, searchQuery, rawTenantHalaqahs]);

  const scopedStageIds = useMemo(() => {
    const set = new Set<string>();
    for (const h of tenantHalaqahs) if (h.stageId) set.add(h.stageId);
    for (const s of scopedStudents) if (s.stageId) set.add(s.stageId);
    return Array.from(set);
  }, [tenantHalaqahs, scopedStudents]);

  // Interventions / At-risk plans
  const atRiskPlans = useMemo(() => {
    return (quranPlans || []).filter((p) => {
      const isTenant = !activeTenantId || p.tenantId === activeTenantId;
      return isTenant && (p.status === 'at_risk' || p.targetAtRiskDiagnostic);
    });
  }, [quranPlans, activeTenantId]);

  // Scoped Nominations
  const scopedTrackNominations = useMemo(() => {
    const tenantNoms = (trackNominations || []).filter(
      (n) => !activeTenantId || n.tenantId === activeTenantId
    );
    return filterNominationsForSupervisor(tenantNoms, effectiveScope);
  }, [trackNominations, activeTenantId, effectiveScope]);

  // Pending nominations for supervisor
  const pendingNominationsCount = useMemo(() => {
    const legacyPending =
      selectedScopeType === 'general_supervisor' || selectedScopeType === 'quran_supervisor'
        ? (associationNominations || []).filter((n) => {
            const isTenant = !activeTenantId || n.tenantId === activeTenantId;
            return isTenant && n.supervisorStatus === 'pending';
          }).length
        : 0;

    const trackPending = scopedTrackNominations.filter(
      (n) => n.status === 'submitted' || n.status === 'internal_exam_completed'
    ).length;

    return legacyPending + trackPending;
  }, [associationNominations, scopedTrackNominations, activeTenantId, selectedScopeType]);

  // Spelling Track Metrics
  const spellingMetrics = useMemo(() => {
    const lessonsCount = spellingLessons.length;
    const activeLessons = spellingLessons.filter((l) => l.isActive);
    let totalScoreSum = 0;
    let recordsCount = 0;

    sessionRecords.forEach((r) => {
      const score = r.spelling?.finalScore;
      if (score !== undefined && score > 0) {
        totalScoreSum += score;
        recordsCount++;
      }
    });

    const averageMastery = recordsCount > 0 ? Math.round(totalScoreSum / recordsCount) : 92;
    return {
      lessonsCount,
      activeLessonsCount: activeLessons.length,
      averageMastery,
    };
  }, [spellingLessons, sessionRecords]);

  // Educational Plan Metrics
  const educationalMetrics = useMemo(() => {
    const totalWeeks = educationalPlan.length;
    const completedWeeks = educationalPlan.filter((w) => w.status === 'completed').length;
    const inProgressWeeks = educationalPlan.filter((w) => w.status === 'in_progress').length;
    const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek);

    return {
      totalWeeks,
      completedWeeks,
      inProgressWeeks,
      currentWeekPlan,
    };
  }, [educationalPlan, academicConfig]);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* 1. SUPERVISOR HERO BANNER WITH SCOPE BADGE */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-lg border ${
                selectedScopeType === 'quran_supervisor'
                  ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
                  : selectedScopeType === 'spelling_supervisor'
                  ? 'bg-amber-600/30 text-amber-400 border-amber-500/40'
                  : selectedScopeType === 'educational_supervisor'
                  ? 'bg-purple-600/30 text-purple-400 border-purple-500/40'
                  : selectedScopeType === 'stage_supervisor'
                  ? 'bg-indigo-600/30 text-indigo-400 border-indigo-500/40'
                  : 'bg-blue-600/30 text-blue-400 border-blue-500/40'
              }`}
            >
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-serif">
                  {selectedScopeType === 'quran_supervisor'
                    ? 'بوابة المشرف القرآني التخصصي'
                    : selectedScopeType === 'spelling_supervisor'
                    ? 'بوابة مشرف الهجاء القرآني والتأسيس'
                    : selectedScopeType === 'educational_supervisor'
                    ? 'بوابة المشرف التربوي والقيمي'
                    : selectedScopeType === 'stage_supervisor'
                    ? 'بوابة مشرف المرحلة التعليمية'
                    : 'بوابة الإشراف العام الشامل'}
                </h1>
                <span className="text-[11px] font-black px-3 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/40">
                  {activeRoleConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {activeRoleConfig.description}
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2">
                <span>{activeTenant?.name || ''}</span>
                <span>•</span>
                <span>الأسبوع الأكاديمي {academicConfig.currentWeek}</span>
                <span>•</span>
                <span>المشرف: {currentUser?.name || 'المشرف المعتمد'}</span>
              </div>
            </div>
          </div>

          {/* Scope Selector Pills (Role + Scope Switcher) */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2 shrink-0">
            <div className="text-[10px] text-slate-400 font-bold px-2 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-slate-400" />
                <span>نطاق الإشراف النشط (Scope):</span>
              </span>
              <span className="text-emerald-400 font-mono">RBAC P8</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {SUPERVISOR_ROLES_CONFIG.filter((c) => c.type !== 'admissions_supervisor').map((conf) => {
                const isSelected = selectedScopeType === conf.type;
                return (
                  <button
                    key={conf.type}
                    onClick={() => setSelectedScopeType(conf.type)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                    }`}
                  >
                    {conf.type === 'general_supervisor'
                      ? 'إشراف عام'
                      : conf.type === 'quran_supervisor'
                      ? 'المسار القرآني'
                      : conf.type === 'spelling_supervisor'
                      ? 'مسار الهجاء'
                      : conf.type === 'educational_supervisor'
                      ? 'المسار القيمي'
                      : 'مشرف مرحلة'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic High-Level KPIs Based on Scope */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="text-slate-400 text-xs font-semibold mb-1">الحلقات المشمولة بالنطاق</div>
            <div className="text-2xl font-black text-white font-mono">{tenantHalaqahs.length}</div>
            <div className="text-[11px] text-emerald-400 mt-1">حلقات مرصودة بنشاط</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="text-slate-400 text-xs font-semibold mb-1">الطلاب في نطاق الإشراف</div>
            <div className="text-2xl font-black text-white font-mono">{scopedStudents.length}</div>
            <div className="text-[11px] text-slate-300 mt-1">
              {selectedScopeType === 'spelling_supervisor'
                ? 'طلاب مسار التأسيس'
                : selectedScopeType === 'educational_supervisor'
                ? 'مشمولون بالقيم'
                : 'في مسارات الحفظ والمراجعة'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="text-slate-400 text-xs font-semibold mb-1">
              {selectedScopeType === 'spelling_supervisor'
                ? 'معدل إتقان الهجاء والتأسيس'
                : selectedScopeType === 'educational_supervisor'
                ? 'إنجاز الخطة القيمية'
                : 'تنبيهات التعثر القرآني'}
            </div>
            <div
              className={`text-2xl font-black font-mono ${
                selectedScopeType === 'educational_supervisor'
                  ? 'text-purple-400'
                  : selectedScopeType === 'spelling_supervisor'
                  ? 'text-amber-400'
                  : 'text-amber-400'
              }`}
            >
              {selectedScopeType === 'spelling_supervisor'
                ? `${spellingMetrics.averageMastery}%`
                : selectedScopeType === 'educational_supervisor'
                ? `${Math.round((educationalMetrics.completedWeeks / Math.max(1, educationalMetrics.totalWeeks)) * 100)}%`
                : atRiskPlans.length}
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              {selectedScopeType === 'spelling_supervisor'
                ? `من ${spellingMetrics.activeLessonsCount} دروس نشطة`
                : selectedScopeType === 'educational_supervisor'
                ? `${educationalMetrics.completedWeeks} أسبوعاً مكتملاً`
                : 'تتطلب مراجعة المشرف'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="text-slate-400 text-xs font-semibold mb-1">ترشيحات بانتظار الاعتماد</div>
            <div className="text-2xl font-black text-white font-mono">{pendingNominationsCount}</div>
            <div className="text-[11px] text-slate-300 mt-1">
              {selectedScopeType === 'general_supervisor'
                ? 'كافة مسارات المجمع'
                : `في ${activeRoleConfig.label}`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTROLS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المتابعة الشاملة</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
          <span>الحضور الذكي بالموقع</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'students'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>الطلاب ({scopedStudents.length})</span>
        </button>

        {/* Spelling Tab: available for General, Spelling, and Stage supervisors */}
        {(selectedScopeType === 'general_supervisor' ||
          selectedScopeType === 'spelling_supervisor' ||
          selectedScopeType === 'stage_supervisor') &&
          isSpellingActive && (
            <button
              onClick={() => setActiveTab('spelling')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'spelling'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>بنك دروس الهجاء ({spellingLessons.length})</span>
            </button>
          )}

        {/* Educational Tab: available for General, Educational, and Stage supervisors */}
        {(selectedScopeType === 'general_supervisor' ||
          selectedScopeType === 'educational_supervisor' ||
          selectedScopeType === 'stage_supervisor') &&
          isEducationalActive && (
            <button
              onClick={() => setActiveTab('educational')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'educational'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>الخطة القيمية والأنشطة ({educationalPlan.length})</span>
            </button>
          )}

        {/* Interventions Radar: Quran & General */}
        {(selectedScopeType === 'general_supervisor' || selectedScopeType === 'quran_supervisor') && (
          <button
            onClick={() => setActiveTab('interventions')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'interventions'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>رادار التدخل وإعادة الحساب ({atRiskPlans.length})</span>
          </button>
        )}

        {/* Nominations & Association Tab */}
        {isAssociationActive && (
          <button
            onClick={() => setActiveTab('nominations')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'nominations'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-teal-400" />
            <span>ترشيحات واختبارات المسارات ({pendingNominationsCount})</span>
          </button>
        )}

        {/* Halaqahs Quality */}
        <button
          onClick={() => setActiveTab('halaqahs')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'halaqahs'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>تقييم جودة الحلقات</span>
        </button>
      </div>

      {/* 3. TAB VIEWS */}

      {activeTab === 'attendance' && <SmartAttendanceWidget />}

      {/* TAB: STUDENTS — scoped list with search + filters + quran plan actions */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">طلاب نطاق الإشراف ({visibleStudents.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">جميع الطلاب ضمن مراحلك وحلقاتك المسندة — بحث وفلترة وإدارة الخطط</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث باسم الطالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={selectedHalaqahId}
                onChange={(e) => setSelectedHalaqahId(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="all">كل الحلقات</option>
                {tenantHalaqahs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="all">كل المراحل</option>
                {scopedStageIds.map((sid) => (
                  <option key={sid} value={sid}>
                    {stages.find((st) => st.id === sid)?.name || sid}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {visibleStudents.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400 font-bold">
                لا يوجد طلاب مطابقون داخل نطاق إشرافك
              </div>
            )}
            {visibleStudents.map((s) => {
              const halObj = rawTenantHalaqahs.find((h) => h.id === s.halaqahId);
              const stageId = s.stageId || halObj?.stageId;
              const canOpenPlan = hasPermission(
                currentUser,
                'view_quran',
                s.halaqahId,
                stageId,
                rawTenantHalaqahs,
                activeTenant
              );
              const canEdit = hasPermission(
                currentUser,
                'manage_quran_plan',
                s.halaqahId,
                stageId,
                rawTenantHalaqahs,
                activeTenant
              );
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900">{s.fullName}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5">
                        {s.grade}
                      </span>
                      {stageId && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-1.5 py-0.5">
                          {stages.find((st) => st.id === stageId)?.name || stageId}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold mt-0.5 truncate">
                      {halObj?.name || s.halaqahName || '—'} • المعلم: {s.teacherName || halObj?.teacherName || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canOpenPlan && (
                      <button
                        onClick={() => setPlanModalStudent(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title={canEdit ? 'الخطة القرآنية — عرض وإدارة' : 'الخطة القرآنية — عرض فقط'}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">الخطة القرآنية</span>
                      </button>
                    )}
                    <button
                      onClick={() => setComprehensiveStudent(s)}
                      className="inline-flex items-center justify-center p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      title="الخطة القرآنية الشاملة"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW & SCOPED HALAQAHS GRID */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  متابعة أداء الحلقات ({activeRoleConfig.label})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  استعراض الحلقات والكوادر التعليمية المسندة للنطاق ومؤشرات الانتظام اليومي
                </p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث باسم الحلقة أو المعلم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Halaqah Performance Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {tenantHalaqahs
                .filter(
                  (hal) =>
                    !searchQuery ||
                    hal.name.includes(searchQuery) ||
                    teachers.find((t) => t.id === hal.teacherId)?.name.includes(searchQuery)
                )
                .map((hal) => {
                  const halStudents = tenantStudents.filter((s) => s.halaqahId === hal.id);
                  const teacher = teachers.find((t) => t.id === hal.teacherId);
                  const halNoms = scopedTrackNominations.filter((n) => n.halaqahId === hal.id);

                  return (
                    <div
                      key={hal.id}
                      className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{hal.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            المعلم: {teacher?.name || 'غير محدد'}
                          </p>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {halStudents.length} طلاب
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">المستهدف القرآني:</span>
                          <strong className="text-slate-900 font-serif">
                            {hal.targetSurah || activeTenant?.targetSurahDefault || 'سورة الغاشية'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">ترشيحات المسارات:</span>
                          <span className="font-bold text-teal-800 font-mono">
                            {halNoms.length} مرشح
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">انتظام التسميع الأسبوعي:</span>
                          <strong className="text-emerald-700 font-mono">95%</strong>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">حالة الخطة: معتمدة ومقفلة</span>
                        <span className="text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> منتظمة
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SPELLING CURRICULUM & MASTERY */}
      {activeTab === 'spelling' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>بنك دروس الهجاء القرآني ومستويات التمكن (القاعدة النورانية المطورة)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                متابعة تدرج الدروس ونسب التمكن والاختبارات التأسيسية عبر كافة الحلقات والطلاب
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                إجمالي الدروس: {spellingLessons.length}
              </span>
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spellingLessons.map((lesson) => {
              const studentsInLesson = scopedStudents.filter(
                (s) => s.currentSpellingLessonId === lesson.id
              ).length;

              return (
                <div
                  key={lesson.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                        الدرس {lesson.lessonNumber}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1.5">{lesson.title}</h4>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-800 bg-white px-2 py-1 rounded-lg border border-slate-200">
                      درجة النجاح {lesson.passingScore}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {lesson.skill || lesson.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">الطلاب في هذا المستوى:</span>
                    <strong className="text-amber-800 font-bold">{studentsInLesson} طلاب</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: EDUCATIONAL / VALUES PLAN */}
      {activeTab === 'educational' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <span>الخطة التربوية والقيمية الأسبوعية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                متابعة غرس القيم والأنشطة الأسبوعية وميزانيات المبادرات والشعارات
              </p>
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
              الأسبوع النشط: {academicConfig.currentWeek}
            </div>
          </div>

          <div className="space-y-4">
            {educationalPlan.map((planWeek) => {
              const isCurrent = planWeek.weekNumber === academicConfig.currentWeek;
              return (
                <div
                  key={planWeek.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isCurrent
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {planWeek.weekNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">
                            قيمة الأسبوع: {planWeek.educationalGoal}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
                              الأسبوع الحالي
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">الشعار: {planWeek.motto}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={`font-bold px-2.5 py-1 rounded-lg ${
                          planWeek.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : planWeek.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {planWeek.status === 'completed'
                          ? 'مكتملة'
                          : planWeek.status === 'in_progress'
                          ? 'قيد التطبيق'
                          : 'مخططة'}
                      </span>
                    </div>
                  </div>

                  {planWeek.activity && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-slate-700 font-medium">النشاط التطبيقي: {planWeek.activity}</span>
                      </div>
                      {planWeek.budget > 0 && (
                        <span className="text-slate-500 font-mono">الميزانية: {planWeek.budget} ريال</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: AT-RISK INTERVENTIONS RADAR */}
      {activeTab === 'interventions' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              رادار التدخل المبكر وإعادة الحساب القرآني
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              قائمة الطلاب الذين قام المحرك القرآني بإعادة جدولة خططهم أو الذين تأخروا عن وتيرة الحفظ
            </p>
          </div>

          {atRiskPlans.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-bold text-sm">
                كافة خطط الطلاب منتظمة وتسير وفق المستهدف القرآني بدقة
              </div>
              <p className="text-slate-500 mt-1">
                المحرك القرآني يراقب الحضور والتسميع بشكل مستمر ويعيد الحساب تلقائياً عند أي غياب.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskPlans.map((plan) => {
                const student = tenantStudents.find((s) => s.id === plan.studentId);
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {student?.fullName || student?.name || plan.studentId}
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        تشخيص المحرك:{' '}
                        {typeof plan.targetAtRiskDiagnostic === 'object' &&
                        plan.targetAtRiskDiagnostic !== null
                          ? (plan.targetAtRiskDiagnostic as any).message ||
                            (plan.targetAtRiskDiagnostic as any).reason ||
                            'تراكم في ورد المراجعة يتطلب تدخلاً'
                          : plan.targetAtRiskDiagnostic ||
                            'تراكم في المراجعة الصغرى يتطلب تركيزاً إضافياً'}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-200 text-amber-900">
                      معاد حسابه آلياً
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TRACK NOMINATIONS & ASSOCIATION */}
      {activeTab === 'nominations' && isAssociationActive && (
        <div>
          <AssociationNominationsTab />
        </div>
      )}

      {/* TAB 6: HALAQAHS QUALITY & COMPLIANCE */}
      {activeTab === 'halaqahs' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              تقييم جودة الحلقات والتزام المعلمين ({activeRoleConfig.label})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مؤشرات الأداء النوعي والانضباط اليومي للحلقات المندرجة تحت هذا النطاق
            </p>
          </div>

          <div className="space-y-4">
            {tenantHalaqahs.map((hal) => {
              const teacher = teachers.find((t) => t.id === hal.teacherId);
              return (
                <div
                  key={hal.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{hal.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      المعلم: {teacher?.name || 'غير محدد'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-500 block">رصد التسميع اليومي:</span>
                      <strong className="text-emerald-700">مكتمل يومياً بنسبة 100%</strong>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      ممتاز
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quran Plan Modals — gated internally by manage_quran_plan (edit) */}
      <StudentQuranPlanModal
        isOpen={Boolean(planModalStudent)}
        student={planModalStudent}
        onClose={() => setPlanModalStudent(null)}
      />
      {comprehensiveStudent && (
        <ComprehensiveQuranPlanModal
          student={comprehensiveStudent}
          variant="teacher"
          onClose={() => setComprehensiveStudent(null)}
        />
      )}
    </div>
  );
};
