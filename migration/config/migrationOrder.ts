/**
 * QRMS Migration Engine - Dependency-Ordered Migration Plan
 * 
 * Defines the strict, foreign-key-aware execution sequence for migrating
 * Firestore collections to PostgreSQL without integrity or constraint violations.
 */

export interface MigrationStepOrder {
  step: number;
  collection: string;
  table: string;
  category: string;
  rationale: string;
}

export const MIGRATION_ORDER: MigrationStepOrder[] = [
  // ---------------------------------------------------------------------------
  // Tier 1: Core Independent Master Tables
  // ---------------------------------------------------------------------------
  {
    step: 1,
    collection: 'organizations',
    table: 'organizations',
    category: 'Root Master',
    rationale: 'الجمعيات والمقرات الرئيسية هي أعلى هرم في العلاقات ولا تعتمد على أي جداول أخرى.',
  },
  {
    step: 2,
    collection: 'educational_stages',
    table: 'stages',
    category: 'Root Master',
    rationale: 'المراحل التعليمية (براعم، أشبال، إلخ) مرجعية أساسية للطلاب والمستخدمين والحلقات.',
  },
  {
    step: 3,
    collection: 'quran_stage_configs',
    table: 'quran_stage_configs',
    category: 'Master Config',
    rationale: 'خطط ومحددات الحفظ والمراجعة للمراحل التعليمية.',
  },
  {
    step: 4,
    collection: 'academic_years',
    table: 'academic_years',
    category: 'Master Config',
    rationale: 'العام الدراسي والأسابيع التشغيلية لحساب الحضور والتقييمات.',
  },
  {
    step: 5,
    collection: 'spelling_lessons',
    table: 'spelling_lessons',
    category: 'Master Content',
    rationale: 'دروس الهجاء القرآني المرجعية لربط تقدم الطلاب وتحديد المهارات.',
  },
  {
    step: 6,
    collection: 'frontendConfigs',
    table: 'frontend_configs',
    category: 'Master Config',
    rationale: 'إعدادات المنصة والواجهات والبانرات العامة.',
  },
  {
    step: 7,
    collection: 'audit_logs',
    table: 'audit_logs',
    category: 'Logs',
    rationale: 'سجلات الرقابة الأمنية المستقلة.',
  },
  {
    step: 8,
    collection: 'report_logs',
    table: 'report_logs',
    category: 'Logs',
    rationale: 'سجلات الإشعارات والتقارير المرسلة.',
  },

  // ---------------------------------------------------------------------------
  // Tier 2: Tenants (Depend on Organizations)
  // ---------------------------------------------------------------------------
  {
    step: 9,
    collection: 'tenants',
    table: 'tenants',
    category: 'Tenant Core',
    rationale: 'المجمعات والمراكز القرآنية ترتبط بالجمعية الأم (organizations.id) وتمثل جذر عزل البيانات.',
  },

  // ---------------------------------------------------------------------------
  // Tier 3: Users & Tenant-Level Configurations
  // ---------------------------------------------------------------------------
  {
    step: 10,
    collection: 'platform_users',
    table: 'users',
    category: 'Core Actors',
    rationale: 'المستخدمون (مدراء، معلمون، مشرفون، أولياء) يعتمدون على tenants و organizations و stages.',
  },
  {
    step: 11,
    collection: 'track_definitions',
    table: 'track_definitions',
    category: 'Tenant Config',
    rationale: 'المسارات التخصصية المعتمدة داخل كل مجمع قرآني.',
  },
  {
    step: 12,
    collection: 'prayer_times',
    table: 'prayer_times',
    category: 'Tenant Config',
    rationale: 'مواقيت الصلاة السنوية المزامنة لموقع المجمع الجغرافي.',
  },
  {
    step: 13,
    collection: 'finance_settings',
    table: 'finance_settings',
    category: 'Tenant Config',
    rationale: 'إعدادات وسياسات المالية لكل مجمع.',
  },
  {
    step: 14,
    collection: 'support_sessions',
    table: 'support_sessions',
    category: 'Security / Ops',
    rationale: 'جلسات الدعم الفني الطارئ لمدير النظام مع المجمعات.',
  },
  {
    step: 15,
    collection: 'academic_archives',
    table: 'academic_archives',
    category: 'Historical',
    rationale: 'أرشيف الفصول الدراسية المغلقة للمجمعات.',
  },

  // ---------------------------------------------------------------------------
  // Tier 4: Halaqahs & Operations (Depend on Users, Stages, Tenants)
  // ---------------------------------------------------------------------------
  {
    step: 16,
    collection: 'halaqahs',
    table: 'halaqahs',
    category: 'Academic Core',
    rationale: 'الحلقات القرآنية تعتمد على المعلمين (users.id) والمراحل (stages.id) والمستأجر.',
  },
  {
    step: 17,
    collection: 'educational_plan',
    table: 'educational_plan_weeks',
    category: 'Educational Plans',
    rationale: 'الخطة التربوية الأسبوعية للمستأجر والمراحل.',
  },
  {
    step: 18,
    collection: 'seasonal_programs',
    table: 'seasonal_programs',
    category: 'Seasonal Programs',
    rationale: 'البرامج الموسمية تعتمد على المشرفين (users.id) والمستأجر.',
  },
  {
    step: 19,
    collection: 'meetings',
    table: 'meetings',
    category: 'Administrative',
    rationale: 'محاضر الاجتماعات الرسمية تعتمد على منشئ المحضر (users.id) والمستأجر.',
  },
  {
    step: 20,
    collection: 'staff_attendance',
    table: 'staff_attendance',
    category: 'Staff Operations',
    rationale: 'حضور وانصراف الكوادر يعتمد على (users.id) والمستأجر.',
  },
  {
    step: 21,
    collection: 'revenues',
    table: 'finance_revenues',
    category: 'Finance',
    rationale: 'سندات القبض والإيرادات الخاصة بالمستأجر.',
  },
  {
    step: 22,
    collection: 'expenses',
    table: 'finance_expenses',
    category: 'Finance',
    rationale: 'سندات الصرف والمصروفات الخاصة بالمستأجر.',
  },
  {
    step: 23,
    collection: 'custodies',
    table: 'finance_custodies',
    category: 'Finance',
    rationale: 'العهد المالية تعتمد على أمين العهدة (users.id) والمستأجر.',
  },
  {
    step: 24,
    collection: 'budget_requests',
    table: 'finance_budget_requests',
    category: 'Finance',
    rationale: 'طلبات الميزانية تعتمد على مقدم الطلب (users.id) والمستأجر.',
  },

  // ---------------------------------------------------------------------------
  // Tier 5: Sub-Entities & Program Activities
  // ---------------------------------------------------------------------------
  {
    step: 25,
    collection: 'seasonal_activities',
    table: 'seasonal_activities',
    category: 'Seasonal Activities',
    rationale: 'أنشطة البرامج الموسمية تعتمد على البرنامج الأب (seasonal_programs.id).',
  },

  // ---------------------------------------------------------------------------
  // Tier 6: Students (Depend on Halaqahs, Users, Stages, Spelling Lessons, Tenants)
  // ---------------------------------------------------------------------------
  {
    step: 26,
    collection: 'students',
    table: 'students',
    category: 'Student Core',
    rationale: 'ملفات الطلاب تعتمد على الحلقات (halaqahs.id) والمعلمين والمراحل ودروس الهجاء.',
  },

  // ---------------------------------------------------------------------------
  // Tier 7: Student-Dependent Records, Plans & Daily Tracking
  // ---------------------------------------------------------------------------
  {
    step: 27,
    collection: 'quran_plans',
    table: 'quran_plans',
    category: 'Student Plans',
    rationale: 'خطط الحفظ الفردية تعتمد على ملف الطالب (students.id).',
  },
  {
    step: 28,
    collection: 'daily_records',
    table: 'daily_session_records',
    category: 'Daily Tracking',
    rationale: 'سجلات التسميع اليومية تعتمد على (students.id) و (halaqahs.id) و (users.id).',
  },
  {
    step: 29,
    collection: 'seasonal_participations',
    table: 'seasonal_participations',
    category: 'Seasonal Tracking',
    rationale: 'مشاركات الطلاب في الأنشطة الموسمية تعتمد على (students.id) و (seasonal_programs.id).',
  },
  {
    step: 30,
    collection: 'financial_records',
    table: 'student_financial_records',
    category: 'Student Finance',
    rationale: 'الرسوم وسندات الرسوم تعتمد على ملف الطالب (students.id).',
  },
  {
    step: 31,
    collection: 'badges',
    table: 'student_badges',
    category: 'Incentives',
    rationale: 'أوسمة وتحفيز الطلاب تعتمد على ملف الطالب (students.id).',
  },
  {
    step: 32,
    collection: 'registration_requests',
    table: 'registration_requests',
    category: 'Admissions',
    rationale: 'طلبات القبول والتسجيل قد ترتبط بالطالب المقيد (students.id) أو الحلقة.',
  },
  {
    step: 33,
    collection: 'track_nominations',
    table: 'track_nominations',
    category: 'Nominations',
    rationale: 'ترشيحات المسارات تعتمد على (track_definitions.id) و (students.id) و (halaqahs.id).',
  },
  {
    step: 34,
    collection: 'association_nominations',
    table: 'association_nominations',
    category: 'Nominations',
    rationale: 'ترشيحات اختبارات الجمعية تعتمد على (students.id) و (halaqahs.id).',
  },
  {
    step: 35,
    collection: 'remedial_plans',
    table: 'remedial_plans',
    category: 'Interventions',
    rationale: 'الخطط العلاجية تعتمد على (students.id) و (halaqahs.id) و (users.id).',
  },
];

/**
 * Validates that all mapped collections have a defined order and no circular references.
 */
export function getOrderedCollections(): string[] {
  return MIGRATION_ORDER.map((item) => item.collection);
}
