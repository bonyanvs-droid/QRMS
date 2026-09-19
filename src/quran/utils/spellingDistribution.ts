import { DailyPlanItem } from '../types/plan';
import { SpellingLesson, DailySessionRecord } from '../../types';

/**
 * Distributes the EXISTING spelling lessons across plan working days.
 *
 * Rules:
 * - Only lessons with lessonNumber > `startAfterLessonNumber` are assigned
 *   (recalculation resumes after the last recorded/planned lesson).
 * - A lesson carrying `expectedWeek` lands on the first free working day of
 *   that plan week (overflow rolls forward to the next free day).
 * - Remaining lessons are spread evenly over the still-free days so the
 *   sequence covers the whole plan period without inventing new lessons.
 *
 * Mutates the given day objects (sets `spellingAssignment`). Purely additive —
 * never deletes or edits lesson definitions.
 */
export function assignSpellingLessonsToPlan(
  dailyPlans: DailyPlanItem[],
  lessons: SpellingLesson[] | undefined,
  startAfterLessonNumber = 0
): void {
  if (!dailyPlans.length || !lessons || lessons.length === 0) return;

  const queue = [...lessons]
    .filter((l) => l.isActive !== false && (l.lessonNumber ?? 0) > startAfterLessonNumber)
    .sort((a, b) => (a.order ?? a.lessonNumber) - (b.order ?? b.lessonNumber));
  if (queue.length === 0) return;

  const assignedLessonIds = new Set<string>();
  const busyDayIds = new Set<string>();

  const toAssignment = (l: SpellingLesson) => ({
    lessonId: l.id,
    lessonNumber: l.lessonNumber,
    title: l.title,
  });

  // Pass 1 — lessons pinned to an academic week (expectedWeek) land inside
  // the matching plan week.
  for (const lesson of queue) {
    if (lesson.expectedWeek === undefined || lesson.expectedWeek === null) continue;
    const weekDays = dailyPlans.filter((d) => d.weekNumber === lesson.expectedWeek);
    const slot =
      weekDays.find((d) => !busyDayIds.has(d.id)) ||
      dailyPlans.find(
        (d) => !busyDayIds.has(d.id) && d.date >= (weekDays[weekDays.length - 1]?.date ?? '')
      );
    if (!slot) continue;
    slot.spellingAssignment = toAssignment(lesson);
    assignedLessonIds.add(lesson.id);
    busyDayIds.add(slot.id);
  }

  // Pass 2 — remaining lessons spread evenly over the remaining free days.
  const remaining = queue.filter((l) => !assignedLessonIds.has(l.id));
  const freeDays = dailyPlans.filter((d) => !busyDayIds.has(d.id));
  if (remaining.length === 0 || freeDays.length === 0) return;

  const step = freeDays.length / remaining.length;
  let cursor = 0;
  for (let i = 0; i < remaining.length; i++) {
    const target = Math.min(freeDays.length - 1, Math.floor(i * step));
    let idx = Math.max(target, cursor);
    const day = freeDays[idx];
    if (!day) break;
    day.spellingAssignment = toAssignment(remaining[i]);
    busyDayIds.add(day.id);
    cursor = idx + 1;
  }
}

/**
 * Re-assigns spelling lessons on FUTURE (unlocked) plan days after a
 * recalculation. The sequence resumes after the last lesson ACTUALLY
 * recorded in session records — falling back to the last planned lesson on
 * historical days — so a different real-world pace never loses or repeats
 * lessons. Historical days keep their recorded assignment untouched.
 */
export function redistributeSpellingForFutureDays(
  dailyPlans: DailyPlanItem[],
  fromIndexExclusive: number,
  lessons: SpellingLesson[] | undefined,
  sessionRecords: DailySessionRecord[] | undefined,
  studentId: string
): void {
  if (!lessons || lessons.length === 0) return;

  const lastRecorded = (sessionRecords || [])
    .filter((r) => r.studentId === studentId && r.spelling?.lessonNumber)
    .reduce((max, r) => Math.max(max, r.spelling!.lessonNumber), 0);

  const lastPlanned = dailyPlans
    .slice(0, Math.max(0, fromIndexExclusive + 1))
    .reduce((max, d) => Math.max(max, d.spellingAssignment?.lessonNumber ?? 0), 0);

  const anchor = Math.max(lastRecorded, lastPlanned);

  const futureDays = dailyPlans
    .slice(fromIndexExclusive + 1)
    .filter((d) => !d.isHistorical && !d.isLocked);
  for (const d of futureDays) delete d.spellingAssignment;

  assignSpellingLessonsToPlan(futureDays, lessons, anchor);
}
