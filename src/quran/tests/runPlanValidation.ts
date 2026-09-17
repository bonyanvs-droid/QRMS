import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../services/memorizationEngine';
import { QuranRevisionPlanningEngine } from '../services/revisionEngine';
import { PlanRecalculationService } from '../services/recalculationService';
import { RangeCalculator } from '../services/rangeCalculator';

async function runPlanValidation() {
  console.log('================================================================');
  console.log('   UNIVERSAL QURAN PLANNING ENGINE - 20 ACCEPTANCE TESTS        ');
  console.log('================================================================\n');

  const provider = new BundledQuranProvider();
  const rangeCalc = new RangeCalculator(provider);
  const memEngine = new QuranMemorizationPlanningEngine(provider);
  const revEngine = new QuranRevisionPlanningEngine(provider);
  const recalcService = new PlanRecalculationService(provider);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, title: string, details?: string) {
    if (condition) {
      console.log(`[PASS] Test ${testNum.toString().padStart(2, '0')}: ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${testNum.toString().padStart(2, '0')}: ${title}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // 1. Flexible Student Plan Model
  // -------------------------------------------------------------
  const p1 = await memEngine.createPlan({
    studentId: 'std_01',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    targetStart: { surahNumber: 114, ayahNumber: 1 },
    targetEnd: { surahNumber: 112, ayahNumber: 4 },
    direction: 'backward',
    unitType: 'ayah',
    dailyAmount: 2,
    schedule: { workingDays: [0, 1, 2, 3] }, // Sun to Wed
  });

  assert(
    p1.studentId === 'std_01' &&
      p1.originalTarget !== undefined &&
      p1.currentPosition !== undefined &&
      p1.generatedPlan !== undefined &&
      p1.planVersion === 1 &&
      Array.isArray(p1.versionHistory) &&
      Array.isArray(p1.teacherOverrides),
    1,
    'هيكل خطة الطالب المرنة (Student Quran Plan Model) مستوفٍ لجميع الحقول والمصفوفات'
  );

  // -------------------------------------------------------------
  // 2. Separation of Original Target vs Current vs Historical
  // -------------------------------------------------------------
  assert(
    p1.originalTarget.targetStart.surahNumber === 114 &&
      p1.originalTarget.targetEnd.surahNumber === 112 &&
      p1.originalTarget.totalUnits > 0 &&
      p1.currentPosition.surahNumber === 114,
    2,
    'الفصل الدقيق بين المستهدف الأصلي (Original Target) والموقع الحالي (Current Position)'
  );

  // -------------------------------------------------------------
  // 3. Immutability of Historical Plan
  // -------------------------------------------------------------
  const day0 = p1.generatedPlan.dailyPlans[0];
  const day0Date = day0.date;
  const originalDay0Unit = { ...day0.targetUnit };

  const p1Updated = await recalcService.recordDailyAchievement({
    plan: p1,
    dayDate: day0Date,
    status: 'completed',
    recordedBy: 'المعلم أحمد',
    evaluation: 'excellent',
  });

  const updatedDay0 = p1Updated.generatedPlan.dailyPlans[0];
  assert(
    updatedDay0.isHistorical === true &&
      updatedDay0.isLocked === true &&
      updatedDay0.status === 'completed' &&
      updatedDay0.date === day0Date &&
      updatedDay0.targetUnit.displayLabel === originalDay0Unit.displayLabel,
    3,
    'حرمة وثبات السجل التاريخي (Historical Plan is Strictly Immutable)'
  );

  // -------------------------------------------------------------
  // 4. Future Plan Recalculation
  // -------------------------------------------------------------
  const day1Before = p1.generatedPlan.dailyPlans[1];
  const day1After = p1Updated.generatedPlan.dailyPlans[1];
  assert(
    day1After.isHistorical === false &&
      day1After.isLocked === false &&
      p1Updated.currentPosition.globalIndex === originalDay0Unit.end.globalIndex,
    4,
    'إعادة جدولة الأيام المستقبلية بمرونة انطلاقاً من اليوم التالي لإنجاز الطالب'
  );

  // -------------------------------------------------------------
  // 5. Unit Partition: Ayah chunking
  // -------------------------------------------------------------
  const ayahUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 114, ayahNumber: 1 },
    { surahNumber: 114, ayahNumber: 6 },
    'ayah',
    2
  );
  assert(
    ayahUnits.length === 3 &&
      ayahUnits[0].totalAyahs === 2 &&
      ayahUnits[1].totalAyahs === 2 &&
      ayahUnits[2].totalAyahs === 2,
    5,
    'تقسيم الآيات بدقة إلى وحدات محددة (Ayah Chunking: 2 آيات لكل وحدة)'
  );

  // -------------------------------------------------------------
  // 6. Unit Partition: Half-Page chunking
  // -------------------------------------------------------------
  const halfPageUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 1, ayahNumber: 1 },
    { surahNumber: 1, ayahNumber: 7 },
    'half_page',
    1
  );
  assert(
    halfPageUnits.length === 2 &&
      halfPageUnits[0].type === 'half_page' &&
      halfPageUnits[0].displayLabel.includes('النصف الأول') &&
      halfPageUnits[1].displayLabel.includes('النصف الثاني'),
    6,
    'تقسيم النصف صفحة الموثوق (Reliable Half-Page Partitioning - بدون أسطر وهمية)'
  );

  // -------------------------------------------------------------
  // 7. Unit Partition: Full Page chunking (1, 2, 5 pages)
  // -------------------------------------------------------------
  const pageUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 1, ayahNumber: 1 },
    { surahNumber: 2, ayahNumber: 25 },
    'page',
    2 // 2 pages per chunk
  );
  assert(
    pageUnits.length > 0 && pageUnits[0].type === 'page' && pageUnits[0].pageStart === 1,
    7,
    'تقسيم الصفحات الكاملة بمجموعات مرنة (Full Page Chunking)'
  );

  // -------------------------------------------------------------
  // 8. Unit Partition: Whole Surah chunking
  // -------------------------------------------------------------
  const surahUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 112, ayahNumber: 1 },
    { surahNumber: 114, ayahNumber: 6 },
    'surah',
    1
  );
  assert(
    surahUnits.length === 3 &&
      surahUnits[0].type === 'surah' &&
      surahUnits[2].type === 'surah',
    8,
    'تقسيم السور الكاملة كوحدات تخطيطية مستقلة (Surah Planning Units)'
  );

  // -------------------------------------------------------------
  // 9. Unit Partition: Quarters (Rub al-Hizb)
  // -------------------------------------------------------------
  const quarterUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 1, ayahNumber: 1 },
    { surahNumber: 2, ayahNumber: 74 },
    'quarter',
    1
  );
  assert(
    quarterUnits.length >= 3 && quarterUnits[0].type === 'quarter',
    9,
    'تقسيم أرباع الأحزاب المعتمدة (Quarter / Rub al-Hizb Planning Units)'
  );

  // -------------------------------------------------------------
  // 10. Memorization Engine: Forward Direction
  // -------------------------------------------------------------
  const forwardMemPlan = await memEngine.createPlan({
    studentId: 'std_forward',
    startDate: '2026-09-01',
    endDate: '2026-10-15',
    targetStart: { surahNumber: 1, ayahNumber: 1 },
    targetEnd: { surahNumber: 2, ayahNumber: 50 },
    direction: 'forward',
    unitType: 'page',
    dailyAmount: 1,
    schedule: { workingDays: [0, 1, 2, 3, 4] },
  });
  assert(
    forwardMemPlan.direction === 'forward' &&
      forwardMemPlan.generatedPlan.dailyPlans[0].targetUnit.start.surahNumber === 1 &&
      forwardMemPlan.generatedPlan.dailyPlans[0].targetUnit.start.ayahNumber === 1,
    10,
    'محرك الحفظ: الاتجاه التصاعدي من البداية إلى النهاية (Forward Memorization)'
  );

  // -------------------------------------------------------------
  // 11. Memorization Engine: Backward Direction
  // -------------------------------------------------------------
  const backwardMemPlan = await memEngine.createPlan({
    studentId: 'std_backward',
    startDate: '2026-09-01',
    endDate: '2026-10-15',
    targetStart: { surahNumber: 114, ayahNumber: 1 },
    targetEnd: { surahNumber: 105, ayahNumber: 5 },
    direction: 'backward',
    unitType: 'ayah',
    dailyAmount: 3,
    schedule: { workingDays: [0, 1, 2, 3] },
  });
  assert(
    backwardMemPlan.direction === 'backward' &&
      backwardMemPlan.generatedPlan.dailyPlans[0].targetUnit.start.surahNumber === 114,
    11,
    'محرك الحفظ: الاتجاه التنازلي من قصار السور إلى كبارها (Backward Memorization)'
  );

  // -------------------------------------------------------------
  // 12. Multi-Level Plan Synthesis (Term, Month, Week, Day)
  // -------------------------------------------------------------
  const gPlan = backwardMemPlan.generatedPlan;
  assert(
    gPlan.termPlan !== undefined &&
      gPlan.monthlyPlans.length > 0 &&
      gPlan.weeklyPlans.length > 0 &&
      gPlan.dailyPlans.length > 0 &&
      gPlan.weeklyPlans[0].days.length > 0,
    12,
    'ربط وتكامل الخطة الشاملة عبر كافة المستويات (فصلي، شهري، أسبوعي، يومي)'
  );

  // -------------------------------------------------------------
  // 13. Configurable Working Days Schedule & Holidays
  // -------------------------------------------------------------
  const holiday = '2026-09-07';
  const customSchedPlan = await memEngine.createPlan({
    studentId: 'std_sched',
    startDate: '2026-09-06', // Sunday
    endDate: '2026-09-15',
    targetStart: { surahNumber: 114, ayahNumber: 1 },
    targetEnd: { surahNumber: 113, ayahNumber: 5 },
    direction: 'backward',
    unitType: 'ayah',
    dailyAmount: 1,
    schedule: {
      workingDays: [0, 1], // Sun, Mon
      holidays: [holiday], // Skip Monday 7th
    },
  });
  const schedDates = customSchedPlan.generatedPlan.dailyPlans.map((d) => d.date);
  assert(
    schedDates.includes('2026-09-06') &&
      !schedDates.includes(holiday) &&
      !schedDates.includes('2026-09-08'),
    13,
    'مرونة جدول أيام الدراسة الأسبوعية والعطلات المخصصة (Schedule & Holidays)'
  );

  // -------------------------------------------------------------
  // 14. Revision Engine: Separated from Memorization
  // -------------------------------------------------------------
  const revPlanPages = await revEngine.createPlan({
    studentId: 'std_rev_01',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    targetStart: { surahNumber: 1, ayahNumber: 1 },
    targetEnd: { surahNumber: 2, ayahNumber: 100 },
    direction: 'forward',
    mode: 'pages',
    dailyAmount: 2,
    schedule: { workingDays: [0, 1, 2, 3, 4] },
  });
  assert(
    revPlanPages.planType === 'revision' &&
      revPlanPages.unitType === 'page' &&
      revPlanPages.dailyAmount === 2,
    14,
    'محرك المراجعة المنفصل: مراجعة الصفحات المتعددة (Revision Engine by Pages)'
  );

  // -------------------------------------------------------------
  // 15. Revision Engine: By Surahs (e.g. 2 surahs / day)
  // -------------------------------------------------------------
  const revPlanSurahs = await revEngine.createPlan({
    studentId: 'std_rev_surahs',
    startDate: '2026-09-01',
    endDate: '2026-09-15',
    targetStart: { surahNumber: 114, ayahNumber: 1 },
    targetEnd: { surahNumber: 105, ayahNumber: 5 },
    direction: 'backward',
    mode: 'surahs',
    dailyAmount: 2, // 2 surahs per day
    schedule: { workingDays: [0, 1, 2, 3] },
  });
  const firstDayRev = revPlanSurahs.generatedPlan.dailyPlans[0];
  assert(
    firstDayRev.targetUnit.type === 'surah' &&
      firstDayRev.targetUnit.displayLabel.includes('+'),
    15,
    'المراجعة بالسور الكاملة: توزيع سور متعددة يومياً (مثل الناس + الفلق)'
  );

  // -------------------------------------------------------------
  // 16. Cross-Surah Transitions
  // -------------------------------------------------------------
  // Range spanning end of Surah 113 to beginning of Surah 114
  const crossMetrics = await rangeCalc.getMetrics(
    { surahNumber: 113, ayahNumber: 4 },
    { surahNumber: 114, ayahNumber: 3 }
  );
  assert(
    crossMetrics.ayahCount === 5 &&
      crossMetrics.start.globalIndex < crossMetrics.end.globalIndex,
    16,
    'الانتقال السلس عبر حدود السور (Cross-Surah Seamless Transition)'
  );

  // -------------------------------------------------------------
  // 17. Recalculation Trigger: Student Accelerates (Surplus)
  // -------------------------------------------------------------
  // Planned day 0 was 114:1 to 114:3, student finished whole surah 114:1 to 114:6
  const acceleratedPlan = await recalcService.recordDailyAchievement({
    plan: backwardMemPlan,
    dayDate: backwardMemPlan.generatedPlan.dailyPlans[0].date,
    status: 'overachieved',
    actualEndPosition: { surahNumber: 114, ayahNumber: 6, globalIndex: 6236 },
    recordedBy: 'المعلم صالح',
    notes: 'أنجز السورة كاملة بتميز فائق',
  });
  assert(
    acceleratedPlan.recalculationHistory.length === 1 &&
      acceleratedPlan.recalculationHistory[0].trigger === 'achievement_surplus' &&
      acceleratedPlan.planVersion === 2,
    17,
    'إعادة الحساب التلقائي عند تسارع إنجاز الطالب وتجاوز المقرر (Surplus Trigger)'
  );

  // -------------------------------------------------------------
  // 18. Recalculation Trigger: Student Falls Behind (Absence / Deficit)
  // -------------------------------------------------------------
  const absentPlan = await recalcService.recordDailyAchievement({
    plan: backwardMemPlan,
    dayDate: backwardMemPlan.generatedPlan.dailyPlans[0].date,
    status: 'absent',
    recordedBy: 'المعلم صالح',
    notes: 'غياب بدون عذر',
  });
  assert(
    absentPlan.generatedPlan.dailyPlans[0].status === 'absent' &&
      absentPlan.recalculationHistory[0].trigger === 'absence' &&
      absentPlan.originalTarget.totalAyahs === backwardMemPlan.originalTarget.totalAyahs,
    18,
    'تسجيل غياب أو تعثر الطالب مع صيانة المستهدف الأصلي ثابتاً دون تقليصه سراً'
  );

  // -------------------------------------------------------------
  // 19. Target At Risk Diagnostic
  // -------------------------------------------------------------
  const atRiskPlan = await memEngine.createPlan({
    studentId: 'std_tight',
    startDate: '2026-09-01',
    endDate: '2026-09-04', // 3 working days
    targetStart: { surahNumber: 114, ayahNumber: 1 },
    targetEnd: { surahNumber: 90, ayahNumber: 20 }, // 100+ ayahs!
    direction: 'backward',
    unitType: 'ayah',
    dailyAmount: 2,
    schedule: { workingDays: [0, 1, 2, 3] },
  });
  assert(
    atRiskPlan.status === 'at_risk' &&
      atRiskPlan.targetAtRiskDiagnostic !== undefined &&
      atRiskPlan.targetAtRiskDiagnostic.isAtRisk === true &&
      atRiskPlan.targetAtRiskDiagnostic.deficitUnits > 0 &&
      atRiskPlan.targetAtRiskDiagnostic.actionableRecommendations.length >= 3,
    19,
    'تشخيص تعثر المستهدف (Target At Risk Diagnostic) مع توصيات علاجية عملية'
  );

  // -------------------------------------------------------------
  // 20. Teacher Override & Full Audit Trail
  // -------------------------------------------------------------
  const overriddenPlan = await recalcService.applyTeacherOverride({
    plan: backwardMemPlan,
    teacherId: 'teacher_salih_01',
    teacherName: 'الأستاذ صالح',
    effectiveFromDate: backwardMemPlan.generatedPlan.dailyPlans[1].date,
    reason: 'amount_increase',
    reasonArabicText: 'رفع مقدار الحفظ بعد ملاحظة قدرة الطالب الاستيعابية',
    newDailyAmount: 4,
  });
  assert(
    overriddenPlan.teacherOverrides.length === 1 &&
      overriddenPlan.teacherOverrides[0].reason === 'amount_increase' &&
      overriddenPlan.dailyAmount === 4 &&
      overriddenPlan.versionHistory.length >= 2,
    20,
    'تدخل وتعديل المعلم المباشر (Teacher Override) وتدوين سجل الرقابة التاريخية (Audit Log)'
  );

  console.log('\n================================================================');
  console.log(`  RESULT: ${passed} PASSED / ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlanValidation().catch((err) => {
  console.error('Fatal error running plan validation:', err);
  process.exit(1);
});
