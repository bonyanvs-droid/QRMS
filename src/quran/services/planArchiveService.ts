/**
 * Quran Plan Archive Service — deterministic, side-effect-free archive logic.
 *
 * Archive semantics (NEVER delete):
 *  - The plan row stays in PostgreSQL with status='archived' /
 *    isCurrentActive=false; plan_data (dailyPlans, history, versions) intact.
 *  - Related daily session records are NEVER deleted. In
 *    'plan_and_achievements' mode they are MARKED historical via
 *    customTracks._planArchive (an existing JSONB column — no schema change)
 *    so future plan creation no longer seeds from them, while every byte of
 *    the record remains queryable for history/audit.
 */
import { StudentQuranPlan } from '../types/plan';
import { DailySessionRecord } from '../../types';

export type PlanArchiveMode = 'plan_only' | 'plan_and_achievements';

/** Marker written inside the existing customTracks JSONB bucket. */
export interface PlanArchiveMarker {
  planId: string;
  archivedAt: string;
  archivedBy: string;
  mode: PlanArchiveMode;
}

/** Reads the archive marker from a session record (undefined = not archived). */
export function getPlanArchiveMarker(record: DailySessionRecord): PlanArchiveMarker | undefined {
  return (record.customTracks as any)?._planArchive as PlanArchiveMarker | undefined;
}

/** True when the record was archived together with a Quran plan. */
export function isRecordPlanArchived(record: DailySessionRecord): boolean {
  return !!getPlanArchiveMarker(record);
}

/**
 * Determines which session records belong to THIS plan — never by student
 * alone. A record is related when it explicitly references the plan
 * (customTracks._quranPlanId, written by the achievement flow) OR falls inside
 * the plan's active window [startDate, archiveDate] for the same student while
 * carrying actual achievement content. Records already archived with an
 * earlier plan are never re-attributed.
 */
export function findPlanRelatedRecords(
  plan: StudentQuranPlan,
  sessionRecords: DailySessionRecord[],
  archiveDateIso: string
): DailySessionRecord[] {
  const windowStart = plan.startDate;
  const windowEnd = archiveDateIso;
  return sessionRecords.filter((r) => {
    if (r.studentId !== plan.studentId) return false;
    if (getPlanArchiveMarker(r)) return false; // already archived with another plan
    if ((r.customTracks as any)?._quranPlanId === plan.id) return true;
    if (!r.date || r.date < windowStart || r.date > windowEnd) return false;
    // Only achievement-bearing records are archived; plain attendance/noise is not.
    return !!(r.memorization || r.revision || r.spelling || r.customTracks);
  });
}

/** Returns a NEW record object carrying the archive marker (original untouched). */
export function markRecordPlanArchived(
  record: DailySessionRecord,
  marker: PlanArchiveMarker
): DailySessionRecord {
  return {
    ...record,
    customTracks: {
      ...(record.customTracks || {}),
      _planArchive: marker,
    },
  };
}

export interface BuildPlanArchiveParams {
  plan: StudentQuranPlan;
  mode: PlanArchiveMode;
  actorName: string;
  reason?: string;
  sessionRecords: DailySessionRecord[];
  /** Local ISO timestamp — caller supplies to keep this function pure */
  archivedAtIso: string;
}

export interface PlanArchiveComputation {
  /** The plan with archive fields applied — ready for persistence */
  archivedPlan: StudentQuranPlan;
  /** Related records marked historical — only for 'plan_and_achievements' */
  markedRecords: DailySessionRecord[];
  /** Snapshot facts for the audit event */
  summary: {
    planId: string;
    studentId: string;
    planDays: number;
    recordedAchievementDays: number;
    relatedRecordCount: number;
    lastPosition?: { surahNumber: number; ayahNumber: number };
  };
}

/**
 * Computes the archived plan + (optionally) the marked achievement records.
 * Pure function — the caller persists the results.
 */
export function buildPlanArchive(params: BuildPlanArchiveParams): PlanArchiveComputation {
  const { plan, mode, actorName, reason, sessionRecords, archivedAtIso } = params;

  const dailyPlans = plan.generatedPlan?.dailyPlans || [];
  const recordedAchievementDays = dailyPlans.filter((d) => !!d.actualAchieved).length;

  const relatedRecords =
    mode === 'plan_and_achievements'
      ? findPlanRelatedRecords(plan, sessionRecords, archivedAtIso.slice(0, 10))
      : [];

  const marker: PlanArchiveMarker = {
    planId: plan.id,
    archivedAt: archivedAtIso,
    archivedBy: actorName,
    mode,
  };
  const markedRecords = relatedRecords.map((r) => markRecordPlanArchived(r, marker));

  const archivedPlan: StudentQuranPlan = {
    ...plan,
    status: 'archived',
    isCurrentActive: false,
    archivedAt: archivedAtIso,
    archivedBy: actorName,
    archiveMode: mode,
    archiveNote: reason,
    planVersion: (plan.planVersion || 1) + 1,
    versionHistory: [
      {
        version: (plan.planVersion || 1) + 1,
        createdAt: archivedAtIso,
        createdBy: actorName,
        reason:
          mode === 'plan_and_achievements'
            ? 'أرشفة الخطة مع فصل الإنجازات المرتبطة عن الخطة النشطة'
            : 'أرشفة الخطة مع الاحتفاظ بالإنجازات في السجل التاريخي',
        dailyAmount: plan.dailyAmount,
        workingDays: [...(plan.schedule?.workingDays || [])],
        remainingUnitsAtVersion: plan.targetAtRiskDiagnostic?.remainingUnits,
      },
      ...(plan.versionHistory || []),
    ],
    updatedAt: archivedAtIso,
  };

  return {
    archivedPlan,
    markedRecords,
    summary: {
      planId: plan.id,
      studentId: plan.studentId,
      planDays: dailyPlans.length,
      recordedAchievementDays,
      relatedRecordCount: markedRecords.length,
      lastPosition: plan.currentPosition
        ? {
            surahNumber: plan.currentPosition.surahNumber,
            ayahNumber: plan.currentPosition.ayahNumber,
          }
        : undefined,
    },
  };
}
