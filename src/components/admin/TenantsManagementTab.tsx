import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { MosqueComplexTenant, TenantModulesConfig, TenantSubscriptionPlan } from '../../types';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  Sliders,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Save,
  X,
  Search,
  AlertCircle,
  Sparkles,
  Award,
  MessageSquare,
  BookOpen,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Filter,
  UploadCloud,
  Trash2,
  Loader2,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Copy,
  Check,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateDirectWhatsAppUrl } from '../../lib/whatsappCloudApi';

const DEFAULT_MODULES: TenantModulesConfig = {
  quranMemorization: true,
  quranRevision: true,
  attendance: true,
  quranSpelling: true,
  educationalValues: true,
  admissions: true,
  finance: true,
  associationTesting: true,
  badgesAndRewards: true,
  whatsappNotifications: true,
  parentPortal: true,
  quran: true,
  spelling: true,
  educational: true,
  finances: true,
  association: true,
  badges: true,
  whatsapp: true,
};

export const TenantsManagementTab: React.FC = () => {
  const {
    tenants,
    addTenant,
    updateTenant,
    updateCampusAdminPassword,
    deleteTenant,
    students,
  } = useApp();

  const navigate = useNavigate();

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'production' | 'demo'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Active item in modal
  const [selectedTenant, setSelectedTenant] = useState<MosqueComplexTenant | null>(null);
  const [isNewTenant, setIsNewTenant] = useState(false);

  // Form tab in main modal
  const [activeFormTab, setActiveFormTab] = useState<'identity' | 'contact' | 'subscription' | 'modules'>('identity');
  const [adminInitialPassword, setAdminInitialPassword] = useState('Admin@123456');

  // Password Edit State for Existing Tenants
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // WhatsApp share notification
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Tenant editing state
  const [formData, setFormData] = useState<Partial<MosqueComplexTenant>>({
    name: '',
    slug: '',
    description: '',
    city: 'جدة',
    district: '',
    region: 'منطقة مكة المكرمة',
    address: '',
    supervisorName: '',
    contactPhone: '',
    whatsappNumber: '',
    email: '',
    logoUrl: '',
    tenantType: 'production',
    isActive: true,
    showOnPublicDirectory: true,
    customDomain: '',
    subscription: {
      planId: 'growth',
      planName: 'باقة المجمعات المعتمدة',
      maxStudentsQuota: 100,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    modulesConfig: { ...DEFAULT_MODULES },
  });

  // Logo file upload state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Compress & read uploaded logo to maintain lightweight database footprint
  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoError('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }
    setLogoError(null);
    setIsProcessingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (file.type.includes('svg')) {
          setFormData((prev) => ({ ...prev, logoUrl: result }));
          setIsProcessingLogo(false);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/webp', 0.88);
            setFormData((prev) => ({ ...prev, logoUrl: compressed }));
          } else {
            setFormData((prev) => ({ ...prev, logoUrl: result }));
          }
          setIsProcessingLogo(false);
        };
        img.onerror = () => {
          setFormData((prev) => ({ ...prev, logoUrl: result }));
          setIsProcessingLogo(false);
        };
        img.src = result;
      };
      reader.onerror = () => {
        setLogoError('تعذر قراءة ملف الصورة المحدد');
        setIsProcessingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoError('حدث خطأ أثناء معالجة الصورة');
      setIsProcessingLogo(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((t) => t.isActive !== false).length;
    const demo = tenants.filter((t) => t.tenantType === 'demo').length;
    const inactive = total - active;
    const totalQuota = tenants.reduce((acc, t) => acc + (t.subscription?.maxStudentsQuota || 100), 0);
    return { total, active, demo, inactive, totalQuota };
  }, [tenants]);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchSearch =
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tenant.district && tenant.district.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType =
        filterType === 'all' ||
        (filterType === 'production' && tenant.tenantType !== 'demo') ||
        (filterType === 'demo' && tenant.tenantType === 'demo');

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && tenant.isActive !== false) ||
        (filterStatus === 'inactive' && tenant.isActive === false);

      return matchSearch && matchType && matchStatus;
    });
  }, [tenants, searchTerm, filterType, filterStatus]);

  // Open Add Tenant
  const handleOpenAdd = () => {
    setIsNewTenant(true);
    setSelectedTenant(null);
    setAdminInitialPassword('Admin@123456');
    setFormData({
      name: '',
      slug: '',
      description: '',
      city: 'جدة',
      district: '',
      region: 'منطقة مكة المكرمة',
      address: '',
      supervisorName: '',
      contactPhone: '',
      whatsappNumber: '',
      email: '',
      logoUrl: '',
      tenantType: 'production',
      isActive: true,
      showOnPublicDirectory: true,
      customDomain: '',
      subscription: {
        planId: 'growth',
        planName: 'باقة المجمعات المعتمدة',
        maxStudentsQuota: 100,
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      modulesConfig: { ...DEFAULT_MODULES },
    });
    setActiveFormTab('identity');
    setIsMainModalOpen(true);
  };

  // Open Edit Tenant
  const handleOpenEdit = (tenant: MosqueComplexTenant) => {
    setIsNewTenant(false);
    setSelectedTenant(tenant);
    setEditAdminPassword('');
    setPasswordUpdateStatus(null);
    setCopiedPassword(false);
    setFormData({
      ...tenant,
      modulesConfig: tenant.modulesConfig || { ...DEFAULT_MODULES },
      subscription: tenant.subscription || {
        planId: 'growth',
        planName: 'باقة المجمعات المعتمدة',
        maxStudentsQuota: 100,
        status: 'active',
        startDate: '2026-01-01',
        validUntil: '2027-12-31',
      },
    });
    setActiveFormTab('identity');
    setIsMainModalOpen(true);
  };

  // Update Campus Admin Password for Existing Tenant
  const handleSaveAdminPassword = async () => {
    if (!selectedTenant || !editAdminPassword.trim() || isUpdatingPassword) return;
    setIsUpdatingPassword(true);
    setPasswordUpdateStatus(null);
    try {
      const ok = await updateCampusAdminPassword(selectedTenant.id, editAdminPassword.trim());
      if (ok) {
        setPasswordUpdateStatus({
          type: 'success',
          message: `تم تحديث كلمة مرور مدير مجمع (${selectedTenant.name}) بنجاح ويمكنه الدخول بها فوراً.`,
        });
        setEditAdminPassword('');
      } else {
        setPasswordUpdateStatus({
          type: 'error',
          message: 'تعذر تحديث كلمة المرور، يرجى المحاولة مرة أخرى.',
        });
      }
    } catch (err: any) {
      setPasswordUpdateStatus({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء حفظ كلمة المرور الجديدة.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Direct WhatsApp Share of Tenant Details & Credentials
  const handleShareTenantWhatsApp = (tenant: MosqueComplexTenant) => {
    const targetPhone = tenant.whatsappNumber || tenant.contactPhone || '';
    if (!targetPhone) {
      alert('يرجى التأكد من إضافة رقم هاتف أو واتساب للمجمع في بيانات التواصل أولاً.');
      return;
    }

    const tenantUrl = `${window.location.origin}/t/${tenant.slug || tenant.id}`;
    const loginIdentifier = tenant.contactPhone || tenant.email || tenant.supervisorName;
    const defaultPassword = 'Admin@123456';

    const message = `✨ *بيانات اعتماد مجمع ${tenant.name} - منصة إدارة المجمعات القرآنية* ✨

السلام عليكم ورحمة الله وبركاته،
حياكم الله أستاذنا الفاضل: *${tenant.supervisorName || 'المشرف العام'}*

يسرنا تزويدكم ببيانات الدخول والوصول الرسمية للمجمع على المنصة:

🏢 *اسم المجمع:* ${tenant.name}
📍 *المدينة / الحي:* ${tenant.city} ${tenant.district ? `- ${tenant.district}` : ''}
🔗 *رابط المجمع المباشر:*
${tenantUrl}

━━━━━━━━━━━━━━━
🔐 *بيانات تسجيل دخول مدير المجمع (Campus Admin):*
📱 *اسم المستخدم / رقم الجوال:* ${loginIdentifier}
🔑 *كلمة المرور الافتراضية:* ${defaultPassword}
━━━━━━━━━━━━━━━

💡 *ملاحظة هامة:*
• يرجى حفظ هذه الرسالة في مكان آمن.
• بإمكانكم تسجيل الدخول وإدارة الحلقات والطلاب والأنشطة مباشرة عبر رابط المنصة.

وفقكم الله وسدد خطاكم في خدمة كتاب الله تعالى 🌿`;

    const url = generateDirectWhatsAppUrl(targetPhone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    setCopiedNotification(`تم فتح محادثة واتساب لإرسال بيانات مجمع ${tenant.name}`);
    setTimeout(() => setCopiedNotification(null), 4000);
  };

  // Open Modules Config Modal
  const handleOpenModules = (tenant: MosqueComplexTenant) => {
    setSelectedTenant(tenant);
    setFormData({
      ...tenant,
      modulesConfig: tenant.modulesConfig || { ...DEFAULT_MODULES },
    });
    setIsModulesModalOpen(true);
  };

  // Open Subscription Modal
  const handleOpenSubscription = (tenant: MosqueComplexTenant) => {
    setSelectedTenant(tenant);
    setFormData({
      ...tenant,
      subscription: tenant.subscription || {
        planId: 'growth',
        planName: 'باقة المجمعات المعتمدة',
        maxStudentsQuota: 100,
        status: 'active',
        startDate: '2026-01-01',
        validUntil: '2027-12-31',
      },
    });
    setIsSubModalOpen(true);
  };

  // Toggle Tenant Active Status
  const handleToggleStatus = async (tenant: MosqueComplexTenant) => {
    const updated: MosqueComplexTenant = {
      ...tenant,
      isActive: !tenant.isActive,
    };
    await updateTenant(updated);
  };

  const handleDeleteTenant = async (tenant: MosqueComplexTenant) => {
    if (tenant.id === 'ghazzawi') {
      alert('لا يمكن حذف مجمع الغزاوي الأساسي حمايةً للبيانات التشغيلية.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف المجمع "${tenant.name}" نهائياً وحذف كافة المعلومات المرتبطة به؟`)) {
      try {
        await deleteTenant(tenant.id);
      } catch (err: any) {
        alert(err.message || 'حدث خطأ أثناء حذف المجمع');
      }
    }
  };

  // Toggle Module in local state
  const handleToggleModule = (moduleKey: keyof TenantModulesConfig) => {
    setFormData((prev) => {
      const currentConfig = prev.modulesConfig || { ...DEFAULT_MODULES };
      const currentVal = currentConfig[moduleKey] !== false;
      const nextVal = !currentVal;

      const nextConfig: TenantModulesConfig = {
        ...currentConfig,
        [moduleKey]: nextVal,
      };

      // Keep sync with aliases
      if (moduleKey === 'quranSpelling') nextConfig.spelling = nextVal;
      if (moduleKey === 'quranMemorization') nextConfig.quran = nextVal;
      if (moduleKey === 'educationalValues') nextConfig.educational = nextVal;
      if (moduleKey === 'finance') nextConfig.finances = nextVal;
      if (moduleKey === 'associationTesting') nextConfig.association = nextVal;
      if (moduleKey === 'badgesAndRewards') nextConfig.badges = nextVal;
      if (moduleKey === 'whatsappNotifications') nextConfig.whatsapp = nextVal;

      return {
        ...prev,
        modulesConfig: nextConfig,
      };
    });
  };

  // Save Tenant Submission
  const handleSubmitMainForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || isSaving) return;

    const slug =
      formData.slug?.trim() ||
      formData.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') ||
      `tenant-${Date.now()}`;

    setIsSaving(true);
    try {
      if (isNewTenant) {
        await addTenant(
          {
            slug,
            name: formData.name.trim(),
            description: formData.description || '',
            city: formData.city || 'جدة',
            district: formData.district || '',
            region: formData.region || 'منطقة مكة المكرمة',
            address: formData.address || '',
            supervisorName: formData.supervisorName || 'المشرف العام',
            contactPhone: formData.contactPhone || '0500000000',
            whatsappNumber: formData.whatsappNumber || formData.contactPhone || '',
            email: formData.email || '',
            logoUrl: formData.logoUrl || '',
            tenantType: formData.tenantType || 'production',
            isActive: formData.isActive !== false,
            showOnPublicDirectory: formData.showOnPublicDirectory !== false,
            customDomain: formData.customDomain || '',
            subscription: formData.subscription,
            modulesConfig: formData.modulesConfig || DEFAULT_MODULES,
            notes: formData.notes || '',
          },
          { password: adminInitialPassword?.trim() || 'Admin@123456' }
        );
      } else if (selectedTenant) {
        const updatedTenant: MosqueComplexTenant = {
          ...selectedTenant,
          slug,
          name: formData.name.trim(),
          description: formData.description || '',
          city: formData.city || selectedTenant.city,
          district: formData.district || selectedTenant.district,
          region: formData.region || selectedTenant.region || 'منطقة مكة المكرمة',
          address: formData.address || selectedTenant.address || '',
          supervisorName: formData.supervisorName || selectedTenant.supervisorName,
          contactPhone: formData.contactPhone || selectedTenant.contactPhone,
          whatsappNumber: formData.whatsappNumber || selectedTenant.whatsappNumber || '',
          email: formData.email || selectedTenant.email || '',
          logoUrl: formData.logoUrl || selectedTenant.logoUrl || '',
          tenantType: formData.tenantType || selectedTenant.tenantType || 'production',
          isActive: formData.isActive !== false,
          showOnPublicDirectory: formData.showOnPublicDirectory !== false,
          customDomain: formData.customDomain || '',
          subscription: formData.subscription || selectedTenant.subscription,
          modulesConfig: formData.modulesConfig || selectedTenant.modulesConfig,
          notes: formData.notes !== undefined ? formData.notes : selectedTenant.notes,
        };
        await updateTenant(updatedTenant);
      }
      setIsMainModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Modules Only
  const handleSaveModulesOnly = async () => {
    if (!selectedTenant || isSaving) return;
    setIsSaving(true);
    try {
      const updated: MosqueComplexTenant = {
        ...selectedTenant,
        modulesConfig: formData.modulesConfig || DEFAULT_MODULES,
      };
      await updateTenant(updated);
      setIsModulesModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Subscription Only
  const handleSaveSubscriptionOnly = async () => {
    if (!selectedTenant || !formData.subscription || isSaving) return;
    setIsSaving(true);
    try {
      const updated: MosqueComplexTenant = {
        ...selectedTenant,
        subscription: formData.subscription,
      };
      await updateTenant(updated);
      setIsSubModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* WhatsApp / Action Notification Toast */}
      {copiedNotification && (
        <div className="bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{copiedNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setCopiedNotification(null)}
            className="text-emerald-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header & KPI Statistics */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-serif">
                  إدارة المجمعات القرآنية (Platform Tenants Management)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  لوحة الإدارة المركزية لإدارة المجمعات كعملاء، الاشتراكات، السعات، والوحدات المتاحة لكل مجمع.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مجمع جديد</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-right">
            <div className="text-[11px] font-bold text-slate-500">إجمالي المجمعات</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">مجمع مسجل بالمنصة</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-right">
            <div className="text-[11px] font-bold text-emerald-700">المجمعات النشطة</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{stats.active}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">حالة تشغيل كاملة</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 text-right">
            <div className="text-[11px] font-bold text-amber-700">المجمعات التجريبية</div>
            <div className="text-2xl font-black text-amber-900 mt-1">{stats.demo}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">بيئات Demo مخصصة</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-right">
            <div className="text-[11px] font-bold text-rose-700">المجمعات المتوقفة</div>
            <div className="text-2xl font-black text-rose-900 mt-1">{stats.inactive}</div>
            <div className="text-[10px] text-rose-500 mt-0.5">معطلة أو منتهية</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-right col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-indigo-700">إجمالي السعة المرخصة</div>
            <div className="text-2xl font-black text-indigo-900 mt-1">{stats.totalQuota}</div>
            <div className="text-[10px] text-indigo-500 mt-0.5">مقعد طالب معتمد</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المجمع، النطاق، أو المدينة..."
            className="w-full pl-3 pr-9 py-2 rounded-xl text-xs border border-slate-200 focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>النوع:</span>
            </span>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setFilterType('production')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'production' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              إنتاجي
            </button>
            <button
              type="button"
              onClick={() => setFilterType('demo')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'demo' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تجريبي
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الحالة: الكل
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'active' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              نشط
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('inactive')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterStatus === 'inactive' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              متوقف
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tenants List (Grid of Platform Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTenants.map((tenant) => {
          const isDemo = tenant.tenantType === 'demo';
          const isActive = tenant.isActive !== false;
          const showOnDirectory = tenant.showOnPublicDirectory !== false;
          const tenantStudentsCount = students.filter((s) => (s.tenantId ? s.tenantId === tenant.id : tenant.id === 'ghazzawi')).length;
          const quota = tenant.subscription?.maxStudentsQuota || 100;
          const planName = tenant.subscription?.planName || (isDemo ? 'الباقة التجريبية' : 'باقة المجمعات المعتمدة');
          const validUntil = tenant.subscription?.validUntil || '2027-12-31';

          // Modules enabled flags (All 10 SaaS modules)
          const cfg = tenant.modulesConfig || {};
          const isQuran = cfg.quranMemorization !== false && cfg.quran !== false;
          const isAttendance = cfg.attendance !== false;
          const isSpelling = cfg.quranSpelling !== false && cfg.spelling !== false;
          const isEdu = cfg.educationalValues !== false && cfg.educational !== false;
          const isAdm = cfg.admissions !== false;
          const isFin = cfg.finance !== false && cfg.finances !== false;
          const isAssoc = cfg.associationTesting !== false && cfg.association !== false;
          const isBadges = cfg.badgesAndRewards !== false && cfg.badges !== false;
          const isWa = cfg.whatsappNotifications !== false && cfg.whatsapp !== false;
          const isParent = cfg.parentPortal !== false;

          const tenantModulesList = [
            { key: 'quran', label: 'القرآن الكريم', enabled: isQuran },
            { key: 'attendance', label: 'رصد الحضور', enabled: isAttendance },
            { key: 'spelling', label: 'الهجاء القرآني', enabled: isSpelling },
            { key: 'educational', label: 'القيم والتربية', enabled: isEdu },
            { key: 'admissions', label: 'القبول والتسجيل', enabled: isAdm },
            { key: 'finance', label: 'الرسوم والاشتراكات', enabled: isFin },
            { key: 'association', label: 'ترشيحات الجمعية', enabled: isAssoc },
            { key: 'badges', label: 'الأوسمة والتحفيز', enabled: isBadges },
            { key: 'whatsapp', label: 'إشعارات واتساب', enabled: isWa },
            { key: 'parentPortal', label: 'بوابة ولي الأمر', enabled: isParent },
          ];

          return (
            <div
              key={tenant.id}
              className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                isActive ? 'border-slate-200 hover:border-emerald-300 shadow-xs' : 'border-slate-300 bg-slate-50/70 opacity-90'
              }`}
            >
              <div>
                {/* Top Row: Identity & Status Badges */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {tenant.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        <Building2 className="w-7 h-7 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 font-serif truncate">{tenant.name}</h3>
                        {isDemo ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Demo تجريبي
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Production إنتاجي
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isActive ? 'نشط' : 'متوقف'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-mono text-emerald-700 dir-ltr bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          {tenant.slug}.schoolscreen.sa
                        </span>
                        <span>
                          {tenant.city} {tenant.district ? `• ${tenant.district}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleShareTenantWhatsApp(tenant)}
                      className="p-2 rounded-xl text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="إرسال بيانات المجمع وتسجيل الدخول للمدير عبر واتساب"
                    >
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold hidden sm:inline">إرسال بالواتساب</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tenant)}
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                      title="تعديل بيانات المجمع"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tenant description if available */}
                {tenant.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    {tenant.description}
                  </p>
                )}

                {/* Subscription & Quota Metrics */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{planName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>ينتهي: {validUntil}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">سعة الطلاب المستهلكة:</span>
                      <span className="font-bold text-slate-800">
                        {tenantStudentsCount} من {quota} طالب
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((tenantStudentsCount / quota) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Enabled Modules Badges */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                    <span>الوحدات والخدمات المتاحة للمجمع:</span>
                    <button
                      type="button"
                      onClick={() => handleOpenModules(tenant)}
                      className="text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>تعديل الوحدات</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tenantModulesList.map((mod) => (
                      <span
                        key={mod.key}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                          mod.enabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75'
                        }`}
                      >
                        {mod.enabled ? `✓ ${mod.label}` : `✕ ${mod.label}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary Contact & Directory Visibility */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tenant.supervisorName}</span>
                    </span>
                    <span className="font-mono dir-ltr text-slate-500">{tenant.contactPhone}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    {showOnDirectory ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <Eye className="w-3.5 h-3.5" />
                        <span>معروض بالدليل</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>مخفي من الدليل</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar - Pure Platform Management */}
              <div className={`mt-4 pt-3 border-t border-slate-100 grid ${tenant.id !== 'ghazzawi' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(tenant)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل المجمع</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenModules(tenant)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                  <span>الوحدات والمنصة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenSubscription(tenant)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                  <span>إدارة الاشتراك</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/t/${tenant.slug || tenant.id}`)}
                    className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                    title="فتح الصفحة العامة للمجمع"
                  >
                    <span>الصفحة</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(tenant)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'bg-teal-50 hover:bg-teal-100 text-teal-800'
                    }`}
                    title={isActive ? 'تعطيل المجمع مؤقتاً' : 'تفعيل المجمع'}
                  >
                    {isActive ? 'إيقاف' : 'تفعيل'}
                  </button>
                </div>

                {tenant.id !== 'ghazzawi' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTenant(tenant)}
                    className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1"
                    title="حذف المجمع وكافة المعلومات المرتبطة به"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المجمع</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. MAIN MODAL: Create / Full Edit Tenant (Fully Responsive) */}
      {isMainModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMainModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-800" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {isNewTenant ? 'إضافة مجمع مسجدي جديد للمنصة' : 'تعديل بيانات وهوية المجمع'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formData.name || 'إدارة الكيان على المنصة، الباقات، النطاقات والوحدات'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMainModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-slate-100 bg-slate-50/70 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setActiveFormTab('identity')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'identity'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>الهوية والتعريف</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('contact')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'contact'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>العنوان والتواصل</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('subscription')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'subscription'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>الاشتراك والسعة</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('modules')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'modules'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>الوحدات المتاحة</span>
              </button>
            </div>

            {/* Modal Form Body - Scrollable */}
            <form onSubmit={handleSubmitMainForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
                {/* TAB 1: IDENTITY & BASIC INFO */}
                {activeFormTab === 'identity' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        اسم المجمع القرآني الرسمي *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثال: مجمع مسجد الفرقان لتحفيظ القرآن الكريم"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          الاسم المختصر / الرابط الفرعي (Slug) *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.slug || ''}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            placeholder="مثال: furqan"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 font-mono dir-ltr bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          النطاق: {formData.slug || 'slug'}.schoolscreen.sa
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          النطاق المخصص (اختياري)
                        </label>
                        <input
                          type="text"
                          value={formData.customDomain || ''}
                          onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                          placeholder="quran.alfurqan.org"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 font-mono dir-ltr bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          شعار المجمع الرسمي
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowUrlFallback(!showUrlFallback)}
                          className="text-[11px] text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          {showUrlFallback ? 'إخفاء الرابط اليدوي' : 'أو إدخال رابط يدوي'}
                        </button>
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFile(file);
                          e.target.value = '';
                        }}
                      />

                      {/* Upload Box or Preview Card */}
                      {formData.logoUrl ? (
                        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl bg-white border border-emerald-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              <img
                                src={formData.logoUrl}
                                alt="شعار المجمع"
                                className="w-full h-full object-contain rounded-lg"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                                <span>تم رفع وتخزين الشعار بنجاح</span>
                              </div>
                              <p className="text-[10px] text-emerald-800 mt-0.5 truncate">
                                الشعار محفوظ ومدمج في المنظومة وقاعدة البيانات
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                            >
                              تغيير
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, logoUrl: '' })}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                              title="حذف الشعار"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setLogoDragActive(true);
                          }}
                          onDragLeave={() => setLogoDragActive(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setLogoDragActive(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleLogoFile(file);
                          }}
                          onClick={() => logoInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                            logoDragActive
                              ? 'border-emerald-500 bg-emerald-50 scale-[0.99]'
                              : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80'
                          }`}
                        >
                          {isProcessingLogo ? (
                            <div className="py-2 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                              <span className="text-xs font-bold text-slate-600">جاري معالجة وتخزين الشعار...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                <UploadCloud className="w-5 h-5" />
                              </div>
                              <p className="text-xs font-bold text-slate-700">
                                اضغط لرفع الشعار من جهازك، أو اسحب الملف وأفلته هنا
                              </p>
                              <p className="text-[10px] text-slate-400">
                                ملفات الصور المدعومة: PNG, JPG, WebP, SVG (يُخزن مباشرة في النظام)
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {logoError && (
                        <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{logoError}</span>
                        </p>
                      )}

                      {showUrlFallback && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <label className="block text-[10px] text-slate-500 mb-1">
                            أو أدخل رابطاً مباشراً (اختياري)
                          </label>
                          <input
                            type="text"
                            value={formData.logoUrl || ''}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        وصف المجمع ورسالته
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="نبذة تعريفية تظهر في الصفحة العامة للمجمع ودليل المجمعات..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          نوع الكيان على المنصة
                        </label>
                        <select
                          value={formData.tenantType || 'production'}
                          onChange={(e) => setFormData({ ...formData, tenantType: e.target.value as any })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-bold"
                        >
                          <option value="production">Production - مجمع إنتاجي رسمي</option>
                          <option value="demo">Demo - مجمع تجريبي / عرض</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          حالة المجمع التشغيلية
                        </label>
                        <select
                          value={formData.isActive !== false ? 'active' : 'inactive'}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-bold"
                        >
                          <option value="active">نشط ومتاح للمستخدمين</option>
                          <option value="inactive">متوقف مؤقتاً</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          الظهور في قسم "المجمعات المعتمدة" بالصفحة الرئيسية
                        </div>
                        <div className="text-[11px] text-slate-500">
                          إمكانية تصفح المجمع واستعراض خدماته من زوار المنصة
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, showOnPublicDirectory: formData.showOnPublicDirectory === false ? true : false })}
                        className={`p-1 rounded-xl transition-all cursor-pointer ${
                          formData.showOnPublicDirectory !== false ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {formData.showOnPublicDirectory !== false ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: ADDRESS & CONTACT */}
                {activeFormTab === 'contact' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة</label>
                        <input
                          type="text"
                          value={formData.region || ''}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                          placeholder="منطقة مكة المكرمة"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">المدينة *</label>
                        <input
                          type="text"
                          required
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="جدة"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">الحي</label>
                        <input
                          type="text"
                          value={formData.district || ''}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          placeholder="حي الروضة"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="شارع الكيال - بجوار مسجد الفرقان"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          اسم المشرف المسؤول / ممثل المجمع *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.supervisorName || ''}
                          onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })}
                          placeholder="أ. عبدالرحمن الغامدي"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          هاتف التواصل الأساسي *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.contactPhone || ''}
                          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                          placeholder="05XXXXXXXX"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-mono dir-ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          رقم الواتساب الرسمي للتواصل
                        </label>
                        <input
                          type="tel"
                          value={formData.whatsappNumber || ''}
                          onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                          placeholder="05XXXXXXXX"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-mono dir-ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          البريد الإلكتروني الرسمي
                        </label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="contact@complex.org"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-mono dir-ltr"
                        />
                      </div>
                    </div>

                    {isNewTenant ? (
                      <div className="mt-4 p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-900">
                            <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="text-xs font-bold">إنشاء حساب مدير المجمع تلقائياً (Campus Admin)</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800">
                            حساب مسؤول جديد
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          سيتم إنشاء حساب بصلاحية (مدير مجمع) مرتبط بهذا المجمع فوراً. اسم المستخدم للدخول هو{' '}
                          <strong>رقم الهاتف ({formData.contactPhone || 'المحدد أعلاه'})</strong>.
                        </p>
                        <div className="pt-1">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700">
                              كلمة المرور الافتراضية للمدير
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(adminInitialPassword);
                                setCopiedPassword(true);
                                setTimeout(() => setCopiedPassword(false), 2000);
                              }}
                              className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-bold cursor-pointer"
                            >
                              {copiedPassword ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>تم النسخ!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>نسخ كلمة المرور</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={adminInitialPassword}
                              onChange={(e) => setAdminInitialPassword(e.target.value)}
                              placeholder="Admin@123456"
                              className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-emerald-300 focus:outline-emerald-600 bg-white font-mono dir-ltr font-semibold text-slate-800"
                            />
                            <Lock className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500">
                            <Info className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>يمكن تركها كما هي <strong>Admin@123456</strong> أو تخصيصها، كما يمكنك إرسالها للمدير عبر زر الواتساب لاحقاً.</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800">
                            <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="text-xs font-bold">تعديل كلمة مرور مدير المجمع (Campus Admin)</span>
                          </div>
                          {formData.whatsappNumber || formData.contactPhone ? (
                            <button
                              type="button"
                              onClick={() => selectedTenant && handleShareTenantWhatsApp(selectedTenant)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                              title="إرسال بيانات الدخول للمدير عبر واتساب"
                            >
                              <Send className="w-3 h-3" />
                              <span>مشاركة عبر واتساب</span>
                            </button>
                          ) : null}
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          لتغيير كلمة مرور حساب مدير المجمع المسجل برقم الهاتف ({formData.contactPhone || selectedTenant?.contactPhone || 'غير محدد'})، أدخل كلمة المرور الجديدة أدناه واضغط حفظ.
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={editAdminPassword}
                                onChange={(e) => setEditAdminPassword(e.target.value)}
                                placeholder="أدخل كلمة المرور الجديدة (مثال: 123456 أو Admin@123456)"
                                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-mono dir-ltr font-semibold text-slate-800"
                              />
                              <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                            <button
                              type="button"
                              disabled={!editAdminPassword.trim() || isUpdatingPassword}
                              onClick={handleSaveAdminPassword}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                            >
                              {isUpdatingPassword ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span>حفظ كلمة المرور</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[10px] text-slate-500 font-bold">خيارات سريعة:</span>
                            <button
                              type="button"
                              onClick={() => setEditAdminPassword('123456')}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 text-slate-700 font-mono font-bold cursor-pointer"
                            >
                              123456
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditAdminPassword('Admin@123456')}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 hover:bg-slate-300 text-slate-700 font-mono font-bold cursor-pointer"
                            >
                              Admin@123456
                            </button>
                          </div>

                          {passwordUpdateStatus && (
                            <div
                              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                                passwordUpdateStatus.type === 'success'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {passwordUpdateStatus.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span className="font-bold">{passwordUpdateStatus.message}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: SUBSCRIPTION & SAAS PLAN */}
                {activeFormTab === 'subscription' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          باقة الاشتراك (SaaS Plan)
                        </label>
                        <select
                          value={formData.subscription?.planId || 'growth'}
                          onChange={(e) => {
                            const pId = e.target.value as 'starter' | 'growth' | 'enterprise';
                            const pName =
                              pId === 'enterprise'
                                ? 'باقة المجمعات المتميزة'
                                : pId === 'growth'
                                ? 'باقة التجربة الموسعة'
                                : 'باقة الانطلاقة القياسية';
                            setFormData({
                              ...formData,
                              subscription: {
                                ...(formData.subscription as TenantSubscriptionPlan),
                                planId: pId,
                                planName: pName,
                              },
                            });
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-bold"
                        >
                          <option value="starter">Starter - باقة الانطلاقة القياسية (حتى 50 طالب)</option>
                          <option value="growth">Growth - باقة النمو والتجربة الموسعة (حتى 100 طالب)</option>
                          <option value="enterprise">Enterprise - باقة المجمعات الكبرى المتميزة (غير محدود / مخصصة)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          الحد الأقصى المسموح للطلاب (Quota)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={5000}
                          value={formData.subscription?.maxStudentsQuota || 100}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subscription: {
                                ...(formData.subscription as TenantSubscriptionPlan),
                                maxStudentsQuota: parseInt(e.target.value, 10) || 100,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">حالة الاشتراك</label>
                        <select
                          value={formData.subscription?.status || 'active'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subscription: {
                                ...(formData.subscription as TenantSubscriptionPlan),
                                status: e.target.value as any,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-bold"
                        >
                          <option value="active">نشط (Active)</option>
                          <option value="trial">تجريبي (Trial)</option>
                          <option value="suspended">موقوف (Suspended)</option>
                          <option value="expired">منتهٍ (Expired)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ بداية الاشتراك</label>
                        <input
                          type="date"
                          value={formData.subscription?.startDate || '2026-01-01'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subscription: {
                                ...(formData.subscription as TenantSubscriptionPlan),
                                startDate: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ نهاية الاشتراك</label>
                        <input
                          type="date"
                          value={formData.subscription?.validUntil || '2027-12-31'}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subscription: {
                                ...(formData.subscription as TenantSubscriptionPlan),
                                validUntil: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: MODULES CONFIGURATION (10 SaaS Modules) */}
                {activeFormTab === 'modules' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">تحكم مدير المنصة في الوحدات المتاحة:</span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          تفعيل الوحدة يتيح لمدير المجمع (Campus Admin) تشغيلها وإدارتها داخلياً، بينما تعطيلها يخفيها تماماً من النظام لمنع الوصول غير المرخص.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { key: 'quranMemorization', label: 'حفظ وتثبيت القرآن الكريم', desc: 'مسارات الحفظ المتقن والمراجعة' },
                        { key: 'attendance', label: 'رصد الحضور والغياب اليومي', desc: 'سجلات الحضور والتأخر والاستئذان' },
                        { key: 'quranSpelling', label: 'الهجاء القرآني المطور', desc: 'قاعدة النور والتأسيس القرآني' },
                        { key: 'educationalValues', label: 'البرنامج القيمي والتربوي', desc: 'خطة الآداب والقيم الأسبوعية' },
                        { key: 'admissions', label: 'بوابة القبول والتسجيل', desc: 'استقبال طلبات الطلاب والمقابلات' },
                        { key: 'finance', label: 'إدارة الرسوم والاشتراكات', desc: 'السندات والتحصيل المالي' },
                        { key: 'associationTesting', label: 'ترشيحات اختبارات الجمعية', desc: 'التأهيل لاختبارات الجمعيات الخيرية' },
                        { key: 'badgesAndRewards', label: 'منظومة الأوسمة والتحفيز', desc: 'أوسمة الإنجاز وتكريم المتميزين' },
                        { key: 'whatsappNotifications', label: 'إشعارات وتقارير واتساب', desc: 'الربط الآلي مع أولياء الأمور' },
                        { key: 'parentPortal', label: 'البوابة الذكية لولي الأمر', desc: 'متابعة الحفظ والتقارير الشهرية' },
                      ].map((item) => {
                        const isEnabled = (formData.modulesConfig as any)?.[item.key] !== false;
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleToggleModule(item.key as any)}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                              isEnabled
                                ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">{item.label}</div>
                              <div className="text-[10px] text-slate-500">{item.desc}</div>
                            </div>
                            <div className={isEnabled ? 'text-emerald-700' : 'text-slate-400'}>
                              {isEnabled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Fixed Footer with Clear Action Buttons */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 shrink-0 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsMainModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
                >
                  إلغاء وخروج
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري الحفظ والتسجيل...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isNewTenant ? 'إنشاء المجمع' : 'حفظ التعديلات'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. QUICK MODAL: Modules Configuration Only */}
      {isModulesModalOpen && selectedTenant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModulesModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    إعدادات وحدات المنصة المتاحة
                  </h3>
                  <p className="text-[11px] text-slate-500">{selectedTenant.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModulesModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {[
                { key: 'quranMemorization', label: 'حفظ وتثبيت القرآن الكريم' },
                { key: 'attendance', label: 'رصد الحضور والغياب اليومي' },
                { key: 'quranSpelling', label: 'الهجاء القرآني المطور' },
                { key: 'educationalValues', label: 'البرنامج القيمي والتربوي الأسبوعي' },
                { key: 'admissions', label: 'بوابة القبول والتسجيل الإلكتروني' },
                { key: 'finance', label: 'إدارة الرسوم والاشتراكات المالية' },
                { key: 'associationTesting', label: 'ترشيحات اختبارات الجمعية' },
                { key: 'badgesAndRewards', label: 'منظومة الأوسمة والتحفيز الذكي' },
                { key: 'whatsappNotifications', label: 'إشعارات وتقارير الواتساب' },
                { key: 'parentPortal', label: 'البوابة الذكية لولي الأمر' },
              ].map((item) => {
                const isEnabled = (formData.modulesConfig as any)?.[item.key] !== false;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleModule(item.key as any)}
                    className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isEnabled
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className={`text-xs font-black ${isEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {isEnabled ? 'مفعّلة' : 'معطلة'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsModulesModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveModulesOnly}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري حفظ الوحدات...</span>
                  </>
                ) : (
                  <span>حفظ إعدادات الوحدات</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. QUICK MODAL: Subscription Only */}
      {isSubModalOpen && selectedTenant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSubModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    إدارة اشتراك وسعة المجمع
                  </h3>
                  <p className="text-[11px] text-slate-500">{selectedTenant.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الباقة</label>
                <select
                  value={formData.subscription?.planId || 'growth'}
                  onChange={(e) => {
                    const pId = e.target.value as any;
                    const pName =
                      pId === 'enterprise'
                        ? 'باقة المجمعات المتميزة'
                        : pId === 'growth'
                        ? 'باقة التجربة الموسعة'
                        : 'باقة الانطلاقة القياسية';
                    setFormData({
                      ...formData,
                      subscription: {
                        ...(formData.subscription as TenantSubscriptionPlan),
                        planId: pId,
                        planName: pName,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="starter">Starter - باقة الانطلاقة القياسية</option>
                  <option value="growth">Growth - باقة التجربة الموسعة</option>
                  <option value="enterprise">Enterprise - باقة المجمعات المتميزة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحد الأقصى للطلاب المسموح بهم (Quota)
                </label>
                <input
                  type="number"
                  min={10}
                  value={formData.subscription?.maxStudentsQuota || 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscription: {
                        ...(formData.subscription as TenantSubscriptionPlan),
                        maxStudentsQuota: parseInt(e.target.value, 10) || 100,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة الاشتراك</label>
                <select
                  value={formData.subscription?.status || 'active'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscription: {
                        ...(formData.subscription as TenantSubscriptionPlan),
                        status: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="active">نشط (Active)</option>
                  <option value="trial">تجريبي (Trial)</option>
                  <option value="suspended">موقوف (Suspended)</option>
                  <option value="expired">منتهٍ (Expired)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ انتهاء الاشتراك</label>
                <input
                  type="date"
                  value={formData.subscription?.validUntil || '2027-12-31'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscription: {
                        ...(formData.subscription as TenantSubscriptionPlan),
                        validUntil: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsSubModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSubscriptionOnly}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>جاري تحديث الاشتراك...</span>
                  </>
                ) : (
                  <span>تحديث بيانات الاشتراك</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
