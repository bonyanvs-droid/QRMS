import {
  QuranPosition,
  PlanningUnitType,
  PlanningUnit,
  Surah,
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
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { RangeCalculator } from './rangeCalculator';
import {
  generateWorkingDates,
  getDayOfWeekFromDate,
  getArabicDayName,
  computeWeekNumber,
  computeMonthNumber,
} from '../utils/dateUtils';
import { getSurahArabicName } from '../utils/positionFormatter';

export interface CreateRevisionPlanParams {
  studentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetStart: QuranPosition;
  targetEnd: QuranPosition;
  direction: 'forward' | 'backward';
  mode: 'pages' | 'surahs' | 'quarters' | 'hizb' | 'juz' | 'custom';
  dailyAmount: number; // e.g., 2 pages, or 2 surahs, or 1 quarter
  schedule: WorkingDaysSchedule;
  surahList?: number[]; // Specific surah numbers when revising custom surah set
  planId?: string;
}

export class QuranRevisionPlanningEngine {
  private rangeCalculator: RangeCalculator;

  constructor(private readonly provider: IQuranDataProvider) {
    this.rangeCalculator = new RangeCalculator(provider);
  }

  /**
   * Generates a comprehensive Quran revision plan supporting flexible modes:
   * By Surahs (e.g. Nas + Falaq on Sunday), by Pages (1, 2, 5 pages/day),
   * by Quarters, Hizbs, or Juzs, in either forward or backward order.
   */
  async createPlan(params: CreateRevisionPlanParams): Promise<StudentQuranPlan> {
    const planId = params.planId || `plan_rev_${params.studentId}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    let unitType: PlanningUnitType = 'page';
    let units: PlanningUnit[] = [];

    if (params.mode === 'surahs') {
      unitType = 'surah';
      units = await this.buildSurahRevisionUnits(
        params.targetStart,
        params.targetEnd,
        params.direction,
        params.dailyAmount,
        params.surahList
      );
    } else {
      // Maps mode to unitType
      switch (params.mode) {
        case 'quarters':
          unitType = 'quarter';
          break;
        case 'hizb':
          unitType = 'hizb';
          break;
        case 'juz':
          unitType = 'juz';
          break;
        case 'pages':
        default:
          unitType = 'page';
          break;
      }

      units = await this.rangeCalculator.partitionRangeIntoUnits(
        params.targetStart,
        params.targetEnd,
        unitType,
        params.dailyAmount
      );
    }

    if (units.length === 0) {
      throw new Error('تعذر تقسيم خطة المراجعة إلى وحدات صالحة.');
    }

    // 2. Generate working dates
    const workingDates = generateWorkingDates(params.startDate, params.endDate, params.schedule);
    if (workingDates.length === 0) {
      throw new Error('لا توجد أيام عمل متاحة في الفترة المحددة.');
    }

    const totalUnits = units.length;
    const availableWorkingDays = workingDates.length;
    const isAtRisk = totalUnits > availableWorkingDays;

    let targetAtRiskDiagnostic: TargetAtRiskDiagnostic | undefined = undefined;

    // Snapshot of original target
    const firstUnit = units[0];
    const lastUnit = units[units.length - 1];
    const totalAyahs = units.reduce((acc, u) => acc + u.totalAyahs, 0);

    const startSurah = await this.provider.getSurah(firstUnit.start.surahNumber);
    const endSurah = await this.provider.getSurah(lastUnit.end.surahNumber);

    const modeArabic =
      params.mode === 'surahs'
        ? 'مراجعة بالسور'
        : params.mode === 'pages'
          ? 'مراجعة بالصفحات'
          : params.mode === 'quarters'
            ? 'مراجعة بالأرباع'
            : 'مراجعة بالأجزاء والأحزاب';

    const startName = startSurah?.arabicName || getSurahArabicName(firstUnit.start.surahNumber);
    const endName = endSurah?.arabicName || getSurahArabicName(lastUnit.end.surahNumber);
    const displayTarget = `${modeArabic}: من سورة ${startName} إلى سورة ${endName}`;

    const originalSnapshot: OriginalTargetSnapshot = {
      targetStart: params.targetStart,
      targetEnd: params.targetEnd,
      direction: params.direction,
      unitType,
      dailyAmount: params.dailyAmount,
      totalUnits,
      totalAyahs,
      expectedEndDate:
        totalUnits <= workingDates.length ? workingDates[totalUnits - 1] : params.endDate,
      createdAt: nowIso,
      displayTarget,
    };

    if (isAtRisk) {
      const deficitUnits = totalUnits - availableWorkingDays;
      const requiredDailyAmount = Math.ceil(totalUnits / availableWorkingDays);

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
        projectedDeficitDays: deficitUnits,
        warningMessage: `مقرر المراجعة (${totalUnits} ورد) يتجاوز عدد الأيام المتاحة (${availableWorkingDays} يوم). سيتبقى عجز ${deficitUnits} ورد.`,
        actionableRecommendations: [
          `رفع وتيرة المراجعة إلى ${requiredDailyAmount} وحدة مراجعة يومياً.`,
          `إضافة أيام إضافية أسبوعياً لمراجعة الأوراد المتأخرة.`,
          `إعادة تدوير سور المراجعة وتمديد تاريخ الانتهاء.`,
        ],
      };
    }

    // 3. Construct DailyPlanItems
    const dailyPlans: DailyPlanItem[] = [];

    for (let i = 0; i < workingDates.length; i++) {
      const dateStr = workingDates[i];
      const dayOfWeek = getDayOfWeekFromDate(dateStr);
      const dayName = getArabicDayName(dateStr);
      const weekNumber = computeWeekNumber(dateStr, params.startDate);
      const monthNumber = computeMonthNumber(dateStr, params.startDate);

      const unitForDay: PlanningUnit =
        i < units.length
          ? units[i]
          : {
              type: unitType,
              start: units[units.length - 1].end,
              end: units[units.length - 1].end,
              totalAyahs: 0,
              displayLabel: 'يوم تثبيت ومراجعة شاملة حرة (أكمل الطالب دورة المراجعة)',
            };

      dailyPlans.push({
        id: `day_${planId}_${i + 1}_${dateStr}`,
        date: dateStr,
        dayOfWeek,
        dayName,
        weekNumber,
        monthNumber,
        itemIndex: i + 1,
        planType: 'revision',
        unitType,
        targetUnit: unitForDay,
        isHistorical: false,
        isLocked: false,
        status: 'pending',
      });
    }

    // 4. Synthesize WeeklyPlanSummaries
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
      const weekAyahs = days.reduce((sum, d) => sum + d.targetUnit.totalAyahs, 0);
      const weekUnits = days.filter((d) => d.targetUnit.totalAyahs > 0).length;

      weeklyPlans.push({
        weekNumber: wNum,
        startDate: days[0].date,
        endDate: days[days.length - 1].date,
        plannedStart: firstDayUnit.start,
        plannedEnd: lastDayUnit.end,
        displayLabel: `أسبوع المراجعة ${wNum} (${weekAyahs} آية)`,
        totalAyahs: weekAyahs,
        totalUnits: weekUnits,
        days,
        isCompleted: false,
        completedDaysCount: 0,
      });
    }

    // 5. Synthesize MonthlyPlanSummaries
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
      const mAyahs = weeks.reduce((sum, w) => sum + w.totalAyahs, 0);
      const mUnits = weeks.reduce((sum, w) => sum + w.totalUnits, 0);

      monthlyPlans.push({
        monthNumber: mNum,
        monthName: `الشهر ${mNum}`,
        startDate: firstWeek.startDate,
        endDate: lastWeek.endDate,
        plannedStart: firstWeek.plannedStart,
        plannedEnd: lastWeek.plannedEnd,
        displayLabel: `شهر المراجعة ${mNum} (${mAyahs} آية)`,
        totalAyahs: mAyahs,
        totalUnits: mUnits,
        weeks,
      });
    }

    // 6. TermPlanSummary
    const termPlan: TermPlanSummary = {
      termName: 'خطة المراجعة والتثبيت للفصل الدراسي',
      startDate: params.startDate,
      endDate: params.endDate,
      startPosition: params.targetStart,
      endPosition: params.targetEnd,
      displayLabel: displayTarget,
      totalAyahs,
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

    return {
      id: planId,
      studentId: params.studentId,
      planType: 'revision',
      startDate: params.startDate,
      endDate: params.endDate,
      targetStart: params.targetStart,
      targetEnd: params.targetEnd,
      direction: params.direction,
      unitType,
      dailyAmount: params.dailyAmount,
      schedule: params.schedule,
      originalTarget: originalSnapshot,
      currentPosition: params.targetStart,
      generatedPlan: unifiedOutput,
      planVersion: 1,
      versionHistory: [
        {
          version: 1,
          createdAt: nowIso,
          createdBy: 'revision_engine',
          reason: 'إنشاء خطة المراجعة الأصلية',
          dailyAmount: params.dailyAmount,
          workingDays: [...params.schedule.workingDays],
          remainingUnitsAtVersion: totalUnits,
        },
      ],
      status: isAtRisk ? 'at_risk' : 'active',
      targetAtRiskDiagnostic,
      teacherOverrides: [],
      recalculationHistory: [],
      revisionSettings: {
        mode: params.mode,
        surahList: params.surahList,
        surahsPerDay: params.dailyAmount,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  /**
   * Helper to build revision units specifically by whole Surahs.
   * Groups surahs in chunks of `surahsPerDay` (e.g. 2 surahs / day).
   */
  private async buildSurahRevisionUnits(
    targetStart: QuranPosition,
    targetEnd: QuranPosition,
    direction: 'forward' | 'backward',
    surahsPerDay: number,
    customSurahList?: number[]
  ): Promise<PlanningUnit[]> {
    let surahNumbers: number[] = [];

    if (customSurahList && customSurahList.length > 0) {
      surahNumbers = [...customSurahList];
    } else {
      const minS = Math.min(targetStart.surahNumber, targetEnd.surahNumber);
      const maxS = Math.max(targetStart.surahNumber, targetEnd.surahNumber);

      if (direction === 'forward') {
        for (let s = minS; s <= maxS; s++) surahNumbers.push(s);
      } else {
        // e.g. An-Nas (114) down to Al-Ghashiyah (88)
        for (let s = maxS; s >= minS; s--) surahNumbers.push(s);
      }
    }

    const chunkSize = Math.max(1, surahsPerDay);
    const units: PlanningUnit[] = [];

    for (let i = 0; i < surahNumbers.length; i += chunkSize) {
      const chunk = surahNumbers.slice(i, i + chunkSize);
      const surahObjects: Surah[] = [];

      for (const sNum of chunk) {
        const s = await this.provider.getSurah(sNum);
        if (s) surahObjects.push(s);
      }

      if (surahObjects.length === 0) continue;

      const firstSurah = surahObjects[0];
      const lastSurah = surahObjects[surahObjects.length - 1];

      const firstAyah = await this.provider.getAyah(firstSurah.surahNumber, 1);
      const lastAyah = await this.provider.getAyah(lastSurah.surahNumber, lastSurah.ayahCount);

      if (!firstAyah || !lastAyah) continue;

      const totalAyahs = surahObjects.reduce((sum, s) => sum + s.ayahCount, 0);
      const displayLabel = surahObjects.map((s) => `سورة ${s.arabicName}`).join(' + ');

      units.push({
        type: 'surah',
        start: {
          surahNumber: firstSurah.surahNumber,
          ayahNumber: 1,
          globalIndex: firstAyah.globalIndex,
        },
        end: {
          surahNumber: lastSurah.surahNumber,
          ayahNumber: lastSurah.ayahCount,
          globalIndex: lastAyah.globalIndex,
        },
        totalAyahs,
        displayLabel,
        pageStart: firstAyah.pageNumber,
        pageEnd: lastAyah.pageNumber,
      });
    }

    return units;
  }
}
