import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { isModuleEnabled } from '../../lib/moduleChecker';
import {
  BookOpen,
  LayoutDashboard,
  Sparkles,
  Users,
  FileText,
  Calendar,
  Shield,
  LogIn,
  LogOut,
  Bell,
  Send,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  KeyRound,
  Image as ImageIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
  Building2,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { LoginModal } from '../auth/LoginModal';
import { ReportDispatchModal } from './ReportDispatchModal';
import { MosqueLogo } from './logos/MosqueLogo';
import { LogoManagerModal } from './logos/LogoManagerModal';
import { TenantSwitcher } from './TenantSwitcher';
import { resolveContextIdentity } from '../../lib/identityResolver';
import { generateGeneralParentsGroupReport } from '../../utils/reportGenerator';
import { calculateAggregateMetrics } from '../../utils/statusCalculator';
import { safeStorage } from '../../lib/safeStorage';

import { GlobalSidebar } from './GlobalSidebar';

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isPlatformMode?: boolean;
  onNavigateToPlatform?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onOpenGeneralGroupReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = '',
  setActiveTab,
  isPlatformMode = false,
  onNavigateToPlatform,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onOpenGeneralGroupReport,
}) => {
  const {
    currentUser,
    currentRole,
    logout,
    academicConfig,
    students,
    sessionRecords,
    spellingLessons,
    educationalPlan,
    alerts,
    setShowPasswordChangeModal,
    isOffline,
    isCloudSyncing,
    activeTenant,
    academicOutcome,
    stages,
    halaqahs,
    organizations,
  } = useApp();

  const currentOrg = useMemo(() => {
    if (!currentUser?.organizationId) return organizations?.[0];
    return organizations?.find((o) => o.id === currentUser.organizationId) || organizations?.[0];
  }, [organizations, currentUser]);

  const resolvedIdentity = useMemo(() => {
    return resolveContextIdentity({
      currentUser,
      activeTenant,
      stages,
      halaqahs,
      students,
    });
  }, [currentUser, activeTenant, stages, halaqahs, students]);

  const navigate = useNavigate();
  const location = useLocation();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return safeStorage.getItem('school_screen_dark_mode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      safeStorage.setItem('school_screen_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      safeStorage.setItem('school_screen_dark_mode', 'false');
    }
  }, [isDarkMode]);
  const [mobileAdminExpanded, setMobileAdminExpanded] = useState(() => {
    return (
      location.pathname.startsWith('/admin') ||
      ['/admissions', '/finances', '/nominations', '/support'].includes(location.pathname)
    );
  });

  // Keep mobile admin section expanded if navigating to admin routes
  useEffect(() => {
    if (
      location.pathname.startsWith('/admin') ||
      ['/admissions', '/finances', '/nominations', '/support'].includes(location.pathname)
    ) {
      setMobileAdminExpanded(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const [reportModalData, setReportModalData] = useState({
    title: '',
    content: '',
    recipientName: '',
    recipientPhone: '',
    recipientType: 'general_group' as any,
    reportType: 'general' as any,
  });

  // Synchronous resolution of user to guarantee immediate reflection
  const effectiveUser = currentUser || (() => {
    try {
      const saved = safeStorage.getItem('al_ghazzawi_current_user_v3') || safeStorage.getItem('al_ghazzawi_current_user_v4');
      if (saved && saved !== 'null') {
        const u = JSON.parse(saved);
        if (u && u.id) return u;
      }
    } catch {}
    return null;
  })();

  // Authoritative module checks for the active tenant
  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');
  const isEducationalActive = isModuleEnabled(activeTenant, 'educational');
  const isReportsActive = isModuleEnabled(activeTenant, 'reports');

  const aggregateMetrics = calculateAggregateMetrics(students, sessionRecords, spellingLessons, academicConfig);
  const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek);

  const handleOpenGeneralGroupReport = () => {
    const content = generateGeneralParentsGroupReport(academicConfig, currentWeekPlan, aggregateMetrics);
    setReportModalData({
      title: 'تقرير جروب أولياء الأمور العام',
      content,
      recipientName: 'مجموعة أولياء أمور المجمع القرآني',
      recipientPhone: '',
      recipientType: 'general_group',
      reportType: 'general',
    });
    setShowReportModal(true);
  };

  const isMosqueStaff =
    currentUser &&
    (currentUser.role === 'campus_admin' ||
      (currentUser.role as any) === 'admin' ||
      currentUser.role === 'supervisor' ||
      currentUser.role === 'teacher');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Top Reference Quranic Outcome Banner (Only for Mosque-level context, hidden for System Admin) */}
        {currentUser?.role !== 'system_admin' && (
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 text-amber-200 px-2.5 sm:px-4 py-1.5 text-xs font-semibold border-b border-emerald-800/60">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                {academicOutcome ? (
                  <div className="flex items-center gap-1 min-w-0 truncate">
                    <span className="text-emerald-100 font-normal hidden sm:inline shrink-0">المخرج القرآني المعتمد:</span>
                    <span className="font-quran font-bold text-amber-300 text-xs sm:text-sm tracking-wide truncate">
                      {academicOutcome}
                    </span>
                  </div>
                ) : (
                  <div className="font-bold text-emerald-100 text-xs sm:text-sm tracking-wide flex items-center gap-1.5 min-w-0 truncate">
                    <span className="truncate">{resolvedIdentity.mosqueName}</span>
                    <span className="text-emerald-400 hidden sm:inline shrink-0">•</span>
                    <span className="text-amber-200 hidden md:inline font-normal text-xs truncate">صرحٌ قرآني رائد لغرس كتاب الله وعلومه</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 text-xs text-emerald-100 shrink-0">
                {/* Cloud Sync Indicator */}
                {isOffline ? (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[10px] font-bold"
                    title="حفظ محلي فوري ومزامنة تلقائية عند الاتصال"
                  >
                    <CloudOff className="w-3 h-3 text-amber-300" />
                    <span className="hidden sm:inline">أوفلاين</span>
                  </span>
                ) : isCloudSyncing ? (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 border border-emerald-600 text-[10px]">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                    <span className="hidden sm:inline">مزامنة...</span>
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-700/60 text-[10px]">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>سحابي متصل</span>
                  </span>
                )}

                <span className="hidden lg:inline text-[11px] text-emerald-200">
                  {academicConfig.name} • {academicConfig.semester}
                </span>
                <span className="bg-emerald-800/90 px-2 py-0.5 rounded-full text-amber-200 font-bold border border-emerald-700 text-[10px] sm:text-[11px] whitespace-nowrap">
                  الأسبوع {academicConfig.currentWeek}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[4rem] sm:min-h-[4.5rem] py-1.5 sm:py-2 gap-2">
            {/* Identity: Platform Identity for System Admin, Mosque Identity for all mosque roles */}
            {currentUser?.role === 'system_admin' ? (
              <div
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={() => setActiveTab('tenants')}
                title="School Screen - إدارة المنصة المركزية"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-950 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 shrink-0 border border-emerald-600/30">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight font-serif tracking-tight">
                      School Screen
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200">
                      منظومة SaaS
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                    إدارة المنصة المركزية للمجمعات القرآنية
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Official Mosque Logo (General Identity) */}
                <div
                  className="shrink-0 cursor-pointer transition-transform hover:scale-105 flex items-center"
                  onClick={() => setActiveTab('public')}
                  title={resolvedIdentity.mosqueName}
                >
                  <MosqueLogo size="sm" />
                </div>

                {/* Identity Texts container with full wrap support */}
                <div className="min-w-0 flex-1 text-right">
                  {/* Top line / Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap cursor-pointer" onClick={() => setActiveTab('public')}>
                    <span className="text-[11px] sm:text-xs font-black text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300/80 leading-normal inline-block max-w-full">
                      {resolvedIdentity.mosqueName}
                    </span>

                    {/* Contextual Stage Indicator - only when scoped to a specific stage */}
                    {resolvedIdentity.shouldShowStageLogo && resolvedIdentity.stage && (
                      <span
                        className="hidden xs:inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200 whitespace-nowrap"
                        title={`المرحلة المرتبطة: ${resolvedIdentity.stage.name}`}
                      >
                        {resolvedIdentity.stage.logoUrl && (
                          <img
                            src={resolvedIdentity.stage.logoUrl}
                            alt={resolvedIdentity.stage.name}
                            className="w-3.5 h-3.5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span>{resolvedIdentity.stage.name}</span>
                      </span>
                    )}

                    <span className="hidden sm:inline-block text-[10px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                      {currentUser?.role === 'teacher'
                        ? 'حلقة المعلم'
                        : currentUser?.role === 'parent'
                        ? 'بوابة أولياء الأمور'
                        : currentUser?.role === 'student'
                        ? 'بوابة الطالب'
                        : 'كافة المراحل والحلقات'}
                    </span>
                  </div>

                  {/* Subtitle / System Title */}
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className="text-[10px] sm:text-xs font-bold text-slate-600 sm:text-slate-800 leading-tight cursor-pointer"
                      onClick={() => setActiveTab('public')}
                    >
                      منظومة إدارة المجمعات القرآنية
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Right Tools & Auth */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Link back to Platform Website for unauthenticated visitors */}
              {onNavigateToPlatform && !currentUser && (
                <button
                  onClick={onNavigateToPlatform}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-all cursor-pointer"
                  title="الانتقال إلى موقع منصة School Screen الرئيسي"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>المنصة الرسمية</span>
                </button>
              )}

              {/* Quick WhatsApp General Broadcast (Mosque staff only) */}
              {isMosqueStaff && isReportsActive && (
                <button
                  onClick={handleOpenGeneralGroupReport}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                  title="إرسال تقرير عام لجروب أولياء الأمور عبر الواتساب"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تقرير الجروب 📲</span>
                </button>
              )}

              {/* User Profile Badge & Logout */}
              {currentUser ? (
                <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 pl-1 pr-1.5 sm:pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="text-right hidden sm:block">
                    <div className="font-bold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[120px]">{currentUser.name}</div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                      {currentUser.role === 'system_admin'
                        ? 'مدير المنصة'
                        : currentUser.role === 'charity_supervisor'
                        ? 'مشرف عام الجمعية'
                        : currentUser.role === 'campus_admin' || (currentUser.role as any) === 'admin'
                        ? 'مدير المجمع'
                        : currentUser.role === 'supervisor'
                        ? 'مشرف قرآني'
                        : currentUser.role === 'teacher'
                        ? 'معلم حلقة'
                        : currentUser.role === 'parent'
                        ? 'ولي أمر'
                        : 'طالب'}
                    </div>
                  </div>

                  {currentUser.role === 'campus_admin' && (
                    <button
                      onClick={() => setShowLogoModal(true)}
                      className="hidden sm:inline-flex p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="إدارة وتخصيص شعارات المجمع"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setShowPasswordChangeModal(true)}
                    className="p-1 sm:p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="تغيير كلمة المرور"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleLogout}
                    className="p-1 sm:p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-300" />
                  <span>دخول</span>
                </button>
              )}

              {/* Dark Mode Toggle Button */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 sm:p-2 text-slate-700 hover:text-amber-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title={isDarkMode ? 'التحويل إلى وضع العرض النهاري' : 'التحويل إلى وضع العرض الليلي المسائي للمساجد'}
                aria-label="تبديل وضع العرض الليلي"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>

              {/* Mobile Menu Button (Hamburger) */}
              <button
                onClick={() => {
                  if (onToggleMobileMenu) {
                    onToggleMobileMenu();
                  } else {
                    setMobileMenuOpen(!mobileMenuOpen);
                  }
                }}
                className="lg:hidden p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer shrink-0"
                aria-label="القائمة الرئيسية"
              >
                {(isMobileMenuOpen ?? mobileMenuOpen) ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Global Sidebar Drawer when controlled internally */}
        {!onToggleMobileMenu && (
          <GlobalSidebar
            isDrawer
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            activeTenant={activeTenant}
            currentUser={currentUser}
            onOpenGroupReport={handleOpenGeneralGroupReport}
            onLogout={handleLogout}
          />
        )}
      </header>

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <ReportDispatchModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={reportModalData.title}
        reportContent={reportModalData.content}
        recipientName={reportModalData.recipientName}
        recipientPhone={reportModalData.recipientPhone}
        recipientType={reportModalData.recipientType}
        reportType={reportModalData.reportType}
      />

      {currentUser?.role === 'campus_admin' && (
        <LogoManagerModal isOpen={showLogoModal} onClose={() => setShowLogoModal(false)} />
      )}
    </>
  );
};
