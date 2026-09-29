import {
  QuranPosition,
  PlanningUnit,
  Ayah,
  RevisionUnitKind,
} from '../types';
import {
  StudentQuranPlan,
  DailyPlanItem,
  DailyItemStatus,
  RecalculationEvent,
  TeacherOverride,
  TargetAtRiskDiagnostic,
  PlanVersionRecord,
  WeeklyPlanSummary,
  MonthlyPlanSummary,
  TermPlanSummary,
} from '../types/plan';
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { RangeCalculator } from './rangeCalculator';
import {
  getSurahsInRangeByDirection,
  getSurahsByDirection,
  getSurahAyahsCount,
  getSurahSequenceIndex,
  getSurahArabicName,
} from '../../utils/quranMetadata';
import {
  getNextWorkingDay,
  getDayOfWeekFromDate,
  getArabicDayName,
  computeWeekNumber,
  computeMonthNumber,
} from '../utils/dateUtils';
import {
  buildTermHorizonWindows,
  countWorkingDaysInHorizon,
  expandHolidayDates,
} from '../utils/termHorizon';
import { redistributeSpellingForFutureDays } from '../utils/spellingDistribution';
import { SpellingLesson, DailySessionRecord, AcademicYearConfig } from '../../types';

export interface RecordAchievementParams {
  plan: StudentQuranPlan;
  dayDate: string; // YYYY-MM-DD
  status: 'completed' | 'partial' | 'overachieved' | 'absent' | 'excused' | 'unrecited';
  actualEndPosition?: QuranPosition; // Position reached, if any
  recordedBy: string;
  evaluation?: 'excellent' | 'very_good' | 'good' | 'needs_practice';
  notes?: string;
  /** Spelling lessons — future-day redistribution when the spelling track is active */
  spellingLessons?: SpellingLesson[];
  /** Student session records — used to resume spelling after the last recorded lesson */
  sessionRecords?: DailySessionRecord[];
  /**
   * Academic-year configuration — supplies the term windows used to measure
   * at_risk headroom across ALL terms (grade targets span both terms). When
   * absent, the check falls back to the plan's own remaining days.
   */
  academicConfig?: AcademicYearConfig;
}

export interface ApplyTeacherOverrideParams {
  plan: StudentQuranPlan;
  teacherId: string;
  teacherName?: string;
  effectiveFromDate: string; // YYYY-MM-DD
  reason: TeacherOverride['reason'];
  reasonArabicText?: string;
  newDailyAmount?: number;
  newWorkingDays?: number[];
  newTargetEnd?: QuranPosition;
}

export class PlanRecalculationService {
  private rangeCalculator: RangeCalculator;

  constructor(private readonly provider: IQuranDataProvider) {
    this.rangeCalculator = new RangeCalculator(provider);
  }

  /**
   * Records student achievement for a specific day and dynamically recalculates
   * future days while preserving all historical items intact.
   */
  async recordDailyAchievement(params: RecordAchievementParams): Promise<StudentQuranPlan> {
    const { plan, dayDate, status, actualEndPosition, recordedBy, evaluation, notes } = params;
    const nowIso = new Date().toISOString();

    const planClone: StudentQuranPlan = JSON.parse(JSON.stringify(plan));
    const dailyPlans = planClone.generatedPlan?.dailyPlans;

    if (!Array.isArray(dailyPlans) || dailyPlans.length === 0) {
      throw new Error('بيانات الخطة غير مكتملة في قاعدة البيانات — الخطة تحتاج إلى إعادة بناء قبل تسجيل الإنجاز.');
    }

    // Find targeted day
    const dayIndex = dailyPlans.findIndex((d) => d.date === dayDate);
    if (dayIndex === -1) {
      throw new Error(`اليوم المحدد (${dayDate}) غير موجود في خطة الطالب.`);
    }

    const targetDay = dailyPlans[dayIndex];
    if (targetDay.isLocked && targetDay.status !== 'pending') {
      // If already recorded and locked, teacher can still update or adjust
    }

    let achievedEnd = targetDay.targetUnit.end;
    let actualUnit: PlanningUnit = { ...targetDay.targetUnit };

    if (status === 'absent' || status === 'excused' || status === 'unrecited') {
      achievedEnd = targetDay.targetUnit.start; // No forward progress made
      actualUnit = {
        ...targetDay.targetUnit,
        totalAyahs: 0,
        displayLabel:
          status === 'absent'
            ? 'غياب الطالب'
            : status === 'excused'
            ? 'استئذان / عذر مقبول'
            : 'لم يسمّع / تأجيل التسميع',
      };
    } else if (actualEndPosition) {
      achievedEnd = actualEndPosition;
      // Resolve actual ayahs count between targetDay start and actualEndPosition
      const verses = await this.provider.getAyahsInRange(
        targetDay.targetUnit.start,
        actualEndPosition,
        planClone.direction
      );
      actualUnit = {
        ...targetDay.targetUnit,
        end: actualEndPosition,
        totalAyahs: verses.length,
      };
    }

    // 1. Lock and finalize the target day (IMMUTABLE HISTORICAL RECORD)
    targetDay.status = status;
    targetDay.isHistorical = true;
    targetDay.isLocked = true;
    targetDay.actualAchieved = {
      unit: actualUnit,
      completedAt: nowIso,
      recordedBy,
      evaluation,
      notes,
    };

    // 2. Determine new current position of the student
    const newCurrentPosition: QuranPosition =
      status === 'absent' || status === 'excused' || status === 'unrecited'
        ? planClone.currentPosition
        : achievedEnd;

    planClone.currentPosition = newCurrentPosition;

    // 3. Compute next required start position for future days
    const allPlannedVerses = await this.provider.getAyahsInRange(
      planClone.targetStart,
      planClone.targetEnd,
      planClone.direction
    );

    let nextFutureStart: QuranPosition | null = null;
    let isTargetComplete = false;

    if (status === 'absent' || status === 'excused' || status === 'unrecited') {
      // No progress was made — the future resumes right after the last verse
      // that was ACTUALLY achieved (never inside the unrecited unit, whose new
      // portion simply shifts forward into the remaining days).
      let resumeBase: QuranPosition | null = null;
      for (let i = dayIndex - 1; i >= 0; i--) {
        const d = dailyPlans[i];
        if (
          d.isHistorical &&
          d.actualAchieved &&
          (d.status === 'completed' || d.status === 'partial' || d.status === 'overachieved')
        ) {
          resumeBase = d.actualAchieved.unit.end;
          break;
        }
      }

      nextFutureStart = resumeBase
        ? await this.nextPositionAfter(resumeBase, planClone)
        : planClone.targetStart;

      if (!nextFutureStart) {
        isTargetComplete = resumeBase ? this.reachedTargetEnd(resumeBase, planClone) : true;
      }
    } else {
      // Recitation achieved up to achievedEnd
      const idx = allPlannedVerses.findIndex(
        (v) =>
          v.surahNumber === achievedEnd.surahNumber &&
          v.ayahNumber === achievedEnd.ayahNumber
      );

      if (idx !== -1 && idx + 1 < allPlannedVerses.length) {
        const v = allPlannedVerses[idx + 1];
        nextFutureStart = {
          surahNumber: v.surahNumber,
          ayahNumber: v.ayahNumber,
          globalIndex: v.globalIndex,
        };
      } else if (idx === allPlannedVerses.length - 1) {
        isTargetComplete = true;
      } else {
        // Fallback if the achieved position is not found inside the target
        // range (e.g. overachievement beyond the original plan boundary).
        nextFutureStart = await this.nextPositionAfter(achievedEnd, planClone);
        if (!nextFutureStart && this.reachedTargetEnd(achievedEnd, planClone)) {
          isTargetComplete = true;
        }
      }
    }

    // 4. Rebuild remaining future units using the SAME partitioning strategy as
    // plan creation: cumulative per-surah pacing + consolidation days + rolling
    // minor revision seeded from the accumulated memorized content.
    let remainingUnits: PlanningUnit[] = [];
    // Units strictly required to reach the target end — excludes the
    // post-target continuation extension that merely fills spare days. This is
    // the honest numerator for the at_risk check.
    let remainingTargetUnitsCount = 0;
    let repartitionDone = false;

    const futureDaysNeeded = dailyPlans.filter(
      (d) => d.date > dayDate && !d.isHistorical && !d.isLocked && d.dayType !== 'holiday'
    ).length;

    if (isTargetComplete && futureDaysNeeded > 0) {
      // Academic target achieved — memorization continues into the next surah
      // in the plan direction instead of stalling on filler days.
      const continueStart =
        (planClone.targetEnd
          ? await this.nextPositionAfter(planClone.targetEnd, planClone)
          : null) || nextFutureStart;
      if (continueStart) {
        nextFutureStart = continueStart;
        isTargetComplete = false;
      }
    }

    if (nextFutureStart && !isTargetComplete) {
      const rebuilt = await this.buildRemainingUnits(
        planClone,
        nextFutureStart,
        newCurrentPosition,
        status === 'absent' || status === 'excused' || status === 'unrecited'
          ? null
          : achievedEnd,
        futureDaysNeeded
      );
      remainingUnits = rebuilt.units;
      remainingTargetUnitsCount = rebuilt.targetUnitsCount;
      repartitionDone = true;
    } else if (isTargetComplete) {
      repartitionDone = true;
    }

    // 5. Update only FUTURE days (index > dayIndex) — the past is immutable.
    if (repartitionDone) {
      let unitCursor = 0;
      for (let i = dayIndex + 1; i < dailyPlans.length; i++) {
        const futureDay = dailyPlans[i];
        if (futureDay.isHistorical || futureDay.isLocked || futureDay.dayType === 'holiday') {
          continue; // Strictly preserve any pre-existing historical records and official holidays
        }

        if (unitCursor < remainingUnits.length) {
          this.applyUnitToDay(futureDay, remainingUnits[unitCursor], planClone);
          futureDay.status = 'pending';
          unitCursor++;
        } else {
          // Target achieved early or empty buffer days
          this.applyUnitToDay(
            futureDay,
            {
              type: planClone.unitType,
              start: planClone.targetEnd,
              end: planClone.targetEnd,
              totalAyahs: 0,
              displayLabel: 'يوم تثبيت ومراجعة (تم إنجاز المقرر)',
            },
            planClone
          );
          futureDay.status = 'pending';
        }
      }
    }

    // 5b. Spelling track: redistribute the remaining EXISTING lessons over the
    // rebuilt future days, resuming after the last recorded/planned lesson —
    // only when the plan carries an active spelling subscription.
    if (params.spellingLessons?.length && planClone.activeTrackIds?.includes('track_spelling')) {
      redistributeSpellingForFutureDays(
        dailyPlans,
        dayIndex,
        params.spellingLessons,
        params.sessionRecords,
        planClone.studentId
      );
    }

    // 7. Check if target has become AT_RISK
    // The plan document only spans the current term, but grade targets are
    // distributed across ALL terms — so the headroom is measured against the
    // remaining working days through the LAST term's end when the academic
    // configuration is available. Without it, fall back to the plan horizon.
    const futureActiveDays = dailyPlans.filter(
      (d) => d.date > dayDate && !d.isHistorical && !d.isLocked && d.dayType !== 'holiday'
    );
    const termWindows = buildTermHorizonWindows(params.academicConfig);
    const remainingWorkingDaysCount = termWindows.length
      ? countWorkingDaysInHorizon(
          dayDate,
          termWindows,
          planClone.schedule.workingDays,
          expandHolidayDates(planClone.schedule.holidays as any[])
        )
      : futureActiveDays.length;
    const remainingUnitsCount = remainingTargetUnitsCount;
    const isAtRisk = remainingUnitsCount > remainingWorkingDaysCount;

    // 6. Append Recalculation Event for Auditing
    const event: RecalculationEvent = {
      id: `recalc_${Date.now()}`,
      timestamp: nowIso,
      trigger:
        status === "absent" || status === "excused"
          ? "absence"
          : status === "overachieved"
          ? "achievement_surplus"
          : status === "partial" || status === "unrecited"
          ? "achievement_deficit"
          : "schedule_change",
      effectiveFromDate: dayDate,
      recordedAchievement: {
        date: dayDate,
        plannedAyahs: targetDay.targetUnit.totalAyahs,
        achievedAyahs: actualUnit.totalAyahs,
      },
      previousRemainingUnits: remainingUnits.length,
      newRemainingUnits: remainingUnits.length,
      targetAtRisk: isAtRisk,
      notes: `تم رصد الإنجاز لليوم (${dayDate}) بنتيجة [${status}] بواسطة المعلم (${recordedBy}).`,
    };

    planClone.recalculationHistory.unshift(event);


    if (isAtRisk) {
      const deficitUnits = remainingUnitsCount - remainingWorkingDaysCount;
      const requiredDailyAmount =
        remainingWorkingDaysCount > 0
          ? Math.ceil(remainingUnitsCount / remainingWorkingDaysCount)
          : remainingUnitsCount;

      const diagnostic: TargetAtRiskDiagnostic = {
        isAtRisk: true,
        originalTarget: planClone.originalTarget,
        currentPosition: newCurrentPosition,
        completedUnits: dailyPlans.filter(
          (d) => d.status === 'completed' || d.status === 'overachieved'
        ).length,
        remainingUnits: remainingUnitsCount,
        remainingWorkingDays: remainingWorkingDaysCount,
        requiredDailyAmount,
        currentDailyAmount: planClone.dailyAmount,
        deficitUnits,
        projectedDeficitDays: deficitUnits,
        warningMessage: `تنبيه: نظراً للغياب أو التأخر، سيتبقى عجز بمقدار ${deficitUnits} حصة بنهاية العام الدراسي.`,
        actionableRecommendations: [
          `زيادة معدل الحفظ اليومي إلى ${requiredDailyAmount} لتدارك التأخر.`,
          `إضافة أيام دراسية إضافية لتعويض الـ ${deficitUnits} يوماً دراسياً المفقود.`,
          `تمديد الخطة الزمنية أو استثناء بعض أيام التثبيت باتفاق المشرف والمعلم.`,
        ],
      };

      planClone.status = 'at_risk';
      planClone.targetAtRiskDiagnostic = diagnostic;
    } else {
      planClone.status = 'active';
      planClone.targetAtRiskDiagnostic = undefined;
    }

    // 8. Rebuild multi-level summaries strictly from the updated dailyPlans
    this.rebuildSummaries(planClone);

    planClone.updatedAt = nowIso;
    return planClone;
  }

  /**
   * Applies an explicit teacher override to a plan and recalculates all future days.
   */
  async applyTeacherOverride(params: ApplyTeacherOverrideParams): Promise<StudentQuranPlan> {
    const {
      plan,
      teacherId,
      teacherName,
      effectiveFromDate,
      reason,
      reasonArabicText,
      newDailyAmount,
      newWorkingDays,
      newTargetEnd,
    } = params;

    const nowIso = new Date().toISOString();
    const planClone: StudentQuranPlan = JSON.parse(JSON.stringify(plan));
    const dailyPlans = planClone.generatedPlan?.dailyPlans;

    if (!Array.isArray(dailyPlans) || dailyPlans.length === 0) {
      throw new Error('بيانات الخطة غير مكتملة.');
    }

    const changesRecord: Record<string, { before: any; after: any }> = {};

    if (newDailyAmount !== undefined && newDailyAmount !== planClone.dailyAmount) {
      changesRecord['dailyAmount'] = {
        before: planClone.dailyAmount,
        after: newDailyAmount,
      };
      planClone.dailyAmount = newDailyAmount;
    }

    if (newWorkingDays && newWorkingDays.length > 0) {
      changesRecord['workingDays'] = {
        before: planClone.schedule.workingDays,
        after: newWorkingDays,
      };
      planClone.schedule.workingDays = newWorkingDays;
    }

    if (newTargetEnd) {
      changesRecord['targetEnd'] = {
        before: planClone.targetEnd,
        after: newTargetEnd,
      };
      planClone.targetEnd = newTargetEnd;
    }

    let lastAchievedPosition = planClone.currentPosition;
    for (const d of dailyPlans) {
      if (d.date < effectiveFromDate && d.isHistorical && d.actualAchieved) {
        lastAchievedPosition = d.actualAchieved.unit.end;
      }
    }

    const startForRemaining =
      (await this.nextPositionAfter(lastAchievedPosition, planClone)) ||
      lastAchievedPosition;

    const remainingUnits = (
      await this.buildRemainingUnits(
        planClone,
        startForRemaining,
        lastAchievedPosition,
        null,
        dailyPlans.filter(
          (d) => d.date >= effectiveFromDate && !d.isHistorical && !d.isLocked && d.dayType !== 'holiday'
        ).length
      )
    ).units;

    let cursor = 0;
    for (const d of dailyPlans) {
      if (d.date >= effectiveFromDate && !d.isHistorical && !d.isLocked && d.dayType !== 'holiday') {
        if (cursor < remainingUnits.length) {
          this.applyUnitToDay(d, remainingUnits[cursor], planClone);
          cursor++;
        } else {
          this.applyUnitToDay(
            d,
            {
              type: planClone.unitType,
              start: planClone.targetEnd,
              end: planClone.targetEnd,
              totalAyahs: 0,
              displayLabel: 'تثبيت ومراجعة',
            },
            planClone
          );
        }
      }
    }

    this.rebuildSummaries(planClone);

    const overrideRecord: TeacherOverride = {
      id: `override_${Date.now()}`,
      teacherId,
      timestamp: nowIso,
      effectiveFromDate,
      reason,
      reasonArabicText,
      changes: changesRecord,
    };

    planClone.teacherOverrides.unshift(overrideRecord);
    planClone.planVersion += 1;
    planClone.versionHistory.unshift({
      version: planClone.planVersion,
      createdAt: nowIso,
      createdBy: teacherName || teacherId,
      reason: `تعديل المعلم: ${reasonArabicText || reason}`,
      dailyAmount: planClone.dailyAmount,
      workingDays: [...planClone.schedule.workingDays],
      remainingUnitsAtVersion: remainingUnits.length,
    });

    planClone.updatedAt = nowIso;
    return planClone;
  }

  private resolveRevisionDirection(plan: StudentQuranPlan): 'forward' | 'backward' {
    return plan.revisionDirection || plan.revisionSettings?.direction || 'backward';
  }

  private async buildRevisionSeed(
    plan: StudentQuranPlan,
    upToPosition: QuranPosition
  ): Promise<Ayah[]> {
    try {
      if (plan.autoMinorRevisionMode) {
        return await this.rangeCalculator.getCompletedMemorizedVerses(
          upToPosition,
          plan.direction
        );
      }
      if (plan.manualRevisionRange) {
        return await this.provider.getAyahsInRange(
          plan.manualRevisionRange.start,
          plan.manualRevisionRange.end,
          this.resolveRevisionDirection(plan)
        );
      }
    } catch {
      // ignore
    }
    return [];
  }

  private async buildRemainingUnits(
    plan: StudentQuranPlan,
    startPos: QuranPosition,
    achievedPositionForSeed: QuranPosition,
    justCompletedEnd: QuranPosition | null,
    neededUnits = 0
  ): Promise<{ units: PlanningUnit[]; targetUnitsCount: number }> {
    const revisionDirection = this.resolveRevisionDirection(plan);
    const revisionPages = plan.revisionDailyPages ?? 1;
    const revisionUnitKind = plan.revisionSettings?.unitType || 'page';
    const revisionUnitsPerWindow = plan.revisionSettings?.surahsPerDay;

    const seed = await this.buildRevisionSeed(plan, achievedPositionForSeed);
    // A just-completed surah already sits in the seed — anchor the rebuilt
    // backward cycle at it with the consumed-anchor skip (its prepended
    // consolidation days count as its first turn), matching generation.
    const completedSurahAnchor =
      plan.autoMinorRevisionMode && revisionDirection === 'backward' && justCompletedEnd
        ? justCompletedEnd.surahNumber
        : undefined;
    const repartition = (endPos: QuranPosition) =>
      this.rangeCalculator.partitionSurahsWithCumulativePaceAndConsolidation(
        startPos,
        endPos,
        plan.unitType,
        plan.dailyAmount,
        plan.direction,
        plan.consolidationDaysPerSurah,
        revisionPages,
        seed,
        revisionDirection,
        revisionUnitKind,
        revisionUnitsPerWindow,
        plan.autoMinorRevisionMode,
        completedSurahAnchor,
        (plan.consolidationDaysPerSurah ?? 3) > 0
      );
    let rawUnits = await repartition(plan.targetEnd);
    // Honest count of units required to reach the target — captured BEFORE the
    // continuation extension below inflates the list to fill spare days.
    const targetUnitsBase = rawUnits.length;

    // Continue memorization past the academic target when days remain —
    // the target is the stage goal, not a hard stop.
    const dirSurahs = getSurahsByDirection(plan.direction);
    let extIdx = dirSurahs.findIndex((s) => s.number === plan.targetEnd.surahNumber);
    let extEnd = plan.targetEnd;
    while (rawUnits.length < neededUnits && extIdx >= 0 && extIdx < dirSurahs.length - 1) {
      extIdx = Math.min(extIdx + 4, dirSurahs.length - 1);
      const nxt = dirSurahs[extIdx];
      extEnd = { surahNumber: nxt.number, ayahNumber: nxt.ayahsCount };
      rawUnits = await repartition(extEnd);
    }

    if (justCompletedEnd) {
      const withConsolidation = await this.prependCompletedSurahConsolidation(
        rawUnits,
        justCompletedEnd,
        plan,
        seed,
        revisionDirection,
        revisionPages,
        revisionUnitKind,
        revisionUnitsPerWindow
      );
      // Prepended consolidation days are genuine units consumed on the way to
      // the target — count them, unlike the continuation extension.
      const prepended = withConsolidation.length - rawUnits.length;
      return { units: withConsolidation, targetUnitsCount: targetUnitsBase + prepended };
    }

    return { units: rawUnits, targetUnitsCount: targetUnitsBase };
  }

  private async prependCompletedSurahConsolidation(
    units: PlanningUnit[],
    completedSurahEnd: QuranPosition,
    plan: StudentQuranPlan,
    seed: Ayah[],
    revisionDirection: 'forward' | 'backward',
    revisionPages: number,
    revisionUnitKind: RevisionUnitKind,
    revisionUnitsPerWindow?: number
  ): Promise<PlanningUnit[]> {
    const consolidationDays = plan.consolidationDaysPerSurah ?? 3;
    const alreadyHasConsolidation = units.some(
      (u) => u.isConsolidation && u.consolidationSurahNumber === completedSurahEnd?.surahNumber
    );
    if (alreadyHasConsolidation || !completedSurahEnd || consolidationDays <= 0) return units;

    const surahAyahCount = getSurahAyahsCount(completedSurahEnd.surahNumber);
    if (surahAyahCount <= 0 || completedSurahEnd.ayahNumber < surahAyahCount) return units;

    const firstVerse = await this.provider.getAyah(completedSurahEnd.surahNumber, 1);
    const lastVerse = await this.provider.getAyah(completedSurahEnd.surahNumber, surahAyahCount);
    if (!firstVerse || !lastVerse) return units;

    const acc: Ayah[] = seed.filter((v) => v.surahNumber !== completedSurahEnd.surahNumber);
    let offset = 0;
    const consolidationUnits: PlanningUnit[] = [];

    for (let c = 1; c <= consolidationDays; c++) {
      const rev = this.rangeCalculator.computeRollingRevision(
        acc,
        revisionPages,
        offset,
        revisionDirection,
        revisionUnitKind,
        revisionUnitsPerWindow
      );
      offset = rev.nextOffset;
      consolidationUnits.push({
        type: plan.unitType,
        start: { surahNumber: firstVerse.surahNumber, ayahNumber: 1, globalIndex: firstVerse.globalIndex },
        end: { surahNumber: lastVerse.surahNumber, ayahNumber: surahAyahCount, globalIndex: lastVerse.globalIndex },
        totalAyahs: surahAyahCount,
        displayLabel: `تثبيت سورة ${getSurahArabicName(completedSurahEnd.surahNumber)} كاملة (1 - ${surahAyahCount}) [اليوم ${c}/${consolidationDays}]`,
        pageStart: firstVerse.pageNumber,
        pageEnd: lastVerse.pageNumber,
        isConsolidation: true,
        consolidationDayIndex: c,
        consolidationSurahNumber: completedSurahEnd.surahNumber,
        revisionPages,
        revisionDisplay: rev.displayLabel,
        revisionPageStart: rev.pageStart,
        revisionPageEnd: rev.pageEnd,
      });
    }

    return [...consolidationUnits, ...units];
  }

  private async nextPositionAfter(
    pos: QuranPosition,
    plan: StudentQuranPlan
  ): Promise<QuranPosition | null> {
    if (plan.direction === 'forward') {
      let gi = pos.globalIndex;
      if (!gi) {
        const a = await this.provider.getAyah(pos.surahNumber, pos.ayahNumber);
        gi = a?.globalIndex;
      }
      if (!gi) return null;
      const next = await this.provider.getAyahByGlobalIndex(gi + 1);
      return next
        ? { surahNumber: next.surahNumber, ayahNumber: next.ayahNumber, globalIndex: next.globalIndex }
        : null;
    }

    const ayahCount = getSurahAyahsCount(pos.surahNumber);
    if (pos.ayahNumber < ayahCount) {
      const next = await this.provider.getAyah(pos.surahNumber, pos.ayahNumber + 1);
      return next
        ? { surahNumber: next.surahNumber, ayahNumber: next.ayahNumber, globalIndex: next.globalIndex }
        : null;
    }

    // Traversal continues past the academic target to the direction boundary
    // (البقرة for backward) — the target is a goal, not a stop.
    const boundarySurah = getSurahsByDirection(plan.direction)[113]?.number ?? 2;
    const seq = getSurahsInRangeByDirection(pos.surahNumber, boundarySurah, 'backward');
    const idx = seq.findIndex((s) => s.number === pos.surahNumber);
    if (idx !== -1 && idx + 1 < seq.length) {
      const next = await this.provider.getAyah(seq[idx + 1].number, 1);
      if (next) {
        return { surahNumber: next.surahNumber, ayahNumber: next.ayahNumber, globalIndex: next.globalIndex };
      }
    }
    return null;
  }

  private reachedTargetEnd(pos: QuranPosition, plan: StudentQuranPlan): boolean {
    const posIdx = getSurahSequenceIndex(pos.surahNumber, plan.direction);
    const endIdx = getSurahSequenceIndex(plan.targetEnd.surahNumber, plan.direction);
    if (posIdx !== endIdx) return posIdx > endIdx;
    return pos.ayahNumber >= plan.targetEnd.ayahNumber;
  }

  private applyUnitToDay(day: DailyPlanItem, unit: PlanningUnit, plan: StudentQuranPlan): void {
    day.targetUnit = unit;
    const isConsolidation = Boolean(unit.isConsolidation);
    day.planType = isConsolidation || unit.totalAyahs === 0 ? 'revision' : 'memorization';
    day.dayType = isConsolidation
      ? 'consolidation'
      : unit.totalAyahs > 0
        ? 'memorization'
        : 'general_revision';
    day.isConsolidationDay = isConsolidation;
    day.consolidationDayIndex = unit.consolidationDayIndex;
    day.consolidationSurahNumber = unit.consolidationSurahNumber;
    day.revisionPagesAmount = unit.revisionPages ?? plan.revisionDailyPages;
    day.revisionDisplayLabel = unit.revisionDisplay || day.revisionDisplayLabel;
    day.revisionPageStart = unit.revisionPageStart;
    day.revisionPageEnd = unit.revisionPageEnd;
  }

  private rebuildSummaries(plan: StudentQuranPlan): void {
    const dailyPlans = plan.generatedPlan.dailyPlans;

    // 1. Weekly Summaries
    const weeklyMap = new Map<number, DailyPlanItem[]>();
    for (const item of dailyPlans) {
      const list = weeklyMap.get(item.weekNumber) || [];
      list.push(item);
      weeklyMap.set(item.weekNumber, list);
    }

    const weeklyPlans: WeeklyPlanSummary[] = [];
    for (const [wNum, days] of weeklyMap.entries()) {
      const firstDay = days[0];
      const lastDay = days[days.length - 1];
      const totalAyahs = days.reduce((sum, d) => sum + d.targetUnit.totalAyahs, 0);
      const totalUnits = days.filter((d) => d.dayType !== 'holiday' && d.targetUnit.totalAyahs > 0).length;
      const completedDaysCount = days.filter(
        (d) => d.status === 'completed' || d.status === 'overachieved'
      ).length;

      weeklyPlans.push({
        weekNumber: wNum,
        startDate: firstDay.date,
        endDate: lastDay.date,
        plannedStart: firstDay.targetUnit.start,
        plannedEnd: lastDay.targetUnit.end,
        displayLabel: `الأسبوع ${wNum} (${totalAyahs} آية)`,
        totalAyahs,
        totalUnits,
        days,
        isCompleted: completedDaysCount === days.length,
        completedDaysCount,
      });
    }

    // 2. Monthly Summaries
    const monthlyMap = new Map<number, WeeklyPlanSummary[]>();
    for (const w of weeklyPlans) {
      const monthNum = computeMonthNumber(w.startDate, plan.startDate);
      const list = monthlyMap.get(monthNum) || [];
      list.push(w);
      monthlyMap.set(monthNum, list);
    }

    const monthlyPlans: MonthlyPlanSummary[] = [];
    for (const [mNum, weeks] of monthlyMap.entries()) {
      const firstWeek = weeks[0];
      const lastWeek = weeks[weeks.length - 1];
      const totalAyahs = weeks.reduce((sum, w) => sum + w.totalAyahs, 0);
      const totalUnits = weeks.reduce((sum, w) => sum + w.totalUnits, 0);

      monthlyPlans.push({
        monthNumber: mNum,
        monthName: `الشهر ${mNum}`,
        startDate: firstWeek.startDate,
        endDate: lastWeek.endDate,
        plannedStart: firstWeek.plannedStart,
        plannedEnd: lastWeek.plannedEnd,
        displayLabel: `الشهر ${mNum} (${totalAyahs} آية)`,
        totalAyahs,
        totalUnits,
        weeks,
      });
    }

    // 3. Term Summary
    const termPlan: TermPlanSummary = {
      termName: 'خطة الفصل الدراسي (المحدثة)',
      startDate: plan.startDate,
      endDate: plan.endDate,
      startPosition: plan.targetStart,
      endPosition: plan.targetEnd,
      displayLabel: plan.originalTarget.displayTarget,
      totalAyahs: plan.originalTarget.totalAyahs,
      totalUnits: plan.originalTarget.totalUnits,
      totalWorkingDays: dailyPlans.filter((d) => d.dayType !== 'holiday').length,
      direction: plan.direction,
    };

    plan.generatedPlan = {
      termPlan,
      monthlyPlans,
      weeklyPlans,
      dailyPlans,
    };
  }
}
