import { 
  LayoutDashboard, BookOpen, Users, FileText, Calendar, 
  ShieldCheck, Server, Database, Activity, Sliders, 
  Image as ImageIcon, History, Award, UserPlus, 
  DollarSign, ShieldAlert, Sparkles, Compass, 
  Layers, Archive, Send, Building2, GraduationCap, Settings,
  Video, CreditCard, FileSpreadsheet, Sun
} from 'lucide-react';
import { User, MosqueComplexTenant } from '../types';
import { isModuleEnabled } from './moduleChecker';
import { hasPermission } from './permissions';
import { getRolePortalRoute } from './roleRoutes';

export type NavCategory = 
  | 'overview'             // الرئيسية / النظرة العامة
  | 'teachers_halaqahs'    // قسم الشؤون الإدارية
  | 'quran_curriculum'     // قسم الشؤون التعليمية (الأكاديمية)
  | 'educational_programs' // قسم الشؤون التربوية
  | 'students_services'    // قسم شؤون الطلاب
  | 'finance_collection'   // القسم المالي والتحصيل
  | 'reports'              // قسم التقارير والمتابعة
  | 'public_interface'     // إعدادات الواجهة الأمامية
  | 'global_settings'      // الإعدادات العامة
  | 'system_admin';        // إدارة النظام

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  path?: string;
  icon: React.ElementType;
  category: NavCategory;
  isAction?: boolean;
  requiredModule?: string;
  requiredPermission?: string | string[];
  requiredRoles?: string[];
  customCheck?: (user: User | null, tenant: MosqueComplexTenant | null) => boolean;
  badgeKey?: string;
}

/**
 * التحقق من صلاحية الوصول للقسم المالي والتحصيل:
 * مخصص فقط لـ:
 * 1. مدير المجمع (admin, campus_admin, system_admin)
 * 2. المشرف العام (general_supervisor)
 * 3. مشرف المالية (finance_supervisor)
 */
export function isAuthorizedForFinance(user: User | null): boolean {
  if (!user) return false;
  // مدير المجمع
  if (user.role === 'admin' || user.role === 'campus_admin' || user.role === 'system_admin') {
    return true;
  }
  // المشرف العام أو مشرف المالية
  if (user.role === 'supervisor') {
    const supType = user.supervisorScope?.type;
    if (
      supType === 'general_supervisor' ||
      supType === 'finance_supervisor' ||
      !supType // المشرف العام الافتراضي
    ) {
      return true;
    }
  }
  return false;
}

// Global Config: SINGLE source of truth
export const UNIFIED_NAV_ITEMS: NavigationItem[] = [
  // 1. Overview (الرئيسية / النظرة العامة)
  { id: 'dashboard', label: 'الرئيسية والمؤشرات', shortLabel: 'الرئيسية', path: '/', icon: LayoutDashboard, category: 'overview' },

  // 2. Teachers & Halaqahs (قسم الشؤون الإدارية)
  { id: 'stages', label: 'المراحل الدراسية', shortLabel: 'المراحل', path: '/admin/stages', icon: Layers, category: 'teachers_halaqahs', requiredPermission: ['view_stages', 'manage_stages', 'manage_programs', 'manage_halaqahs'], badgeKey: 'stages' },
  { id: 'halaqahs', label: 'الحلقات القرآنية', shortLabel: 'الحلقات', path: '/admin/halaqahs', icon: BookOpen, category: 'teachers_halaqahs', requiredPermission: ['view_halaqahs', 'manage_halaqahs'], badgeKey: 'halaqahs' },
  { id: 'teachers', label: 'إدارة المعلمين', shortLabel: 'المعلمون', path: '/admin/teachers', icon: Users, category: 'teachers_halaqahs', requiredPermission: ['view_teachers', 'manage_teachers'], badgeKey: 'teachers' },
  { id: 'students', label: 'إدارة الطلاب', shortLabel: 'الطلاب', path: '/admin/students', icon: Users, category: 'teachers_halaqahs', requiredPermission: ['view_students', 'manage_students'], badgeKey: 'students' },
  { id: 'supervisors', label: 'إدارة المشرفين', shortLabel: 'المشرفون', path: '/admin/supervisors', icon: ShieldCheck, category: 'teachers_halaqahs', requiredPermission: ['view_supervisors', 'manage_supervisors', 'manage_staff'], badgeKey: 'supervisors' },
  { id: 'attendance', label: 'الحضور والانصراف', shortLabel: 'الحضور', path: '/admin/attendance', icon: Calendar, category: 'teachers_halaqahs', requiredPermission: ['view_attendance', 'manage_attendance'] },

  // 3. Quran & Curriculum (قسم الشؤون التعليمية (الأكاديمية))
  { id: 'quran', label: 'المخرج القرآني', shortLabel: 'المخرج', path: '/quran', icon: FileText, category: 'quran_curriculum', requiredModule: 'quran', requiredPermission: ['view_quran', 'manage_quran'] },
  { id: 'spelling', label: 'الهجاء القرآني', shortLabel: 'الهجاء', path: '/spelling', icon: Sparkles, category: 'quran_curriculum', requiredModule: 'spelling', requiredPermission: ['view_spelling', 'manage_spelling', 'view_quran'] },
  { id: 'curriculum_templates', label: 'قوالب الخطط القرآنية', shortLabel: 'قوالب الخطط', path: '/admin/curriculum', icon: Compass, category: 'quran_curriculum', requiredPermission: ['view_curriculum', 'manage_curriculum', 'manage_programs'] },
  { id: 'tracks', label: 'المسارات التعليمية', shortLabel: 'المسارات', path: '/admin/tracks', icon: Layers, category: 'quran_curriculum', requiredPermission: ['view_tracks', 'manage_tracks', 'manage_programs'], badgeKey: 'tracks' },
  { id: 'nominations', label: 'ترشيحات الجمعية', shortLabel: 'الترشيحات', path: '/nominations', icon: Award, category: 'quran_curriculum', requiredModule: 'association', requiredPermission: ['view_nominations', 'manage_nominations', 'manage_quran'], badgeKey: 'nominations' },

  // 4. Educational Programs (قسم الشؤون التربوية)
  { id: 'educational', label: '📘 البرنامج التربوي العام', shortLabel: 'التربوي العام', path: '/educational', icon: BookOpen, category: 'educational_programs', requiredModule: 'educational', requiredPermission: ['view_educational', 'manage_educational', 'manage_programs'] },
  { id: 'seasonal_programs', label: '☀️ البرامج الموسمية', shortLabel: 'البرامج الموسمية', path: '/seasonal-programs', icon: Sun, category: 'educational_programs', requiredPermission: ['view_seasonal', 'manage_seasonal', 'view_educational', 'manage_educational', 'manage_programs'] },
  { id: 'intervention_radar', label: '📡 رادار التدخل المبكر', shortLabel: 'رادار التدخل', path: '/educational?view=radar', icon: Activity, category: 'educational_programs', requiredModule: 'educational', requiredPermission: 'view_intervention_radar' },

  // 5. Students & Services (قسم شؤون الطلاب)
  { id: 'admissions', label: 'القبول والتسجيل', shortLabel: 'القبول', path: '/admissions', icon: UserPlus, category: 'students_services', requiredModule: 'admissions', requiredPermission: ['view_admissions', 'manage_admissions', 'manage_students'], badgeKey: 'admissions' },
  { id: 'admissions_settings', label: 'إعدادات القبول', shortLabel: 'إعدادات القبول', path: '/admin/admissions_settings', icon: Settings, category: 'students_services', requiredModule: 'admissions', requiredPermission: 'manage_admissions_settings' },
  { id: 'points', label: 'تحفيز الطلاب والنقاط', shortLabel: 'النقاط', path: '/admin/points', icon: Award, category: 'students_services', requiredModule: 'badges', requiredPermission: ['view_points', 'manage_points'] },
  { id: 'points_rules', label: 'قواعد ومعايير النقاط', shortLabel: 'قواعد النقاط', path: '/admin/points?subtab=rules', icon: Sliders, category: 'students_services', requiredModule: 'badges', requiredPermission: ['manage_points_rules', 'manage_points'] },
  { id: 'support', label: 'الدعم والمراقبة الطارئة', shortLabel: 'الدعم', path: '/support', icon: ShieldAlert, category: 'students_services', requiredPermission: ['view_support', 'manage_support'] },

  // 6. Finance & Collection (القسم المالي والتحصيل) - خاص فقط بمدير المجمع والمشرف العام ومشرف المالية
  { id: 'finances', label: 'إدارة السجلات المالية', shortLabel: 'السجلات المالية', path: '/finances', icon: DollarSign, category: 'finance_collection', requiredModule: 'finances', requiredPermission: ['view_finance', 'manage_finance'], customCheck: (u) => isAuthorizedForFinance(u) },
  { id: 'financial_settings', label: 'الإعدادات المالية', shortLabel: 'الإعدادات المالية', path: '/admin/financial_settings', icon: CreditCard, category: 'finance_collection', requiredModule: 'finances', requiredPermission: ['manage_finance_settings', 'manage_finance'], customCheck: (u) => isAuthorizedForFinance(u) },

  // 7. Reports (قسم التقارير والمتابعة)
  { id: 'reports_center', label: 'مركز التقارير 📲', shortLabel: 'التقارير', path: '/reports', icon: Send, category: 'reports', requiredModule: 'reports', requiredPermission: ['view_reports', 'manage_reports'] },
  { id: 'meetings', label: 'الاجتماعات والمحاضر 📝', shortLabel: 'الاجتماعات', path: '/meetings', icon: Calendar, category: 'reports', requiredPermission: ['view_meetings', 'manage_meetings'], badgeKey: 'meetings' },
  { id: 'group-report', label: 'تقرير الجروب 📲', shortLabel: 'تقرير الجروب', icon: Send, category: 'reports', isAction: true, requiredModule: 'reports', requiredPermission: 'send_group_report' },
  { id: 'reports_settings', label: 'إعدادات التقارير', shortLabel: 'إعدادات التقارير', path: '/admin/reports_settings', icon: Settings, category: 'reports', requiredModule: 'reports', requiredPermission: 'manage_reports_settings' },

  // 7. Public Interface (إعدادات الواجهة الأمامية)
  { id: 'frontend', label: 'إعدادات الواجهة الأمامية', shortLabel: 'الواجهة الأمامية', path: '/admin/frontend', icon: Sliders, category: 'public_interface', requiredPermission: 'manage_frontend' },
  { id: 'frontend_banners', label: 'البانرات الترويجية', shortLabel: 'البانرات', path: '/admin/frontend?subtab=banners', icon: ImageIcon, category: 'public_interface', requiredPermission: 'manage_frontend_banners' },
  { id: 'frontend_ads', label: 'الإعلانات والأنشطة', shortLabel: 'الإعلانات', path: '/admin/frontend?subtab=ads', icon: Sliders, category: 'public_interface', requiredPermission: 'manage_frontend_ads' },
  { id: 'frontend_videos', label: 'الفيديوهات والمحتوى المرئي', shortLabel: 'الفيديوهات', path: '/admin/frontend?subtab=videos', icon: Video, category: 'public_interface', requiredPermission: 'manage_frontend_videos' },

  // 8. Global Settings (الإعدادات العامة)
  { id: 'academic', label: 'التقويم الأكاديمي', shortLabel: 'التقويم', path: '/admin/academic', icon: Calendar, category: 'global_settings', requiredPermission: 'manage_academic' },
  { id: 'archives', label: 'الأرشيف الأكاديمي', shortLabel: 'الأرشيف', path: '/admin/archives', icon: Archive, category: 'global_settings', requiredPermission: ['view_archives', 'manage_archives', 'manage_programs'], badgeKey: 'archives' },
  { id: 'quranIntegration', label: 'إعدادات المصاحف والتكامل', shortLabel: 'المصاحف', path: '/admin/quranIntegration', icon: Server, category: 'global_settings', requiredPermission: 'manage_quran_integration' },
  { id: 'attendance_settings', label: 'إعدادات الحضور والانصراف', shortLabel: 'إعدادات الحضور', path: '/admin/attendance_settings', icon: Settings, category: 'global_settings', requiredPermission: 'manage_attendance_settings' },
  { id: 'logos', label: 'الهوية والشعارات', shortLabel: 'الهوية', path: '/admin/logos', icon: ImageIcon, category: 'global_settings', requiredPermission: 'manage_logos' },
  { id: 'permissions', label: 'الصلاحيات والتفويض', shortLabel: 'الصلاحيات', path: '/admin/permissions', icon: ShieldCheck, category: 'global_settings', requiredPermission: 'manage_staff' },
  { id: 'whatsapp_settings', label: 'الربط والإشعارات (WhatsApp)', shortLabel: 'الربط والإشعارات', path: '/admin/whatsapp_settings', icon: Send, category: 'global_settings', requiredPermission: 'manage_whatsapp' },
  { id: 'bulk_import', label: 'الاستيراد الشامل للمجمع', shortLabel: 'الاستيراد الشامل', path: '/admin/bulk_import', icon: FileSpreadsheet, category: 'global_settings', requiredPermission: 'manage_bulk_import' },
  { id: 'backup', label: 'النسخ الاحتياطي', shortLabel: 'النسخ', path: '/admin/backup', icon: Database, category: 'global_settings', requiredPermission: 'manage_backup' },
  { id: 'audit', label: 'سجل العمليات والرقابة', shortLabel: 'الرقابة', path: '/admin/audit', icon: History, category: 'global_settings', requiredPermission: 'view_audit', badgeKey: 'audit' },

  // 9. System Admin (إدارة النظام)
  { id: 'tenants', label: 'المجمعات والوحدات', shortLabel: 'المجمعات', path: '/tenants', icon: Building2, category: 'system_admin', requiredRoles: ['system_admin'] },
  { id: 'quotas', label: 'السعات والاشتراكات', shortLabel: 'السعات', path: '/quotas', icon: Activity, category: 'system_admin', requiredRoles: ['system_admin'] },
  { id: 'health', label: 'صحة النظام والسحابة', shortLabel: 'صحة النظام', path: '/health', icon: Server, category: 'system_admin', requiredRoles: ['system_admin'] },
];

export const CATEGORY_TITLES: Record<NavCategory, string> = {
  overview: '🏠 الرئيسية / النظرة العامة',
  teachers_halaqahs: '🏢 قسم الشؤون الإدارية',
  quran_curriculum: '📖 قسم الشؤون التعليمية (الأكاديمية)',
  educational_programs: '🌱 قسم الشؤون التربوية',
  students_services: '👨‍🎓 قسم شؤون الطلاب',
  finance_collection: '💰 القسم المالي والتحصيل',
  reports: '📊 قسم التقارير والمتابعة',
  public_interface: '🌐 إعدادات الواجهة الأمامية',
  global_settings: '⚙️ الإعدادات العامة',
  system_admin: '🛡️ إدارة النظام'
};

export interface NavigationGroup {
  category: NavCategory;
  title: string;
  items: NavigationItem[];
}

export function getNavigationGroups(
  currentUser: User | null,
  activeTenant: MosqueComplexTenant | null
): NavigationGroup[] {
  if (!currentUser) {
    // Guest items
    return [{
      category: 'overview',
      title: 'الرئيسية',
      items: ([
        { id: 'public', label: 'الرئيسية', shortLabel: 'الرئيسية', path: '/public', icon: LayoutDashboard, category: 'overview' },
        { id: 'quran', label: 'المخرج القرآني', shortLabel: 'المخرج', path: '/quran', icon: FileText, category: 'quran_curriculum', requiredModule: 'quran' },
      ] as NavigationItem[]).filter(item => !item.requiredModule || isModuleEnabled(activeTenant, item.requiredModule as any))
    }];
  }

  const groups: Record<NavCategory, NavigationItem[]> = {
    overview: [],
    teachers_halaqahs: [],
    students_services: [],
    finance_collection: [],
    quran_curriculum: [],
    educational_programs: [],
    reports: [],
    public_interface: [],
    global_settings: [],
    system_admin: []
  };

  for (const item of UNIFIED_NAV_ITEMS) {
    // 1. Module Check
    if (item.requiredModule && item.requiredModule !== 'core') {
      if (!isModuleEnabled(activeTenant, item.requiredModule as any)) {
        continue;
      }
    }

    // 2. Role Check
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!item.requiredRoles.includes(currentUser.role)) {
        continue;
      }
    }

    // 2.5 Custom Authorization Check (e.g. for Finance & Collection)
    if (item.customCheck && !item.customCheck(currentUser, activeTenant)) {
      continue;
    }

    // 3. Permission Check
    if (item.requiredPermission) {
      const perms = Array.isArray(item.requiredPermission) ? item.requiredPermission : [item.requiredPermission];
      const hasAny = perms.some(p => hasPermission(currentUser, p as any, undefined, undefined, [], activeTenant));
      if (!hasAny) {
        continue;
      }
    }

    // Prepare item clone
    const finalItem = { ...item };
    
    // Set dynamic path for overview
    if (item.id === 'dashboard') {
      finalItem.path = getRolePortalRoute(currentUser.role, activeTenant?.id);
      if (currentUser.role === 'student') {
        finalItem.label = 'بوابة الطالب 🌟';
        finalItem.icon = BookOpen;
      } else if (currentUser.role === 'parent') {
        finalItem.label = 'بوابة ولي الأمر 🎓';
        finalItem.icon = GraduationCap;
      } else if (currentUser.role === 'teacher') {
        finalItem.label = 'لوحة المعلم';
        finalItem.icon = BookOpen;
      } else if (currentUser.role === 'supervisor') {
        finalItem.label = 'لوحة المشرف القرآني';
        finalItem.icon = ShieldCheck;
      }
    }

    groups[item.category].push(finalItem);
  }

  // Filter out empty groups and map to array
  const activeCategories: NavCategory[] = [
    'overview',
    'teachers_halaqahs',
    'quran_curriculum',
    'educational_programs',
    'students_services',
    'finance_collection',
    'reports',
    'public_interface',
    'global_settings',
    'system_admin'
  ];
  
  return activeCategories
    .filter(cat => groups[cat].length > 0)
    .map(cat => ({
      category: cat,
      title: CATEGORY_TITLES[cat],
      items: groups[cat]
    }));
}
