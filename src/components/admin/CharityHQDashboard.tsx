import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { MosqueComplexTenant, Organization } from '../../types';
import {
  Building2,
  Users,
  Shield,
  BookOpen,
  Award,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Layers,
  MapPin,
  Phone,
  Mail,
  FileText,
  Sliders,
  AlertCircle,
  Eye,
  Edit3,
  Save,
  Check,
  ChevronLeft,
  GraduationCap,
  Calendar,
  Send,
  Lock,
  Unlock,
  ShieldCheck,
  BarChart3,
  Compass,
} from 'lucide-react';

export const CharityHQDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    organizations,
    saveOrganization,
    tenants,
    students,
    teachers,
    halaqahs,
    associationNominations,
    updateNominationStatus,
    setActiveTenantId,
    userCanEditTenant,
  } = useApp();

  // Active Charity Organization Selection
  const userOrgId = currentUser?.organizationId;
  const initialOrg: Organization =
    organizations.find((o) => o.id === userOrgId) ||
    organizations[0] || {
      id: 'org_furqan_hq',
      name: 'جمعية الفرقان لتحفيظ القرآن الكريم',
      code: 'LIC-HQ-2026-44',
      city: 'جدة',
      contactPhone: '0126543210',
      contactEmail: 'hq@al-furqan-charity.org',
      tenantIds: ['ghazzawi', 'al-furqan'],
      isActive: true,
      createdAt: '2026-01-01',
    };

  const [selectedOrgId, setSelectedOrgId] = useState<string>(initialOrg.id);
  const currentOrg: Organization = organizations.find((o) => o.id === selectedOrgId) || initialOrg;

  // Active Subtab
  const [activeTab, setActiveTab] = useState<'branches' | 'analytics' | 'nominations' | 'settings'>('branches');
  const [searchQuery, setSearchQuery] = useState('');

  // Organization Editing State
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState<Organization>(currentOrg);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form when organization changes
  React.useEffect(() => {
    setOrgForm(currentOrg);
  }, [currentOrg]);

  // Determine user permission
  const isReadOnly = currentUser?.role === 'charity_supervisor' && currentUser.supervisionMode === 'read_only';
  const isFullAccess = !isReadOnly;

  // Filter tenants belonging to this organization
  const supervisedTenants = useMemo(() => {
    return tenants.filter(
      (t) =>
        currentOrg.tenantIds.includes(t.id) ||
        t.organizationId === currentOrg.id ||
        (t.id === 'ghazzawi' && currentOrg.id === 'org_furqan_hq') ||
        (t.id === 'al-furqan' && currentOrg.id === 'org_furqan_hq')
    );
  }, [tenants, currentOrg]);

  // Calculate aggregated stats across supervised tenants
  const aggregateStats = useMemo(() => {
    const tenantIds = supervisedTenants.map((t) => t.id);

    const relevantStudents = students.filter((s) => !s.tenantId || tenantIds.includes(s.tenantId));
    const relevantHalaqahs = halaqahs.filter((h) => !h.tenantId || tenantIds.includes(h.tenantId));
    const relevantTeachers = teachers.filter((t) => !t.tenantId || tenantIds.includes(t.tenantId));

    const totalStudents = relevantStudents.length;
    const advancedCount = relevantStudents.filter((s) => s.status === 'advanced').length;
    const onTrackCount = relevantStudents.filter((s) => s.status === 'on_track').length;
    const supportCount = relevantStudents.filter((s) => s.status === 'needs_support' || s.status === 'lagging').length;

    const masteryRate = totalStudents > 0 ? Math.round(((advancedCount + onTrackCount) / totalStudents) * 100) : 0;

    const relevantNominations = associationNominations.filter(
      (n) => !n.tenantId || tenantIds.includes(n.tenantId)
    );

    return {
      totalComplexes: supervisedTenants.length,
      totalStudents,
      totalHalaqahs: relevantHalaqahs.length,
      totalTeachers: relevantTeachers.length,
      masteryRate,
      advancedCount,
      onTrackCount,
      supportCount,
      nominationsCount: relevantNominations.length,
    };
  }, [supervisedTenants, students, halaqahs, teachers, associationNominations]);

  // Handle switching to a tenant's admin dashboard
  const handleSwitchToTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    navigate('/admin');
  };

  // Handle saving org metadata
  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    await saveOrganization(orgForm);
    setIsEditingOrg(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-300">
      {/* 1. General Aggregated Statistics across ALL Complexes (الإحصائيات العامة لكافة المجمعات) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">المجمعات المعتمدة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{aggregateStats.totalComplexes}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">مجمع ومقرأة قرآنية</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">إجمالي الطلاب</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{aggregateStats.totalStudents}</div>
          <div className="text-[11px] text-blue-600 font-bold mt-0.5">طالب مستمر ومقيد</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">الحلقات النشطة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{aggregateStats.totalHalaqahs}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">حلقة تعليمية</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">الكادر التعليمي</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{aggregateStats.totalTeachers}</div>
          <div className="text-[11px] text-purple-600 font-medium mt-0.5">معلم ومساعد</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">نسبة الإتقان العامة</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{aggregateStats.masteryRate}%</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">إنجاز الخطة المقررة</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مرشحو الاختبارات</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{aggregateStats.nominationsCount}</div>
          <div className="text-[11px] text-rose-600 font-bold mt-0.5">ترشيح لاختبار الجمعية</div>
        </div>
      </div>

      {/* 3. Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>المجمعات التابعة ({supervisedTenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>المصفوفة التحليلية المقارنة</span>
        </button>

        <button
          onClick={() => setActiveTab('nominations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'nominations'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>ترشيحات اختبارات الجمعية ({aggregateStats.nominationsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>بيانات الجمعية ونطاق الإشراف</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ وتحديث بيانات الجمعية ونطاق الإشراف بنجاح.</span>
        </div>
      )}

      {/* 4. TAB CONTENT */}
      {/* TAB 1: BRANCHES & MOSQUE COMPLEXES MATRIX */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="البحث باسم المجمع أو المدينة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              يتم عرض <span className="font-bold text-slate-800">{supervisedTenants.length}</span> مجمع قرآني تحت إشراف {currentOrg.name}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supervisedTenants
              .filter((t) => t.name.includes(searchQuery) || (t.city && t.city.includes(searchQuery)))
              .map((tenant) => {
                const tenantStudents = students.filter((s) => s.tenantId === tenant.id || (!s.tenantId && tenant.id === 'ghazzawi'));
                const tenantHalaqahs = halaqahs.filter((h) => h.tenantId === tenant.id || (!h.tenantId && tenant.id === 'ghazzawi'));
                const tenantTeachers = teachers.filter((t) => t.tenantId === tenant.id || (!t.tenantId && tenant.id === 'ghazzawi'));

                const total = tenantStudents.length;
                const advanced = tenantStudents.filter((s) => s.status === 'advanced').length;
                const onTrack = tenantStudents.filter((s) => s.status === 'on_track').length;
                const branchMastery = total > 0 ? Math.round(((advanced + onTrack) / total) * 100) : 0;

                const enabledModules = tenant.modulesConfig
                  ? Object.entries(tenant.modulesConfig)
                      .filter(([_, v]) => v.enabled)
                      .map(([k]) => k)
                  : ['spelling', 'quran', 'educational', 'reports'];

                return (
                  <div
                    key={tenant.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top bar of branch card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0">
                            {tenant.logoUrl ? (
                              <img src={tenant.logoUrl} alt={tenant.name} className="w-10 h-10 object-contain rounded-xl" />
                            ) : (
                              <Building2 className="w-6 h-6 text-emerald-700" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-slate-900 text-base">{tenant.name}</h3>
                              {tenant.id === 'ghazzawi' && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  الفرع الرئيسي
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {tenant.city || 'جدة'}
                              </span>
                              <span>معرف: {tenant.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="text-xl font-black text-emerald-700">{branchMastery}%</div>
                          <div className="text-[10px] font-semibold text-slate-500">نسبة الإتقان</div>
                        </div>
                      </div>

                      {/* Reference Outcome Target */}
                      {tenant.referenceOutcome && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs mb-3">
                          <span className="text-emerald-900 font-bold">المخرج القرآني المرجعي: </span>
                          <span className="text-emerald-950 font-serif font-semibold">{tenant.referenceOutcome}</span>
                        </div>
                      )}

                      {/* Stats Mini Matrix */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center mb-3">
                        <div>
                          <div className="text-xs text-slate-500 font-semibold">الطلاب</div>
                          <div className="text-base font-black text-slate-800">{tenantStudents.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 font-semibold">الحلقات</div>
                          <div className="text-base font-black text-slate-800">{tenantHalaqahs.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 font-semibold">المعلمون</div>
                          <div className="text-base font-black text-slate-800">{tenantTeachers.length}</div>
                        </div>
                      </div>

                      {/* Active Modules Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        <span className="text-[10px] text-slate-500 font-bold">الوحدات النشطة:</span>
                        {enabledModules.map((mod) => (
                          <span
                            key={mod}
                            className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200"
                          >
                            {mod === 'spelling'
                              ? 'الهجاء'
                              : mod === 'quran'
                              ? 'المخرج'
                              : mod === 'educational'
                              ? 'التربوية'
                              : mod === 'reports'
                              ? 'التقارير'
                              : mod === 'finances'
                              ? 'المالية'
                              : mod === 'admissions'
                              ? 'القبول'
                              : mod === 'nominations'
                              ? 'الترشيحات'
                              : mod}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigate(`/t/${tenant.slug || tenant.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-emerald-800 text-xs font-bold hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>معاينة الواجهة العامة</span>
                      </button>

                      <button
                        onClick={() => handleSwitchToTenant(tenant.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <span>الانتقال لإدارة المجمع</span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: CROSS-BRANCH ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              <span>مقارنة مؤشرات أداء المجمعات وحالات الطلاب</span>
            </h3>

            <div className="space-y-4">
              {supervisedTenants.map((tenant) => {
                const tenantStudents = students.filter((s) => s.tenantId === tenant.id || (!s.tenantId && tenant.id === 'ghazzawi'));
                const total = tenantStudents.length;
                const advanced = tenantStudents.filter((s) => s.status === 'advanced').length;
                const onTrack = tenantStudents.filter((s) => s.status === 'on_track').length;
                const support = tenantStudents.filter((s) => s.status === 'needs_support' || s.status === 'lagging').length;
                const notMoved = tenantStudents.filter((s) => s.status === 'not_moved_yet').length;

                const advPct = total > 0 ? Math.round((advanced / total) * 100) : 0;
                const onTrackPct = total > 0 ? Math.round((onTrack / total) * 100) : 0;
                const supportPct = total > 0 ? Math.round((support / total) * 100) : 0;
                const notMovedPct = total > 0 ? Math.round((notMoved / total) * 100) : 0;

                return (
                  <div key={tenant.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{tenant.name}</span>
                        <span className="text-slate-500">({total} طالب مسجل)</span>
                      </div>
                      <span className="font-black text-emerald-700 text-sm">
                        الإتقان: {total > 0 ? Math.round(((advanced + onTrack) / total) * 100) : 0}%
                      </span>
                    </div>

                    {/* Multi-segmented Progress Bar */}
                    <div className="w-full h-3.5 bg-slate-200 rounded-full flex overflow-hidden">
                      <div style={{ width: `${advPct}%` }} className="bg-emerald-500 h-full" title={`متقدم: ${advanced} (${advPct}%)`} />
                      <div style={{ width: `${onTrackPct}%` }} className="bg-teal-500 h-full" title={`منجز: ${onTrack} (${onTrackPct}%)`} />
                      <div style={{ width: `${supportPct}%` }} className="bg-amber-500 h-full" title={`يحتاج دعم: ${support} (${supportPct}%)`} />
                      <div style={{ width: `${notMovedPct}%` }} className="bg-rose-400 h-full" title={`لم يتحرك: ${notMoved} (${notMovedPct}%)`} />
                    </div>

                    {/* Breakdown legend */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-2 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        متقدم ({advanced})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        منجز بالخطة ({onTrack})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        يحتاج دعم ({support})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        لم يتحرك ({notMoved})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HQ ASSOCIATION NOMINATIONS HUB */}
      {activeTab === 'nominations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">قائمة الطلاب المرشحين لاختبارات الجمعية المركزية</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تجميع لكافة الترشيحات المرفوعة من مديري ومشرفي المجمعات القرآنية التابعة للجمعية
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
              {associationNominations.length} ترشيح مسجل
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">اسم الطالب</th>
                    <th className="p-3.5">المجمع القرآني</th>
                    <th className="p-3.5">المستوى / المسار</th>
                    <th className="p-3.5">تاريخ الترشيح</th>
                    <th className="p-3.5">درجة الترشيح</th>
                    <th className="p-3.5">حالة الاختبار</th>
                    <th className="p-3.5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {associationNominations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد ترشيحات مسجلة حالياً لاختبارات الجمعية.
                      </td>
                    </tr>
                  ) : (
                    associationNominations.map((nom) => {
                      const nomTenant = tenants.find((t) => t.id === nom.tenantId);
                      return (
                        <tr key={nom.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">{nom.studentName}</td>
                          <td className="p-3.5 text-slate-600 font-semibold">{nomTenant?.name || nom.tenantId || ''}</td>
                          <td className="p-3.5 font-semibold text-emerald-800">{nom.targetTitle || 'اختبار الجمعية'}</td>
                          <td className="p-3.5 text-slate-500">{nom.createdAt ? nom.createdAt.split('T')[0] : '1447هـ'}</td>
                          <td className="p-3.5 font-bold text-slate-800">{nom.internalExamScore ? `${nom.internalExamScore}%` : '-'}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                nom.supervisorStatus === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : nom.supervisorStatus === 'returned'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {nom.supervisorStatus === 'approved'
                                ? 'معتمد'
                                : nom.supervisorStatus === 'returned'
                                ? 'معاد للمراجعة'
                                : 'قيد المراجعة'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {isFullAccess && (
                              <button
                                onClick={() =>
                                  updateNominationStatus(
                                    nom.id,
                                    nom.supervisorStatus === 'approved' ? 'pending' : 'approved',
                                    'تمت المراجعة والاعتماد من مشرف عام الجمعية'
                                  )
                                }
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                {nom.supervisorStatus === 'approved' ? 'إعادة للمراجعة' : 'اعتماد الترشيح'}
                              </button>
                            )}
                            {isReadOnly && <span className="text-slate-400 text-[10px]">استعلام فقط</span>}
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

      {/* TAB 4: ORGANIZATION METADATA & SUPERVISION SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">بيانات وسجل الجمعية ونطاق الإشراف الميداني</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعديل وتحديث بيانات الجمعية والمجمعات القرآنية التابعة لإشرافها المركزي
              </p>
            </div>
            {isFullAccess && !isEditingOrg && (
              <button
                onClick={() => setIsEditingOrg(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل البيانات</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveOrg} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الجمعية الرسمي</label>
                <input
                  type="text"
                  disabled={!isEditingOrg}
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز / ترخيص الجمعية</label>
                <input
                  type="text"
                  disabled={!isEditingOrg}
                  value={orgForm.code || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, code: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / المقر الرئيسي</label>
                <input
                  type="text"
                  disabled={!isEditingOrg}
                  value={orgForm.city || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">هاتف التواصل</label>
                <input
                  type="tel"
                  disabled={!isEditingOrg}
                  value={orgForm.contactPhone || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono dir-ltr text-right"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للإدارة العامة</label>
                <input
                  type="email"
                  disabled={!isEditingOrg}
                  value={orgForm.contactEmail || ''}
                  onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 disabled:bg-slate-50 disabled:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Supervised Tenants Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                المجمعات القرآنية التابعة لإشراف الجمعية:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tenants.map((t) => {
                  const isChecked = orgForm.tenantIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all ${
                        isEditingOrg ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isEditingOrg}
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setOrgForm({
                              ...orgForm,
                              tenantIds: [...orgForm.tenantIds, t.id],
                            });
                          } else {
                            setOrgForm({
                              ...orgForm,
                              tenantIds: orgForm.tenantIds.filter((id) => id !== t.id),
                            });
                          }
                        }}
                        className="rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div>{t.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal font-mono">{t.id}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {isEditingOrg && (
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingOrg(false);
                    setOrgForm(currentOrg);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
