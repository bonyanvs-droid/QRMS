import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Organization, MosqueComplexTenant } from '../../types';
import { LoginModal } from '../auth/LoginModal';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import {
  Building2,
  BookOpen,
  Sparkles,
  Shield,
  ShieldCheck,
  Users,
  Award,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Compass,
  FileCheck,
  TrendingUp,
  LogIn,
  GraduationCap,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const OrganizationPublicPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { organizations, tenants, students, teachers, halaqahs, currentUser } = useApp();

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Match the organization
  const currentOrg: Organization =
    organizations.find(
      (o) =>
        o.id === orgId ||
        o.code?.toLowerCase() === orgId?.toLowerCase() ||
        (orgId === 'furqan-charity' && o.id === 'org_furqan_hq') ||
        (orgId === 'org_furqan_hq' && o.id === 'furqan-charity')
    ) ||
    organizations[0] || {
      id: 'furqan-charity',
      name: 'جمعية الفرقان الخيرية لتحفيظ القرآن الكريم',
      code: 'FURQAN-HQ',
      description: 'الإدارة العامة والإشراف المركزي على المجمعات القرآنية التابعة والمقارئ النموذجية.',
      city: 'جدة',
      region: 'منطقة مكة المكرمة',
      tenantIds: ['ghazzawi', 'al-furqan'],
      isActive: true,
      contactPhone: '0569990593',
      contactEmail: 'hq@furqan-charity.org.sa',
    };

  // Supervised Tenants
  const supervisedTenants: MosqueComplexTenant[] = tenants.filter(
    (t) =>
      (currentOrg.tenantIds && currentOrg.tenantIds.includes(t.id)) ||
      t.organizationId === currentOrg.id ||
      (currentOrg.id === 'org_furqan_hq' && (t.id === 'ghazzawi' || t.id === 'al-furqan')) ||
      (currentOrg.id === 'furqan-charity' && (t.id === 'ghazzawi' || t.id === 'al-furqan'))
  );

  const supervisedTenantIds = supervisedTenants.map((t) => t.id);

  // Aggregate Stats
  const supervisedStudents = students.filter((s) => supervisedTenantIds.includes(s.tenantId || 'ghazzawi'));
  const supervisedTeachers = teachers.filter((t) => supervisedTenantIds.includes(t.tenantId || 'ghazzawi'));
  const supervisedHalaqahs = halaqahs.filter((h) => supervisedTenantIds.includes(h.tenantId || 'ghazzawi'));

  const isSupervisorLoggedIn =
    currentUser &&
    ['charity_supervisor', 'system_admin'].includes(currentUser.role) &&
    (currentUser.role === 'system_admin' || currentUser.organizationId === currentOrg.id || !currentUser.organizationId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200 selection:text-emerald-950 flex flex-col">
      {/* 1. TOP ANNOUNCEMENT & NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link to="/platform" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-emerald-900 transition-colors">
                <Building2 className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="font-serif font-black text-base sm:text-lg text-slate-900 group-hover:text-emerald-900 transition-colors flex items-center gap-2">
                  <span>{currentOrg.name}</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold">بوابة الجمعية الرسمية</span>
                  {currentOrg.code && <span>• ترخيص {currentOrg.code}</span>}
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/platform')}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>دليل المنصة العام</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {isSupervisorLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate('/charity-hq')}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-300" />
                <span>لوحة الإشراف المركزي (HQ)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>دخول بوابة الجمعية</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                المظلة الإشرافية والتعليمية المعتمدة
              </span>
              {currentOrg.code && (
                <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                  رقم الاعتماد: {currentOrg.code}
                </span>
              )}
              <span className="text-xs text-emerald-200">
                {currentOrg.city} • {currentOrg.region || 'المملكة العربية السعودية'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white font-serif leading-tight">
              {currentOrg.name}
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-normal">
              {currentOrg.description ||
                'صرح قرآني رائد يُعنى بالإشراف الأكاديمي، تأهيل المعلمين، ورعاية الحلقات والمجمعات القرآنية النموذجية وفق أعلى معايير الجودة والإتقان.'}
            </p>

            <div className="pt-4 flex flex-wrap gap-3">
              <a
                href="#complexes"
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2"
              >
                <span>استعراض المجمعات التابعة ({supervisedTenants.length})</span>
                <ChevronLeft className="w-4 h-4" />
              </a>

              {!isSupervisorLoggedIn && (
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-amber-300" />
                  <span>دخول المشرف العام</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. AGGREGATE KEY METRICS */}
      <section className="relative -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>المجمعات التابعة</span>
              <Building2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {supervisedTenants.length}
            </div>
            <div className="text-[11px] text-emerald-800 font-semibold mt-1">مجمعات قرآنية نموذجية</div>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>إجمالي الطلاب</span>
              <Users className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {supervisedStudents.length}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1">في مختلف المراحل التعليمية</div>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>الحلقات القرآنية</span>
              <Layers className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {supervisedHalaqahs.length}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1">بإشراف يومي ومتابعة مستمرة</div>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>المعلمون المعتمدون</span>
              <Award className="w-4 h-4 text-purple-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {supervisedTeachers.length}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1">كفاءات قرآنية مجازة</div>
          </div>
        </div>
      </section>

      {/* 4. SUPERVISED MOSQUE COMPLEXES DIRECTORY */}
      <section id="complexes" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              دليل الفروع والمجمعات
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 font-serif">
              المجمعات القرآنية التابعة والمشرفة عليها الجمعية
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              لكل مجمع قرآني واجهته العامة المستقلة، وبوابات الدخول الخاصة بمعلميه، طلابه، وأولياء أموره.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {supervisedTenants.map((tenant) => {
              const isGhazzawi = tenant.id === 'ghazzawi';
              const tenantStudents = students.filter((s) => (s.tenantId || 'ghazzawi') === tenant.id);
              const tenantHalaqahs = halaqahs.filter((h) => (h.tenantId || 'ghazzawi') === tenant.id);

              return (
                <div
                  key={tenant.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
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
                            <h3 className="font-bold text-lg sm:text-xl text-slate-900 font-serif">
                              {tenant.name}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{tenant.city} • {tenant.district}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        مجمع معتمد
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                      {tenant.description ||
                        'مجمع قرآني نموذجي يهدف لتعليم القرآن الكريم تلاوةً وحفظاً وتدبراً، مع ترسيخ القيم والأخلاق الإسلامية.'}
                    </p>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs mb-6">
                      <div>
                        <div className="text-slate-500 text-[11px] font-semibold">عدد الطلاب المقيدين:</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">{tenantStudents.length} طالب</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px] font-semibold">عدد الحلقات:</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5 font-mono">{tenantHalaqahs.length} حلقات</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => navigate(`/t/${tenant.slug || tenant.id}`)}
                      className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>زيارة الواجهة العامة للمجمع</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {supervisedTenants.length === 0 && (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">لا توجد مجمعات مسجلة حالياً</h3>
              <p className="text-xs text-slate-500 mt-1">
                سيتم إضافة المجمعات القرآنية التابعة للجمعية قريباً
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. QUALITY & SUPERVISION METHODOLOGY */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center mb-4 font-bold">
                <BookOpen className="w-6 h-6 text-emerald-800" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-serif">المناهج والخطط المعتمدة</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                تطبيق منهجية قرآنية محكمة تعتمد إعادة الحساب الآلي اليومي، وضبط الهجاء القرآني المطور ومخارج الحروف وقواعد التجويد.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4 font-bold">
                <ShieldCheck className="w-6 h-6 text-amber-800" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-serif">الإشراف الميداني والرقابة</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                متابعة دورية مباشرة لمستويات الحفظ، ورصد الحالات التي تحتاج دعماً علاجياً مبكراً لضمان عدم تأخر أي طالب.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center mb-4 font-bold">
                <Award className="w-6 h-6 text-blue-800" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-serif">الاختبارات والشهادات الرسمية</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                تنظيم وترشيح الطلاب لاختبارات الأجزاء الرسمية المعتمدة لدى الجمعيات، وإصدار شهادات الإتقان والإجازة القرآنية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OFFICIAL FOOTER */}
      <footer className="mt-auto bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="font-bold text-white text-sm font-serif">{currentOrg.name}</div>
                <div className="text-xs text-slate-400">إشراف مركزي وإدارة موحدة للمجمعات القرآنية</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => navigate('/platform')}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                دليل المنصة الشامل
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
              >
                بوابة المشرفين
              </button>
            </div>
          </div>

          <div className="pt-6 text-center text-xs text-slate-500">
            جميع الحقوق محفوظة © {new Date().getFullYear()} — {currentOrg.name} • مدعوم عبر منصة School Screen لإدارة المجمعات القرآنية
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {loginModalOpen && (
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
        />
      )}
    </div>
  );
};
