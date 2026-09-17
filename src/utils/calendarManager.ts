import { AcademicYearConfig } from '../types';

export interface CalendarWeekDetail {
  weekNumber: number;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isOperational: boolean;
  isIntroductory: boolean;
  isExamsPrep: boolean;
  holidayNote?: string;
}

export interface AcademicTimelineProgress {
  currentWeek: number;
  isAutoCalculated: boolean;
  elapsedWeeks: number;
  totalWeeks: number; // e.g. 15 total weeks
  operationalWeeksTotal: number; // 12 weeks (weeks 3 - 14)
  operationalElapsedWeeks: number;
  remainingWeeks: number;
  timeProgressPercentage: number;
  isOperationalNow: boolean;
  phaseLabel: string;
}

/**
 * Calculates current academic week dynamically based on calendar dates.
 * Considers start date, elapsed 7-day windows, and semester boundaries.
 */
export function calculateAcademicWeek(
  config: AcademicYearConfig,
  currentDate: Date = new Date(),
  forceManualWeek?: number | null
): AcademicTimelineProgress {
  // If manual override is active via argument or config flag, respect it strictly
  const manualWeek = forceManualWeek ?? (config.manualWeekOverride ? config.currentWeek : null);
  if (manualWeek !== undefined && manualWeek !== null && manualWeek > 0) {
    const totalWeeks = 15;
    const elapsed = Math.min(totalWeeks, Math.max(1, manualWeek));
    const remaining = Math.max(0, totalWeeks - elapsed);
    const progress = Math.min(100, Math.round((elapsed / totalWeeks) * 100));
    const isOperational = elapsed >= config.operationalStartWeek && elapsed <= config.operationalEndWeek;
    
    let phase = 'الأسابيع التمهيدية والتسجيل';
    if (isOperational) {
      phase = `الخطة التشغيلية (الأسبوع ${elapsed - config.operationalStartWeek + 1} من ${config.totalWeeks})`;
    } else if (elapsed > config.operationalEndWeek) {
      phase = 'مرحلة الاختبارات والختام';
    }

    return {
      currentWeek: elapsed,
      isAutoCalculated: false,
      elapsedWeeks: elapsed,
      totalWeeks,
      operationalWeeksTotal: config.totalWeeks || 12,
      operationalElapsedWeeks: Math.max(0, Math.min(config.totalWeeks, elapsed - config.operationalStartWeek + 1)),
      remainingWeeks: remaining,
      timeProgressPercentage: progress,
      isOperationalNow: isOperational,
      phaseLabel: phase,
    };
  }

  // Automatic calculation from calendar date
  const start = new Date(config.startDate);
  const now = new Date(currentDate);

  // If before start date
  if (now < start) {
    return {
      currentWeek: 1,
      isAutoCalculated: true,
      elapsedWeeks: 0,
      totalWeeks: 15,
      operationalWeeksTotal: config.totalWeeks || 12,
      operationalElapsedWeeks: 0,
      remainingWeeks: 15,
      timeProgressPercentage: 0,
      isOperationalNow: false,
      phaseLabel: 'قبل بدء العام الدراسي (استعداد وتسجيل)',
    };
  }

  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  // 7 days per academic week
  const rawWeek = Math.floor(diffDays / 7) + 1;
  const clampedWeek = Math.min(15, Math.max(1, rawWeek));

  const totalWeeks = 15;
  const remainingWeeks = Math.max(0, totalWeeks - clampedWeek);
  const timeProgress = Math.min(100, Math.round((clampedWeek / totalWeeks) * 100));
  const isOperational = clampedWeek >= config.operationalStartWeek && clampedWeek <= config.operationalEndWeek;

  let phaseLabel = 'مرحلة التمهيد وتوزيع الحلقات';
  if (isOperational) {
    const operationalWeekNum = clampedWeek - config.operationalStartWeek + 1;
    phaseLabel = `الخطة التشغيلية الأساسية (أسبوع ${operationalWeekNum} من ${config.totalWeeks})`;
  } else if (clampedWeek > config.operationalEndWeek) {
    phaseLabel = 'فترة الاختبارات والاستعداد المدرسي';
  }

  return {
    currentWeek: clampedWeek,
    isAutoCalculated: true,
    elapsedWeeks: clampedWeek,
    totalWeeks,
    operationalWeeksTotal: config.totalWeeks || 12,
    operationalElapsedWeeks: Math.max(0, Math.min(config.totalWeeks, clampedWeek - config.operationalStartWeek + 1)),
    remainingWeeks,
    timeProgressPercentage: timeProgress,
    isOperationalNow: isOperational,
    phaseLabel,
  };
}
