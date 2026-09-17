import express from 'express';
import path from 'path';
import { extractTenantContext } from './middleware/tenantContext';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/healthRoutes';
import { tenantRouter } from './routes/tenantRoutes';
import { stageRouter } from './routes/stageRoutes';
import { userRouter } from './routes/userRoutes';

export function createApp() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Tenant Isolation Context
  app.use('/api', extractTenantContext);

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/tenants', tenantRouter);
  app.use('/api/stages', stageRouter);
  app.use('/api/users', userRouter);

  // Global Error Handler for API routes
  app.use('/api', errorHandler);

  return app;
}
