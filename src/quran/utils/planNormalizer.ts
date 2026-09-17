import { Student } from '../../types';
import { QuranPosition } from '../types';
import { StudentQuranPlan, OriginalTargetSnapshot, UnifiedPlanOutput } from '../types/plan';
import { SURAHS_LIST } from '../../data/initialData';

/**
 * Resolves an Arabic surah name safely from any input: number, string, or position object
 */
export function getSurahArabicName(surahInput?: any): string {
  if (!surahInput) return '';
  if (typeof surahInput === 'number') {
    const s = SURAHS_LIST.find((item) => item.number === surahInput);
    return s ? s.name : `سورة ${surahInput}`;
  }
  if (typeof surahInput === 'string') {
    const clean = surahInput.replace(/^سورة\s+|^سوره\s+/, '').trim();
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 114) {
      const s = SURAHS_LIST.find((item) => item.number === parsed);
      if (s) return s.name;
    }
    const found = SURAHS_LIST.find((item) => item.name === clean || item.name.includes(clean));
    return found ? found.name : clean;
  }
  if (typeof surahInput === 'object') {
    const num =
      surahInput.surahNumber ||
      (typeof surahInput.surah === 'number' ? surahInput.surah : undefined);
    if (num) {
      const s = SURAHS_LIST.find((item) => item.number === num);
      if (s) return s.name;
    }
    const name =
      surahInput.surahName || (typeof surahInput.surah === 'string' ? surahInput.surah : undefined);
    if (name) {
      return getSurahArabicName(name);
    }
  }
  return '';
}

/**
 * Resolves a surah number safely from any input: number, string, or position object
 */
export function getSurahNumberFromInput(input?: any, defaultNum = 114): number {
  if (!input) return defaultNum;
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    const clean = input.replace(/^سورة\s+|^سوره\s+/, '').trim();
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 114) return parsed;
    const found = SURAHS_LIST.find((item) => item.name === clean || item.name.includes(clean));
    if (found) return found.number;
  }
  if (typeof input === 'object') {
    if (typeof input.surahNumber === 'number') return input.surahNumber;
    if (typeof input.surah === 'number') return input.surah;
    const name = input.surahName || (typeof input.surah === 'string' ? input.surah : undefined);
    if (name) return getSurahNumberFromInput(name, defaultNum);
  }
  return defaultNum;
}

/**
 * Normalizes any Quran position into a valid QuranPosition object
 */
export function normalizeQuranPosition(rawPos: any, fallbackSurah = 114, fallbackAyah = 1): QuranPosition {
  if (!rawPos) {
    const sName = getSurahArabicName(fallbackSurah);
    return {
      surahNumber: fallbackSurah,
      ayahNumber: fallbackAyah,
      surahName: sName,
    };
  }

  const surahNumber = getSurahNumberFromInput(rawPos, fallbackSurah);
  const ayahNumber = rawPos.ayahNumber ?? rawPos.ayah ?? fallbackAyah;
  const surahName = rawPos.surahName || getSurahArabicName(rawPos) || getSurahArabicName(surahNumber);

  return {
    surahNumber,
    ayahNumber,
    surahName,
    pageNumber: rawPos.pageNumber,
    globalIndex: rawPos.globalIndex,
  };
}

/**
 * Normalizes any StudentQuranPlan (including legacy Firestore documents or incomplete stubs)
 * to ensure all fields, coordinates, and positions are strictly defined and type-safe.
 */
export function normalizeStudentQuranPlan(
  rawPlan: any,
  student?: Partial<Student> | null
): StudentQuranPlan {
  if (!rawPlan) return rawPlan;

  // 1. Normalize targetStart
  const targetStart = normalizeQuranPosition(rawPlan.targetStart, 114, 1);

  // 2. Normalize targetEnd
  const fallbackEnd = student?.minimumTargetSurah
    ? getSurahNumberFromInput(student.minimumTargetSurah, 88)
    : 88;
  const targetEnd = normalizeQuranPosition(rawPlan.targetEnd, fallbackEnd, 1);

  // 3. Normalize currentPosition
  let currentPosition: QuranPosition;
  if (rawPlan.currentPosition) {
    currentPosition = normalizeQuranPosition(rawPlan.currentPosition, targetStart.surahNumber, 1);
  } else if (student?.currentSurah) {
    const sNum = getSurahNumberFromInput(student.currentSurah, targetStart.surahNumber);
    const aNum = student.currentAyah || 1;
    currentPosition = normalizeQuranPosition({ surahNumber: sNum, ayahNumber: aNum }, sNum, aNum);
  } else {
    currentPosition = { ...targetStart };
  }

  // 4. Normalize originalTarget
  const originalTarget: OriginalTargetSnapshot = rawPlan.originalTarget || {
    targetStart,
    targetEnd,
    direction: rawPlan.direction || 'backward',
    unitType: rawPlan.unitType || 'surah',
    dailyAmount: rawPlan.dailyAmount || 1,
    totalUnits: rawPlan.totalUnits || 10,
    totalAyahs: rawPlan.totalAyahs || 50,
    expectedEndDate: rawPlan.endDate || '2026-12-15',
    createdAt: rawPlan.createdAt || new Date().toISOString(),
    displayTarget: `من سورة ${targetStart.surahName || getSurahArabicName(targetStart.surahNumber)} إلى سورة ${targetEnd.surahName || getSurahArabicName(targetEnd.surahNumber)}`,
  };

  // 5. Normalize generatedPlan
  const rawGenerated = rawPlan.generatedPlan || {};
  const generatedPlan: UnifiedPlanOutput = {
    termPlan: rawGenerated.termPlan || {
      termName: rawPlan.termName || 'الفصل الدراسي الثاني 1447هـ',
      startDate: rawPlan.startDate || '2026-08-25',
      endDate: rawPlan.endDate || '2026-12-15',
      startPosition: targetStart,
      endPosition: targetEnd,
      displayLabel: originalTarget.displayTarget,
      totalAyahs: originalTarget.totalAyahs,
      totalUnits: originalTarget.totalUnits,
      totalWorkingDays: Array.isArray(rawGenerated.dailyPlans) ? rawGenerated.dailyPlans.length : 70,
      direction: rawPlan.direction || 'backward',
    },
    monthlyPlans: Array.isArray(rawGenerated.monthlyPlans) ? rawGenerated.monthlyPlans : [],
    weeklyPlans: Array.isArray(rawGenerated.weeklyPlans) ? rawGenerated.weeklyPlans : [],
    dailyPlans: Array.isArray(rawGenerated.dailyPlans) ? rawGenerated.dailyPlans : [],
    metrics: rawGenerated.metrics,
  };

  return {
    ...rawPlan,
    targetStart,
    targetEnd,
    currentPosition,
    originalTarget,
    generatedPlan,
    direction: rawPlan.direction || 'backward',
    unitType: rawPlan.unitType || 'surah',
    dailyAmount: rawPlan.dailyAmount || 1,
    planType: rawPlan.planType || 'memorization',
    status: rawPlan.status || 'active',
    versionHistory: Array.isArray(rawPlan.versionHistory) ? rawPlan.versionHistory : [],
    teacherOverrides: Array.isArray(rawPlan.teacherOverrides) ? rawPlan.teacherOverrides : [],
    recalculationHistory: Array.isArray(rawPlan.recalculationHistory) ? rawPlan.recalculationHistory : [],
  };
}
