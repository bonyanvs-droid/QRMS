import {
  QuranPosition,
  PlanningUnit,
  Ayah,
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
import { redistributeSpellingForFutureDays } from '../utils/spellingDistribution';
import { SpellingLesson, DailySessionRecord } from '../../types';

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
      // If already recorded and locked, teacher can still update or adjust, but let's note
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
        displayLabel: `${targetDay.targetUnit.displayLabel} (إنجاز فعلي: ${verses.length} آية)`,
      };
    }

    // 1. Lock this historical day permanently
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

    // 2. Determine new current position
    // If progress was made, current position is the last achieved verse.
    // If absent or excused or unrecited, position stays at whatever was achieved up to previous day.
    let newCurrentPosition = planClone.currentPosition;
    if (status !== 'absent' && status !== 'excused' && status !== 'unrecited') {
      newCurrentPosition = achievedEnd;
    }
    planClone.currentPosition = newCurrentPosition;

    // 3. Determine next starting position for future recalculation
    const effectiveFromDate = getNextWorkingDay(dayDate, planClone.schedule);
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
    let repartitionDone = false;
    if (nextFutureStart && !isTargetComplete) {
      remainingUnits = await this.buildRemainingUnits(
        planClone,
        nextFutureStart,
        newCurrentPosition,
        status === 'absent' || status === 'excused' || status === 'unrecited'
          ? null
          : achievedEnd
      );
      repartitionDone = true;
    } else if (isTargetComplete) {
      repartitionDone = true;
    }

    // 5. Update only FUTURE days (index > dayIndex) — the past is immutable.
    if (repartitionDone) {
      let unitCursor = 0;
      for (let i = dayIndex + 1; i < dailyPlans.length; i++) {
        const futureDay = dailyPlans[i];
        if (futureDay.isHistorical || futureDay.isLocked) {
          continue; // Strictly preserve any pre-existing historical records
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

    // 6. Check if target is now at risk
    const remainingWorkingDays = dailyPlans.filter(
      (d, idx) => idx > dayIndex && !d.isHistorical && !d.isLocked
    ).length;

    const deficitUnits = Math.max(0, remainingUnits.length - remainingWorkingDays);
    const isAtRisk = deficitUnits > 0;

    let targetAtRiskDiagnostic: TargetAtRiskDiagnostic | undefined = undefined;

    if (isAtRisk) {
      const requiredDailyAmount =
        remainingWorkingDays > 0
          ? Math.ceil(remainingUnits.length / remainingWorkingDays)
          : remainingUnits.length;

      targetAtRiskDiagnostic = {
        isAtRisk: true,
        originalTarget: planClone.originalTarget,
        currentPosition: newCurrentPosition,
        completedUnits: planClone.originalTarget.totalUnits - remainingUnits.length,
        remainingUnits: remainingUnits.length,
        remainingWorkingDays,
        requiredDailyAmount,
        currentDailyAmount: planClone.dailyAmount,
        deficitUnits,
        projectedDeficitDays: deficitUnits,
        warningMessage: `تنبيه تعثر الخطة: تبقى ${remainingUnits.length} وحدة مقابل ${remainingWorkingDays} يوم متاح فقط. سيحدث عجز متوقع قدره ${deficitUnits} وحدة عند نهاية الفترة دون تعديل الوتيرة.`,
        actionableRecommendations: [
          `رفع مقدار الحفظ/المراجعة اليومي إلى ${requiredDailyAmount} وحدة يومياً للتعويض.`,
          `إضافة أيام تعويضية خلال عطلة نهاية الأسبوع لتغطية ${deficitUnits} يوماً دراسياً.`,
          `جلسة تثبيت فردية مكثفة مع المعلم لتدارك التعثر الحالي.`,
        ],
      };
      planClone.status = 'at_risk';
    } else if (isTargetComplete) {
      planClone.status = 'completed';
    } else {
      planClone.status = 'active';
    }
    planClone.targetAtRiskDiagnostic = targetAtRiskDiagnostic;

    // 7. Re-synthesize Multi-Level summaries
    this.rebuildSummaries(planClone);

    // 8. Log Recalculation Event and Version History
    const trigger: RecalculationEvent['trigger'] =
      status === 'overachieved'
        ? 'achievement_surplus'
        : status === 'partial'
          ? 'achievement_deficit'
          : status === 'absent' || status === 'excused' || status === 'unrecited'
            ? 'absence'
            : 'achievement_surplus';

    const prevRemaining = plan.targetAtRiskDiagnostic?.remainingUnits ?? plan.originalTarget.totalUnits;

    planClone.recalculationHistory.unshift({
      id: `recalc_${Date.now()}`,
      timestamp: nowIso,
      trigger,
      effectiveFromDate,
      recordedAchievement: {
        date: dayDate,
        plannedAyahs: targetDay.targetUnit.totalAyahs,
        achievedAyahs: actualUnit.totalAyahs,
      },
      previousRemainingUnits: prevRemaining,
      newRemainingUnits: remainingUnits.length,
      targetAtRisk: isAtRisk,
      notes: notes || `تسجيل إنجاز يوم ${dayDate} بحالة (${status})`,
    });

    planClone.planVersion += 1;
    planClone.versionHistory.unshift({
      version: planClone.planVersion,
      createdAt: nowIso,
      createdBy: recordedBy,
      reason: `تحديث بعد تسجيل إنجاز ${dayDate} (${status})`,
      dailyAmount: planClone.dailyAmount,
      workingDays: [...planClone.schedule.workingDays],
      remainingUnitsAtVersion: remainingUnits.length,
    });

    planClone.updatedAt = nowIso;

    return planClone;
  }

  /**
   * Applies teacher override (amount change, schedule change, consolidation)
   * strictly from effectiveFromDate onward, preserving all past records.
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
      throw new Error('بيانات الخطة غير مكتملة في قاعدة البيانات — الخطة تحتاج إلى إعادة بناء قبل تطبيق تعديل المعلم.');
    }

    const changesRecord: Record<string, { before: unknown; after: unknown }> = {};

    if (newDailyAmount !== undefined && newDailyAmount !== planClone.dailyAmount) {
      changesRecord['dailyAmount'] = {
        before: planClone.dailyAmount,
        after: newDailyAmount,
      };
      planClone.dailyAmount = newDailyAmount;
    }

    if (newWorkingDays !== undefined) {
      changesRecord['workingDays'] = {
        before: planClone.schedule.workingDays,
        after: newWorkingDays,
      };
      planClone.schedule.workingDays = newWorkingDays;
    }

    if (newTargetEnd !== undefined) {
      changesRecord['targetEnd'] = {
        before: planClone.targetEnd,
        after: newTargetEnd,
      };
      planClone.targetEnd = newTargetEnd;
    }

    // Determine current position at effectiveFromDate
    // All items before effectiveFromDate remain locked
    let lastAchievedPosition = planClone.currentPosition;
    for (const d of dailyPlans) {
      if (d.date < effectiveFromDate && d.isHistorical && d.actualAchieved) {
        lastAchievedPosition = d.actualAchieved.unit.end;
      }
    }

    // Partition remaining units from the position right after the last
    // achieved verse to targetEnd — direction-aware, with consolidation days
    // and rolling minor revision preserved (same strategy as plan creation).
    const startForRemaining =
      (await this.nextPositionAfter(lastAchievedPosition, planClone)) ||
      lastAchievedPosition;

    const remainingUnits = await this.buildRemainingUnits(
      planClone,
      startForRemaining,
      lastAchievedPosition,
      null
    );

    // Re-assign future unhistorical days from effectiveFromDate
    let cursor = 0;
    for (const d of dailyPlans) {
      if (d.date >= effectiveFromDate && !d.isHistorical && !d.isLocked) {
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

    // Rebuild multi-level hierarchy
    this.rebuildSummaries(planClone);

    // Record teacher override in audit trail
    const overrideRecord: TeacherOverride = {
      id: `override_${Date.now()}`,
      timestamp: nowIso,
      teacherId,
      teacherName: teacherName || 'المعلم المعتمد',
      reason,
      reasonArabicText: reasonArabicText || 'تعديل المعلم المباشر لخطة الطالب',
      changes: changesRecord,
      effectiveFromDate,
    };
    planClone.teacherOverrides.unshift(overrideRecord);

    // Version update
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

  /**
   * Resolves the plan's effective revision direction — the plan-level field
   * wins, then the persisted revisionSettings snapshot, then the default
   * backward (newest-first) rolling used by all current stage templates.
   */
  private resolveRevisionDirection(plan: StudentQuranPlan): 'forward' | 'backward' {
    return plan.revisionDirection || plan.revisionSettings?.direction || 'backward';
  }

  /**
   * Builds the revision seed = fully memorized surahs up to the given
   * position (Auto Minor Revision) or the plan's fixed manual revision
   * range ordered by the plan's INDEPENDENT revision direction.
   * The current incomplete surah is never seeded — it only becomes
   * revision-eligible once fully memorized.
   */
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
      /* seed unavailable — revision rolls over new memorization only */
    }
    return [];
  }

  /**
   * Rebuilds the remaining future units from `fromPosition` to `targetEnd` using
   * the same strategy as plan creation (cumulative per-surah pacing +
   * consolidation days + rolling minor revision seeded from accumulated
   * memorized content). When `completedSurahEnd` marks a surah that was just
   * finished by the recorded achievement, its consolidation cycle is prepended —
   * the same rule the creation engine applies after every completed surah.
   */
  private async buildRemainingUnits(
    plan: StudentQuranPlan,
    fromPosition: QuranPosition,
    currentPosition: QuranPosition,
    completedSurahEnd: QuranPosition | null
  ): Promise<PlanningUnit[]> {
    const seed = await this.buildRevisionSeed(plan, currentPosition);
    const revisionPages = plan.revisionDailyPages ?? 1;
    const consolidationDays = plan.consolidationDaysPerSurah ?? 3;
    const revisionDirection = this.resolveRevisionDirection(plan);
    const revisionUnitKind = plan.revisionSettings?.unitType ?? 'page';
    const revisionUnitsPerWindow =
      revisionUnitKind === 'surah' ? plan.revisionSettings?.surahsPerDay ?? 1 : undefined;

    const units = await this.rangeCalculator.partitionSurahsWithCumulativePaceAndConsolidation(
      fromPosition,
      plan.targetEnd,
      plan.unitType,
      plan.dailyAmount,
      plan.direction,
      consolidationDays,
      revisionPages,
      seed,
      revisionDirection,
      revisionUnitKind,
      revisionUnitsPerWindow,
      plan.autoMinorRevisionMode === true,
      completedSurahEnd?.surahNumber
    );

    if (!completedSurahEnd || consolidationDays <= 0) return units;

    const surahAyahCount = getSurahAyahsCount(completedSurahEnd.surahNumber);
    if (surahAyahCount <= 0 || completedSurahEnd.ayahNumber < surahAyahCount) return units;

    const firstVerse = await this.provider.getAyah(completedSurahEnd.surahNumber, 1);
    const lastVerse = await this.provider.getAyah(completedSurahEnd.surahNumber, surahAyahCount);
    if (!firstVerse || !lastVerse) return units;

    // During the just-completed surah's own consolidation days it stays out of
    // the minor-revision pool — it becomes eligible right after consolidation,
    // matching the creation engine's staging rule.
    const acc: Ayah[] = seed.filter((v) => v.surahNumber !== completedSurahEnd.surahNumber);
    // Offset 0 targets the first window in the resolved revision direction
    // ('backward' walks the pool newest → oldest internally).
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

  /**
   * Direction-aware next position after `pos` within the plan's governed order.
   * Backward plans traverse surahs in the governed order (الفاتحة ثم الناس نزولاً)
   * while ayahs inside each surah still ascend.
   */
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
    const seq = getSurahsInRangeByDirection(pos.surahNumber, plan.targetEnd.surahNumber, 'backward');
    const idx = seq.findIndex((s) => s.number === pos.surahNumber);
    if (idx !== -1 && idx + 1 < seq.length) {
      const next = await this.provider.getAyah(seq[idx + 1].number, 1);
      if (next) {
        return { surahNumber: next.surahNumber, ayahNumber: next.ayahNumber, globalIndex: next.globalIndex };
      }
    }
    return null;
  }

  /**
   * True when `pos` has reached or passed the plan target end in the plan's
   * governed direction.
   */
  private reachedTargetEnd(pos: QuranPosition, plan: StudentQuranPlan): boolean {
    const posIdx = getSurahSequenceIndex(pos.surahNumber, plan.direction);
    const endIdx = getSurahSequenceIndex(plan.targetEnd.surahNumber, plan.direction);
    if (posIdx !== endIdx) return posIdx > endIdx;
    return pos.ayahNumber >= plan.targetEnd.ayahNumber;
  }

  /**
   * Copies a regenerated unit onto a future plan day, carrying all metadata
   * (consolidation flags, rolling revision label/pages) so recalculated days
   * keep the same shape as freshly generated ones.
   */
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

  /**
   * Reconstructs Weekly, Monthly, and Term summaries from the canonical daily items
   */
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
      const totalUnits = days.filter((d) => d.targetUnit.totalAyahs > 0).length;
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
      totalWorkingDays: dailyPlans.length,
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
