/**
 * Student-level working days resolution.
 *
 * Rule: the halaqah defines the days it can receive students; the student may
 * attend only a subset of those days. The Plan Engine must build plans on the
 * student's actual academic days — not the halaqah's full schedule.
 *
 * resolved = intersection(studentPreferredDays, halaqahWorkingDays)
 * Holidays are excluded later by the existing schedule pipeline.
 */
export interface StudentWorkingDaysResolution {
  /** Final day-of-week list used for plan generation (0=Sun ... 6=Sat) */
  days: number[];
  /** Preferred days that were dropped because the halaqah doesn't offer them */
  droppedDays: number[];
  /** True when no valid student preference exists and the halaqah schedule is used */
  usesHalaqahDefault: boolean;
}

export function resolveStudentWorkingDays(
  preferredDays: number[] | null | undefined,
  halaqahWorkingDays: number[]
): StudentWorkingDaysResolution {
  const safeHalaqahDays = Array.isArray(halaqahWorkingDays) ? halaqahWorkingDays : [];

  // No student-level preference → legacy behavior: follow halaqah schedule
  if (!preferredDays || preferredDays.length === 0) {
    return { days: [...safeHalaqahDays], droppedDays: [], usesHalaqahDefault: true };
  }

  const allowed = new Set(safeHalaqahDays);
  const uniquePreferred = Array.from(new Set(preferredDays)).filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6
  );
  const days = uniquePreferred.filter((d) => allowed.has(d)).sort((a, b) => a - b);
  const droppedDays = uniquePreferred.filter((d) => !allowed.has(d));

  if (days.length === 0) {
    // Every preferred day conflicts with the halaqah schedule — never produce a
    // zero-day plan; fall back to the halaqah schedule and surface the conflict.
    return { days: [...safeHalaqahDays], droppedDays, usesHalaqahDefault: true };
  }

  return { days, droppedDays, usesHalaqahDefault: false };
}

/**
 * Reads a student's preferred working days from their stored quran plan
 * preferences (students.quran_plan JSONB).
 */
export function getStudentPreferredWorkingDays(student: {
  quranPlan?: { preferredWorkingDays?: number[] } | null;
}): number[] | undefined {
  const days = student?.quranPlan?.preferredWorkingDays;
  return Array.isArray(days) && days.length > 0 ? days : undefined;
}
