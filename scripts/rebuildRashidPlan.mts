// Rebuilds Rashid's active plan_data to its pristine state (all days pending,
// currentPosition = targetStart) — removes the baked-in test achievements.
import pg from 'pg';
import { snakeToCamelCase } from '../src/db/schema';
import { createRealStudentPlan } from '../src/quran/services/studentPlanBridge';
import { BundledQuranProvider } from '../src/quran/providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../src/quran/services/memorizationEngine';
import { QuranRevisionPlanningEngine } from '../src/quran/services/revisionEngine';

const PLAN_ID = 'plan_mem_std_tenant_1789346881267_1789365129760_ufxap_1790759225553';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();

const all = async <T = any>(t: string) =>
  (await client.query(`SELECT * FROM ${t}`)).rows.map((r) => snakeToCamelCase(r));

const rashid = (await all('students')).find((s: any) => s.fullName?.includes('راشد'));
const sessionRecords = (await all('daily_session_records')).filter((r: any) => r.studentId === rashid.id);
const halaqah = (await all('halaqahs')).find((h: any) => h.id === rashid.halaqahId);
const stageConfigs = await all('quran_stage_configs');
const stages = await all('stages');
const academicConfig = (await all('academic_years')).find((y: any) => y.isActive);
const spellingLessons = await all('spelling_lessons');
const tenant = (await all('tenants')).find((t: any) => t.id === rashid.tenantId);
const stageConfig = stageConfigs.find((c: any) => c.id === 'baraem' || c.stageId === 'baraem');

const provider = new BundledQuranProvider();
const fresh = await createRealStudentPlan({
  student: rashid,
  stageConfig,
  allStageConfigs: stageConfigs,
  academicConfig,
  sessionRecords,
  halaqah,
  stages,
  tenant,
  spellingLessons,
  provider,
  memorizationEngine: new QuranMemorizationPlanningEngine(provider),
  revisionEngine: new QuranRevisionPlanningEngine(provider),
  // Same params the plan was created with (read from its stored columns)
  customTargetStart: { surahNumber: 1, ayahNumber: 1 },
  customTargetEnd: { surahNumber: 93, ayahNumber: 11 },
  customStartDate: '2026-09-30',
  customEndDate: '2026-12-31',
  customDirection: 'backward',
  customUnitType: 'line',
  customDailyAmount: 1,
  customWorkingDays: [0, 1, 2, 3],
  customConsolidationDays: 3,
  autoMinorRevisionMode: true,
  customRevisionDailyPages: 1,
  customRevisionDirection: 'backward',
  planType: 'combined',
});

// Keep the existing row identity; replace only the generated state
fresh.id = PLAN_ID;
fresh.currentPosition = fresh.targetStart;
fresh.status = 'active';
fresh.recalculationHistory = [];

const days = fresh.generatedPlan?.dailyPlans || [];
const locked = days.filter((d: any) => d.isLocked || d.status !== 'pending').length;
console.log('rebuilt days:', days.length, '| locked/achieved:', locked, '| first target:', days[0]?.targetUnit?.displayLabel, '| pos:', JSON.stringify(fresh.currentPosition));
if (locked > 0) throw new Error('rebuild still contains locked days — aborting');

await client.query(
  `UPDATE quran_plans SET plan_data = $2::jsonb, updated_at = NOW() WHERE id = $1`,
  [PLAN_ID, JSON.stringify(fresh)]
);
// Student pointer back to the plan start for a clean experiment
await client.query(
  `UPDATE students SET current_surah='الفاتحة', current_ayah=1, updated_at=NOW() WHERE id=$1`,
  [rashid.id]
);
console.log('PLAN RESET ✓ + pointer → الفاتحة:1');
await client.end();
