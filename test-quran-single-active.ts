/**
 * Single-Active-Plan + Achievement-Preservation test suite (dev DB).
 * Simulates the exact save/archive/selection flows used by the app.
 */
import { BundledQuranProvider } from './src/quran/providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from './src/quran/services/memorizationEngine';
import {
  createRealStudentPlan,
  resolveLastAchievedPosition,
  nextPositionInDirection,
} from './src/quran/services/studentPlanBridge';
import { selectActiveStudentPlan } from './src/quran/utils/planNormalizer';
import { DEFAULT_STAGE_CONFIGS } from './src/quran/models/stageConfig';

const API = 'http://127.0.0.1:3301/api';
const TENANT = 'tenant_1789346881267';
const OTHER_TENANT = 'tenant_test_other';
let passed = 0, failed = 0;
const ok = (cond: boolean, name: string) => {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}`); }
};

async function api(method: string, path: string, body?: any, tenant = TENANT) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenant },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
const getPlans = (tenant = TENANT) => api('GET', '/quran_plans', undefined, tenant);
const savePlan = (p: any, tenant = TENANT) => api('POST', '/quran_plans', p, tenant);

const run = async () => {
  const provider = new BundledQuranProvider();
  const surahs = await provider.getSurahs();
  const engine = new QuranMemorizationPlanningEngine(provider);
  const stageConfig = DEFAULT_STAGE_CONFIGS[0];
  const student: any = {
    id: 'std_test_single_active',
    fullName: 'اختبار الطالب الواحد',
    grade: stageConfig.targetGrades[0] || 'الرابع',
    tenantId: TENANT,
    currentSurah: 'الفاتحة',
    currentAyah: 7,
  };
  const mkRec = (id: string, date: string, surahTo: string, ayahTo: number): any => ({
    id, studentId: student.id, date,
    memorization: { surahFrom: 'الفاتحة', ayahFrom: 1, surahTo, ayahTo, passed: true, minutesSpent: 10 },
  });

  console.log('\n== UNIT: achievement-position resolution ==');
  {
    const recs = [mkRec('r1', '2026-09-10', 'الفاتحة', 4), mkRec('r2', '2026-09-15', 'الفاتحة', 7)];
    const last = resolveLastAchievedPosition(student, recs, surahs);
    ok(last?.surahNumber === 1 && last?.ayahNumber === 7, 'latest session record wins (ayah 7, not 4)');
    const next = nextPositionInDirection(last!, 'backward', surahs);
    ok(next?.surahNumber === 114 && next?.ayahNumber === 1, 'completed الفاتحة → next in backward order = الناس 1');
    const mid = nextPositionInDirection({ surahNumber: 1, ayahNumber: 4 }, 'backward', surahs);
    ok(mid?.surahNumber === 1 && mid?.ayahNumber === 5, 'mid-surah: ayah+1 within same surah');
    const end = nextPositionInDirection({ surahNumber: 1, ayahNumber: 7 }, 'forward', surahs);
    ok(end?.surahNumber === 2 && end?.ayahNumber === 1, 'end-of-surah → next surah ayah 1 (forward)');
    const bw = nextPositionInDirection({ surahNumber: 105, ayahNumber: 5 }, 'backward', surahs);
    ok(bw?.surahNumber === 104 && bw?.ayahNumber === 1, 'end-of-surah → قريش 1 (backward)');
    const en = resolveLastAchievedPosition({ ...student, currentSurah: 'Al-Faatiha' }, [], surahs);
    ok(en?.surahNumber === 1, 'English surah name resolves (Al-Faatiha)');
    const none = resolveLastAchievedPosition({ id: 'x' }, [], surahs);
    ok(none === null, 'no achievement → null (no guessed position)');
  }

  console.log('\n== BRIDGE: plan starts after last achievement ==');
  const recs = [mkRec('r1', '2026-09-15', 'الفاتحة', 7)];
  const plan = await createRealStudentPlan({
    student, stageConfig, allStageConfigs: DEFAULT_STAGE_CONFIGS,
    sessionRecords: recs, provider, memorizationEngine: engine,
  });
  ok(plan.targetStart.surahNumber === 114 && plan.targetStart.ayahNumber === 1,
    `targetStart = الناس 1 (الفاتحة complete → next in governed order) — got ${plan.targetStart.surahNumber}:${plan.targetStart.ayahNumber}`);
  ok((plan.generatedPlan.dailyPlans?.length ?? 0) > 0, 'plan generated with dailyPlans');
  ok(plan.isCurrentActive === true && plan.status === 'active', 'new plan is active');

  console.log('\n== BRIDGE: session record beats stale student pointer ==');
  const plan2 = await createRealStudentPlan({
    student: { ...student, currentSurah: 'الفاتحة', currentAyah: 3 },
    stageConfig, allStageConfigs: DEFAULT_STAGE_CONFIGS,
    sessionRecords: [mkRec('r9', '2026-09-18', 'الفاتحة', 4)],
    provider, memorizationEngine: engine,
  });
  ok(plan2.targetStart.surahNumber === 1 && plan2.targetStart.ayahNumber === 5,
    'over-achieved: starts after recorded 4, not stale 3');

  console.log('\n== BRIDGE: under-achieved resumes from actual ==');
  const plan3 = await createRealStudentPlan({
    student: { ...student, currentSurah: 'الفاتحة', currentAyah: 7 },
    stageConfig, allStageConfigs: DEFAULT_STAGE_CONFIGS,
    sessionRecords: [mkRec('r10', '2026-09-18', 'الفاتحة', 3)],
    provider, memorizationEngine: engine,
  });
  ok(plan3.targetStart.ayahNumber === 4, 'under-achieved: resumes after actual 3 → ayah 4');

  console.log('\n== SELECTOR: canonical active-plan pick ==');
  {
    const empty = { id: 'empty', studentId: student.id, status: 'active' } as any;
    const archived = { ...plan, id: 'arch', status: 'archived', isCurrentActive: false } as any;
    ok(selectActiveStudentPlan([empty, plan])?.id === plan.id, 'hydrated active beats empty active');
    ok(selectActiveStudentPlan([archived, empty])?.id === 'empty', 'archived never selected');
    ok(selectActiveStudentPlan([archived]) === null, 'all-archived → null (no fake plan)');
    ok(selectActiveStudentPlan([]) === null, 'no plans → null, no crash');
  }

  console.log('\n== DB ROUND TRIP: save → archive → single active ==');
  const TEST_STUDENT = 'std_tenant_1789346881267_1789365129757_bcb39';
  const planDb = { ...plan, id: `plan_test_${Date.now()}`, studentId: TEST_STUDENT, tenantId: TENANT };
  const legacyEmpty: any = { id: `plan_test_legacy_${Date.now()}`, studentId: TEST_STUDENT, tenantId: TENANT, status: 'active', isCurrentActive: true };
  const legacyOld: any = { id: `plan_test_old_${Date.now()}`, studentId: TEST_STUDENT, tenantId: TENANT, status: 'at_risk' };

  await savePlan(legacyOld); await savePlan(legacyEmpty); await savePlan(planDb);
  let list = (await getPlans()).data.filter((p: any) => p.studentId === TEST_STUDENT);
  ok(list.length === 3, '3 plans persisted for test student');

  // simulate archiveOtherStudentQuranPlans
  for (const p of list) {
    if (p.id === planDb.id || p.status === 'archived' || p.status === 'completed') continue;
    await savePlan({ ...p, status: 'archived', isCurrentActive: false });
  }
  list = (await getPlans()).data.filter((p: any) => p.studentId === TEST_STUDENT);
  const actives = list.filter((p: any) => p.isCurrentActive === true || p.status === 'active' || p.status === 'at_risk');
  ok(actives.length === 1 && actives[0].id === planDb.id, 'TEST1: exactly ONE active plan per student');
  ok(list.filter((p: any) => p.status === 'archived').length === 2, 'both legacy plans archived');
  ok(selectActiveStudentPlan(list)?.id === planDb.id, 'TEST5/6: selector returns the kept plan after reload');
  ok((list.find((p: any) => p.id === legacyEmpty.id)?.generatedPlan?.dailyPlans?.length ?? 0) === 0,
    'TEST11: archived row preserved, data untouched (still empty, not deleted)');

  console.log('\n== TENANT isolation ==');
  const other = (await getPlans(OTHER_TENANT)).data.filter((p: any) => p.studentId === TEST_STUDENT);
  ok(other.length === 0, 'TEST10: tenant B sees zero plans of tenant A student');

  console.log('\n== CLEANUP test rows ==');
  for (const p of list) await api('DELETE', `/quran_plans/${p.id}`);
  const after = (await getPlans()).data.filter((p: any) => p.studentId === TEST_STUDENT);
  ok(after.length === 0, 'test rows removed');
  ok(selectActiveStudentPlan(after) === null, 'TEST12: no plan → null');

  console.log(`\n======== ${passed} passed, ${failed} failed ========`);
  process.exit(failed ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
