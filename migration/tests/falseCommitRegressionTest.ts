/**
 * QRMS FALSE-COMMIT / SILENT-ROLLBACK Regression Tests
 *
 * Reproduces the exact production bug of run QRMS-MIG-20260918-I9E2JVJ6:
 * migration_runs/migration_logs missing → in-transaction logging INSERT failed
 * and was swallowed → transaction ABORTED → PostgreSQL silently converted
 * COMMIT into ROLLBACK → engine falsely reported COMPLETED / VERIFIED /
 * COMMIT SUCCESS while the database stayed EMPTY.
 *
 * Scenarios:
 *   A) migration_runs table missing → migration FAILS, ROLLBACK issued,
 *      NOT completed, target tables remain EMPTY.
 *   B) migration tables exist → COMMIT succeeds → post-COMMIT verification
 *      finds actual committed records → only then COMPLETED + VERIFIED.
 *   C) COMMIT returns command 'ROLLBACK' (aborted transaction) → migration
 *      FAILS — never reports COMMIT SUCCESS.
 */

import {
  executeControlledMigration,
  MigrationDbClient,
} from '../core/realMigrationEngine';
import { MockPostgresTransactionalClient } from './realMigrationIntegrationTest';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

/** Mock whose COMMIT is silently converted to ROLLBACK (aborted transaction). */
class SilentRollbackCommitClient extends MockPostgresTransactionalClient {
  public commitWasCalled = false;
  async query(sql: string, params?: any[]): Promise<any> {
    if (sql.trim() === 'COMMIT') {
      this.commitWasCalled = true;
      // PostgreSQL behavior: COMMIT on an aborted transaction returns
      // command tag ROLLBACK WITHOUT raising an error to the client.
      return { command: 'ROLLBACK' };
    }
    return super.query(sql, params);
  }
}

async function runFalseCommitRegressionTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  const asyncCheck = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      passed++;
      console.log(`PASS: ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL: ${name} -> ${err?.message}`);
    }
  };

  const MIGRATION_PARAMS = {
    confirmedByAdmin: true,
    confirmationText: 'START_CONTROLLED_MIGRATION',
    adminEmail: 'admin@qrms.system',
  };

  const backupData = {
    collections: {
      tenants: [{ id: 'tenant_1789346881267', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
      platform_users: [
        { id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' },
      ],
      teachers: [
        { id: 'tch_tenant_1', name: 'عثمان محمد عيسى', phone: '0555555551', tenantId: 'ghazzawi' },
      ],
      halaqahs: [
        { id: 'hlq_1', name: 'حلقة أبي بكر', teacherId: 'tch_tenant_1', teacherName: 'عثمان محمد عيسى', tenantId: 'ghazzawi' },
      ],
      students: [
        { id: 'std_tenant_1789346881267_1789365129758_br7v7', fullName: 'طالب الاختبار', grade: 'الأول', halaqahId: 'hlq_1', tenantId: 'ghazzawi' },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // SCENARIO A: migration_runs table missing → FAIL + ROLLBACK + EMPTY tables
  // (exact reproduction of the production false-success bug)
  // ---------------------------------------------------------------------------
  await asyncCheck('Scenario A: missing migration_runs → FAIL, ROLLBACK, empty tables, never COMPLETED', async () => {
    const client = new MockPostgresTransactionalClient();
    // Simulate the production state that caused the bug: table does not exist
    client.tables.delete('migration_runs');

    let thrown: any = null;
    try {
      await executeControlledMigration(client, backupData, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-FC-A' });
    } catch (err: any) {
      thrown = err;
    }

    assert(thrown !== null, 'migration MUST fail when migration_runs is missing');
    assert(
      thrown.message.includes('migration_runs'),
      `error must name the missing table, got: ${thrown.message}`
    );

    const sqls = client.executedQueries.map((q) => q.sql);
    assert(!sqls.includes('COMMIT'), 'COMMIT must never be issued in this scenario');
    assert(sqls.includes('ROLLBACK'), 'ROLLBACK must be issued');
    assert(!sqls.some((s) => s.startsWith('INSERT INTO students')), 'no student row may be inserted');

    // Target tables must remain EMPTY — no false-success state
    assert(client.tables.get('students')?.size === 0, 'students table must be empty');
    assert(client.tables.get('users')?.size === 0, 'users table must be empty');
    assert(client.tables.get('tenants')?.size === 0, 'tenants table must be empty');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO B: tables exist → COMMIT confirmed → post-COMMIT verification
  // → only then COMPLETED + VERIFIED
  // ---------------------------------------------------------------------------
  await asyncCheck('Scenario B: full success — COMMIT confirmed, post-COMMIT rows verified, run persisted', async () => {
    const client = new MockPostgresTransactionalClient();

    const res = await executeControlledMigration(client, backupData, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-FC-B' });

    assert(res.success === true, `migration must succeed, got status=${res.migrationRun.status}`);
    assert(res.migrationRun.status === 'COMPLETED', `status must be COMPLETED, got ${res.migrationRun.status}`);
    assert(res.migrationRun.verificationStatus === 'VERIFIED', 'verification must be VERIFIED');

    const sqls = client.executedQueries.map((q) => q.sql);
    const beginIdx = sqls.indexOf('BEGIN');
    const commitIdx = sqls.indexOf('COMMIT');
    assert(beginIdx >= 0 && commitIdx > beginIdx, 'BEGIN must precede COMMIT');

    // Post-COMMIT verification queries ran AFTER the COMMIT
    const postCommitCounts = sqls.slice(commitIdx + 1).filter((s) => s.includes('SELECT COUNT(*)::int AS count FROM'));
    assert(postCommitCounts.length >= 7, `post-commit verification must query all key tables, got ${postCommitCounts.length}`);

    // Actual committed data exists in the mock database
    assert(client.tables.get('students')?.size === 1, 'student row committed');
    assert(client.tables.get('tenants')?.size === 1, 'tenant row committed');
    assert(client.tables.get('users')?.size === 3, 'users committed (1 platform + 1 teacher + 1 admin)');
    assert(client.tables.get('halaqahs')?.size === 1, 'halaqah committed');

    // Run record + logs persisted AFTER commit (separate operations)
    assert(client.tables.get('migration_runs')?.has('QRMS-MIG-FC-B'), 'run record persisted in migration_runs');
    assert((client.tables.get('migration_logs')?.size || 0) > 0, 'item logs persisted in migration_logs');

    // The COMMIT log entry exists and was pushed only after the confirmed commit
    const commitLog = res.logs.find((l) => l.documentId === 'COMMIT');
    assert(commitLog?.status === 'SUCCESS', 'COMMIT log entry recorded');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO C: COMMIT silently converted to ROLLBACK → FAIL, never COMPLETED
  // ---------------------------------------------------------------------------
  await asyncCheck('Scenario C: COMMIT converted to ROLLBACK by PostgreSQL → migration FAILS', async () => {
    const client = new SilentRollbackCommitClient();

    let thrown: any = null;
    try {
      await executeControlledMigration(client, backupData, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-FC-C' });
    } catch (err: any) {
      thrown = err;
    }

    assert(thrown !== null, 'migration MUST fail when COMMIT does not actually commit');
    assert(
      thrown.message.includes('COMMIT'),
      `error must explain the failed COMMIT, got: ${thrown.message}`
    );
    assert(client.commitWasCalled, 'COMMIT was attempted');
    assert(client.tables.get('students')?.size === 0, 'no student rows may persist after failed commit');
    assert(client.tables.get('users')?.size === 0, 'no user rows may persist after failed commit');
  });

  console.log('\n===============================================================');
  console.log(`FALSE COMMIT REGRESSION TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFalseCommitRegressionTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
