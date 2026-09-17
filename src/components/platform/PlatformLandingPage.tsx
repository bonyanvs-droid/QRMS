import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Shield,
  Users,
  Award,
  Calendar,
  Send,
  CheckCircle2,
  ArrowLeft,
  MessageCircle,
  Building2,
  Database,
  Lock,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  GraduationCap,
  FileCheck,
  DollarSign,
  UserCheck,
  ChevronRight,
  ExternalLink,
  PhoneCall,
  LogIn,
  Sliders,
  Check,
  X,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  User,
  LogOut,
} from 'lucide-react';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import { MosqueComplexTenant, UserRole, FrontendConfig } from '../../types';
import { isModuleEnabled } from '../../lib/moduleChecker';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TenantAdMarquee, TenantBanners } from '../tenant/TenantFrontendWidgets';
import { getRolePortalRoute } from '../../lib/roleRoutes';

interface PlatformLandingPageProps {
  tenants?: MosqueComplexTenant[];
  onNavigateToTenant?: (tenantId: string) => void;
  onOpenPlatformAdminLogin?: () => void;
  onOpenLogin?: () => void;
}

export const PlatformLandingPage: React.FC<PlatformLandingPageProps> = ({
  tenants: propTenants,
  onNavigateToTenant,
  onOpenPlatformAdminLogin,
  onOpenLogin,
}) => {
  const navigate = useNavigate();
  const { tenants: contextTenants, organizations, enterDemoSession, currentUser, logout } = useApp();
  const availableTenants = (propTenants && propTenants.length > 0 ? propTenants : contextTenants).filter(
    (t) => t.isActive !== false && t.showOnPublicDirectory !== false && t.tenantType !== 'demo' && t.id !== 'al-furqan'
  );
  const activeOrganizations = organizations.filter((o) => o.isActive !== false);

  const [frontConfig, setFrontConfig] = React.useState<FrontendConfig | null>(null);
  React.useEffect(() => {
    getDoc(doc(db, 'frontendConfigs', 'platform')).then(snap => {
      if (snap.exists()) {
        setFrontConfig(snap.data() as FrontendConfig);
      }
    }).catch((err) => console.warn('Error fetching platform config:', err));
  }, []);

  const effectiveUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('al_ghazzawi_current_user_v4') || localStorage.getItem('qrms_current_user');
      if (saved && saved !== 'null') {
        const u = JSON.parse(saved);
        if (u && u.id) return u;
      }
    } catch {}
    return null;
  })();

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

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    complexName: '',
    city: 'جدة',
    supervisorName: '',
    phone: '',
    studentsCount: '100',
    notes: '',
  });

  const whatsappMessage = encodeURIComponent(
    'السلام عليكم ورحمة الله وبركاته، أود الاستفسار وطلب تجربة حية لنظام إدارة المجمعات القرآنية (School Screen).'
  );
  const whatsappUrl = `https://wa.me/966569990593?text=${whatsappMessage}`;

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      setShowInquiryModal(false);
      setInquirySubmitted(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-200 selection:text-emerald-950 font-sans">
      {frontConfig && <TenantAdMarquee config={frontConfig} />}
      {/* 1. TOP COMMERCIAL NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-900 flex items-center justify-center text-white shadow-md shadow-emerald-900/10 border border-emerald-600/30">
              <BookOpen className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 font-serif">School Screen</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  منظومة SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">نظام إدارة المجمعات القرآنية الشامل</p>
            </div>
          </div>

          {/* Center Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-emerald-700 transition-colors">مميزات المنظومة</a>
            <a href="#engine" className="hover:text-emerald-700 transition-colors">المحرك القرآني</a>
            <a href="#portals" className="hover:text-emerald-700 transition-colors">البوابات المتخصصة</a>
            <a href="#tenants" className="hover:text-emerald-700 transition-colors">الجمعيات والمجمعات المعتمدة</a>
            <a href="#pricing" className="hover:text-emerald-700 transition-colors">الباقات والسعة</a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {effectiveUser ? (
              /* Logged In State: User Identity + Return to Role Portal Button + Logout Button */
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 pl-1.5 pr-2.5 sm:pr-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
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

                {/* Return to Role Portal Button */}
                <button
                  onClick={() => navigate(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 active:scale-98 border border-emerald-300/80 rounded-xl transition-all cursor-pointer mr-1"
                  title={`الانتقال إلى ${roleDetails.portalLabel}`}
                >
                  <RoleIcon className="w-3.5 h-3.5 text-emerald-800" />
                  <span className="whitespace-nowrap">{roleDetails.portalLabel}</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={async () => {
                    await logout();
                  }}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Single Platform Login (System Admin) */}
                <button
                  onClick={onOpenPlatformAdminLogin}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-white hover:bg-slate-100 rounded-xl transition-all border border-slate-300 shadow-2xs cursor-pointer"
                  title="تسجيل الدخول"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تسجيل الدخول</span>
                </button>

                {/* Try System CTA */}
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-md shadow-emerald-800/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>جرّب النظام</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs font-bold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>الجيل السحابي الأحدث للمجمعات والجمعيات القرآنية بالمملكة</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-tight sm:leading-snug max-w-4xl mx-auto font-serif">
            نظام إدارة المجمعات القرآنية
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 mt-2">
              Quranic Centers Management System
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            منظومة سحابية متكاملة تحت مظلة <strong className="text-slate-900 font-bold">School Screen</strong>، مصممة هندسياً لإدارة الحلقات، وأتمتة مسارات الحفظ والمراجعة بمحرك قرآني متطور، وربط الإدارة والمعلمين والمشرفين وأولياء الأمور في منصة واحدة موثوقة.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {effectiveUser ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => navigate(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base shadow-lg shadow-emerald-900/20 hover:shadow-xl transition-all cursor-pointer"
                >
                  <RoleIcon className="w-5 h-5 text-amber-300" />
                  <span>العودة إلى {roleDetails.portalLabel}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={async () => {
                    await logout();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-sm border border-rose-200 shadow-xs transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base shadow-lg shadow-emerald-900/20 hover:shadow-xl transition-all cursor-pointer"
                >
                  <Zap className="w-5 h-5 text-amber-300" />
                  <span>ابدأ تجربة حية للمنظومة</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowInquiryModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-base border border-slate-300 shadow-sm transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-700" />
                  <span>طلب عرض توضيحي لمجمعك</span>
                </button>

                <button
                  onClick={onOpenPlatformAdminLogin}
                  className="sm:hidden inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm border border-slate-300 shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-emerald-700" />
                  <span>تسجيل الدخول</span>
                </button>
              </>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-200/80">
            <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="text-2xl font-black text-emerald-800 font-mono">100%</div>
              <div className="text-xs text-slate-600 font-bold mt-1">عزل بيانات المجمعات سحابياً</div>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="text-2xl font-black text-emerald-800 font-mono">52+</div>
              <div className="text-xs text-slate-600 font-bold mt-1">طالب نشط بالخطط الحية</div>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="text-2xl font-black text-emerald-800 font-mono">6</div>
              <div className="text-xs text-slate-600 font-bold mt-1">بوابات متخصصة مستقلة للأدوار</div>
            </div>
            <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="text-2xl font-black text-emerald-800 font-mono">16+</div>
              <div className="text-xs text-slate-600 font-bold mt-1">وحدة تشغيلية قابلة للتهيئة</div>
            </div>
          </div>
        </div>
      </section>

      {frontConfig && <TenantBanners config={frontConfig} />}

      {/* 3. PROBLEM & SOLUTION SECTION */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              التحول الرقمي القرآني
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 font-serif">
              المشكلة التي يحلها النظام للمجمعات والجمعيات
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              تعاني إدارة الحلقات التقليدية من التشتت والاجتهادات اليدوية، مما يؤثر على جودة الحفظ ومتابعة الطلاب والتواصل مع أولياء الأمور.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* The Challenges */}
            <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/50 border border-rose-200/80">
              <div className="flex items-center gap-3 text-rose-800 font-bold text-lg mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-rose-700" />
                </div>
                <span>التحديات الإدارية والقرآنية الشائعة</span>
              </div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span><strong>تشتت السجلات الورقية</strong> وصعوبة رصد التاريخ التراكمي لكل طالب على مدار الفصول.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span><strong>خلط مسار الحفظ بالمراجعة</strong> وإهمال المراجعة الصغرى والكبرى لعدم وجود جدول آلي ملزم.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span><strong>تراكم التأخر عند الغياب</strong> دون إعادة حساب متوازنة ومضبوطة للوحدات والآيات المتبقية.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span><strong>عزلة ولي الأمر</strong> وعدم معرفته الفورية بما حفظه ابنه اليوم وما يجب مراجعته بالمنزل.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span><strong>صعوبة ترشيح الطلاب لاختبارات الجمعية</strong> لغياب معايير الاستحقاق التاريخية الموثقة.</span>
                </li>
              </ul>
            </div>

            {/* The Solution */}
            <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50/60 border border-emerald-200/90 shadow-sm">
              <div className="flex items-center gap-3 text-emerald-900 font-bold text-lg mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-700" />
                </div>
                <span>الحل الذكي المتكامل في School Screen</span>
              </div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <span><strong>محرك قرآني ذكي ومستقل</strong> يضبط التسميع بالآيات والصفحات، ويعيد جدولة الأيام تلقائياً.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <span><strong>فصل صارم بين مسار الحفظ الجديد والمراجعة</strong> مع قفل كامل ومحمي للسجلات التاريخية.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <span><strong>بوابات مخصصة لكل دور</strong> (معلم، مشرف، ولي أمر، طالب، مدير مجمع، مدير منصة).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <span><strong>إشراك فوري لولي الأمر</strong> عبر تقارير تفاعلية، إشعارات واتساب، وأوسمة تحفيزية.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <span><strong>أتمتة القبول والتسجيل، والرسوم المالية، وترشيحات الجمعية</strong> بدقة متناهية.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE QURANIC ENGINE SECTION */}
      <section id="engine" className="py-16 sm:py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
              الابتكار الأساسي
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 font-serif">
              المحرك القرآني الذكي (Quran Core Engine)
            </h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base">
              العمود الفقري للنظام الذي يحول خطط الحفظ الورقية إلى خوارزميات ديناميكية تتكيف مع وتيرة الطالب الفعلية.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">إعادة الحساب التلقائي</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                عند غياب الطالب أو تعثره، يقوم المحرك تلقائياً بإعادة توزيع الأوراد المتبقية على الأيام القادمة دون الإخلال بموعد الختم.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">عزل مسارات الحفظ والمراجعة</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                مسار الحفظ الجديد مستقل تماماً عن مسار مراجعة وتثبيت المحفوظ السابق، مع تقييم درجات ومعايير منفصلة لكل مسار.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">قفل السجلات التاريخية</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                حماية مطلقة للسجلات السابقة بعد اعتمادها؛ لا يمكن لأي عملية إعادة حساب أو تعديل لاحق المساس بسجلات الإنجاز اليومية المعتمدة.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white mb-2">المطابقة المصحفية الدقيقة</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                دعم كامل لترقيم سور وآيات المصحف الشريف والصفحات والأرباع والأجزاء مع تمييز دقيق لمخارج الحروف ورسم المصحف.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ALL 16 PLATFORM MODULES SHOWCASE */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              الوحدات التشغيلية الشاملة
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 font-serif">
              منظومة متكاملة تغطي كافة جوانب المجمع
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              كل مجمع يمتلك تحكماً كاملاً عبر <strong>modulesConfig</strong> لتفعيل أو تعطيل أي وحدة بمرونة تامة.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[
              { icon: BookOpen, title: 'المحرك القرآني', desc: 'إدارة خطط الحفظ والمراجعة مع إعادة الحساب الآلي اليومي.' },
              { icon: Users, title: 'إدارة الحلقات والطلاب', desc: 'سجلات الطلاب، الحضور والغياب، التوزيع على الحلقات.' },
              { icon: UserCheck, title: 'لوحة المعلم الفورية', desc: 'رصد فوري للتسميع والحضور والتقييم بلمسة واحدة.' },
              { icon: ShieldCheck, title: 'لوحة المشرف القرآني', desc: 'متابعة شمولية لجميع الحلقات ورصد الحالات المتأخرة.' },
              { icon: GraduationCap, title: 'بوابة ولي الأمر الذكية', desc: 'متابعة لحظية لإنجاز الأبناء والتقارير والشهادات.' },
              { icon: Award, title: 'بوابة الطالب والأوسمة', desc: 'عرض ورد اليوم وورد المراجعة ونقاط التحفيز والأوسمة.' },
              { icon: Sparkles, title: 'الهجاء القرآني المطور', desc: 'منهج تعليم القراءة والحركات ورسم المصحف مع بنك الحروف.' },
              { icon: Calendar, title: 'البرنامج القيمي والتربوي', desc: 'قيم أسبوعية، أحاديث نبوية، واجبات سلوكية وتطبيقية.' },
              { icon: FileCheck, title: 'القبول والتسجيل الإلكتروني', desc: 'استقبال طلبات التسجيل وجدولة المقابلات والقبول.' },
              { icon: DollarSign, title: 'الإدارة المالية والرسوم', desc: 'سندات القبض، متابعة الاشتراكات، الإعفاءات، وسجل المدفوعات.' },
              { icon: Award, title: 'ترشيحات اختبارات الجمعية', desc: 'مطابقة شروط ترشيح الطلاب لاختبارات الجمعيات الرسمية.' },
              { icon: Send, title: 'التقارير وإرسال الواتساب', desc: 'توليد فوري للتقارير الفردية والجماعية والإرسال عبر واتساب.' },
              { icon: TrendingUp, title: 'رادار التدخل المبكر', desc: 'كشف الطلاب المعرضين للتأخر ووضع خطط علاجية فورية.' },
              { icon: Building2, title: 'إدارة المجمعات المتعددة', desc: 'بنية SaaS حقيقية تعزل كل مجمع ببياناته وإعداداته.' },
              { icon: Sliders, title: 'تهيئة الوحدات المخصصة', desc: 'تفعيل وتعطيل أي ميزة برمجية حسب احتياج ورغبة كل مجمع.' },
              { icon: Database, title: 'السحابة والأمان العالي', desc: 'حفظ آمن ومستمر في Firestore مع دعم العمل أوفلاين (PWA).' },
            ].map((mod, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <mod.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1.5">{mod.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DEDICATED PORTALS OVERVIEW */}
      <section id="portals" className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              واجهات متخصصة
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 font-serif">
              لكل دور بوابته المستقلة وتجربته الخاصة
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              لا توجد واجهة موحدة مشوشة؛ كل مستخدم يدخل مباشرة إلى ما يخصه وبصلاحياته الدقيقة.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Teacher Portal */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">لوحة المعلم</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                مخصصة للمعلم لإدارة حلقته وطلابه فقط، رصد الحضور والتسميع، رصد الهجاء (إن كان مفعلاً)، ومتابعة تقارير الحلقة.
              </p>
              <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> وصول محصور بالحلقة والطلاب المصرحين
              </div>
            </div>

            {/* Supervisor Portal */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">لوحة المشرف القرآني</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                لوحة رقابية مستقلة تتيح للمشرف استعراض كافة الحلقات، التحقق من الخطط وإعادة الحساب، واعتماد ترشيحات الجمعية.
              </p>
              <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> رقابة نوعية متقدمة على مستوى المجمع
              </div>
            </div>

            {/* Parent & Student */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4 font-bold">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">بوابة ولي الأمر والطالب</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                استعلام مباشر برقم الجوال أو الدخول، عرض التسميع اليومي، ورد المراجعة، الخطة الفصلية، الأوسمة، والشهادات المعتمدة.
              </p>
              <div className="text-[11px] font-semibold text-blue-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> شفافية تامة وتفاعل منزلي مستمر
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LIVE SAMPLE ORGANIZATIONS & COMPLEXES */}
      <section id="tenants" className="py-16 sm:py-24 bg-emerald-950 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-emerald-900 px-3 py-1 rounded-full border border-emerald-700">
              الجهات والمجمعات المعتمدة
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 font-serif">
              الجمعيات والمجمعات القرآنية المعتمدة
            </h2>
            <p className="text-emerald-200 mt-3 text-sm sm:text-base">
              واجهة عامة وهوية مستقلة لكل جمعية خيرية مشرفة، بالإضافة إلى بوابة مخصصة لكل مجمع قرآني تابع مع استعراض حي للخدمات والوحدات.
            </p>
          </div>

          {/* A. Approved Charities Section */}
          {activeOrganizations.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg sm:text-xl font-bold text-white font-serif">
                  الجمعيات الخيرية المشرفة المعتمدة
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {activeOrganizations.map((org) => {
                  const supervisedCount = (org.tenantIds || []).length;
                  return (
                    <div
                      key={org.id}
                      className="p-6 sm:p-7 rounded-3xl bg-emerald-900/90 border border-amber-400/30 flex flex-col justify-between shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 p-2 flex items-center justify-center shrink-0 shadow-sm text-amber-300">
                              <Building2 className="w-8 h-8" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-white font-serif">{org.name}</h4>
                              </div>
                              <p className="text-xs text-amber-200/80 font-medium mt-0.5">
                                {org.city} • ترخيص رقم: {org.licenseNumber || '1445-Q'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                            جمعية مشرفة
                          </span>
                        </div>

                        <p className="text-xs text-emerald-100/90 leading-relaxed mb-4">
                          {org.description || 'إشراف قرآني وتربوي وإداري مركزي على المجمعات والحلقات القرآنية النموذجية التابعة.'}
                        </p>

                        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-100 mb-6 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-slate-300">المجمعات التابعة:</span>
                            <span className="font-bold text-white font-serif">{supervisedCount} مجمعات قرآنية</span>
                          </div>
                          <span className="text-[11px] text-amber-300 font-medium">إشراف مركزي</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          onClick={() => navigate(`/org/${org.id}`)}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>زيارة الواجهة العامة للجمعية</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate('/charity-hq')}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs border border-emerald-600/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                          <span>لوحة الإشراف المركزي (HQ)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. Approved Complexes Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white font-serif">
                المجمعات القرآنية النموذجية
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {availableTenants.map((tenant) => {
              const isGhazzawi = tenant.id === 'ghazzawi';
              const isDemo = tenant.tenantType === 'demo';
              const planName = tenant.subscription?.planName || 'باقة المجمعات المعتمدة';
              const outcome = tenant.referenceOutcome || (tenant.targetSurahDefault ? `«متقنٌ لهجاء القرآن وحفظه إلى ${tenant.targetSurahDefault}»` : '«متقنٌ لحفظ وتثبيت كتاب الله تعالى»');

              const isSpelling = isModuleEnabled(tenant, 'spelling');
              const isAssoc = isModuleEnabled(tenant, 'association');
              const isFinances = isModuleEnabled(tenant, 'finances');
              const isAdmissions = isModuleEnabled(tenant, 'admissions');
              const isEducational = isModuleEnabled(tenant, 'educational');
              const isWhatsapp = isModuleEnabled(tenant, 'whatsapp');

              return (
                <div
                  key={tenant.id}
                  className="p-6 sm:p-8 rounded-3xl bg-emerald-900/70 border border-emerald-700/90 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          {tenant.logoUrl ? (
                            <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-contain rounded-xl" />
                          ) : isGhazzawi ? (
                            <MosqueLogo size="sm" />
                          ) : (
                            <Building2 className="w-8 h-8 text-emerald-800" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg sm:text-xl text-white font-serif">{tenant.name}</h3>
                            {isDemo && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-emerald-950 shadow-xs">
                                بيئة تجريبية جاهزة
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-300 font-medium mt-0.5">
                            {tenant.city} • {tenant.district}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                        isDemo
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                          : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                      }`}>
                        {planName}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-xs text-emerald-100 mb-6 space-y-3">
                      <div>
                        <div className="font-bold text-amber-300 text-[11px] mb-0.5">المخرج القرآني المعتمد:</div>
                        <div className="font-serif text-sm text-white font-medium">{outcome}</div>
                      </div>

                      {/* Real-time Dynamic Modules Configuration Indicators */}
                      <div className="pt-2 border-t border-emerald-800/60">
                        <div className="text-[11px] font-bold text-emerald-300 mb-2">الوحدات والخدمات المفعّلة:</div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-800/80 text-emerald-100 border border-emerald-600/60">
                            ✓ حفظ وتثبيت القرآن
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isSpelling
                              ? 'bg-emerald-800/80 text-emerald-100 border-emerald-600/60'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 line-through decoration-slate-500'
                          }`}>
                            {isSpelling ? '✓ هجاء القرآن' : '✕ هجاء القرآن'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isEducational
                              ? 'bg-emerald-800/80 text-emerald-100 border-emerald-600/60'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 line-through decoration-slate-500'
                          }`}>
                            {isEducational ? '✓ القيم التربوية' : '✕ القيم التربوية'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isAssoc
                              ? 'bg-emerald-800/80 text-emerald-100 border-emerald-600/60'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 line-through decoration-slate-500'
                          }`}>
                            {isAssoc ? '✓ ترشيحات الجمعية' : '✕ ترشيحات الجمعية'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isAdmissions
                              ? 'bg-emerald-800/80 text-emerald-100 border-emerald-600/60'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 line-through decoration-slate-500'
                          }`}>
                            {isAdmissions ? '✓ القبول والتسجيل' : '✕ القبول والتسجيل'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isFinances
                              ? 'bg-emerald-800/80 text-emerald-100 border-emerald-600/60'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 line-through decoration-slate-500'
                          }`}>
                            {isFinances ? '✓ الرسوم المالية' : '✕ الرسوم المالية'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => onNavigateToTenant?.(tenant.slug || tenant.id)}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>زيارة صفحة {tenant.name} العامة</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    {isDemo && (
                      <div className="pt-2 border-t border-emerald-800/60">
                        <div className="text-[11px] font-bold text-amber-300 mb-1.5 text-center">
                          ⚡ الدخول المباشر للبيئة التجريبية الجاهزة (بدون تسجيل):
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={async () => {
                              await enterDemoSession(tenant.id, 'campus_admin');
                              navigate('/admin');
                            }}
                            className="py-1.5 px-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/15 text-center cursor-pointer"
                          >
                            مدير المجمع
                          </button>
                          <button
                            onClick={async () => {
                              await enterDemoSession(tenant.id, 'teacher');
                              navigate('/teacher');
                            }}
                            className="py-1.5 px-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/15 text-center cursor-pointer"
                          >
                            معلم الحلقة
                          </button>
                          <button
                            onClick={async () => {
                              await enterDemoSession(tenant.id, 'parent');
                              navigate('/parent');
                            }}
                            className="py-1.5 px-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/15 text-center cursor-pointer"
                          >
                            ولي أمر
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING & QUOTA SECTION */}
      <section id="pricing" className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              الباقات والاشتراكات
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 font-serif">
              خطط تناسب المجمعات الفردية والجمعيات الكبرى
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              سعات طلابية مرنة، وحدات متدرجة، ودعم فني متخصص ومستمر.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Standard */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">الباقة القياسية (Standard)</h3>
                <p className="text-xs text-slate-500 mt-1">للمجمعات الناشئة والحلقات المحدودة</p>
                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900 font-mono">25</span>
                  <span className="text-xs text-slate-500 mr-2 font-bold">طالباً كحد أقصى</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> المحرك القرآني الأساسي</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> لوحة المعلم والحلقات</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> بوابة ولي الأمر</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> تقارير المتابعة الفورية</li>
                  <li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300" /> منهج الهجاء القرآني المطور</li>
                  <li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300" /> ترشيحات اختبارات الجمعية</li>
                </ul>
              </div>
              <button
                onClick={() => setShowInquiryModal(true)}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-200/80 transition-all cursor-pointer"
              >
                طلب تسعيرة للباقة القياسية
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-6 sm:p-8 rounded-3xl bg-emerald-900 text-white shadow-xl shadow-emerald-950/20 border-2 border-amber-400 relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-emerald-950 font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wider">
                الأكثر طلباً
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">باقة المجمعات (Enterprise)</h3>
                <p className="text-xs text-emerald-200 mt-1">للمجمعات الكبرى ومجمعات المساجد الجامعة</p>
                <div className="my-6">
                  <span className="text-3xl font-black text-amber-300 font-mono">100+</span>
                  <span className="text-xs text-emerald-200 mr-2 font-bold">طالباً مع قابلية التوسع</span>
                </div>
                <ul className="space-y-3 text-xs text-emerald-100 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-300" /> كافة الوحدات الـ 16 مفعلة</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-300" /> منهج الهجاء القرآني المطور</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-300" /> ترشيحات اختبارات الجمعية المعتمدة</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-300" /> الإدارة المالية والقبول والتسجيل</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-300" /> الربط مع واتساب السحابي</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-300" /> لوحة المشرف القرآني المستقلة</li>
                </ul>
              </div>
              <button
                onClick={() => setShowInquiryModal(true)}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                طلب اشتراك باقة المجمعات
              </button>
            </div>

            {/* Custom / Associations */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">الجمعيات والأوقاف (Custom)</h3>
                <p className="text-xs text-slate-500 mt-1">لشبكات المجمعات والجمعيات الخيرية</p>
                <div className="my-6">
                  <span className="text-2xl font-black text-slate-900 font-mono">سعة غير محدودة</span>
                  <span className="text-xs text-slate-500 block mt-1 font-bold">متعدد المجمعات والفروع</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700 mb-8">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> نطاق خاص مخصص (Custom Domain)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> لوحة تحكم مركزية للإدارة العامة</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> تقارير شمولية ومقارنات بين الفروع</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> تدريب المعلمين والمشرفين</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-700" /> مدير حساب ودعم فني مباشر</li>
                </ul>
              </div>
              <button
                onClick={() => setShowInquiryModal(true)}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-200/80 transition-all cursor-pointer"
              >
                تواصل لشراكة الجمعيات والأوقاف
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FLOATING WHATSAPP BUTTON */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-xl shadow-emerald-950/20 hover:scale-105 active:scale-95 transition-all group border-2 border-white/80"
        title="تواصل معنا عبر واتساب لطلب تجربة حية"
      >
        <MessageCircle className="w-6 h-6 text-white fill-white shrink-0" />
        <span className="hidden sm:inline font-bold text-xs font-mono">0569990593 • طلب تجربة</span>
      </a>

      {/* 10. COMMERCIAL FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-bold">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-white font-bold text-sm font-serif">School Screen • نظام إدارة المجمعات القرآنية</div>
              <div className="text-[11px] text-slate-500">المنظومة السحابية الرسمية لإدارة الحلقات والمجمعات القرآنية بالمملكة</div>
            </div>
          </div>

          <div className="text-center md:text-left text-slate-400">
            <div>جميع الحقوق محفوظة © {new Date().getFullYear()} School Screen</div>
            <div className="text-[11px] text-slate-500 mt-1">تطوير وإشراف: د. نور محمد • هاتف: 0569990593</div>
          </div>
        </div>
      </footer>

      {/* 11. INTERACTIVE DEMO LAUNCHER MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-5 left-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-serif">تجربة النظام الحية (ديمو مغلق للعرض والاستكشاف)</h3>
                <p className="text-xs text-slate-500">استعرض شاشات ومميزات المنصة بمختلف الأدوار دون أي تعديل أو حفظ على البيانات</p>
              </div>
            </div>

            {/* Direct Operational Roles into Demo Tenant */}
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>تجربة حية فورية لمجمع الفرقان (بيئة ديمو للقراءة فقط):</span>
                </h4>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                  للعرض فقط • لا حفظ في الداتا بيز
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                اختر أي دور لتجربة صفحات ومميزات النظام بحرية كاملة مع ضمان عدم حفظ أو كتابة أي بيانات على السحابة أو الذاكرة المحلية:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'campus_admin');
                    setShowDemoModal(false);
                    navigate('/admin');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>مدير المجمع</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'stage_supervisor');
                    setShowDemoModal(false);
                    navigate('/supervisor');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <Award className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>مشرف مرحلة</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'programs_supervisor');
                    setShowDemoModal(false);
                    navigate('/supervisor');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>مشرف البرامج</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'admissions_supervisor');
                    setShowDemoModal(false);
                    navigate('/supervisor');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <UserCheck className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>مشرف القبول</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'education_supervisor');
                    setShowDemoModal(false);
                    navigate('/supervisor');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <BookOpen className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>مشرف الحلقات</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'teacher');
                    setShowDemoModal(false);
                    navigate('/teacher');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <GraduationCap className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>معلم الحلقة</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'parent');
                    setShowDemoModal(false);
                    navigate('/parent');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <Users className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>ولي الأمر</span>
                </button>
                <button
                  onClick={async () => {
                    await enterDemoSession('al-furqan', 'student');
                    setShowDemoModal(false);
                    navigate('/student');
                  }}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-center font-bold text-xs shadow-xs transition-all cursor-pointer group"
                >
                  <User className="w-4 h-4 mx-auto mb-1 text-emerald-700 group-hover:text-white" />
                  <span>طالب المجمع</span>
                </button>
              </div>
            </div>

            {/* Explanatory Multi-Tenant Portal Access Note */}
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 leading-relaxed">
              <div className="font-bold mb-1.5 flex items-center gap-1.5 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>تسجيل دخول منسوبي المجمعات (الأعضاء والمعلمون والإدارة):</span>
              </div>
              <p className="text-slate-700">
                وفق معمارية Multi-Tenant، يتم تسجيل دخول المعلمين، إدارة المجمع، المشرف القرآني، وأولياء الأمور مباشرةً من الواجهة العامة للمجمع التابعين له عبر الضغط على «تسجيل الدخول». أما الصفحة الرئيسية للمنصة فهنا يتم تسجيل الدخول لإدارة المنصة المركزية.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>هل ترغب بعرض توضيحي خاص بمجمعك؟</span>
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  setShowInquiryModal(true);
                }}
                className="text-emerald-700 font-bold hover:underline"
              >
                تعبئة طلب عرض رسمي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. INQUIRY / LIVE DEMO REQUEST MODAL */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowInquiryModal(false)}
              className="absolute top-5 left-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            {inquirySubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-serif">تم استلام طلبكم بنجاح</h3>
                <p className="text-xs text-slate-600 mt-2">
                  سيتواصل معكم فريق School Screen لترتيب التجربة الحية والعرض التوضيحي.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-serif">طلب تجربة حية وعرض توضيحي</h3>
                    <p className="text-xs text-slate-500">أدخل بيانات المجمع وسنتواصل معك خلال 24 ساعة</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم المجمع أو المسجد *</label>
                    <input
                      type="text"
                      required
                      value={inquiryForm.complexName}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, complexName: e.target.value })}
                      placeholder="مثال: مجمع التقوى القرآني"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">المدينة *</label>
                      <input
                        type="text"
                        required
                        value={inquiryForm.city}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">عدد الطلاب التقريبي</label>
                      <select
                        value={inquiryForm.studentsCount}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, studentsCount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="25">أقل من 25 طالباً</option>
                        <option value="50">25 إلى 50 طالباً</option>
                        <option value="100">50 إلى 100 طالب</option>
                        <option value="250">100 إلى 250 طالباً</option>
                        <option value="500">أكثر من 250 طالباً</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">اسم المشرف / المسؤول *</label>
                      <input
                        type="text"
                        required
                        value={inquiryForm.supervisorName}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, supervisorName: e.target.value })}
                        placeholder="الاسم الكريم"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">رقم الجوال (واتساب) *</label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ملاحظات أو متطلبات خاصة</label>
                    <textarea
                      rows={2}
                      value={inquiryForm.notes}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
                      placeholder="أي تفاصيل تود توضيحها..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInquiryModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md cursor-pointer"
                  >
                    إرسال الطلب
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
