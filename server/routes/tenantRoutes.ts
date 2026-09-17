import { Router } from 'express';
import { getPublicTenants, getTenantByIdOrSlug } from '../services/tenantService';

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
