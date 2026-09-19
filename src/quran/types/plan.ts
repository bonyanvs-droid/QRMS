import { QuranPosition, PlanningUnit, PlanningUnitType, QuranRangeMetrics } from './index';
export type { PlanningUnitType };

export type PlanDirection = 'forward' | 'backward';

export type PlanStatus = 'active' | 'completed' | 'paused' | 'at_risk' | 'archived';

export type PlanScope = 'semester' | 'summer' | 'intensive' | 'remedial' | 'custom';

export type DailyItemStatus =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'overachieved'
  | 'absent'
  | 'excused'
  | 'unrecited';

export interface WorkingDaysSchedule {
  /** 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday */
  workingDays: number[];
  /** Optional custom holiday date strings (YYYY-MM-DD) to skip */
  holidays?: string[];
}

/**
 * Immutable snapshot of the original plan target
 * Stored at creation time; NEVER altered silently on subsequent recalculations.
 */
export interface OriginalTargetSnapshot {
  targetStart: QuranPosition;
  targetEnd: QuranPosition;
  direction: PlanDirection;
  unitType: PlanningUnitType;
  dailyAmount: number;
  revisionDailyPages?: number;
  totalUnits: number;
  totalAyahs: number;
  expectedEndDate: string;
  createdAt: string;
  displayTarget: string;
}

/**
 * Individual daily plan item
 *
 * CRITICAL RULE:
 * If date < today OR status in ['completed', 'partial', 'overachieved', 'absent', 'excused'],
 * it is considered HISTORICAL and is STRICTLY IMMUTABLE.
 */
export interface DailyPlanItem {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0..6
  dayName: string; // 'الأحد', 'الاثنين', etc.
  weekNumber: number;
  monthNumber: number;
  itemIndex: number; // 1-based sequential day of work
  planType: 'memorization' | 'revision';
  dayType?: 'memorization' | 'consolidation' | 'revision' | 'general_revision';
  unitType: PlanningUnitType;
  targetUnit: PlanningUnit;

  /** Consolidation cycle metadata (3 consecutive days on Surah completion) */
  isConsolidationDay?: boolean;
  consolidationDayIndex?: number; // 1, 2, 3
  consolidationSurahNumber?: number;

  /** Independent Daily Revision (specified in pages, e.g. 0.5, 1, 2, 3...) */
  revisionPagesAmount?: number;
  revisionDisplayLabel?: string;
  revisionPageStart?: number;
  revisionPageEnd?: number;

  /** Historical locking flag */
  isHistorical: boolean;
  isLocked: boolean;

  status: DailyItemStatus;

  /** Actual recorded progress (if historical/recorded) */
  actualAchieved?: {
    unit: PlanningUnit;
    completedAt: string;
    recordedBy: string;
    evaluation?: 'excellent' | 'very_good' | 'good' | 'needs_practice';
    notes?: string;
  };
}

export interface WeeklyPlanSummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  plannedStart: QuranPosition;
  plannedEnd: QuranPosition;
  displayLabel: string;
  totalAyahs: number;
  totalUnits: number;
  days: DailyPlanItem[];
  isCompleted: boolean;
  completedDaysCount: number;
}

export interface MonthlyPlanSummary {
  monthNumber: number;
  monthName: string;
  startDate: string;
  endDate: string;
  plannedStart: QuranPosition;
  plannedEnd: QuranPosition;
  displayLabel: string;
  totalAyahs: number;
  totalUnits: number;
  weeks: WeeklyPlanSummary[];
}

export interface TermPlanSummary {
  termName: string;
  startDate: string;
  endDate: string;
  startPosition: QuranPosition;
  endPosition: QuranPosition;
  displayLabel: string;
  totalAyahs: number;
  totalUnits: number;
  totalWorkingDays: number;
  direction: PlanDirection;
}

/**
 * Diagnostic record when student's pace falls behind
 * Generated instead of silently shrinking or moving the target!
 */
export interface TargetAtRiskDiagnostic {
  isAtRisk: boolean;
  originalTarget: OriginalTargetSnapshot;
  currentPosition: QuranPosition;
  completedUnits: number;
  remainingUnits: number;
  remainingWorkingDays: number;
  requiredDailyAmount: number;
  currentDailyAmount: number;
  deficitUnits: number;
  projectedDeficitDays: number;
  warningMessage: string;
  actionableRecommendations: string[];
  daysDelayed?: number;
  recommendedAdjustment?: { message?: string };
}

/**
 * Audit log of teacher overrides
 */
export interface TeacherOverride {
  id: string;
  timestamp: string;
  teacherId: string;
  teacherName?: string;
  reason:
    | 'absence'
    | 'sickness'
    | 'special_event'
    | 'needs_consolidation'
    | 'student_accelerated'
    | 'amount_increase'
    | 'amount_decrease'
    | 'schedule_change'
    | 'custom';
  reasonArabicText?: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  effectiveFromDate: string; // YYYY-MM-DD
}

/**
 * Plan version history entry
 */
export interface PlanVersionRecord {
  version: number;
  createdAt: string;
  createdBy: string;
  reason: string;
  dailyAmount: number;
  workingDays: number[];
  remainingUnitsAtVersion: number;
}

/**
 * Recalculation history log
 */
export interface RecalculationEvent {
  id: string;
  timestamp: string;
  trigger:
    | 'achievement_surplus'
    | 'achievement_deficit'
    | 'teacher_override'
    | 'absence'
    | 'schedule_change';
  effectiveFromDate: string;
  recordedAchievement?: {
    date: string;
    plannedAyahs: number;
    achievedAyahs: number;
  };
  previousRemainingUnits: number;
  newRemainingUnits: number;
  targetAtRisk: boolean;
  notes: string;
}

/**
 * Unified Generated Plan Output
 * Connects Term, Monthly, Weekly, and Daily levels to a single source of truth.
 */
export interface UnifiedPlanOutput {
  termPlan: TermPlanSummary;
  monthlyPlans: MonthlyPlanSummary[];
  weeklyPlans: WeeklyPlanSummary[];
  dailyPlans: DailyPlanItem[];
  metrics?: any;
}

/**
 * Core Universal Student Plan Model
 */
export interface StudentQuranPlan {
  id: string;
  studentId: string;
  title?: string;
  scope?: PlanScope;
  isCurrentActive?: boolean;
  stageConfigId?: string;
  stageId?: string;
  academicYearId?: string;
  termName?: string;
  halaqahId?: string;
  teacherId?: string;
  tenantId?: string;
  planType: 'memorization' | 'revision' | 'combined';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // Target coordinates
  targetStart: QuranPosition;
  targetEnd: QuranPosition;
  direction: PlanDirection;
  unitType: PlanningUnitType;
  dailyAmount: number;
  revisionDailyPages?: number;
  consolidationDaysPerSurah?: number;

  /**
   * Automatic Minor Revision Mode — when true, the planning engine seeds the rolling
   * revision cycle with the student's prior memorization (before plan start) and the
   * revision range is auto-computed per day. Undefined on legacy plans = manual behavior.
   */
  autoMinorRevisionMode?: boolean;

  // Schedule
  schedule: WorkingDaysSchedule;

  // Immutable Original Target Snapshot
  originalTarget: OriginalTargetSnapshot;

  // Last actual position achieved
  currentPosition: QuranPosition;

  // Active generated dynamic plan (Daily, Weekly, Monthly, Term)
  generatedPlan: UnifiedPlanOutput;

  // Active version and history
  planVersion: number;
  version?: number; // Alias
  versionHistory: PlanVersionRecord[];

  // Execution status
  status: PlanStatus;
  targetAtRiskDiagnostic?: TargetAtRiskDiagnostic;
  diagnostic?: TargetAtRiskDiagnostic; // Alias

  // Teacher Overrides & Audit Log
  teacherOverrides: TeacherOverride[];

  // Recalculation Audit Trail
  recalculationHistory: RecalculationEvent[];
  revisions?: any[]; // Alias

  // Specific for Revision (e.g. revision by surahs)
  revisionSettings?: {
    mode: 'pages' | 'surahs' | 'quarters' | 'hizb' | 'juz' | 'custom';
    surahList?: number[]; // Specific surah numbers when revising by surah
    surahsPerDay?: number;
  };

  updatedAt: string;
  createdAt: string;
}
