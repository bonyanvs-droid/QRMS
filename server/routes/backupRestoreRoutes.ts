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
import { getDbPool } from '../config/db';

export const backupRestoreRouter = Router();

/**
 * POST /api/admin/backup/restore/validate
 * 
 * Strict Dry-Run Backup Validation and Mapping Audit.
 * Performs zero database mutations.
 */
backupRestoreRouter.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { backupData, fileName, fileSizeBytes } = req.body;

    if (!backupData) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم إرسال بيانات النسخة الاحتياطية (backupData is required).',
      });
    }

    const userEmail = (req.headers['x-user-email'] as string) || 'admin@qrms.system';
    const userRole = (req.headers['x-user-role'] as string) || 'system_admin';

    const report = executeRestoreDryRun(
      backupData,
      fileName || 'backup.json',
      fileSizeBytes || (typeof backupData === 'string' ? backupData.length : JSON.stringify(backupData).length),
      { email: userEmail, role: userRole }
    );

    return res.status(200).json({
      success: true,
      message: 'تم فحص ومحاكاة النسخة الاحتياطية بنجاح في وضع Dry-Run.',
      report,
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
 * Runs preflight readiness check including 527 document reconciliation.
 */
backupRestoreRouter.post('/preflight', async (req: Request, res: Response) => {
  try {
    const { backupData } = req.body;
    const userEmail = (req.headers['x-user-email'] as string) || 'admin@qrms.system';

    const preflight = executeMigrationPreflight(backupData, { userEmail });
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
 * Returns the exact 527 document mathematical reconciliation breakdown.
 */
backupRestoreRouter.post('/reconciliation', (req: Request, res: Response) => {
  const { backupData } = req.body;
  const report = generate527ReconciliationReport(backupData?.collections);
  return res.status(200).json({
    success: true,
    report,
  });
});

/**
 * POST /api/admin/migration/execute
 * 
 * Executes the real PostgreSQL Transactional Migration.
 * Strictly requires confirmationCode === 'START_CONTROLLED_MIGRATION'.
 */
backupRestoreRouter.post('/execute', async (req: Request, res: Response) => {
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
    const result = await executeControlledMigration(client, backupData, {
      migrationRunId,
      confirmedByAdmin: true,
      confirmationText: confirmationCode,
      adminEmail,
    });

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
