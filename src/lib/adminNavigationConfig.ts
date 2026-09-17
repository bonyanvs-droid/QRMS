import { LucideIcon } from 'lucide-react';
import {
  Users,
  Building2,
  BookOpen,
  Calendar,
  UserPlus,
  DollarSign,
  Award,
  ShieldAlert,
  Layers,
  Archive,
  Server,
  History,
  Image as ImageIcon,
  Database,
  LayoutDashboard,
  Compass,
  Sliders,
  Navigation,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { MosqueComplexTenant } from '../types';
import { isModuleEnabled } from './moduleChecker';

export type AdminSectionId =
  | 'overview'
  | 'academic'
  | 'curriculum'
  | 'students'
  | 'teachers'
  | 'supervisors'
  | 'halaqahs'
  | 'admissions'
  | 'finances'
  | 'points'
  | 'nominations'
  | 'attendance'
  | 'support'
  | 'tracks'
  | 'stages'
  | 'archives'
  | 'quranIntegration'
  | 'audit'
  | 'logos'
  | 'bulk_import'
  | 'backup'
  | 'permissions'
  | 'frontend';

export interface AdminNavItem {
  id: AdminSectionId;
  label: string;
  shortLabel: string;
  path: string;
  icon: LucideIcon;
  category: 'overview' | 'education' | 'services' | 'finance' | 'structure' | 'system';
  badgeKey?: string;
  condition?: (tenant: MosqueComplexTenant | null, isSysAdmin: boolean) => boolean;
}

export interface AdminNavCategory {
  id: 'overview' | 'education' | 'services' | 'finance' | 'structure' | 'system';
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // 0. النظرة العامة والمؤشرات
  {
    id: 'overview',
    label: 'الرئيسية / النظرة العامة',
    shortLabel: 'الرئيسية',
    path: '/admin',
    icon: LayoutDashboard,
    category: 'overview',
  },

  // 1. الطلاب والحلقات
  {
    id: 'students',
    label: 'سجل الطلاب والملفات',
    shortLabel: 'الطلاب',
    path: '/admin/students',
    icon: Users,
    category: 'education',
    badgeKey: 'students',
  },
  {
    id: 'teachers',
    label: 'إدارة المعلمين',
    shortLabel: 'المعلمون',
    path: '/admin/teachers',
    icon: Building2,
    category: 'education',
    badgeKey: 'teachers',
  },
  {
    id: 'supervisors',
    label: 'إدارة المشرفين',
    shortLabel: 'المشرفون',
    path: '/admin/supervisors',
    icon: ShieldCheck,
    category: 'education',
    badgeKey: 'supervisors',
  },
  {
    id: 'halaqahs',
    label: 'الحلقات القرآنية',
    shortLabel: 'الحلقات',
    path: '/admin/halaqahs',
    icon: BookOpen,
    category: 'education',
    badgeKey: 'halaqahs',
  },
  {
    id: 'academic',
    label: 'ضبط العام الدراسي والأسبوع',
    shortLabel: 'التقويم',
    path: '/admin/academic',
    icon: Calendar,
    category: 'education',
  },
  {
    id: 'curriculum',
    label: 'قوالب الخطط القرآنية المعتمدة',
    shortLabel: 'قوالب الخطط القرآنية',
    path: '/admin/curriculum',
    icon: Compass,
    category: 'education',
  },
  {
    id: 'points',
    label: 'برنامج نقاط وتحفيز الطلاب',
    shortLabel: 'النقاط',
    path: '/admin/points',
    icon: Award,
    category: 'education',
  },

  // 2. الخدمات والمالية
  {
    id: 'admissions',
    label: 'القبول والتسجيل',
    shortLabel: 'القبول',
    path: '/admissions',
    icon: UserPlus,
    category: 'services',
    badgeKey: 'admissions',
    condition: (tenant) => isModuleEnabled(tenant, 'admissions'),
  },
  {
    id: 'finances',
    label: 'إدارة السجلات المالية',
    shortLabel: 'السجلات المالية',
    path: '/finances',
    icon: DollarSign,
    category: 'finance',
    condition: (tenant) => isModuleEnabled(tenant, 'finances'),
  },
  {
    id: 'nominations',
    label: 'اختبارات وترشيحات الجمعية',
    shortLabel: 'الترشيحات',
    path: '/nominations',
    icon: Award,
    category: 'services',
    badgeKey: 'nominations',
    condition: (tenant) => isModuleEnabled(tenant, 'association'),
  },
  {
    id: 'support',
    label: 'الدعم والمراقبة الطارئة',
    shortLabel: 'الدعم',
    path: '/support',
    icon: ShieldAlert,
    category: 'services',
  },
  {
    id: 'attendance',
    label: 'الحضور الذكي بالموقع',
    shortLabel: 'الحضور الذكي',
    path: '/admin/attendance',
    icon: Navigation,
    category: 'services',
  },

  // 3. المراحل والمصاحف
  {
    id: 'tracks',
    label: 'المسارات التعليمية',
    shortLabel: 'المسارات',
    path: '/admin/tracks',
    icon: Layers,
    category: 'structure',
    badgeKey: 'tracks',
  },
  {
    id: 'stages',
    label: 'المراحل الدراسية',
    shortLabel: 'المراحل',
    path: '/admin/stages',
    icon: Layers,
    category: 'structure',
    badgeKey: 'stages',
  },

  // 4. النظام والرقابة
  {
    id: 'archives',
    label: 'الأرشيف السنوي وإغلاق الفصول',
    shortLabel: 'الأرشيف',
    path: '/admin/archives',
    icon: Archive,
    category: 'system',
    badgeKey: 'archives',
  },
  {
    id: 'quranIntegration',
    label: 'تكاملات ومصاحف القرآن',
    shortLabel: 'المصاحف',
    path: '/admin/quranIntegration',
    icon: Server,
    category: 'system',
  },
  {
    id: 'audit',
    label: 'سجل العمليات والرقابة',
    shortLabel: 'الرقابة',
    path: '/admin/audit',
    icon: History,
    category: 'system',
    badgeKey: 'audit',
  },
  {
    id: 'logos',
    label: 'الشعارات والهوية البصرية',
    shortLabel: 'الهوية',
    path: '/admin/logos',
    icon: ImageIcon,
    category: 'system',
  },
  {
    id: 'bulk_import',
    label: 'الاستيراد الشامل لبيانات المجمع',
    shortLabel: 'الاستيراد الشامل',
    path: '/admin/bulk_import',
    icon: FileSpreadsheet,
    category: 'system',
  },
  {
    id: 'backup',
    label: 'النسخ الاحتياطي والبيانات',
    shortLabel: 'البيانات',
    path: '/admin/backup',
    icon: Database,
    category: 'system',
  },
  {
    id: 'permissions',
    label: 'إدارة الصلاحيات والتفويض',
    shortLabel: 'الصلاحيات',
    path: '/admin/permissions',
    icon: ShieldCheck,
    category: 'system',
  },
  {
    id: 'frontend',
    label: 'إدارة الواجهة العامة',
    shortLabel: 'الواجهة العامة',
    path: '/admin/frontend',
    icon: Sliders,
    category: 'system',
  },
];

export function getVisibleAdminNavItems(
  tenant: MosqueComplexTenant | null,
  isSysAdmin: boolean
): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.condition) {
      return item.condition(tenant, isSysAdmin);
    }
    return true;
  });
}

export function getGroupedAdminNav(
  tenant: MosqueComplexTenant | null,
  isSysAdmin: boolean
): AdminNavCategory[] {
  const visible = getVisibleAdminNavItems(tenant, isSysAdmin);

  const categories: { id: AdminNavCategory['id']; title: string }[] = [
    { id: 'overview', title: 'الرئيسية والتشغيل' },
    { id: 'education', title: 'الطلاب والحلقات' },
    { id: 'services', title: 'شؤون الطلاب والخدمات' },
    { id: 'finance', title: 'القسم المالي والتحصيل' },
    { id: 'structure', title: 'المراحل والمصاحف' },
    { id: 'system', title: 'النظام والرقابة' },
  ];

  return categories
    .map((cat) => ({
      id: cat.id,
      title: cat.title,
      items: visible.filter((item) => item.category === cat.id),
    }))
    .filter((cat) => cat.items.length > 0);
}
