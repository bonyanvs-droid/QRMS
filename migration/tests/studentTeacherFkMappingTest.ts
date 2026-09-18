/**
 * QRMS Student -> Teacher FK Mapping Regression Tests
 *
 * Verifies the invariant:
 *   Firestore student.teacherId
 *     -> teacherMapping (raw teacher id -> usr_<rawId>)
 *     -> PostgreSQL users.id
 *     -> students.teacher_id
 *
 * Case A: student.teacherId = raw teacher id present in teachers collection
 *         -> students.teacher_id becomes the mapped usr_<rawId>.
 * Case B: student.teacherId already equals an existing users.id
 *         -> preserved unchanged.
 * Case C: student.teacherId has no mapping and no matching users.id
 *         -> preflight detects and reports the unresolved FK BEFORE the
 *            transaction starts; execution aborts pre-BEGIN.
 */

import {
  executeControlledMigration,
  executeMigrationPreflight,
} from '../core/realMigrationEngine';
import { MockPostgresTransactionalClient } from './realMigrationIntegrationTest';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function runStudentTeacherFkTests(): Promise<void> {
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

  const MIGRATION_PARAMS = {
    confirmedByAdmin: true,
    confirmationText: 'START_CONTROLLED_MIGRATION',
    adminEmail: 'admin@qrms.system',
  };

  // ---------------------------------------------------------------------------
  // CASE A: raw teacherId -> remapped to final users.id usr_<rawId>
  // ---------------------------------------------------------------------------
  await asyncCheck('Case A: student raw teacherId remapped to usr_<rawId> in students.teacher_id', async () => {
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, {
      collections: {
        tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        platform_users: [
          { id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' },
        ],
        teachers: [
          { id: 'tch_tenant_1789346881267_1789365126074_he6zg', name: 'عثمان محمد عيسى', phone: '0555555551', tenantId: 'ghazzawi' },
        ],
        halaqahs: [
          { id: 'hlq_1', name: 'حلقة أبي بكر', teacherId: 'tch_tenant_1789346881267_1789365126074_he6zg', teacherName: 'عثمان محمد عيسى', tenantId: 'ghazzawi' },
        ],
        students: [
          {
            id: 'std_tenant_1789346881267_1789365129757_bcb39',
            fullName: 'طالب الاختبار',
            grade: 'الأول',
            teacherId: 'tch_tenant_1789346881267_1789365126074_he6zg',
            tenantId: 'ghazzawi',
            halaqahId: 'hlq_1',
          },
        ],
      },
    }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-TFK-A' });

    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);

    const student = client.tables.get('students')!.get('std_tenant_1789346881267_1789365129757_bcb39');
    assert(student !== undefined, 'student row must exist with original Firestore document ID');
    assert(
      student.teacher_id === 'usr_tch_tenant_1789346881267_1789365126074_he6zg',
      `students.teacher_id must be the final users.id, got '${student.teacher_id}'`
    );

    // The referenced user must actually exist in users
    const usersTable = client.tables.get('users')!;
    assert(
      usersTable.has('usr_tch_tenant_1789346881267_1789365126074_he6zg'),
      'mapped teacher user must exist in users table'
    );

    // halaqahs regression: same invariant still holds
    const hlq = client.tables.get('halaqahs')!.get('hlq_1');
    assert(
      hlq?.teacher_id === 'usr_tch_tenant_1789346881267_1789365126074_he6zg',
      `halaqahs.teacher_id must remain remapped, got '${hlq?.teacher_id}'`
    );

    // No duplicate teacher user created
    const teacherPrefixedUsers = [...usersTable.keys()].filter((k) => k.includes('he6zg'));
    assert(teacherPrefixedUsers.length === 1, `exactly one merged teacher user expected, got ${teacherPrefixedUsers.length}`);
  });

  // ---------------------------------------------------------------------------
  // CASE B: teacherId already an existing users.id -> preserved
  // ---------------------------------------------------------------------------
  await asyncCheck('Case B: student teacherId already a valid users.id is preserved', async () => {
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, {
      collections: {
        tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        platform_users: [
          { id: 'usr_t1', name: 'معلم مسجل', phone: '0500000001', role: 'teacher', tenantId: 'ghazzawi' },
        ],
        teachers: [],
        students: [
          { id: 'std_2', fullName: 'طالب ثانٍ', grade: 'الثاني', teacherId: 'usr_t1', tenantId: 'ghazzawi' },
        ],
      },
    }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-TFK-B' });

    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);
    const student = client.tables.get('students')!.get('std_2');
    assert(student?.teacher_id === 'usr_t1', `existing users.id must be preserved, got '${student?.teacher_id}'`);
    assert(client.tables.get('users')!.has('usr_t1'), 'usr_t1 must exist in users');
  });

  // ---------------------------------------------------------------------------
  // CASE C: unmappable teacherId -> detected pre-transaction
  // ---------------------------------------------------------------------------
  await asyncCheck('Case C: unmappable teacherId detected by preflight BEFORE migration', async () => {
    const backup = {
      collections: {
        tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        platform_users: [
          { id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' },
        ],
        teachers: [
          { id: 'tch_known', name: 'معلم موجود', phone: '0555555552', tenantId: 'ghazzawi' },
        ],
        students: [
          { id: 'std_3', fullName: 'طالب ثالث', grade: 'الثالث', teacherId: 'tch_ghost', tenantId: 'ghazzawi' },
        ],
      },
    };

    // Preflight reports the unresolved teacher FK
    const preflight = executeMigrationPreflight(backup);
    const unresolved = preflight.errors.filter((e) => e.includes('std_3') && e.includes('tch_ghost'));
    assert(unresolved.length > 0, `preflight must report the unresolved teacher FK, errors: ${preflight.errors.join(' | ')}`);
    assert(preflight.safetyCheckPassed === false, 'safetyCheckPassed must be false with an unresolved teacher FK');

    // Resolvable students must NOT be flagged
    const resolvableBackup = {
      collections: {
        ...backup.collections,
        students: [
          { id: 'std_ok', fullName: 'طالب سليم', grade: 'الأول', teacherId: 'tch_known', tenantId: 'ghazzawi' },
          { id: 'std_ok2', fullName: 'طالب سليم 2', grade: 'الثاني', teacherId: 'usr_t1', tenantId: 'ghazzawi' },
          { id: 'std_ok3', fullName: 'طالب سليم 3', grade: 'الثالث', tenantId: 'ghazzawi' }, // no teacher
        ],
      },
    };
    const preflightOk = executeMigrationPreflight(resolvableBackup);
    const falsePositives = preflightOk.errors.filter((e) => e.includes('std_ok'));
    assert(falsePositives.length === 0, `resolvable students must not be flagged: ${falsePositives[0]}`);
  });

  await asyncCheck('Case C (execution): unmappable teacherId aborts BEFORE BEGIN with no SQL writes', async () => {
    const client = new MockPostgresTransactionalClient();
    let thrown: any = null;
    try {
      await executeControlledMigration(client, {
        collections: {
          tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
          platform_users: [
            { id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' },
          ],
          teachers: [
            { id: 'tch_known', name: 'معلم موجود', phone: '0555555552', tenantId: 'ghazzawi' },
          ],
          students: [
            { id: 'std_3', fullName: 'طالب ثالث', grade: 'الثالث', teacherId: 'tch_ghost', tenantId: 'ghazzawi' },
          ],
        },
      }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-TFK-C' });
    } catch (err: any) {
      thrown = err;
    }

    assert(thrown !== null, 'execution must throw on unresolved teacher FK');
    assert(thrown.message.includes('tch_ghost'), `error must name the unresolved teacher, got: ${thrown.message}`);
    const sqls = client.executedQueries.map((q) => q.sql);
    assert(!sqls.includes('BEGIN'), 'no transaction may start when the teacher FK gate fails');
    assert(!sqls.some((s) => s.startsWith('INSERT INTO students')), 'no student row may be inserted');
    assert(client.tables.get('students')?.size === 0, 'students table must remain empty');
  });

  // ---------------------------------------------------------------------------
  // Preflight sanity: valid Case A data passes preflight cleanly
  // ---------------------------------------------------------------------------
  check('Case A data passes preflight with zero unresolved teacher FK errors', () => {
    const preflight = executeMigrationPreflight({
      collections: {
        tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
        platform_users: [{ id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' }],
        teachers: [{ id: 'tch_tenant_1', name: 'معلم', phone: '0555555551', tenantId: 'ghazzawi' }],
        students: [
          { id: 'std_1', fullName: 'طالب', grade: 'الأول', teacherId: 'tch_tenant_1', tenantId: 'ghazzawi' },
          { id: 'std_2', fullName: 'طالب 2', grade: 'الثاني', teacherId: 'usr_tch_tenant_1', tenantId: 'ghazzawi' },
          { id: 'std_3', fullName: 'طالب 3', grade: 'الثالث', teacherId: 'usr_t1', tenantId: 'ghazzawi' },
        ],
      },
    });
    const teacherErrors = preflight.errors.filter((e) => e.includes('Unresolved Teacher FK'));
    assert(teacherErrors.length === 0, `raw/mapped/platform teacherId forms must all pass, got: ${teacherErrors[0]}`);
  });

  console.log('\n===============================================================');
  console.log(`STUDENT TEACHER FK TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentTeacherFkTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
