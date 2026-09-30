// Reproduces the plan-creation preview for Rashid using his REAL production
// data — the exact code path ComprehensiveQuranPlanModal takes via
// previewStudentQuranPlan → createRealStudentPlan.
import pg from 'pg';
import { snakeToCamelCase } from '../src/db/schema';
import { createRealStudentPlan } from '../src/quran/services/studentPlanBridge';
import { BundledQuranProvider } from '../src/quran/providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../src/quran/services/memorizationEngine';
import { QuranRevisionPlanningEngine } from '../src/quran/services/revisionEngine';
import { findSurahMetadata } from '../src/utils/quranMetadata';

const DATABASE_URL = process.env.DATABASE_URL!;
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const all = async <T = any>(table: string): Promise<T[]> => {
  const { rows } = await client.query(`SELECT * FROM ${table}`);
  return rows.map((r) => snakeToCamelCase(r));
};

const students = await all('students');
const rashid = students.find((s: any) => s.fullName?.includes('راشد'));
if (!rashid) throw new Error('Rashid not found');
console.log('student:', rashid.fullName, '| currentSurah:', JSON.stringify(rashid.currentSurah), '| ayah:', rashid.currentAyah, '| activePlan:', rashid.activeQuranPlanId);

const sessionRecords = (await all('daily_session_records')).filter((r: any) => r.studentId === rashid.id);
const halaqah = (await all('halaqahs')).find((h: any) => h.id === rashid.halaqahId);
const stageConfigs = await all('quran_stage_configs');
const stages = await all('stages');
const academicYears = await all('academic_years');
const academicConfig = academicYears.find((y: any) => y.isActive) || academicYears[0];
const spellingLessons = await all('spelling_lessons');
const tenant = (await all('tenants')).find((t: any) => t.id === rashid.tenantId);

// Same resolution the modal performs on init: latest recorded surahTo + 1 ayah
const latestMem = sessionRecords
  .filter((r: any) => r.memorization?.surahTo)
  .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))[0];
console.log('latest mem record surahTo:', JSON.stringify(latestMem?.memorization?.surahTo), 'ayahTo:', latestMem?.memorization?.ayahTo);

// What the modal does: findSurahMetadata on the raw stored name
const rawStart = latestMem?.memorization?.surahTo || rashid.currentSurah;
const metaBefore = findSurahMetadata(rawStart);
console.log('findSurahMetadata(raw):', metaBefore ? `${metaBefore.number} ${metaBefore.name}` : 'MISS ← هذا كان يقتل المعاينة');

const provider = new BundledQuranProvider();
const plan = await createRealStudentPlan({
  student: rashid,
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
  customTargetStart: metaBefore ? { surahNumber: metaBefore.number, ayahNumber: (latestMem?.memorization?.ayahTo || rashid.currentAyah || 0) + 1 } : undefined,
  planType: 'combined',
  autoMinorRevisionMode: true,
});

const dp = plan.generatedPlan?.dailyPlans || [];
console.log('\nPLAN BUILT ✓');
console.log('title:', plan.title);
console.log('targetStart:', JSON.stringify(plan.targetStart));
console.log('targetEnd:', JSON.stringify(plan.targetEnd));
console.log('dailyPlans:', dp.length, '| first day:', JSON.stringify(dp[0]?.targetUnit?.displayLabel));

await client.end();
