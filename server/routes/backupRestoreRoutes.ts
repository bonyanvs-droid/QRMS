import { Router, Request, Response, NextFunction } from 'express';
import { executeRestoreDryRun, getRestoreAuditLogs } from '../../src/lib/restoreDryRunEngine';
import { 
  executeMigrationPreflight, 
  isMigrationRunning, 
  getActiveRunningMigrationId, 
  getMigrationHistory, 
  getMigrationLogs,
  executeControlledMigration
} from '../../migration/core/realMigrationEngine';
import { generate527ReconciliationReport } from '../../migration/core/reconciliationEngine';
import { validateBackupJsonFile } from '../../src/lib/backupUploadValidator';
import { getDbPool } from '../config/db';

export const backupRestoreRouter = Router();

// Middleware to check admin authorization
function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const userRole = (req.headers['x-user-role'] as string) || '';
  const isAuthorized = ['system_admin', 'campus_admin', 'admin', 'general_supervisor'].includes(userRole);
  
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: 'غير مصرح لك بتنفيذ هذه العملية. تقتصر صلاحيات النسخ والترحيل على مديري النظام والمشرفين المعتمدين.',
    });
  }
  next();
}

/**
 * POST /api/admin/backup/restore/validate
 * 
 * Strict Dry-Run Backup Validation and Mapping Audit.
 * Performs zero database mutations.
 */
backupRestoreRouter.post('/validate', requireAdminRole, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { backupData, fileName, fileSizeBytes } = req.body;

    if (!backupData) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم إرسال بيانات النسخة الاحتياطية (backupData is required).',
      });
    }

    const validationResult = validateBackupJsonFile(backupData);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: `فشل التحقق الهيكلي من ملف النسخة الاحتياطية: ${validationResult.errors.join(' | ')}`,
        validationResult,
      });
    }

    const userEmail = (req.headers['x-user-email'] as string) || 'admin@qrms.system';
    const userRole = (req.headers['x-user-role'] as string) || 'system_admin';

    const report = executeRestoreDryRun(
      validationResult.backupData,
      fileName || 'backup.json',
      fileSizeBytes || (typeof backupData === 'string' ? backupData.length : JSON.stringify(backupData).length),
      { email: userEmail, role: userRole }
    );

    return res.status(200).json({
      success: true,
      message: 'تم فحص ومحاكاة النسخة الاحتياطية بنجاح في وضع Dry-Run.',
      report,
      validationResult,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'حدث خطأ أثناء فحص ومحاكاة النسخة الاحتياطية.',
    });
  }
});

/**
 * GET /api/admin/backup/restore/audit-logs
 * Returns audit logs for dry-run verification attempts.
 */
backupRestoreRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = getRestoreAuditLogs();
  return res.status(200).json({
    success: true,
    logs,
  });
});

/**
 * POST /api/admin/migration/preflight
 * Runs preflight readiness check including document reconciliation.
 */
backupRestoreRouter.post('/preflight', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { backupData } = req.body;
    const userEmail = (req.headers['x-user-email'] as string) || 'admin@qrms.system';

    let normalizedBackup = backupData;
    if (backupData) {
      const val = validateBackupJsonFile(backupData);
      if (val.isValid) {
        normalizedBackup = val.backupData;
      }
    }

    const preflight = executeMigrationPreflight(normalizedBackup, { userEmail });
    return res.status(200).json({
      success: true,
      preflight,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'فشل تشغيل الفحص القبلي للترحيل.',
    });
  }
});

/**
 * GET /api/admin/migration/status
 * Returns current lock and running status.
 */
backupRestoreRouter.get('/status', (req: Request, res: Response) => {
  return res.status(200).json({
    isRunning: isMigrationRunning(),
    activeRunId: getActiveRunningMigrationId(),
    message: isMigrationRunning() ? 'توجد عملية ترحيل قيد التنفيذ حالياً.' : 'المحرك جاهز وفي وضع الاستعداد الآمن.'
  });
});

/**
 * GET /api/admin/migration/runs
 * Returns history of migration runs and detailed item logs.
 */
backupRestoreRouter.get('/runs', (req: Request, res: Response) => {
  const history = getMigrationHistory();
  const logs = getMigrationLogs();
  return res.status(200).json({
    success: true,
    history,
    logs,
  });
});

/**
 * POST /api/admin/migration/reconciliation
 * Returns the exact mathematical reconciliation breakdown.
 */
backupRestoreRouter.post('/reconciliation', (req: Request, res: Response) => {
  const { backupData } = req.body;
  const report = generate527ReconciliationReport(backupData?.collections || backupData);
  return res.status(200).json({
    success: true,
    report,
  });
});

/**
 * POST /api/admin/migration/execute
 * 
 * Executes the real PostgreSQL Transactional Migration.
 * Strictly requires confirmationCode === 'START_CONTROLLED_MIGRATION' and valid admin role.
 */
backupRestoreRouter.post('/execute', requireAdminRole, async (req: Request, res: Response) => {
  const { backupData, confirmationCode, migrationRunId } = req.body;
  const adminEmail = (req.headers['x-user-email'] as string) || 'admin@qrms.system';

  if (!backupData) {
    return res.status(400).json({
      success: false,
      error: 'بيانات النسخة الاحتياطية مفقودة (backupData is required).',
    });
  }

  if (confirmationCode !== 'START_CONTROLLED_MIGRATION') {
    return res.status(400).json({
      success: false,
      error: 'رمز التأكيد غير صحيح. يجب إدخال START_CONTROLLED_MIGRATION لتنفيذ الترحيل.',
    });
  }

  // Server-side Deep Backup Validation
  const validation = validateBackupJsonFile(backupData);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: `فشل التحقق الهيكلي من النسخة الاحتياطية قبل الترحيل: ${validation.errors.join(' | ')}`,
      validation,
    });
  }

  // Server-side Preflight Safety Check
  const preflight = executeMigrationPreflight(validation.backupData, { userEmail: adminEmail });
  if (preflight.fatalErrorsCount > 0) {
    return res.status(400).json({
      success: false,
      error: `فشل الفحص القبلي الأمني: توجد ${preflight.fatalErrorsCount} أخطاء مانعة للترحيل.`,
      errors: preflight.errors,
    });
  }

  const pool = getDbPool();
  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'قاعدة بيانات PostgreSQL غير مهيأة (DATABASE_URL is not set). يرجى تكوين الاتصال بقاعدة البيانات لتشغيل الترحيل الحقيقي.',
    });
  }

  let client: any = null;
  try {
    client = await pool.connect();
    const result = await executeControlledMigration(client, validation.backupData, {
      migrationRunId,
      confirmedByAdmin: true,
      confirmationText: confirmationCode,
      adminEmail,
    });

    // The API must reflect the engine's actual outcome — an INTEGRITY_FAILURE
    // (post-COMMIT verification failed) must never be reported as success.
    if (result.success === false) {
      return res.status(500).json({
        success: false,
        error: result.message || 'فشل الترحيل: الحالة الفعلية لقاعدة البيانات بعد COMMIT غير مطابقة للمتوقع.',
        migrationRun: result.migrationRun,
        logs: result.logs,
        verification: result.verification,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      migrationRun: result.migrationRun,
      logs: result.logs,
      verification: result.verification,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'حدث خطأ أثناء تنفيذ عملية الترحيل المعاملاتية.',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});
