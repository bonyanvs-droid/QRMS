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
  const safeConfig: AcademicYearConfig = {
    name: config?.name || 'العام الدراسي 1448 هـ',
    semester: config?.semester || 'الفصل الدراسي الأول',
    startDate: typeof config?.startDate === 'string' && config.startDate.trim() !== '' && config.startDate !== '{}' ? config.startDate : '2026-08-15',
    endDate: typeof config?.endDate === 'string' && config.endDate.trim() !== '' && config.endDate !== '{}' ? config.endDate : '2026-11-15',
    totalWeeks: Number(config?.totalWeeks) || 12,
    operationalStartWeek: Number(config?.operationalStartWeek) || 3,
    operationalEndWeek: Number(config?.operationalEndWeek) || 14,
    currentWeek: Number(config?.currentWeek) || 5,
    manualWeekOverride: !!config?.manualWeekOverride,
    daysPerWeek: Number(config?.daysPerWeek) || 4,
    spellingPassingThreshold: Number(config?.spellingPassingThreshold) || 85,
    gradeTargets: config?.gradeTargets || {},
    id: config?.id || 'ay_1447_t2',
  };

  // If manual override is active via argument or config flag, respect it strictly
  const manualWeek = forceManualWeek ?? (safeConfig.manualWeekOverride ? safeConfig.currentWeek : null);
  if (manualWeek !== undefined && manualWeek !== null && !isNaN(manualWeek) && manualWeek > 0) {
    const totalWeeks = 15;
    const elapsed = Math.min(totalWeeks, Math.max(1, manualWeek));
    const remaining = Math.max(0, totalWeeks - elapsed);
    const progress = Math.min(100, Math.round((elapsed / totalWeeks) * 100));
    const isOperational = elapsed >= safeConfig.operationalStartWeek && elapsed <= safeConfig.operationalEndWeek;
    
    let phase = 'الأسابيع التمهيدية والتسجيل';
    if (isOperational) {
      phase = `الخطة التشغيلية (الأسبوع ${elapsed - safeConfig.operationalStartWeek + 1} من ${safeConfig.totalWeeks})`;
    } else if (elapsed > safeConfig.operationalEndWeek) {
      phase = 'مرحلة الاختبارات والختام';
    }

    return {
      currentWeek: elapsed,
      isAutoCalculated: false,
      elapsedWeeks: elapsed,
      totalWeeks,
      operationalWeeksTotal: safeConfig.totalWeeks,
      operationalElapsedWeeks: Math.max(0, Math.min(safeConfig.totalWeeks, elapsed - safeConfig.operationalStartWeek + 1)),
      remainingWeeks: remaining,
      timeProgressPercentage: progress,
      isOperationalNow: isOperational,
      phaseLabel: phase,
    };
  }

  // Automatic calculation from calendar date with robust validation
  let start = new Date(safeConfig.startDate);
  if (isNaN(start.getTime())) {
    start = new Date('2026-08-15');
  }

  let now = new Date(currentDate);
  if (isNaN(now.getTime())) {
    now = new Date();
  }

  // If before start date
  if (now < start) {
    return {
      currentWeek: 1,
      isAutoCalculated: true,
      elapsedWeeks: 0,
      totalWeeks: 15,
      operationalWeeksTotal: safeConfig.totalWeeks,
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
  const clampedWeek = Math.min(15, Math.max(1, isNaN(rawWeek) ? safeConfig.currentWeek : rawWeek));

  const totalWeeks = 15;
  const remainingWeeks = Math.max(0, totalWeeks - clampedWeek);
  const timeProgress = Math.min(100, Math.round((clampedWeek / totalWeeks) * 100));
  const isOperational = clampedWeek >= safeConfig.operationalStartWeek && clampedWeek <= safeConfig.operationalEndWeek;

  let phaseLabel = 'مرحلة التمهيد وتوزيع الحلقات';
  if (isOperational) {
    const operationalWeekNum = clampedWeek - safeConfig.operationalStartWeek + 1;
    phaseLabel = `الخطة التشغيلية الأساسية (أسبوع ${operationalWeekNum} من ${safeConfig.totalWeeks})`;
  } else if (clampedWeek > safeConfig.operationalEndWeek) {
    phaseLabel = 'فترة الاختبارات والاستعداد المدرسي';
  }

  return {
    currentWeek: clampedWeek,
    isAutoCalculated: true,
    elapsedWeeks: clampedWeek,
    totalWeeks,
    operationalWeeksTotal: safeConfig.totalWeeks,
    operationalElapsedWeeks: Math.max(0, Math.min(safeConfig.totalWeeks, clampedWeek - safeConfig.operationalStartWeek + 1)),
    remainingWeeks,
    timeProgressPercentage: timeProgress,
    isOperationalNow: isOperational,
    phaseLabel,
  };
}
