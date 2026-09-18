import express from 'express';
import path from 'path';
import { extractTenantContext } from './middleware/tenantContext';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/healthRoutes';
import { tenantRouter } from './routes/tenantRoutes';
import { stageRouter } from './routes/stageRoutes';
import { userRouter } from './routes/userRoutes';
import { entityRouter } from './routes/entityRoutes';
import { backupRestoreRouter } from './routes/backupRestoreRoutes';
import { databaseBackupRouter } from './routes/databaseBackupRoutes';

export function createApp() {
  const app = express();

  // Basic middleware with extended limit for JSON backup files
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Tenant Isolation Context
  app.use('/api', extractTenantContext);

  // Dedicated API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/tenants', tenantRouter);
  app.use('/api/stages', stageRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin/backup/restore', backupRestoreRouter);
  app.use('/api/admin/migration', backupRestoreRouter);
  app.use('/api/admin/backup/database', databaseBackupRouter);

  // Generic Entity API Routes (Handles all 35 entities and aliases)
  app.use('/api', entityRouter);

  // Catch-all 404 JSON Handler for any unhandled /api requests
  // Guarantees API requests NEVER fall through to Vite dev server or return HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      ok: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });
  app.all('/api', (req, res) => {
    res.status(404).json({
      ok: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global Error Handler for API routes
  app.use('/api', errorHandler);

  return app;
}
