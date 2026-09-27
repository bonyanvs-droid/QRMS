import { Router } from 'express';
import { getPublicTenants, getTenantByIdOrSlug, getTenantPublicStats } from '../services/tenantService';
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
 * GET /api/tenants/stats
 * Returns public stats for the specified or current tenant.
 */
tenantRouter.get('/stats', async (req, res, next) => {
  try {
    const targetTenant = (req.query.tenantId as string) || req.tenantId || 'tenant_1789346881267';
    const stats = await getTenantPublicStats(targetTenant);
    if (!stats) {
      res.status(404).json({ ok: false, error: 'Tenant stats not found' });
      return;
    }
    res.json({ ok: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tenants/:idOrSlug/stats
 * Returns public aggregate stats for a specific tenant by ID or Slug.
 */
tenantRouter.get('/:idOrSlug/stats', async (req, res, next) => {
  try {
    const stats = await getTenantPublicStats(req.params.idOrSlug);
    if (!stats) {
      res.status(404).json({ ok: false, error: 'Tenant stats not found' });
      return;
    }
    res.json({ ok: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tenants/:idOrSlug/logo
 * Serves the tenant's logo as a real image response (decodes stored data URIs),
 * so it can be referenced from PWA manifests which do not accept data: URIs.
 */
tenantRouter.get('/:idOrSlug/logo', async (req, res, next) => {
  try {
    const tenant = await getTenantByIdOrSlug(req.params.idOrSlug);
    const logoUrl = tenant?.logoUrl;
    if (!logoUrl) {
      res.status(404).json({ ok: false, error: 'Tenant logo not found' });
      return;
    }
    // data:image/<type>;base64,<payload> → decode and stream
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(logoUrl);
    if (match) {
      const buffer = Buffer.from(match[2], 'base64');
      res.set({
        'Content-Type': match[1],
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(buffer);
      return;
    }
    // HTTP/absolute or site-relative path → redirect
    if (/^https?:\/\//.test(logoUrl) || logoUrl.startsWith('/')) {
      res.redirect(logoUrl);
      return;
    }
    res.status(404).json({ ok: false, error: 'Unsupported logo format' });
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
