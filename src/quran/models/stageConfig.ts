import { PlanningUnitType, QuranPosition } from '../types';
import { WorkingDaysSchedule } from '../types/plan';

/**
 * Universal Stage / Grade / Group Configuration Model
 *
 * Completely decoupled from hardcoded school names or educational levels.
 * Educational programs are represented purely as configurable data records.
 */
export interface StageQuranConfig {
  id: string;
  name: string;
  code: string;
  description?: string;
  targetGrades?: string[]; // e.g. ['تمهيدي'], ['صف أول'], ['صف ثاني'], etc.
  dailyPaceDescription?: string; // Descriptive pedagogical note (e.g. "قرابة سطر واحد يومياً (آية إلى آيتين)")

  // Default Memorization Settings
  memorization: {
    unitType: PlanningUnitType;
    defaultDailyAmount: number;
    defaultDirection: 'forward' | 'backward';
    defaultTargetStart: QuranPosition;
    defaultTargetEnd: QuranPosition;
    paceDescription?: string;
  };

  // Default Revision Settings
  revision: {
    mode: 'pages' | 'surahs' | 'lines' | 'ayahs' | 'quarters' | 'hizb' | 'juz' | 'custom';
    unitType: PlanningUnitType;
    defaultDailyAmount: number;
    defaultDailyPages?: number; // Independent daily revision in pages (starts from 0.5, 1, 2, 3...)
    defaultDirection: 'forward' | 'backward';
    defaultTargetStart: QuranPosition;
    defaultTargetEnd: QuranPosition;
    surahsPerDay?: number;
  };

  /** Default automatic consolidation days upon Surah completion (default: 3 days) */
  consolidationDays?: number;

  // Schedule configuration
  schedule: WorkingDaysSchedule;

  // Academic Calendar defaults
  defaultTermWeeks: number;
  isActive?: boolean;
}

/**
 * Pre-configured reference templates
 * (Served as customizable starting points, never hardcoded conditionals in logic)
 */
export const DEFAULT_STAGE_CONFIGS: StageQuranConfig[] = [
  {
    id: 'tamheedi_foundation',
    name: 'مرحلة التمهيدي (روضة / تمهيدي)',
    code: 'tamheedi',
    description: 'خطة حفظ تنازلي تبدأ بالفاتحة ثم من سورة الناس إلى سورة الفيل بمقدار آية إلى آيتين يومياً',
    targetGrades: ['تمهيدي'],
    dailyPaceDescription: 'قرابة سطر واحد يوميًا (آية إلى آيتين)',
    memorization: {
      unitType: 'ayah',
      defaultDailyAmount: 1,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 }, // الفاتحة (أم الكتاب أولاً)
      defaultTargetEnd: { surahNumber: 105, ayahNumber: 5 }, // الفيل
      paceDescription: 'قرابة سطر واحد يوميًا (آية إلى آيتين)',
    },
    revision: {
      mode: 'pages',
      unitType: 'page',
      defaultDailyAmount: 1,
      defaultDailyPages: 0.5,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 105, ayahNumber: 5 },
      surahsPerDay: 2,
    },
    consolidationDays: 3,
    schedule: {
      workingDays: [0, 1, 2, 3], // Sun to Wed
    },
    defaultTermWeeks: 12,
    isActive: true,
  },
  {
    id: 'grade1_foundation',
    name: 'مرحلة الصف الأول الابتدائي',
    code: 'grade1',
    description: 'خطة حفظ تنازلي تبدأ بالفاتحة ثم من سورة الناس إلى سورة الضحى بمقدار آيتين إلى 3 آيات يومياً',
    targetGrades: ['صف أول'],
    dailyPaceDescription: 'قرابة سطرين يوميًا (آيتين إلى 3 آيات)',
    memorization: {
      unitType: 'ayah',
      defaultDailyAmount: 2,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 }, // الفاتحة
      defaultTargetEnd: { surahNumber: 93, ayahNumber: 11 }, // الضحى
      paceDescription: 'قرابة سطرين يوميًا (آيتين إلى 3 آيات)',
    },
    revision: {
      mode: 'pages',
      unitType: 'page',
      defaultDailyAmount: 1,
      defaultDailyPages: 1,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 93, ayahNumber: 11 },
      surahsPerDay: 2,
    },
    consolidationDays: 3,
    schedule: {
      workingDays: [0, 1, 2, 3],
    },
    defaultTermWeeks: 12,
    isActive: true,
  },
  {
    id: 'grade2_foundation',
    name: 'مرحلة الصف الثاني الابتدائي',
    code: 'grade2',
    description: 'خطة حفظ تنازلي تبدأ بالفاتحة ثم من سورة الناس إلى سورة الغاشية بمقدار 3 إلى 4 آيات يومياً',
    targetGrades: ['صف ثاني'],
    dailyPaceDescription: 'قرابة ثلاثة أسطر يوميًا (3 إلى 4 آيات)',
    memorization: {
      unitType: 'ayah',
      defaultDailyAmount: 3,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 }, // الفاتحة
      defaultTargetEnd: { surahNumber: 88, ayahNumber: 26 }, // الغاشية
      paceDescription: 'قرابة ثلاثة أسطر يوميًا (3 إلى 4 آيات)',
    },
    revision: {
      mode: 'pages',
      unitType: 'page',
      defaultDailyAmount: 2,
      defaultDailyPages: 2,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 88, ayahNumber: 26 },
      surahsPerDay: 2,
    },
    consolidationDays: 3,
    schedule: {
      workingDays: [0, 1, 2, 3],
    },
    defaultTermWeeks: 12,
    isActive: true,
  },
  {
    id: 'primary_stage_half_page',
    name: 'المرحلة الابتدائية (خطة نصف صفحة)',
    code: 'primary_half_page',
    description: 'خطة حفظ تبدأ بالفاتحة ثم من سورة الناس بمقدار نصف صفحة يوميًا والمراجعة بالصفحة',
    targetGrades: ['ابتدائي', 'صف ثالث', 'صف رابع', 'صف خامس', 'صف سادس'],
    dailyPaceDescription: 'نصف صفحة يوميًا من المصحف',
    memorization: {
      unitType: 'half_page',
      defaultDailyAmount: 1,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 78, ayahNumber: 40 }, // النبأ
      paceDescription: 'نصف صفحة يومياً',
    },
    revision: {
      mode: 'pages',
      unitType: 'page',
      defaultDailyAmount: 1,
      defaultDailyPages: 1,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 78, ayahNumber: 1 },
    },
    consolidationDays: 3,
    schedule: {
      workingDays: [0, 1, 2, 3, 4], // 5 days
    },
    defaultTermWeeks: 16,
    isActive: true,
  },
  {
    id: 'intensive_memorization_page',
    name: 'حلقة الحفظ المكثف (صفحة كاملة)',
    code: 'intensive_page',
    description: 'خطة حفظ صفحة كاملة ومراجعة 3-5 صفحات يوميًا',
    targetGrades: ['مكثف', 'متوسط', 'ثانوي', 'جامعي'],
    dailyPaceDescription: 'صفحة كاملة يوميًا مع مراجعة مكثفة',
    memorization: {
      unitType: 'page',
      defaultDailyAmount: 1,
      defaultDirection: 'forward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 }, // الفاتحة
      defaultTargetEnd: { surahNumber: 2, ayahNumber: 286 }, // البقرة
      paceDescription: 'صفحة كاملة يومياً',
    },
    revision: {
      mode: 'pages',
      unitType: 'page',
      defaultDailyAmount: 3,
      defaultDailyPages: 3,
      defaultDirection: 'forward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 2, ayahNumber: 286 },
    },
    consolidationDays: 3,
    schedule: {
      workingDays: [0, 1, 2, 3, 4],
    },
    defaultTermWeeks: 16,
    isActive: true,
  },
];

/**
 * Helper to match student grade or stageId to a StageQuranConfig
 */
export function findStageConfigForStudent(
  student: { grade?: string; stageId?: string },
  configs: StageQuranConfig[] = DEFAULT_STAGE_CONFIGS
): StageQuranConfig {
  if (student.stageId) {
    const byId = configs.find((c) => c.id === student.stageId);
    if (byId) return byId;
  }
  if (student.grade) {
    const byGrade = configs.find((c) => c.targetGrades?.includes(student.grade as string));
    if (byGrade) return byGrade;
  }
  // Fallback to first active config or default
  return configs[0] || DEFAULT_STAGE_CONFIGS[0];
}
