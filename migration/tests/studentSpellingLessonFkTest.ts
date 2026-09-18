/**
 * QRMS Student -> Spelling Lesson FK Mapping Regression Tests
 *
 * Verifies the invariant:
 *   Firestore student.currentSpellingLessonId
 *     -> valid spelling_lessons.id (exact, or legacy lesson_N mapped)
 *     -> students.current_spelling_lesson_id
 *
 * Case A: referenced lesson exists in backup and its ID is preserved -> FK succeeds.
 * Case B: referenced lesson is a legacy 'lesson_N' form -> mapped to the real
 *         lesson with that lesson number (backup first, canonical seed second).
 * Case C: referenced lesson genuinely missing -> preflight reports the
 *         unresolved FK BEFORE the transaction starts.
 */

import {
  executeControlledMigration,
  executeMigrationPreflight,
} from '../core/realMigrationEngine';
import { MockPostgresTransactionalClient } from './realMigrationIntegrationTest';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function runStudentSpellingLessonFkTests(): Promise<void> {
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

  const baseCollections = {
    tenants: [{ id: 'tenant_1', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
    platform_users: [
      { id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' },
    ],
    teachers: [],
    spelling_lessons: [
      { id: 'spl_1789449172015', lessonNumber: 1, title: 'حروف الهجاء المفردة' },
      { id: 'spl_1789449309451', lessonNumber: 2, title: 'حروف الهجاء المركبة' },
    ],
  };

  // ---------------------------------------------------------------------------
  // CASE A: lesson exists in backup, ID preserved verbatim
  // ---------------------------------------------------------------------------
  await asyncCheck('Case A: exact backup lesson id preserved in students.current_spelling_lesson_id', async () => {
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, {
      collections: {
        ...baseCollections,
        students: [
          {
            id: 'std_tenant_1789346881267_1789365129757_bcb39',
            fullName: 'طالب الاختبار',
            grade: 'الأول',
            currentSpellingLessonId: 'spl_1789449172015',
            tenantId: 'ghazzawi',
          },
        ],
      },
    }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-SPL-A' });

    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);
    const student = client.tables.get('students')!.get('std_tenant_1789346881267_1789365129757_bcb39');
    assert(student !== undefined, 'student row must exist with original document ID');
    assert(
      student.current_spelling_lesson_id === 'spl_1789449172015',
      `exact backup lesson id must be preserved, got '${student.current_spelling_lesson_id}'`
    );
    assert(
      client.tables.get('spelling_lessons')!.has('spl_1789449172015'),
      'referenced backup lesson must exist in spelling_lessons table'
    );
  });

  // ---------------------------------------------------------------------------
  // CASE B1: legacy 'lesson_N' with a matching backup lesson (lessonNumber N)
  // ---------------------------------------------------------------------------
  await asyncCheck('Case B1: legacy lesson_1 mapped to backup lesson with lessonNumber 1', async () => {
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, {
      collections: {
        ...baseCollections,
        students: [
          { id: 'std_b1', fullName: 'طالب بدرس قديم', grade: 'الأول', currentSpellingLessonId: 'lesson_1', tenantId: 'ghazzawi' },
        ],
      },
    }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-SPL-B1' });

    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);
    const student = client.tables.get('students')!.get('std_b1');
    assert(
      student?.current_spelling_lesson_id === 'spl_1789449172015',
      `legacy lesson_1 must map to backup lesson spl_1789449172015, got '${student?.current_spelling_lesson_id}'`
    );
  });

  // ---------------------------------------------------------------------------
  // CASE B2: legacy 'lesson_N' with no backup lesson -> canonical seed spl_N
  // ---------------------------------------------------------------------------
  await asyncCheck('Case B2: legacy lesson_3 mapped to canonical seed spl_3 (no backup lesson 3)', async () => {
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, {
      collections: {
        ...baseCollections,
        students: [
          { id: 'std_b2', fullName: 'طالب بدرس قديم ٣', grade: 'الثاني', currentSpellingLessonId: 'lesson_3', tenantId: 'ghazzawi' },
        ],
      },
    }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-SPL-B2' });

    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);
    const student = client.tables.get('students')!.get('std_b2');
    assert(
      student?.current_spelling_lesson_id === 'spl_3',
      `legacy lesson_3 must map to canonical spl_3, got '${student?.current_spelling_lesson_id}'`
    );
    assert(
      client.tables.get('spelling_lessons')!.has('spl_3'),
      'canonical lesson spl_3 must be seeded into spelling_lessons'
    );
  });

  // ---------------------------------------------------------------------------
  // CASE C: missing lesson -> preflight detects before migration
  // ---------------------------------------------------------------------------
  await asyncCheck('Case C: missing lesson id reported by preflight BEFORE migration', async () => {
    const backup = {
      collections: {
        ...baseCollections,
        students: [
          { id: 'std_c1', fullName: 'طالب بدرس مفقود', grade: 'الثالث', currentSpellingLessonId: 'spl_ghost_999', tenantId: 'ghazzawi' },
          { id: 'std_c2', fullName: 'طالب بدرس مفقود 2', grade: 'الرابع', currentSpellingLessonId: 'lesson_99', tenantId: 'ghazzawi' },
        ],
      },
    };

    const preflight = executeMigrationPreflight(backup);
    const unresolved = preflight.errors.filter((e) => e.includes('std_c1') && e.includes('spl_ghost_999'));
    const unresolvedLegacy = preflight.errors.filter((e) => e.includes('std_c2') && e.includes('lesson_99'));
    assert(unresolved.length > 0, `preflight must report unresolved spl_ghost_999, errors: ${preflight.errors.join(' | ')}`);
    assert(unresolvedLegacy.length > 0, 'preflight must report unresolved lesson_99 (no lesson with number 99)');
    assert(preflight.safetyCheckPassed === false, 'safetyCheckPassed must be false with unresolved lesson FKs');
  });

  await asyncCheck('Case C (execution): missing lesson aborts BEFORE BEGIN with no SQL writes', async () => {
    const client = new MockPostgresTransactionalClient();
    let thrown: any = null;
    try {
      await executeControlledMigration(client, {
        collections: {
          ...baseCollections,
          students: [
            { id: 'std_c1', fullName: 'طالب بدرس مفقود', grade: 'الثالث', currentSpellingLessonId: 'spl_ghost_999', tenantId: 'ghazzawi' },
          ],
        },
      }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-SPL-C' });
    } catch (err: any) {
      thrown = err;
    }

    assert(thrown !== null, 'execution must throw on unresolved spelling lesson FK');
    assert(thrown.message.includes('spl_ghost_999'), `error must name the unresolved lesson, got: ${thrown.message}`);
    const sqls = client.executedQueries.map((q) => q.sql);
    assert(!sqls.includes('BEGIN'), 'no transaction may start when the lesson FK gate fails');
    assert(!sqls.some((s) => s.startsWith('INSERT INTO students')), 'no student row may be inserted');
  });

  // ---------------------------------------------------------------------------
  // Sanity: legacy mapping is visible as a preflight WARNING (not silent)
  // ---------------------------------------------------------------------------
  await asyncCheck('Legacy lesson_N mapping is documented as a preflight warning', async () => {
    const preflight = executeMigrationPreflight({
      collections: {
        ...baseCollections,
        students: [
          { id: 'std_w', fullName: 'طالب', grade: 'الأول', currentSpellingLessonId: 'lesson_1', tenantId: 'ghazzawi' },
          { id: 'std_none', fullName: 'طالب بدون درس', grade: 'الأول', tenantId: 'ghazzawi' },
        ],
      },
    });
    const warn = preflight.warnings.filter((w) => w.includes('std_w') && w.includes('lesson_1'));
    assert(warn.length > 0, 'expected a warning documenting the lesson_1 mapping');
    const falseErrors = preflight.errors.filter((e) => e.includes('std_w') || e.includes('std_none'));
    assert(falseErrors.length === 0, `no errors expected for resolvable/absent lesson refs: ${falseErrors[0]}`);
  });

  console.log('\n===============================================================');
  console.log(`STUDENT SPELLING LESSON FK TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentSpellingLessonFkTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
