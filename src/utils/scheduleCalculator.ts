import {
  DailyPrayerTimes,
  Halaqah,
  HalaqahDaySchedule,
  PrayerReference,
  PrayerTimeOffset,
  ScheduleTimeType,
} from '../types';
import {
  addMinutesToTime,
  cleanTimeStr,
  diffMinutes,
  formatTime12Hour,
  getTodayDateStr,
  PRAYER_NAMES_AR,
} from './prayerTimesService';

export const STANDARD_WEEK_DAYS: { dayOfWeek: number; dayName: string; defaultActive: boolean }[] = [
  { dayOfWeek: 0, dayName: 'الأحد', defaultActive: true },
  { dayOfWeek: 1, dayName: 'الاثنين', defaultActive: true },
  { dayOfWeek: 2, dayName: 'الثلاثاء', defaultActive: true },
  { dayOfWeek: 3, dayName: 'الأربعاء', defaultActive: true },
  { dayOfWeek: 4, dayName: 'الخميس', defaultActive: true },
  { dayOfWeek: 5, dayName: 'الجمعة', defaultActive: false },
  { dayOfWeek: 6, dayName: 'السبت', defaultActive: false },
];

export interface CalculatedHalaqahDay {
  isSessionDay: boolean;
  dayOfWeek: number;
  dayName: string;
  timeType: ScheduleTimeType;
  startTime: string; // 24-hour "HH:mm"
  endTime: string;   // 24-hour "HH:mm"
  startTimeFormatted: string; // e.g. "06:25 م"
  endTimeFormatted: string;   // e.g. "07:30 م"
  timeDescription: string;    // e.g. "بعد صلاة المغرب بـ 10د إلى قبل صلاة العشاء بـ 15د"
  status: 'not_today' | 'upcoming' | 'open_window' | 'completed';
  statusLabel: string;
  minutesUntilStart?: number;
  attendanceWindowOpen: boolean; // true if within 15 mins before start up to end time
}

/**
 * Format a prayer offset into friendly Arabic text
 * e.g. { prayer: 'maghrib', offsetMinutes: 10 } -> "بعد صلاة المغرب بـ 10 د"
 * e.g. { prayer: 'isha', offsetMinutes: -15 } -> "قبل صلاة العشاء بـ 15 د"
 * e.g. { prayer: 'maghrib', offsetMinutes: 0 } -> "مع أذان المغرب"
 */
export function formatPrayerOffset(offset?: PrayerTimeOffset | null): string {
  if (!offset || !offset.prayer) return '';
  const pName = PRAYER_NAMES_AR[offset.prayer] || offset.prayer;
  const mins = offset.offsetMinutes || 0;

  if (mins === 0) {
    return `صلاة ${pName} (على الموعد تماماً)`;
  } else if (mins > 0) {
    return `بعد ${pName} بـ ${mins}د`;
  } else {
    return `قبل ${pName} بـ ${Math.abs(mins)}د`;
  }
}

/**
 * Calculate the exact "HH:mm" time for a prayer offset based on daily prayer times
 */
export function calculatePrayerLinkedTime(
  offset: PrayerTimeOffset,
  prayerTimes: DailyPrayerTimes
): string {
  const basePrayerTime = (prayerTimes[offset.prayer] as string) || '18:00';
  return addMinutesToTime(basePrayerTime, offset.offsetMinutes || 0);
}

/**
 * Ensure a halaqah has a complete 7-day weeklySchedule initialized.
 * Does NOT fall back to attendanceConfig, ensuring halaqah's weeklySchedule is the single source of truth.
 */
export function normalizeWeeklySchedule(halaqah: Partial<Halaqah>): HalaqahDaySchedule[] {
  const existing = halaqah.weeklySchedule || [];
  const defaultType = halaqah.defaultTimeType || 'fixed';
  const defaultStart = halaqah.defaultStartTime || '16:00';
  const defaultEnd = halaqah.defaultEndTime || '18:00';
  const defaultStartPrayer = halaqah.defaultStartPrayerOffset || { prayer: 'maghrib', offsetMinutes: 0 };
  const defaultEndPrayer = halaqah.defaultEndPrayerOffset || { prayer: 'isha', offsetMinutes: 0 };

  return STANDARD_WEEK_DAYS.map((std) => {
    const found = existing.find((d) => d.dayOfWeek === std.dayOfWeek);
    if (found) {
      return {
        ...found,
        dayName: std.dayName,
        timeType: found.timeType || defaultType,
        startTime: found.startTime || defaultStart,
        endTime: found.endTime || defaultEnd,
        startPrayerOffset: found.startPrayerOffset || defaultStartPrayer,
        endPrayerOffset: found.endPrayerOffset || defaultEndPrayer,
      };
    }
    return {
      dayOfWeek: std.dayOfWeek,
      dayName: std.dayName,
      isActive: std.defaultActive,
      timeType: defaultType,
      startTime: defaultStart,
      endTime: defaultEnd,
      startPrayerOffset: defaultStartPrayer,
      endPrayerOffset: defaultEndPrayer,
      isCustomTime: false,
    };
  });
}

/**
 * Resolves the actual time for a specific day schedule given today's prayer times
 */
export function resolveDayScheduleTimes(
  daySchedule: HalaqahDaySchedule,
  prayerTimes?: DailyPrayerTimes | null
): { startTime: string; endTime: string; description: string } {
  const timeType = daySchedule.timeType || 'fixed';

  if (timeType === 'prayer' && prayerTimes) {
    const startOffset = daySchedule.startPrayerOffset || { prayer: 'maghrib', offsetMinutes: 0 };
    const endOffset = daySchedule.endPrayerOffset || { prayer: 'isha', offsetMinutes: 0 };

    const baseStartPrayerTime = (prayerTimes[startOffset.prayer] as string) || '18:15';
    const baseEndPrayerTime = (prayerTimes[endOffset.prayer] as string) || '19:45';

    const actualStart = addMinutesToTime(baseStartPrayerTime, startOffset.offsetMinutes || 0);
    const actualEnd = addMinutesToTime(baseEndPrayerTime, endOffset.offsetMinutes || 0);

    const startText = formatPrayerOffset(startOffset);
    const endText = formatPrayerOffset(endOffset);
    const description = `${startText} حتى ${endText}`;

    return {
      startTime: actualStart,
      endTime: actualEnd,
      description,
    };
  }

  // Fixed Time
  const startTime = cleanTimeStr(daySchedule.startTime || '16:00');
  const endTime = cleanTimeStr(daySchedule.endTime || '18:00');
  const description = `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;

  return { startTime, endTime, description };
}

/**
 * Calculate the full session state for today (or a specified date) for a given Halaqah
 */
export function calculateHalaqahTodaySession(
  halaqah: Partial<Halaqah>,
  prayerTimesToday?: DailyPrayerTimes | null,
  referenceDate: Date = new Date()
): CalculatedHalaqahDay {
  const dayOfWeek = referenceDate.getDay();
  const schedule = normalizeWeeklySchedule(halaqah);
  const todaySchedule = schedule.find((d) => d.dayOfWeek === dayOfWeek);

  const dayName = STANDARD_WEEK_DAYS.find((d) => d.dayOfWeek === dayOfWeek)?.dayName || 'اليوم';

  if (!todaySchedule || !todaySchedule.isActive) {
    return {
      isSessionDay: false,
      dayOfWeek,
      dayName,
      timeType: todaySchedule?.timeType || 'fixed',
      startTime: '00:00',
      endTime: '00:00',
      startTimeFormatted: '--:--',
      endTimeFormatted: '--:--',
      timeDescription: 'لا توجد جلسة مجدولة لهذا اليوم',
      status: 'not_today',
      statusLabel: 'غير مجدولة اليوم',
      attendanceWindowOpen: false,
    };
  }

  const { startTime, endTime, description } = resolveDayScheduleTimes(todaySchedule, prayerTimesToday);

  // Compare with current clock time
  const currentHour = referenceDate.getHours();
  const currentMin = referenceDate.getMinutes();
  const currentClockStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

  const minutesUntilStart = diffMinutes(currentClockStr, startTime);
  const minutesPastEnd = diffMinutes(endTime, currentClockStr);

  // Attendance window opens 15 minutes before session starts until session ends
  let status: 'not_today' | 'upcoming' | 'open_window' | 'completed' = 'upcoming';
  let statusLabel = '';
  let attendanceWindowOpen = false;

  if (minutesUntilStart > 15) {
    status = 'upcoming';
    statusLabel = `تبدأ بعد ${minutesUntilStart} دقيقة`;
    attendanceWindowOpen = false;
  } else if (minutesUntilStart <= 15 && minutesPastEnd <= 0) {
    status = 'open_window';
    statusLabel = 'منعقدة الآن (نافذة الرصد متاحة)';
    attendanceWindowOpen = true;
  } else {
    status = 'completed';
    statusLabel = 'انتهت جلسة اليوم';
    attendanceWindowOpen = false;
  }

  return {
    isSessionDay: true,
    dayOfWeek,
    dayName,
    timeType: todaySchedule.timeType || 'fixed',
    startTime,
    endTime,
    startTimeFormatted: formatTime12Hour(startTime),
    endTimeFormatted: formatTime12Hour(endTime),
    timeDescription: description,
    status,
    statusLabel,
    minutesUntilStart,
    attendanceWindowOpen,
  };
}

/**
 * Format prayer offset into clean descriptive Arabic (e.g. "بعد المغرب بـ 10 دقائق", "قبل العشاء بـ 15 دقيقة", "مع أذان المغرب")
 */
export function formatPrayerOffsetDescription(offset?: PrayerTimeOffset | null): string {
  if (!offset || !offset.prayer) return '';
  const pName = PRAYER_NAMES_AR[offset.prayer] || offset.prayer;
  const mins = offset.offsetMinutes || 0;

  if (mins === 0) {
    return `صلاة ${pName} (على الموعد)`;
  } else if (mins > 0) {
    return `بعد ${pName} بـ ${mins} دقائق`;
  } else {
    return `قبل ${pName} بـ ${Math.abs(mins)} دقيقة`;
  }
}

/**
 * Format a halaqah's schedule into structured days and timing components
 */
export function formatHalaqahStructuredSummary(
  halaqah: Partial<Halaqah>,
  prayerTimesToday?: DailyPrayerTimes | null
): {
  days: string;
  time: string;
  count: number;
  daysLabel: string;
  timeLabel: string;
  daysText: string;
  timeRangeText: string;
  timeTypeText: string;
  isAdaptiveMatrix: boolean;
  actualTodayLabel?: string;
  fullLabel: string;
  timeType: ScheduleTimeType;
} {
  const schedule = normalizeWeeklySchedule(halaqah);
  const activeDays = schedule.filter((d) => d.isActive);

  if (activeDays.length === 0) {
    return {
      days: 'لا توجد أيام نشطة',
      time: 'غير محدد',
      count: 0,
      daysLabel: 'لا توجد أيام نشطة',
      timeLabel: 'غير محدد',
      daysText: 'لا توجد أيام نشطة',
      timeRangeText: 'غير محدد',
      timeTypeText: 'ثابت',
      isAdaptiveMatrix: false,
      fullLabel: 'لا توجد أيام عمل نشطة',
      timeType: halaqah.defaultTimeType || 'fixed',
    };
  }

  const getDaysLabel = (days: HalaqahDaySchedule[]) => {
    if (days.length === 5 && days[0].dayOfWeek === 0 && days[4].dayOfWeek === 4) {
      return 'الأحد–الخميس';
    }
    if (days.length === 4 && days[0].dayOfWeek === 0 && days[3].dayOfWeek === 3) {
      return 'الأحد–الأربعاء';
    }
    if (days.length === 2 && days.some(d => d.dayOfWeek === 2) && days.some(d => d.dayOfWeek === 4)) {
      return 'الثلاثاء والخميس';
    }
    return days.map((d) => d.dayName).join('، ');
  };

  const daysLabel = getDaysLabel(activeDays);
  const first = activeDays[0];
  const timeType = first.timeType || halaqah.defaultTimeType || 'fixed';

  // Check if days have custom variations
  const isAdaptiveMatrix = activeDays.some((d) => d.isCustomTime);

  let timeLabel = '';
  if (timeType === 'prayer') {
    const startText = formatPrayerOffsetDescription(first.startPrayerOffset || { prayer: 'maghrib', offsetMinutes: 0 });
    const endText = formatPrayerOffsetDescription(first.endPrayerOffset || { prayer: 'isha', offsetMinutes: 0 });
    timeLabel = `${startText} → ${endText}`;
  } else {
    const s = cleanTimeStr(first.startTime || '16:00');
    const e = cleanTimeStr(first.endTime || '18:00');
    timeLabel = `${formatTime12Hour(s)} – ${formatTime12Hour(e)}`;
  }

  let actualTodayLabel: string | undefined = undefined;
  if (prayerTimesToday) {
    const todaySession = calculateHalaqahTodaySession(halaqah, prayerTimesToday);
    if (todaySession.isSessionDay) {
      actualTodayLabel = `الموعد الفعلي اليوم: ${todaySession.startTimeFormatted} → ${todaySession.endTimeFormatted}`;
    }
  }

  const timeTypeText = timeType === 'prayer' ? 'مرتبط بالصلاة' : 'توقيت ثابت';

  return {
    days: daysLabel,
    time: timeLabel,
    count: activeDays.length,
    daysLabel,
    timeLabel,
    daysText: daysLabel,
    timeRangeText: timeLabel,
    timeTypeText,
    isAdaptiveMatrix,
    actualTodayLabel,
    fullLabel: `${daysLabel} • ${timeLabel}`,
    timeType,
  };
}

/**
 * Format the entire weekly schedule of a halaqah into a concise, professional summary
 */
export function formatHalaqahWeeklySummary(
  halaqah: Partial<Halaqah>,
  prayerTimesToday?: DailyPrayerTimes | null
): string {
  const schedule = normalizeWeeklySchedule(halaqah);
  const activeDays = schedule.filter((d) => d.isActive);

  if (activeDays.length === 0) {
    return 'لا توجد أيام عمل نشطة';
  }

  // Check if all active days share the same timing configuration
  const first = activeDays[0];
  const allSame = activeDays.every((d) => {
    if (d.timeType !== first.timeType) return false;
    if (d.timeType === 'prayer') {
      return (
        d.startPrayerOffset?.prayer === first.startPrayerOffset?.prayer &&
        d.startPrayerOffset?.offsetMinutes === first.startPrayerOffset?.offsetMinutes &&
        d.endPrayerOffset?.prayer === first.endPrayerOffset?.prayer &&
        d.endPrayerOffset?.offsetMinutes === first.endPrayerOffset?.offsetMinutes
      );
    }
    return d.startTime === first.startTime && d.endTime === first.endTime;
  });

  const getDaysLabel = (days: HalaqahDaySchedule[]) => {
    if (days.length === 5 && days[0].dayOfWeek === 0 && days[4].dayOfWeek === 4) {
      return 'الأحد - الخميس';
    }
    if (days.length === 4 && days[0].dayOfWeek === 0 && days[3].dayOfWeek === 3) {
      return 'الأحد - الأربعاء';
    }
    return days.map((d) => d.dayName).join('، ');
  };

  if (allSame) {
    const daysLabel = getDaysLabel(activeDays);
    const { description } = resolveDayScheduleTimes(first, prayerTimesToday);
    return `${daysLabel} (${description})`;
  }

  // If different, group by shared timing
  const groups: { key: string; days: HalaqahDaySchedule[]; desc: string }[] = [];
  activeDays.forEach((d) => {
    const { description } = resolveDayScheduleTimes(d, prayerTimesToday);
    const key = `${d.timeType}_${description}`;
    const existingGroup = groups.find((g) => g.key === key);
    if (existingGroup) {
      existingGroup.days.push(d);
    } else {
      groups.push({ key, days: [d], desc: description });
    }
  });

  return groups.map((g) => `${getDaysLabel(g.days)} (${g.desc})`).join(' | ');
}

/**
 * Get active day-of-week indices (0-6) for a halaqah
 */
export function getHalaqahActiveDays(halaqah: Partial<Halaqah>): number[] {
  const schedule = normalizeWeeklySchedule(halaqah);
  return schedule.filter((d) => d.isActive).map((d) => d.dayOfWeek);
}
