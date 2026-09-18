import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { extractTenantContext } from './middleware/tenantContext';
import { createRemoteForwarder } from './middleware/remoteForwarder';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/healthRoutes';
import { tenantRouter } from './routes/tenantRoutes';
import { stageRouter } from './routes/stageRoutes';
import { userRouter } from './routes/userRoutes';
import { authRouter } from './routes/authRoutes';
import { entityRouter } from './routes/entityRoutes';
import { backupRestoreRouter } from './routes/backupRestoreRoutes';
import { databaseBackupRouter } from './routes/databaseBackupRoutes';

export function createApp() {
  const app = express();

  // Basic middleware with extended limit for JSON backup files
  app.use(cookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 0. Absolute Top Priority: Auth Routes (after body parsers)
  app.use('/api/auth', authRouter);

  // 1. Core API Routes (Absolute Priority)
  app.use('/api/health', healthRouter);

  // 2. Tenant Isolation Context
  app.use('/api', extractTenantContext);

  // 3. Secure Server-Side Forwarder (Used in 'remote-proxy' mode)
  // We MOUNT it at /api but it should skip /auth due to earlier mount
  app.use('/api', createRemoteForwarder());
  app.use('/api/admin/backup/restore', backupRestoreRouter);
  app.use('/api/admin/migration', backupRestoreRouter);
  app.use('/api/admin/backup/database', databaseBackupRouter);

  // Generic Entity API Routes (Handles all 35 entities and aliases)
  // Fix: Prevent entityRouter from intercepting system routes like /auth, /health, etc.
  app.use('/api', (req, res, next) => {
    const systemPaths = ['/auth', '/health', '/tenants', '/stages', '/users', '/admin'];
    if (systemPaths.some(p => req.path.startsWith(p))) {
      return next();
    }
    entityRouter(req, res, next);
  });

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
