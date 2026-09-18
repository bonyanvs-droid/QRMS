/**
 * QRMS Comprehensive FK Preflight & Migration Tests
 *
 * Verifies the central foreign-key resolution layer:
 *   - preflight reports ALL unresolved relationships across ALL collections
 *     in ONE matrix (never stops at the first failure)
 *   - the insert path resolves EVERY FK column to its final PostgreSQL id,
 *     including relationships beyond students (daily_records.teacher_id,
 *     meetings.created_by, staff_attendance.user_id, stage aliases, ...)
 *
 * Cases:
 *   A) direct valid reference
 *   B) mapped reference (raw teacher id, legacy lesson_N, stage code/name alias)
 *   C) missing reference
 *   D) legacy/raw ID requiring mapping
 *   E) unresolved references detected during preflight — ALL reported
 */

import {
  executeControlledMigration,
  executeMigrationPreflight,
} from '../core/realMigrationEngine';
import {
  buildForeignKeyResolver,
  validateAllForeignKeys,
} from '../core/foreignKeyResolverEngine';
import { INITIAL_STAGES } from '../../src/data/initialData';
import { MockPostgresTransactionalClient } from './realMigrationIntegrationTest';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

async function runComprehensiveFkTests(): Promise<void> {
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

  const baseCollections = {
    tenants: [{ id: 'tenant_1789346881267', slug: 'ghazzawi', name: 'مجمع الغزاوي' }],
    organizations: [{ id: 'org_1', name: 'جمعية القرآن' }],
    educational_stages: [{ id: 'stage_backup_1', code: 'BK1', name: 'مرحلة النسخة' }],
    platform_users: [
      { id: 'usr_t1', name: 'مدير', phone: '0500000000', role: 'admin', tenantId: 'ghazzawi' },
    ],
    teachers: [
      { id: 'tch_tenant_1789346881267_1789365126074_he6zg', name: 'عثمان محمد عيسى', phone: '0555555551', tenantId: 'ghazzawi' },
    ],
    spelling_lessons: [
      { id: 'spl_1789449172015', lessonNumber: 1, title: 'حروف الهجاء المفردة' },
    ],
    halaqahs: [
      {
        id: 'hlq_1',
        name: 'حلقة أبي بكر',
        teacherId: 'tch_tenant_1789346881267_1789365126074_he6zg',
        teacherName: 'عثمان محمد عيسى',
        tenantId: 'ghazzawi',
      },
    ],
    students: [
      {
        id: 'std_1',
        fullName: 'طالب سليم',
        grade: 'الأول',
        teacherId: 'tch_tenant_1789346881267_1789365126074_he6zg',
        halaqahId: 'hlq_1',
        currentSpellingLessonId: 'spl_1789449172015',
        tenantId: 'ghazzawi',
      },
    ],
  };

  // ---------------------------------------------------------------------------
  // CASE A + B: all valid forms resolve; insert path applies FINAL ids
  // ---------------------------------------------------------------------------
  await asyncCheck('A+B: direct, mapped, and legacy references all insert with FINAL PostgreSQL ids', async () => {
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, {
      collections: {
        ...baseCollections,
        students: [
          {
            id: 'std_full',
            fullName: 'طالب بكل المراجع',
            grade: 'الثاني',
            teacherId: 'tch_tenant_1789346881267_1789365126074_he6zg', // raw -> usr_
            halaqahId: 'hlq_1',                                         // exact preserved
            currentSpellingLessonId: 'lesson_1',                        // legacy -> real lesson
            stageId: 'BARAEM',                                          // stage code alias -> canonical id
            tenantId: 'ghazzawi',                                       // slug -> real tenant id
          },
        ],
        daily_records: [
          {
            id: 'rec_1',
            studentId: 'std_full',
            teacherId: 'tch_tenant_1789346881267_1789365126074_he6zg', // raw teacher -> usr_
            halaqahId: 'hlq_1',
            date: '2026-09-18',
            weekNumber: 1,
            tenantId: 'ghazzawi',
          },
        ],
        meetings: [
          {
            id: 'meet_1',
            title: 'اجتماع المشرفين',
            date: '2026-09-18',
            startTime: '08:00',
            createdBy: 'tch_tenant_1789346881267_1789365126074_he6zg', // raw teacher -> usr_
            tenantId: 'ghazzawi',
          },
        ],
        staff_attendance: [
          {
            id: 'att_1',
            userId: 'tch_tenant_1789346881267_1789365126074_he6zg', // raw teacher -> usr_
            userName: 'عثمان محمد عيسى',
            userRole: 'teacher',
            date: '2026-09-18',
            timestamp: '2026-09-18T08:00:00.000Z',
            tenantId: 'ghazzawi',
          },
        ],
      },
    }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-CFK-AB' });

    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);

    const usrId = 'usr_tch_tenant_1789346881267_1789365126074_he6zg';
    const student = client.tables.get('students')!.get('std_full');
    assert(student?.teacher_id === usrId, `students.teacher_id must be ${usrId}, got '${student?.teacher_id}'`);
    assert(student?.halaqah_id === 'hlq_1', `students.halaqah_id preserved, got '${student?.halaqah_id}'`);
    assert(
      student?.current_spelling_lesson_id === 'spl_1789449172015',
      `legacy lesson_1 must map to backup lesson, got '${student?.current_spelling_lesson_id}'`
    );
    assert(student?.stage_id === 'baraem', `stage code BARAEM must map to canonical 'baraem', got '${student?.stage_id}'`);
    assert(
      student?.tenant_id === 'tenant_1789346881267',
      `tenant slug must resolve to real tenants.id, got '${student?.tenant_id}'`
    );

    // Beyond students: daily_records / meetings / staff_attendance resolved too
    const rec = client.tables.get('daily_session_records')!.get('rec_1');
    assert(rec?.teacher_id === usrId, `daily_records.teacher_id must be ${usrId}, got '${rec?.teacher_id}'`);
    const meet = client.tables.get('meetings')!.get('meet_1');
    assert(meet?.created_by === usrId, `meetings.created_by must be ${usrId}, got '${meet?.created_by}'`);
    const att = client.tables.get('staff_attendance')!.get('att_1');
    assert(att?.user_id === usrId, `staff_attendance.user_id must be ${usrId}, got '${att?.user_id}'`);
  });

  // ---------------------------------------------------------------------------
  // CASE C + E: ALL unresolved references reported in ONE preflight matrix
  // ---------------------------------------------------------------------------
  check('C+E: preflight reports ALL unresolved FKs across ALL collections', () => {
    const backup = {
      collections: {
        ...baseCollections,
        students: [
          {
            id: 'std_bad_teacher',
            fullName: 'طالب بمعلم مفقود',
            grade: 'الأول',
            teacherId: 'tch_ghost',
            tenantId: 'ghazzawi',
          },
          {
            id: 'std_bad_halaqah',
            fullName: 'طالب بحلقة مفقودة',
            grade: 'الأول',
            halaqahId: 'hlq_ghost',
            tenantId: 'ghazzawi',
          },
        ],
        quran_plans: [
          { id: 'plan_1', studentId: 'std_bad_teacher', stageId: 'مرحلة وهمية', tenantId: 'ghazzawi' },
        ],
        track_nominations: [
          { id: 'nom_1', trackId: 'trk_ghost', studentId: 'std_bad_teacher', studentName: 'طالب', targetBranchOrLevel: 'مستوى', tenantId: 'ghazzawi' },
        ],
      },
    };

    const preflight = executeMigrationPreflight(backup);
    const e = preflight.errors;
    assert(e.some((x) => x.includes('std_bad_teacher') && x.includes('tch_ghost')), 'missing student->teacher FK');
    assert(e.some((x) => x.includes('std_bad_halaqah') && x.includes('hlq_ghost')), 'missing student->halaqah FK');
    assert(e.some((x) => x.includes('plan_1') && x.includes('مرحلة وهمية')), 'missing quran_plans->stage FK');
    assert(e.some((x) => x.includes('nom_1') && x.includes('trk_ghost')), 'missing track_nominations->track FK');
    assert(preflight.safetyCheckPassed === false, 'safetyCheckPassed must be false');

    // Direct report structure
    const report = validateAllForeignKeys(backup.collections);
    assert(report.unresolvedCount === 4, `expected 4 unresolved, got ${report.unresolvedCount}`);
    assert(report.totalReferences >= 4, 'total references counted');
    const byCollection = report.unresolved.map((u) => u.collection).sort();
    assert(
      JSON.stringify(byCollection) === JSON.stringify(['quran_plans', 'students', 'students', 'track_nominations']),
      `unresolved matrix must group all collections, got ${byCollection}`
    );
  });

  // ---------------------------------------------------------------------------
  // CASE C (execution): unresolved FK aborts BEFORE BEGIN
  // ---------------------------------------------------------------------------
  await asyncCheck('C (execution): any unresolved FK aborts BEFORE BEGIN with zero SQL writes', async () => {
    const client = new MockPostgresTransactionalClient();
    let thrown: any = null;
    try {
      await executeControlledMigration(client, {
        collections: {
          ...baseCollections,
          students: [
            { id: 'std_bad', fullName: 'طالب', grade: 'الأول', halaqahId: 'hlq_ghost', tenantId: 'ghazzawi' },
          ],
        },
      }, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-CFK-C' });
    } catch (err: any) {
      thrown = err;
    }
    assert(thrown !== null, 'execution must throw on unresolved FK');
    assert(thrown.message.includes('hlq_ghost'), `error must name the raw value, got: ${thrown.message}`);
    const sqls = client.executedQueries.map((q) => q.sql);
    assert(!sqls.includes('BEGIN'), 'no transaction may start');
    assert(!sqls.some((s) => s.startsWith('INSERT INTO students')), 'no student insert may happen');
  });

  // ---------------------------------------------------------------------------
  // EXACT PRODUCTION SCENARIO (run QRMS-MIG-20260918-K0145SL1):
  // student with halaqahId = '' (empty string) — previously inserted as ''
  // and violated students_halaqah_id_fkey ('' is NOT NULL and not a target id).
  // Must now insert as NULL and pass.
  // ---------------------------------------------------------------------------
  await asyncCheck('PRODUCTION SCENARIO: empty-string halaqahId inserts as NULL, no FK violation', async () => {
    const backup = {
      collections: {
        ...baseCollections,
        students: [
          {
            id: 'std_tenant_1789346881267_1789365129758_br7v7',
            fullName: 'الطالب الفاشل سابقاً',
            grade: 'الأول',
            halaqahId: '',             // ← exact production value
            teacherId: '',             // same class of empty reference
            currentSpellingLessonId: '',
            tenantId: 'ghazzawi',
          },
        ],
      },
    };

    // Preflight: no fatal error, but the empty reference is documented as a warning
    const preflight = executeMigrationPreflight(backup);
    const emptyWarn = preflight.warnings.filter((w) => w.includes('br7v7') && w.includes('halaqahId'));
    assert(emptyWarn.length > 0, `empty FK reference must be documented as a warning, warnings: ${preflight.warnings.join(' | ')}`);
    assert(preflight.safetyCheckPassed === true, `empty references must not block migration, errors: ${preflight.errors.join(' | ')}`);

    // Execution: migration succeeds and the empty FK columns become NULL
    const client = new MockPostgresTransactionalClient();
    const res = await executeControlledMigration(client, backup, { ...MIGRATION_PARAMS, migrationRunId: 'QRMS-MIG-CFK-EMPTY' });
    assert(res.success === true, `migration must succeed, status=${res.migrationRun.status}`);
    const student = client.tables.get('students')!.get('std_tenant_1789346881267_1789365129758_br7v7');
    assert(student !== undefined, 'student row must exist');
    assert(student.halaqah_id === null || student.halaqah_id === undefined, `halaqah_id must be NULL, got '${student.halaqah_id}'`);
    assert(student.teacher_id === null || student.teacher_id === undefined, `teacher_id must be NULL, got '${student.teacher_id}'`);
    assert(
      student.current_spelling_lesson_id === null || student.current_spelling_lesson_id === undefined,
      `current_spelling_lesson_id must be NULL, got '${student.current_spelling_lesson_id}'`
    );
    assert(
      !client.executedQueries.some((q) => (q.params || []).includes('') && q.sql.includes('INSERT INTO students')),
      'no empty-string FK value may be sent to PostgreSQL for students'
    );
  });

  // ---------------------------------------------------------------------------
  // Resolver unit checks: matrix categories (direct / seed / mapped / unresolved)
  // ---------------------------------------------------------------------------
  check('FK matrix categorizes references (direct, seed, mapped, unresolved)', () => {
    const report = validateAllForeignKeys(baseCollections as any);
    assert(report.unresolvedCount === 0, `base collections must be fully resolvable, unresolved: ${JSON.stringify(report.unresolved)}`);
    // std_1 has: teacher(raw->MAPPED), halaqah(EXACT), lesson(EXACT); halaqahs.teacher(MAPPED)
    assert(report.mappedCount >= 2, `mapped references counted, got ${report.mappedCount}`);
    assert(report.directlyValidCount >= 2, `direct references counted, got ${report.directlyValidCount}`);
    assert(report.totalReferences === report.directlyValidCount + report.seedResolvedCount + report.mappedCount + report.unresolvedCount,
      'matrix counts must be internally consistent');
  });

  // ---------------------------------------------------------------------------
  // Stage alias resolution (legacy name/code forms)
  // ---------------------------------------------------------------------------
  check('Stage references resolve by exact id, canonical id, code, and Arabic name', () => {
    const resolver = buildForeignKeyResolver(baseCollections as any);
    const firstStage = INITIAL_STAGES[0];
    assert(resolver.resolveForeignKey('stages', firstStage.id).resolvedId === firstStage.id, 'exact canonical id');
    assert(resolver.resolveForeignKey('stages', String(firstStage.code).toLowerCase()).resolvedId === firstStage.id, 'stage code alias');
    assert(resolver.resolveForeignKey('stages', firstStage.name).resolvedId === firstStage.id, 'stage Arabic name alias');
    assert(resolver.resolveForeignKey('stages', 'stage_backup_1').resolvedId === 'stage_backup_1', 'backup stage id preserved');
    assert(resolver.resolveForeignKey('stages', 'stage_unknown_999').resolutionType === 'UNRESOLVED', 'unknown stage unresolved');
  });

  // ---------------------------------------------------------------------------
  // Users resolution: platform user, seed admin, raw teacher, usr_ form
  // ---------------------------------------------------------------------------
  check('Users references resolve: platform user, seed admin, raw teacher, usr_ form', () => {
    const resolver = buildForeignKeyResolver(baseCollections as any);
    assert(resolver.resolveForeignKey('users', 'usr_t1').resolvedId === 'usr_t1', 'platform user exact');
    assert(resolver.resolveForeignKey('users', 'usr_sys_admin_2396012458').resolvedId === 'usr_sys_admin_2396012458', 'seed admin');
    const raw = 'tch_tenant_1789346881267_1789365126074_he6zg';
    assert(resolver.resolveForeignKey('users', raw).resolvedId === `usr_${raw}`, 'raw teacher mapped to usr_');
    assert(resolver.resolveForeignKey('users', `usr_${raw}`).resolvedId === `usr_${raw}`, 'usr_ form identity');
    assert(resolver.resolveForeignKey('users', 'usr_nobody').resolutionType === 'UNRESOLVED', 'unknown user unresolved');
  });

  console.log('\n===============================================================');
  console.log(`COMPREHENSIVE FK TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveFkTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
