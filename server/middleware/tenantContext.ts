import { Request, Response, NextFunction } from 'express';
import { getSessionUser } from '../routes/authRoutes';

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
    const sessionTenantId = sessionUser.tenantId || sessionUser.tenant_id;
    if (sessionTenantId && !CROSS_TENANT_ROLES.has(sessionUser.role)) {
      if (!req.tenantId) {
        req.tenantId = String(sessionTenantId);
      } else if (req.tenantId !== sessionTenantId) {
        req.tenantScopeViolation = true;
      }
    }
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
