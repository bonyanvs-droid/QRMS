import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { MosqueComplexTenant, FrontendConfig, SectionVisibility } from '../../types';
import { getFrontendConfig } from '../../lib/dbService';
import { isModuleEnabled } from '../../lib/moduleChecker';
import { getRolePortalRoute } from '../../lib/roleRoutes';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import { PublicAdmissionModal } from '../admissions/PublicAdmissionModal';
import { LoginModal } from '../auth/LoginModal';
import { DemoLoginModal } from '../common/DemoLoginModal';
import {
  DEMO_TENANT,
  DEMO_STUDENTS,
  DEMO_HALAQAHS,
  DEMO_TEACHERS,
  DEMO_STAGES,
} from '../../data/demoFixtures';
import { TenantAdMarquee, TenantBanners } from './TenantFrontendWidgets';
import { TenantPrayerTimesCard } from './TenantPrayerTimesCard';
import { safeStorage } from '../../lib/safeStorage';
import {
  BookOpen,
  Calendar,
  Sparkles,
  MapPin,
  Phone,
  UserPlus,
  LogIn,
  LogOut,
  Layers,
  HeartHandshake,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  Shield,
  ShieldCheck,
  GraduationCap,
  LayoutDashboard,
  FileText,
  Users,
  Award,
  Compass,
  MessageCircle,
  Menu,
  X,
} from 'lucide-react';

const DEFAULT_PAGE_SECTIONS: SectionVisibility[] = [
  { id: 'banners', label: 'البانرات الرئيسية العريضة (Banners)', isVisible: true, order: 1 },
  { id: 'prayer', label: 'بطاقة ومواقيت الصلاة اليومية', isVisible: true, order: 2 },
  { id: 'about', label: 'نبذة عن المجمع والرؤية', isVisible: true, order: 3 },
  { id: 'outcome', label: 'المخرج التربوي العام المعتمد', isVisible: true, order: 4 },
  { id: 'stats', label: 'إحصائيات المجمع والمراحل الدراسية', isVisible: true, order: 5 },
  { id: 'stages', label: 'المراحل والصفوف الدراسية والمستهدفات', isVisible: true, order: 6 },
  { id: 'programs', label: 'البرامج والمسارات الإثرائية التخصصية', isVisible: true, order: 7 },
  { id: 'educational', label: 'الخطة التربوية والقيمية الأسبوعية', isVisible: true, order: 8 },
  { id: 'ads', label: 'شريط الإعلانات والأنشطة', isVisible: true, order: 9 },
  { id: 'admissions', label: 'بوابة القبول والتسجيل', isVisible: true, order: 10 },
  { id: 'contact', label: 'معلومات التواصل والموقع الجغرافي', isVisible: true, order: 11 },
];

interface TenantPublicPageProps {
  tenant?: MosqueComplexTenant;
  onOpenLogin?: () => void;
  onNavigateToPlatform?: () => void;
  onSelectHalaqah?: () => void;
  onOpenStudentCard?: () => void;
}

export const TenantPublicPage: React.FC<TenantPublicPageProps> = ({
  tenant: propTenant,
  onOpenLogin,
}) => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const {
    academicConfig,
    educationalPlan,
    activeTenant,
    tenants,
    currentUser,
    logout,
    students,
    halaqahs,
    teachers,
    stages,
    tracks,
    academicOutcome,
    isDemoMode,
  } = useApp();

  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDemoLoginModal, setShowDemoLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine if this page is operating under the fixed demo tenant (al-furqan)
  const isFurqanDemo = useMemo(() => {
    if (isDemoMode) return true;
    if (tenantSlug === 'al-furqan') return true;
    if (propTenant && (propTenant.id === 'al-furqan' || propTenant.slug === 'al-furqan')) return true;
    if (activeTenant && (activeTenant.id === 'al-furqan' || activeTenant.slug === 'al-furqan')) return true;
    return false;
  }, [isDemoMode, tenantSlug, propTenant, activeTenant]);

  // Synchronous resolution of user to guarantee immediate reflection
  const effectiveUser = currentUser || (() => {
    try {
      const saved = safeStorage.getItem('al_ghazzawi_current_user_v4') || safeStorage.getItem('qrms_current_user');
      if (saved && saved !== 'null') {
        const u = JSON.parse(saved);
        if (u && u.id) return u;
      }
    } catch {}
    return null;
  })();

  const tenant: MosqueComplexTenant = useMemo(() => {
    if (isFurqanDemo) {
      return DEMO_TENANT;
    }
    return propTenant || activeTenant || tenants[0] || DEMO_TENANT;
  }, [isFurqanDemo, propTenant, activeTenant, tenants]);

  const [frontConfig, setFrontConfig] = useState<FrontendConfig | null>(null);

  useEffect(() => {
    // For demo tenant, completely freeze config and avoid cloud fetching
    if (isFurqanDemo) {
      setFrontConfig(null);
      return;
    }
    const tId = tenant.id;
    if (tId) {
      getFrontendConfig(tId).then((data) => {
        if (data) {
          setFrontConfig(data);
        }
      }).catch((err) => console.warn('Error fetching frontend config:', err));
    }
  }, [tenant.id, isFurqanDemo]);

  // Operational Module Capabilities
  const isAdmissionsModuleActive = isModuleEnabled(tenant, 'admissions');
  const isEducationalModuleActive = isModuleEnabled(tenant, 'educational');
  const isSpellingModuleActive = isModuleEnabled(tenant, 'spelling');

  // Dynamic Operational Data strictly isolated to this tenant
  const tenantStudents = useMemo(() => {
    if (isFurqanDemo) {
      return DEMO_STUDENTS;
    }
    return students.filter((s) => s.tenantId === tenant.id);
  }, [isFurqanDemo, students, tenant.id]);

  const tenantHalaqahs = useMemo(() => {
    if (isFurqanDemo) {
      return DEMO_HALAQAHS;
    }
    return halaqahs.filter((h) => h.tenantId === tenant.id);
  }, [isFurqanDemo, halaqahs, tenant.id]);

  const tenantTeachers = useMemo(() => {
    if (isFurqanDemo) {
      return DEMO_TEACHERS;
    }
    return teachers.filter((t) => t.tenantId === tenant.id);
  }, [isFurqanDemo, teachers, tenant.id]);

  const tenantStages = useMemo(() => {
    if (isFurqanDemo) {
      return DEMO_STAGES;
    }
    return stages.filter((st) => st.isActive);
  }, [isFurqanDemo, stages]);

  const tenantTracks = useMemo(() => {
    return tracks.filter((tr) => !tr.tenantId || tr.tenantId === tenant.id);
  }, [tracks, tenant.id]);

  // Quran Reference Outcome resolved dynamically from tenant.referenceOutcome
  const tenantReferenceOutcome = useMemo(() => {
    if (isFurqanDemo) {
      return DEMO_TENANT.referenceOutcome || '«متقنٌ لهجاء القرآن الكريم ومخارج الحروف مع حفظ متين وتلاوة مجودة»';
    }
    if (tenant.referenceOutcome && tenant.referenceOutcome.trim()) {
      return tenant.referenceOutcome.trim();
    }
    return '«متقنٌ لهجاء القرآن الكريم ومخارج الحروف مع حفظ متين وتلاوة مجودة»';
  }, [isFurqanDemo, tenant]);

  // Section visibility controller: combines admin configuration AND operational enablement
  const isSectionVisible = (sectionId: string): boolean => {
    // 1. Check operational module prerequisites
    if (sectionId === 'admissions' && !isAdmissionsModuleActive) return false;
    if (sectionId === 'educational' && !isEducationalModuleActive) return false;

    // 2. Check frontConfig sections preference
    if (frontConfig && frontConfig.sections) {
      const found = frontConfig.sections.find((s) => s.id === sectionId);
      if (found !== undefined) {
        return found.isVisible;
      }
    }
    return true; // default visible if not configured
  };

  const currentWeekPlan = educationalPlan.find((w) => w.weekNumber === academicConfig.currentWeek);

  // Compute dynamically ordered sections merging custom configuration with defaults
  const orderedSections = useMemo(() => {
    const custom = frontConfig?.sections || [];
    const customMap = new Map(custom.map((s) => [s.id, s]));
    const merged: SectionVisibility[] = [];

    // 1. Add existing configured sections
    custom.forEach((s) => {
      merged.push(s);
    });

    // 2. Add any default sections not yet in custom
    DEFAULT_PAGE_SECTIONS.forEach((def) => {
      if (!customMap.has(def.id)) {
        merged.push({ ...def, order: merged.length + 1 });
      }
    });

    return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [frontConfig?.sections]);

  const handleOpenLogin = () => {
    if (isFurqanDemo) {
      setShowDemoLoginModal(true);
      return;
    }
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Helper for role details
  const getRoleDetails = (role?: string) => {
    switch (role) {
      case 'system_admin':
        return { label: 'مدير المنصة', portalLabel: 'لوحة المنصة', icon: Shield };
      case 'supervisor':
        return { label: 'المشرف القرآني', portalLabel: 'لوحة المشرف', icon: ShieldCheck };
      case 'teacher':
        return { label: 'معلم الحلقة', portalLabel: 'لوحة المعلم', icon: BookOpen };
      case 'parent':
        return { label: 'ولي أمر', portalLabel: 'بوابة الأبناء', icon: GraduationCap };
      case 'student':
        return { label: 'طالب', portalLabel: 'بوابة الطالب', icon: BookOpen };
      case 'campus_admin':
      case 'admin':
      default:
        return { label: 'مدير المجمع', portalLabel: 'لوحة الإدارة', icon: ShieldCheck };
    }
  };

  const roleDetails = getRoleDetails(effectiveUser?.role);
  const RoleIcon = roleDetails.icon;

  const contactPhone = frontConfig?.contactPhone || tenant.contactPhone || '0551122334';
  const contactWhatsapp = frontConfig?.contactWhatsapp || tenant.whatsappNumber || contactPhone;
  const contactEmail = frontConfig?.contactEmail || tenant.email;
  const addressText = frontConfig?.address || `${tenant.city} • ${tenant.district}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200 selection:text-emerald-950 flex flex-col">
      {/* 0. ANNOUNCEMENTS MARQUEE */}
      {frontConfig && isSectionVisible('ads') && <TenantAdMarquee config={frontConfig} />}

      {/* 1. TENANT PUBLIC HEADER (System-wide, Fully Responsive across Mobile & Desktop) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          {/* Top Row on Mobile / Main Row on Desktop: Logo, Complex Name, and Action Buttons */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            {/* Tenant Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="shrink-0">
                <MosqueLogo
                  size="sm"
                  className="sm:hidden"
                  customLogoUrl={frontConfig?.logoUrl || tenant.logoUrl}
                  customName={frontConfig?.name || tenant.name}
                />
                <div className="hidden sm:block">
                  <MosqueLogo
                    size="md"
                    customLogoUrl={frontConfig?.logoUrl || tenant.logoUrl}
                    customName={frontConfig?.name || tenant.name}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 font-serif truncate">
                    {frontConfig?.name || tenant.name}
                  </h1>
                  <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    بوابة المجمع
                  </span>
                </div>
                {/* Desktop subtitle inline */}
                <p className="hidden sm:flex text-xs text-slate-500 font-medium items-center gap-2 mt-0.5">
                  <span>{addressText}</span>
                  {frontConfig?.showSupervisor !== false && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-emerald-700 font-semibold">إشراف: {tenant.supervisorName || 'المشرف العام'}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Mobile Actions: Hamburger Toggle + Login / Profile Buttons */}
            <div className="flex items-center gap-1.5 sm:hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl border border-slate-200"
                aria-label="القائمة"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {effectiveUser ? (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => navigate(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-950 bg-emerald-200 hover:bg-emerald-300 rounded-lg"
                  >
                    <RoleIcon className="w-3.5 h-3.5 text-emerald-800" />
                    <span>{roleDetails.portalLabel}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1 text-slate-500 hover:text-rose-600 rounded-lg"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOpenLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-200" />
                  <span>دخول</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-bar on Mobile: Elegant Horizontal Badges for City, District, & Supervisor */}
          <div className="flex sm:hidden items-center justify-between text-[11px] bg-emerald-50/70 border border-emerald-200/70 px-2.5 py-1.5 rounded-xl text-slate-600 font-medium">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{addressText}</span>
            </div>
            {frontConfig?.showSupervisor !== false && (
              <>
                <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0 mx-1.5" />
                <div className="flex items-center gap-1 text-emerald-900 font-bold shrink-0">
                  <span className="text-emerald-700">إشراف:</span>
                  <span className="truncate max-w-[120px]">{tenant.supervisorName || 'المشرف العام'}</span>
                </div>
              </>
            )}
          </div>

          {/* Mobile Collapsible Nav Menu */}
          {isMobileMenuOpen && (
            <div className="sm:hidden flex flex-col gap-1.5 pt-2 pb-1 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate(`/t/${tenant.slug || tenant.id}`);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-800 text-white text-right"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-300" />
                <span>الرئيسية</span>
              </button>

              {isSectionVisible('outcome') && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/quran');
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 text-right"
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>المخرج القرآني</span>
                </button>
              )}

              {isSectionVisible('educational') && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/educational');
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 text-right"
                >
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>الخطة التربوية</span>
                </button>
              )}

              {isSectionVisible('admissions') && !effectiveUser && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowAdmissionModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 text-right"
                >
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  <span>طلب تسجيل طالب جديد</span>
                </button>
              )}
            </div>
          )}

          {/* Middle Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => navigate(`/t/${tenant.slug || tenant.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-800 text-white shadow-xs cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>الرئيسية</span>
            </button>

            {isSectionVisible('outcome') && (
              <button
                onClick={() => navigate('/quran')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>المخرج القرآني</span>
              </button>
            )}

            {isSectionVisible('educational') && (
              <button
                onClick={() => navigate('/educational')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>الخطة التربوية</span>
              </button>
            )}
          </nav>

          {/* Actions (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            {effectiveUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 pl-1.5 pr-2.5 sm:pr-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {(effectiveUser.fullName || effectiveUser.name || 'م').charAt(0)}
                </div>
                <div className="text-right hidden sm:block leading-tight">
                  <div className="font-bold text-slate-900 text-xs truncate max-w-[130px] md:max-w-[170px]">
                    {effectiveUser.fullName || effectiveUser.name}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">
                    {roleDetails.label}
                  </div>
                </div>

                <button
                  onClick={() => navigate(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 active:scale-98 border border-emerald-300/80 rounded-xl transition-all cursor-pointer mr-1"
                  title={`الانتقال إلى ${roleDetails.portalLabel}`}
                >
                  <RoleIcon className="w-3.5 h-3.5 text-emerald-800" />
                  <span className="whitespace-nowrap">{roleDetails.portalLabel}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {isSectionVisible('admissions') && (
                  <button
                    onClick={() => setShowAdmissionModal(true)}
                    className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>تسجيل طالب جديد</span>
                  </button>
                )}

                <button
                  onClick={handleOpenLogin}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-md shadow-emerald-800/20 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-200" />
                  <span>تسجيل الدخول</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. DYNAMICALLY ORDERED PUBLIC SECTIONS */}
      <main className="flex-1 w-full space-y-10 pt-0 pb-12">
        {/* ORDERED SECTIONS LOOP */}
        {orderedSections.map((section) => {
          if (!isSectionVisible(section.id)) return null;

          switch (section.id) {
            case 'banners':
              return frontConfig ? (
                <div key="banners" className="w-full">
                  <TenantBanners
                    config={frontConfig}
                    tenant={tenant}
                    onOpenAdmission={() => setShowAdmissionModal(true)}
                    onOpenLogin={handleOpenLogin}
                    effectiveUser={effectiveUser}
                    onNavigatePortal={(route) => navigate(route)}
                    roleDetails={roleDetails}
                    RoleIcon={RoleIcon}
                  />
                </div>
              ) : null;

            case 'prayer':
              return tenant && frontConfig?.showPrayerTimes !== false && tenant.prayerConfig?.showOnPublicPage !== false ? (
                <div key="prayer" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <TenantPrayerTimesCard tenant={tenant} />
                </div>
              ) : null;

            case 'about':
              // If banners/hero is already rendered at the top, render the institutional vision & values cards to prevent duplication
              if (isSectionVisible('banners')) {
                return (
                  <section key="about" className="w-full bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 border-y border-slate-200/80 py-10 sm:py-14">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="text-center max-w-3xl mx-auto mb-8">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold mb-3">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>رؤية ورسالة المجمع القرآني</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
                          منظومة تعليمية وتربوية قرآنية متكاملة
                        </h2>
                        <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                          {frontConfig?.description || tenant.notes || 'صرح قرآني رائد يُعنى بغرس كتاب الله الكريم في نفوس الناشئة، وتأسيس القراءة القرآنية الصحيحة بالهجاء المتقن والقيم الإسلامية السامية.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-white p-6 rounded-2xl border border-emerald-200/70 shadow-xs text-right space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <BookOpen className="w-5 h-5 text-emerald-700" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-base">التعليم المتقن</h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            تلقين القرآن الكريم بالتجويد والهجاء القرآني المعتمد والمتابعة الفردية الدقيقة لمستوى حفظ وتلاوة كل طالب.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-amber-200/70 shadow-xs text-right space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                            <Award className="w-5 h-5 text-amber-700" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-base">التربية والقيم</h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            غرس الأخلاق والآداب القرآنية المصاحبة للحفظ والتلاوة أسبوعياً لتنشئة جيل قرآني متزن ومتمسك بالقيم.
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-teal-200/70 shadow-xs text-right space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                            <Compass className="w-5 h-5 text-teal-700" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-base">مسارات مرنة</h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            خطط وبرامج متعددة تناسب مختلف الفئات العمرية والمستويات الدراسية من مرحلة البراعم حتى الإتقان والإجازة.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              }

              // Fallback hero if banners section is disabled
              return (
                <section key="about" className="w-full bg-gradient-to-b from-white via-emerald-50/30 to-slate-50 border-y border-slate-200 py-12 sm:py-16">
                  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold mb-4">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span>البوابة الرسمية للمجمع القرآني المعتمد</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 font-serif leading-tight">
                      أهلاً بكم في {frontConfig?.name || tenant.name}
                    </h2>

                    <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                      {frontConfig?.description || tenant.notes || 'صرح قرآني رائد يُعنى بغرس كتاب الله الكريم في نفوس الناشئة، وتأسيس القراءة القرآنية الصحيحة بالهجاء المتقن والقيم الإسلامية السامية.'}
                    </p>

                    {/* CTA Actions */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                      {effectiveUser ? (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={() => navigate(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                          >
                            <RoleIcon className="w-4 h-4 text-emerald-200" />
                            <span>العودة إلى {roleDetails.portalLabel}</span>
                          </button>

                          <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-sm border border-rose-200 shadow-xs transition-all cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 text-rose-600" />
                            <span>تسجيل الخروج</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {isSectionVisible('admissions') && (
                            <button
                              onClick={() => setShowAdmissionModal(true)}
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                            >
                              <UserPlus className="w-4 h-4 text-amber-300" />
                              <span>طلب تسجيل طالب جديد</span>
                            </button>
                          )}

                          <button
                            onClick={handleOpenLogin}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm border border-slate-300 shadow-xs transition-all cursor-pointer"
                          >
                            <LogIn className="w-4 h-4 text-emerald-700" />
                            <span>تسجيل الدخول</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              );

            case 'outcome':
              return (
                <div key="outcome" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="p-6 sm:p-8 rounded-3xl bg-white border border-emerald-200/90 shadow-sm text-right relative overflow-hidden">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>المخرج التربوي والقيمي العام المعتمد للمجمع:</span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        الهدف التربوي العام
                      </span>
                    </div>

                    <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-950 font-serif text-center py-3 leading-relaxed">
                      {tenantReferenceOutcome}
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                      تتكامل خطة المجمع التربوية والقيمية مع البرامج والمراحل الدراسية لغرس القيم وبناء شخصية الطالب القرآنية المتكاملة.
                    </p>
                  </div>
                </div>
              );

            case 'stats':
              return (
                <div key="stats" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs text-center space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-2">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
                        {tenantStudents.length}
                      </div>
                      <div className="text-xs font-bold text-slate-500">طالب وبُرعم بالمراحل</div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs text-center space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-2">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
                        {tenantHalaqahs.length}
                      </div>
                      <div className="text-xs font-bold text-slate-500">حلقة قرآنية نشطة</div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs text-center space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-2">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
                        {tenantTeachers.length}
                      </div>
                      <div className="text-xs font-bold text-slate-500">معلم ومربٍّ معتمد</div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs text-center space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold mb-2">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-purple-900 font-serif">
                        {tenantStages.length || 1}
                      </div>
                      <div className="text-xs font-bold text-slate-500">مراحل دراسية متخصصة</div>
                    </div>
                  </div>
                </div>
              );

            case 'stages':
              return (
                <div key="stages" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 font-serif">المراحل والصفوف الدراسية بالمجمع</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        مستهدفات تربوية وقرآنية متدرجة مصممة لكل فئة عمرية ومرحلة دراسية مع إعلان السور والمخرجات
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tenantStages.map((stage) => {
                      const stageStudents = tenantStudents.filter((s) => {
                        const studentHalaqah = halaqahs.find((h) => h.id === s.halaqahId);
                        const effectiveStageId = s.stageId || studentHalaqah?.stageId || (stage.id === 'baraem' ? 'baraem' : '');
                        return effectiveStageId === stage.id;
                      });
                      const hasLogo = Boolean(stage.logoUrl);
                      const isLogoActive = stage.isLogoActive !== false;

                      return (
                        <div
                          key={stage.id}
                          className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              {hasLogo && isLogoActive ? (
                                <img
                                  src={stage.logoUrl}
                                  alt={stage.name}
                                  className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-white p-1"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                  <GraduationCap className="w-5 h-5 text-emerald-700" />
                                </div>
                              )}
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {stage.ageRange || stage.targetGrades?.join('، ') || 'المرحلة الدراسية'}
                              </span>
                            </div>

                            <h4 className="font-bold text-base text-slate-900 mb-1">{stage.name}</h4>
                            {stage.subtitle && (
                              <p className="text-xs text-slate-500 mb-3">{stage.subtitle}</p>
                            )}

                            {/* Stage Quran & Educational Target */}
                            <div className="space-y-2 mb-4">
                              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-950">المستهدف القرآني للمرحلة:</span>
                                  <span className="font-black text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                                    {stage.targetQuranAmount || (stage.defaultTargetSurah ? `سورة ${stage.defaultTargetSurah}` : 'سورة الغاشية')}
                                  </span>
                                </div>
                              </div>

                              {stage.outcomeSummary && (
                                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-xs">
                                  <span className="font-bold text-emerald-950 block mb-0.5">المخرج المعتمد للمرحلة:</span>
                                  <p className="text-emerald-900 text-[11px] leading-relaxed font-medium">
                                    «{stage.outcomeSummary}»
                                  </p>
                                </div>
                              )}

                              {stage.curriculumFocus && (
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-[11px] text-slate-600">
                                  <span className="font-bold text-slate-700">التركيز المنهجي: </span>
                                  <span>{stage.curriculumFocus}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 text-xs flex items-center justify-between">
                            <span className="text-slate-600 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-slate-900">{stageStudents.length}</span> طالب مقيد بالمرحلة
                            </span>
                            <span className="text-emerald-700 font-bold">مرحلة نشطة</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

            case 'programs':
              return (
                <div key="programs" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 font-serif">البرامج والمسارات الإثرائية التخصصية</h3>
                      <p className="text-xs text-slate-500 mt-0.5">برامج قرآنية وتعليمية نوعية داعمة لرفع مستوى الإتقان والتنافس</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* If tenant has specific custom tracks configured, render them */}
                    {tenantTracks.length > 0 ? (
                      tenantTracks.map((tr) => (
                        <div key={tr.id} className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                <Layers className="w-5 h-5 text-emerald-700" />
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {tr.shortName || 'مسار تخصصي'}
                              </span>
                            </div>
                            <h4 className="font-bold text-base text-slate-900 mb-2">{tr.name}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {tr.description || 'مسار قرآني معتمد بالمجمع مخصص لتعزيز مهارات الحفظ والتثبيت والإتقان.'}
                            </p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                            <span>المستهدف: {tr.nominationConfig?.branchesOrLevels?.[0] || tenant.targetSurahDefault || 'الغاشية'}</span>
                            <span className="text-emerald-700 font-bold">معتمد بالمجمع</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        {/* Program 1: Spelling */}
                        {isSpellingModuleActive && (
                          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                                  <BookOpen className="w-5 h-5 text-amber-700" />
                                </div>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  منهج تخصصي
                                </span>
                              </div>
                              <h4 className="font-bold text-base text-slate-900 mb-2">منهج الهجاء القرآني المطور</h4>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                بنك الحروف والكلمات القرآنية، دراسة المدود، التنوين، الحركات، والتهيئة التامة للقراءة من المصحف برسمه العثماني.
                              </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                              <span>12 وحدة هجائية</span>
                              <span className="text-amber-700 font-bold">معتمد بالمجمع</span>
                            </div>
                          </div>
                        )}

                        {/* Program 2: Memorization & Review */}
                        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                                <Compass className="w-5 h-5 text-blue-700" />
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                مسار الإتقان
                              </span>
                            </div>
                            <h4 className="font-bold text-base text-slate-900 mb-2">برنامج الحفظ والمراجعة التراكمية</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              خطة يومية ذكية للحفظ والتثبيت الدوري مع المراجعة الصغرى والكبرى لضمان رسوخ المحفوظ في الصدر.
                            </p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                            <span>قياس ومتابعة ذكية</span>
                            <span className="text-blue-700 font-bold">نشط بالمجمع</span>
                          </div>
                        </div>

                        {/* Program 3: Values & Activities */}
                        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                <Sparkles className="w-5 h-5 text-emerald-700" />
                              </div>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                برنامج قيمي
                              </span>
                            </div>
                            <h4 className="font-bold text-base text-slate-900 mb-2">البرنامج القيمي والتربوي الأسبوعي</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              غرس الآداب القرآنية، تعزيز القيم الإيمانية، والمسابقات التفاعلية المحفزة لبناء شخصية متكاملة.
                            </p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                            <span>شعار أسبوعي متجدد</span>
                            <span className="text-emerald-700 font-bold">معتمد بالمجمع</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );

            case 'educational':
              return isEducationalModuleActive && currentWeekPlan ? (
                <div key="educational" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-3xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-bold mb-4 border border-emerald-700">
                        <Calendar className="w-3.5 h-3.5 text-amber-300" />
                        <span>الخطة التربوية للأسبوع {academicConfig.currentWeek}</span>
                      </div>

                      <h4 className="text-2xl sm:text-3xl font-black font-serif text-white mb-2">
                        شعار الأسبوع: «{currentWeekPlan.motto}»
                      </h4>

                      <p className="text-emerald-100 text-sm leading-relaxed mb-4">
                        {currentWeekPlan.educationalGoal}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs pt-4 border-t border-emerald-800/60">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <Sparkles className="w-4 h-4" />
                          <span>النشاط العملي: {currentWeekPlan.activity}</span>
                        </div>
                        <div className="text-emerald-300">
                          المشرف المسؤول: {currentWeekPlan.responsiblePerson}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;

            case 'ads':
              return null; // Marquee is displayed at the top

            case 'admissions':
              return isAdmissionsModuleActive ? (
                <div key="admissions" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-right space-y-2 max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-black">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>بوابة القبول والتسجيل</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black font-serif text-white">
                        انضم إلى حلقات {frontConfig?.name || tenant.name}
                      </h3>
                      <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
                        نستقبل طلبات تسجيل الطلاب والبراعم في مختلف المراحل والمسارات القرآنية بإشراف نخبة من المعلمين المعتمدين.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAdmissionModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-sm shadow-md transition-all shrink-0 hover:scale-102 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-amber-900" />
                      <span>تقديم طلب تسجيل جديد</span>
                    </button>
                  </div>
                </div>
              ) : null;

            case 'contact':
              return (
                <div key="contact" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-right">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <MapPin className="w-7 h-7 text-emerald-700" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-slate-900">{frontConfig?.name || tenant.name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {addressText}{frontConfig?.showSupervisor !== false && tenant.supervisorName ? ` • المشرف العام: ${tenant.supervisorName}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                          <span className="font-mono text-emerald-800 font-bold flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{contactPhone}</span>
                          </span>
                          {contactWhatsapp && (
                            <a
                              href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-emerald-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>واتساب المجمع</span>
                            </a>
                          )}
                          {contactEmail && (
                            <span className="text-slate-500 font-mono">
                              {contactEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${contactPhone}`}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all"
                      >
                        اتصال هاتفي
                      </a>

                      {isSectionVisible('admissions') && (
                        <button
                          onClick={() => setShowAdmissionModal(true)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          تسجيل في الحلقات
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );

            default:
              return null;
          }
        })}
      </main>

      {/* 5. PUBLIC FOOTER */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MosqueLogo size="sm" />
            <div>
              <div className="font-bold text-slate-900">{frontConfig?.name || tenant.name}</div>
              <div className="text-[11px] text-slate-500">
                {academicConfig.name} • الفصل {academicConfig.semester}
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500">
            <span>مدعوم بواسطة منصة </span>
            <strong className="text-emerald-800 font-bold">School Screen</strong>
            <span> • نظام إدارة المجمعات القرآنية</span>
          </div>
        </div>
      </footer>

      {/* Public Admission Request Modal */}
      {showAdmissionModal && (
        <PublicAdmissionModal
          isOpen={showAdmissionModal}
          onClose={() => setShowAdmissionModal(false)}
        />
      )}

      {/* Member Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          defaultTenantId={tenant.id}
        />
      )}

      {/* Demo Persona Login Modal */}
      {showDemoLoginModal && (
        <DemoLoginModal
          isOpen={showDemoLoginModal}
          onClose={() => setShowDemoLoginModal(false)}
        />
      )}
    </div>
  );
};
