import {
  QuranPosition,
  PlanningUnit,
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
  getNextWorkingDay,
  getDayOfWeekFromDate,
  getArabicDayName,
  computeWeekNumber,
  computeMonthNumber,
} from '../utils/dateUtils';

export interface RecordAchievementParams {
  plan: StudentQuranPlan;
  dayDate: string; // YYYY-MM-DD
  status: 'completed' | 'partial' | 'overachieved' | 'absent' | 'excused' | 'unrecited';
  actualEndPosition?: QuranPosition; // Position reached, if any
  recordedBy: string;
  evaluation?: 'excellent' | 'very_good' | 'good' | 'needs_practice';
  notes?: string;
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
    const dailyPlans = planClone.generatedPlan.dailyPlans;

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
        actualEndPosition
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
      planClone.targetEnd
    );

    let nextFutureStart: QuranPosition | null = null;
    let isTargetComplete = false;

    if (status === 'absent' || status === 'excused' || status === 'unrecited') {
      // The day's portion was unrecited; future resumes from the start of the unrecited unit
      const unrecitedStart = targetDay.targetUnit.start;
      const idx = allPlannedVerses.findIndex(
        (v) =>
          v.surahNumber === unrecitedStart.surahNumber &&
          v.ayahNumber === unrecitedStart.ayahNumber
      );
      if (idx !== -1) {
        const v = allPlannedVerses[idx];
        nextFutureStart = {
          surahNumber: v.surahNumber,
          ayahNumber: v.ayahNumber,
          globalIndex: v.globalIndex,
        };
      } else {
        nextFutureStart = unrecitedStart;
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
        // Fallback if not found directly
        const nextGlobalIndex =
          planClone.direction === 'forward'
            ? achievedEnd.globalIndex! + 1
            : achievedEnd.globalIndex! - 1;
        const nextAyah = await this.provider.getAyahByGlobalIndex(nextGlobalIndex);
        if (nextAyah) {
          nextFutureStart = {
            surahNumber: nextAyah.surahNumber,
            ayahNumber: nextAyah.ayahNumber,
            globalIndex: nextAyah.globalIndex,
          };
        }
      }
    }

    // 4. Partition remaining target range for future working days
    let remainingUnits: PlanningUnit[] = [];
    if (nextFutureStart && !isTargetComplete) {
      remainingUnits = await this.rangeCalculator.partitionRangeIntoUnits(
        nextFutureStart,
        planClone.targetEnd,
        planClone.unitType,
        planClone.dailyAmount
      );
    }

    // 5. Update only FUTURE days (index > dayIndex)
    let unitCursor = 0;
    for (let i = dayIndex + 1; i < dailyPlans.length; i++) {
      const futureDay = dailyPlans[i];
      if (futureDay.isHistorical || futureDay.isLocked) {
        continue; // Strictly preserve any pre-existing historical records
      }

      if (unitCursor < remainingUnits.length) {
        futureDay.targetUnit = remainingUnits[unitCursor];
        futureDay.status = 'pending';
        unitCursor++;
      } else {
        // Target achieved early or empty buffer days
        futureDay.targetUnit = {
          type: planClone.unitType,
          start: planClone.targetEnd,
          end: planClone.targetEnd,
          totalAyahs: 0,
          displayLabel: 'يوم تثبيت ومراجعة (تم إنجاز المقرر)',
        };
        futureDay.status = 'pending';
      }
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
        : status === 'absent'
          ? 'absence'
          : status === 'partial'
            ? 'achievement_deficit'
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
    const dailyPlans = planClone.generatedPlan.dailyPlans;

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

    // Partition remaining units from lastAchievedPosition to targetEnd
    const nextGlobalIndex =
      planClone.direction === 'forward'
        ? lastAchievedPosition.globalIndex + 1
        : lastAchievedPosition.globalIndex - 1;

    const nextAyah = await this.provider.getAyahByGlobalIndex(nextGlobalIndex);
    const startForRemaining = nextAyah
      ? {
          surahNumber: nextAyah.surahNumber,
          ayahNumber: nextAyah.ayahNumber,
          globalIndex: nextAyah.globalIndex,
        }
      : lastAchievedPosition;

    const remainingUnits = await this.rangeCalculator.partitionRangeIntoUnits(
      startForRemaining,
      planClone.targetEnd,
      planClone.unitType,
      planClone.dailyAmount
    );

    // Re-assign future unhistorical days from effectiveFromDate
    let cursor = 0;
    for (const d of dailyPlans) {
      if (d.date >= effectiveFromDate && !d.isHistorical && !d.isLocked) {
        if (cursor < remainingUnits.length) {
          d.targetUnit = remainingUnits[cursor];
          cursor++;
        } else {
          d.targetUnit = {
            type: planClone.unitType,
            start: planClone.targetEnd,
            end: planClone.targetEnd,
            totalAyahs: 0,
            displayLabel: 'تثبيت ومراجعة',
          };
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
