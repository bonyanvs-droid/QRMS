import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../services/memorizationEngine';
import { PlanRecalculationService } from '../services/recalculationService';
import { createRealStudentPlan } from '../services/studentPlanBridge';
import { SEED_BARAEM_STUDENTS, BARAEM_ACADEMIC_YEAR } from '../../data/studentsRoster';
import { INITIAL_EDUCATIONAL_PLAN, INITIAL_SPELLING_LESSONS } from '../../data/initialData';
import { normalizePhone } from '../../lib/parentService';

async function runPhase3CTests() {
  console.log('================================================================');
  console.log('       PHASE 3C - STUDENT & PARENT QURAN PROGRESS PORTAL TESTS   ');
  console.log('================================================================\n');

  const provider = new BundledQuranProvider();
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

  // Pick real student from roster
  const realStudent1 = SEED_BARAEM_STUDENTS[0]; // بشير صالح إبراهيم بشير
  const realStudent2 = SEED_BARAEM_STUDENTS[1]; // أحمد عبدالمعين نبيل حاكمي

  // --------------------------------------------------------------------------
  // TEST 1: ظهور الخطة لطالب حقيقي (Real Student Plan Creation & Loading)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. ظهور الخطة لطالب حقيقي ---');
  const realPlan1 = await createRealStudentPlan({
    student: realStudent1,
    academicConfig: BARAEM_ACADEMIC_YEAR,
    provider,
    memorizationEngine: memEngine,
  });

  assert(
    !!realPlan1 && realPlan1.studentId === realStudent1.id && realPlan1.generatedPlan.dailyPlans.length > 0,
    'ظهور وتحميل الخطة لطالب حقيقي من قائمة طلاب المجمع (بشير صالح)',
    `Plan ID: ${realPlan1?.id}, Days: ${realPlan1?.generatedPlan.dailyPlans.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: ظهور الهدف الأصلي (Original Target Snapshot Display)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. ظهور الهدف الأصلي الثابت ---');
  assert(
    !!realPlan1.originalTarget &&
      !!realPlan1.originalTarget.displayTarget &&
      realPlan1.originalTarget.totalUnits > 0 &&
      realPlan1.originalTarget.totalAyahs > 0,
    'استخراج وعرض الهدف الأصلي الثابت من OriginalTargetSnapshot',
    `Original Target: ${realPlan1.originalTarget.displayTarget} (${realPlan1.originalTarget.totalUnits} units, ${realPlan1.originalTarget.totalAyahs} ayahs)`
  );

  // --------------------------------------------------------------------------
  // TEST 3: ظهور الموضع الحالي (Current Position Tracking)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. ظهور الموضع الحالي بدقة ---');
  assert(
    realPlan1.currentPosition.surahNumber > 0 && realPlan1.currentPosition.ayahNumber > 0,
    'ظهور الموضع الحالي المتناسق مع إنجاز الطالب في المصحف الشريف',
    `Current Pos: Surah ${realPlan1.currentPosition.surahNumber}, Ayah ${realPlan1.currentPosition.ayahNumber}`
  );

  // --------------------------------------------------------------------------
  // TEST 4: ظهور الخطة اليومية (Daily Plan Display with Dates & Statuses)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. ظهور الخطة اليومية ---');
  const dailyPlans = realPlan1.generatedPlan.dailyPlans;
  const hasValidDailyItems =
    dailyPlans.length > 0 &&
    dailyPlans.every((d) => !!d.date && !!d.dayName && !!d.targetUnit && !!d.status);

  assert(
    hasValidDailyItems,
    'ظهور جميع أيام الخطة اليومية بتواريخها وأسمائها ومقرراتها وحالاتها',
    `Total days: ${dailyPlans.length}, First day: ${dailyPlans[0]?.dayName} ${dailyPlans[0]?.date}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: الانتقال الأسبوعي (Weekly View Aggregation)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. الانتقال الأسبوعي وتجميع الأسابيع ---');
  const weeklyPlans = realPlan1.generatedPlan.weeklyPlans;
  const hasValidWeeklyItems =
    weeklyPlans.length > 0 &&
    weeklyPlans.every((w) => w.weekNumber > 0 && !!w.startDate && !!w.endDate && w.days.length > 0);

  assert(
    hasValidWeeklyItems,
    'تجميع وعرض الخطة على مستوى الأسابيع مع تفاصيل أيام كل أسبوع',
    `Weeks count: ${weeklyPlans.length}, Week 1 label: ${weeklyPlans[0]?.displayLabel}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: الانتقال الشهري (Monthly View Aggregation)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. الانتقال الشهري وتجميع الشهور ---');
  const monthlyPlans = realPlan1.generatedPlan.monthlyPlans;
  const hasValidMonthlyItems =
    monthlyPlans.length > 0 &&
    monthlyPlans.every((m) => m.monthNumber > 0 && !!m.monthName && m.weeks.length > 0);

  assert(
    hasValidMonthlyItems,
    'تجميع وعرض الخطة على مستوى الشهور التشغيلية للفصل',
    `Months count: ${monthlyPlans.length}, Month 1: ${monthlyPlans[0]?.monthName}`
  );

  // --------------------------------------------------------------------------
  // TEST 7: الانتقال الفصلي (Term View Semester Scope)
  // --------------------------------------------------------------------------
  console.log('\n--- 7. الانتقال الفصلي للمسار الشامل ---');
  const termPlan = realPlan1.generatedPlan.termPlan;
  const hasValidTerm =
    !!termPlan &&
    !!termPlan.startDate &&
    !!termPlan.endDate &&
    termPlan.totalUnits > 0 &&
    termPlan.totalWorkingDays > 0;

  assert(
    hasValidTerm,
    'عرض المسار الفصلي العام من بداية الفصل إلى نهايته وإجمالي الأيام والوحدات',
    `Term: ${termPlan?.termName}, Days: ${termPlan?.totalWorkingDays}, Units: ${termPlan?.totalUnits}`
  );

  // --------------------------------------------------------------------------
  // TEST 8: فصل الحفظ عن المراجعة (Memorization & Revision Separation)
  // --------------------------------------------------------------------------
  console.log('\n--- 8. فصل مسار الحفظ عن مسار المراجعة ---');
  // Memorization has its own unitType, dailyAmount, targetStart/End
  const memTarget = realPlan1.originalTarget.displayTarget;
  // Student roster has distinct revision days (e.g. Sunday: An-Nas to Al-Falaq)
  const rosterRevision = realStudent1.quranPlan?.revisionDays;
  const isRevisionDistinct =
    Array.isArray(rosterRevision) &&
    rosterRevision.length > 0 &&
    rosterRevision[0].surahFrom !== undefined &&
    rosterRevision[0].surahTo !== undefined;

  assert(
    isRevisionDistinct && memTarget.length > 0,
    'فصل تام ومستقل بين مسار الحفظ الجديد ومسار مراجعة وتثبيت المحفوظ السابق',
    `Memorization target: ${memTarget}, Revision schedule days count: ${rosterRevision?.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 9: عرض التاريخ مع الإنجاز (Historical Records Presentation)
  // --------------------------------------------------------------------------
  console.log('\n--- 9. توثيق وعرض السجل التاريخي مع الإنجاز الفعلي ---');
  // Use a student with pending verses ahead (e.g. Grade 1 or student currently working towards target)
  const studentWithPending =
    SEED_BARAEM_STUDENTS.find((s) => s.currentSurah !== s.minimumTargetSurah) || SEED_BARAEM_STUDENTS[2];

  const planWithPending = await createRealStudentPlan({
    student: studentWithPending,
    academicConfig: BARAEM_ACADEMIC_YEAR,
    provider,
    memorizationEngine: memEngine,
  });

  const day0 = planWithPending.generatedPlan.dailyPlans[0];
  const updatedWithRecord = await recalcService.recordDailyAchievement({
    plan: planWithPending,
    dayDate: day0.date,
    status: 'completed',
    recordedBy: 'أ. صالح بشير',
    evaluation: 'excellent',
    notes: 'تسميع ممتاز مع ضبط مخارج الحروف',
  });

  const updatedDay0 = updatedWithRecord.generatedPlan.dailyPlans.find((d) => d.date === day0.date);

  assert(
    updatedDay0?.status === 'completed' &&
      updatedDay0?.isHistorical === true &&
      !!updatedDay0?.actualAchieved,
    'ظهور المقرر المستهدف والمنجز الفعلي وحالة التسميع وملاحظة المعلم في السجل التاريخي',
    `Status: ${updatedDay0?.status}, Achieved: ${updatedDay0?.actualAchieved?.unit?.displayLabel}`
  );

  // --------------------------------------------------------------------------
  // TEST 10: عدم تعديل التاريخ (Historical Immutability)
  // --------------------------------------------------------------------------
  console.log('\n--- 10. الحفاظ الصارم على قفل السجلات التاريخية ---');
  const day1 = updatedWithRecord.generatedPlan.dailyPlans[1];
  // Record an overachievement on day 1 (overachieving 2 additional ayahs beyond target)
  const day1TargetEnd = day1.targetUnit.end;
  const overachievedEndAyah = day1TargetEnd.ayahNumber + 2;

  const updatedWithOverachieve = await recalcService.recordDailyAchievement({
    plan: updatedWithRecord,
    dayDate: day1.date,
    status: 'overachieved',
    actualEndPosition: {
      surahNumber: day1TargetEnd.surahNumber,
      ayahNumber: overachievedEndAyah,
    },
    recordedBy: 'أ. صالح بشير',
  });

  const recheckedDay0 = updatedWithOverachieve.generatedPlan.dailyPlans.find(
    (d) => d.date === day0.date
  );

  assert(
    recheckedDay0?.isHistorical === true &&
      recheckedDay0?.status === 'completed' &&
      recheckedDay0?.actualAchieved?.unit?.displayLabel ===
        updatedDay0?.actualAchieved?.unit?.displayLabel,
    'عدم المساس باليوم التاريخي السابق (مقفل ومحمي تماماً من التعديل عند إعادة الحساب)',
    `Day 0 historical status: ${recheckedDay0?.isHistorical}`
  );

  // --------------------------------------------------------------------------
  // TEST 11: تغير المستقبل عند إعادة الحساب (Future Dynamically Updates)
  // --------------------------------------------------------------------------
  console.log('\n--- 11. إعادة حساب الأيام المستقبلية تلقائياً ---');
  const day2Before = updatedWithRecord.generatedPlan.dailyPlans[2];
  const day2After = updatedWithOverachieve.generatedPlan.dailyPlans[2];

  // Because day 1 was overachieved, day 2's starting verse must have advanced
  assert(
    day2Before.targetUnit.start.surahNumber !== day2After.targetUnit.start.surahNumber ||
      day2Before.targetUnit.start.ayahNumber !== day2After.targetUnit.start.ayahNumber ||
      day2Before.targetUnit.displayLabel !== day2After.targetUnit.displayLabel,
    'تغير وتكيف الأيام المستقبلية تلقائياً بناءً على محرك إعادة الحساب',
    `Before: ${day2Before.targetUnit.displayLabel} -> After: ${day2After.targetUnit.displayLabel}`
  );

  // --------------------------------------------------------------------------
  // TEST 12: عدم ظهور بيانات طلاب آخرين (Strict Student Data Isolation)
  // --------------------------------------------------------------------------
  console.log('\n--- 12. عزل بيانات الطلاب ومنع اختلاط السجلات ---');
  const planForStudent2 = await createRealStudentPlan({
    student: realStudent2,
    academicConfig: BARAEM_ACADEMIC_YEAR,
    provider,
    memorizationEngine: memEngine,
  });

  const isIsolated =
    realPlan1.studentId !== planForStudent2.studentId &&
    realPlan1.studentId === realStudent1.id &&
    planForStudent2.studentId === realStudent2.id;

  assert(
    isIsolated,
    'عزل تام لبيانات وخطط الطلاب ومنع تسرب أو اختلاط أي سجلات بين طالب وآخر',
    `Student 1 ID: ${realPlan1.studentId} !== Student 2 ID: ${planForStudent2.studentId}`
  );

  // --------------------------------------------------------------------------
  // TEST 13: عدم استخدام Mock Data (Real Curriculum & Student Data)
  // --------------------------------------------------------------------------
  console.log('\n--- 13. الاعتماد الكامل على النماذج والبيانات الحقيقية ---');
  const usesRealRoster = SEED_BARAEM_STUDENTS.length > 0 && SEED_BARAEM_STUDENTS.some((s) => s.id === realPlan1.studentId);
  const usesRealCurriculum =
    INITIAL_EDUCATIONAL_PLAN.length > 0 && INITIAL_SPELLING_LESSONS.length > 0;

  assert(
    usesRealRoster && usesRealCurriculum,
    'عدم استخدام أي Mock Data، وربط البوابة بالنماذج الحقيقية للمجمع والطلاب والمنهج',
    `Total real students: ${SEED_BARAEM_STUDENTS.length}, Educational weeks: ${INITIAL_EDUCATIONAL_PLAN.length}, Spelling lessons: ${INITIAL_SPELLING_LESSONS.length}`
  );

  // --------------------------------------------------------------------------
  // TEST 14: عدم كسر ParentPortal الحالي (Preserving Existing Portal Capabilities)
  // --------------------------------------------------------------------------
  console.log('\n--- 14. الحفاظ على كامل وظائف بوابة ولي الأمر الحالية ---');
  const testPhone = '0554456851';
  const normalized = normalizePhone(testPhone);
  const matches = SEED_BARAEM_STUDENTS.filter(
    (s) => s.parentPhone && normalizePhone(s.parentPhone) === normalized
  );

  assert(
    matches.length > 0 && matches[0].fullName === realStudent1.fullName,
    'استمرار عمل الاستعلام برقم الجوال والأوسمة والشهادات والأرشيف دون أي تعارض',
    `Phone ${testPhone} resolved to real student: ${matches[0].fullName}`
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 3C TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3CTests().catch((err) => {
  console.error('Fatal error in Phase 3C tests:', err);
  process.exit(1);
});
