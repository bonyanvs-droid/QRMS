import { WorkingDaysSchedule } from '../types/plan';

export const ARABIC_DAY_NAMES: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

/**
 * Parses YYYY-MM-DD into a UTC Date object to avoid timezone shifting bugs
 */
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds N days to a YYYY-MM-DD string
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateString(date);
}

/**
 * Returns the day of the week (0 = Sunday, 1 = Monday ... 6 = Saturday)
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  return parseDateString(dateStr).getUTCDay();
}

/**
 * Returns the Arabic name of the day
 */
export function getArabicDayName(dateStr: string): string {
  const day = getDayOfWeekFromDate(dateStr);
  return ARABIC_DAY_NAMES[day] || '';
}

/**
 * Checks if a specific date is a working day according to the schedule
 */
export function isDateWorkingDay(dateStr: string, schedule: WorkingDaysSchedule): boolean {
  const dayOfWeek = getDayOfWeekFromDate(dateStr);
  if (!schedule.workingDays.includes(dayOfWeek)) {
    return false;
  }
  if (schedule.holidays && schedule.holidays.includes(dateStr)) {
    return false;
  }
  return true;
}

/**
 * Generates all working dates between startDate and endDate (inclusive)
 */
export function generateWorkingDates(
  startDateStr: string,
  endDateStr: string,
  schedule: WorkingDaysSchedule
): string[] {
  const workingDates: string[] = [];
  let current = startDateStr;

  while (current <= endDateStr) {
    if (isDateWorkingDay(current, schedule)) {
      workingDates.push(current);
    }
    current = addDaysToDate(current, 1);
  }

  return workingDates;
}

/**
 * Finds the next working day strictly AFTER a given date
 */
export function getNextWorkingDay(
  currentDateStr: string,
  schedule: WorkingDaysSchedule,
  maxLookaheadDays = 30
): string {
  let date = addDaysToDate(currentDateStr, 1);
  for (let i = 0; i < maxLookaheadDays; i++) {
    if (isDateWorkingDay(date, schedule)) {
      return date;
    }
    date = addDaysToDate(date, 1);
  }
  return date;
}

/**
 * Computes week number (1-based) relative to term start date
 */
export function computeWeekNumber(dateStr: string, termStartDateStr: string): number {
  const start = parseDateString(termStartDateStr);
  const current = parseDateString(dateStr);
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

/**
 * Computes month number (1-based) relative to term start date
 */
export function computeMonthNumber(dateStr: string, termStartDateStr: string): number {
  const start = parseDateString(termStartDateStr);
  const current = parseDateString(dateStr);
  const yearDiff = current.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = current.getUTCMonth() - start.getUTCMonth() + yearDiff * 12;
  return Math.max(1, monthDiff + 1);
}
