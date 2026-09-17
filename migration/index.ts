/**
 * QRMS Migration Engine - CLI & Entry Point
 * 
 * Usage:
 *   npx tsx migration/index.ts --dry-run
 */

import { MigrationEngine } from './core/migrationEngine';
import { generateMarkdownReport } from './reports/reportGenerator';
import { COLLECTION_MAPPINGS } from './config/collectionMap';
import { MIGRATION_ORDER } from './config/migrationOrder';

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--confirm-migration');

  console.log('===============================================================');
  console.log('  QRMS Firestore to PostgreSQL Migration Engine (Phase 3)');
  console.log('===============================================================');

  const engine = new MigrationEngine();
  const report = await engine.executeDryRun({ dryRun: isDryRun });

  console.log('\n[Status] Dry-Run Inspection Complete.');
  console.log(`[Total Collections Configured]: ${report.totalCollections}`);
  console.log(`[Safety Mode]: Read-Only / Reporting Mode (No writes possible)`);
  console.log(`[Quota Notice]: Firestore live read is N/A due to quota limit.\n`);

  const mdReport = generateMarkdownReport(report);
  console.log(mdReport);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((err) => {
    console.error('Migration Dry-Run failed:', err);
    process.exit(1);
  });
}

export { MigrationEngine, COLLECTION_MAPPINGS, MIGRATION_ORDER, generateMarkdownReport };
