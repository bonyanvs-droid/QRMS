import pg from 'pg';
import { findSurahMetadata } from '../src/utils/quranMetadata';

// One-off data hygiene:
//  1. students.current_surah written in English transliteration by the old sync
//     path (e.g. 'Al-Maa'un') → Arabic name.
//  2. daily_session_records memorization/revision surah_from/surah_to holding
//     Latin transliterations → Arabic name.
//  3. The single future-dated session record (bug residue: record took the
//     consumed milestone's date instead of the actual recording day).
// Usage: DATABASE_URL=<prod> npx tsx scripts/normalizeSurahNames.mts [--apply]

const APPLY = process.argv.includes('--apply');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();

const hasLatin = (v: unknown): v is string => typeof v === 'string' && /[A-Za-z]/.test(v);
const toArabic = (v: string) => findSurahMetadata(v)?.arabicName ?? null;

// ---------- 1. students.current_surah ----------
const students = await client.query<{ id: string; full_name: string; current_surah: string }>(
  `SELECT id, full_name, current_surah FROM students
   WHERE is_archived IS DISTINCT FROM true AND current_surah ~ '[A-Za-z]'`
);
console.log(`\n== students.current_surah (English) — ${students.rows.length} ==`);
for (const s of students.rows) {
  const ar = toArabic(s.current_surah);
  console.log(`  ${s.full_name}: '${s.current_surah}' -> '${ar ?? 'UNRESOLVED'}'`);
  if (APPLY && ar) {
    await client.query(`UPDATE students SET current_surah=$1, updated_at=NOW() WHERE id=$2`, [ar, s.id]);
  }
}

// ---------- 2. session-record surah fields ----------
const recs = await client.query<{
  id: string; memorization: Record<string, unknown> | null; revision: Record<string, unknown> | null;
}>(
  `SELECT id, memorization, revision FROM daily_session_records
   WHERE memorization->>'surah_to' ~ '[A-Za-z]' OR memorization->>'surah_from' ~ '[A-Za-z]'
      OR revision->>'surah_to' ~ '[A-Za-z]' OR revision->>'surah_from' ~ '[A-Za-z]'`
);
console.log(`\n== session records w/ English surah names — ${recs.rows.length} ==`);
let fixed = 0, skipped = 0;
for (const r of recs.rows) {
  let changed = false;
  for (const key of ['memorization', 'revision'] as const) {
    const obj = r[key];
    if (!obj) continue;
    for (const f of ['surah_from', 'surah_to']) {
      const v = obj[f];
      if (hasLatin(v)) {
        const ar = toArabic(v);
        if (ar) { obj[f] = ar; changed = true; }
        else console.log(`  UNRESOLVED ${r.id} ${key}.${f}='${v}'`);
      }
    }
  }
  if (changed) {
    fixed++;
    if (APPLY) {
      await client.query(
        `UPDATE daily_session_records SET memorization=$1, revision=$2, updated_at=NOW() WHERE id=$3`,
        [JSON.stringify(r.memorization), JSON.stringify(r.revision), r.id]
      );
    }
  } else skipped++;
}
console.log(`  ${fixed} records normalized${APPLY ? '' : ' (dry-run)'}, ${skipped} unresolved`);

// ---------- 3. future-dated record ----------
const future = await client.query<{ id: string; date: string; created_at: string }>(
  `SELECT id, date, created_at FROM daily_session_records WHERE date > CURRENT_DATE`
);
console.log(`\n== future-dated records — ${future.rows.length} ==`);
for (const r of future.rows) {
  const realDate = r.created_at.toISOString().slice(0, 10);
  console.log(`  ${r.id}: date ${r.date.toISOString?.().slice(0, 10) ?? r.date} -> ${realDate} (created_at)`);
  if (APPLY) {
    await client.query(`UPDATE daily_session_records SET date=$1, updated_at=NOW() WHERE id=$2`, [realDate, r.id]);
  }
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN — re-run with --apply'}`);
await client.end();
