import {
  QuranPosition,
  PlanningUnitType,
  PlanningUnit,
} from '../types';
import {
  StudentQuranPlan,
  WorkingDaysSchedule,
  DailyPlanItem,
  WeeklyPlanSummary,
  MonthlyPlanSummary,
  TermPlanSummary,
  UnifiedPlanOutput,
  OriginalTargetSnapshot,
  TargetAtRiskDiagnostic,
} from '../types/plan';
import { Ayah } from '../types';
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { getSurahAyahsCount } from '../../utils/quranMetadata';
import { RangeCalculator } from './rangeCalculator';
import {
  generateWorkingDates,
  getDayOfWeekFromDate,
  getArabicDayName,
  computeWeekNumber,
  computeMonthNumber,
} from '../utils/dateUtils';
import { formatQuranRange } from '../utils/positionFormatter';

export interface CreateMemorizationPlanParams {
  studentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetStart: QuranPosition;
  targetEnd: QuranPosition;
  direction: 'forward' | 'backward';
  unitType: PlanningUnitType;
  dailyAmount: number;
  revisionDailyPages?: number;
  consolidationDaysPerSurah?: number;
  schedule: WorkingDaysSchedule;
  planId?: string;
  /**
   * Auto Minor Revision: seed the rolling revision cycle with the student's
   * prior memorization (before plan start). Defaults to ON for new plans.
   */
  autoMinorRevisionMode?: boolean;
}

export class QuranMemorizationPlanningEngine {
  private rangeCalculator: RangeCalculator;

  constructor(private readonly provider: IQuranDataProvider) {
    this.rangeCalculator = new RangeCalculator(provider);
  }

  /**
   * Generates a fully unified memorization plan with multi-level summaries
   * (Term, Monthly, Weekly, Daily) derived strictly from the same canonical source.
   */
  async createPlan(params: CreateMemorizationPlanParams): Promise<StudentQuranPlan> {
    const planId = params.planId || `plan_mem_${params.studentId}_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const consolidationDays = params.consolidationDaysPerSurah !== undefined ? params.consolidationDaysPerSurah : 3;
    const revisionDailyPages = params.revisionDailyPages !== undefined ? params.revisionDailyPages : 1;
    const autoMinorRevision = params.autoMinorRevisionMode !== false; // ON by default for newly created plans

    // Seed the revision pool with prior memorization (before plan start) when Auto Minor
    // Revision is enabled — prior + new memorization form one revision set.
    let priorMemorizedVerses: Ayah[] = [];
    if (autoMinorRevision) {
      const priorStart: QuranPosition =
        params.direction === 'backward'
          ? { surahNumber: 114, ayahNumber: 1 }
          : { surahNumber: 1, ayahNumber: 1 };
      let priorEnd: QuranPosition | null = null;
      if (params.targetStart.ayahNumber > 1) {
        priorEnd = {
          surahNumber: params.targetStart.surahNumber,
          ayahNumber: params.targetStart.ayahNumber - 1,
        };
      } else if (params.direction === 'backward' && params.targetStart.surahNumber < 114) {
        priorEnd = {
          surahNumber: params.targetStart.surahNumber + 1,
          ayahNumber: getSurahAyahsCount(params.targetStart.surahNumber + 1),
        };
      } else if (params.direction === 'forward' && params.targetStart.surahNumber > 1) {
        priorEnd = {
          surahNumber: params.targetStart.surahNumber - 1,
          ayahNumber: getSurahAyahsCount(params.targetStart.surahNumber - 1),
        };
      }
      if (priorEnd) {
        try {
          priorMemorizedVerses = await this.provider.getAyahsInRange(
            priorStart,
            priorEnd,
            params.direction
          );
        } catch {
          priorMemorizedVerses = [];
        }
      }
    }

    // 1. Resolve verses and structural metrics
    const verses = await this.provider.getAyahsInRange(params.targetStart, params.targetEnd, params.direction);
    if (verses.length === 0) {
      throw new Error('النطاق القرآني المحدد غير صالح أو لا يحتوي على آيات.');
    }

    // 2. Partition into discrete planning units using Surah-isolated cumulative pacing + 3-day consolidation
    const units = await this.rangeCalculator.partitionSurahsWithCumulativePaceAndConsolidation(
      params.targetStart,
      params.targetEnd,
      params.unitType,
      params.dailyAmount,
      params.direction,
      consolidationDays,
      revisionDailyPages,
      priorMemorizedVerses
    );

    if (units.length === 0) {
      throw new Error('فشل تقسيم النطاق القرآني إلى وحدات حفظ.');
    }

    // 3. Generate working dates
    const workingDates = generateWorkingDates(params.startDate, params.endDate, params.schedule);
    if (workingDates.length === 0) {
      throw new Error('لا توجد أيام عمل في النطاق الزمني المحدد وفق جدول الأيام.');
    }

    // 4. Calculate pace and check if target is at risk
    const totalUnits = units.length;
    const availableWorkingDays = workingDates.length;
    const isAtRisk = totalUnits > availableWorkingDays;

    let targetAtRiskDiagnostic: TargetAtRiskDiagnostic | undefined = undefined;

    // Snapshot of the original target
    const startVerse = verses[0];
    const endVerse = verses[verses.length - 1];

    const displayTarget = formatQuranRange(startVerse, endVerse, { includeSurahWord: true });

    const originalSnapshot: OriginalTargetSnapshot = {
      targetStart: params.targetStart,
      targetEnd: params.targetEnd,
      direction: params.direction,
      unitType: params.unitType,
      dailyAmount: params.dailyAmount,
      revisionDailyPages,
      totalUnits,
      totalAyahs: verses.length,
      expectedEndDate:
        totalUnits <= workingDates.length ? workingDates[totalUnits - 1] : params.endDate,
      createdAt: nowIso,
      displayTarget,
    };

    if (isAtRisk) {
      const deficitUnits = totalUnits - availableWorkingDays;
      const requiredDailyAmount = Math.ceil(totalUnits / availableWorkingDays);
      const projectedDeficitDays = deficitUnits;

      targetAtRiskDiagnostic = {
        isAtRisk: true,
        originalTarget: originalSnapshot,
        currentPosition: params.targetStart,
        completedUnits: 0,
        remainingUnits: totalUnits,
        remainingWorkingDays: availableWorkingDays,
        requiredDailyAmount,
        currentDailyAmount: params.dailyAmount,
        deficitUnits,
        projectedDeficitDays,
        warningMessage: `المستهدف (${totalUnits} يوم/وحدة) يتجاوز عدد أيام الدراسة المتاحة (${availableWorkingDays} يوم). سيتبقى عجز بمقدار ${deficitUnits} وحدة عند نهاية الفترة.`,
        actionableRecommendations: [
          `زيادة معدل الإنجاز اليومي أو تعديل النطاق الدراسي لتغطية الخطة بالكامل.`,
          `إضافة أيام دراسة إضافية للجدول الأسبوعي لتغطية ${projectedDeficitDays} يوماً دراسياً مفقوداً.`,
          `تمديد تاريخ نهاية الفصل الدراسي لتمكين إتمام كامل المستهدف ودورات التثبيت (3 أيام لكل سورة).`,
        ],
      };
    }

    // Format revision helper
    const formatRevisionLabel = (pages: number): string => {
      if (pages === 0.5) return 'مراجعة: نصف صفحة';
      if (pages === 1) return 'مراجعة: صفحة واحدة';
      if (pages === 2) return 'مراجعة: صفحتان';
      return `مراجعة: ${pages} صفحات`;
    };
    const defaultRevDisplay = formatRevisionLabel(revisionDailyPages);

    // 5. Construct DailyPlanItems
    const dailyPlans: DailyPlanItem[] = [];

    for (let i = 0; i < workingDates.length; i++) {
      const dateStr = workingDates[i];
      const dayOfWeek = getDayOfWeekFromDate(dateStr);
      const dayName = getArabicDayName(dateStr);
      const weekNumber = computeWeekNumber(dateStr, params.startDate);
      const monthNumber = computeMonthNumber(dateStr, params.startDate);

      const hasUnit = i < units.length;
      const unitForDay: PlanningUnit = hasUnit
        ? units[i]
        : {
            type: params.unitType,
            start: units[units.length - 1].end,
            end: units[units.length - 1].end,
            totalAyahs: 0,
            displayLabel: 'يوم تثبيت ومراجعة عامة (تم إنجاز المقرر)',
            isConsolidation: false,
            revisionPages: revisionDailyPages,
            revisionDisplay: defaultRevDisplay,
          };

      const isConsolidation = Boolean(unitForDay.isConsolidation);

      dailyPlans.push({
        id: `day_${planId}_${i + 1}_${dateStr}`,
        date: dateStr,
        dayOfWeek,
        dayName,
        weekNumber,
        monthNumber,
        itemIndex: i + 1,
        planType: isConsolidation ? 'revision' : 'memorization',
        dayType: isConsolidation ? 'consolidation' : hasUnit ? 'memorization' : 'general_revision',
        unitType: params.unitType,
        targetUnit: unitForDay,
        isConsolidationDay: isConsolidation,
        consolidationDayIndex: unitForDay.consolidationDayIndex,
        consolidationSurahNumber: unitForDay.consolidationSurahNumber,
        revisionPagesAmount: unitForDay.revisionPages !== undefined ? unitForDay.revisionPages : revisionDailyPages,
        revisionDisplayLabel: unitForDay.revisionDisplay || defaultRevDisplay,
        revisionPageStart: unitForDay.revisionPageStart,
        revisionPageEnd: unitForDay.revisionPageEnd,
        isHistorical: false,
        isLocked: false,
        status: 'pending',
      });
    }

    // 6. Synthesize WeeklyPlanSummaries
    const weeklyMap = new Map<number, DailyPlanItem[]>();
    for (const item of dailyPlans) {
      const list = weeklyMap.get(item.weekNumber) || [];
      list.push(item);
      weeklyMap.set(item.weekNumber, list);
    }

    const weeklyPlans: WeeklyPlanSummary[] = [];
    for (const [wNum, days] of weeklyMap.entries()) {
      const firstDayUnit = days[0].targetUnit;
      const lastDayUnit = days[days.length - 1].targetUnit;
      const totalAyahs = days.reduce((sum, d) => sum + d.targetUnit.totalAyahs, 0);
      const totalUnits = days.filter((d) => d.targetUnit.totalAyahs > 0).length;

      weeklyPlans.push({
        weekNumber: wNum,
        startDate: days[0].date,
        endDate: days[days.length - 1].date,
        plannedStart: firstDayUnit.start,
        plannedEnd: lastDayUnit.end,
        displayLabel: `الأسبوع ${wNum} (${totalAyahs} آية)`,
        totalAyahs,
        totalUnits,
        days,
        isCompleted: false,
        completedDaysCount: 0,
      });
    }

    // 7. Synthesize MonthlyPlanSummaries
    const monthlyMap = new Map<number, WeeklyPlanSummary[]>();
    for (const w of weeklyPlans) {
      const monthNum = computeMonthNumber(w.startDate, params.startDate);
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
        displayLabel: `الشهر ${mNum} (${totalAyahs} آية - ${weeks.length} أسابيع)`,
        totalAyahs,
        totalUnits,
        weeks,
      });
    }

    // 8. Synthesize TermPlanSummary
    const termPlan: TermPlanSummary = {
      termName: 'خطة الحفظ للفصل الدراسي',
      startDate: params.startDate,
      endDate: params.endDate,
      startPosition: params.targetStart,
      endPosition: params.targetEnd,
      displayLabel: displayTarget,
      totalAyahs: verses.length,
      totalUnits,
      totalWorkingDays: availableWorkingDays,
      direction: params.direction,
    };

    const unifiedOutput: UnifiedPlanOutput = {
      termPlan,
      monthlyPlans,
      weeklyPlans,
      dailyPlans,
    };

    const studentPlan: StudentQuranPlan = {
      id: planId,
      studentId: params.studentId,
      planType: 'memorization',
      startDate: params.startDate,
      endDate: params.endDate,
      targetStart: params.targetStart,
      targetEnd: params.targetEnd,
      direction: params.direction,
      unitType: params.unitType,
      dailyAmount: params.dailyAmount,
      revisionDailyPages,
      consolidationDaysPerSurah: consolidationDays,
      autoMinorRevisionMode: autoMinorRevision,
      schedule: params.schedule,
      originalTarget: originalSnapshot,
      currentPosition: params.targetStart,
      generatedPlan: unifiedOutput,
      planVersion: 1,
      versionHistory: [
        {
          version: 1,
          createdAt: nowIso,
          createdBy: 'system_engine',
          reason: 'إنشاء الخطة الأصلية الأولية',
          dailyAmount: params.dailyAmount,
          workingDays: [...params.schedule.workingDays],
          remainingUnitsAtVersion: totalUnits,
        },
      ],
      status: isAtRisk ? 'at_risk' : 'active',
      targetAtRiskDiagnostic,
      teacherOverrides: [],
      recalculationHistory: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return studentPlan;
  }
}
