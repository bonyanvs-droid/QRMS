/**
 * Verifies: (1) grade-specific target beats stage target, (2) at_risk headroom
 * spans ALL academic terms, (3) recalc uses the same horizon, (4) consolidation
 * prepend no longer inflates the risk numerator.
 * Run: npx tsx scripts/verifyTermHorizon.mts
 */
import { BundledQuranProvider } from '../src/quran/providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../src/quran/services/memorizationEngine';
import { PlanRecalculationService } from '../src/quran/services/recalculationService';
import {
  createRealStudentPlan,
  resolveQuranPlanConfiguration,
} from '../src/quran/services/studentPlanBridge';
import {
  buildTermHorizonWindows,
  countWorkingDaysInHorizon,
} from '../src/quran/utils/termHorizon';
import { addDaysToDate } from '../src/quran/utils/dateUtils';
import { StageQuranConfig } from '../src/quran/models/stageConfig';
import { AcademicYearConfig, Halaqah, Student } from '../src/types';

const provider = new BundledQuranProvider();
const engine = new QuranMemorizationPlanningEngine(provider);
const recalc = new PlanRecalculationService(provider);

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

const BARAEM: StageQuranConfig = {
  id: 'baraem',
  name: 'مرحلة البراعم',
  code: 'baraem',
  memorization: {
    unitType: 'line',
    defaultDailyAmount: 1,
    defaultDirection: 'backward',
    defaultTargetStart: { surahNumber: 114, ayahNumber: 1 },
    defaultTargetEnd: { surahNumber: 88, ayahNumber: 26 },
  },
  revision: {
    mode: 'surahs',
    unitType: 'surah',
    defaultDailyAmount: 1,
    defaultDirection: 'backward',
    surahsPerDay: 2,
  },
  consolidationDays: 3,
  schedule: { workingDays: [0, 1, 2, 3] },
  defaultTermWeeks: 12,
  isActive: true,
} as any;

// Mirrors production: term_1 ends 2026-12-31, term_2 ends 2027-06-25,
// term_3 overlaps inside term_2 (data anomaly preserved to test dedupe).
const ACADEMIC: AcademicYearConfig = {
  id: 'ay_1447_t2',
  name: 'العام الدراسي 1448 هـ',
  semester: 'الفصل الدراسي الأول',
  startDate: '2026-08-30',
  endDate: '2026-12-31',
  operationalStartWeek: 3,
  operationalEndWeek: 14,
  totalWeeks: 12,
  currentWeek: 6,
  daysPerWeek: 4,
  spellingPassingThreshold: 85,
  systemType: 'two_terms',
  activeTermId: 'term_1',
  gradeTargets: {
    baraem: { minSurah: 'الغاشية', label: 'مرحلة البراعم: الغاشية' },
    tamheedi: { minSurah: 'الفيل', label: 'تمهيدي: الفيل' },
    grade1: { minSurah: 'الضحى', label: 'أول: الضحى' },
    grade2: { minSurah: 'الغاشية', label: 'ثاني: الغاشية' },
  },
  terms: [
    {
      id: 'term_1', termNumber: 1, name: 'الفصل الأول', isCurrent: true,
      startDate: '2026-08-30', endDate: '2026-12-31',
      operationalStartWeek: 3, operationalEndWeek: 14, totalWeeks: 12, currentWeek: 6,
      officialHolidays: [{ id: 'h1', name: 'مطولة', startDate: '2026-10-15', endDate: '2026-10-18' }],
      gradeTargets: {},
    },
    {
      id: 'term_2', termNumber: 2, name: 'الفصل الثاني', isCurrent: false,
      startDate: '2027-01-17', endDate: '2027-06-25',
      operationalStartWeek: 3, operationalEndWeek: 14, totalWeeks: 12, currentWeek: 3,
      officialHolidays: [
        { id: 'h2', name: 'التأسيس', startDate: '2027-02-21', endDate: '2027-02-22' },
        { id: 'h3', name: 'الأضحى', startDate: '2027-05-13', endDate: '2027-05-20' },
      ],
      gradeTargets: {},
    },
    {
      id: 'term_3', termNumber: 3, name: 'الفصل الثالث', isCurrent: false,
      startDate: '2027-02-28', endDate: '2027-06-03', // overlaps term_2 entirely
      operationalStartWeek: 3, operationalEndWeek: 14, totalWeeks: 12, currentWeek: 3,
      gradeTargets: {},
    },
  ],
} as AcademicYearConfig;

const mkStudent = (id: string, grade: string): Student =>
  ({
    id,
    fullName: `طالب ${grade}`,
    grade,
    stageId: 'baraem',
    halaqahId: 'hq_1',
    teacherId: 't1',
    status: 'active',
    currentSurah: 'الناس',
    currentAyah: 0,
  } as any);

const halaqah = {
  id: 'hq_1', name: 'حلقة', teacherId: 't1', daysPerWeek: 4, isActive: true,
  activeTrackIds: ['track_quran'],
} as Halaqah;

async function main() {
  const surahs = await provider.getSurahs();

  console.log('\n=== A. مستهدف الصف يسبق مستهدف المرحلة ===');
  for (const [grade, expectedSurah, label] of [
    ['الأول ابتدائي', 93, 'الضحى'],
    ['الثاني ابتدائي', 88, 'الغاشية'],
    ['التمهيدي', 105, 'الفيل'],
  ] as const) {
    const cfg = resolveQuranPlanConfiguration(
      {
        student: mkStudent(`s_${expectedSurah}`, grade),
        stageConfig: BARAEM,
        allStageConfigs: [BARAEM],
        academicConfig: ACADEMIC,
        halaqah,
      } as any,
      surahs
    );
    assert(
      cfg.targetEnd.surahNumber === expectedSurah && cfg.targetSource === 'academic_year',
      `${grade} → ${label}`,
      `got surah ${cfg.targetEnd.surahNumber} via ${cfg.targetSource}`
    );
  }

  // Stage fallback when the grade has no entry
  const cfgFallback = resolveQuranPlanConfiguration(
    {
      student: mkStudent('s_unknown', 'صف سابع'),
      stageConfig: BARAEM,
      allStageConfigs: [BARAEM],
      academicConfig: ACADEMIC,
      halaqah,
    } as any,
    surahs
  );
  assert(
    cfgFallback.targetEnd.surahNumber === 88,
    'صف بلا خانة → يعود لمستهدف المرحلة (الغاشية)',
    `got ${cfgFallback.targetEnd.surahNumber}`
  );

  console.log('\n=== B. الأفق يمتد عبر الفصول ===');
  const windows = buildTermHorizonWindows(ACADEMIC);
  assert(windows.length === 3, `بُنيت ${windows.length} نوافذ فصلية`);
  const afterOct5 = '2026-10-05';
  const horizonDays = countWorkingDaysInHorizon(afterOct5, windows, [0, 1, 2, 3]);
  const term1Only = countWorkingDaysInHorizon(
    afterOct5,
    windows.filter((w) => w.startDate === '2026-08-30'),
    [0, 1, 2, 3]
  );
  console.log(`   أيام الفصل الأول المتبقية: ${term1Only} — أفق العام كاملاً: ${horizonDays}`);
  assert(horizonDays > term1Only * 2, 'أفق العام أوسع بكثير من الفصل الأول', `${horizonDays} vs ${term1Only}`);
  // dedupe check: term_3 is fully inside term_2 → no double counting
  const expectedMax =
    countWorkingDaysInHorizon(afterOct5, [windows[0]], [0, 1, 2, 3]) +
    countWorkingDaysInHorizon(afterOct5, [windows[1]], [0, 1, 2, 3]);
  assert(horizonDays === expectedMax, 'الفصل المتداخل لا يُحتسب مرتين', `${horizonDays} === ${expectedMax}`);

  console.log('\n=== C. إنشاء خطة: at_risk يقاس على العام كاملاً ===');
  // تمهيدي backward الناس→الفيل (~60 وحدة) — تتجاوز أيام الفصل الأول (49)
  // لكنها تتّسع في أفق العام (135) → يجب ألا تكون at_risk.
  const plan = await createRealStudentPlan({
    student: mkStudent('s_tam', 'التمهيدي'),
    stageConfig: BARAEM,
    allStageConfigs: [BARAEM],
    academicConfig: ACADEMIC,
    halaqah,
    provider,
    memorizationEngine: engine,
  } as any);
  assert(plan.targetEnd.surahNumber === 105, `مستهدف الخطة = الفيل`, `got ${plan.targetEnd.surahNumber}`);
  console.log(`   status=${plan.status} أيام-الخطة=${plan.generatedPlan.dailyPlans.length} نهاية=${plan.endDate} وحدات=${plan.originalTarget?.totalUnits}`);
  assert(plan.status === 'active', 'الخطة ليست at_risk رغم تجاوز وحداتها أيام الفصل الأول');

  console.log('\n=== D. إعادة الحساب: نفس الأفق + لا تضخيم للتثبيت ===');
  const workDay = plan.generatedPlan.dailyPlans.find((d) => d.dayType !== 'holiday' && !d.isHistorical);
  const updated = await recalc.recordDailyAchievement({
    plan,
    dayDate: workDay!.date,
    status: 'completed',
    recordedBy: 'معلم اختبار',
    academicConfig: ACADEMIC,
  });
  assert(
    updated.status === 'active',
    'بعد رصد إنجاز تبقى active (وحدات المستهدف ≤ أيام العام)',
    `got ${updated.status}`
  );

  // Negative control: a target that cannot fit even the whole year stays at_risk
  const impossible = await engine.createPlan({
    studentId: 's_huge',
    startDate: '2026-10-05',
    endDate: '2026-12-31',
    targetStart: { surahNumber: 1, ayahNumber: 1 },
    targetEnd: { surahNumber: 67, ayahNumber: 30 }, // forward — الفاتحة→الملك (~2000 وحدة)
    direction: 'forward',
    unitType: 'line',
    dailyAmount: 1,
    consolidationDaysPerSurah: 3,
    schedule: { workingDays: [0, 1, 2, 3], holidays: [] },
    autoMinorRevisionMode: false,
    academicTerms: windows,
  });
  console.log(
    `   impossible: status=${impossible.status} وحدات=${impossible.originalTarget?.totalUnits} ` +
      `أيام=${impossible.targetAtRiskDiagnostic?.remainingWorkingDays}`
  );
  assert(impossible.status === 'at_risk', 'هدف يتجاوز العام كاملاً → at_risk');

  console.log(`\n${passed} ناجح / ${failed} فاشل`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
