import { Router } from 'express';
import { getPublicTenants, getTenantByIdOrSlug } from '../services/tenantService';
import { upsert, deleteRecord } from '../services/entityService';

export const tenantRouter = Router();

/**
 * GET /api/tenants
 * Returns directory of active public tenants.
 */
tenantRouter.get('/', async (req, res, next) => {
  try {
    const tenants = await getPublicTenants();
    res.json({
      ok: true,
      count: tenants.length,
      data: tenants,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tenants/:idOrSlug
 * Returns specific tenant details by ID or Slug.
 */
tenantRouter.get('/:idOrSlug', async (req, res, next) => {
  try {
    const tenant = await getTenantByIdOrSlug(req.params.idOrSlug);
    if (!tenant) {
      res.status(404).json({
        ok: false,
        error: 'Tenant not found',
      });
      return;
    }
    res.json({
      ok: true,
      data: tenant,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tenants
 * Creates or updates a tenant record (modules, permissions, config).
 */
tenantRouter.post('/', async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid request body' });
      return;
    }
    const saved = await upsert('tenants', payload, req.tenantId);
    res.json({ ok: true, data: saved });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tenants/:id
 * Updates a tenant at a specific ID.
 */
tenantRouter.put('/:id', async (req, res, next) => {
  try {
    const payload = { ...req.body, id: req.params.id };
    const saved = await upsert('tenants', payload, req.tenantId);
    res.json({ ok: true, data: saved });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tenants/:id
 */
tenantRouter.delete('/:id', async (req, res, next) => {
  try {
    const success = await deleteRecord('tenants', req.params.id, req.tenantId);
    if (!success) {
      res.status(404).json({ ok: false, error: 'Tenant not found' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
