import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { QuranMemorizationPlanningEngine } from './memorizationEngine';
import { QuranRevisionPlanningEngine } from './revisionEngine';
import { PlanRecalculationService } from './recalculationService';
import { StudentQuranPlan } from '../types/plan';
import { StageQuranConfig, DEFAULT_STAGE_CONFIGS } from '../models/stageConfig';
import { safeStorage } from '../../lib/safeStorage';

export interface PlanStudentDemo {
  id: string;
  name: string;
  gradeName: string;
  stageConfigId: string;
  avatar?: string;
}

export const DEMO_PLAN_STUDENTS: PlanStudentDemo[] = [
  {
    id: 'std_omar_01',
    name: 'عمر أحمد',
    gradeName: 'المرحلة التأسيسية (روضة / تمهيدي)',
    stageConfigId: 'early_childhood_foundation',
  },
  {
    id: 'std_sara_02',
    name: 'سارة خالد',
    gradeName: 'الصف الأول الابتدائي',
    stageConfigId: 'primary_stage_half_page',
  },
  {
    id: 'std_abdul_03',
    name: 'عبدالرحمن فهد',
    gradeName: 'حلقة الحفظ المكثف',
    stageConfigId: 'intensive_memorization_page',
  },
  {
    id: 'std_zaid_04',
    name: 'زيد إبراهيم',
    gradeName: 'خطة تحت الملاحظة (متأخر عن الوتيرة)',
    stageConfigId: 'early_childhood_foundation',
  },
];

const LOCAL_STORAGE_KEY_PLANS = 'quran_engine_student_plans_v1';
const LOCAL_STORAGE_KEY_STAGES = 'quran_engine_stage_configs_v1';

function safeGetItem(key: string): string | null {
  try {
    return safeStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    safeStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export class PlanService {
  private provider: IQuranDataProvider;
  public memorizationEngine: QuranMemorizationPlanningEngine;
  public revisionEngine: QuranRevisionPlanningEngine;
  public recalculationService: PlanRecalculationService;

  constructor(provider?: IQuranDataProvider) {
    this.provider = provider || new BundledQuranProvider();
    this.memorizationEngine = new QuranMemorizationPlanningEngine(this.provider);
    this.revisionEngine = new QuranRevisionPlanningEngine(this.provider);
    this.recalculationService = new PlanRecalculationService(this.provider);
  }

  getProvider(): IQuranDataProvider {
    return this.provider;
  }

  /**
   * Loads or initializes student plans
   */
  async loadAllPlans(): Promise<StudentQuranPlan[]> {
    const raw = safeGetItem(LOCAL_STORAGE_KEY_PLANS);
    if (raw) {
      try {
        const parsed: StudentQuranPlan[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (p) =>
              p &&
              p.generatedPlan &&
              Array.isArray(p.generatedPlan.dailyPlans) &&
              p.generatedPlan.dailyPlans.length > 0
          );
          if (valid.length > 0) return valid;
        }
      } catch (e) {
        console.error('Failed to parse cached plans:', e);
      }
    }

    // Seed default realistic demonstration plans
    try {
      const seeded = await this.seedDefaultPlans();
      const validSeeded = seeded.filter(
        (p) =>
          p &&
          p.generatedPlan &&
          Array.isArray(p.generatedPlan.dailyPlans) &&
          p.generatedPlan.dailyPlans.length > 0
      );
      if (validSeeded.length > 0) {
        this.savePlans(validSeeded);
        return validSeeded;
      }
    } catch (e) {
      console.error('Failed to seed default plans:', e);
    }
    return [];
  }

  savePlans(plans: StudentQuranPlan[]): void {
    safeSetItem(LOCAL_STORAGE_KEY_PLANS, JSON.stringify(plans));
  }

  async getPlanByStudentId(studentId: string): Promise<StudentQuranPlan | null> {
    const plans = await this.loadAllPlans();
    return plans.find((p) => p.studentId === studentId && (p.isCurrentActive || p.status === 'active')) ||
      plans.find((p) => p.studentId === studentId) || null;
  }

  async getAllPlansForStudent(studentId: string): Promise<StudentQuranPlan[]> {
    const plans = await this.loadAllPlans();
    return plans.filter((p) => p.studentId === studentId);
  }

  async getActivePlanForStudent(studentId: string): Promise<StudentQuranPlan | null> {
    return this.getPlanByStudentId(studentId);
  }

  async saveOrUpdatePlan(updatedPlan: StudentQuranPlan): Promise<void> {
    const plans = await this.loadAllPlans();
    const idx = plans.findIndex((p) => p.id === updatedPlan.id);
    if (idx !== -1) {
      plans[idx] = updatedPlan;
    } else {
      plans.push(updatedPlan);
    }
    this.savePlans(plans);
  }

  /**
   * Loads stage configurations
   */
  loadStageConfigs(): StageQuranConfig[] {
    const raw = safeGetItem(LOCAL_STORAGE_KEY_STAGES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse cached stage configs:', e);
      }
    }
    return DEFAULT_STAGE_CONFIGS;
  }

  saveStageConfigs(configs: StageQuranConfig[]): void {
    safeSetItem(LOCAL_STORAGE_KEY_STAGES, JSON.stringify(configs));
  }

  /**
   * Generates initial seed plans representing real educational use cases:
   * 1. Foundation: Backward memorization from An-Nas (114) to Al-Ikhlas (112), 2 ayahs/day
   * 2. Primary: Backward memorization of Juz Amma (1/2 page/day)
   * 3. Intensive: Forward memorization from Al-Fatihah (1) to Al-Baqarah (2), 1 page/day
   * 4. At-risk plan: Student with heavy target and short time to demonstrate diagnostics
   */
  private async seedDefaultPlans(): Promise<StudentQuranPlan[]> {
    const seeded: StudentQuranPlan[] = [];

    // Plan 1: Omar (Foundation backward from 114 to 105)
    try {
      const p1 = await this.memorizationEngine.createPlan({
        studentId: 'std_omar_01',
        startDate: '2026-09-01',
        endDate: '2026-10-31',
        targetStart: { surahNumber: 114, ayahNumber: 1 },
        targetEnd: { surahNumber: 105, ayahNumber: 5 },
        direction: 'backward',
        unitType: 'ayah',
        dailyAmount: 2,
        schedule: {
          workingDays: [0, 1, 2, 3], // Sun, Mon, Tue, Wed
        },
      });

      // Simulate 2 completed days to showcase history immutability
      if (p1.generatedPlan.dailyPlans.length >= 2) {
        const d0 = p1.generatedPlan.dailyPlans[0];
        const updatedP1 = await this.recalculationService.recordDailyAchievement({
          plan: p1,
          dayDate: d0.date,
          status: 'completed',
          recordedBy: 'أستاذ صالح العبدالله',
          evaluation: 'excellent',
          notes: 'حفظ متقن ومخارج حروف سليمة',
        });
        seeded.push(updatedP1);
      } else {
        seeded.push(p1);
      }
    } catch (e) {
      console.error('Error seeding plan 1:', e);
    }

    // Plan 2: Sara (Primary half page)
    try {
      const p2 = await this.memorizationEngine.createPlan({
        studentId: 'std_sara_02',
        startDate: '2026-09-01',
        endDate: '2026-11-30',
        targetStart: { surahNumber: 114, ayahNumber: 1 },
        targetEnd: { surahNumber: 100, ayahNumber: 11 },
        direction: 'backward',
        unitType: 'half_page',
        dailyAmount: 1,
        schedule: {
          workingDays: [0, 1, 2, 3, 4], // Sun to Thu
        },
      });
      seeded.push(p2);
    } catch (e) {
      console.error('Error seeding plan 2:', e);
    }

    // Plan 3: Abdulrahman (Intensive page)
    try {
      const p3 = await this.memorizationEngine.createPlan({
        studentId: 'std_abdul_03',
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        targetStart: { surahNumber: 1, ayahNumber: 1 },
        targetEnd: { surahNumber: 2, ayahNumber: 141 },
        direction: 'forward',
        unitType: 'page',
        dailyAmount: 1,
        schedule: {
          workingDays: [0, 1, 2, 3, 4],
        },
      });
      seeded.push(p3);
    } catch (e) {
      console.error('Error seeding plan 3:', e);
    }

    // Plan 4: Zaid (Deliberately tight schedule to show At-Risk diagnostic)
    try {
      const p4 = await this.memorizationEngine.createPlan({
        studentId: 'std_zaid_04',
        startDate: '2026-09-01',
        endDate: '2026-09-10', // only ~6 working days!
        targetStart: { surahNumber: 114, ayahNumber: 1 },
        targetEnd: { surahNumber: 90, ayahNumber: 20 }, // 25 surahs!
        direction: 'backward',
        unitType: 'ayah',
        dailyAmount: 3,
        schedule: {
          workingDays: [0, 1, 2, 3],
        },
      });
      seeded.push(p4);
    } catch (e) {
      console.error('Error seeding plan 4:', e);
    }

    return seeded.map((p) => ({
      ...p,
      status: p.status || 'active',
      isCurrentActive: p.isCurrentActive !== undefined ? p.isCurrentActive : true,
      scope: p.scope || 'semester',
    }));
  }
}
