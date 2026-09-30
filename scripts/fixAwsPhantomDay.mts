import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();
const planId = 'plan_mem_std_tenant_1789346881267_1789365129759_46gcc_1790615183475';
const r = await client.query(`SELECT plan_data FROM quran_plans WHERE id=$1`, [planId]);
const pd = r.rows[0].plan_data;
const day = pd.generatedPlan.dailyPlans.find((d: any) => d.date === '2026-09-30');
console.log('before:', day.date, day.status, 'locked:', day.isLocked, 'actual:', JSON.stringify(day.actualAchieved?.unit?.end));
day.status = 'pending';
day.isLocked = false;
day.isHistorical = false;
delete day.actualAchieved;
await client.query(`UPDATE quran_plans SET plan_data=$1 WHERE id=$2`, [JSON.stringify(pd), planId]);
const chk = await client.query(
  `SELECT d->>'date' d, d->>'status' s FROM quran_plans, jsonb_array_elements(plan_data->'generatedPlan'->'dailyPlans') d WHERE id=$1 AND d->>'date' BETWEEN '2026-09-28' AND '2026-10-05' ORDER BY 1`, [planId]);
console.table(chk.rows);
await client.end();
