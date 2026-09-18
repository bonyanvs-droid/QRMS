import { INITIAL_TENANTS } from "./data/initialData";
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { PublicDashboard } from './components/public/PublicDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { SpellingBankView } from './components/spelling/SpellingBankView';
import { QuranOutcomesView } from './components/quran/QuranOutcomesView';
import { EducationalPlanView } from './components/educational/EducationalPlanView';
import { SeasonalProgramsView } from './components/educational/SeasonalProgramsView';
import { ReportsCenterView } from './components/reports/ReportsCenterView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ParentPortal } from './components/parent/ParentPortal';
import { StudentPortalView } from './components/student/StudentPortalView';
import { PlatformLandingPage } from './components/platform/PlatformLandingPage';
import { TenantPublicPage } from './components/tenant/TenantPublicPage';
import { OrganizationPublicPage } from './components/organization/OrganizationPublicPage';
import { SystemAdminPlatformDashboard } from './components/admin/SystemAdminPlatformDashboard';
import { SupervisorDashboard } from './components/supervisor/SupervisorDashboard';
import { CharityHQDashboard } from './components/admin/CharityHQDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { getRolePortalRoute } from './lib/roleRoutes';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { DemoBanner } from './components/common/DemoBanner';
import { PasswordChangeModal } from './components/common/PasswordChangeModal';
import { AutoAttendanceTracker } from './components/common/AutoAttendanceTracker';
import { MosqueLogo } from './components/common/logos/MosqueLogo';
import { isModuleEnabled } from './lib/moduleChecker';
import { resolveTenant } from './lib/tenantResolver';
import { getNavigationGroups } from './lib/navigationConfig';
import { GlobalSidebar } from './components/common/GlobalSidebar';
import { ReportDispatchModal } from './components/common/ReportDispatchModal';
import { MeetingsManagementView } from './components/meetings/MeetingsManagementView';
import { generateGeneralParentsGroupReport } from './utils/reportGenerator';
import { calculateAggregateMetrics } from './utils/statusCalculator';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  BookOpen,
  Send,
  Shield,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Building2,
  LogOut,
  LogIn,
} from 'lucide-react';
import { safeStorage } from './lib/safeStorage';

// AGENT_WRITE_TEST: verified cloud filesystem sync - QRMS Platform
// Wrapper for Tenant Route parameter e.g. /t/:tenantSlug
const TenantRouteWrapper: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenants, setActiveTenantId } = useApp();

  useEffect(() => {
    if (tenantSlug) {
      const matched = tenants.find((t) => t.id === tenantSlug || t.slug === tenantSlug);
      if (matched) {
        setActiveTenantId(matched.id);
      }
    }
  }, [tenantSlug, tenants, setActiveTenantId]);

  return <TenantPublicPage />;
};

const AdminAuthGateway: React.FC = () => {
  const { enterDemoSession, activeTenant } = useApp();
  const [showLoginModal, setShowLoginModal] = useState(true);
  const navigate = useNavigate();

  const handleDemoAdmin = async () => {
    await enterDemoSession(activeTenant?.id || 'al-furqan', 'campus_admin');
    navigate('/admin/reports_settings');
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 shadow-xs">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">لوحة تحكم إدارة المجمع القرآني</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeTenant?.name || 'منظومة إدارة المجمعات القرآنية (QRMS)'}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            يلزم تسجيل الدخول بصلاحيات الإدارة للوصول إلى لوحة التحكم وإعدادات التقارير
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول إلى لوحة الإدارة</span>
          </button>

          <button
            onClick={handleDemoAdmin}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>تجربة فورية كمدير مجمع (دخول مباشر)</span>
          </button>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        adminOnly={true}
      />
    </div>
  );
};

const MainLayout: React.FC = () => {
  useEffect(() => {
    const isDark = safeStorage.getItem('school_screen_dark_mode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const {
    currentRole,
    currentUser,
    activeTenant,
    academicOutcome,
    tenants,
    setActiveTenantId,
    activeTenantId,
    login,
    logout,
    students,
    sessionRecords,
    spellingLessons,
    educationalPlan,
    academicConfig,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null);
  const [platformLoginOpen, setPlatformLoginOpen] = useState(false);
  const [platformLoginAdminOnly, setPlatformLoginAdminOnly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // General Parents Group Report modal state
  const [showGroupReportModal, setShowGroupReportModal] = useState(false);
  const [groupReportData, setGroupReportData] = useState<{
    title: string;
    content: string;
    recipientName: string;
    recipientPhone: string;
    recipientType: 'general_group' | 'parent' | 'teacher';
    reportType: 'general' | 'weekly' | 'prep' | 'monthly' | 'daily';
  }>({
    title: '',
    content: '',
    recipientName: '',
    recipientPhone: '',
    recipientType: 'general_group',
    reportType: 'general',
  });

  const handleOpenGeneralGroupReport = () => {
    const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek);
    const aggregateMetrics = calculateAggregateMetrics(students, sessionRecords, spellingLessons, academicConfig);
    const content = generateGeneralParentsGroupReport(academicConfig, currentWeekPlan, aggregateMetrics);

    setGroupReportData({
      title: 'تقرير جروب أولياء الأمور العام',
      content,
      recipientName: 'جروب أولياء الأمور العام',
      recipientPhone: '',
      recipientType: 'general_group',
      reportType: 'general',
    });
    setShowGroupReportModal(true);
  };

  // Synchronous resolution of user to guarantee immediate route protection & prevent race conditions
  const effectiveUser = currentUser || (() => {
    try {
      const saved = safeStorage.getItem('al_ghazzawi_current_user_v4');
      if (saved && saved !== 'null') {
        const u = JSON.parse(saved);
        if (u && u.id) return u;
      }
    } catch {}
    return null;
  })();

  // Authoritative dynamic navigation items matching role & tenant modules
  const campusFallback = activeTenant?.id ? `/t/${activeTenant.id}` : '/';

  // For the mobile bottom bar, flatten groups and take the first 5 core items
  const bottomNavItems = useMemo(() => {
    const groups = getNavigationGroups(effectiveUser, activeTenant);
    return groups.flatMap(g => g.items).slice(0, 5);
  }, [effectiveUser, activeTenant]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // Sync tenant from URL params (e.g. ?tenant=ghazzawi or ?tenant=al-furqan)
  useEffect(() => {
    const resolved = resolveTenant(tenants, currentUser, {
      pathname: location.pathname,
      search: location.search,
    });
    if (resolved.tenantId && resolved.tenantId !== activeTenantId) {
      setActiveTenantId(resolved.tenantId);
    }
  }, [location.search, location.pathname, currentUser, tenants, activeTenantId, setActiveTenantId]);

  // Dynamically update document title and favicon (defaulting to Quran icon/platform name)
  useEffect(() => {
    const isPlatformView =
      location.pathname === '/' ||
      location.pathname === '/platform' ||
      location.pathname === '/tenants' ||
      location.pathname === '/organizations' ||
      location.pathname === '/quotas' ||
      location.pathname === '/health' ||
      !activeTenant;

    const baseTitle = isPlatformView || !activeTenant
      ? 'نظام إدارة المجمعات القرآنية – Quranic Centers Management System'
      : `${activeTenant.name} – نظام إدارة المجمعات القرآنية`;

    document.title = baseTitle;

    // Update favicon: use tenant custom logo if available, or fall back to Quran icon
    const faviconUrl = !isPlatformView && activeTenant?.logoUrl ? activeTenant.logoUrl : '/quran-favicon.svg';
    let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = faviconUrl;
  }, [activeTenant, location.pathname]);

  // Derive active tab from current route pathname
  const activeTab = useMemo(() => {
    const path = location.pathname.replace(/^\//, '');
    if (!path) return effectiveUser ? (effectiveUser.role === 'system_admin' ? 'tenants' : 'public') : 'platform';
    if (['admin', 'admissions', 'finances', 'nominations', 'support'].includes(path) || path.startsWith('admin/')) return 'admin';
    if (path === 'tenants') return 'tenants';
    if (path === 'organizations') return 'organizations';
    if (path === 'quotas') return 'quotas';
    if (path === 'health') return 'health';
    if (path === 'charity-hq' || path === 'charity_hq') return 'charity_hq';
    if (path === 'system-admin') return 'tenants';
    if (path === 'platform' || path === 'public' || path.startsWith('t/')) return 'public';
    if (path.startsWith('org/') || path.startsWith('charity/')) return 'public';
    if (path === 'supervisor') return 'supervisor';
    if (path === 'student') return 'student';
    return path;
  }, [location.pathname, effectiveUser]);

  const handleNavigateTab = (tab: string) => {
    switch (tab) {
      case 'platform':
        navigate('/platform');
        break;
      case 'platform_dashboard':
      case 'tenants':
        navigate('/tenants');
        break;
      case 'organizations':
        navigate('/organizations');
        break;
      case 'quotas':
        navigate('/quotas');
        break;
      case 'health':
        navigate('/health');
        break;
      case 'charity_hq':
      case 'charity-hq':
        navigate('/charity-hq');
        break;
      case 'public':
        if (effectiveUser?.role === 'system_admin') {
          navigate('/platform');
        } else {
          const userTenantSlug = activeTenant?.slug || activeTenant?.id || effectiveUser?.tenantId || (INITIAL_TENANTS[0]?.id);
          navigate(`/t/${userTenantSlug}`);
        }
        break;
      case 'parent':
        navigate('/parent');
        break;
      case 'student':
        navigate('/student');
        break;
      case 'teacher':
        navigate('/teacher');
        break;
      case 'supervisor':
        navigate('/supervisor');
        break;
      case 'spelling':
        navigate('/spelling');
        break;
      case 'quran':
        navigate('/quran');
        break;
      case 'educational':
        navigate('/educational');
        break;
      case 'reports':
        navigate('/reports');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate(`/${tab}`);
    }
  };

  // Determine if global header and footer should be hidden
  // (Platform landing page, Charity public page, and Tenant public pages provide their own self-contained layouts)
  const isStandalonePublicPage = useMemo(() => {
    const path = location.pathname;
    if (path === '/platform') return true;
    if (!effectiveUser && path === '/') return true;
    if (path.startsWith('/t/')) return true;
    if (!effectiveUser && path === '/public') return true;
    if (path.startsWith('/org/') || path.startsWith('/charity/')) return true;
    return false;
  }, [effectiveUser, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans flex flex-col selection:bg-emerald-200 selection:text-emerald-950">
      <DemoBanner />
      <PWAInstallBanner />
      <AutoAttendanceTracker />

      {/* Global Header (shown ONLY for authenticated role portals and internal module views) */}
      {!isStandalonePublicPage && (
        <Header
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          onNavigateToPlatform={() => navigate('/')}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
          isMobileMenuOpen={mobileMenuOpen}
          onOpenGeneralGroupReport={handleOpenGeneralGroupReport}
        />
      )}

      {/* App Shell Body: Persistent Global Sidebar + Routed Page Content */}
      <div className="flex-1 w-full flex items-stretch">
        {/* Global Persistent Sidebar on Desktop */}
        {!isStandalonePublicPage && (
          <GlobalSidebar
            activeTenant={activeTenant}
            currentUser={effectiveUser}
            onOpenGroupReport={handleOpenGeneralGroupReport}
            onLogout={handleLogout}
          />
        )}

        {/* Global Mobile Navigation Drawer (slides over upon clicking hamburger ☰) */}
        {!isStandalonePublicPage && (
          <GlobalSidebar
            isDrawer
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            activeTenant={activeTenant}
            currentUser={effectiveUser}
            onOpenGroupReport={handleOpenGeneralGroupReport}
            onLogout={handleLogout}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 min-w-0 w-full ${isStandalonePublicPage ? '' : 'p-3 sm:p-5 lg:p-6 pb-24 lg:pb-12 max-w-7xl'}`}>
          <Routes>
          {/* TIER 1: PLATFORM COMMERCIAL WEBSITE */}
          <Route
            path="/"
            element={
              effectiveUser ? (
                <Navigate to={getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId)} replace />
              ) : (
                <PlatformLandingPage
                  onNavigateToTenant={(id) => {
                    setActiveTenantId(id);
                    navigate(`/t/${id}`);
                  }}
                  onOpenPlatformAdminLogin={() => {
                    setPlatformLoginAdminOnly(true);
                    setPlatformLoginOpen(true);
                  }}
                  onOpenLogin={() => {
                    setPlatformLoginAdminOnly(false);
                    setPlatformLoginOpen(true);
                  }}
                />
              )
            }
          />

          <Route
            path="/platform"
            element={
              <PlatformLandingPage
                onNavigateToTenant={(id) => {
                  setActiveTenantId(id);
                  navigate(`/t/${id}`);
                }}
                onOpenPlatformAdminLogin={() => {
                  setPlatformLoginAdminOnly(true);
                  setPlatformLoginOpen(true);
                }}
                onOpenLogin={() => {
                  setPlatformLoginAdminOnly(false);
                  setPlatformLoginOpen(true);
                }}
              />
            }
          />

          {/* TIER 2: TENANT & CHARITY PUBLIC PORTALS */}
          <Route path="/t/:tenantSlug" element={<TenantRouteWrapper />} />
          <Route path="/public" element={<TenantPublicPage />} />
          <Route path="/org/:orgId" element={<OrganizationPublicPage />} />
          <Route path="/charity/:orgId" element={<OrganizationPublicPage />} />

          {/* TIER 3: AUTHENTICATED ROLE PORTALS */}
          {/* 1. System Admin Platform Dashboard */}
          <Route
            path="/system-admin"
            element={
              effectiveUser?.role === 'system_admin' ? (
                <SystemAdminPlatformDashboard initialTab="tenants" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/tenants"
            element={
              effectiveUser?.role === 'system_admin' ? (
                <SystemAdminPlatformDashboard initialTab="tenants" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/organizations"
            element={
              effectiveUser?.role === 'system_admin' ? (
                <SystemAdminPlatformDashboard initialTab="organizations" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/quotas"
            element={
              effectiveUser?.role === 'system_admin' ? (
                <SystemAdminPlatformDashboard initialTab="quotas" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/health"
            element={
              effectiveUser?.role === 'system_admin' ? (
                <SystemAdminPlatformDashboard initialTab="health" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* 1.5. Charity Multi-Tenant HQ Dashboard */}
          <Route
            path="/charity-hq"
            element={
              effectiveUser && ['charity_supervisor', 'system_admin'].includes(effectiveUser.role) ? (
                <CharityHQDashboard />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />
          <Route
            path="/charity_hq"
            element={
              effectiveUser && ['charity_supervisor', 'system_admin'].includes(effectiveUser.role) ? (
                <CharityHQDashboard />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          {/* 2. Quranic Supervisor Dashboard */}
          <Route
            path="/supervisor"
            element={
              effectiveUser?.role === 'supervisor' || effectiveUser?.role === 'system_admin' ? (
                <SupervisorDashboard />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          {/* 3. Teacher Dashboard */}
          <Route
            path="/teacher"
            element={
              effectiveUser && ['teacher', 'campus_admin', 'supervisor', 'system_admin', 'admin', 'charity_supervisor'].includes(effectiveUser.role) ? (
                <TeacherDashboard onSelectStudentProfile={(id) => setSelectedStudentProfileId(id)} />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          {/* 4. Parent Portal */}
          <Route path="/parent" element={<ParentPortal />} />

          {/* 5. Student Portal */}
          <Route path="/student" element={<StudentPortalView />} />

          {/* 6. Campus Admin Dashboard */}
          <Route
            path="/admin"
            element={
              effectiveUser ? (
                <AdminDashboard />
              ) : (
                <AdminAuthGateway />
              )
            }
          />
          <Route
            path="/admin/:subtab"
            element={
              effectiveUser ? (
                <AdminDashboard />
              ) : (
                <AdminAuthGateway />
              )
            }
          />

          {/* MODULE-GUARDED FUNCTIONAL ROUTES */}
          {/* Spelling Module */}
          <Route
            path="/spelling"
            element={
              isModuleEnabled(activeTenant, 'spelling') ? (
                <SpellingBankView />
              ) : (
                <Navigate to="/quran" replace />
              )
            }
          />

          {/* Quran Engine Module */}
          <Route path="/quran" element={<QuranOutcomesView />} />

          {/* Educational Plan Module (البرنامج التربوي العام) */}
          <Route
            path="/educational"
            element={
              isModuleEnabled(activeTenant, 'educational') ? (
                <EducationalPlanView />
              ) : (
                <Navigate to="/quran" replace />
              )
            }
          />

          {/* Seasonal Programs Module (البرامج والأنشطة الموسمية المستقلة) */}
          <Route
            path="/seasonal-programs"
            element={
              currentUser ? (
                <SeasonalProgramsView />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          <Route
            path="/admin/seasonal-programs"
            element={
              currentUser ? (
                <SeasonalProgramsView />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          {/* Reports Center Module */}
          <Route
            path="/reports"
            element={
              isModuleEnabled(activeTenant, 'reports') && currentUser ? (
                <ReportsCenterView />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          {/* Meetings & Minutes Module */}
          <Route
            path="/meetings"
            element={
              currentUser ? (
                <MeetingsManagementView />
              ) : (
                <Navigate to={campusFallback} replace />
              )
            }
          />

          {/* Administrative Sub-tabs */}
          <Route
            path="/admissions"
            element={
              isModuleEnabled(activeTenant, 'admissions') && currentUser ? (
                <AdminDashboard initialTab="admissions" />
              ) : (
                <Navigate to="/admin" replace />
              )
            }
          />

          <Route
            path="/finances"
            element={
              isModuleEnabled(activeTenant, 'finances') && currentUser ? (
                <AdminDashboard initialTab="finances" />
              ) : (
                <Navigate to="/admin" replace />
              )
            }
          />

          <Route
            path="/nominations"
            element={
              isModuleEnabled(activeTenant, 'association') && currentUser ? (
                <AdminDashboard initialTab="nominations" />
              ) : (
                <Navigate to="/admin" replace />
              )
            }
          />

          <Route
            path="/support"
            element={
              currentUser ? (
                <AdminDashboard initialTab="support" />
              ) : (
                <Navigate to="/admin" replace />
              )
            }
          />

          {/* Direct Setting Aliases */}
          <Route path="/financial_settings" element={<Navigate to="/admin/financial_settings" replace />} />
          <Route path="/financial-settings" element={<Navigate to="/admin/financial_settings" replace />} />
          <Route path="/admissions_settings" element={<Navigate to="/admin/admissions_settings" replace />} />
          <Route path="/admissions-settings" element={<Navigate to="/admin/admissions_settings" replace />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>

      {/* Institutional Footer (Shown ONLY on authenticated portal pages) */}
      {!isStandalonePublicPage && (
        <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-xs text-slate-700">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {effectiveUser?.role === 'system_admin' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white flex items-center justify-center shadow-xs">
                    <Shield className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">منظومة School Screen المركزية</div>
                    <div className="text-[11px] text-emerald-800 font-semibold">بوابة إدارة وتشغيل المجمعات القرآنية</div>
                  </div>
                </div>

                <div className="text-slate-500 text-[11px] text-center md:text-left">
                  <span>منصة School Screen لإدارة المجمعات القرآنية</span>
                  <div className="text-[10px] text-slate-400">الإصدار السحابي 2.5 (SaaS Multi-Tenant) • جميع الحقوق محفوظة</div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <MosqueLogo size="sm" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{activeTenant?.name || ''}</div>
                    <div className="text-[11px] text-emerald-800 font-semibold">حلقات القرآن الكريم والتربية</div>
                  </div>
                </div>

                <div className="text-center">
                  {academicOutcome && (
                    <div className="text-emerald-900 font-bold font-quran text-base">
                      {academicOutcome}
                    </div>
                  )}
                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                    محبة • انتماء • عطاء • «نَغْرِسُ اليوم .. لنَحْصُدَ غَداً»
                  </div>
                </div>

                <div className="text-slate-500 text-[11px] text-center md:text-left">
                  <span>منصة School Screen لإدارة المجمعات القرآنية</span>
                  <div className="text-[10px] text-slate-400">الإصدار السحابي 2.5 (SaaS Multi-Tenant)</div>
                </div>
              </>
            )}
          </div>
        </footer>
      )}

      {/* Mobile Bottom Bar for Quick Navigation (Strict 1:1 Parity with Sidebar) */}
      {effectiveUser && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl px-1 sm:px-2 py-1 flex items-center justify-around overflow-x-auto scrollbar-none">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const itemPath = item.path || '';
            const [itemPathname, itemSearch] = itemPath.split('?');
            const isActive = Boolean(itemPath) && (
              itemSearch
                ? location.pathname === itemPathname && location.search.includes(itemSearch)
                : (location.pathname === itemPathname && !location.search.includes('subtab=')) ||
                  (activeTab === item.id)
            );
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  } else {
                    handleNavigateTab(item.id);
                  }
                }}
                className={`flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-xl transition-all min-h-[44px] min-w-[50px] sm:min-w-[56px] cursor-pointer flex-shrink-0 ${
                  isActive ? 'text-emerald-800 dark:text-emerald-400 font-black' : 'text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400'
                }`}
                title={item.label}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] mt-0.5 whitespace-nowrap leading-tight">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* Quick Logout Button */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-xl text-rose-600 dark:text-rose-400 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all min-h-[44px] min-w-[44px] cursor-pointer flex-shrink-0"
            title="تسجيل الخروج"
          >
            <div className="p-1 rounded-lg text-rose-600 dark:text-rose-400">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] mt-0.5 whitespace-nowrap leading-tight">خروج</span>
          </button>
        </nav>
      )}

      {/* Platform Login Modal rendered globally at the App level */}
      {platformLoginOpen && (
        <LoginModal
          isOpen={platformLoginOpen}
          onClose={() => setPlatformLoginOpen(false)}
          adminOnly={platformLoginAdminOnly}
        />
      )}

      {/* Global Modals */}
      <PasswordChangeModal />

      <ReportDispatchModal
        isOpen={showGroupReportModal}
        onClose={() => setShowGroupReportModal(false)}
        title={groupReportData.title}
        reportContent={groupReportData.content}
        recipientName={groupReportData.recipientName}
        recipientPhone={groupReportData.recipientPhone}
        recipientType={groupReportData.recipientType}
        reportType={groupReportData.reportType}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </AppProvider>
  );
}

export default App;
