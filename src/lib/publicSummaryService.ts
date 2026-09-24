import { Student, DailySessionRecord, SpellingLesson, AcademicYearConfig } from '../types';
import { calculateAggregateMetrics } from '../utils/statusCalculator';

export interface PublicSummaryData {
  totalStudents: number;
  gradeCounts: {
    tamheedi: number;
    grade1: number;
    grade2: number;
  };
  spellingAvgMastery: number;
  spellingOnTrackPct: number;
  spellingAdvancedPct: number;
  spellingLaggingPct: number;
  spellingAvgLesson: number;
  quranAvgProgress: number;
  quranMinTargetAchievedPct: number;
  quranAdvancedPct: number;
  quranNeedsSupportPct: number;
  overallAttendancePct: number;
  statusCounts: {
    advanced: number;
    on_track: number;
    needs_support: number;
    lagging: number;
    not_moved_yet: number;
  };
  updatedAt: string;
}

let activePublicSummary: PublicSummaryData | null = null;
const summaryListeners = new Set<(summary: PublicSummaryData) => void>();

/**
 * Subscribes to the public aggregated metrics derived from live operational data.
 */
export function subscribeToPublicSummary(
  callback: (summary: PublicSummaryData) => void
): () => void {
  summaryListeners.add(callback);
  if (activePublicSummary) {
    callback(activePublicSummary);
  }
  return () => {
    summaryListeners.delete(callback);
  };
}

/**
 * Recalculates the public summary metrics from live operational records.
 */
export function computePublicSummary(
  students: Student[],
  records: DailySessionRecord[],
  lessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
): PublicSummaryData {
  const metrics = calculateAggregateMetrics(students, records, lessons, academicConfig);
  const gradeCounts = {
    tamheedi: students.filter((s) => s.grade === 'تمهيدي').length,
    grade1: students.filter((s) => s.grade === 'صف أول').length,
    grade2: students.filter((s) => s.grade === 'صف ثاني').length,
  };
  const summaryData: PublicSummaryData = {
    ...metrics,
    gradeCounts,
    updatedAt: new Date().toISOString(),
  };
  activePublicSummary = summaryData;
  for (const listener of summaryListeners) {
    listener(summaryData);
  }
  return summaryData;
}

/**
 * Recalculates and updates the public summary aggregate.
 */
export async function updatePublicSummary(
  students: Student[],
  records: DailySessionRecord[],
  lessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
): Promise<void> {
  computePublicSummary(students, records, lessons, academicConfig);
}

