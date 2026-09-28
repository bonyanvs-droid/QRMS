import { Router } from "express";
import { getSystemHealth } from "../services/healthService";

export const healthRouter = Router();

/**
 * GET /api/health or GET /health
 * Checks backend server and PostgreSQL connectivity.
 * Guarantees explicit application/json content-type in all environments.
 */
healthRouter.get("/", async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const health = await getSystemHealth();
    const statusCode = health.ok ? 200 : health.database.configured ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err: any) {
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(500).json({
        ok: false,
        status: "unhealthy",
        error: err?.message || "Health check error",
        timestamp: new Date().toISOString(),
      });
    } else {
      next(err);
    }
  }
});
