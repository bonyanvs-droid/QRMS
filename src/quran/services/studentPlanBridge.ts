import { Student, AcademicYearConfig } from '../../types';
import { QuranPosition, Surah, IQuranDataProvider } from '../types';
import {
  StudentQuranPlan,
  PlanDirection,
  PlanScope,
  OriginalTargetSnapshot,
  PlanningUnitType,
} from '../types/plan';
import { StageQuranConfig, findStageConfigForStudent } from '../models/stageConfig';
import { QuranMemorizationPlanningEngine } from './memorizationEngine';

export interface StudentPositionResolutionResult {
  position: QuranPosition | null;
  surah: Surah | null;
  isValid: boolean;
  reason?: string;
}

export interface MigrationFailedRecord {
  studentId: string;
  studentName: string;
  currentSurah?: string;
  currentAyah?: number;
  grade?: string;
  reason: string;
}

export interface MigrationReport {
  totalStudentsExamined: number;
  migratedCount: number;
  migratedPlans: StudentQuranPlan[];
  existingSkippedCount: number;
  existingSkippedStudentIds: string[];
  failedCount: number;
  failedStudents: MigrationFailedRecord[];
  timestamp: string;
  success: boolean;
}

export interface CreateRealStudentPlanParams {
  student: Student;
  stageConfig?: StageQuranConfig;
  allStageConfigs?: StageQuranConfig[];
  academicConfig?: AcademicYearConfig;
  scope?: PlanScope;
  title?: string;
  customStartDate?: string;
  customEndDate?: string;
  customDailyAmount?: number;
  customRevisionDailyPages?: number;
  customConsolidationDays?: number;
  customUnitType?: PlanningUnitType;
  customDirection?: PlanDirection;
  customWorkingDays?: number[];
  customTargetStart?: QuranPosition;
  customTargetEnd?: QuranPosition;
  provider: IQuranDataProvider;
  memorizationEngine: QuranMemorizationPlanningEngine;
}

/**
 * Normalizes Arabic text for tolerant string comparison (removing diacritics, prefix "سورة", etc.)
 */
export function normalizeArabicSurahName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/^سورة\s+|^سوره\s+/, '')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/diacritics
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, '');
}

/**
 * Robustly matches an Arabic surah name against the 114 standard Surahs
 */
export function matchSurahByName(
  rawName: string,
  surahs: Surah[]
): Surah | null {
  if (!rawName) return null;

  const normalizedInput = normalizeArabicSurahName(rawName);

  // 1. Direct exact match
  for (const s of surahs) {
    const sNorm = normalizeArabicSurahName(s.arabicName);
    if (sNorm === normalizedInput) return s;
  }

  // 2. Try match without 'ال' prefix or adding 'ال' prefix
  const inputWithoutAl = normalizedInput.replace(/^ال/, '');
  for (const s of surahs) {
    const sNorm = normalizeArabicSurahName(s.arabicName);
    const sNormWithoutAl = sNorm.replace(/^ال/, '');
    if (sNormWithoutAl === inputWithoutAl) return s;
  }

  return null;
}

/**
 * Safely converts an existing Student's current Quran data into a standard QuranPosition.
 * If data is missing or invalid, returns null and a descriptive reason without guessing.
 */
export function convertStudentToQuranPosition(
  student: { currentSurah?: string; currentAyah?: number; fullName?: string; id?: string },
  surahs: Surah[]
): StudentPositionResolutionResult {
  if (!student.currentSurah || student.currentSurah.trim() === '') {
    return {
      position: null,
      surah: null,
      isValid: false,
      reason: 'اسم السورة الحالية غير مسجل للطالب',
    };
  }

  const matchedSurah = matchSurahByName(student.currentSurah, surahs);
  if (!matchedSurah) {
    return {
      position: null,
      surah: null,
      isValid: false,
      reason: `تعذر التعرف على اسم السورة المسجلة: "${student.currentSurah}"`,
    };
  }

  const ayahNum = Number(student.currentAyah);
  if (isNaN(ayahNum) || ayahNum < 1 || ayahNum > matchedSurah.ayahCount) {
    return {
      position: null,
      surah: matchedSurah,
      isValid: false,
      reason: `رقم الآية (${student.currentAyah}) خارج النطاق الصحيح لسورة ${matchedSurah.arabicName} (عدد آياتها ${matchedSurah.ayahCount})`,
    };
  }

  return {
    position: {
      surahNumber: matchedSurah.surahNumber,
      ayahNumber: ayahNum,
    },
    surah: matchedSurah,
    isValid: true,
  };
}

/**
 * Resolves the target end position for a student based on minimumTargetSurah or stage config
 */
export function resolveTargetEndPosition(
  targetSurahName: string | undefined,
  surahs: Surah[],
  stageConfig: StageQuranConfig,
  direction: PlanDirection
): QuranPosition {
  if (targetSurahName) {
    const targetSurah = matchSurahByName(targetSurahName, surahs);
    if (targetSurah) {
      // In backward memorization (e.g. 114 towards 105), completing Surah Al-Feel means
      // memorizing through its final verse (ayah 5) or verse 1 depending on curriculum convention.
      // In our standard, the end position is ayah 5 if inclusive, or ayah 1.
      return {
        surahNumber: targetSurah.surahNumber,
        ayahNumber: direction === 'backward' ? targetSurah.ayahCount : targetSurah.ayahCount,
      };
    }
  }

  // Fallback to stage config default target
  return stageConfig.memorization.defaultTargetEnd;
}

/**
 * Creates a fully validated, canonical StudentQuranPlan for a real registered student.
 */
export async function createRealStudentPlan(
  params: CreateRealStudentPlanParams
): Promise<StudentQuranPlan> {
  const {
    student,
    academicConfig,
    customStartDate,
    customEndDate,
    customDailyAmount,
    customUnitType,
    customDirection,
    customWorkingDays,
    scope = 'semester',
    title,
    provider,
    memorizationEngine,
  } = params;

  const surahs = await provider.getSurahs();

  // 1. Determine Stage Configuration
  const stageConfig =
    params.stageConfig ||
    findStageConfigForStudent(student, params.allStageConfigs);

  // 2. Determine Plan Direction and Units
  const direction: PlanDirection =
    customDirection || stageConfig.memorization.defaultDirection;
  const unitType =
    customUnitType || stageConfig.memorization.unitType;
  const dailyAmount =
    customDailyAmount ?? stageConfig.memorization.defaultDailyAmount;

  // 3. Resolve Start Position
  let targetStart: QuranPosition =
    params.customTargetStart || stageConfig.memorization.defaultTargetStart;
  if (!params.customTargetStart && student.currentSurah && student.currentAyah) {
    const res = convertStudentToQuranPosition(student, surahs);
    if (res.isValid && res.position) {
      targetStart = res.position;
    }
  }

  // 4. Resolve Target End Position
  let targetEnd: QuranPosition =
    params.customTargetEnd ||
    resolveTargetEndPosition(
      student.personalTargetSurah || student.minimumTargetSurah,
      surahs,
      stageConfig,
      direction
    );

  // 5. Schedule & Dates
  const workingDays =
    customWorkingDays || stageConfig.schedule.workingDays;
  const holidays = academicConfig?.holidays || [];

  const startDate =
    customStartDate ||
    academicConfig?.startDate ||
    new Date().toISOString().slice(0, 10);

  // Default end date: ~12 weeks out if academicConfig not provided
  let endDate = customEndDate || academicConfig?.endDate;
  if (!endDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (stageConfig.defaultTermWeeks || 12) * 7);
    endDate = d.toISOString().slice(0, 10);
  }

  // 6. Generate Core Universal Plan via Engine
  const basePlan = await memorizationEngine.createPlan({
    studentId: student.id,
    startDate,
    endDate,
    targetStart,
    targetEnd,
    direction,
    unitType,
    dailyAmount,
    revisionDailyPages:
      params.customRevisionDailyPages !== undefined
        ? params.customRevisionDailyPages
        : stageConfig.revision.defaultDailyPages || 1,
    consolidationDaysPerSurah:
      params.customConsolidationDays !== undefined
        ? params.customConsolidationDays
        : stageConfig.consolidationDays !== undefined
        ? stageConfig.consolidationDays
        : 3,
    schedule: {
      workingDays,
      holidays,
    },
  });

  // 7. Attach Real Student Metadata & Contextual Identifiers
  const planTitle =
    title ||
    `خطة ${stageConfig.name} - ${student.fullName}`;

  const finalPlan: StudentQuranPlan = {
    ...basePlan,
    title: planTitle,
    scope,
    isCurrentActive: true,
    stageConfigId: stageConfig.id,
    stageId: student.stageId,
    academicYearId: academicConfig?.id,
    termName: academicConfig?.name || 'الفصل الدراسي الحالي',
    halaqahId: student.halaqahId,
    teacherId: student.teacherId,
    tenantId: student.tenantId,
    status: 'active',
  };

  return finalPlan;
}

/**
 * Idempotent migration of real students to the Universal Quran Planning Engine.
 *
 * Requirements Met:
 * - Scans existing students in Firestore/AppContext.
 * - Idempotent: Skips students who already possess an active Quran plan.
 * - Source of truth: Uses student.currentSurah, student.currentAyah, student.minimumTargetSurah.
 * - Does NOT guess on invalid/corrupted data; records failed students with clear explanations.
 * - Preserves all legacy student data without destruction or schema degradation.
 */
export async function migrateRealStudentsToQuranPlans(params: {
  students: Student[];
  stageConfigs: StageQuranConfig[];
  academicConfig?: AcademicYearConfig;
  existingPlans: StudentQuranPlan[];
  provider: IQuranDataProvider;
  memorizationEngine: QuranMemorizationPlanningEngine;
}): Promise<MigrationReport> {
  const {
    students,
    stageConfigs,
    academicConfig,
    existingPlans,
    provider,
    memorizationEngine,
  } = params;

  const surahs = await provider.getSurahs();

  // Index existing active plans by studentId
  const activePlanStudentIdSet = new Set<string>();
  for (const p of existingPlans) {
    if (p.studentId && (p.status === 'active' || p.isCurrentActive)) {
      activePlanStudentIdSet.add(p.studentId);
    }
  }

  const migratedPlans: StudentQuranPlan[] = [];
  const existingSkippedStudentIds: string[] = [];
  const failedStudents: MigrationFailedRecord[] = [];

  for (const student of students) {
    // 1. Idempotency Check
    if (activePlanStudentIdSet.has(student.id)) {
      existingSkippedStudentIds.push(student.id);
      continue;
    }

    // 2. Validate current Quran position
    const posRes = convertStudentToQuranPosition(student, surahs);
    if (!posRes.isValid) {
      failedStudents.push({
        studentId: student.id,
        studentName: student.fullName,
        currentSurah: student.currentSurah,
        currentAyah: student.currentAyah,
        grade: student.grade,
        reason: posRes.reason || 'بيانات الموضع القرآني الحالي غير صالحة',
      });
      continue;
    }

    // 3. Resolve Stage Configuration
    const stageConfig = findStageConfigForStudent(student, stageConfigs);

    // 4. Create Plan safely
    try {
      const plan = await createRealStudentPlan({
        student,
        stageConfig,
        allStageConfigs: stageConfigs,
        academicConfig,
        provider,
        memorizationEngine,
      });

      migratedPlans.push(plan);
      activePlanStudentIdSet.add(student.id);
    } catch (err: any) {
      failedStudents.push({
        studentId: student.id,
        studentName: student.fullName,
        currentSurah: student.currentSurah,
        currentAyah: student.currentAyah,
        grade: student.grade,
        reason: `تعذر توليد الخطة عبر المحرك: ${err?.message || 'خطأ غير معروف'}`,
      });
    }
  }

  return {
    totalStudentsExamined: students.length,
    migratedCount: migratedPlans.length,
    migratedPlans,
    existingSkippedCount: existingSkippedStudentIds.length,
    existingSkippedStudentIds,
    failedCount: failedStudents.length,
    failedStudents,
    timestamp: new Date().toISOString(),
    success: failedStudents.length === 0,
  };
}
