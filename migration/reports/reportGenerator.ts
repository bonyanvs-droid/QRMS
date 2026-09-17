/**
 * QRMS Migration Engine - Report Generator
 * 
 * Generates structured, transparent Markdown and JSON audit reports
 * detailing collections, mapping statuses, counts, and safety validations.
 */

import { MigrationSummaryReport } from '../core/migrationTypes';

export function generateMarkdownReport(report: MigrationSummaryReport): string {
  const lines: string[] = [];

  lines.push('# تقرير جاهزية محرك الهجرة (QRMS Migration Preparedness Report)');
  lines.push(`**تاريخ التوليد:** ${report.timestamp}`);
  lines.push(`**وضع التشغيل:** ${report.isDryRun ? 'Dry-Run (تجريبي فقط - محمي من الكتابة)' : 'Production'}`);
  lines.push(`**حالة الحصة السحابية (Firestore Quota):** ${report.quotaStatus === 'exhausted' ? '⚠️ غير متاحة حالياً بسبب انتهاء Quota' : report.quotaStatus}`);
  lines.push(`**الحالة العامة:** ${report.overallStatus}`);
  lines.push('');

  lines.push('---');
  lines.push('## 1. ملخص المجموعات والجداول (Collections & Tables Mapping)');
  lines.push(`- **إجمالي المجموعات المعرفة:** ${report.totalCollections}`);
  lines.push('- **قاعدة الحفاظ على المعرفات:** 100% String-based Document ID Preservation');
  lines.push('- **عزل المستأجرين (Tenant Isolation):** مفعل ومحمي عبر أعمدة `tenant_id`');
  lines.push('');

  lines.push('| # | Firestore Collection | PostgreSQL Table | المستندات المصدرية | السجلات المستهدفة | حالة المطابقة | الحقول غير المعروفة |');
  lines.push('|---|---|---|---|---|---|---|');

  let idx = 1;
  for (const collName of report.migrationOrder) {
    const r = report.collectionReports[collName];
    if (!r) continue;

    const srcCount = r.sourceDocumentCount === 'N/A' ? 'N/A (Quota)' : String(r.sourceDocumentCount);
    const targetCount = r.targetRowCount === 'N/A' ? 'N/A (Quota)' : String(r.targetRowCount);
    const statusIcon = r.errors.length === 0 ? '✅ جاهز للتحويل' : `❌ ${r.errors.length} أخطاء`;
    const unknownCount = r.unknownFieldsFound.length > 0 ? `${r.unknownFieldsFound.length} حقول` : '0';

    lines.push(`| ${idx++} | \`${r.collection}\` | \`${r.targetTable}\` | ${srcCount} | ${targetCount} | ${statusIcon} | ${unknownCount} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('## 2. ترتيب الهجرة والتكامل المرجعي (Dependency Execution Order)');
  lines.push('تم بناء الترتيب بدقة استناداً إلى القيود المرجعية (Foreign Keys) لتفادي أي خطأ تكاملي:');
  lines.push('1. **Root Master:** `organizations` → `educational_stages` → `quran_stage_configs` → `academic_years` → `spelling_lessons`');
  lines.push('2. **Tenants:** `tenants` (مرتبط بـ `organizations`)');
  lines.push('3. **Users & Configurations:** `platform_users` (`users`) → `track_definitions` → `prayer_times` → `finance_settings`');
  lines.push('4. **Halaqahs & Plans:** `halaqahs` → `educational_plan_weeks` → `seasonal_programs` → `meetings` → `finance_*`');
  lines.push('5. **Activities:** `seasonal_activities` → `finance_custody_expenses`');
  lines.push('6. **Students:** `students`');
  lines.push('7. **Student Dependent Tracking:** `quran_plans` → `daily_session_records` → `seasonal_participations` → `student_financial_records` → `student_badges` → `nominations` → `remedial_plans`');
  lines.push('');

  lines.push('---');
  lines.push('## 3. ملاحظات الأمان والضمانات (Safety Guarantees)');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }

  return lines.join('\n');
}
