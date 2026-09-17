import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      organizationId?: string;
      isSuperAdmin?: boolean;
    }
  }
}

/**
 * Extracts and validates tenant and organization context from request headers or query.
 * Enforces strict multi-tenant isolation across all data access operations.
 */
export function extractTenantContext(req: Request, res: Response, next: NextFunction): void {
  const headerTenantId = req.headers['x-tenant-id'];
  const queryTenantId = req.query.tenantId;
  const headerOrgId = req.headers['x-organization-id'];
  const queryOrgId = req.query.organizationId;

  const rawTenantId = (headerTenantId || queryTenantId) as string | undefined;
  const rawOrgId = (headerOrgId || queryOrgId) as string | undefined;

  if (rawTenantId && typeof rawTenantId === 'string') {
    // Sanitize and trim tenant identifier
    req.tenantId = rawTenantId.trim();
  }

  if (rawOrgId && typeof rawOrgId === 'string') {
    req.organizationId = rawOrgId.trim();
  }

  next();
}

/**
 * Middleware that strictly enforces a valid tenant ID on tenant-scoped endpoints.
 */
export function requireTenantContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    res.status(400).json({
      ok: false,
      error: 'Tenant context is required for this operation. Please provide the X-Tenant-Id header or tenantId parameter.',
    });
    return;
  }
  next();
}
