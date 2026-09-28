import {
  Student,
  AcademicYearConfig,
  DailySessionRecord,
  Halaqah,
  EducationalStage,
  MosqueComplexTenant,
  SpellingLesson,
} from '../../types';
import { QuranPosition, Surah, IQuranDataProvider } from '../types';
import {
  getSurahAyahsCount,
  getSurahsByDirection,
} from '../../utils/quranMetadata';
import {
  StudentQuranPlan,
  PlanDirection,
  PlanScope,
  OriginalTargetSnapshot,
  PlanningUnitType,
  AcademicTargetSource,
  WorkingDaysSchedule,
} from '../types/plan';
import {
  RevisionUnitKind,
  StudentPlanRevisionMode,
  REVISION_MODE_UNIT,
  LINES_PER_UNIT,
} from '../types';
import { StageQuranConfig, findStageConfigForStudent } from '../models/stageConfig';
import { QuranMemorizationPlanningEngine } from './memorizationEngine';
import { QuranRevisionPlanningEngine } from './revisionEngine';
import {
  resolveStudentWorkingDays,
  getStudentPreferredWorkingDays,
} from '../utils/studentSchedule';
import { isDateWorkingDay, addDaysToDate } from '../utils/dateUtils';
import { assignSpellingLessonsToPlan } from '../utils/spellingDistribution';

/** Default track subscription — mirrors the `halaqahs.active_track_ids` DB default */
export const DEFAULT_HALAQAH_TRACK_IDS = ['track_quran', 'track_spelling', 'track_virtues'];

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
  /** Auto Minor Revision — ON by default for new plans (pass false to opt out) */
  autoMinorRevisionMode?: boolean;
  /** Manual revision range — used when autoMinorRevisionMode is false */
  manualRevisionRange?: { start: QuranPosition; end: QuranPosition };
  customTargetStart?: QuranPosition;
  customTargetEnd?: QuranPosition;
  /** Teacher's daily revision amount in SURAH units — honored only when the
   *  resolved revision mode is 'surahs'. Independent of customRevisionDailyPages. */
  customRevisionUnitsPerWindow?: number;
  /** Daily session records — the canonical audit trail of actual achievement */
  sessionRecords?: DailySessionRecord[];
  /** Student's halaqah — the source of the ACTIVE TRACK subscription */
  halaqah?: Halaqah;
  /** Educational stages catalog — used by the academic target resolver */
  stages?: EducationalStage[];
  /** Active tenant — used by the academic target resolver */
  tenant?: MosqueComplexTenant | null;
  /** Existing spelling lessons distributed on plan days when the spelling track is active */
  spellingLessons?: SpellingLesson[];
  /** Explicit revision direction override (independent of memorization direction) */
  customRevisionDirection?: PlanDirection;
  /** Explicit revision mode override (e.g. 'pages', 'surahs', or 'none' to disable) */
  revisionMode?: StudentPlanRevisionMode;
  /** Delay starting memorization by N sessions (focus on revision/prep) */
  savingOffset?: number;
  /** Delay starting revision by N sessions */
  revisionOffset?: number;
  /** Overall plan type: memorization only, revision only, or combined */
  planType?: 'memorization' | 'revision' | 'combined';
  provider: IQuranDataProvider;
  memorizationEngine: QuranMemorizationPlanningEngine;
  revisionEngine?: QuranRevisionPlanningEngine;
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

  // 3. English/transliteration name fallback (student records may store "Al-Faatiha")
  const inputLower = rawName.trim().toLowerCase().replace(/^surah\s+/, '').replace(/[\s\-_]+/g, '');
  if (inputLower) {
    for (const s of surahs) {
      const sNameLower = (s.name || '').toLowerCase().replace(/[\s\-_]+/g, '');
      const sNameWithoutAl = sNameLower.replace(/^al/, '');
      const inputWithoutAlEn = inputLower.replace(/^al/, '');
      if (sNameLower === inputLower || (inputWithoutAlEn && sNameWithoutAl === inputWithoutAlEn)) {
        return s;
      }
    }
  }

  return null;
}

/**
 * Resolves the LAST ACTUAL ACHIEVED position for a student.
 *
 * Canonical order:
 *   1. Latest memorization session record (surahTo/ayahTo) — the audit trail
 *      written by teachers during daily recording.
 *   2. student.currentSurah/currentAyah — mirrors the same pointer.
 *
 * Returns null when nothing was ever recorded — the plan then starts from
 * the stage-config default, never from a guessed position.
 */
export function resolveLastAchievedPosition(
  student: { id?: string; currentSurah?: string; currentAyah?: number },
  sessionRecords: DailySessionRecord[] | undefined,
  surahs: Surah[]
): QuranPosition | null {
  // Records archived WITH a plan (PLAN_AND_ACHIEVEMENTS mode) stay in the DB
  // as immutable history but must never seed a NEW plan's starting position.
  const latestMemRec = (sessionRecords || [])
    .filter(
      (r) =>
        r.studentId === student.id &&
        r.memorization?.surahTo &&
        !(r.customTracks as any)?._planArchive
    )
    .sort((a, b) => `${b.date}${b.id || ''}`.localeCompare(`${a.date}${a.id || ''}`))[0];

  if (latestMemRec) {
    const surah = matchSurahByName(latestMemRec.memorization!.surahTo, surahs);
    if (surah) {
      const ayah = Number(latestMemRec.memorization!.ayahTo) || 1;
      return {
        surahNumber: surah.surahNumber,
        ayahNumber: Math.min(Math.max(ayah, 1), surah.ayahCount),
      };
    }
  }

  const res = convertStudentToQuranPosition(student, surahs);
  return res.isValid && res.position ? res.position : null;
}

/**
 * Returns the FIRST position AFTER the last achieved one in the plan's
 * governed direction — e.g. achieved through Al-Faatiha:7 backward →
 * next is Al-Faatiha:8, achieved through a surah's last ayah →
 * next surah in direction ayah 1. Returns null past the final surah.
 */
export function nextPositionInDirection(
  position: QuranPosition,
  direction: PlanDirection,
  surahs: Surah[]
): QuranPosition | null {
  const surah = surahs.find((s) => s.surahNumber === position.surahNumber);
  const ayahCount = surah?.ayahCount ?? getSurahAyahsCount(position.surahNumber);
  if (ayahCount > 0 && position.ayahNumber < ayahCount) {
    return { surahNumber: position.surahNumber, ayahNumber: position.ayahNumber + 1 };
  }

  const ordered = getSurahsByDirection(direction);
  const idx = ordered.findIndex((s) => s.number === position.surahNumber);
  if (idx !== -1 && idx + 1 < ordered.length) {
    return { surahNumber: ordered[idx + 1].number, ayahNumber: 1 };
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

// =====================================================================
// Resolved Plan Configuration — Template + Student Setup + Actual State
// =====================================================================

/**
 * The fully-resolved plan configuration — the single deterministic output
 * consumed by the engine. Every field records WHICH authority produced it so
 * preview/save/recalculation all agree on the same values.
 */
export interface ResolvedPlanConfiguration {
  stageConfig: StageQuranConfig;
  // Memorization
  direction: PlanDirection;
  unitType: PlanningUnitType;
  dailyAmount: number;
  targetStart: QuranPosition;
  targetEnd: QuranPosition;
  /** Which authority produced targetEnd (audit trail) */
  targetSource: AcademicTargetSource;
  /** The academic-year grade target when it exists (for warnings/preview) */
  academicTarget?: QuranPosition;
  // Revision (independent configuration)
  revisionMode: StudentPlanRevisionMode;
  revisionUnitKind: RevisionUnitKind;
  revisionDailyPages: number;
  revisionUnitsPerWindow?: number;
  revisionDirection: PlanDirection;
  autoMinorRevisionMode: boolean;
  manualRevisionRange?: { start: QuranPosition; end: QuranPosition };
  // Offsets
  savingOffset?: number;
  revisionOffset?: number;
  // Consolidation & schedule
  consolidationDays: number;
  schedule: WorkingDaysSchedule;
  startDate: string;
  endDate: string;
  // Tracks
  activeTrackIds: string[];
  spellingEnabled: boolean;
  warnings: string[];
}

/**
 * Maps a student's grade/stage to the matching `gradeTargets` key written by
 * the admin academic-year settings (tamheedi/grade1/grade2/stage keys…).
 */
function resolveGradeTargetKeys(
  student: { grade?: string; stageId?: string },
  stageConfig: StageQuranConfig
): string[] {
  const keys: string[] = [];
  if (student.stageId) keys.push(student.stageId);
  if (stageConfig.id) keys.push(stageConfig.id);
  if (stageConfig.code) keys.push(stageConfig.code);
  const g = (student.grade || '').trim();
  const gradeMap: Record<string, string> = {
    'تمهيدي': 'tamheedi',
    'تحضيري': 'tamheedi',
    'صف أول': 'grade1',
    'الصف الأول': 'grade1',
    'أول': 'grade1',
    'صف ثاني': 'grade2',
    'الصف الثاني': 'grade2',
    'ثاني': 'grade2',
    'صف ثالث': 'grade3',
    'الصف الثالث': 'grade3',
    'صف رابع': 'grade4',
    'الصف الرابع': 'grade4',
    'صف خامس': 'grade5',
    'الصف الخامس': 'grade5',
    'صف سادس': 'grade6',
    'الصف السادس': 'grade6',
  };
  if (gradeMap[g]) keys.push(gradeMap[g]);
  if (g) keys.push(g);
  return [...new Set(keys)];
}

/**
 * Academic Target Resolver — resolves the plan's end target through the
 * documented precedence chain, never silently mixing sources:
 *
 *   1. explicit teacher choice (customTargetEnd)
 *   2. student.personalTargetSurah  — stretch goal
 *   3. academicConfig.gradeTargets[grade/stage].minSurah — academic target
 *   4. student.minimumTargetSurah   — student minimum
 *   5. halaqah.targetSurah          — halaqah-level target
 *   6. EducationalStage.defaultTargetSurah — stage default
 *   7. tenant.targetSurahDefault    — complex default
 *   8. stageConfig.memorization.defaultTargetEnd — template default
 */
export function resolveAcademicTarget(
  params: Pick<
    CreateRealStudentPlanParams,
    'student' | 'customTargetEnd' | 'academicConfig' | 'halaqah' | 'stages' | 'tenant'
  >,
  stageConfig: StageQuranConfig,
  surahs: Surah[]
): { position: QuranPosition; source: AcademicTargetSource; academicTarget?: QuranPosition } {
  const { student, customTargetEnd, academicConfig, halaqah, stages, tenant } = params;

  if (customTargetEnd?.surahNumber) {
    return { position: customTargetEnd, source: 'explicit' };
  }

  const toPosition = (surahName: string | undefined): QuranPosition | null => {
    if (!surahName) return null;
    const s = matchSurahByName(surahName, surahs);
    return s ? { surahNumber: s.surahNumber, ayahNumber: s.ayahCount } : null;
  };

  // Academic-year grade target (kept aside for warnings even if overridden)
  let academicTarget: QuranPosition | undefined;
  const gradeTargets = academicConfig?.gradeTargets || {};
  for (const key of resolveGradeTargetKeys(student, stageConfig)) {
    const entry = gradeTargets[key];
    const pos = toPosition(entry?.minSurah);
    if (pos) {
      academicTarget = pos;
      break;
    }
  }

  const personal = toPosition(student.personalTargetSurah);
  if (personal) return { position: personal, source: 'personal', academicTarget };
  if (academicTarget) return { position: academicTarget, source: 'academic_year', academicTarget };

  const minimum = toPosition(student.minimumTargetSurah);
  if (minimum) return { position: minimum, source: 'student_minimum', academicTarget };

  const fromHalaqah = toPosition(halaqah?.targetSurah);
  if (fromHalaqah) return { position: fromHalaqah, source: 'halaqah', academicTarget };

  const eduStage = stages?.find((s) => s.id === student.stageId);
  const fromStage = toPosition(eduStage?.defaultTargetSurah);
  if (fromStage) return { position: fromStage, source: 'stage', academicTarget };

  const fromTenant = toPosition(tenant?.targetSurahDefault);
  if (fromTenant) return { position: fromTenant, source: 'tenant', academicTarget };

  return {
    position: stageConfig.memorization.defaultTargetEnd,
    source: 'template',
    academicTarget,
  };
}

/**
 * Resolves the complete plan configuration from Template + Student Setup +
 * Actual Achievement + Halaqah subscription. This is the ONLY authority that
 * turns configuration into engine inputs — the engine itself stays dumb.
 */
export function resolveQuranPlanConfiguration(
  params: Omit<CreateRealStudentPlanParams, 'provider' | 'memorizationEngine'>,
  surahs: Surah[]
): ResolvedPlanConfiguration {
  const { student, academicConfig } = params;
  const warnings: string[] = [];

  // 1. Stage template — the default source for every field
  const stageConfig =
    params.stageConfig || findStageConfigForStudent(student, params.allStageConfigs);

  // 2. Memorization — explicit setup > template default
  const direction: PlanDirection =
    params.customDirection || stageConfig.memorization.defaultDirection;
  const unitType = params.customUnitType || stageConfig.memorization.unitType;
  const dailyAmount =
    params.customDailyAmount ?? stageConfig.memorization.defaultDailyAmount;

  // 3. Start position — explicit > last ACTUAL achievement +1 > template default
  let targetStart: QuranPosition =
    params.customTargetStart || stageConfig.memorization.defaultTargetStart;
  if (!params.customTargetStart) {
    const lastAchieved = resolveLastAchievedPosition(student, params.sessionRecords, surahs);
    if (lastAchieved) {
      targetStart = nextPositionInDirection(lastAchieved, direction, surahs) || lastAchieved;
    }
  }

  // 4. Target end — full academic precedence chain (see resolveAcademicTarget)
  const targetResolution = resolveAcademicTarget(params, stageConfig, surahs);
  const targetEnd = targetResolution.position;
  if (targetResolution.source === 'template') {
    warnings.push(
      'لم يُعثر على مستهدف أكاديمي أو شخصي لهذا الطالب — استُخدم المستهدف الافتراضي للنموذج.'
    );
  }

  // 5. Revision — independent configuration from the template's revision block.
  //    revision.mode is the SINGLE authority for the revision unit kind:
  //    'surahs' → surah units, everything else → real mushaf pages.
  //    'none' disables revision completely.
  const revCfg = stageConfig.revision || ({} as StageQuranConfig['revision']);
  const revisionMode = (params.revisionMode || revCfg.mode || 'pages') as StudentPlanRevisionMode;
  const isRevisionDisabled = revisionMode === 'none';
  // Line-atomic resolution: pages=15 lines, half=8, third=5, quarter=4,
  // rub=2 — same multipliers as memorization. Structural modes (surah /
  // quarter / hizb / juz) keep real mushaf boundaries.
  const revisionUnitKind: RevisionUnitKind = REVISION_MODE_UNIT[revisionMode] ?? 'page';
  if (
    !isRevisionDisabled &&
    revCfg.unitType &&
    (revCfg.unitType === 'surah') !== (revisionUnitKind === 'surah')
  ) {
    warnings.push(
      `النموذج "${stageConfig.name}" يحمل revision.unitType="${revCfg.unitType}" قديمًا يتعارض مع revision.mode="${revisionMode}" — اعتُمد mode بوصفه المرجع الوحيد لنوع وحدة المراجعة.`
    );
  }
  const revisionDailyPages = isRevisionDisabled
    ? 0
    : params.customRevisionDailyPages !== undefined
      ? params.customRevisionDailyPages
      : revCfg.defaultDailyPages ?? revCfg.defaultDailyAmount ?? 1;
  const revisionUnitsPerWindow = isRevisionDisabled
    ? undefined
    : revisionUnitKind === 'page'
      ? undefined // page count comes from revisionDailyPages below
      : params.customRevisionUnitsPerWindow ??
        revCfg.surahsPerDay ??
        revCfg.defaultDailyAmount ??
        (revisionUnitKind === 'line' ? 5 : 1);
  if (!isRevisionDisabled && REVISION_MODE_UNIT[revisionMode] === undefined) {
    warnings.push(
      `نمط المراجعة "${revisionMode}" في النموذج غير مدعوم بعد — طُبّقت مراجعة الصفحات المتدحرجة.`
    );
  }
  // Independent revision direction: explicit setup > template revision default
  // > memorization direction (documented last-resort fallback).
  const revisionDirection: PlanDirection =
    params.customRevisionDirection || revCfg.defaultDirection || direction;
  const autoMinorRevisionMode = isRevisionDisabled
    ? false
    : params.autoMinorRevisionMode !== undefined ? params.autoMinorRevisionMode : true;
  // Manual range: explicit teacher range > template default revision range
  const manualRevisionRange =
    !isRevisionDisabled &&
    !autoMinorRevisionMode &&
    (params.manualRevisionRange ||
      (revCfg.defaultTargetStart && revCfg.defaultTargetEnd
        ? { start: revCfg.defaultTargetStart, end: revCfg.defaultTargetEnd }
        : undefined)) ||
    undefined;

  // Offsets with mutual exclusivity: activating savingOffset locks revisionOffset to 0
  const rawSavingOffset = Math.max(0, params.savingOffset || 0);
  const rawRevisionOffset = Math.max(0, params.revisionOffset || 0);
  const savingOffset = rawSavingOffset;
  const revisionOffset = savingOffset > 0 ? 0 : rawRevisionOffset;

  // 6. Consolidation + schedule
  const consolidationDays =
    params.customConsolidationDays !== undefined
      ? params.customConsolidationDays
      : stageConfig.consolidationDays !== undefined
        ? stageConfig.consolidationDays
        : 3;
  const halaqahWorkingDays = params.customWorkingDays || stageConfig.schedule.workingDays;
  const workingDays = resolveStudentWorkingDays(
    getStudentPreferredWorkingDays(student),
    halaqahWorkingDays
  ).days;
  const holidays = academicConfig?.holidays || [];

  // 7. Dates
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  let startDate = params.customStartDate || '';
  if (!startDate) {
    const termStart = academicConfig?.startDate;
    startDate = termStart && termStart > todayIso ? termStart : todayIso;
  }
  let endDate = params.customEndDate || academicConfig?.endDate;
  if (!endDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (stageConfig.defaultTermWeeks || 12) * 7);
    endDate = d.toISOString().slice(0, 10);
  }
  {
    const sched = { workingDays, holidays };
    let probe = startDate;
    for (let i = 0; i < 14 && probe <= endDate && !isDateWorkingDay(probe, sched); i++) {
      probe = addDaysToDate(probe, 1);
    }
    if (probe <= endDate && isDateWorkingDay(probe, sched)) {
      startDate = probe;
    }
  }

  // 8. Active tracks — the halaqah subscription is the ONLY source of truth.
  //    Undefined subscription → the platform default set (same as the DB
  //    column default); an explicit subscription is honored exactly.
  const halaqah = params.halaqah;
  const activeTrackIds =
    halaqah?.activeTrackIds && halaqah.activeTrackIds.length > 0
      ? [...halaqah.activeTrackIds]
      : [...DEFAULT_HALAQAH_TRACK_IDS];
  const spellingEnabled = activeTrackIds.includes('track_spelling');

  return {
    stageConfig,
    direction,
    unitType,
    dailyAmount,
    targetStart,
    targetEnd,
    targetSource: targetResolution.source,
    academicTarget: targetResolution.academicTarget,
    revisionMode,
    revisionUnitKind,
    revisionDailyPages,
    revisionUnitsPerWindow,
    revisionDirection,
    autoMinorRevisionMode,
    manualRevisionRange,
    consolidationDays,
    schedule: { workingDays, holidays },
    startDate,
    endDate,
    activeTrackIds,
    spellingEnabled,
    savingOffset,
    revisionOffset,
    warnings,
  };
}

/**
 * Creates a fully validated, canonical StudentQuranPlan for a real registered student.
 */
export async function createRealStudentPlan(
  params: CreateRealStudentPlanParams
): Promise<StudentQuranPlan> {
  const { student, academicConfig, scope = 'semester', title, provider, memorizationEngine } = params;

  const surahs = await provider.getSurahs();

  // Single deterministic resolution — Template + Setup + Actual State
  const resolved = resolveQuranPlanConfiguration(params, surahs);
  const { stageConfig } = resolved;

  // Generate Core Universal Plan via Engine (dumb deterministic planner)
  let basePlan: StudentQuranPlan;
  if (params.planType === 'revision') {
    const revEngine = params.revisionEngine || new QuranRevisionPlanningEngine(provider);
    const revMode = REVISION_MODE_UNIT[resolved.revisionMode]
      ? (resolved.revisionMode as Exclude<StudentPlanRevisionMode, 'none' | 'custom'>)
      : 'pages';
    basePlan = await revEngine.createPlan({
      studentId: student.id,
      startDate: resolved.startDate,
      endDate: resolved.endDate,
      targetStart: resolved.targetStart,
      targetEnd: resolved.targetEnd,
      direction: resolved.revisionDirection || resolved.direction,
      mode: revMode,
      dailyAmount:
        revMode === 'pages'
          ? resolved.revisionDailyPages || 1
          : resolved.revisionUnitsPerWindow || 1,
      schedule: resolved.schedule,
    });
  } else {
    basePlan = await memorizationEngine.createPlan({
      studentId: student.id,
      startDate: resolved.startDate,
      endDate: resolved.endDate,
      targetStart: resolved.targetStart,
      targetEnd: resolved.targetEnd,
      direction: resolved.direction,
      unitType: resolved.unitType,
      dailyAmount: resolved.dailyAmount,
      revisionDailyPages: resolved.revisionDailyPages,
      consolidationDaysPerSurah: resolved.consolidationDays,
      schedule: resolved.schedule,
      autoMinorRevisionMode: resolved.autoMinorRevisionMode,
      manualRevisionRange: resolved.manualRevisionRange,
      revisionDirection: resolved.revisionDirection,
      revisionUnitKind: resolved.revisionUnitKind,
      revisionUnitsPerWindow: resolved.revisionUnitsPerWindow,
      revisionMode: resolved.revisionMode,
      savingOffset: resolved.savingOffset,
      revisionOffset: resolved.revisionOffset,
    });
  }

  const effectivePlanType: 'memorization' | 'revision' | 'combined' =
    params.planType ||
    (resolved.revisionMode === 'none' ? 'memorization' : 'combined');

  // Attach Real Student Metadata & Contextual Identifiers
  const planTitle = title || `خطة ${stageConfig.name} - ${student.fullName}`;

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
    planType: effectivePlanType,
    status: 'active',
    targetSource: resolved.targetSource,
    activeTrackIds: resolved.activeTrackIds,
    savingOffset: resolved.savingOffset,
    revisionOffset: resolved.revisionOffset,
  };

  // Spelling track: distribute the EXISTING lessons across plan working days
  // only when the student's halaqah actually subscribes to the spelling track.
  if (resolved.spellingEnabled && params.spellingLessons?.length) {
    assignSpellingLessonsToPlan(
      finalPlan.generatedPlan.dailyPlans,
      params.spellingLessons,
      0
    );
  }

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
  sessionRecords?: DailySessionRecord[];
  provider: IQuranDataProvider;
  memorizationEngine: QuranMemorizationPlanningEngine;
}): Promise<MigrationReport> {
  const {
    students,
    stageConfigs,
    academicConfig,
    existingPlans,
    sessionRecords,
    provider,
    memorizationEngine,
  } = params;

  const surahs = await provider.getSurahs();

  // Index existing active plans by studentId
  const activePlanStudentIdSet = new Set<string>();
  for (const p of existingPlans) {
    if (
      p.studentId &&
      (p.status === 'active' || p.status === 'at_risk' || p.isCurrentActive)
    ) {
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
        sessionRecords: (sessionRecords || []).filter((r) => r.studentId === student.id),
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
