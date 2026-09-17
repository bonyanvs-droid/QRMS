import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Organization, MosqueComplexTenant } from '../../types';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Shield,
  ShieldCheck,
  Users,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Search,
  Save,
  X,
  Compass,
  Layers,
  Award,
  BookOpen,
  Eye,
  Lock,
} from 'lucide-react';

export const OrganizationsManagementTab: React.FC = () => {
  const {
    organizations,
    saveOrganization,
    deleteOrganization,
    tenants,
    students,
    teachers,
    halaqahs,
  } = useApp();

  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Organization>>({
    id: '',
    name: '',
    code: '',
    description: '',
    city: 'جدة',
    region: 'منطقة مكة المكرمة',
    contactPhone: '',
    contactEmail: '',
    tenantIds: [],
    isActive: true,
  });

  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.code && org.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (org.city && org.city.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && org.isActive !== false) ||
        (filterStatus === 'inactive' && org.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [organizations, searchTerm, filterStatus]);

  const handleOpenAddModal = () => {
    setEditingOrg(null);
    setFormData({
      id: `org_${Date.now().toString(36)}`,
      name: '',
      code: `LIC-HQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      description: '',
      city: 'جدة',
      region: 'منطقة مكة المكرمة',
      contactPhone: '',
      contactEmail: '',
      tenantIds: ['ghazzawi'],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      ...org,
      tenantIds: org.tenantIds || [],
    });
    setIsModalOpen(true);
  };

  const handleToggleTenantAssignment = (tenantId: string) => {
    const current = formData.tenantIds || [];
    if (current.includes(tenantId)) {
      setFormData({
        ...formData,
        tenantIds: current.filter((id) => id !== tenantId),
      });
    } else {
      setFormData({
        ...formData,
        tenantIds: [...current, tenantId],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const orgToSave: Organization = {
      id: formData.id || editingOrg?.id || `org_${Date.now().toString(36)}`,
      name: formData.name.trim(),
      code: formData.code?.trim() || '',
      description: formData.description?.trim() || '',
      city: formData.city?.trim() || 'جدة',
      region: formData.region?.trim() || 'منطقة مكة المكرمة',
      contactPhone: formData.contactPhone?.trim() || '',
      contactEmail: formData.contactEmail?.trim() || '',
      tenantIds: formData.tenantIds || [],
      isActive: formData.isActive !== false,
      logoUrl: formData.logoUrl || editingOrg?.logoUrl || '/mosque-logo.jpeg',
      createdAt: editingOrg?.createdAt || formData.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    await saveOrganization(orgToSave);
    setIsModalOpen(false);
    setSaveSuccessMsg('تم حفظ بيانات الجمعية الخيرية بنجاح!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleDeleteConfirm = async () => {
    if (!isDeletingId) return;
    await deleteOrganization(isDeletingId);
    setDeleteConfirmOpen(false);
    setIsDeletingId(null);
    setSaveSuccessMsg('تم حذف الجمعية بنجاح.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const getOrgMetrics = (org: Organization) => {
    const orgTenants = tenants.filter(
      (t) => (org.tenantIds && org.tenantIds.includes(t.id)) || t.organizationId === org.id
    );
    const orgTenantIds = orgTenants.map((t) => t.id);

    const orgStudents = students.filter((s) => orgTenantIds.includes(s.tenantId || 'ghazzawi'));
    const orgTeachers = teachers.filter((t) => orgTenantIds.includes(t.tenantId || 'ghazzawi'));
    const orgHalaqahs = halaqahs.filter((h) => orgTenantIds.includes(h.tenantId || 'ghazzawi'));

    return {
      tenantsCount: orgTenants.length,
      studentsCount: orgStudents.length,
      teachersCount: orgTeachers.length,
      halaqahsCount: orgHalaqahs.length,
      tenantsList: orgTenants,
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-3 text-sm font-bold shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
                إدارة الجمعيات والمؤسسات القرآنية المشرفة (Charity HQ Governance)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة الجهات والجمعيات الخيرية المسؤولة عن المجمعات القرآنية، والتحكم في صلاحيات الإشراف المركزي
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة جمعية خيرية جديدة</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث باسم الجمعية، الكود، أو المدينة..."
            className="w-full text-xs sm:text-sm pr-9 pl-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">الحالة:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({organizations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'active'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              نشطة ({organizations.filter((o) => o.isActive !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'inactive'
                  ? 'bg-white text-rose-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              معطلة ({organizations.filter((o) => o.isActive === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrgs.map((org) => {
          const metrics = getOrgMetrics(org);
          const isActive = org.isActive !== false;

          return (
            <div
              key={org.id}
              className={`bg-white rounded-3xl border transition-all p-6 sm:p-7 shadow-xs flex flex-col justify-between ${
                isActive ? 'border-slate-200 hover:border-emerald-500 hover:shadow-md' : 'border-slate-200/80 bg-slate-50/70 opacity-80'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Building2 className="w-7 h-7 text-emerald-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900 font-serif">{org.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isActive ? 'مرخصة ونشطة' : 'معطلة مؤقتاً'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        {org.code && (
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                            {org.code}
                          </span>
                        )}
                        <span>{org.city || 'جدة'}</span>
                        {org.region && <span>• {org.region}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(org)}
                      title="تعديل بيانات الجمعية"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {organizations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeletingId(org.id);
                          setDeleteConfirmOpen(true);
                        }}
                        title="حذف الجمعية"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {org.description && (
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed line-clamp-2">
                    {org.description}
                  </p>
                )}

                {/* Metrics Badges */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center mb-5">
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-semibold mb-0.5">المجمعات التابعة</div>
                    <div className="text-base font-black text-emerald-900 font-mono">
                      {metrics.tenantsCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-semibold mb-0.5">إجمالي الطلاب</div>
                    <div className="text-base font-black text-slate-900 font-mono">
                      {metrics.studentsCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <div className="text-[11px] text-slate-500 font-semibold mb-0.5">الحلقات والمعلمون</div>
                    <div className="text-base font-black text-slate-900 font-mono">
                      {metrics.halaqahsCount} / {metrics.teachersCount}
                    </div>
                  </div>
                </div>

                {/* Supervised Tenants List */}
                <div className="mb-5 space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>المجمعات التابعة للمظلة الإشرافية:</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {metrics.tenantsCount} مجمع
                    </span>
                  </div>
                  {metrics.tenantsList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {metrics.tenantsList.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => navigate(`/t/${t.slug || t.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Building2 className="w-3 h-3 text-emerald-700" />
                          <span>{t.name}</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs text-center">
                      لم يتم ربط أي مجمعات قرآنية بهذه الجمعية بعد.
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                {(org.contactPhone || org.contactEmail) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100 flex-wrap">
                    {org.contactPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{org.contactPhone}</span>
                      </div>
                    )}
                    {org.contactEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{org.contactEmail}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/org/${org.id}`)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>الواجهة العامة للجمعية</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/charity-hq')}
                  className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  <span>لوحة الإشراف (HQ)</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredOrgs.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">لا توجد جمعيات مطابقة لبحثك</h3>
            <p className="text-xs text-slate-500 mt-1">
              جرب تغيير معايير البحث أو قم بإضافة جمعية خيرية جديدة
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-emerald-800" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-serif">
                    {editingOrg ? 'تعديل بيانات الجمعية الخيرية' : 'إضافة جمعية خيرية جديدة للمنصة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    تهيئة المظلة الإشرافية وربط المجمعات التابعة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الجمعية الخيرية أو المؤسسة *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: جمعية الفرقان الخيرية لتحفيظ القرآن الكريم"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كود الترخيص أو الرمز المرجعي
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: FURQAN-HQ أو LIC-2026-01"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المدينة
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="مثال: جدة"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف / الجوال المعتمد
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="مثال: 0569990593"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني للإدارة العامة
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail || ''}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="hq@charity.org.sa"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نبذة ورسالة الجمعية
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر للجمعية ومجالات عملها وإشرافها على المجمعات القرآنية..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Assign Tenants Section */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  المجمعات القرآنية التابعة لهذه الجمعية (Supervised Tenants):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {tenants.map((tenant) => {
                    const isSelected = (formData.tenantIds || []).includes(tenant.id);
                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => handleToggleTenantAssignment(tenant.id)}
                        className={`text-right p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                          <span>{tenant.name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-emerald-700 text-white' : 'border border-slate-300'
                          }`}
                        >
                          {isSelected && '✓'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="pt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="orgIsActive"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="orgIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تفعيل الجمعية والسماح لمشرفيها بتسجيل الدخول والوصول
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingOrg ? 'حفظ التعديلات' : 'إنشاء الجمعية'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">تأكيد حذف الجمعية</h3>
              <p className="text-xs text-slate-600">
                هل أنت متأكد من رغبتك في حذف هذه الجمعية؟ لن يتم حذف المجمعات القرآنية التابعة لها، ولكن ستفقد ارتباطها الإشرافي.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
