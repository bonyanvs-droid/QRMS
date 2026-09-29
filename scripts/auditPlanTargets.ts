/**
 * Plan-Target Audit — REPORT ONLY (no writes).
 * -------------------------------------------------------------
 * Re-resolves every active/at_risk Quran plan's academic target with the
 * corrected grade-first resolver and compares it against the stored snapshot.
 * Flags plans whose stored target came from the stage bucket (e.g. الغاشية for
 * براعم) while the student's own grade carries a different grade target.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/auditPlanTargets.ts
 */
import '../server/config/env';
import { getDbPool } from '../server/config/db';
import { BundledQuranProvider } from '../src/quran/providers/BundledQuranProvider';
import { resolveQuranPlanConfiguration } from '../src/quran/services/studentPlanBridge';
import { findStageConfigForStudent } from '../src/quran/models/stageConfig';
import { syncAcademicConfigWithActiveTerm } from '../src/lib/academicYearUtils';
import { getSurahArabicName } from '../src/utils/quranMetadata';

const camelize = (v: any): any =>
  Array.isArray(v)
    ? v.map(camelize)
    : v && typeof v === 'object' && !(v instanceof Date)
      ? Object.fromEntries(
          Object.entries(v).map(([k, val]) => [
            k.replace(/_([a-z])/g, (_m, c) => c.toUpperCase()),
            camelize(val),
          ])
        )
      : v;

async function main() {
  const pool = getDbPool();
  if (!pool) {
    console.error('DATABASE_URL is not configured.');
    process.exit(1);
  }

  const provider = new BundledQuranProvider();
  const surahs = await provider.getSurahs();

  const ayRow = (await pool.query(`SELECT * FROM academic_years LIMIT 1`)).rows[0];
  if (!ayRow) {
    console.error('لا يوجد صف academic_years');
    process.exit(1);
  }
  const academicConfig = syncAcademicConfigWithActiveTerm(camelize(ayRow));

  const stageConfigs = (await pool.query(`SELECT * FROM quran_stage_configs`)).rows.map(camelize);
  const stages = (await pool.query(`SELECT * FROM stages`)).rows.map(camelize);
  const halaqahs = (await pool.query(`SELECT * FROM halaqahs`)).rows.map(camelize);
  const tenants = (await pool.query(`SELECT * FROM tenants`)).rows.map(camelize);
  const students = (await pool.query(
    `SELECT * FROM students WHERE is_active AND NOT is_archived`
  )).rows.map(camelize);
  const plans = (await pool.query(
    `SELECT id, student_id, status, plan_data FROM quran_plans
     WHERE status IN ('active','at_risk') ORDER BY created_at`
  )).rows;

  console.log(
    `\n===== تدقيق مستهدفات الخطط النشطة (${plans.length} خطة) =====\n` +
      `الفصل النشط: ${academicConfig.currentTerm} — مفاتيح المستهدفات: ${Object.keys(
        academicConfig.gradeTargets || {}
      ).join('، ')}\n`
  );

  const studentById = new Map(students.map((s) => [s.id, s]));
  let mismatched = 0;
  const rows: string[] = [];

  for (const p of plans) {
    const plan = p.plan_data;
    const student = studentById.get(p.student_id);
    const stored = plan?.targetEnd;
    const storedLabel = stored
      ? `${getSurahArabicName(stored.surahNumber)}:${stored.ayahNumber}`
      : '—';

    if (!student) {
      rows.push(`⚠ ${p.student_id} — طالب غير موجود | مخزّن: ${storedLabel}`);
      continue;
    }
    if (plan?.targetSource === 'explicit') {
      rows.push(
        `• ${student.fullName} (${student.grade}) — مستهدف يدوي explicit: ${storedLabel} — لا يُقارن`
      );
      continue;
    }

    try {
      const stageConfig = findStageConfigForStudent(student, stageConfigs);
      const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
      const tenant = tenants.find((t) => t.id === student.tenantId);
      const resolved = resolveQuranPlanConfiguration(
        {
          student,
          stageConfig,
          allStageConfigs: stageConfigs,
          academicConfig,
          halaqah,
          stages,
          tenant,
        } as any,
        surahs
      );
      const want = resolved.targetEnd;
      const wantLabel = `${getSurahArabicName(want.surahNumber)}:${want.ayahNumber}`;
      const same =
        stored &&
        stored.surahNumber === want.surahNumber &&
        stored.ayahNumber === want.ayahNumber;
      if (same) {
        rows.push(
          `✓ ${student.fullName} (${student.grade}) — ${storedLabel} = ${wantLabel} [${resolved.targetSource}]`
        );
      } else {
        mismatched++;
        const cur = plan?.currentPosition;
        rows.push(
          `✘ ${student.fullName} (${student.grade}) [${p.status}]\n` +
            `   مخزّن: ${storedLabel} ← المصدر المسجل: ${plan?.targetSource}\n` +
            `   الصحيح: ${wantLabel} [${resolved.targetSource}]\n` +
            `   الموضع الحالي: ${cur ? `${getSurahArabicName(cur.surahNumber)}:${cur.ayahNumber}` : '—'}`
        );
      }
    } catch (e: any) {
      rows.push(`⚠ ${student.fullName} — تعذّر التحليل: ${e?.message}`);
    }
  }

  console.log(rows.join('\n'));
  console.log(`\n===== النتيجة: ${mismatched} خطة بمستهدف مختلف =====\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
