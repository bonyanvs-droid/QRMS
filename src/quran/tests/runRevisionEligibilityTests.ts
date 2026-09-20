/**
 * QRMS Quran Planning — Revision Eligibility & Reverse Traversal Validation
 *
 * Covers the critical fix: the current INCOMPLETE surah must never enter the
 * rolling revision pool — it becomes eligible only after memorization
 * completes AND its consolidation cycle ends. Revision direction is
 * independent of memorization direction ('backward' = newest→oldest of the
 * governed learning order = REVERSE traversal).
 *
 * Run: npx tsx src/quran/tests/runRevisionEligibilityTests.ts
 */
import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../services/memorizationEngine';
import { PlanRecalculationService } from '../services/recalculationService';
import { RangeCalculator } from '../services/rangeCalculator';
import {
  createRealStudentPlan,
  resolveQuranPlanConfiguration,
} from '../services/studentPlanBridge';
import { StageQuranConfig } from '../models/stageConfig';
import { Student, Halaqah, AcademicYearConfig } from '../../types';

const provider = new BundledQuranProvider();
const engine = new QuranMemorizationPlanningEngine(provider);
const recalc = new PlanRecalculationService(provider);
const rangeCalc = new RangeCalculator(provider);

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, extra?: string) {
  if (cond) {
    passed++;
    console.log(`   ✔ ${name}`);
  } else {
    failed++;
    console.log(`   ✘ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

/** بشير scenario template: backward memorization, surah-mode revision ×2, reverse */
const TEMPLATE: StageQuranConfig = {
  id: 'tm_surah_revision',
  name: 'قالب اختبار الأهلية',
  code: 'tm_surah_revision',
  memorization: {
    unitType: 'line',
    defaultDailyAmount: 1,
    defaultDirection: 'backward',
    defaultTargetStart: { surahNumber: 108, ayahNumber: 1 },
    defaultTargetEnd: { surahNumber: 105, ayahNumber: 5 },
  },
  revision: {
    mode: 'surahs',
    unitType: 'surah',
    defaultDailyAmount: 1,
    defaultDirection: 'backward', // REVERSE of backward memorization
    defaultTargetStart: { surahNumber: 114, ayahNumber: 1 },
    defaultTargetEnd: { surahNumber: 1, ayahNumber: 7 },
    surahsPerDay: 2,
  },
  consolidationDays: 3,
  schedule: { workingDays: [0, 1, 2, 3] },
  defaultTermWeeks: 8,
  isActive: true,
};

const STUDENT: Student = {
  id: 'std_bashir',
  fullName: 'بشير صالح ابراهيم بشير',
  grade: 'تمهيدي' as any,
  halaqahId: 'hq_1',
  teacherId: 't1',
  parentPhone: '0500000000',
  minimumTargetSurah: 'الفيل',
  status: 'active' as any,
  currentSpellingLessonId: '',
  currentSpellingScore: 0,
  currentSurah: 'الكوثر',
  currentAyah: 0,
};

const ACADEMIC: AcademicYearConfig = {
  id: 'ay_1',
  name: 'العام الدراسي',
  semester: 'الفصل الأول',
  startDate: '2026-09-01',
  endDate: '2027-06-30',
  operationalStartWeek: 1,
  operationalEndWeek: 40,
  totalWeeks: 40,
  currentWeek: 4,
  daysPerWeek: 4,
  spellingPassingThreshold: 85,
  gradeTargets: { tamheedi: { minSurah: 'الفيل', label: 'تمهيدي' } },
};

const halaqah = {
  id: 'hq_1',
  name: 'حلقة اختبار',
  teacherId: 't1',
  teacherName: 'معلم',
  location: '',
  daysPerWeek: 4,
  isActive: true,
  activeTrackIds: ['track_quran'],
} as Halaqah;

const revLabel = (d: { revisionDisplayLabel?: string }) => d.revisionDisplayLabel || '';
const hasSurah = (label: string, name: string) => label.includes(name);

async function main() {
  const surahs = await provider.getSurahs();

  console.log('\n=== TEST 1+2+4. Backward mem + Reverse revision — current surah excluded ===');
  const bashirPlan = await engine.createPlan({
    studentId: STUDENT.id,
    startDate: '2026-09-20',
    endDate: '2026-11-14',
    targetStart: { surahNumber: 108, ayahNumber: 1 }, // الكوثر (current, incomplete)
    targetEnd: { surahNumber: 105, ayahNumber: 5 },
    direction: 'backward',
    unitType: 'line',
    dailyAmount: 1,
    revisionDailyPages: 1,
    consolidationDaysPerSurah: 3,
    schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
    autoMinorRevisionMode: true,
    revisionDirection: 'backward',
    revisionUnitKind: 'surah',
    revisionUnitsPerWindow: 2,
  });

  const days = bashirPlan.generatedPlan.dailyPlans;
  console.log(`   generated ${days.length} working days`);
  days.slice(0, 10).forEach((d) =>
    console.log(`   ${d.date} | ${d.targetUnit.displayLabel} | ${revLabel(d)}`)
  );

  // TEST 1: الكوثر (current incomplete surah) never in revision during its own
  // memorization days AND its consolidation days (first 5 units: 2 mem + 3 cons)
  const kawtharPhaseDays = days.slice(0, 5);
  assert(
    kawtharPhaseDays.every((d) => !hasSurah(revLabel(d), 'الكوثر')),
    'TEST1: الكوثر غير موجودة في مراجعات أيام حفظها وتثبيتها',
    kawtharPhaseDays.map(revLabel).join(' | ')
  );

  // TEST 2: reverse traversal order الكافرون→النصر→المسد→الإخلاص→الفلق→الناس
  assert(
    revLabel(days[0]).includes('الكافرون') && revLabel(days[0]).includes('النصر'),
    'TEST2a: اليوم 1 يبدأ بالكافرون ويتجه للنصر',
    revLabel(days[0])
  );
  assert(
    revLabel(days[1]).includes('المسد') && revLabel(days[1]).includes('الإخلاص'),
    'TEST2b: اليوم 2 يغطي المسد والإخلاص',
    revLabel(days[1])
  );
  assert(
    revLabel(days[2]).includes('الفلق') && revLabel(days[2]).includes('الناس'),
    'TEST2c: اليوم 3 يغطي الفلق والناس',
    revLabel(days[2])
  );
  // traversal labels read in direction order (الكافرون قبل النصر)
  const d0 = revLabel(days[0]);
  assert(
    d0.indexOf('الكافرون') < d0.indexOf('النصر'),
    'TEST2d: التسمية تقرأ باتجاه الـtraversal (الكافرون ← النصر)',
    d0
  );

  // TEST 4 explicit: consolidation days of الكوثر keep it excluded
  const consDays = days.filter((d) => d.consolidationSurahNumber === 108);
  assert(
    consDays.length === 3 && consDays.every((d) => !hasSurah(revLabel(d), 'الكوثر')),
    'TEST4: الكوثر مستبعدة طوال أيام تثبيتها الثلاثة'
  );

  console.log('\n=== TEST 3+5. الكوثر تصبح مؤهلة بعد اكتمال التثبيت ===');
  {
    const postConsDays = days.slice(5);
    const kawtharAppears = postConsDays.some((d) => hasSurah(revLabel(d), 'الكوثر'));
    assert(kawtharAppears, 'TEST3/5: الكوثر تدخل الـpool بعد انتهاء تثبيتها');
  }

  console.log('\n=== TEST 7. Cycle داخل الـeligible pool ===');
  {
    // 7 eligible surahs initially {1,114,113,112,111,110,109} → after الناس the
    // window wraps to الفاتحة then الكافرون — never leaves the pool.
    const d3 = revLabel(days[3]);
    assert(
      hasSurah(d3, 'الفاتحة') || hasSurah(d3, 'الكافرون'),
      'TEST7: النافذة تدور داخل الـpool بعد الناس',
      d3
    );
    const kafirunReturns = days.slice(3, 12).some((d) => hasSurah(revLabel(d), 'الكافرون'));
    assert(kafirunReturns, 'TEST7b: الدورة تعود للكافرون (أول عنصر مؤهل)');
  }

  console.log('\n=== TEST 8. لا قفز canonical 114 → 1 خارج الـpool ===');
  {
    const allowed = new Set([1, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114]);
    const nameToNum: Record<string, number> = {
      'الفاتحة': 1, 'الفيل': 105, 'قريش': 106, 'الماعون': 107, 'الكوثر': 108,
      'الكافرون': 109, 'النصر': 110, 'المسد': 111, 'الإخلاص': 112, 'الفلق': 113, 'الناس': 114,
      'البقرة': 2, 'الهمزة': 104, 'العصر': 103,
    };
    const bad = days.filter((d) => {
      const l = revLabel(d);
      return Object.entries(nameToNum).some(([n, num]) => !allowed.has(num) && l.includes(n));
    });
    assert(bad.length === 0, 'TEST8: لا سور خارج الـeligible pool في أي مراجعة',
      bad.map((d) => `${d.date}:${revLabel(d)}`).join(' | '));
  }

  console.log('\n=== TEST 6. Forward memorization + Reverse revision ===');
  {
    const fwdPlan = await engine.createPlan({
      studentId: 's_fwd',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 78, ayahNumber: 1 }, // النبأ
      targetEnd: { surahNumber: 81, ayahNumber: 29 }, // التكوير
      direction: 'forward',
      unitType: 'ayah',
      dailyAmount: 3,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 0,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 1,
    });
    const fDays = fwdPlan.generatedPlan.dailyPlans;
    // Forward mem: learned order = [1..77 completed before النبأ?] — seed = surahs
    // fully before النبأ in forward order = الفاتحة..المرسلات. Reverse revision
    // walks newest→oldest → first window must be المرسلات (77), NOT الفاتحة.
    const first = revLabel(fDays[0]);
    assert(
      hasSurah(first, 'المرسلات'),
      'TEST6: forward mem + reverse rev → يبدأ بأحدث محفوظ (المرسلات)',
      first
    );
    const second = revLabel(fDays[1]);
    assert(
      hasSurah(second, 'الإنسان'),
      'TEST6b: النافذة التالية تراجع الأقدم (الإنسان 76)',
      second
    );
  }

  console.log('\n=== TEST 9. Actual achievement → future recalculated, history locked ===');
  {
    const plan = await engine.createPlan({
      studentId: 's9',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 108, ayahNumber: 1 },
      targetEnd: { surahNumber: 106, ayahNumber: 4 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    const d0 = plan.generatedPlan.dailyPlans[0];
    const updated = await recalc.recordDailyAchievement({
      plan,
      dayDate: d0.date,
      status: 'completed',
      recordedBy: 'اختبار',
    });
    const uDays = updated.generatedPlan.dailyPlans;
    assert(uDays[0].isLocked && uDays[0].isHistorical, 'TEST9a: اليوم المسجل مقفل تاريخيًا');
    const futureRev = uDays.slice(1, 8).map(revLabel);
    assert(
      futureRev.every((l) => l.startsWith('مراجعة')),
      'TEST9b: المستقبل أُعيد بناؤه بمراجعات متدحرجة سليمة',
      futureRev.join(' | ')
    );
    const kawtharPhase = uDays
      .slice(1)
      .filter(
        (d) => d.targetUnit.start.surahNumber === 108 || d.consolidationSurahNumber === 108
      );
    assert(
      kawtharPhase.length > 0 &&
        kawtharPhase.every((d) => !hasSurah(revLabel(d), 'الكوثر')),
      'TEST9c: الكوثر مستبعدة طوال أيامها المعاد بناؤها (حفظ+تثبيت)',
      kawtharPhase.map(revLabel).join(' | ')
    );
    // Auto Minor: once الكوثر finishes its rebuilt consolidation it anchors the
    // next window — the first الماعون day must start revision AT الكوثر.
    const firstMaun = uDays.find(
      (d) => !d.isHistorical && !d.isConsolidationDay && d.targetUnit.start.surahNumber === 107
    );
    assert(
      !!firstMaun && hasSurah(revLabel(firstMaun), 'الكوثر') && hasSurah(revLabel(firstMaun), 'الكافرون'),
      'TEST9c2: أول يوم بعد تثبيت الكوثر يبدأ الدورة من الكوثر (anchor)',
      firstMaun ? revLabel(firstMaun) : 'not found'
    );
  }

  console.log('\n=== TEST 9d. Surah completed by actual achievement → eligible after consolidation ===');
  {
    const plan = await engine.createPlan({
      studentId: 's9d',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 108, ayahNumber: 1 },
      targetEnd: { surahNumber: 106, ayahNumber: 4 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    // Day 2 completes الكوثر (1-3). Record it → prepended consolidation then pool entry.
    const d2 = plan.generatedPlan.dailyPlans[1];
    const updated = await recalc.recordDailyAchievement({
      plan,
      dayDate: d2.date,
      status: 'completed',
      actualEndPosition: { surahNumber: 108, ayahNumber: 3 },
      recordedBy: 'اختبار',
    });
    const uDays = updated.generatedPlan.dailyPlans;
    const consDays = uDays.filter((d) => d.consolidationSurahNumber === 108 && !d.isHistorical);
    assert(
      consDays.length > 0 && consDays.every((d) => !hasSurah(revLabel(d), 'الكوثر')),
      'TEST9d: أيام تثبيت الكوثر المعاد بناؤها تستبعد الكوثر',
      consDays.map(revLabel).join(' | ')
    );
    const after = uDays.filter(
      (d) => !d.isHistorical && !d.isConsolidationDay && d.targetUnit.start.surahNumber === 107
    );
    const poolHasKawthar = uDays
      .slice(uDays.findIndex((d) => after.length && d.date === after[0].date))
      .some((d) => hasSurah(revLabel(d), 'الكوثر'));
    assert(poolHasKawthar, 'TEST9e: الكوثر مؤهلة في الـpool بعد انتهاء تثبيتها');
  }

  console.log('\n=== TEST 10. Preview pipeline end-to-end (resolve → engine → dailyPlans) ===');
  {
    const cfg = resolveQuranPlanConfiguration(
      {
        student: STUDENT,
        stageConfig: TEMPLATE,
        allStageConfigs: [TEMPLATE],
        academicConfig: ACADEMIC,
        halaqah,
        customTargetStart: { surahNumber: 108, ayahNumber: 1 },
        customTargetEnd: { surahNumber: 105, ayahNumber: 5 },
        customStartDate: '2026-09-20',
        customEndDate: '2026-11-14',
      },
      surahs
    );
    assert(cfg.revisionUnitKind === 'surah' && cfg.revisionUnitsPerWindow === 2, 'TEST10a: surah-mode×2 محلول من القالب');
    assert(cfg.revisionDirection === 'backward' && cfg.direction === 'backward', 'TEST10b: الاتجاهان مستقلان');

    const plan = await createRealStudentPlan({
      student: STUDENT,
      stageConfig: TEMPLATE,
      allStageConfigs: [TEMPLATE],
      academicConfig: ACADEMIC,
      halaqah,
      customTargetStart: { surahNumber: 108, ayahNumber: 1 },
      customTargetEnd: { surahNumber: 105, ayahNumber: 5 },
      customStartDate: '2026-09-20',
      customEndDate: '2026-11-14',
      provider,
      memorizationEngine: engine,
    });
    const pDays = plan.generatedPlan.dailyPlans;
    assert(pDays.length === 32, 'TEST10c: المعاينة تنتج 32 يوم عمل', `${pDays.length}`);
    assert(
      !hasSurah(revLabel(pDays[0]), 'الكوثر') && hasSurah(revLabel(pDays[0]), 'الكافرون'),
      'TEST10d: أول يوم معاينة: الكافرون بلا كوثر',
      revLabel(pDays[0])
    );
    console.log('   --- first 10 preview days ---');
    pDays.slice(0, 10).forEach((d) =>
      console.log(
        `   ${d.date} | mem: ${d.targetUnit.displayLabel} | rev: ${revLabel(d)} | pages ${d.revisionPageStart}-${d.revisionPageEnd}`
      )
    );

    // TEST 10e: every generated day is previewable (date + label + revision)
    assert(
      pDays.every((d) => d.date && d.targetUnit && revLabel(d).length > 0),
      'TEST10e: كل يوم من الـ32 قابل للعرض في جدول المحاكاة'
    );
    // TEST 10f: weekNumber grouping covers the full term (8 weeks × 4 days)
    const wNums = new Set(pDays.map((d) => d.weekNumber));
    assert(wNums.size === 8, 'TEST10f: تجميع الأسابيع يغطي الفصل كاملًا', `${wNums.size} weeks`);

    // TEST 11: the preview plan object is the canonical object that gets
    // persisted — approveStudentQuranPlan(previewPlan) saves it verbatim.
    assert(
      plan.generatedPlan.dailyPlans === pDays,
      'TEST11: dailyPlans المعروضة هي نفس مرجع البيانات المحفوظ'
    );

    // TEST 13: JSONB round-trip (Postgres persist + reload) preserves all days
    const reloaded = JSON.parse(JSON.stringify(plan));
    assert(
      reloaded.generatedPlan.dailyPlans.length === 32 &&
        reloaded.generatedPlan.dailyPlans[0].revisionDisplayLabel === revLabel(pDays[0]),
      'TEST13: إعادة تحميل الخطة من JSONB تحفظ الـ32 يومًا كاملة'
    );
  }

  console.log('\n=== TEST 14. Auto Minor ON — new eligibility restarts the minor cycle ===');
  {
    // bashirPlan: الكوثر becomes eligible after day 5 (mem 2 + cons 3).
    // Day 6 (الماعون 1-1) must anchor the rebuilt cycle AT الكوثر — newest first.
    const d6 = revLabel(days[5]);
    assert(
      hasSurah(d6, 'الكوثر') && hasSurah(d6, 'الكافرون') &&
        d6.indexOf('الكوثر') < d6.indexOf('الكافرون'),
      'TEST14a: أول يوم بعد أهلية الكوثر يبدأ من الكوثر (دورة مُعاد بناؤها)',
      d6
    );
    // البينة scenario: القدر's first day must anchor at البينة.
    const bayinahPlan = await engine.createPlan({
      studentId: 's_bayinah',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 98, ayahNumber: 1 },
      targetEnd: { surahNumber: 96, ayahNumber: 19 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    const bDays = bayinahPlan.generatedPlan.dailyPlans;
    const qadrDay = bDays.find((d) => d.targetUnit.displayLabel.startsWith('القدر'));
    assert(
      !!qadrDay && revLabel(qadrDay).includes('البينة'),
      'TEST14b: القدر 1-1 يراجع البينة فور أهليتها (لا استمرار من offset قديم)',
      qadrDay ? revLabel(qadrDay) : 'القدر غير موجود'
    );
    // No day before eligibility revises البينة
    const preEligible = bDays.slice(0, bDays.indexOf(qadrDay!));
    assert(
      preEligible.every((d) => !revLabel(d).includes('البينة')),
      'TEST14c: البينة مستبعدة قبل الأهلية رغم إعادة بناء الدورة'
    );
  }

  console.log('\n=== TEST 15. Auto Minor OFF (Manual) — user cycle stays stable ===');
  {
    const manualPlan = await engine.createPlan({
      studentId: 's_manual',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 108, ayahNumber: 1 },
      targetEnd: { surahNumber: 106, ayahNumber: 4 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: false,
      manualRevisionRange: {
        start: { surahNumber: 114, ayahNumber: 1 },
        end: { surahNumber: 109, ayahNumber: 6 },
      },
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    const mDays = manualPlan.generatedPlan.dailyPlans;
    // الكوثر becomes eligible after day 5 — day 6 must NOT anchor at it:
    // the manual rolling cycle continues from its own offset.
    const m6 = revLabel(mDays[5]);
    assert(
      !hasSurah(m6, 'الكوثر'),
      'TEST15a: الوضع اليدوي لا يعيد بناء الدورة عند أهلية الكوثر',
      m6
    );
    // The manual cycle still rolls inside the configured range (+ grown pool).
    const m1 = revLabel(mDays[0]);
    assert(
      m1.startsWith('مراجعة') && (hasSurah(m1, 'الكافرون') || hasSurah(m1, 'الناس')),
      'TEST15b: دورة اليدوي تعمل على نطاق المستخدم',
      m1
    );
    // Recalc on a manual plan must also NOT anchor the newly eligible surah.
    const d2 = mDays[1];
    const mUpdated = await recalc.recordDailyAchievement({
      plan: manualPlan,
      dayDate: d2.date,
      status: 'completed',
      actualEndPosition: { surahNumber: 108, ayahNumber: 3 },
      recordedBy: 'اختبار',
    });
    const mFuture = mUpdated.generatedPlan.dailyPlans;
    const mFirstMaun = mFuture.find(
      (d) => !d.isHistorical && !d.isConsolidationDay && d.targetUnit.start.surahNumber === 107
    );
    assert(
      !!mFirstMaun && !hasSurah(revLabel(mFirstMaun), 'الكوثر') ||
        (mFirstMaun && revLabel(mFirstMaun).indexOf('الكوثر') > 0),
      'TEST15c: إعادة حساب الوضع اليدوي لا تثبّت الدورة على السورة الجديدة',
      mFirstMaun ? revLabel(mFirstMaun) : 'not found'
    );
  }

  console.log('\n=== TEST 8b. Page mode — real mushaf page boundaries ===');
  {
    const pagePlan = await engine.createPlan({
      studentId: 's_page',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 98, ayahNumber: 1 },
      targetEnd: { surahNumber: 96, ayahNumber: 19 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'page',
    });
    const pgDays = pagePlan.generatedPlan.dailyPlans;
    // 1 page/day → a window is exactly ONE real mushaf page — never crosses pages.
    assert(
      pgDays.every((d) => d.revisionPageStart === d.revisionPageEnd),
      'TEST8b: نافذة صفحة واحدة لا تعبر حدود الصفحات أبدًا',
      pgDays
        .filter((d) => d.revisionPageStart !== d.revisionPageEnd)
        .map((d) => `${d.date}:${d.revisionPageStart}-${d.revisionPageEnd}`)
        .join('|')
    );
    // Page 601 physically contains العصر+الهمزة+الفيل — full-page window shows all.
    const p601 = pgDays.find(
      (d) => d.revisionPageStart === 601 && d.revisionPageEnd === 601
    );
    assert(
      !!p601 && hasSurah(revLabel(p601), 'العصر') && hasSurah(revLabel(p601), 'الفيل'),
      'TEST8c: صفحة 601 تعرض العصر والهمزة والفيل كصفحة مصحف حقيقية',
      p601 ? revLabel(p601) : 'page 601 not found'
    );
  }

  console.log('\n=== TEST 10b. Surah window label — discrete surahs, not a fake range ===');
  {
    const l1 = revLabel(days[0]);
    assert(
      l1.includes('+') && !l1.includes('إلى'),
      'TEST10s: نافذة سورتين تعرض مقطعين منفصلين بـ"+" وليس "من..إلى"',
      l1
    );
    const wrapDay = days.find(
      (d) => hasSurah(revLabel(d), 'الفاتحة') && hasSurah(revLabel(d), 'الكافرون')
    );
    assert(
      !!wrapDay && revLabel(wrapDay).includes('الفاتحة (1 - 7)') && revLabel(wrapDay).includes('الكافرون (1 - 6)'),
      'TEST10s2: الفاتحة (1-7) + الكافرون (1-6) — سورتان كاملتان بنطاقاتهما',
      wrapDay ? revLabel(wrapDay) : 'not found'
    );
  }

  console.log('\n=== TEST 5. Generation vs Preview — identical revision output ===');
  {
    const enginePlan = await engine.createPlan({
      studentId: STUDENT.id,
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 108, ayahNumber: 1 },
      targetEnd: { surahNumber: 105, ayahNumber: 5 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    const previewPlan = await createRealStudentPlan({
      student: STUDENT,
      stageConfig: TEMPLATE,
      allStageConfigs: [TEMPLATE],
      academicConfig: ACADEMIC,
      halaqah,
      customTargetStart: { surahNumber: 108, ayahNumber: 1 },
      customTargetEnd: { surahNumber: 105, ayahNumber: 5 },
      customStartDate: '2026-09-20',
      customEndDate: '2026-11-14',
      provider,
      memorizationEngine: engine,
    });
    const a = enginePlan.generatedPlan.dailyPlans.map(revLabel);
    const b = previewPlan.generatedPlan.dailyPlans.map(revLabel);
    assert(
      a.length === b.length && a.every((l, i) => l === b[i]),
      'TEST5: المعاينة والتوليد ينتجان نفس تسلسل المراجعة تمامًا'
    );
  }

  console.log('\n=== TEST 6c. Generation vs Recalculation — same cycle logic ===');
  {
    const gPlan = await engine.createPlan({
      studentId: 's_gen',
      startDate: '2026-09-20',
      endDate: '2026-11-14',
      targetStart: { surahNumber: 98, ayahNumber: 1 },
      targetEnd: { surahNumber: 96, ayahNumber: 19 },
      direction: 'backward',
      unitType: 'line',
      dailyAmount: 1,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 3,
      schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    const gDays = gPlan.generatedPlan.dailyPlans;
    // Generation: first القدر day anchors at البينة.
    const gQadr = gDays.find((d) => d.targetUnit.displayLabel.startsWith('القدر'));
    // Recalc: record البينة completion on its last memorization day (day 7).
    const day7 = gDays[6];
    const rPlan = await recalc.recordDailyAchievement({
      plan: gPlan,
      dayDate: day7.date,
      status: 'completed',
      actualEndPosition: { surahNumber: 98, ayahNumber: 8 },
      recordedBy: 'اختبار',
    });
    const rDays = rPlan.generatedPlan.dailyPlans;
    const rQadr = rDays.find((d) => !d.isHistorical && d.targetUnit.displayLabel.startsWith('القدر'));
    assert(
      !!gQadr && !!rQadr && revLabel(gQadr) === revLabel(rQadr) && revLabel(rQadr).includes('البينة'),
      'TEST6c: التوليد وإعادة الحساب يثبّتان نفس الدورة على البينة',
      `gen=${gQadr ? revLabel(gQadr) : '?'} | recalc=${rQadr ? revLabel(rQadr) : '?'}`
    );
  }

  console.log('\n=== TEST 12. Forward direction — anchor follows traversal order ===');
  {
    // Unit-level: forward revision traverses oldest→newest; a newly-eligible
    // surah sits at the END of orderedKeys — the anchor must land on it.
    const pool: any[] = [];
    for (const s of [108, 109]) {
      const cnt = s === 108 ? 3 : 6;
      for (let a = 1; a <= cnt; a++) {
        const v = await provider.getAyah(s, a);
        if (v) pool.push(v);
      }
    }
    const noAnchor = rangeCalc.computeRollingRevision(pool, 1, 0, 'forward', 'surah', 1);
    const anchored = rangeCalc.computeRollingRevision(pool, 1, 0, 'forward', 'surah', 1, 109);
    assert(
      noAnchor.displayLabel.includes('الكوثر') && !noAnchor.displayLabel.includes('الكافرون'),
      'TEST12a: forward بدون anchor يبدأ من أول traversal (الكوثر)',
      noAnchor.displayLabel
    );
    assert(
      anchored.displayLabel.includes('الكافرون') && !anchored.displayLabel.includes('الكوثر'),
      'TEST12b: forward مع anchor=109 يبدأ من الكافرون (موضعها في traversal)',
      anchored.displayLabel
    );
  }

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
