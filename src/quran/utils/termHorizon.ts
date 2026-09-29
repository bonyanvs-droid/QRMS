import { AcademicYearConfig } from '../../types';
import { addDaysToDate, getDayOfWeekFromDate } from './dateUtils';

/**
 * Academic term horizon utilities — used ONLY for measuring at_risk headroom.
 * Plan generation itself stays single-term; this widens the measurement
 * window so "remaining working days" spans the rest of the current term plus
 * every later term, matching how grade targets are distributed across terms.
 */

export interface TermHorizonWindow {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  holidayDates: string[]; // flattened ISO dates
}

/**
 * Flattens holiday entries into ISO date strings. Accepts both plain date
 * strings and {startDate,endDate} ranges (the API shape for officialHolidays).
 */
export function expandHolidayDates(holidays: any[] | undefined | null): string[] {
  const out: string[] = [];
  for (const h of holidays || []) {
    if (!h) continue;
    if (typeof h === 'string') {
      out.push(h);
      continue;
    }
    const s = h.startDate;
    const e = h.endDate;
    if (typeof s === 'string' && typeof e === 'string' && s <= e) {
      for (let d = s; d <= e; d = addDaysToDate(d, 1)) out.push(d);
    }
  }
  return [...new Set(out)];
}

/**
 * Builds the union of term windows from the academic-year configuration.
 * Falls back to the top-level startDate/endDate when no terms are defined.
 */
export function buildTermHorizonWindows(
  academicConfig?: AcademicYearConfig | null
): TermHorizonWindow[] {
  const terms = academicConfig?.terms;
  const source: any[] =
    Array.isArray(terms) && terms.length > 0
      ? terms
      : academicConfig?.startDate && academicConfig?.endDate
        ? [academicConfig]
        : [];
  return source
    .filter(
      (t) => t && !t.isArchived && t.startDate && t.endDate && t.startDate <= t.endDate
    )
    .map((t) => ({
      startDate: t.startDate,
      endDate: t.endDate,
      holidayDates: [
        ...new Set([
          ...expandHolidayDates(t.officialHolidays),
          ...expandHolidayDates(t.holidays),
        ]),
      ],
    }));
}

/**
 * Counts working days strictly AFTER `fromDateExclusive` inside the union of
 * term windows. Dates between terms (breaks) and outside any term never
 * count; overlapping term windows are de-duplicated.
 */
export function countWorkingDaysInHorizon(
  fromDateExclusive: string,
  windows: TermHorizonWindow[],
  workingWeekDays: number[],
  extraHolidayDates: string[] = []
): number {
  if (!fromDateExclusive || windows.length === 0 || workingWeekDays.length === 0) return 0;
  const holidaySet = new Set(extraHolidayDates);
  for (const w of windows) for (const d of w.holidayDates) holidaySet.add(d);
  const firstCandidate = addDaysToDate(fromDateExclusive, 1);
  const seen = new Set<string>();
  let count = 0;
  for (const w of windows) {
    let d = w.startDate > firstCandidate ? w.startDate : firstCandidate;
    for (; d <= w.endDate; d = addDaysToDate(d, 1)) {
      if (seen.has(d)) continue;
      seen.add(d);
      if (holidaySet.has(d)) continue;
      if (workingWeekDays.includes(getDayOfWeekFromDate(d))) count++;
    }
  }
  return count;
}
