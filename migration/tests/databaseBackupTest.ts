/**
 * QRMS PostgreSQL Backup Feature Test — REAL pg_dump against production
 *
 * Verifies (read-only with respect to database contents):
 *   A) createPostgresBackup runs a REAL pg_dump of the current database
 *   B) the backup file exists and is non-empty
 *   C) pg_restore --list can read the archive
 *   D) listBackups() returns the new backup
 *   E) filename format + no-overwrite behavior
 *   F) database row counts are UNCHANGED before/after backup
 *   G) no credentials leak into the result object
 */

import {
  createPostgresBackup,
  listBackups,
  generateBackupFilename,
  parseDatabaseUrl,
  isValidBackupFilename,
  BACKUP_DIR,
} from '../../server/services/databaseBackupService';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

function runCommand(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: err.message }));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function countRows(dbUrl: string): Promise<number> {
  return runCommand('psql', [dbUrl, '-At', '-c',
    "SELECT (SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM students)+(SELECT COUNT(*) FROM tenants)+(SELECT COUNT(*) FROM halaqahs)+(SELECT COUNT(*) FROM stages)+(SELECT COUNT(*) FROM spelling_lessons)+(SELECT COUNT(*) FROM audit_logs)+(SELECT COUNT(*) FROM educational_plan_weeks)+(SELECT COUNT(*) FROM staff_attendance);"
  ]).then((r) => parseInt(r.stdout.trim(), 10));
}

async function runDatabaseBackupTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  const check = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      passed++;
      console.log(`PASS: ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL: ${name} -> ${err?.message}`);
    }
  };

  const databaseUrl = process.env.DATABASE_URL || '';
  assert(databaseUrl.startsWith('postgresql://'), 'DATABASE_URL must be configured for this test');

  console.log('=== REAL PostgreSQL BACKUP TEST (read-only backup) ===');

  const rowsBefore = await countRows(databaseUrl);
  console.log(`Row counts before backup (key tables sum): ${rowsBefore}`);

  // A+B+C: real pg_dump + file exists + non-empty + pg_restore-readable
  let created: Awaited<ReturnType<typeof createPostgresBackup>> | null = null;
  await check('A+B+C: REAL pg_dump completes, file exists, non-empty, pg_restore --list readable', async () => {
    created = await createPostgresBackup(databaseUrl);
    assert(created.ok === true, `backup must succeed, error: ${created.error}`);
    assert(created.filename && created.filename.startsWith('qrms_production_'), `filename format: ${created.filename}`);
    assert(isValidBackupFilename(created.filename!), `filename must pass validation: ${created.filename}`);
    assert(created.filename!.endsWith('.dump'), 'must use .dump extension');
    const filePath = path.join(BACKUP_DIR, created.filename!);
    assert(fs.existsSync(filePath), `backup file must exist: ${filePath}`);
    const stat = fs.statSync(filePath);
    assert(stat.size > 0, `backup file must be non-empty, got ${stat.size} bytes`);
    assert((stat.size % 512 === 0) || stat.size > 1024, `backup size sanity: ${stat.size}`);
    assert(created.verified === true, 'pg_restore --list verification must succeed');
    assert(created.sizeBytes === stat.size, 'reported size must match actual file size');
  });

  // D: listBackups contains the new backup
  await check('D: listBackups() returns the new backup with correct metadata', async () => {
    const list = listBackups();
    const found = list.find((b) => b.filename === created!.filename);
    assert(found !== undefined, 'new backup must appear in the backup list');
    assert(found!.sizeBytes === created!.sizeBytes, 'listed size must match created size');
    assert(found!.createdAt !== undefined && found!.sizeHuman !== undefined, 'metadata fields present');
    // sorted newest first
    assert(list[0].filename === created!.filename, 'newest backup must be first');
  });

  // E: filename format + no-overwrite
  await check('E: timestamped filename format and no-overwrite behavior', async () => {
    const fname = generateBackupFilename();
    assert(/^qrms_production_\d{8}-\d{6}\.dump$/.test(fname), `format: ${fname}`);
    assert(isValidBackupFilename(fname), 'generated filename valid');
    assert(!isValidBackupFilename('../../etc/passwd'), 'path traversal must be rejected');
    assert(!isValidBackupFilename('evil.dump'), 'foreign prefix must be rejected');
    assert(!isValidBackupFilename('qrms_production_x/../y.dump'), 'path segments must be rejected');
    // create twice within the same second → must not overwrite
    const first = await createPostgresBackup(databaseUrl);
    assert(first.ok === true, 'first backup ok');
    const second = await createPostgresBackup(databaseUrl);
    assert(second.ok === true, 'second backup ok');
    assert(first.filename !== second.filename, 'consecutive backups must never share a filename');
  });

  // F: row counts unchanged
  await check('F: database row counts UNCHANGED before/after backup (read-only)', async () => {
    const rowsAfter = await countRows(databaseUrl);
    assert(rowsAfter === rowsBefore, `row counts must be identical: before=${rowsBefore} after=${rowsAfter}`);
  });

  // G: no credentials leak
  await check('G: no credentials/URL leak in results', async () => {
    const parsed = parseDatabaseUrl(databaseUrl);
    assert(parsed !== null && parsed.database === 'qrms_production', 'URL parsing works server-side');
    const serialized = JSON.stringify(created);
    assert(!serialized.includes('password'), 'result must not contain the word password');
    assert(!serialized.includes('postgresql://'), 'result must not contain the connection URL');
    const pwd = parsed!.password;
    if (pwd) {
      assert(!serialized.includes(pwd), 'result must not contain the actual password');
    }
    // PGPASSWORD never appears in process argv of children (env-only) — validated by design
    assert(typeof created!.filePath === 'string' && created!.filePath!.startsWith(BACKUP_DIR), 'file stored in the dedicated backup dir');
  });

  // Extra: archive actually contains our migrated tables (read-only inspection)
  await check('EXTRA: pg_restore --list output contains migrated tables', async () => {
    const res = await runCommand('pg_restore', ['--list', path.join(BACKUP_DIR, created!.filename!)]);
    assert(res.code === 0, 'pg_restore --list exit code 0');
    for (const table of ['users', 'students', 'tenants', 'halaqahs', 'stages', 'spelling_lessons', 'audit_logs', 'migration_runs']) {
      assert(res.stdout.includes(`TABLE ${table} `) || res.stdout.includes(` ${table} `) || res.stdout.includes(table), `archive must reference table ${table}`);
    }
  });

  console.log('\n===============================================================');
  console.log(`DATABASE BACKUP TESTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('===============================================================');
  if (created && created.ok) {
    console.log(`\nReal backup created: ${created.filename} (${created.sizeHuman}, verified=${created.verified})`);
    console.log(`Location: ${created.filePath}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runDatabaseBackupTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
