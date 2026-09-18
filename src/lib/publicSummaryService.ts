import { Student, DailySessionRecord, SpellingLesson, AcademicYearConfig } from '../types';
import { calculateAggregateMetrics } from '../utils/statusCalculator';
import { isCurrentSessionDemo } from './demoGuard';
import { apiClient } from './api/apiClient';

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

/**
 * Subscribes to the public aggregated metrics.
 */
export function subscribeToPublicSummary(
  callback: (summary: PublicSummaryData) => void
): () => void {
  if (isCurrentSessionDemo()) {
    return () => {};
  }
  return apiClient.subscribe<PublicSummaryData>('public_summary', callback);
}

/**
 * Recalculates and updates the public summary aggregate in PostgreSQL.
 */
export async function updatePublicSummary(
  students: Student[],
  records: DailySessionRecord[],
  lessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
): Promise<void> {
  if (isCurrentSessionDemo()) {
    return;
  }
  try {
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
    await apiClient.post('/public_summary', summaryData);
  } catch (error: any) {
    console.warn('Notice updating public summary in PostgreSQL:', error?.message || error);
  }
}
