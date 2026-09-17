import { Router } from 'express';
import { getSystemHealth } from '../services/healthService';

export const healthRouter = Router();

/**
 * GET /api/health
 * Checks backend server and PostgreSQL connectivity.
 */
healthRouter.get('/', async (req, res, next) => {
  try {
    const health = await getSystemHealth();
    const statusCode = health.ok ? 200 : (health.database.configured ? 503 : 200);
    res.status(statusCode).json(health);
  } catch (err) {
    next(err);
  }
});
