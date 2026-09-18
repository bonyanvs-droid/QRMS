/**
 * QRMS PostgreSQL Backup Routes — Admin-only
 *
 * POST   /api/admin/backup/database/database   → create a real pg_dump backup
 * GET    /api/admin/backup/database/database/history → list backup metadata
 * GET    /api/admin/backup/database/database/download/:filename → secure download
 *
 * SECURITY:
 * - Admin authorization required on every route.
 * - DATABASE_URL / credentials are never exposed in responses or logs.
 * - The backup directory is never publicly served; downloads go through
 *   this authenticated endpoint only.
 * - This is a BACKUP feature only: no migration, no restore, no schema changes.
 */

import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import {
  createPostgresBackup,
  listBackups,
  isValidBackupFilename,
  BACKUP_DIR,
} from '../services/databaseBackupService';

export const databaseBackupRouter = Router();

// Middleware: admin authorization required (same policy as the migration hub)
function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const userRole = (req.headers['x-user-role'] as string) || '';
  const isAuthorized = ['system_admin', 'campus_admin', 'admin', 'general_supervisor'].includes(userRole);
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: 'غير مصرح لك بتنفيذ هذه العملية. تقتصر صلاحية النسخ الاحتياطي لقاعدة البيانات على مديري النظام والمشرفين المعتمدين.',
    });
  }
  next();
}

// POST /database — create a real full backup of the current production database
databaseBackupRouter.post('/database', requireAdminRole, async (req: Request, res: Response) => {
  try {
    if (!config.databaseUrl) {
      return res.status(503).json({
        success: false,
        error: 'قاعدة بيانات PostgreSQL غير مهيأة على الخادم (DATABASE_URL is not set).',
      });
    }

    const result = await createPostgresBackup(config.databaseUrl);

    if (!result.ok) {
      // Diagnostics only — never includes credentials
      console.error('[database-backup] FAILED:', result.error);
      return res.status(500).json({
        success: false,
        error: `فشل إنشاء النسخة الاحتياطية: ${result.error}`,
      });
    }

    console.log(
      `[database-backup] CREATED: ${result.filename} (${result.sizeHuman}, verified=${result.verified})`
    );
    return res.status(200).json({
      success: true,
      message: result.verified
        ? 'تم إنشاء النسخة الاحتياطية بنجاح والتحقق من سلامتها.'
        : 'تم إنشاء النسخة الاحتياطية بنجاح (تنبيه: تعذّر التحقق من الأرشيف عبر pg_restore).',
      backup: {
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        sizeHuman: result.sizeHuman,
        createdAt: result.createdAt,
        verified: result.verified,
      },
    });
  } catch (err: any) {
    console.error('[database-backup] UNEXPECTED:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ غير متوقع أثناء إنشاء النسخة الاحتياطية.',
    });
  }
});

// GET /database/history — list backup metadata (dumps are never loaded)
databaseBackupRouter.get('/database/history', requireAdminRole, (req: Request, res: Response) => {
  try {
    const backups = listBackups();
    return res.status(200).json({ success: true, backups });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'تعذّر قراءة سجل النسخ الاحتياطية.' });
  }
});

// GET /database/download/:filename — authenticated secure download
databaseBackupRouter.get('/database/download/:filename', requireAdminRole, (req: Request, res: Response) => {
  const filename = path.basename(String(req.params.filename || ''));

  if (!isValidBackupFilename(filename)) {
    return res.status(400).json({ success: false, error: 'اسم ملف النسخة الاحتياطية غير صالح.' });
  }

  const filePath = path.join(BACKUP_DIR, filename);
  if (!filePath.startsWith(BACKUP_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'النسخة الاحتياطية المطلوبة غير موجودة.' });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});
