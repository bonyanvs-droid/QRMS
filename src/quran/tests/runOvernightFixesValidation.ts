/**
 * QRMS Quran Planning — Overnight Fixes Validation
 *
 * Covers the phases implemented in this pass:
 *  A. Template source-of-truth resolver (resolveQuranPlanConfiguration)
 *  B. Independent revision direction consumed end-to-end
 *  C. Template revision mode/unit consumption
 *  D. Revision eligibility — incomplete current surah excluded from seed
 *  E. Auto minor revision seeding incl. Al-Fatihah in backward plans
 *  F. Recalculation after achievement (history immutable, future rebuilt)
 *  H. Active track resolution from halaqah subscription
 *  I. Spelling distribution on plan days gated by the spelling track
 *  J. Academic target precedence chain
 *
 * Run: npx tsx src/quran/tests/runOvernightFixesValidation.ts
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
import { Student, Halaqah, AcademicYearConfig, SpellingLesson } from '../../types';
import { getSurahAyahsCount } from '../../utils/quranMetadata';
import {
  buildPlanArchive,
  findPlanRelatedRecords,
  isRecordPlanArchived,
} from '../services/planArchiveService';
import { selectActiveStudentPlan } from '../utils/planNormalizer';
import { DailySessionRecord } from '../../types';

let passed = 0;
let failed = 0;
function assert(cond: boolean, title: string, details?: string) {
  if (cond) {
    console.log(`  [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${title}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

const provider = new BundledQuranProvider();
const rangeCalc = new RangeCalculator(provider);
const engine = new QuranMemorizationPlanningEngine(provider);
const recalc = new PlanRecalculationService(provider);

const TEMPLATE: StageQuranConfig = {
  id: 'tamheedi_foundation',
  name: 'مرحلة التمهيدي',
  code: 'tamheedi',
  targetGrades: ['تمهيدي'],
  memorization: {
    unitType: 'ayah',
    defaultDailyAmount: 3,
    defaultDirection: 'backward',
    defaultTargetStart: { surahNumber: 114, ayahNumber: 1 },
    defaultTargetEnd: { surahNumber: 105, ayahNumber: 5 },
  },
  revision: {
    mode: 'pages',
    unitType: 'page',
    defaultDailyAmount: 1,
    defaultDailyPages: 2,
    defaultDirection: 'backward',
    defaultTargetStart: { surahNumber: 114, ayahNumber: 1 },
    defaultTargetEnd: { surahNumber: 1, ayahNumber: 7 },
    surahsPerDay: 2,
  },
  consolidationDays: 2,
  schedule: { workingDays: [0, 1, 2, 3] },
  defaultTermWeeks: 8,
  isActive: true,
};

const STUDENT: Student = {
  id: 'std_test_1',
  fullName: 'طالب الاختبار',
  grade: 'تمهيدي' as any,
  halaqahId: 'hq_1',
  teacherId: 't1',
  parentPhone: '0500000000',
  minimumTargetSurah: 'الغاشية',
  status: 'active' as any,
  currentSpellingLessonId: '',
  currentSpellingScore: 0,
  currentSurah: '',
  currentAyah: 0,
};

const ACADEMIC: AcademicYearConfig = {
  id: 'ay_1',
  name: 'العام الدراسي التجريبي',
  semester: 'الفصل الأول',
  startDate: '2025-01-01',
  endDate: '2027-12-31',
  operationalStartWeek: 1,
  operationalEndWeek: 40,
  totalWeeks: 40,
  currentWeek: 5,
  daysPerWeek: 4,
  spellingPassingThreshold: 85,
  gradeTargets: { tamheedi: { minSurah: 'الفيل', label: 'تمهيدي' } },
};

const SPELLING_LESSONS: SpellingLesson[] = Array.from({ length: 8 }, (_, i) => ({
  id: `sl_${i + 1}`,
  lessonNumber: i + 1,
  title: `درس ${i + 1}`,
  expectedWeek: i + 1,
  subLessons: [],
  order: i + 1,
  isActive: true,
}));

const halaqahWith = (tracks: string[]): Halaqah =>
  ({
    id: 'hq_1',
    name: 'حلقة اختبار',
    teacherId: 't1',
    teacherName: 'معلم',
    location: '',
    daysPerWeek: 4,
    isActive: true,
    activeTrackIds: tracks,
  } as Halaqah);

async function main() {
  const surahs = await provider.getSurahs();

  console.log('\n=== A. Resolved Plan Configuration — template as source of truth ===');
  {
    const cfg = resolveQuranPlanConfiguration(
      { student: STUDENT, stageConfig: TEMPLATE, allStageConfigs: [TEMPLATE], academicConfig: ACADEMIC, halaqah: halaqahWith(['track_quran']) },
      surahs
    );
    assert(cfg.revisionDailyPages === 2, 'revision.defaultDailyPages من القالب مستهلك', `got ${cfg.revisionDailyPages}`);
    assert(cfg.consolidationDays === 2, 'consolidationDays من القالب مستهلك', `got ${cfg.consolidationDays}`);
    assert(cfg.revisionDirection === 'backward', 'revision.defaultDirection من القالب مستهلك');
    assert(cfg.dailyAmount === 3 && cfg.unitType === 'ayah', 'memorization defaults مستهلكة');
    assert(cfg.activeTrackIds.join(',') === 'track_quran', 'اشتراك الحلقة الصريح يُحترم (قرآن فقط)');
    assert(!cfg.spellingEnabled, 'التهجئة معطلة عند غياب track_spelling');
  }

  console.log('\n=== H. Track resolution ===');
  {
    const cfg = resolveQuranPlanConfiguration(
      { student: STUDENT, stageConfig: TEMPLATE, academicConfig: ACADEMIC, halaqah: halaqahWith(['track_quran', 'track_spelling']) },
      surahs
    );
    assert(cfg.spellingEnabled, 'track_spelling صريح يفعّل التهجئة');
    const cfgDefault = resolveQuranPlanConfiguration(
      { student: STUDENT, stageConfig: TEMPLATE, academicConfig: ACADEMIC },
      surahs
    );
    assert(cfgDefault.spellingEnabled, 'غياب الاشتراك → المجموعة الافتراضية (DB default)');
  }

  console.log('\n=== J. Academic target precedence ===');
  {
    const r = (over: Partial<Parameters<typeof resolveQuranPlanConfiguration>[0]>) =>
      resolveQuranPlanConfiguration(
        { student: STUDENT, stageConfig: TEMPLATE, academicConfig: ACADEMIC, ...over },
        surahs
      );
    const explicit = r({ customTargetEnd: { surahNumber: 90, ayahNumber: 20 } });
    assert(explicit.targetSource === 'explicit' && explicit.targetEnd.surahNumber === 90, 'explicit > كل المصادر');
    const personal = r({ student: { ...STUDENT, personalTargetSurah: 'الشمس' } as Student });
    assert(personal.targetSource === 'personal' && personal.targetEnd.surahNumber === 91, 'personal > academic_year');
    const academic = r({});
    assert(academic.targetSource === 'academic_year' && academic.targetEnd.surahNumber === 105, `academic_year يستخدم gradeTargets (الفيل=105) — got ${academic.targetSource}/${academic.targetEnd.surahNumber}`);
    const minimum = r({ academicConfig: undefined });
    assert(minimum.targetSource === 'student_minimum' && minimum.targetEnd.surahNumber === 88, 'minimumTargetSurah احتياطي');
  }

  console.log('\n=== B. Independent revision direction ===');
  {
    const mkPlan = (revDir: 'forward' | 'backward') =>
      engine.createPlan({
        studentId: 's1',
        startDate: '2026-02-01', // Sunday
        endDate: '2026-03-31',
        targetStart: { surahNumber: 114, ayahNumber: 1 },
        targetEnd: { surahNumber: 110, ayahNumber: 3 },
        direction: 'backward',
        unitType: 'ayah',
        dailyAmount: 3,
        revisionDailyPages: 1,
        consolidationDaysPerSurah: 0,
        schedule: { workingDays: [0, 1, 2, 3, 4], holidays: [] },
        autoMinorRevisionMode: true,
        revisionDirection: revDir,
      });
    const back = await mkPlan('backward');
    const fwd = await mkPlan('forward');
    const backLabels = back.generatedPlan.dailyPlans.map((d) => d.revisionDisplayLabel);
    const fwdLabels = fwd.generatedPlan.dailyPlans.map((d) => d.revisionDisplayLabel);
    assert(back.revisionDirection === 'backward' && fwd.revisionDirection === 'forward', 'revisionDirection تُحفظ في الخطة');
    assert(
      JSON.stringify(backLabels) !== JSON.stringify(fwdLabels),
      'اتجاه مراجعة مختلف ينتج تسلسل مراجعة مختلف',
      JSON.stringify({ back: backLabels.slice(0, 4), fwd: fwdLabels.slice(0, 4) })
    );
    console.log('   backward:', backLabels.slice(0, 4).join(' | '));
    console.log('   forward :', fwdLabels.slice(0, 4).join(' | '));
  }

  console.log('\n=== D+E. Revision eligibility — seed excludes incomplete surah, includes Fatiha ===');
  {
    // Student memorized [الفاتحة + الناس..الانفطار(82)] fully and التكوير(81) partially (15/29).
    const seed = await rangeCalc.getCompletedMemorizedVerses(
      { surahNumber: 81, ayahNumber: 15 },
      'backward'
    );
    assert(
      !seed.some((v) => v.surahNumber === 81),
      'البذرة تستبعد السورة الجزئية الحالية (التكوير 15/29)'
    );
    assert(
      seed.some((v) => v.surahNumber === 1) && seed.some((v) => v.surahNumber === 82),
      'البذرة تشمل الفاتحة + السور المكتملة (114..82)'
    );
    assert(!seed.some((v) => v.surahNumber === 80), 'البذرة لا تتجاوز الموضع الحالي');

    // Once the plan covers the surah cumulatively it becomes eligible — the
    // seed fix only controls what was memorized BEFORE the plan.
    // Auto Minor Revision now restarts the cycle at each newly-eligible surah
    // (newest-first), so a large prior pool's tail may not be reached within a
    // restart-heavy plan. Use a small pool (plan starts at الناس → seed = الفاتحة
    // only) to verify الفاتحة still cycles inside the eligible pool.
    const plan = await engine.createPlan({
      studentId: 's2',
      startDate: '2026-02-01',
      endDate: '2026-04-30',
      targetStart: { surahNumber: 114, ayahNumber: 1 },
      targetEnd: { surahNumber: 112, ayahNumber: 4 },
      direction: 'backward',
      unitType: 'ayah',
      dailyAmount: 5,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 0,
      schedule: { workingDays: [0, 1, 2, 3, 4], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
    });
    const hasFatiha = plan.generatedPlan.dailyPlans.some((d) =>
      (d.revisionDisplayLabel || '').includes('الفاتحة')
    );
    assert(hasFatiha, 'الفاتحة تدور في مراجعات الخطة للمسار التنازلي');
  }

  console.log('\n=== C. Surah-mode revision (template surahsPerDay) ===');
  {
    const plan = await engine.createPlan({
      studentId: 's3',
      startDate: '2026-02-01',
      endDate: '2026-04-30',
      targetStart: { surahNumber: 114, ayahNumber: 1 },
      targetEnd: { surahNumber: 110, ayahNumber: 3 },
      direction: 'backward',
      unitType: 'ayah',
      dailyAmount: 2,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 0,
      schedule: { workingDays: [0, 1, 2, 3, 4], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
      revisionUnitKind: 'surah',
      revisionUnitsPerWindow: 2,
    });
    assert(plan.revisionSettings?.unitType === 'surah', 'revisionSettings.unitType محفوظ');
    const labels = plan.generatedPlan.dailyPlans.slice(3, 8).map((d) => d.revisionDisplayLabel || '');
    console.log('   surah-mode labels:', labels.join(' | '));
    assert(labels.every((l) => l.startsWith('مراجعة')), 'نوافذ مراجعة بالسور تنتج تسميات صحيحة');
  }

  console.log('\n=== F. Recalculation — history locked, future rebuilt, no seed leak ===');
  {
    const plan = await engine.createPlan({
      studentId: 's4',
      startDate: '2026-02-01',
      endDate: '2026-04-30',
      targetStart: { surahNumber: 114, ayahNumber: 1 },
      targetEnd: { surahNumber: 108, ayahNumber: 3 },
      direction: 'backward',
      unitType: 'ayah',
      dailyAmount: 2,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 0,
      schedule: { workingDays: [0, 1, 2, 3, 4], holidays: [] },
      autoMinorRevisionMode: true,
      revisionDirection: 'backward',
    });
    const d0 = plan.generatedPlan.dailyPlans[0];
    const before = JSON.stringify(d0);
    const updated = await recalc.recordDailyAchievement({
      plan,
      dayDate: d0.date,
      status: 'partial',
      actualEndPosition: { surahNumber: 114, ayahNumber: 4 }, // الناس جزئياً (4/6)
      recordedBy: 'اختبار',
    });
    const after0 = updated.generatedPlan.dailyPlans[0];
    assert(JSON.stringify(after0.targetUnit) === JSON.stringify(d0.targetUnit), 'المقرر التاريخي لليوم المسجل لم يتغير', before);
    assert(after0.isLocked === true && after0.isHistorical === true, 'اليوم المسجل مقفل تاريخيًا');
    // الناس لم تكتمل → البذرة تستبعدها (الفاتحة فقط)، لكنها تدخل لاحقًا عبر
    // وحدات الخطة التراكمية بشكل شرعي. نتحقق من البذرة نفسها.
    const recalcSeed = await rangeCalc.getCompletedMemorizedVerses(
      { surahNumber: 114, ayahNumber: 4 },
      'backward'
    );
    assert(
      recalcSeed.every((v) => v.surahNumber === 1),
      'بذرة إعادة الحساب بعد إنجاز جزئي = الفاتحة فقط (الناس غير مكتملة)',
      `${recalcSeed.length} verses`
    );
    const futureRev = updated.generatedPlan.dailyPlans
      .slice(1, 10)
      .map((d) => d.revisionDisplayLabel || '');
    assert(
      !futureRev.some((l) => l.includes('المدثر') || l.includes('المرسلات')),
      'لا مراجعة لسور خارج المحفوظ الفعلي',
      futureRev.join(' | ')
    );
    assert(updated.currentPosition?.surahNumber === 114 && updated.currentPosition?.ayahNumber === 4, 'currentPosition يعكس الإنجاز الفعلي');
    assert((updated.recalculationHistory || []).length >= 1, 'سجل إعادة الحساب موثّق');

    // excused → 'absence' trigger (كان يُسجَّل خطأً achievement_surplus)
    // ملاحظة: recalculationHistory يضاف بـ unshift — الأحدث في المقدمة.
    const upd2 = await recalc.recordDailyAchievement({
      plan: updated,
      dayDate: updated.generatedPlan.dailyPlans[1].date,
      status: 'excused',
      recordedBy: 'اختبار',
    });
    const lastEvent = upd2.recalculationHistory?.[0];
    assert(lastEvent?.trigger === 'absence', 'excused يسجل trigger=absence', `got ${lastEvent?.trigger}`);
  }

  console.log('\n=== Manual revision — independent direction honored ===');
  {
    const plan = await engine.createPlan({
      studentId: 's5',
      startDate: '2026-02-01',
      endDate: '2026-04-30',
      targetStart: { surahNumber: 100, ayahNumber: 1 },
      targetEnd: { surahNumber: 95, ayahNumber: 8 },
      direction: 'backward',
      unitType: 'ayah',
      dailyAmount: 3,
      revisionDailyPages: 1,
      consolidationDaysPerSurah: 0,
      schedule: { workingDays: [0, 1, 2, 3, 4], holidays: [] },
      autoMinorRevisionMode: false,
      manualRevisionRange: {
        start: { surahNumber: 114, ayahNumber: 1 },
        end: { surahNumber: 103, ayahNumber: 3 },
      },
      revisionDirection: 'backward',
    });
    const label = plan.generatedPlan.dailyPlans[0]?.revisionDisplayLabel || '';
    console.log('   manual seed label:', label);
    assert(label.startsWith('مراجعة'), 'النطاق اليدوي يزرع المراجعة');
    assert(plan.manualRevisionRange?.start.surahNumber === 114, 'manualRevisionRange محفوظ للتعادلية');
  }

  console.log('\n=== I. Spelling distribution gated by track subscription ===');
  {
    const withSpelling = await createRealStudentPlan({
      student: STUDENT,
      stageConfig: TEMPLATE,
      allStageConfigs: [TEMPLATE],
      academicConfig: ACADEMIC,
      halaqah: halaqahWith(['track_quran', 'track_spelling']),
      spellingLessons: SPELLING_LESSONS,
      provider,
      memorizationEngine: engine,
    });
    const assigned = withSpelling.generatedPlan.dailyPlans.filter((d) => d.spellingAssignment);
    assert(assigned.length === 8, 'دروس التهجئة الثمانية موزعة على أيام الخطة', `got ${assigned.length}`);
    assert(
      assigned.every((d, i) => d.spellingAssignment!.lessonNumber === i + 1),
      'ترتيب الدروس متسلسل'
    );

    const quranOnly = await createRealStudentPlan({
      student: STUDENT,
      stageConfig: TEMPLATE,
      allStageConfigs: [TEMPLATE],
      academicConfig: ACADEMIC,
      halaqah: halaqahWith(['track_quran']),
      spellingLessons: SPELLING_LESSONS,
      provider,
      memorizationEngine: engine,
    });
    assert(
      !quranOnly.generatedPlan.dailyPlans.some((d) => d.spellingAssignment),
      'حلقة بلا track_spelling → لا توزيع تهجئة'
    );
    assert(quranOnly.activeTrackIds?.join(',') === 'track_quran', 'activeTrackIds محفوظة على الخطة');
    assert(withSpelling.targetSource === 'academic_year', 'targetSource موثّق على الخطة');
  }

  console.log('\n=== Persistence round-trip ===');
  {
    const plan = await createRealStudentPlan({
      student: STUDENT,
      stageConfig: TEMPLATE,
      academicConfig: ACADEMIC,
      halaqah: halaqahWith(['track_quran', 'track_spelling']),
      spellingLessons: SPELLING_LESSONS,
      provider,
      memorizationEngine: engine,
    });
    const revived = JSON.parse(JSON.stringify(plan));
    assert(revived.revisionDirection === 'backward', 'revisionDirection ينجوا من تخزين JSONB');
    assert(revived.targetSource === 'academic_year', 'targetSource ينجوا من التخزين');
    assert(revived.generatedPlan.dailyPlans[0]?.spellingAssignment?.lessonNumber === 1, 'spellingAssignment ينجوا من التخزين');
  }

  console.log('\n=== ARCHIVE — plan_only / plan_and_achievements ===');
  {
    const mkPlan = async () =>
      engine.createPlan({
        studentId: 'std_arch',
        startDate: '2026-02-01',
        endDate: '2026-04-30',
        targetStart: { surahNumber: 114, ayahNumber: 1 },
        targetEnd: { surahNumber: 108, ayahNumber: 3 },
        direction: 'backward',
        unitType: 'ayah',
        dailyAmount: 2,
        revisionDailyPages: 1,
        schedule: { workingDays: [0, 1, 2, 3, 4], holidays: [] },
      });
    const plan = await mkPlan();
    const records: DailySessionRecord[] = [
      // in-window record of THIS student (related)
      {
        id: 'rec_a', studentId: 'std_arch', teacherId: 't1', halaqahId: 'hq_1', date: '2026-02-03',
        weekNumber: 1, attendance: 'present',
        memorization: { surahFrom: 'الناس', ayahFrom: 1, surahTo: 'الناس', ayahTo: 4, score: 90 },
      } as DailySessionRecord,
      // record of ANOTHER student in same window (not related)
      {
        id: 'rec_b', studentId: 'other', teacherId: 't1', halaqahId: 'hq_1', date: '2026-02-03',
        weekNumber: 1, attendance: 'present',
        memorization: { surahFrom: 'الناس', ayahFrom: 1, surahTo: 'الناس', ayahTo: 4, score: 90 },
      } as DailySessionRecord,
      // same student but BEFORE plan window (not related — older history)
      {
        id: 'rec_c', studentId: 'std_arch', teacherId: 't1', halaqahId: 'hq_1', date: '2026-01-01',
        weekNumber: 1, attendance: 'present',
        memorization: { surahFrom: 'الفاتحة', ayahFrom: 1, surahTo: 'الفاتحة', ayahTo: 7, score: 90 },
      } as DailySessionRecord,
      // explicitly linked via _quranPlanId even if outside window (related)
      {
        id: 'rec_d', studentId: 'std_arch', teacherId: 't1', halaqahId: 'hq_1', date: '2026-05-01',
        weekNumber: 1, attendance: 'present',
        memorization: { surahFrom: 'الكوثر', ayahFrom: 1, surahTo: 'الكوثر', ayahTo: 3, score: 90 },
        customTracks: { _quranPlanId: plan.id },
      } as DailySessionRecord,
    ];

    // --- PLAN ONLY ---
    const r1 = buildPlanArchive({
      plan, mode: 'plan_only', actorName: 'مشرف الاختبار',
      sessionRecords: records, archivedAtIso: '2026-03-01T10:00:00.000Z',
    });
    assert(r1.archivedPlan.status === 'archived' && r1.archivedPlan.isCurrentActive === false, 'PLAN_ONLY: status=archived + isCurrentActive=false');
    assert(r1.archivedPlan.generatedPlan.dailyPlans.length === plan.generatedPlan.dailyPlans.length, 'PLAN_ONLY: plan_data كامل محفوظ');
    assert(r1.markedRecords.length === 0, 'PLAN_ONLY: لا تُلمس سجلات الإنجاز');
    assert(r1.archivedPlan.archivedBy === 'مشرف الاختبار' && !!r1.archivedPlan.archivedAt, 'PLAN_ONLY: بيانات الأرشفة موثقة');
    assert(r1.archivedPlan.versionHistory[0].reason?.includes('أرشفة'), 'PLAN_ONLY: حدث إصدار موثق');
    assert(records.every((r) => !isRecordPlanArchived(r)), 'PLAN_ONLY: لا علامات على السجلات');

    // --- PLAN + ACHIEVEMENTS ---
    const r2 = buildPlanArchive({
      plan, mode: 'plan_and_achievements', actorName: 'مشرف الاختبار',
      sessionRecords: records, archivedAtIso: '2026-03-01T10:00:00.000Z',
    });
    const markedIds = r2.markedRecords.map((r) => r.id).sort();
    assert(r2.archivedPlan.status === 'archived', 'PLAN+ACH: الخطة مؤرشفة');
    assert(
      JSON.stringify(markedIds) === JSON.stringify(['rec_a', 'rec_d']),
      'PLAN+ACH: العلاقة student+plan-window + _quranPlanId — لا student فقط',
      markedIds.join(',')
    );
    assert(
      r2.markedRecords.every((r) => isRecordPlanArchived(r) && (r.customTracks as any)._planArchive.planId === plan.id),
      'PLAN+ACH: العلامة تحمل planId الصحيح'
    );
    assert(
      r2.markedRecords.every((r) => r.memorization?.surahTo), 'PLAN+ACH: محتوى السجلات محفوظ — لا حذف'
    );
    // no re-attribution: re-running on already-marked records finds none
    const rerun = findPlanRelatedRecords(plan, r2.markedRecords, '2026-03-01');
    assert(rerun.length === 0, 'PLAN+ACH: سجل مؤرشف مسبقًا لا يُعاد إسناده');

    // New-plan seeding ignores archived records
    const lastPos = (await import('../services/studentPlanBridge')).resolveLastAchievedPosition(
      { id: 'std_arch', currentSurah: '', currentAyah: 0 },
      r2.markedRecords,
      surahs
    );
    assert(lastPos === null, 'PLAN+ACH: resolveLastAchievedPosition يتجاهل السجلات المؤرشفة');

    // selectActiveStudentPlan: archived never returned as active
    const sel = selectActiveStudentPlan([r2.archivedPlan]);
    assert(sel === null || sel.status !== 'archived', 'الخطة المؤرشفة لا تُختار كنشطة');
    const selMixed = selectActiveStudentPlan([r2.archivedPlan, plan]);
    assert(selMixed?.id === plan.id, 'الخطة النشطة تُختار بين أرشيف ونشطة');

    // Persistence round-trip of archive metadata
    const revived = JSON.parse(JSON.stringify(r2.archivedPlan));
    assert(revived.archiveMode === 'plan_and_achievements' && revived.archivedBy === 'مشرف الاختبار', 'بيانات الأرشفة تنجوا من JSONB');
  }

  console.log('\n================================================================');
  console.log(`  RESULT: ${passed} PASSED / ${failed} FAILED (${passed + failed} TOTAL)`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
