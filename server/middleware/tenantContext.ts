import { Request, Response, NextFunction } from 'express';
import { getSessionUser } from '../routes/authRoutes';
import { resolveCanonicalTenantId } from '../services/tenantService';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      organizationId?: string;
      isSuperAdmin?: boolean;
      sessionUser?: any;
      tenantScopeViolation?: boolean;
    }
  }
}

// Roles that are legitimately allowed to operate across tenant boundaries
const CROSS_TENANT_ROLES = new Set(['system_admin', 'charity_supervisor']);

/**
 * Extracts and validates tenant and organization context from request headers or query.
 * Enforces strict multi-tenant isolation across all data access operations.
 */
export async function extractTenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const headerTenantId = req.headers['x-tenant-id'];
    const queryTenantId = req.query.tenantId;
    const headerOrgId = req.headers['x-organization-id'];
    const queryOrgId = req.query.organizationId;

    const rawTenantId = (headerTenantId || queryTenantId) as string | undefined;
    const rawOrgId = (headerOrgId || queryOrgId) as string | undefined;

    if (rawTenantId && typeof rawTenantId === 'string') {
      const canonicalId = await resolveCanonicalTenantId(rawTenantId);
      req.tenantId = (canonicalId || rawTenantId.trim());
    }

    if (rawOrgId && typeof rawOrgId === 'string') {
      req.organizationId = rawOrgId.trim();
    }

    // Bind tenant scope to the authenticated session so a client cannot spoof
    // another tenant via X-Tenant-Id / ?tenantId=. When the session user's tenant
    // is known and the role is tenant-bound:
    //  - a missing tenant is auto-filled from the session (safe default), and
    //  - a conflicting tenant is flagged as a scope violation for route handlers.
    const sessionId =
      req.cookies?.session_id ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const sessionUser = sessionId ? getSessionUser(sessionId) : null;
    if (sessionUser) {
      req.sessionUser = sessionUser;
      if (sessionUser.role === 'system_admin') {
        req.isSuperAdmin = true;
      }
      const rawSessionTenantId = sessionUser.tenantId || sessionUser.tenant_id;
      if (rawSessionTenantId && !CROSS_TENANT_ROLES.has(sessionUser.role)) {
        const canonicalSessionTenantId = (await resolveCanonicalTenantId(rawSessionTenantId)) || String(rawSessionTenantId);
        if (!req.tenantId) {
          req.tenantId = canonicalSessionTenantId;
        } else if (req.tenantId !== canonicalSessionTenantId && req.tenantId !== String(rawSessionTenantId)) {
          req.tenantScopeViolation = true;
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
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
