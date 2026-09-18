/**
 * QRMS Migration Engine - Required-Field & Abort-On-First-Error Regression Tests
 *
 * Covers the production failure found in run QRMS-MIG-20260917-NYH826JW:
 *   quran_stage_configs / stage_copy_1789456040402 ->
 *   null value in column "name" violates not-null constraint
 *   -> "current transaction is aborted" cascade.
 *
 * Verifies:
 * 1. transformDocument never emits name=null for quran_stage_configs
 *    (derives strictly from the document's own fields, never invents data).
 * 2. Preflight surfaces missing required fields BEFORE any transaction.
 * 3. First SQL error stops migration immediately: ROLLBACK, no COMMIT,
 *    no further INSERT statements inside the aborted transaction.
 * 4. Tenant -> users foreign-key regression still passes (97bceb3 fix intact).
 */

import {
  executeControlledMigration,
  executeMigrationPreflight,
  MigrationDbClient,
} from '../core/realMigrationEngine';
import { transformDocument } from '../transformers/typeTransformers';
import { COLLECTION_MAPPINGS } from '../config/collectionMap';
import { MockPostgresTransactionalClient } from './realMigrationIntegrationTest';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

/**
 * Mock client that fails on INSERT into a specific table,
 * simulating the real NOT NULL violation seen in production.
 */
class TargetedFailureClient extends MockPostgresTransactionalClient {
  public failOnTable: string | null = null;
  public failMessage = 'Simulated NOT NULL violation';

  async query(sql: string, params?: any[]): Promise<any> {
    const trimmed = sql.trim();
    if (this.failOnTable && trimmed.startsWith(`INSERT INTO ${this.failOnTable}`)) {
      // Record the attempted query before failing, like a real driver would
      this.executedQueries.push({ sql: trimmed, params });
      throw new Error(this.failMessage);
    }
    return super.query(sql, params);
  }
}

async function runStageCopyRegressionTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  const check = (name: string, fn: () => void) => {
    try {
      fn();
      passed++;
      console.log(`PASS: ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL: ${name} -> ${err?.message}`);
    }
  };

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

  const qscConfig = COLLECTION_MAPPINGS['quran_stage_configs'];

  // ---------------------------------------------------------------------------
  // TEST 1: stage_copy doc missing `name` -> derived from its own `code`
  // ---------------------------------------------------------------------------
  check('Transformer derives name from doc code when name is absent', () => {
    const doc = {
      id: 'stage_copy_1789456040402',
      code: 'copy_0402',
      description: 'نسخة من معيار مرحلة',
    };
    const t = transformDocument(doc.id, doc, qscConfig.fieldMappings, 'id');
    assert(t.data.name === 'copy_0402', `expected name='copy_0402', got '${t.data.name}'`);
    assert(t.data.name !== null && t.data.name !== undefined && t.data.name !== '', 'name must be non-null/non-empty');
  });

  // ---------------------------------------------------------------------------
  // TEST 2: doc missing name AND code -> falls back to the document's own id
  // ---------------------------------------------------------------------------
  check('Transformer falls back to document id when name+code absent', () => {
    const doc = { id: 'stage_copy_1789456040402' };
    const t = transformDocument(doc.id, doc, qscConfig.fieldMappings, 'id');
    assert(t.data.name === 'stage_copy_1789456040402', `expected name=docId, got '${t.data.name}'`);
    assert(t.data.code === 'stage_copy_1789456040402', `expected code=docId, got '${t.data.code}'`);
  });

  // ---------------------------------------------------------------------------
  // TEST 3: doc with explicit name -> preserved verbatim (no override)
  // ---------------------------------------------------------------------------
  check('Transformer preserves an explicitly provided name', () => {
    const doc = { id: 'tamheedi_foundation', name: 'مرحلة التمهيدي (روضة / تمهيدي)', code: 'tamheedi' };
    const t = transformDocument(doc.id, doc, qscConfig.fieldMappings, 'id');
    assert(t.data.name === 'مرحلة التمهيدي (روضة / تمهيدي)', `name overwritten: '${t.data.name}'`);
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Preflight surfaces missing name as WARNING (derivable), not fatal
  // ---------------------------------------------------------------------------
  check('Preflight flags missing name as derivable warning, not fatal error', () => {
    const preflight = executeMigrationPreflight({
      collections: {
        tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        quran_stage_configs: [{ id: 'stage_copy_1789456040402', code: 'copy_0402' }],
      },
    });
    const fatalForName = preflight.errors.filter((e) => e.includes('stage_copy_1789456040402'));
    assert(fatalForName.length === 0, `missing name must NOT be a fatal error: ${fatalForName[0]}`);
    const warnForName = preflight.warnings.filter((w) => w.includes('stage_copy_1789456040402'));
    assert(warnForName.length > 0, 'expected a warning documenting the name derivation');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Preflight produces FATAL error for a non-derivable required field
  // ---------------------------------------------------------------------------
  check('Preflight blocks migration on non-derivable required field (missing slug)', () => {
    const preflight = executeMigrationPreflight({
      collections: {
        tenants: [{ id: 'tenant_1', name: 'مجمع بدون slug' }],
      },
    });
    const fatal = preflight.errors.filter((e) => e.includes('tenant_1') && e.includes('slug'));
    assert(fatal.length > 0, 'expected a fatal preflight error for missing required slug');
    assert(preflight.safetyCheckPassed === false, 'safetyCheckPassed must be false with fatal errors');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Abort-on-first-error -> ROLLBACK, no COMMIT, no further INSERTs
  // ---------------------------------------------------------------------------
  await asyncCheck('First SQL error stops migration: ROLLBACK issued, COMMIT absent, no more INSERTs', async () => {
    const client = new TargetedFailureClient();
    client.failOnTable = 'quran_stage_configs';
    client.failMessage = 'null value in column "name" of relation "quran_stage_configs" violates not-null constraint';

    const backup = {
      collections: {
        tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        quran_stage_configs: [{ id: 'stage_copy_1789456040402', code: 'copy_0402' }],
        platform_users: [{ id: 'usr_1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' }],
        students: [{ id: 'std_1', fullName: 'طالب', grade: 'الأول', tenantId: 'ghazzawi' }],
      },
    };

    let thrown: any = null;
    try {
      await executeControlledMigration(client, backup, {
        migrationRunId: 'QRMS-MIG-ABORT-TEST',
        confirmedByAdmin: true,
        confirmationText: 'START_CONTROLLED_MIGRATION',
        adminEmail: 'admin@qrms.system',
      });
    } catch (err: any) {
      thrown = err;
    }

    assert(thrown !== null, 'migration must throw on first SQL error');
    assert(
      thrown.message.includes('not-null constraint'),
      `thrown error must be the FIRST real SQL error, got: ${thrown.message}`
    );

    const sqls = client.executedQueries.map((q) => q.sql);
    const failIdx = sqls.findIndex((s) => s.startsWith('INSERT INTO quran_stage_configs'));
    assert(failIdx >= 0, 'the failing INSERT was attempted');

    const after = sqls.slice(failIdx + 1);
    const insertsAfter = after.filter((s) => s.startsWith('INSERT INTO') && !s.startsWith('INSERT INTO migration_'));
    assert(insertsAfter.length === 0, `no data-table INSERTs allowed after first error, found: ${insertsAfter[0]}`);

    assert(sqls.includes('ROLLBACK'), 'ROLLBACK must be issued');
    assert(!sqls.includes('COMMIT'), 'COMMIT must never be issued after a failure');
    assert(client.inTransaction === false, 'transaction must be closed after rollback');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Tenant -> users FK regression (97bceb3 fix must remain intact)
  // ---------------------------------------------------------------------------
  await asyncCheck('Tenant FK resolution regression: tenants -> users commits cleanly', async () => {
    const client = new MockPostgresTransactionalClient();
    const backup = {
      collections: {
        tenants: [{ id: 'tenant_1789346881267', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        platform_users: [
          { id: 'usr_t1', name: 'معلم أول', phone: '0500000001', role: 'teacher', tenantId: 'ghazzawi' },
        ],
        teachers: [{ id: 'tch_9', name: 'معلم ثان', phone: '0500000002', tenantId: 'ghazzawi' }],
        halaqahs: [
          { id: 'hlq_1', name: 'حلقة', teacherId: 'tch_9', teacherName: 'معلم ثان', tenantId: 'ghazzawi' },
        ],
      },
    };

    const res = await executeControlledMigration(client, backup, {
      migrationRunId: 'QRMS-MIG-TENANT-REGRESSION',
      confirmedByAdmin: true,
      confirmationText: 'START_CONTROLLED_MIGRATION',
      adminEmail: 'admin@qrms.system',
    });

    assert(res.success === true, `expected success, got status=${res.migrationRun.status}`);
    const usersTable = client.tables.get('users')!;
    const teacherUser = usersTable.get('usr_tch_9');
    assert(teacherUser !== undefined, 'merged teacher user usr_tch_9 must exist');
    assert(
      teacherUser.tenant_id === 'tenant_1789346881267',
      `teacher tenant_id must resolve to real tenants.id, got '${teacherUser.tenant_id}'`
    );
    const hlq = client.tables.get('halaqahs')!.get('hlq_1');
    assert(hlq?.teacher_id === 'usr_tch_9', `halaqahs.teacher_id must map to usr_tch_9, got '${hlq?.teacher_id}'`);
  });

  console.log('\n===============================================================');
  console.log(`STAGE_COPY / REQUIRED-FIELD / ABORT TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStageCopyRegressionTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
