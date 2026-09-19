import { User, UserRole, Student, Halaqah, MosqueComplexTenant } from '../types';

export interface PermissionDefinition {
  id: string;
  label: string;
  category: 'overview' | 'students' | 'halaqahs' | 'quran' | 'attendance' | 'points' | 'finance' | 'programs' | 'system' | 'public_interface';
  description: string;
  needsScope: boolean;
  allowedScopeTypes: ('tenant' | 'stage' | 'halaqah')[];
  isSensitive?: boolean; // If true, cannot be delegated
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Overview
  {
    id: 'view_dashboard',
    label: 'الرئيسية والمؤشرات',
    category: 'overview',
    description: 'الاطلاع على لوحة المؤشرات العامة والإحصائيات والرسوم البيانية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_intervention_radar',
    label: 'رادار التدخل المبكر',
    category: 'programs',
    description: 'الوصول إلى رادار المتابعة الذكي والتدخل المبكر ضمن البرامج التربوية',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage'],
  },

  // 2. Teachers & Halaqahs
  {
    id: 'view_halaqahs',
    label: 'عرض الحلقات القرآنية',
    category: 'halaqahs',
    description: 'الاطلاع على هيكل وقوائم الحلقات القرآنية',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage'],
  },
  {
    id: 'manage_halaqahs',
    label: 'إدارة وتعديل الحلقات',
    category: 'halaqahs',
    description: 'إنشاء وتعديل وتوزيع الحلقات القرآنية',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage'],
  },
  {
    id: 'view_teachers',
    label: 'عرض قائمة المعلمين',
    category: 'halaqahs',
    description: 'الاطلاع على بيانات وكادر المعلمين',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_teachers',
    label: 'إدارة وتعيين المعلمين',
    category: 'halaqahs',
    description: 'إضافة وتعديل بيانات المعلمين وتعيينهم على الحلقات',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_supervisors',
    label: 'عرض قائمة المشرفين',
    category: 'halaqahs',
    description: 'الاطلاع على سجل وبيانات المشرفين ونطاقاتهم',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_supervisors',
    label: 'إدارة وتعيين المشرفين',
    category: 'halaqahs',
    description: 'إضافة وتعديل المشرفين وتحديد أدوارهم ونطاقاتهم',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_attendance',
    label: 'عرض سجل الحضور',
    category: 'attendance',
    description: 'الاطلاع على كشوفات حضور وغياب وتأخر الطلاب',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_attendance',
    label: 'رصد واعتماد الحضور',
    category: 'attendance',
    description: 'تسجيل الحضور والغياب والتأخير واعتماد السجلات',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },

  // 3. Students & Services
  {
    id: 'view_students',
    label: 'عرض سجل الطلاب',
    category: 'students',
    description: 'الاطلاع على قوائم وبيانات وملفات الطلاب',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage', 'halaqah'],
  },
  {
    id: 'manage_students',
    label: 'إدارة الطلاب والنقل',
    category: 'students',
    description: 'إضافة، تعديل، ونقل الطلاب بين الحلقات والمراحل',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'view_admissions',
    label: 'عرض طلبات القبول',
    category: 'students',
    description: 'الاطلاع على طلبات التسجيل والقبول الجديدة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_admissions',
    label: 'إدارة القبول والتسجيل',
    category: 'students',
    description: 'قبول ورفض وتسكين الطلاب الجدد في الحلقات',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_admissions_settings',
    label: 'إعدادات القبول والتسجيل',
    category: 'students',
    description: 'فتح وإغلاق التسجيل وتخصيص نماذج القبول وشروطه',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_finance',
    label: 'الاطلاع على الماليات والرسوم',
    category: 'finance',
    description: 'عرض الاشتراكات والرسوم المالية وسجلات السداد',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_finance',
    label: 'إدارة الرسوم والتحصيل',
    category: 'finance',
    description: 'تسجيل الدفعات، السندات، الخصومات، وإدارة الرسوم',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_finance_settings',
    label: 'الإعدادات المالية والحسابات',
    category: 'finance',
    description: 'ضبط الحسابات البنكية، خطط الرسوم، والسياسات المالية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_custodies',
    label: 'إدارة العهد والمصروفات',
    category: 'finance',
    description: 'تسجيل ومتابعة العهد والمصاريف التشغيلية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'approve_budget',
    label: 'اعتماد الميزانيات',
    category: 'finance',
    description: 'الموافقة على المصروفات والميزانيات الكبرى',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
    isSensitive: true,
  },
  {
    id: 'view_points',
    label: 'عرض نقاط الطلاب',
    category: 'points',
    description: 'الاطلاع على رصيد وسجل نقاط وأوسمة الطلاب',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage', 'halaqah'],
  },
  {
    id: 'manage_points',
    label: 'إدارة ومنح النقاط',
    category: 'points',
    description: 'منح نقاط وحسمها وإدارة مكافآت الطلاب',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_points_rules',
    label: 'قواعد ومعايير النقاط',
    category: 'points',
    description: 'تحديد معايير النقاط، الأوسمة، والجوائز التحفيزية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_support',
    label: 'عرض طلبات الدعم الطارئ',
    category: 'system',
    description: 'الاطلاع على إشعارات ومراقبة الدعم والمساعدة الطارئة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_support',
    label: 'إدارة الدعم والمراقبة الطارئة',
    category: 'system',
    description: 'معالجة واستجابة نداءات الدعم والمساعدة الطارئة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },

  // 4. Quran & Curriculum
  {
    id: 'view_quran',
    label: 'متابعة خطط القرآن',
    category: 'quran',
    description: 'عرض مستويات وسور الحفظ والمراجعة للطلاب',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage', 'halaqah'],
  },
  {
    id: 'manage_quran',
    label: 'تقييم وتعديل القرآن',
    category: 'quran',
    description: 'تسجيل التسميع اليومي وتقييم الحفظ والتلاوة',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_quran_plan',
    label: 'إدارة الخطط القرآنية للطلاب',
    category: 'quran',
    description: 'إنشاء وتعديل الخطط القرآنية الفردية للطلاب وتسجيل إنجازاتها اليومية',
    needsScope: true,
    allowedScopeTypes: ['tenant', 'stage', 'halaqah'],
  },
  {
    id: 'view_spelling',
    label: 'عرض الهجاء القرآني',
    category: 'quran',
    description: 'الاطلاع على خطط وطلاب القاعدة النورانية والهجاء',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_spelling',
    label: 'إدارة وتقييم الهجاء القرآني',
    category: 'quran',
    description: 'رصد وتقييم دروس ومستويات الهجاء القرآني',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'view_curriculum',
    label: 'عرض قوالب الخطط القرآنية',
    category: 'quran',
    description: 'الاطلاع على قوالب ونماذج الخطط القرآنية المعتمدة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_curriculum',
    label: 'إدارة قوالب الخطط القرآنية',
    category: 'quran',
    description: 'إنشاء وتعديل قوالب ونماذج الخطط القرآنية للحلقات والمراحل',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_tracks',
    label: 'عرض المسارات التعليمية',
    category: 'quran',
    description: 'الاطلاع على المسارات التعليمية للحلقات والطلاب',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_tracks',
    label: 'إدارة المسارات التعليمية',
    category: 'quran',
    description: 'إضافة وتعديل المسارات وتعيين الطلاب لها',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_stages',
    label: 'عرض المراحل الدراسية',
    category: 'halaqahs',
    description: 'الاطلاع على هيكل المراحل والصفوف الدراسية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_stages',
    label: 'إدارة المراحل الدراسية',
    category: 'halaqahs',
    description: 'إضافة وتعديل وتسكين المراحل والصفوف الدراسية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_archives',
    label: 'عرض الأرشيف الأكاديمي',
    category: 'system',
    description: 'الاطلاع على الفصول والأعوام الدراسية السابقة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_archives',
    label: 'إدارة الأرشيف وإغلاق الفصول',
    category: 'system',
    description: 'ترحيل الفصول وإغلاق الأعوام وتفريغ البيانات المؤرشفة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_quran_integration',
    label: 'إعدادات المصاحف والتكامل',
    category: 'system',
    description: 'ربط واجهات ومصاحف القرآن الإلكترونية والتكاملات',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_nominations',
    label: 'عرض ترشيحات الجمعية',
    category: 'quran',
    description: 'الاطلاع على ترشيحات الطلاب لاختبارات الجمعية',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_nominations',
    label: 'إدارة ترشيحات الجمعية',
    category: 'quran',
    description: 'ترشيح الطلاب واعتماد نتائج الاختبارات الرسمية',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },

  // 5. Educational & Seasonal Programs
  {
    id: 'view_educational',
    label: 'عرض البرنامج التربوي العام',
    category: 'programs',
    description: 'الاطلاع على الخطط والأنشطة والقيم التربوية العامة',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_educational',
    label: 'إدارة البرنامج التربوي العام',
    category: 'programs',
    description: 'إنشاء ومتابعة الأنشطة التربوية والأهداف والقيم واعتماد التنفيذ',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'view_seasonal',
    label: 'عرض البرامج الموسمية',
    category: 'programs',
    description: 'الاطلاع على البرامج والمخيمات الموسمية وجداول الأنشطة',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_seasonal',
    label: 'إدارة البرامج والأنشطة الموسمية',
    category: 'programs',
    description: 'إنشاء البرامج والمخيمات الموسمية وجداولها ورصد الحضور والإنجاز الموسمي',
    needsScope: true,
    allowedScopeTypes: ['stage', 'halaqah'],
  },
  {
    id: 'manage_programs',
    label: 'إدارة البرامج والأنشطة العامة',
    category: 'programs',
    description: 'إنشاء ومتابعة البرامج والفعاليات العامة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },

  // 6. Reports & Meetings
  {
    id: 'view_reports',
    label: 'عرض مركز التقارير',
    category: 'programs',
    description: 'الاطلاع على مؤشرات الأداء والتقارير الدورية والتحليلية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_reports',
    label: 'إدارة وتصدير التقارير',
    category: 'programs',
    description: 'توليد التقارير وتصدير ملفات PDF و Excel',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_meetings',
    label: 'عرض الاجتماعات والمحاضر',
    category: 'programs',
    description: 'الاطلاع على الاجتماعات وجداول الأعمال والمحاضر المصرح له بها',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_meetings',
    label: 'إدارة وتوثيق الاجتماعات',
    category: 'programs',
    description: 'إنشاء وجدولة الاجتماعات وتوثيق المحاضر والقرارات',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'send_group_report',
    label: 'إرسال تقرير الجروب 📲',
    category: 'programs',
    description: 'توليد وإرسال تقارير الحلقات لأولياء الأمور عبر الواتساب',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_reports_settings',
    label: 'إعدادات التقارير',
    category: 'programs',
    description: 'تخصيص قوالب وصيغ ومقدمات تقارير الواتساب والتقارير الدورية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },

  // 7. Public Interface
  {
    id: 'manage_frontend',
    label: 'إدارة الواجهة العامة',
    category: 'public_interface',
    description: 'تخصيص الصفحة الرئيسية وتصميم الواجهة العامة للمجمع',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_frontend_banners',
    label: 'إدارة البانرات الترويجية',
    category: 'public_interface',
    description: 'إضافة وتعديل البانرات والشريط المتحرك على الواجهة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_frontend_ads',
    label: 'إدارة الإعلانات والأنشطة',
    category: 'public_interface',
    description: 'نشر وتحديث الإعلانات والأنشطة العامة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_frontend_videos',
    label: 'إدارة الفيديوهات والمحتوى المرئي',
    category: 'public_interface',
    description: 'إضافة وإدارة مقاطع الفيديو على الموقع والواجهة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },

  // 8. Global Settings & System
  {
    id: 'manage_academic',
    label: 'التقويم الأكاديمي',
    category: 'system',
    description: 'ضبط العام الدراسي الحالي والأسابيع والإجازات والتقويم',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_attendance_settings',
    label: 'إعدادات الحضور والانصراف',
    category: 'attendance',
    description: 'ضبط قواعد ومواعيد الحضور والموقع الجغرافي والباركود',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_logos',
    label: 'الهوية والشعارات',
    category: 'system',
    description: 'تغيير شعارات المجمع والهوية البصرية الرسمية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_staff',
    label: 'الصلاحيات والتفويض',
    category: 'system',
    description: 'إدارة المعلمين والمشرفين ومصفوفة الصلاحيات والتفويضات',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
    isSensitive: true,
  },
  {
    id: 'manage_whatsapp',
    label: 'الربط والإشعارات (WhatsApp)',
    category: 'system',
    description: 'ضبط خادم ومفاتيح وإعدادات رسائل الواتساب التلقائية',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_bulk_import',
    label: 'الاستيراد الشامل للمجمع',
    category: 'system',
    description: 'رفع ملفات Excel لاستيراد الطلاب والمعلمين والحلقات دفعة واحدة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'manage_backup',
    label: 'النسخ الاحتياطي والبيانات',
    category: 'system',
    description: 'أخذ وتنزيل واستعادة النسخ الاحتياطية لقاعدة البيانات',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
  {
    id: 'view_audit',
    label: 'سجل العمليات والرقابة',
    category: 'system',
    description: 'الاطلاع على سجل العمليات والتدقيق الأمني والرقابة',
    needsScope: false,
    allowedScopeTypes: ['tenant'],
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  system_admin: ALL_PERMISSIONS.map(p => p.id),
  charity_supervisor: ALL_PERMISSIONS.map(p => p.id),
  campus_admin: ALL_PERMISSIONS.map(p => p.id),
  admin: ALL_PERMISSIONS.map(p => p.id),
  supervisor: [
    'view_dashboard',
    'view_students',
    'manage_students',
    'view_halaqahs',
    'view_teachers',
    'view_attendance',
    'manage_attendance',
    'view_quran',
    'manage_quran',
    'view_points',
    'manage_points',
    'view_curriculum',
    'view_tracks',
    'view_stages',
    'view_educational',
    'manage_educational',
    'view_seasonal',
    'manage_seasonal',
    'manage_programs',
    'view_reports',
    'manage_reports',
    'send_group_report',
    'view_meetings',
    'manage_meetings',
  ],
  teacher: [
    'view_dashboard',
    'view_students',
    'view_halaqahs',
    'view_attendance',
    'manage_attendance',
    'view_quran',
    'manage_quran',
    'view_points',
    'manage_points',
    'send_group_report',
    'view_meetings',
    'manage_meetings',
    'view_intervention_radar',
  ],
  parent: [
    'view_dashboard',
    'view_students',
    'view_quran',
    'view_points',
  ],
  student: [
    'view_dashboard',
    'view_quran',
    'view_points',
  ],
  public: [],
};

export const SUPERVISOR_TYPE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  general_supervisor: [
    'view_dashboard',
    'view_students',
    'manage_students',
    'view_halaqahs',
    'manage_halaqahs',
    'view_teachers',
    'manage_teachers',
    'view_supervisors',
    'view_attendance',
    'manage_attendance',
    'view_quran',
    'manage_quran',
    'manage_quran_plan',
    'view_points',
    'manage_points',
    'view_finance',
    'manage_finance',
    'manage_finance_settings',
    'view_curriculum',
    'manage_curriculum',
    'view_tracks',
    'manage_tracks',
    'view_stages',
    'manage_stages',
    'view_educational',
    'manage_educational',
    'view_seasonal',
    'manage_seasonal',
    'manage_programs',
    'view_reports',
    'manage_reports',
    'send_group_report',
    'view_meetings',
    'manage_meetings',
    'view_intervention_radar',
  ],
  finance_supervisor: [
    'view_dashboard',
    'view_finance',
    'manage_finance',
    'manage_finance_settings',
    'manage_custodies',
    'view_students',
    'view_halaqahs',
    'view_reports',
    'view_meetings',
  ],
  quran_supervisor: [
    'view_dashboard',
    'view_students',
    'view_halaqahs',
    'view_teachers',
    'view_attendance',
    'manage_attendance',
    'view_quran',
    'manage_quran',
    'manage_quran_plan',
    'view_spelling',
    'manage_spelling',
    'view_curriculum',
    'manage_curriculum',
    'view_tracks',
    'view_stages',
    'view_nominations',
    'manage_nominations',
    'view_points',
    'view_reports',
    'view_meetings',
  ],
  spelling_supervisor: [
    'view_dashboard',
    'view_students',
    'view_halaqahs',
    'view_attendance',
    'manage_attendance',
    'view_quran',
    'view_spelling',
    'manage_spelling',
    'view_points',
    'view_meetings',
  ],
  educational_supervisor: [
    'view_dashboard',
    'view_students',
    'view_halaqahs',
    'view_attendance',
    'view_points',
    'manage_points',
    'manage_points_rules',
    'view_educational',
    'manage_educational',
    'view_seasonal',
    'manage_seasonal',
    'manage_programs',
    'view_reports',
    'view_meetings',
    'manage_meetings',
    'view_intervention_radar',
  ],
  stage_supervisor: [
    'view_dashboard',
    'view_students',
    'manage_students',
    'view_halaqahs',
    'view_attendance',
    'manage_attendance',
    'view_quran',
    'manage_quran',
    'manage_quran_plan',
    'view_points',
    'manage_points',
    'view_stages',
    'view_educational',
    'manage_educational',
    'view_seasonal',
    'manage_seasonal',
    'view_reports',
    'send_group_report',
    'view_meetings',
    'view_intervention_radar',
  ],
  admissions_supervisor: [
    'view_dashboard',
    'view_students',
    'manage_students',
    'view_halaqahs',
    'view_admissions',
    'manage_admissions',
    'manage_admissions_settings',
    'view_meetings',
  ],
};

export function getEffectivePermissions(user: User | null, activeTenant?: MosqueComplexTenant | null): string[] {
  if (!user) return [];

  const overrideKey = user.role === 'supervisor' && user.supervisorScope?.type ? user.supervisorScope.type : user.role;
  const roleOverride = activeTenant?.rolePermissionsOverrides?.[overrideKey];

  // If this is an admin and NO custom override is set, grant all permissions
  if ((user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') && !roleOverride) {
    return ALL_PERMISSIONS.map(p => p.id);
  }

  const custom = user.customPermissions || [];
  const validTemporary = (user.temporaryCustomPermissions || [])
    .filter(tp => new Date(tp.expiresAt) > new Date())
    .map(tp => tp.id);
  const allCustom = [...custom, ...validTemporary];

  // If user has strict custom_only permissions mode
  if (user.permissionMode === 'custom_only') {
    return Array.from(new Set(allCustom));
  }

  let roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role] || [];

  if (roleOverride !== undefined) {
    roleDefaults = roleOverride;
  } else if (user.role === 'supervisor' && user.supervisorScope?.type) {
    const scopeDefaults = SUPERVISOR_TYPE_DEFAULT_PERMISSIONS[user.supervisorScope.type];
    if (scopeDefaults) {
      roleDefaults = scopeDefaults;
    }
  }

  // Combine unique
  const combined = Array.from(new Set([...roleDefaults, ...allCustom]));

  // Safeguard: Ensure administrators never lock themselves out of managing permissions and dashboard
  if (user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') {
    if (!combined.includes('manage_staff')) combined.push('manage_staff');
    if (!combined.includes('view_dashboard')) combined.push('view_dashboard');
  }

  return combined;
}

export function hasPermission(
  user: User | null,
  permissionId: string,
  targetHalaqahId?: string,
  targetStageId?: string,
  halaqahs: Halaqah[] = [],
  activeTenant?: MosqueComplexTenant | null
): boolean {
  if (!user) return false;
  if (!user.isActive) return false;

  const overrideKey = user.role === 'supervisor' && user.supervisorScope?.type ? user.supervisorScope.type : user.role;
  const roleOverride = activeTenant?.rolePermissionsOverrides?.[overrideKey];

  // Global admins have all permissions IF no override is configured
  if ((user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') && !roleOverride) {
    return true;
  }

  // Administrators cannot be locked out of staff/permissions management or dashboard
  if ((user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') && (permissionId === 'manage_staff' || permissionId === 'view_dashboard')) {
    return true;
  }

  const effective = getEffectivePermissions(user, activeTenant);
  if (!effective.includes(permissionId)) {
    return false;
  }

  // Check delegations scope if available
  if (user.delegations && user.delegations[permissionId]) {
    const delegation = user.delegations[permissionId];
    // Check scope
    if (delegation.scopeType === 'halaqah' && delegation.scopeIds?.length > 0) {
      if (targetHalaqahId && !delegation.scopeIds.includes(targetHalaqahId)) {
        return false;
      }
    }
    if (delegation.scopeType === 'stage' && delegation.scopeIds?.length > 0) {
      if (targetStageId && !delegation.scopeIds.includes(targetStageId)) {
        if (targetHalaqahId && halaqahs.length > 0) {
          const hObj = halaqahs.find(h => h.id === targetHalaqahId);
          if (hObj && hObj.stageId && !delegation.scopeIds.includes(hObj.stageId)) {
            return false;
          }
        }
      }
    }
  }

  if (user.isAllHalaqahs && user.role !== 'supervisor') return true;

  // Fallback role scope checks
  if (user.role === 'teacher') {
    const allowedHalaqahs = [user.halaqahId, ...(user.assignedHalaqahIds || [])].filter(Boolean);
    if (targetHalaqahId && allowedHalaqahs.length > 0) {
      return allowedHalaqahs.includes(targetHalaqahId);
    }
  }

  if (user.role === 'supervisor') {
    const allowedStages = [
      ...(user.supervisorScope?.stageIds || []),
      ...(user.assignedStageIds || [])
    ].filter(Boolean);

    const allowedHalaqahs = [
      ...(user.supervisorScope?.halaqahIds || []),
      ...(user.assignedHalaqahIds || [])
    ].filter(Boolean);

    if (targetStageId && allowedStages.length > 0 && !allowedStages.includes(targetStageId)) {
      return false;
    }

    if (targetHalaqahId) {
      if (allowedHalaqahs.length > 0 && allowedHalaqahs.includes(targetHalaqahId)) {
        return true;
      }
      if (halaqahs.length > 0) {
        const halaqahObj = halaqahs.find(h => h.id === targetHalaqahId);
        if (halaqahObj && halaqahObj.stageId && allowedStages.length > 0) {
          return allowedStages.includes(halaqahObj.stageId);
        }
      }
      if (allowedStages.length > 0) {
        return false;
      }
      if (user.isAllHalaqahs) return true;
    }
  }

  return true;
}

export function filterStudentsByScope(
  students: Student[],
  user: User | null,
  halaqahs: Halaqah[]
): Student[] {
  if (!user) return [];
  if (user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') {
    return students;
  }

  if (user.role === 'teacher') {
    const allowedHalaqahs = [user.halaqahId, ...(user.assignedHalaqahIds || [])].filter(Boolean);
    return students.filter(s => allowedHalaqahs.includes(s.halaqahId));
  }

  if (user.role === 'supervisor') {
    const allowedStages = [
      ...(user.supervisorScope?.stageIds || []),
      ...(user.assignedStageIds || [])
    ].filter(Boolean);

    const allowedHalaqahs = [
      ...(user.supervisorScope?.halaqahIds || []),
      ...(user.assignedHalaqahIds || [])
    ].filter(Boolean);

    return students.filter(s => {
      const halaqahObj = halaqahs.find(h => h.id === s.halaqahId);
      const studentStageId = s.stageId || halaqahObj?.stageId;

      if (allowedStages.length > 0) {
        const matchesStage = studentStageId ? allowedStages.includes(studentStageId) : false;
        if (allowedHalaqahs.length > 0) {
          return allowedHalaqahs.includes(s.halaqahId) || matchesStage;
        }
        return matchesStage;
      }

      if (allowedHalaqahs.length > 0) {
        return allowedHalaqahs.includes(s.halaqahId);
      }

      // No scope configured at all → unrestricted (never silently hide everything)
      return true;
    });
  }

  if (user.isAllHalaqahs) return students;

  if (user.role === 'parent') {
    return students.filter(s => s.parentPhone === user.phone || s.id === user.studentId);
  }

  if (user.role === 'student') {
    return students.filter(s => s.id === user.studentId);
  }

  return [];
}

export function filterHalaqahsByScope(
  halaqahs: Halaqah[],
  user: User | null
): Halaqah[] {
  if (!user) return [];
  if (user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') {
    return halaqahs;
  }

  if (user.role === 'teacher') {
    const allowedHalaqahs = [user.halaqahId, ...(user.assignedHalaqahIds || [])].filter(Boolean);
    return halaqahs.filter(h => allowedHalaqahs.includes(h.id) || h.teacherId === user.id);
  }

  if (user.role === 'supervisor') {
    const allowedStages = [
      ...(user.supervisorScope?.stageIds || []),
      ...(user.assignedStageIds || [])
    ].filter(Boolean);

    const allowedHalaqahs = [
      ...(user.supervisorScope?.halaqahIds || []),
      ...(user.assignedHalaqahIds || [])
    ].filter(Boolean);

    return halaqahs.filter(h => {
      if (allowedStages.length > 0) {
        const stageMatch = Boolean(h.stageId && allowedStages.includes(h.stageId));
        if (allowedHalaqahs.length > 0) {
          return allowedHalaqahs.includes(h.id) || stageMatch;
        }
        return stageMatch;
      }

      if (allowedHalaqahs.length > 0) {
        return allowedHalaqahs.includes(h.id);
      }

      // No scope configured at all → unrestricted
      return true;
    });
  }

  if (user.isAllHalaqahs) return halaqahs;

  return [];
}
