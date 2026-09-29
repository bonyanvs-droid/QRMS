/**
 * Stored-Risk Audit — re-evaluates every plan's persisted at_risk diagnostic
 * against the honest formula (remaining target units vs full-year term
 * horizon) and reports which stored warnings are stale and must be cleared.
 *
 * A diagnostic is STALE when the stored isAtRisk/diagnostic says "won't fit"
 * but the honest recomputation says it fits — those warnings were measured
 * on the old single-term horizon and mislabel healthy plans.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/auditPlanRisk.ts          # dry-run
 *   DATABASE_URL=postgres://... npx tsx scripts/auditPlanRisk.ts --apply  # write
 */
import '../server/config/env';
import { getDbPool } from '../server/config/db';
import { BundledQuranProvider } from '../src/quran/providers/BundledQuranProvider';
import { RangeCalculator } from '../src/quran/services/rangeCalculator';
import { syncAcademicConfigWithActiveTerm } from '../src/lib/academicYearUtils';
import {
  buildTermHorizonWindows,
  countWorkingDaysInHorizon,
  expandHolidayDates,
} from '../src/quran/utils/termHorizon';
import { getSurahArabicName } from '../src/quran/utils/positionFormatter';

const APPLY = process.argv.includes('--apply');
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
  const rangeCalc = new RangeCalculator(provider);

  const ayRow = (await pool.query(`SELECT * FROM academic_years LIMIT 1`)).rows[0];
  const academicConfig = syncAcademicConfigWithActiveTerm(camelize(ayRow));
  const termWindows = buildTermHorizonWindows(academicConfig);

  const students = new Map(
    (await pool.query(`SELECT * FROM students`)).rows.map(camelize).map((s) => [s.id, s])
  );
  const plans = (
    await pool.query(
      `SELECT id, student_id, status, plan_data FROM quran_plans
       WHERE status IN ('active','at_risk') ORDER BY created_at`
    )
  ).rows;

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  console.log(`\n===== تدقيق التنبيهات المخزّنة — ${APPLY ? 'تنفيذ' : 'جاف'} =====\n`);

  let stale = 0;
  let valid = 0;
  let clean = 0;

  for (const row of plans) {
    const plan = row.plan_data;
    const student = students.get(row.student_id) as any;
    const name = student?.fullName || row.student_id;
    if (!plan?.currentPosition || !plan?.targetEnd || !plan?.schedule) {
      clean++;
      continue;
    }

    // Honest numerator: units from the plan's CURRENT position to targetEnd,
    // partitioned with the plan's own pacing + consolidation — exactly what
    // the recalculation service measures.
    const units = await rangeCalc.partitionSurahsWithCumulativePaceAndConsolidation(
      plan.currentPosition,
      plan.targetEnd,
      plan.unitType,
      plan.dailyAmount,
      plan.direction,
      plan.consolidationDaysPerSurah ?? 3,
      plan.revisionDailyPages ?? 1,
      [],
      plan.revisionDirection || 'backward',
      plan.revisionSettings?.unitType || 'page',
      plan.revisionSettings?.surahsPerDay,
      plan.autoMinorRevisionMode !== false
    );

    // Honest denominator: remaining working days through the LAST term's end.
    const remainingDays = termWindows.length
      ? countWorkingDaysInHorizon(
          todayIso,
          termWindows,
          plan.schedule.workingDays || [0, 1, 2, 3],
          expandHolidayDates(plan.schedule.holidays as any[])
        )
      : 0;

    const honestRisk = units.length > remainingDays;
    const storedDiag = plan.targetAtRiskDiagnostic;
    const storedRisk = row.status === 'at_risk' || storedDiag?.isAtRisk === true;
    const cur = `${getSurahArabicName(plan.currentPosition.surahNumber)}:${plan.currentPosition.ayahNumber}`;
    const tgt = `${getSurahArabicName(plan.targetEnd.surahNumber)}:${plan.targetEnd.ayahNumber}`;

    if (storedRisk && honestRisk) {
      valid++;
      console.log(
        `≈ صادق — ${name} | ${cur}→${tgt} | وحدات ${units.length} > أيام ${remainingDays}`
      );
    } else if (storedRisk && !honestRisk) {
      stale++;
      console.log(
        `✘ متقادم — ${name} | ${cur}→${tgt} | مخزّن: خطر (${storedDiag?.remainingWorkingDays ?? '?'} يوماً) | فعلي: ${units.length} وحدة ≤ ${remainingDays} يوماً`
      );
      if (APPLY) {
        plan.status = 'active';
        plan.targetAtRiskDiagnostic = undefined;
        plan.recalculationHistory = [
          {
            id: `riskaudit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            trigger: 'schedule_change',
            effectiveFromDate: todayIso,
            previousRemainingUnits: storedDiag?.remainingUnits ?? units.length,
            newRemainingUnits: units.length,
            targetAtRisk: false,
            notes:
              `تنقية تشخيص متقادم: التنبيه المخزّن قِيس على أفق قديم (${storedDiag?.remainingWorkingDays ?? '?'} يوماً). ` +
              `إعادة القياس على أفق السنة كاملة: ${units.length} وحدة متبقية ≤ ${remainingDays} يوماً متاحاً — الخطة سليمة.`,
          },
          ...(plan.recalculationHistory || []),
        ];
        plan.updatedAt = new Date().toISOString();
        await pool.query(
          `UPDATE quran_plans SET plan_data = $1::jsonb, status = 'active', updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(plan), row.id]
        );
      }
    } else if (!storedRisk && honestRisk) {
      valid++;
      console.log(
        `⚠ خطر غير موثّق — ${name} | ${cur}→${tgt} | فعلي: ${units.length} وحدة > ${remainingDays} يوماً (يحتاج توثيقاً عند أول رصد)`
      );
      if (APPLY) {
        const deficit = units.length - remainingDays;
        plan.status = 'at_risk';
        plan.targetAtRiskDiagnostic = {
          isAtRisk: true,
          originalTarget: plan.originalTarget,
          currentPosition: plan.currentPosition,
          completedUnits: (plan.dailyPlans || []).filter(
            (d: any) => d.status === 'completed' || d.status === 'overachieved'
          ).length,
          remainingUnits: units.length,
          remainingWorkingDays: remainingDays,
          requiredDailyAmount: remainingDays > 0 ? Math.ceil(units.length / remainingDays) : units.length,
          currentDailyAmount: plan.dailyAmount,
          deficitUnits: deficit,
          projectedDeficitDays: deficit,
          warningMessage: `المستهدف (${units.length} يوم/وحدة) يتجاوز عدد أيام الدراسة المتاحة (${remainingDays} يوم) حتى نهاية العام. سيتبقى عجز بمقدار ${deficit} وحدة.`,
          actionableRecommendations: [
            `زيادة معدل الإنجاز اليومي أو تعديل النطاق الدراسي لتغطية الخطة بالكامل.`,
            `إضافة أيام دراسة إضافية للجدول الأسبوعي لتغطية ${deficit} يوماً دراسياً مفقوداً.`,
            `مراجعة الإيقاع اليومي مع المشرف لضمان بلوغ مستهدف الصف.`,
          ],
        };
        plan.updatedAt = new Date().toISOString();
        await pool.query(
          `UPDATE quran_plans SET plan_data = $1::jsonb, status = 'at_risk', updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(plan), row.id]
        );
      }
    } else {
      clean++;
    }
  }

  console.log(
    `\n===== النتيجة: ${stale} متقادم يحتاج حذفاً / ${valid} صادق أو موثَّق / ${clean} سليم بلا تنبيه =====\n`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
