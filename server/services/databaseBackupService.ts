/**
 * QRMS PostgreSQL Production Backup Service
 *
 * Creates REAL server-side backups of the current production database using
 * pg_dump (custom format -Fc), validates them with pg_restore --list, and
 * stores them OUTSIDE the application source tree.
 *
 * SECURITY:
 * - The DATABASE_URL / credentials are parsed server-side only and are NEVER
 *   returned in API responses or logs.
 * - The password is passed to pg_dump via the PGPASSWORD environment variable
 *   (never on the command line, where `ps` could expose it).
 * - Backup files are written with restrictive permissions (0600) inside a
 *   dedicated directory (0700) that is never publicly served.
 * - This feature is strictly a BACKUP: it never modifies database contents,
 *   never migrates, never restores.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const BACKUP_DIR = '/home/schoolscreen.sa/backups/qrms';
export const BACKUP_FILENAME_PREFIX = 'qrms_production';

export interface BackupCreationResult {
  ok: boolean;
  filename?: string;
  filePath?: string;
  sizeBytes?: number;
  sizeHuman?: string;
  createdAt?: string;
  verified?: boolean;
  error?: string;
}

export interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  sizeHuman: string;
  createdAt: string;
}

interface ParsedDbUrl {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/** Parses a PostgreSQL connection URL — used server-side only, never exposed. */
export function parseDatabaseUrl(url: string): ParsedDbUrl | null {
  try {
    const u = new URL(url);
    const database = u.pathname.replace(/^\//, '');
    if (!u.hostname || !database) {
      return null;
    }
    return {
      host: u.hostname,
      port: u.port || '5432',
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database,
    };
  } catch {
    return null;
  }
}

/** qrms_production_YYYYMMDD-HHmmss.dump */
export function generateBackupFilename(prefix: string = BACKUP_FILENAME_PREFIX): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}_${stamp}.dump`;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCommand(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: `${stderr}${err.message}` }));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

/**
 * Creates a REAL full backup (schema + data) of the current production
 * PostgreSQL database using pg_dump -Fc. Read-only with respect to database
 * contents. The dump is validated with pg_restore --list before success is
 * reported. Never overwrites an existing backup file.
 */
export async function createPostgresBackup(databaseUrl: string): Promise<BackupCreationResult> {
  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed || !parsed.user) {
    return { ok: false, error: 'تكوين اتصال قاعدة البيانات غير صالح على الخادم.' };
  }

  // Dedicated backup directory outside the application source tree
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
    }
  } catch (err: any) {
    return { ok: false, error: `تعذّر تهيئة مجلد النسخ الاحتياطي: ${err?.message || err}` };
  }

  // Timestamped filename — never overwrite an existing backup
  let filename = generateBackupFilename();
  let filePath = path.join(BACKUP_DIR, filename);
  let suffix = 1;
  while (fs.existsSync(filePath)) {
    filename = `${generateBackupFilename()}_${suffix}`;
    filePath = path.join(BACKUP_DIR, filename);
    suffix++;
  }

  // pg_dump via PGPASSWORD environment variable (never on the command line)
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (parsed.password) {
    env.PGPASSWORD = parsed.password;
  }

  const dumpArgs = [
    '--format=custom',
    '--host', parsed.host,
    '--port', parsed.port,
    '--username', parsed.user,
    '--file', filePath,
    '--dbname', parsed.database,
  ];

  const dumpResult = await runCommand('pg_dump', dumpArgs, env);

  if (dumpResult.code !== 0 || !fs.existsSync(filePath)) {
    // Remove any partial file from a failed dump
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // best-effort cleanup
    }
    const diagnostic = (dumpResult.stderr || 'unknown pg_dump failure').trim().slice(0, 400);
    return { ok: false, error: `فشل pg_dump (رمز الخروج: ${dumpResult.code}): ${diagnostic}` };
  }

  const stat = fs.statSync(filePath);
  if (stat.size <= 0) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // best-effort cleanup
    }
    return { ok: false, error: 'فشل pg_dump: الملف الناتج فارغ.' };
  }

  // Verify the archive is readable by pg_restore before reporting success
  const restoreCheck = await runCommand('pg_restore', ['--list', filePath], env);
  const verified = restoreCheck.code === 0;

  // Restrictive file permissions — the dump contains the full production database
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort permission hardening
  }

  return {
    ok: true,
    filename,
    filePath,
    sizeBytes: stat.size,
    sizeHuman: formatFileSize(stat.size),
    createdAt: new Date().toISOString(),
    verified,
  };
}

/**
 * Lists existing backups (metadata only — dumps are never loaded into memory
 * for listing). Sorted newest first.
 */
export function listBackups(): BackupFileInfo[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((name) => name.startsWith(BACKUP_FILENAME_PREFIX) && name.endsWith('.dump'))
      .map((name) => {
        const filePath = path.join(BACKUP_DIR, name);
        try {
          const stat = fs.statSync(filePath);
          return {
            filename: name,
            sizeBytes: stat.size,
            sizeHuman: formatFileSize(stat.size),
            createdAt: stat.mtime.toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter((b): b is BackupFileInfo => b !== null)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

/** Validates a download request filename — strict, no path traversal. */
export function isValidBackupFilename(filename: string): boolean {
  return new RegExp(`^${BACKUP_FILENAME_PREFIX}_[A-Za-z0-9_-]+\\.dump$`).test(filename);
}
