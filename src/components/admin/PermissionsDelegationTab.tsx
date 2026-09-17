import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  CheckCircle2,
  Lock,
  Eye,
  Edit3,
  Save,
  Check,
  CheckCheck,
  EyeOff,
  RotateCcw,
  Zap,
  X,
  UserCheck,
  SlidersHorizontal,
  BookOpen,
  Users,
  Calendar,
  DollarSign,
  Award,
  Sparkles,
  Layers,
  Send,
  Sliders,
  Settings,
  Database,
  Archive,
  Compass,
  FileSpreadsheet,
  Video,
  CreditCard,
  Building2,
  Activity,
  History,
  ShieldAlert,
  FileText,
  Server,
  Image as ImageIcon,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, SUPERVISOR_TYPE_DEFAULT_PERMISSIONS, getEffectivePermissions } from '../../lib/permissions';
import { User, UserRole, MosqueComplexTenant } from '../../types';
import { NavCategory } from '../../lib/navigationConfig';

export interface PermissionPageItem {
  id: string;
  label: string;
  category: NavCategory;
  categoryTitle: string;
  view: string | null;
  edit: string | null;
  description: string;
  icon?: React.ElementType;
  isSensitive?: boolean;
}

// Complete list of all 36 pages/features matching the unified sidebar
export const PERMISSION_PAGE_ITEMS: PermissionPageItem[] = [
  // 1. Overview (الرئيسية / النظرة العامة)
  {
    id: 'dashboard',
    label: 'الرئيسية والمؤشرات',
    category: 'overview',
    categoryTitle: '🏠 الرئيسية / النظرة العامة',
    view: 'view_dashboard',
    edit: null,
    description: 'عرض لوحة المؤشرات العامة والإحصائيات ورسوم الأداء',
    icon: Activity,
  },

  // 2. Teachers & Halaqahs (قسم الشؤون الإدارية)
  {
    id: 'halaqahs',
    label: 'الحلقات القرآنية',
    category: 'teachers_halaqahs',
    categoryTitle: '🏢 قسم الشؤون الإدارية',
    view: 'view_halaqahs',
    edit: 'manage_halaqahs',
    description: 'الاطلاع على الحلقات أو إنشاء وتعديل وهيكلة الحلقات',
    icon: BookOpen,
  },
  {
    id: 'teachers',
    label: 'إدارة المعلمين',
    category: 'teachers_halaqahs',
    categoryTitle: '🏢 قسم الشؤون الإدارية',
    view: 'view_teachers',
    edit: 'manage_teachers',
    description: 'عرض قائمة المعلمين أو إضافة وتعديل بياناتهم وتوزيعهم',
    icon: Users,
  },
  {
    id: 'supervisors',
    label: 'إدارة المشرفين',
    category: 'teachers_halaqahs',
    categoryTitle: '🏢 قسم الشؤون الإدارية',
    view: 'view_supervisors',
    edit: 'manage_supervisors',
    description: 'عرض كادر المشرفين أو تعيين وتعديل أدوارهم ونطاقاتهم',
    icon: Shield,
  },
  {
    id: 'attendance',
    label: 'الحضور والانصراف',
    category: 'teachers_halaqahs',
    categoryTitle: '🏢 قسم الشؤون الإدارية',
    view: 'view_attendance',
    edit: 'manage_attendance',
    description: 'الاطلاع على كشوفات الحضور أو رصد واعتماد الغياب والتأخير',
    icon: Calendar,
  },

  // 3. Quran & Curriculum (قسم الشؤون التعليمية (الأكاديمية))
  {
    id: 'quran',
    label: 'المخرج القرآني',
    category: 'quran_curriculum',
    categoryTitle: '📖 قسم الشؤون التعليمية (الأكاديمية)',
    view: 'view_quran',
    edit: 'manage_quran',
    description: 'متابعة خطط الحفظ أو تقييم وتسميع الطلاب ورصد الدرجات',
    icon: FileText,
  },
  {
    id: 'spelling',
    label: 'الهجاء القرآني',
    category: 'quran_curriculum',
    categoryTitle: '📖 قسم الشؤون التعليمية (الأكاديمية)',
    view: 'view_spelling',
    edit: 'manage_spelling',
    description: 'متابعة أو تقييم طلاب القاعدة النورانية والهجاء والتهجي',
    icon: Sparkles,
  },
  {
    id: 'curriculum_templates',
    label: 'قوالب الخطط القرآنية',
    category: 'quran_curriculum',
    categoryTitle: '📖 قسم الشؤون التعليمية (الأكاديمية)',
    view: 'view_curriculum',
    edit: 'manage_curriculum',
    description: 'استعراض أو إنشاء وتعديل قوالب ونماذج الخطط القرآنية للحلقات والمراحل',
    icon: Compass,
  },
  {
    id: 'tracks',
    label: 'المسارات التعليمية',
    category: 'quran_curriculum',
    categoryTitle: '📖 قسم الشؤون التعليمية (الأكاديمية)',
    view: 'view_tracks',
    edit: 'manage_tracks',
    description: 'استعراض أو إدارة وتعيين الطلاب للمسارات التعليمية',
    icon: Layers,
  },
  {
    id: 'stages',
    label: 'المراحل الدراسية',
    category: 'quran_curriculum',
    categoryTitle: '📖 قسم الشؤون التعليمية (الأكاديمية)',
    view: 'view_stages',
    edit: 'manage_stages',
    description: 'عرض أو هيكلة وتعديل الصفوف والمراحل الدراسية',
    icon: Layers,
  },
  {
    id: 'nominations',
    label: 'ترشيحات الجمعية',
    category: 'quran_curriculum',
    categoryTitle: '📖 قسم الشؤون التعليمية (الأكاديمية)',
    view: 'view_nominations',
    edit: 'manage_nominations',
    description: 'عرض أو ترشيح الطلاب لاختبارات الجمعية واعتمادها',
    icon: Award,
  },

  // 4. Educational Programs (قسم الشؤون التربوية)
  {
    id: 'educational',
    label: 'البرامج والمناهج التربوية',
    category: 'educational_programs',
    categoryTitle: '🌱 قسم الشؤون التربوية',
    view: 'view_educational',
    edit: 'manage_educational',
    description: 'استعراض أو إضافة وتوثيق الأنشطة والدرجات التربوية',
    icon: Calendar,
  },

  // 5. Students & Services (قسم شؤون الطلاب)
  {
    id: 'students',
    label: 'شؤون الطلاب',
    category: 'students_services',
    categoryTitle: '👨‍🎓 قسم شؤون الطلاب',
    view: 'view_students',
    edit: 'manage_students',
    description: 'عرض ملفات الطلاب أو إضافتهم ونقلهم وتعديل بياناتهم',
    icon: Users,
  },
  {
    id: 'admissions',
    label: 'القبول والتسجيل',
    category: 'students_services',
    categoryTitle: '👨‍🎓 قسم شؤون الطلاب',
    view: 'view_admissions',
    edit: 'manage_admissions',
    description: 'استعراض طلبات التسجيل أو قبول ورفض وتسكين المتقدمين',
    icon: Users,
  },
  {
    id: 'admissions_settings',
    label: 'إعدادات القبول والتسجيل',
    category: 'students_services',
    categoryTitle: '👨‍🎓 قسم شؤون الطلاب',
    view: null,
    edit: 'manage_admissions_settings',
    description: 'فتح وإغلاق التسجيل وتخصيص شروط ونماذج القبول',
    icon: Settings,
  },
  {
    id: 'finances',
    label: 'إدارة السجلات المالية',
    category: 'finance_collection',
    categoryTitle: '💰 القسم المالي والتحصيل',
    view: 'view_finance',
    edit: 'manage_finance',
    description: 'عرض الرسوم والاشتراكات أو تسجيل الدفعات والسندات المالية',
    icon: DollarSign,
  },
  {
    id: 'financial_settings',
    label: 'الإعدادات المالية',
    category: 'finance_collection',
    categoryTitle: '💰 القسم المالي والتحصيل',
    view: null,
    edit: 'manage_finance_settings',
    description: 'ضبط الحسابات البنكية، خطط الرسوم، والسياسات المالية',
    icon: CreditCard,
  },
  {
    id: 'points',
    label: 'تحفيز الطلاب والنقاط',
    category: 'students_services',
    categoryTitle: '👨‍🎓 قسم شؤون الطلاب',
    view: 'view_points',
    edit: 'manage_points',
    description: 'عرض رصيد النقاط أو منح وحسم نقاط الطلاب',
    icon: Award,
  },
  {
    id: 'points_rules',
    label: 'قواعد ومعايير النقاط',
    category: 'students_services',
    categoryTitle: '👨‍🎓 قسم شؤون الطلاب',
    view: null,
    edit: 'manage_points_rules',
    description: 'ضبط معايير الأوسمة والجوائز وبرنامج التحفيز الطلابي',
    icon: Sliders,
  },
  {
    id: 'support',
    label: 'الدعم والمراقبة الطارئة',
    category: 'students_services',
    categoryTitle: '👨‍🎓 قسم شؤون الطلاب',
    view: 'view_support',
    edit: 'manage_support',
    description: 'متابعة نداءات الدعم والتدخل السريع والمساعدة الطارئة',
    icon: ShieldAlert,
  },

  // 6. Reports (قسم التقارير والمتابعة)
  {
    id: 'reports_center',
    label: 'مركز التقارير 📲',
    category: 'reports',
    categoryTitle: '📊 قسم التقارير والمتابعة',
    view: 'view_reports',
    edit: 'manage_reports',
    description: 'عرض مؤشرات الأداء أو تصدير وتوليد التقارير',
    icon: Send,
  },
  {
    id: 'meetings',
    label: 'الاجتماعات والمحاضر 📝',
    category: 'reports',
    categoryTitle: '📊 قسم التقارير والمتابعة',
    view: 'view_meetings',
    edit: 'manage_meetings',
    description: 'الاطلاع على الاجتماعات أو إنشائها وتوثيق المحاضر والقرارات',
    icon: Calendar,
  },
  {
    id: 'group-report',
    label: 'تقرير الجروب 📲',
    category: 'reports',
    categoryTitle: '📊 قسم التقارير والمتابعة',
    view: null,
    edit: 'send_group_report',
    description: 'إرسال تقارير الحلقات لأولياء الأمور عبر الواتساب',
    icon: Send,
  },
  {
    id: 'reports_settings',
    label: 'إعدادات التقارير',
    category: 'reports',
    categoryTitle: '📊 قسم التقارير والمتابعة',
    view: null,
    edit: 'manage_reports_settings',
    description: 'تخصيص قوالب وصيغ ومقدمات التقارير الدورية والواتساب',
    icon: Settings,
  },

  // 7. Public Interface (إعدادات الواجهة الأمامية)
  {
    id: 'frontend',
    label: 'إعدادات الواجهة الأمامية',
    category: 'public_interface',
    categoryTitle: '🌐 إعدادات الواجهة الأمامية',
    view: null,
    edit: 'manage_frontend',
    description: 'تعديل وتصميم محتوى الصفحة الرئيسية العامة للمجمع',
    icon: Sliders,
  },
  {
    id: 'frontend_banners',
    label: 'البانرات الترويجية',
    category: 'public_interface',
    categoryTitle: '🌐 إعدادات الواجهة الأمامية',
    view: null,
    edit: 'manage_frontend_banners',
    description: 'إدارة وتخصيص الشرائح والبانرات الترويجية على الموقع',
    icon: ImageIcon,
  },
  {
    id: 'frontend_ads',
    label: 'الإعلانات والأنشطة',
    category: 'public_interface',
    categoryTitle: '🌐 إعدادات الواجهة الأمامية',
    view: null,
    edit: 'manage_frontend_ads',
    description: 'نشر وتحديث الإعلانات والأنشطة على الواجهة العامة',
    icon: Sliders,
  },
  {
    id: 'frontend_videos',
    label: 'الفيديوهات والمحتوى المرئي',
    category: 'public_interface',
    categoryTitle: '🌐 إعدادات الواجهة الأمامية',
    view: null,
    edit: 'manage_frontend_videos',
    description: 'إدارة وتضمين مقاطع الفيديو والمحتوى المرئي',
    icon: Video,
  },

  // 8. Global Settings (الإعدادات العامة)
  {
    id: 'academic',
    label: 'التقويم الأكاديمي',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_academic',
    description: 'ضبط العام الدراسي الحالي والأسابيع والإجازات',
    icon: Calendar,
  },
  {
    id: 'archives',
    label: 'الأرشيف الأكاديمي',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: 'view_archives',
    edit: 'manage_archives',
    description: 'الاطلاع على الأرشيف أو إغلاق الفصول وترحيل السجلات',
    icon: Archive,
  },
  {
    id: 'quranIntegration',
    label: 'إعدادات المصاحف والتكامل',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_quran_integration',
    description: 'ربط واجهات ومصاحف القرآن الإلكترونية والتكاملات',
    icon: Server,
  },
  {
    id: 'attendance_settings',
    label: 'إعدادات الحضور والانصراف',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_attendance_settings',
    description: 'ضبط قواعد ومواعيد الحضور والموقع الجغرافي والباركود',
    icon: Settings,
  },
  {
    id: 'logos',
    label: 'الهوية والشعارات',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_logos',
    description: 'تغيير شعارات المجمع والهوية البصرية الرسمية',
    icon: ImageIcon,
  },
  {
    id: 'permissions',
    label: 'الصلاحيات والتفويض',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_staff',
    description: 'إدارة مصفوفة الصلاحيات والتفويضات للمستخدمين',
    icon: Shield,
    isSensitive: true,
  },
  {
    id: 'whatsapp_settings',
    label: 'الربط والإشعارات (WhatsApp)',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_whatsapp',
    description: 'إعدادات خادم ومفاتيح الواتساب والرسائل الآلية',
    icon: Send,
  },
  {
    id: 'bulk_import',
    label: 'الاستيراد الشامل للمجمع',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_bulk_import',
    description: 'رفع ملفات Excel لاستيراد الطلاب والمعلمين والحلقات',
    icon: FileSpreadsheet,
  },
  {
    id: 'backup',
    label: 'النسخ الاحتياطي والبيانات',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: null,
    edit: 'manage_backup',
    description: 'أخذ وتنزيل واستعادة النسخ الاحتياطية لقاعدة البيانات',
    icon: Database,
  },
  {
    id: 'audit',
    label: 'سجل العمليات والرقابة',
    category: 'global_settings',
    categoryTitle: '⚙️ الإعدادات العامة',
    view: 'view_audit',
    edit: null,
    description: 'الاطلاع على سجل العمليات والتدقيق الأمني والرقابة',
    icon: History,
  },
];

const CATEGORIES_ORDER: { key: NavCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'كل الصفحات', icon: '🌐' },
  { key: 'overview', label: 'الرئيسية', icon: '🏠' },
  { key: 'teachers_halaqahs', label: 'قسم الشؤون الإدارية', icon: '🏢' },
  { key: 'quran_curriculum', label: 'قسم الشؤون التعليمية (الأكاديمية)', icon: '📖' },
  { key: 'educational_programs', label: 'قسم الشؤون التربوية', icon: '🌱' },
  { key: 'students_services', label: 'قسم شؤون الطلاب', icon: '👨‍🎓' },
  { key: 'finance_collection', label: 'القسم المالي والتحصيل', icon: '💰' },
  { key: 'reports', label: 'قسم التقارير والمتابعة', icon: '📊' },
  { key: 'public_interface', label: 'إعدادات الواجهة الأمامية', icon: '🌐' },
  { key: 'global_settings', label: 'الإعدادات العامة', icon: '⚙️' },
];

export const PermissionsDelegationTab: React.FC = () => {
  const { users, currentUser, activeTenantId, activeTenant, updateUser, updateTenant } = useApp();

  const [activeTab, setActiveTab] = useState<'role_config' | 'user_delegation'>('role_config');

  // Role Config State - Default to logged in user role if campus_admin, otherwise teacher
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>(() => {
    return currentUser?.role === 'campus_admin' ? 'campus_admin' : 'teacher';
  });
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<NavCategory | 'all'>('all');
  
  // User Delegation State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userPermSearchQuery, setUserPermSearchQuery] = useState('');
  const [selectedUserCategory, setSelectedUserCategory] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [delegationModal, setDelegationModal] = useState<{ permId: string, type: 'grant' | 'edit' } | null>(null);
  const [delegationExpiryDate, setDelegationExpiryDate] = useState('');

  // The roles we can configure - includes campus_admin and system_admin for full control over the admin sidebar!
  const configurableRoles = [
    { key: 'campus_admin', label: 'مدير المجمع (أنت / الإدارة)', badge: 'الإدارة' },
    { key: 'teacher', label: 'معلم حلقة', badge: 'الكادر التعليمي' },
    { key: 'general_supervisor', label: 'مشرف عام', badge: 'الكادر الإشرافي' },
    { key: 'educational_supervisor', label: 'مشرف تربوي', badge: 'الكادر الإشرافي' },
    { key: 'quran_supervisor', label: 'مشرف قرآني', badge: 'الكادر الإشرافي' },
    { key: 'stage_supervisor', label: 'مشرف مرحلة', badge: 'الكادر الإشرافي' },
    { key: 'finance_supervisor', label: 'مشرف مالي', badge: 'الكادر الإشرافي' },
    { key: 'admissions_supervisor', label: 'مشرف قبول وتسجيل', badge: 'الكادر الإشرافي' },
    { key: 'spelling_supervisor', label: 'مشرف تهجي', badge: 'الكادر الإشرافي' },
    { key: 'system_admin', label: 'مدير النظام (فني)', badge: 'إدارة النظام' },
  ];

  // ==========================================
  // TAB 1: ROLE CONFIGURATION
  // ==========================================

  // Optimistic local state for INSTANT (0ms) button, count, and badge reactivity
  const [localOverrides, setLocalOverrides] = useState<Record<string, string[]>>(() => {
    return activeTenant?.rolePermissionsOverrides || {};
  });

  // Keep local state in sync when activeTenant updates from context
  useEffect(() => {
    if (activeTenant?.rolePermissionsOverrides) {
      setLocalOverrides(activeTenant.rolePermissionsOverrides);
    }
  }, [activeTenant?.rolePermissionsOverrides]);
  
  const getRolePermissions = useCallback((roleKey: string): string[] => {
    if (localOverrides[roleKey] !== undefined) {
      return localOverrides[roleKey];
    }
    if (activeTenant?.rolePermissionsOverrides?.[roleKey] !== undefined) {
      return activeTenant.rolePermissionsOverrides[roleKey];
    }
    if (roleKey === 'teacher') return DEFAULT_ROLE_PERMISSIONS['teacher'];
    if (roleKey === 'campus_admin' || roleKey === 'system_admin' || roleKey === 'admin') {
      return ALL_PERMISSIONS.map(p => p.id);
    }
    return SUPERVISOR_TYPE_DEFAULT_PERMISSIONS[roleKey] || [];
  }, [localOverrides, activeTenant?.rolePermissionsOverrides]);

  const currentRolePerms = getRolePermissions(selectedRoleKey);

  const getGroupStateForRole = (item: PermissionPageItem): 'hide' | 'view' | 'edit' => {
    const hasView = item.view && currentRolePerms.includes(item.view);
    const hasEdit = item.edit && currentRolePerms.includes(item.edit);
    
    if (hasEdit) return 'edit';
    if (hasView) return 'view';
    return 'hide';
  };

  const handleLevelSelect = async (item: PermissionPageItem, level: 'hide' | 'view' | 'edit') => {
    const { view, edit } = item;
    const viewId = view;
    const editId = edit;

    // Calculate new permissions based on current state
    let currentPerms = getRolePermissions(selectedRoleKey);
    let newPerms = [...currentPerms];
    if (viewId) newPerms = newPerms.filter(p => p !== viewId);
    if (editId) newPerms = newPerms.filter(p => p !== editId);

    if (level === 'view') {
      if (viewId) newPerms.push(viewId);
    } else if (level === 'edit') {
      if (viewId) newPerms.push(viewId);
      if (editId) newPerms.push(editId);
    }

    const uniquePerms = Array.from(new Set(newPerms));
    const updatedOverrides = { ...localOverrides, [selectedRoleKey]: uniquePerms };

    // 1. INSTANT OPTIMISTIC STATE UPDATE: React re-renders IMMEDIATELY (0ms latency!)
    setLocalOverrides(updatedOverrides);

    // 2. Persist to AppContext and Firestore in background
    if (activeTenant) {
      const updatedTenant = { ...activeTenant, rolePermissionsOverrides: updatedOverrides };
      try {
        await updateTenant(updatedTenant);
        const actionLabel = level === 'hide' ? 'إخفاء' : level === 'view' ? 'رؤية فقط' : 'رؤية وتعديل';
        setSuccessMessage(`تم تبديل حالة "${item.label}" إلى (${actionLabel}) وتحديث القائمة الجانبية فوراً`);
        setTimeout(() => setSuccessMessage(''), 2500);
      } catch (err) {
        console.error('Error updating tenant permissions:', err);
      }
    }
  };

  const handleBulkCategoryAction = async (category: NavCategory, targetLevel: 'edit' | 'view' | 'hide') => {
    const categoryItems = PERMISSION_PAGE_ITEMS.filter(item => item.category === category);
    let currentPerms = getRolePermissions(selectedRoleKey);
    let newPerms = [...currentPerms];

    categoryItems.forEach(item => {
      if (item.view) newPerms = newPerms.filter(p => p !== item.view);
      if (item.edit) newPerms = newPerms.filter(p => p !== item.edit);

      if (targetLevel === 'edit') {
        if (item.view) newPerms.push(item.view);
        if (item.edit) newPerms.push(item.edit);
      } else if (targetLevel === 'view') {
        if (item.view) newPerms.push(item.view);
        else if (item.edit) newPerms.push(item.edit); // for single edit action items
      }
    });

    const uniquePerms = Array.from(new Set(newPerms));
    const updatedOverrides = { ...localOverrides, [selectedRoleKey]: uniquePerms };

    // 1. INSTANT OPTIMISTIC STATE UPDATE
    setLocalOverrides(updatedOverrides);

    // 2. Persist to AppContext & Firestore
    if (activeTenant) {
      const updatedTenant = { ...activeTenant, rolePermissionsOverrides: updatedOverrides };
      try {
        await updateTenant(updatedTenant);
        setSuccessMessage('تم تطبيق الإجراء الجماعي على القسم بنجاح وتحديث القائمة فوراً');
        setTimeout(() => setSuccessMessage(''), 2500);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBulkAllPages = async (targetLevel: 'edit' | 'view' | 'hide') => {
    let newPerms: string[] = [];
    if (targetLevel === 'edit') {
      PERMISSION_PAGE_ITEMS.forEach(item => {
        if (item.view) newPerms.push(item.view);
        if (item.edit) newPerms.push(item.edit);
      });
    } else if (targetLevel === 'view') {
      PERMISSION_PAGE_ITEMS.forEach(item => {
        if (item.view) newPerms.push(item.view);
        else if (item.edit) newPerms.push(item.edit);
      });
    }

    const uniquePerms = Array.from(new Set(newPerms));
    const updatedOverrides = { ...localOverrides, [selectedRoleKey]: uniquePerms };

    // 1. INSTANT OPTIMISTIC STATE UPDATE
    setLocalOverrides(updatedOverrides);

    // 2. Persist to AppContext & Firestore
    if (activeTenant) {
      const updatedTenant = { ...activeTenant, rolePermissionsOverrides: updatedOverrides };
      try {
        await updateTenant(updatedTenant);
        setSuccessMessage(
          targetLevel === 'edit'
            ? 'تم تفعيل جميع صفحات الموقع (36 صفحة) بصلاحية كاملة للدور وتحديث القائمة فوراً'
            : targetLevel === 'view'
            ? 'تم ضبط جميع صفحات الموقع (36 صفحة) كرؤية فقط للدور وتحديث القائمة فوراً'
            : 'تم إخفاء جميع صفحات الموقع عن هذا الدور وتحديث القائمة فوراً'
        );
        setTimeout(() => setSuccessMessage(''), 2500);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleResetRoleToDefault = async () => {
    const updatedOverrides = { ...localOverrides };
    delete updatedOverrides[selectedRoleKey];

    // 1. INSTANT OPTIMISTIC STATE UPDATE
    setLocalOverrides(updatedOverrides);

    // 2. Persist to AppContext & Firestore
    if (activeTenant) {
      const updatedTenant = { ...activeTenant, rolePermissionsOverrides: updatedOverrides };
      try {
        await updateTenant(updatedTenant);
        setSuccessMessage(`تمت استعادة الصلاحيات الافتراضية الأصلية للدور وتحديث القائمة فوراً`);
        setTimeout(() => setSuccessMessage(''), 2500);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter items for Role Config
  const filteredPageItems = useMemo(() => {
    return PERMISSION_PAGE_ITEMS.filter(item => {
      if (selectedRoleCategory !== 'all' && item.category !== selectedRoleCategory) return false;
      if (roleSearchQuery) {
        const q = roleSearchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.categoryTitle.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedRoleCategory, roleSearchQuery]);

  // Group filtered items by category
  const groupedPageItems = useMemo(() => {
    const groups: { [cat: string]: { categoryTitle: string; category: NavCategory; items: PermissionPageItem[] } } = {};
    filteredPageItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = {
          category: item.category,
          categoryTitle: item.categoryTitle,
          items: [],
        };
      }
      groups[item.category].items.push(item);
    });
    return Object.values(groups);
  }, [filteredPageItems]);

  // ==========================================
  // TAB 2: USER DELEGATION
  // ==========================================

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (!['teacher', 'supervisor', 'admin'].includes(u.role)) return false;
      if (u.tenantId && u.tenantId !== activeTenantId) return false;
      
      if (searchQuery) {
        return u.name.toLowerCase().includes(searchQuery.toLowerCase()) || (u.phone && u.phone.includes(searchQuery));
      }
      return true;
    });
  }, [users, activeTenantId, searchQuery]);

  const selectedUser = users.find(u => u.id === selectedUserId);
  const baseInheritedPerms = useMemo(() => getEffectivePermissions({ ...selectedUser, customPermissions: [] } as User, activeTenant), [selectedUser, activeTenant]);
  const userCustomPerms = selectedUser?.customPermissions || [];
  const userTempPerms = selectedUser?.temporaryCustomPermissions || [];

  const handleOpenDelegationModal = (permId: string) => {
    if (!selectedUser) return;
    if (baseInheritedPerms.includes(permId) && !userCustomPerms.includes(permId) && !userTempPerms.find(t => t.id === permId)) {
      return;
    }
    
    const existingTemp = userTempPerms.find(t => t.id === permId);
    if (existingTemp) {
      setDelegationExpiryDate(existingTemp.expiresAt.split('T')[0]);
    } else {
      setDelegationExpiryDate(''); // Permanent by default
    }
    
    setDelegationModal({ permId, type: (userCustomPerms.includes(permId) || existingTemp) ? 'edit' : 'grant' });
  };

  const handleSaveDelegation = async () => {
    if (!selectedUser || !delegationModal) return;
    
    const { permId } = delegationModal;
    let newCustom = [...userCustomPerms].filter(p => p !== permId);
    let newTemp = [...userTempPerms].filter(p => p.id !== permId);

    if (delegationExpiryDate) {
      // Temporary
      newTemp.push({
        id: permId,
        expiresAt: new Date(delegationExpiryDate).toISOString(),
      });
    } else {
      // Permanent
      newCustom.push(permId);
    }

    const updatedUser = { 
      ...selectedUser, 
      customPermissions: newCustom,
      temporaryCustomPermissions: newTemp
    };

    try {
      await updateUser(selectedUser.id, updatedUser);
      setSuccessMessage('تم تحديث تفويض المستخدم بنجاح');
      setTimeout(() => setSuccessMessage(''), 2000);
      setDelegationModal(null);
    } catch (e) {
      alert('خطأ أثناء تحديث المستخدم');
    }
  };

  const handleRemoveDelegation = async (permId: string) => {
    if (!selectedUser) return;
    const newCustom = [...userCustomPerms].filter(p => p !== permId);
    const newTemp = [...userTempPerms].filter(p => p.id !== permId);
    
    const updatedUser = { 
      ...selectedUser, 
      customPermissions: newCustom,
      temporaryCustomPermissions: newTemp
    };

    try {
      await updateUser(selectedUser.id, updatedUser);
      setSuccessMessage('تم إزالة التفويض بنجاح');
      setTimeout(() => setSuccessMessage(''), 2000);
      if (delegationModal?.permId === permId) setDelegationModal(null);
    } catch (e) {
      alert('خطأ أثناء تحديث المستخدم');
    }
  };

  const filteredUserPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter(p => {
      if (selectedUserCategory !== 'all' && p.category !== selectedUserCategory) return false;
      if (userPermSearchQuery) {
        const q = userPermSearchQuery.toLowerCase();
        return p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedUserCategory, userPermSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">الصلاحيات والتفويض</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  تحكم كامل وشامل في جميع صفحات الموقع (36 صفحة) والقائمة الجانبية ومستويات الرؤية والتعديل.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('role_config')}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'role_config' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ضبط حسب الدور
              </button>
              <button
                onClick={() => setActiveTab('user_delegation')}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'user_delegation' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تفويض حسب المستخدم
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: ROLE CONFIG */}
        {activeTab === 'role_config' && (
          <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
            {/* Top Roles Navigation Bar */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    اختر الدور الوظيفي لضبط صلاحياته:
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  أي تعديل هنا يُطبق فوراً على جميع المعلمين والمشرفين التابعين لهذا الدور
                </span>
              </div>

              {/* Roles Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {configurableRoles.map(role => {
                  const rolePerms = getRolePermissions(role.key);
                  const activePagesCount = PERMISSION_PAGE_ITEMS.filter(item => {
                    const hasView = item.view && rolePerms.includes(item.view);
                    const hasEdit = item.edit && rolePerms.includes(item.edit);
                    return hasView || hasEdit;
                  }).length;
                  const isSelected = selectedRoleKey === role.key;

                  return (
                    <button
                      key={role.key}
                      onClick={() => setSelectedRoleKey(role.key)}
                      className={`p-3 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 border ${
                        isSelected 
                          ? 'bg-indigo-600 text-white font-extrabold border-indigo-600 shadow-md ring-2 ring-indigo-300' 
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/90 font-bold hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs truncate w-full">{role.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-indigo-500 text-indigo-50' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {activePagesCount} من 36 صفحة
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Global Quick Action Bar for the Selected Role */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-700/60">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base sm:text-lg font-black text-white">
                      إجراءات سريعة عامة لدور: «{configurableRoles.find(r => r.key === selectedRoleKey)?.label}»
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-200">
                    تحكم فوري بضغطة واحدة في كافة صفحات وميزات الموقع (36 صفحة) لهذا الدور.
                  </p>
                </div>

                {/* 1-Click Role-wide Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBulkAllPages('edit')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-sm active:scale-95"
                    title="منح كامل صلاحيات الرؤية والتعديل لكافة صفحات الموقع"
                  >
                    <CheckCheck className="w-4 h-4 text-slate-950" />
                    <span>إتاحة الكل (تعديل كامل - 36 صفحة)</span>
                  </button>

                  <button
                    onClick={() => handleBulkAllPages('view')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all shadow-sm active:scale-95"
                    title="إتاحة الرؤية والاطلاع فقط لجميع صفحات الموقع"
                  >
                    <Eye className="w-4 h-4 text-white" />
                    <span>رؤية فقط للكل (36 صفحة)</span>
                  </button>

                  <button
                    onClick={() => handleBulkAllPages('hide')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600/90 hover:bg-rose-500 text-white transition-all shadow-sm active:scale-95"
                    title="إخفاء جميع صفحات الموقع عن هذا الدور"
                  >
                    <EyeOff className="w-4 h-4 text-white" />
                    <span>إخفاء الكل</span>
                  </button>

                  <button
                    onClick={handleResetRoleToDefault}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm active:scale-95"
                    title="إعادة الصلاحيات إلى التعيين الافتراضي للنظام"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                    <span>استعادة الافتراضي</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Color Legend & Explanation Guide */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>دليل مستويات الصلاحية لكل صفحة:</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <span className="font-bold text-slate-800">رؤية + تعديل (كامل):</span>
                  <span>إمكانية الاطلاع والإضافة والتعديل والحذف.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-indigo-200" />
                  <span className="font-bold text-slate-800">رؤية فقط:</span>
                  <span>للاطلاع ومتابعة البيانات فقط بدون أزرار تعديل.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                  <span className="font-bold text-slate-800">إخفاء:</span>
                  <span>تختفي الصفحة تماماً من القائمة الجانبية ويُمنع دخولها.</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                {CATEGORIES_ORDER.map(cat => {
                  const count = cat.key === 'all' 
                    ? PERMISSION_PAGE_ITEMS.length 
                    : PERMISSION_PAGE_ITEMS.filter(i => i.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedRoleCategory(cat.key as any)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedRoleCategory === cat.key
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedRoleCategory === cat.key ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث في صفحات وميزات الموقع..."
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white"
                />
                {roleSearchQuery && (
                  <button onClick={() => setRoleSearchQuery('')} className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Grouped Pages List */}
            <div className="space-y-6">
              {groupedPageItems.map(group => {
                const activeCount = group.items.filter(i => getGroupStateForRole(i) !== 'hide').length;
                return (
                  <div key={group.category} className="border-2 border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
                    {/* Category Header with Prominent Bulk Controls */}
                    <div className="bg-slate-100/90 px-5 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-black text-slate-900 text-base">{group.categoryTitle}</h4>
                        <span className="text-xs font-extrabold bg-indigo-100 text-indigo-800 px-3 py-0.5 rounded-full border border-indigo-200">
                          {activeCount} من {group.items.length} مفعل
                        </span>
                      </div>

                      {/* Prominent Category Bulk Controls */}
                      <div className="flex flex-wrap items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-extrabold text-slate-600 ml-1">إجراء سريع للقسم:</span>
                        <button
                          onClick={() => handleBulkCategoryAction(group.category, 'edit')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
                          title="منح صلاحية الرؤية والتعديل لجميع صفحات هذا القسم"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>إتاحة الكل (تعديل)</span>
                        </button>
                        <button
                          onClick={() => handleBulkCategoryAction(group.category, 'view')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 rounded-lg transition-colors shadow-2xs"
                          title="إتاحة الرؤية فقط لجميع صفحات هذا القسم"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-700" />
                          <span>رؤية فقط للكل</span>
                        </button>
                        <button
                          onClick={() => handleBulkCategoryAction(group.category, 'hide')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition-colors shadow-2xs"
                          title="إخفاء جميع صفحات هذا القسم"
                        >
                          <EyeOff className="w-3.5 h-3.5 text-rose-700" />
                          <span>إخفاء الكل</span>
                        </button>
                      </div>
                    </div>

                    {/* Page Items */}
                    <div className="divide-y divide-slate-100">
                      {group.items.map(item => {
                        const state = getGroupStateForRole(item);
                        const hasBoth = !!(item.view && item.edit);
                        const IconComponent = item.icon || Shield;

                        return (
                          <div 
                            key={item.id} 
                            className={`p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors ${
                              state === 'edit' 
                                ? 'bg-emerald-50/25 hover:bg-emerald-50/40' 
                                : state === 'view' 
                                ? 'bg-indigo-50/20 hover:bg-indigo-50/35' 
                                : 'bg-white hover:bg-slate-50/60'
                            }`}
                          >
                            {/* Page Info */}
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                                state === 'edit' 
                                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300/60' 
                                  : state === 'view'
                                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300/60'
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                                <IconComponent className="w-5 h-5" />
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-slate-900 text-sm sm:text-base">
                                    {item.label}
                                  </span>

                                  {item.isSensitive && (
                                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                                      إداري حساس
                                    </span>
                                  )}

                                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                                    state === 'edit' 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                      : state === 'view'
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${
                                      state === 'edit' ? 'bg-emerald-600' : state === 'view' ? 'bg-indigo-600' : 'bg-slate-400'
                                    }`} />
                                    {state === 'edit' 
                                      ? (hasBoth ? 'رؤية + تعديل كامل' : 'صلاحية كاملة') 
                                      : state === 'view' 
                                      ? 'رؤية فقط (اطلاع)' 
                                      : 'مخفية عن القائمة'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* Prominent Action Buttons (أزرار الإتاحة والتحكم) */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                              <span className="text-[11px] font-extrabold text-slate-500 px-2">مستوى الصلاحية:</span>
                              <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
                                {/* Hide Button */}
                                <button
                                  type="button"
                                  onClick={() => handleLevelSelect(item, 'hide')}
                                  className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                    state === 'hide' 
                                      ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300 scale-105' 
                                      : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200'
                                  }`}
                                  title="إخفاء هذه الصفحة ومنع الوصول إليها"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>إخفاء</span>
                                </button>
                                
                                {/* View Button */}
                                {item.view && (
                                  <button
                                    type="button"
                                    onClick={() => handleLevelSelect(item, 'view')}
                                    className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                      state === 'view' 
                                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 scale-105' 
                                        : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200'
                                    }`}
                                    title="إتاحة رؤية الصفحة واطلاع فقط بدون تعديل"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>رؤية فقط</span>
                                  </button>
                                )}
                                
                                {/* Edit / Full Access Button */}
                                {item.edit && (
                                  <button
                                    type="button"
                                    onClick={() => handleLevelSelect(item, 'edit')}
                                    className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                      state === 'edit' 
                                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 scale-105' 
                                        : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                                    }`}
                                    title="منح كامل صلاحيات الرؤية والتعديل"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>{hasBoth ? 'رؤية + تعديل' : 'صلاحية كاملة'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {groupedPageItems.length === 0 && (
                <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-500 space-y-2">
                  <Search className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-sm">لم يتم العثور على صفحات مطابقة للبحث</p>
                  <button
                    onClick={() => { setRoleSearchQuery(''); setSelectedRoleCategory('all'); }}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USER DELEGATION */}
        {activeTab === 'user_delegation' && (
          <div className="flex flex-col md:flex-row min-h-[600px]">
            {/* Users Sidebar */}
            <div className="w-full md:w-80 border-l border-slate-100 bg-slate-50/70 p-4 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث عن مستخدم بالاسم أو الجوال..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[500px]">
                {filteredUsers.map(u => {
                  const customCount = (u.customPermissions?.length || 0) + (u.temporaryCustomPermissions?.length || 0);
                  const isSelected = selectedUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-right p-3 rounded-xl transition-all flex flex-col gap-1 border ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-white hover:bg-slate-100/70 text-slate-800 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {u.name}
                        </span>
                        {customCount > 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {customCount} تفويض
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={isSelected ? 'text-indigo-100' : 'text-slate-500'}>
                          {u.role === 'teacher' ? 'معلم حلقة' : u.supervisorScope?.type ? u.supervisorScope.type : 'مشرف'}
                        </span>
                        {u.phone && (
                          <span className={`font-mono text-[11px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {u.phone}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    لا يوجد مستخدمين مطابقين
                  </div>
                )}
              </div>
            </div>

            {/* Delegation Content */}
            <div className="flex-1 p-6 space-y-6">
              {!selectedUser ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 space-y-3">
                  <UserCheck className="w-14 h-14 text-slate-300 stroke-1" />
                  <div className="text-center">
                    <p className="font-bold text-slate-700">اختر مستخدماً من القائمة الجانبية</p>
                    <p className="text-xs text-slate-400 mt-1">
                      يمكنك منح استثناءات وتفويضات دائمة أو مؤقتة لأي معلم أو مشرف بالاسم.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">{selectedUser.name}</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                          {selectedUser.role === 'teacher' ? 'معلم حلقة' : selectedUser.supervisorScope?.type || 'مشرف'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        هنا تمنح تفويضات خاصة (دائمة أو مؤقتة) تتجاوز الصلاحيات الأساسية للدور.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ابحث في الصلاحيات..."
                          value={userPermSearchQuery}
                          onChange={(e) => setUserPermSearchQuery(e.target.value)}
                          className="w-full pl-3 pr-9 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-indigo-900 bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <p className="leading-relaxed">
                      الصلاحيات الموروثة من الدور تظهر بعلامة <strong>خضراء</strong>. لإضافة تفويض خاص أو مؤقت، انقر على المربع لتحديد مدة التفويض. لتحديد نطاق المعلم/المشرف (حلقات محددة)، يرجى الذهاب لصفحة تعديل الحساب.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredUserPermissions.map(perm => {
                      const tempPerm = userTempPerms.find(t => t.id === perm.id);
                      const isInherited = baseInheritedPerms.includes(perm.id) && !userCustomPerms.includes(perm.id) && !tempPerm;
                      const isCustomGranted = userCustomPerms.includes(perm.id) || !!tempPerm;
                      const isGranted = isInherited || isCustomGranted;
                      const isExpired = tempPerm && new Date(tempPerm.expiresAt) < new Date();

                      return (
                        <div 
                          key={perm.id} 
                          className={`p-3.5 border rounded-xl flex items-start gap-3 transition-all ${
                            isInherited 
                              ? 'border-emerald-200/80 bg-emerald-50/30'
                              : isCustomGranted
                                ? isExpired 
                                  ? 'border-amber-200 bg-amber-50/30' 
                                  : 'border-indigo-200 bg-indigo-50/40'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenDelegationModal(perm.id)}
                            disabled={isInherited || perm.isSensitive}
                            className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                              isInherited 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-600 cursor-not-allowed'
                                : isCustomGranted 
                                  ? (isExpired ? 'bg-amber-500 border-amber-500 text-white' : 'bg-indigo-600 border-indigo-600 text-white')
                                  : 'border-slate-300 bg-white hover:border-indigo-400'
                            }`}
                            title={isInherited ? 'موروث من الدور الأساسي' : 'انقر لتعديل التفويض'}
                          >
                            {isGranted && <Check className="w-4 h-4" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-xs flex items-center flex-wrap gap-1.5">
                              <span>{perm.label}</span>
                              {isInherited && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.2 rounded-full font-bold">موروث</span>
                              )}
                              {isCustomGranted && !tempPerm && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.2 rounded-full font-bold">تفويض دائم</span>
                              )}
                              {tempPerm && !isExpired && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.2 rounded-full font-bold">
                                  مؤقت (حتى: {tempPerm.expiresAt.split('T')[0]})
                                </span>
                              )}
                              {isExpired && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.2 rounded-full font-bold">منتهي</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{perm.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Delegation Modal */}
      {delegationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                {delegationModal.type === 'grant' ? 'منح تفويض خاص للمستخدم' : 'تعديل التفويض الخاص'}
              </h3>
              <button
                onClick={() => setDelegationModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">نوع التفويض</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delegationType"
                      checked={!delegationExpiryDate}
                      onChange={() => setDelegationExpiryDate('')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-800">تفويض دائم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delegationType"
                      checked={!!delegationExpiryDate}
                      onChange={() => setDelegationExpiryDate(new Date(Date.now() + 86400000).toISOString().split('T')[0])}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-800">تفويض مؤقت</span>
                  </label>
                </div>
              </div>
              
              {!!delegationExpiryDate && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-slate-700">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={delegationExpiryDate}
                    onChange={(e) => setDelegationExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                  <p className="text-xs text-slate-500">ينتهي التفويض تلقائياً بنهاية اليوم المحدد</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              {delegationModal.type === 'edit' && (
                <button
                  type="button"
                  onClick={() => handleRemoveDelegation(delegationModal.permId)}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors ml-auto"
                >
                  إلغاء التفويض
                </button>
              )}
              <button
                type="button"
                onClick={() => setDelegationModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleSaveDelegation}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                حفظ التفويض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 z-50">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}
    </div>
  );
};

