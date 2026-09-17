import express from 'express';
import path from 'path';
import { extractTenantContext } from './middleware/tenantContext';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/healthRoutes';
import { tenantRouter } from './routes/tenantRoutes';
import { stageRouter } from './routes/stageRoutes';
import { userRouter } from './routes/userRoutes';
import { backupRestoreRouter } from './routes/backupRestoreRoutes';

export function createApp() {
  const app = express();

  // Basic middleware with extended limit for JSON backup files
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Tenant Isolation Context
  app.use('/api', extractTenantContext);

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/tenants', tenantRouter);
  app.use('/api/stages', stageRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin/backup/restore', backupRestoreRouter);

  // Global Error Handler for API routes
  app.use('/api', errorHandler);

  return app;
}
