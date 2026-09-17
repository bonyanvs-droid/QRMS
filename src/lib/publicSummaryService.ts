import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { Student, DailySessionRecord, SpellingLesson, AcademicYearConfig } from '../types';
import { calculateAggregateMetrics } from '../utils/statusCalculator';
import { isCurrentSessionDemo } from './demoGuard';

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

const PUBLIC_SUMMARY_DOC = 'current';

/**
 * Subscribes to the public aggregated metrics document.
 * Safe for unauthenticated visitors - does not touch individual student PII or parent phones.
 */
export function subscribeToPublicSummary(
  callback: (summary: PublicSummaryData) => void
): Unsubscribe {
  if (isCurrentSessionDemo()) {
    return () => {};
  }
  const ref = doc(db, 'public_summary', PUBLIC_SUMMARY_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as PublicSummaryData);
      }
    },
    (err) => {
      console.warn('Public summary subscription notice:', err.message);
    }
  );
}

/**
 * Recalculates and updates the public summary aggregate document.
 * Called when an admin or teacher updates students or session records.
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
    const ref = doc(db, 'public_summary', PUBLIC_SUMMARY_DOC);
    await setDoc(ref, summaryData, { merge: true });
  } catch (error: any) {
    console.warn('Notice updating public summary in Firestore:', error);
  }
}
