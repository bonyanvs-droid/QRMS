import { Router, Request, Response, NextFunction } from 'express';
import {
  findMany,
  findById,
  upsert,
  bulkUpsert,
  deleteRecord,
  resolveTableConfig,
} from '../services/entityService';

export const entityRouter = Router();

entityRouter.use((req, res, next) => {
  const systemPaths = ['/auth', '/health', '/tenants', '/stages', '/users', '/admin'];
  if (systemPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  console.log(`[ENTITY-DEBUG] Request reached entityRouter: ${req.method} ${req.originalUrl} | Path: ${req.path}`);
  next();
});

/**
 * Validates whether the requested collection name is registered
 */
function validateCollection(req: Request, res: Response, next: NextFunction): void {
  const collectionName = req.params.collection;
  const config = resolveTableConfig(collectionName);
  if (!config) {
    res.status(404).json({
      ok: false,
      error: `Unknown collection '${collectionName}'`,
    });
    return;
  }
  next();
}

/**
 * GET /api/:collection
 * Retrieves list of records filtered by tenant (if applicable) and query params.
 */
entityRouter.get('/:collection', validateCollection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collection = req.params.collection;
    const tenantId = req.tenantId;
    const isSuperAdmin = req.isSuperAdmin;

    // Authenticated user attempted to query a tenant other than their own —
    // return an empty set rather than another tenant's data.
    if (req.tenantScopeViolation) {
      res.json({ ok: true, count: 0, data: [] });
      return;
    }

    const items = await findMany(collection, {
      tenantId,
      queryParams: req.query as Record<string, any>,
      isSuperAdmin,
      sessionUser: req.sessionUser,
    });

    res.json({
      ok: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/:collection/:id
 * Retrieves a single record by primary key
 */
entityRouter.get('/:collection/:id', validateCollection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collection, id } = req.params;
    const tenantId = req.tenantId;

    if (req.tenantScopeViolation) {
      res.status(404).json({
        ok: false,
        error: `Record not found in '${collection}' with ID '${id}'`,
      });
      return;
    }

    const item = await findById(collection, id, tenantId, req.sessionUser);
    if (!item) {
      res.status(404).json({
        ok: false,
        error: `Record not found in '${collection}' with ID '${id}'`,
      });
      return;
    }

    res.json({
      ok: true,
      data: item,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/:collection/bulk
 * Inserts or updates multiple records in batch
 */
entityRouter.post('/:collection/bulk', validateCollection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    const collection = req.params.collection;
    const tenantId = req.tenantId;
    const cfg = resolveTableConfig(collection);
    if (cfg?.isTenantScoped && (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student')) {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }
    const items = req.body.items || req.body.records || (Array.isArray(req.body) ? req.body : []);

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        ok: false,
        error: 'Bulk operation requires a non-empty array of items in body (e.g. { items: [...] })',
      });
      return;
    }

    const result = await bulkUpsert(collection, items, tenantId);
    res.json({
      ok: true,
      count: result.count,
      data: result.items,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/:collection
 * Creates or updates a single record
 */
entityRouter.post('/:collection', validateCollection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    const collection = req.params.collection;
    const tenantId = req.tenantId;
    const cfg = resolveTableConfig(collection);
    if (cfg?.isTenantScoped && (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student')) {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({
        ok: false,
        error: 'Invalid request body',
      });
      return;
    }

    const saved = await upsert(collection, payload, tenantId);
    res.json({
      ok: true,
      data: saved,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/:collection/:id
 * Updates or creates a record at a specific ID
 */
entityRouter.put('/:collection/:id', validateCollection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    const { collection, id } = req.params;
    const tenantId = req.tenantId;
    const cfg = resolveTableConfig(collection);
    if (cfg?.isTenantScoped && (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student')) {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }
    const payload = { ...req.body, id };

    const saved = await upsert(collection, payload, tenantId);
    res.json({
      ok: true,
      data: saved,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/:collection/:id
 * Deletes a record by primary key (with tenant isolation)
 */
entityRouter.delete('/:collection/:id', validateCollection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.tenantScopeViolation) {
      res.status(403).json({ ok: false, error: 'Tenant scope violation: request rejected.' });
      return;
    }
    const { collection, id } = req.params;
    const tenantId = req.tenantId;
    const cfg = resolveTableConfig(collection);
    if (cfg?.isTenantScoped && (req.sessionUser?.role === 'parent' || req.sessionUser?.role === 'student')) {
      res.status(403).json({ ok: false, error: 'This role does not have write access.' });
      return;
    }

    const success = await deleteRecord(collection, id, tenantId);
    if (!success) {
      res.status(404).json({
        ok: false,
        error: `Record not found or already deleted in '${collection}' with ID '${id}'`,
      });
      return;
    }

    res.json({
      ok: true,
      message: `Record '${id}' deleted from '${collection}'`,
    });
  } catch (err) {
    next(err);
  }
});
