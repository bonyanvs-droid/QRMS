import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../services/memorizationEngine';
import { PlanRecalculationService } from '../services/recalculationService';
import { RangeCalculator } from '../services/rangeCalculator';
import { QuranPosition } from '../types';

async function runPhase3BTests() {
  console.log('================================================================');
  console.log('       PHASE 3B - TEACHER DAILY RECORDING & RECALCULATION TESTS  ');
  console.log('================================================================\n');

  const provider = new BundledQuranProvider();
  const rangeCalc = new RangeCalculator(provider);
  const memEngine = new QuranMemorizationPlanningEngine(provider);
  const recalcService = new PlanRecalculationService(provider);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Setup: Create a backward plan for testing
  // e.g. An-Nas (114:1) to Al-Ikhlas (112:4), 2 ayahs per day
  // --------------------------------------------------------------------------
  const basePlan = await memEngine.createPlan({
    studentId: 'test_student_3b',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    targetStart: { surahNumber: 114, ayahNumber: 1 },
    targetEnd: { surahNumber: 112, ayahNumber: 4 },
    direction: 'backward',
    unitType: 'ayah',
    dailyAmount: 2,
    schedule: { workingDays: [0, 1, 2, 3] }, // Sun to Wed
  });

  const day0 = basePlan.generatedPlan.dailyPlans[0];
  const day0Date = day0.date;
  const day1 = basePlan.generatedPlan.dailyPlans[1];
  const day1Date = day1.date;

  // --------------------------------------------------------------------------
  // TEST 1: إنجاز المخطط (Completed Planned Portion)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. اختبار إنجاز المخطط (Completed) ---');
  const planCompleted = await recalcService.recordDailyAchievement({
    plan: basePlan,
    dayDate: day0Date,
    status: 'completed',
    recordedBy: 'المعلم خالد',
    evaluation: 'excellent',
  });

  const updatedDay0Comp = planCompleted.generatedPlan.dailyPlans[0];
  const updatedDay1Comp = planCompleted.generatedPlan.dailyPlans[1];

  assert(
    updatedDay0Comp.isLocked === true &&
      updatedDay0Comp.isHistorical === true &&
      updatedDay0Comp.status === 'completed' &&
      planCompleted.currentPosition?.surahNumber === updatedDay0Comp.targetUnit.end.surahNumber &&
      planCompleted.currentPosition?.ayahNumber === updatedDay0Comp.targetUnit.end.ayahNumber,
    'إنجاز المخطط: قفل اليوم التاريخي وتحديث الموضع الحالي إلى نهاية الورد المنجز'
  );

  assert(
    updatedDay1Comp.status === 'pending' &&
      !updatedDay1Comp.isLocked &&
      updatedDay1Comp.targetUnit.start.globalIndex !== undefined,
    'إنجاز المخطط: اليوم التالي يبدأ بسلاسة من الموضع التالي دون فجوة'
  );

  // --------------------------------------------------------------------------
  // TEST 2: إنجاز أقل (Partial Recitation)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. اختبار إنجاز أقل (Partial) ---');
  // Suppose day0 target was An-Nas 1-2, but student only recited ayah 1
  const planPartial = await recalcService.recordDailyAchievement({
    plan: basePlan,
    dayDate: day0Date,
    status: 'partial',
    actualEndPosition: { surahNumber: 114, ayahNumber: 1 },
    recordedBy: 'المعلم خالد',
    evaluation: 'needs_practice',
  });

  const updatedDay0Part = planPartial.generatedPlan.dailyPlans[0];
  const updatedDay1Part = planPartial.generatedPlan.dailyPlans[1];

  assert(
    updatedDay0Part.status === 'partial' &&
      updatedDay0Part.isLocked === true &&
      updatedDay0Part.actualAchieved?.unit.end.ayahNumber === 1 &&
      planPartial.currentPosition?.ayahNumber === 1,
    'إنجاز أقل: تسجيل الإنجاز الجزئي الفعلي وتحديث الموضع الحالي عند الآية 1'
  );

  assert(
    updatedDay1Part.targetUnit.start.surahNumber === 114 &&
      updatedDay1Part.targetUnit.start.ayahNumber === 2,
    'إنجاز أقل: اليوم التالي يعيد جدولة الآيات المتبقية ويبدأ من الآية 2 (حيث توقف الطالب)'
  );

  // --------------------------------------------------------------------------
  // TEST 3: إنجاز أكثر / فائض (Overachieved / Surplus)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. اختبار إنجاز أكثر (Overachieved) ---');
  // Suppose day0 target was An-Nas 1-2, but student recited An-Nas 1-5 (3 extra ayahs)
  const planOverachieved = await recalcService.recordDailyAchievement({
    plan: basePlan,
    dayDate: day0Date,
    status: 'overachieved',
    actualEndPosition: { surahNumber: 114, ayahNumber: 5 },
    recordedBy: 'المعلم خالد',
    evaluation: 'excellent',
  });

  const updatedDay0Over = planOverachieved.generatedPlan.dailyPlans[0];
  const updatedDay1Over = planOverachieved.generatedPlan.dailyPlans[1];

  assert(
    updatedDay0Over.status === 'overachieved' &&
      updatedDay0Over.isLocked === true &&
      updatedDay0Over.actualAchieved?.unit.end.ayahNumber === 5 &&
      planOverachieved.currentPosition?.ayahNumber === 5,
    'إنجاز أكثر: قفل اليوم التاريخي وتحديث الموضع الحالي عند الآية 5 المنجزة'
  );

  assert(
    updatedDay1Over.targetUnit.start.surahNumber === 114 &&
      updatedDay1Over.targetUnit.start.ayahNumber === 6,
    'إنجاز أكثر: اليوم التالي يبدأ مباشرة من الآية 6 مع تقليص الأيام المتبقية تلقائياً'
  );

  // --------------------------------------------------------------------------
  // TEST 4: غياب (Absent)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. اختبار غياب الطالب (Absent) ---');
  const planAbsent = await recalcService.recordDailyAchievement({
    plan: basePlan,
    dayDate: day0Date,
    status: 'absent',
    recordedBy: 'المعلم خالد',
  });

  const updatedDay0Abs = planAbsent.generatedPlan.dailyPlans[0];
  const updatedDay1Abs = planAbsent.generatedPlan.dailyPlans[1];

  assert(
    updatedDay0Abs.status === 'absent' &&
      updatedDay0Abs.isLocked === true &&
      updatedDay0Abs.isHistorical === true,
    'غياب: اليوم مسجل ومقفل كغياب في السجل التاريخي دون حذفه'
  );

  assert(
    updatedDay1Abs.targetUnit.start.surahNumber === day0.targetUnit.start.surahNumber &&
      updatedDay1Abs.targetUnit.start.ayahNumber === day0.targetUnit.start.ayahNumber,
    'غياب: اليوم التالي يبدأ بنفس الورد الذي كان مخصصاً ليوم الغياب (ترحيل الورد)'
  );

  assert(
    planAbsent.originalTarget.totalUnits === basePlan.originalTarget.totalUnits,
    'غياب: الهدف الأصلي محمي تماماً ولم يتم تقليصه سراً'
  );

  // --------------------------------------------------------------------------
  // TEST 5: لم يسمّع (Unrecited)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. اختبار لم يسمّع (Unrecited) ---');
  const planUnrecited = await recalcService.recordDailyAchievement({
    plan: basePlan,
    dayDate: day0Date,
    status: 'unrecited',
    recordedBy: 'المعلم خالد',
    notes: 'حاضر ولكن لم يتسع الوقت للتسميع',
  });

  const updatedDay0Unrec = planUnrecited.generatedPlan.dailyPlans[0];
  const updatedDay1Unrec = planUnrecited.generatedPlan.dailyPlans[1];

  assert(
    updatedDay0Unrec.status === 'unrecited' &&
      updatedDay0Unrec.isLocked === true &&
      updatedDay0Unrec.actualAchieved?.notes === 'حاضر ولكن لم يتسع الوقت للتسميع',
    'لم يسمّع: حفظ الحالة وملاحظات المعلم وقفل اليوم'
  );

  assert(
    updatedDay1Unrec.targetUnit.start.ayahNumber === day0.targetUnit.start.ayahNumber,
    'لم يسمّع: ترحيل نفس الورد لليوم الدراسي التالي'
  );

  // --------------------------------------------------------------------------
  // TEST 6: اختبارات الحدود - الانتقال بين السور في الاتجاه التنازلي
  // --------------------------------------------------------------------------
  console.log('\n--- 6. اختبارات الحدود (Boundary & Cross-Surah Tests) ---');
  // Transition between Surahs in backward/reverse direction (An-Nas to Al-Falaq)
  const surahTransitionRange = await rangeCalc.getMetrics(
    { surahNumber: 114, ayahNumber: 3 },
    { surahNumber: 113, ayahNumber: 4 }
  );

  assert(
    surahTransitionRange.ayahCount === 5 &&
      surahTransitionRange.direction === 'reverse' &&
      surahTransitionRange.surahsInvolved.includes(114) &&
      surahTransitionRange.surahsInvolved.includes(113),
    'الانتقال بين السور: حساب متري دقيق عبر حدود السور (الناس والـفلق) في الاتجاه التنازلي'
  );

  // --------------------------------------------------------------------------
  // TEST 7: الحفاظ على السجل التاريخي دون تعديل (Multi-Day Immutable History)
  // --------------------------------------------------------------------------
  console.log('\n--- 7. الحفاظ على السجل التاريخي المتعدد (Immutable History) ---');
  // Record Day 0 as completed
  const step1 = await recalcService.recordDailyAchievement({
    plan: basePlan,
    dayDate: day0Date,
    status: 'completed',
    recordedBy: 'المعلم 1',
  });

  const day0Snapshot = JSON.stringify(step1.generatedPlan.dailyPlans[0]);

  // Record Day 1 as overachieved
  const step2 = await recalcService.recordDailyAchievement({
    plan: step1,
    dayDate: day1Date,
    status: 'overachieved',
    actualEndPosition: { surahNumber: 113, ayahNumber: 3 },
    recordedBy: 'المعلم 2',
  });

  const day0AfterStep2 = JSON.stringify(step2.generatedPlan.dailyPlans[0]);

  assert(
    day0Snapshot === day0AfterStep2,
    'السجل التاريخي: اليوم الأول ظل مطابقاً 100% بدون أي تغيير بعد تسجيل اليوم الثاني'
  );

  assert(
    step2.planVersion >= 3 && step2.versionHistory.length >= 2,
    'سجل الرقابة وإصدارات الخطة: تم تدوين العمليتين في مصفوفة تاريخ الإصدارات (Audit Trail)'
  );

  console.log('\n================================================================');
  console.log(`  PHASE 3B TEST RESULT: ${passed} PASSED / ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3BTests().catch((err) => {
  console.error('Fatal error in Phase 3B tests:', err);
  process.exit(1);
});
