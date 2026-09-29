import { Router } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { getPublicTenants, getAllTenantsForApp, getTenantByIdOrSlug, getTenantPublicStats } from '../services/tenantService';
import { upsert, deleteRecord } from '../services/entityService';

export const tenantRouter = Router();

/**
 * GET /api/tenants
 * Returns directory of active public tenants.
 */
tenantRouter.get('/', async (req, res, next) => {
  try {
    // Authenticated app sessions receive full tenant records (operational
    // configs included); anonymous directory visitors keep the lean public
    // shape — attendance/prayer/module configs never leak publicly.
    const tenants = req.sessionUser
      ? await getAllTenantsForApp()
      : await getPublicTenants();
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
 * Serves the tenant's logo as a real square PNG image response (decodes stored data URIs),
 * supporting exact sizes, maskable safe-zone padding (for Android), and solid background (for iOS).
 */
tenantRouter.get('/:idOrSlug/logo', async (req, res, next) => {
  try {
    const tenant = await getTenantByIdOrSlug(req.params.idOrSlug);
    const logoUrl = tenant?.logoUrl;
    const size = Math.min(1024, Math.max(16, parseInt(String(req.query.size || '512'), 10) || 512));
    const isMaskable = req.query.maskable === '1' || req.query.maskable === 'true';
    const isApple = req.query.apple === '1' || req.query.apple === 'true';

    // 1. If base64 data URI: decode and normalize to exact square PNG with sharp
    const match = logoUrl ? /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(logoUrl) : null;
    if (match) {
      const buffer = Buffer.from(match[2], 'base64');
      let png: Buffer;

      if (isMaskable) {
        // Android maskable requires ~15-20% margin safe zone so round launcher crops don't cut logo
        const innerSize = Math.round(size * 0.75);
        const inner = await sharp(buffer)
          .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();
        png = await sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        })
          .composite([{ input: inner, gravity: 'center' }])
          .png()
          .toBuffer();
      } else if (isApple) {
        // iOS apple-touch-icon: no transparency allowed (Safari makes alpha black)
        const innerSize = Math.round(size * 0.85);
        const inner = await sharp(buffer)
          .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();
        png = await sharp({
          create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        })
          .composite([{ input: inner, gravity: 'center' }])
          .png()
          .toBuffer();
      } else {
        // Standard square transparent icon
        png = await sharp(buffer)
          .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();
      }

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(png);
      return;
    }

    // 2. If HTTP/absolute or site-relative URL, redirect
    if (logoUrl && (/^https?:\/\//.test(logoUrl) || logoUrl.startsWith('/'))) {
      res.redirect(logoUrl);
      return;
    }

    // 3. Fallback: serve default pwa emblem resized to requested dimension
    const defaultIconPath = path.join(process.cwd(), 'public', 'pwa-512x512.png');
    if (fs.existsSync(defaultIconPath)) {
      const fallbackBuf = await sharp(defaultIconPath)
        .resize(size, size, { fit: 'contain' })
        .png()
        .toBuffer();
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': String(fallbackBuf.length),
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(fallbackBuf);
      return;
    }

    res.status(404).json({ ok: false, error: 'Tenant logo not found' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tenants/:idOrSlug/manifest.webmanifest
 * Serves dynamic PWA manifest customized with the tenant's real name, start URL, and logo icons.
 */
tenantRouter.get('/:idOrSlug/manifest.webmanifest', async (req, res, next) => {
  try {
    const tenant = await getTenantByIdOrSlug(req.params.idOrSlug);
    if (!tenant) {
      res.status(404).json({ ok: false, error: 'Tenant not found' });
      return;
    }

    const tenantSlug = tenant.slug || tenant.id || 'ghazawi';
    const name = tenant.name || 'مجمع الغزاوي القرآني';
    const words = name.trim().split(/\s+/);
    const shortName = words.slice(0, 3).join(' ').slice(0, 15) || name.slice(0, 15);

    const manifest = {
      id: `/t/${tenantSlug}`,
      name: name,
      short_name: shortName,
      description: `${name} — منصة إدارة الحلقات القرآنية والمخرجات التعليمية والتربوية`,
      theme_color: '#065f46',
      background_color: '#f8fafc',
      display: 'standalone',
      orientation: 'portrait',
      start_url: `/#/t/${tenantSlug}`,
      scope: '/',
      lang: 'ar',
      dir: 'rtl',
      icons: [
        {
          src: `/api/tenants/${tenantSlug}/logo?size=192`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/api/tenants/${tenantSlug}/logo?size=192&maskable=1`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: `/api/tenants/${tenantSlug}/logo?size=512`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/api/tenants/${tenantSlug}/logo?size=512&maskable=1`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };

    res.set({
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
    res.json(manifest);
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
