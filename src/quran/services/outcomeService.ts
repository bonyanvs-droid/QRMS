import { MosqueComplexTenant, EducationalStage, Student } from '../../types';
import { QuranPositionFormatter } from '../utils/positionFormatter';

export interface ResolveOutcomeOptions {
  student?: Partial<Student> | null;
  stage?: Partial<EducationalStage> | null;
  tenant?: Partial<MosqueComplexTenant> | null;
  customTargetSurah?: string | null;
}

/**
 * Resolves the academic Quranic outcome string dynamically:
 * - Checks whether Quranic Spelling module is active in tenant.modulesConfig
 * - Dynamically formats the outcome based on student target, stage default, or tenant target
 * - Formats Surah names using QuranPositionFormatter
 */
export function getAcademicOutcome(
  tenantOrOptions?: Partial<MosqueComplexTenant> | ResolveOutcomeOptions | null,
  stage?: Partial<EducationalStage> | null,
  student?: Partial<Student> | null
): string | null {
  let resolvedTenant: Partial<MosqueComplexTenant> | null = null;
  let resolvedStage: Partial<EducationalStage> | null = null;
  let resolvedStudent: Partial<Student> | null = null;
  let customTarget: string | null = null;

  if (tenantOrOptions && ('tenant' in tenantOrOptions || 'student' in tenantOrOptions || 'stage' in tenantOrOptions)) {
    const opts = tenantOrOptions as ResolveOutcomeOptions;
    resolvedTenant = opts.tenant || null;
    resolvedStage = opts.stage || null;
    resolvedStudent = opts.student || null;
    customTarget = opts.customTargetSurah || null;
  } else {
    resolvedTenant = (tenantOrOptions as Partial<MosqueComplexTenant>) || null;
    resolvedStage = stage || null;
    resolvedStudent = student || null;
  }

  // Determine whether spelling curriculum is enabled for this tenant
  const isSpellingEnabled = resolvedTenant?.modulesConfig?.spelling !== false;

  // Resolve target Surah name
  let rawTarget: string | null = null;
  if (customTarget && customTarget.trim().length > 0) {
    rawTarget = customTarget.trim();
  } else if (resolvedStudent?.minimumTargetSurah && resolvedStudent.minimumTargetSurah.trim().length > 0) {
    rawTarget = resolvedStudent.minimumTargetSurah.trim();
  } else if ((resolvedStudent as any)?.minTargetSurah && (resolvedStudent as any).minTargetSurah.trim().length > 0) {
    rawTarget = (resolvedStudent as any).minTargetSurah.trim();
  } else if (resolvedStage?.defaultTargetSurah && resolvedStage.defaultTargetSurah.trim().length > 0) {
    rawTarget = resolvedStage.defaultTargetSurah.trim();
  } else if (resolvedTenant?.targetSurahDefault && resolvedTenant.targetSurahDefault.trim().length > 0) {
    rawTarget = resolvedTenant.targetSurahDefault.trim();
  }

  // If the stage defines an explicit outcomeSummary, we can use it when resolving for stage
  if (!customTarget && !resolvedStudent?.minimumTargetSurah && !(resolvedStudent as any)?.minTargetSurah && resolvedStage?.outcomeSummary) {
    return `«${resolvedStage.outcomeSummary}»`;
  }

  // If no target surah is defined, return null rather than guessing a stage target
  if (!rawTarget) {
    if (resolvedTenant?.referenceOutcome && resolvedTenant.referenceOutcome.trim().length > 0) {
      return resolvedTenant.referenceOutcome.trim();
    }
    return null;
  }

  const cleanSurah = rawTarget.replace(/^سورة\s+/, '').trim();
  const formattedSurah = QuranPositionFormatter.getSurahName(cleanSurah);

  if (isSpellingEnabled && resolvedStage?.id === 'baraem') {
    return `«متقنٌ لهجاء القرآن وحفظه إلى ${formattedSurah}»`;
  } else if (resolvedStage?.targetQuranAmount) {
    return `«متقنٌ لحفظ القرآن الكريم (${resolvedStage.targetQuranAmount})»`;
  } else {
    return `«متقنٌ لحفظ القرآن الكريم إلى ${formattedSurah}»`;
  }
}
