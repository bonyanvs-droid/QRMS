import { AdmissionFormFieldConfig } from '../../types';

export const DEFAULT_CLOSED_MESSAGE = 'نعتذر لكم عن إغلاق باب القبول والتسجيل حالياً لاكتمال العدد والطاقة الاستيعابية، نسأل الله لأبنائنا التوفيق والسداد.';

export interface AdmissionFieldMeta {
  id: string;
  defaultLabel: string;
  section: 'student' | 'contact' | 'program' | 'other';
  sectionTitle: string;
  defaultHelpText?: string;
  canBeRequired: boolean;
  canBeHidden: boolean;
}

export const ADMISSION_FIELDS_META: AdmissionFieldMeta[] = [
  {
    id: 'studentName',
    defaultLabel: 'اسم الطالب الرباعي',
    section: 'student',
    sectionTitle: 'بيانات الطالب الأساسية',
    defaultHelpText: 'الاسم الكامل للطالب الرباعي كما في الهوية',
    canBeRequired: true,
    canBeHidden: false, // Core field: always shown
  },
  {
    id: 'grade',
    defaultLabel: 'المرحلة الدراسية',
    section: 'student',
    sectionTitle: 'بيانات الطالب الأساسية',
    defaultHelpText: 'الصف والمرحلة الدراسية للطالب (تمهيدي، ابتدائي، متوسط، ثانوي)',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'nationalId',
    defaultLabel: 'رقم هوية الطالب / الإقامة',
    section: 'student',
    sectionTitle: 'بيانات الطالب الأساسية',
    defaultHelpText: 'رقم الهوية الوطنية أو الإقامة المكون من 10 أرقام',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'parentName',
    defaultLabel: 'اسم ولي أمر الطالب (الأب / الكفيل)',
    section: 'contact',
    sectionTitle: 'بيانات التواصل وولي الأمر',
    defaultHelpText: 'الاسم الكامل لولي أمر الطالب',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'parentPhone',
    defaultLabel: 'جوال ولي الأمر (الأب)',
    section: 'contact',
    sectionTitle: 'بيانات التواصل وولي الأمر',
    defaultHelpText: 'الرقم المعتمد لإرسال الإشعارات والرسائل عبر واتساب',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'motherPhone',
    defaultLabel: 'جوال والدة الطالب',
    section: 'contact',
    sectionTitle: 'بيانات التواصل وولي الأمر',
    defaultHelpText: 'للتواصل والمتابعة الإدارية والأسرية',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'registrationType',
    defaultLabel: 'نوع التسجيل وباقة الاشتراك',
    section: 'program',
    sectionTitle: 'الباقات والرسوم',
    defaultHelpText: 'اختيار الباقة (الاشتراك الكامل، أنشطة فقط، قرآن فقط)',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'previouslyRegistered',
    defaultLabel: 'سؤال: هل تم تعبئة استمارة التسجيل في الحلقات مسبقاً؟',
    section: 'program',
    sectionTitle: 'الباقات والرسوم',
    defaultHelpText: 'تحديد ما إذا كان الطالب مسجلاً مسبقاً أم طالباً جديداً',
    canBeRequired: true,
    canBeHidden: true,
  },
  {
    id: 'notes',
    defaultLabel: 'ملاحظات إضافية أو ما يحفظه الطالب من القرآن',
    section: 'other',
    sectionTitle: 'ملاحظات وتعهدات',
    defaultHelpText: 'حقل اختياري لتدوين ملاحظات ولي الأمر أو المحفوظ السابق',
    canBeRequired: false,
    canBeHidden: true,
  },
  {
    id: 'tuitionPolicyCard',
    defaultLabel: 'بطاقة آلية الرسوم ومتابعة المستحقات والضوابط',
    section: 'other',
    sectionTitle: 'ملاحظات وتعهدات',
    defaultHelpText: 'عرض بطاقة سياسة الرسوم والتذكيرات وضابط الاسترداد وأرقام التواصل',
    canBeRequired: false,
    canBeHidden: true,
  },
  {
    id: 'feePledge',
    defaultLabel: 'تعهد ولي الأمر بالرسوم والتسديد',
    section: 'other',
    sectionTitle: 'ملاحظات وتعهدات',
    defaultHelpText: 'مربع الموافقة والتعهد بسداد الرسوم خلال الأسبوع الأول والثاني',
    canBeRequired: true,
    canBeHidden: true,
  },
];

export const DEFAULT_ADMISSION_FORM_FIELDS: Record<string, AdmissionFormFieldConfig> = {
  studentName: {
    id: 'studentName',
    label: 'اسم الطالب الرباعي',
    helpText: 'الاسم الكامل للطالب كما في الهوية',
    visible: true,
    required: true,
  },
  grade: {
    id: 'grade',
    label: 'المرحلة الدراسية',
    helpText: 'الصف والمرحلة الدراسية للطالب',
    visible: true,
    required: true,
  },
  nationalId: {
    id: 'nationalId',
    label: 'رقم هوية الطالب / الإقامة',
    helpText: 'رقم الهوية الوطنية أو الإقامة (10 أرقام)',
    visible: true,
    required: true,
  },
  parentName: {
    id: 'parentName',
    label: 'اسم ولي أمر الطالب (الأب / الكفيل)',
    helpText: 'الاسم الكامل لولي أمر الطالب',
    visible: true,
    required: true,
  },
  parentPhone: {
    id: 'parentPhone',
    label: 'جوال ولي الأمر (الأب)',
    helpText: 'الرقم المعتمد لإرسال الإشعارات والواتساب',
    visible: true,
    required: true,
  },
  motherPhone: {
    id: 'motherPhone',
    label: 'جوال والدة الطالب',
    helpText: 'للتواصل والمتابعة الإدارية والأسرية',
    visible: true,
    required: true,
  },
  registrationType: {
    id: 'registrationType',
    label: 'نوع التسجيل وباقة الاشتراك',
    helpText: 'اختيار الباقة والرسوم المناسبة',
    visible: true,
    required: true,
  },
  previouslyRegistered: {
    id: 'previouslyRegistered',
    label: 'هل تم تعبئة استمارة التسجيل في الحلقات مسبقاً؟',
    helpText: 'سؤال تحديد التسجيل المسبق أو طالب جديد',
    visible: true,
    required: true,
  },
  notes: {
    id: 'notes',
    label: 'ملاحظات إضافية أو ما يحفظه الطالب من القرآن سابقًا',
    helpText: 'حقل نصي اختياري',
    visible: true,
    required: false,
  },
  tuitionPolicyCard: {
    id: 'tuitionPolicyCard',
    label: 'بطاقة سياسة الرسوم ومتابعة المستحقات',
    helpText: 'بطاقة التوضيحات والضوابط وأرقام التواصل',
    visible: true,
    required: false,
  },
  feePledge: {
    id: 'feePledge',
    label: 'تعهد ولي الأمر بسداد الرسوم',
    helpText: 'مربع إقرار والتزام ولي الأمر بالسداد',
    visible: true,
    required: true,
  },
};

export const DEFAULT_TENANT_ADMISSIONS_CONFIG: import('../../types').TenantAdmissionsConfig = {
  isOpen: true,
  maxOpenApplications: 50,
  openTracks: ['عام', 'مكثف', 'تلقين', 'إجازات'],
  termsAndConditions: 'الالتزام بأنظمة المجمع ولوائحه والحضور في الأوقات المحددة.',
  closedMessage: DEFAULT_CLOSED_MESSAGE,
  formFields: DEFAULT_ADMISSION_FORM_FIELDS,
  fullPackagePrice: 2000,
  activitiesOnlyPrice: 1500,
  quranOnlyPrice: 1000,
  contactPhones: ['0503049194', '0562018313', '0598145076'],
  pledgeText: 'أتعهد أنا ولي أمر الطالب بسداد رسوم اشتراك الابن خلال الأسبوع الاول والثاني من بداية كل فصل دراسي.',
};

