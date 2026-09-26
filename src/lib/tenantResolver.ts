import { MosqueComplexTenant, User } from '../types';

export interface ResolvedTenantContext {
  isPlatform: boolean;
  tenantId: string | null;
  tenant: MosqueComplexTenant | null;
  resolutionSource: 'hostname' | 'subdomain' | 'custom_domain' | 'query' | 'path' | 'user_session' | 'default_platform';
}

/**
 * Normalizes input slug or tenant identifier
 */
export function normalizeTenantSlug(rawSlug: string): string {
  return rawSlug.trim().toLowerCase();
}

/**
 * Checks if candidate identifier matches tenant slug or id (with support for optional 'al-' prefix)
 */
export function matchesTenantIdentifier(t: MosqueComplexTenant, candidate: string): boolean {
  if (!t || !candidate) return false;
  const norm = normalizeTenantSlug(candidate);
  const slug = normalizeTenantSlug(t.slug || '');
  const id = normalizeTenantSlug(t.id || '');

  if (slug === norm || id === norm) return true;
  if (`al-${slug}` === norm || `al-${id}` === norm) return true;
  if (slug === `al-${norm}` || id === `al-${norm}`) return true;

  // Normalizing single/double 'z' in ghazawi / ghazzawi
  const normClean = norm.replace(/^al[-_]/, '').replace(/zz/g, 'z');
  const slugClean = slug.replace(/^al[-_]/, '').replace(/zz/g, 'z');
  const idClean = id.replace(/^al[-_]/, '').replace(/zz/g, 'z');
  if (normClean && (normClean === slugClean || normClean === idClean)) return true;

  // Known canonical mapping for Ghazzawi
  if (
    (normClean === 'ghazawi' || normClean === 'ghazzawi') &&
    (id === 'tenant_1789346881267' || slugClean === 'ghazawi')
  ) {
    return true;
  }

  return false;
}

/**
 * Known subdomains and hostnames reserved strictly for the Product / Platform
 */
const PLATFORM_RESERVED_HOSTNAMES = new Set([
  'schoolscreen.sa',
  'www.schoolscreen.sa',
  'qrms.schoolscreen.sa',
  'www.qrms.schoolscreen.sa',
  'app.schoolscreen.sa',
]);

const PLATFORM_RESERVED_SUBDOMAINS = new Set([
  'qrms',
  'www',
  'platform',
  'admin',
  'portal',
  'api',
]);

/**
 * Resolves the active tenant context based on hostname, subdomain, URL path, query params, or user session.
 * 
 * Flow:
 * 1. Check if hostname is the QRMS product site (e.g. qrms.schoolscreen.sa, schoolscreen.sa)
 * 2. Parse subdomain from *.schoolscreen.sa (e.g. ghazzawi.schoolscreen.sa -> slug "ghazzawi")
 * 3. Match against dynamic tenants array (by slug or id)
 * 4. Check custom domain on tenants
 * 5. Check preview/development path: /t/:tenantSlug or query: ?tenant=:tenantSlug
 * 6. Authenticated user's tenant (if operational role)
 * 7. Default to Platform commercial website
 */
export function resolveTenant(
  tenants: MosqueComplexTenant[],
  currentUser: User | null,
  currentLocation?: { hostname?: string; pathname?: string; search?: string }
): ResolvedTenantContext {
  const hostname = (currentLocation?.hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  const pathname = currentLocation?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  const search = currentLocation?.search || (typeof window !== 'undefined' ? window.location.search : '');

  // 1. Check reserved product/platform hostnames
  if (PLATFORM_RESERVED_HOSTNAMES.has(hostname)) {
    return {
      isPlatform: true,
      tenantId: null,
      tenant: null,
      resolutionSource: 'hostname',
    };
  }

  // 2. Subdomain check on schoolscreen.sa: e.g. ghazzawi.schoolscreen.sa or al-furqan.schoolscreen.sa
  if (hostname.endsWith('.schoolscreen.sa')) {
    const rawSubdomain = hostname.replace('.schoolscreen.sa', '').split('.')[0];
    const subdomain = normalizeTenantSlug(rawSubdomain);

    // Reserved platform subdomains (qrms, www, platform, admin)
    if (PLATFORM_RESERVED_SUBDOMAINS.has(subdomain)) {
      return {
        isPlatform: true,
        tenantId: null,
        tenant: null,
        resolutionSource: 'subdomain',
      };
    }

    // Dynamic resolution from tenants database/config
    const matchedTenant = tenants.find((t) => matchesTenantIdentifier(t, subdomain));

    if (matchedTenant) {
      return {
        isPlatform: false,
        tenantId: matchedTenant.id,
        tenant: matchedTenant,
        resolutionSource: 'subdomain',
      };
    }
  }

  // 3. Custom domain matching on tenants
  if (hostname) {
    const customDomainMatched = tenants.find(
      (t) => t.customDomain && normalizeTenantSlug(t.customDomain) === hostname
    );
    if (customDomainMatched) {
      return {
        isPlatform: false,
        tenantId: customDomainMatched.id,
        tenant: customDomainMatched,
        resolutionSource: 'custom_domain',
      };
    }
  }

  // 4. URL path: /t/:tenantSlug (Crucial for development, preview environments and direct navigation)
  if (pathname && pathname.startsWith('/t/')) {
    const parts = pathname.split('/');
    const pathSlug = parts[2];
    if (pathSlug) {
      const matchedTenant = tenants.find((t) => matchesTenantIdentifier(t, pathSlug));
      if (matchedTenant) {
        return {
          isPlatform: false,
          tenantId: matchedTenant.id,
          tenant: matchedTenant,
          resolutionSource: 'path',
        };
      }
    }
  }

  // 5. Query param: ?tenant=:tenantSlug (Development testing and preview switcher)
  if (search) {
    const params = new URLSearchParams(search);
    const qTenant = params.get('tenant');
    if (qTenant) {
      const normalizedQuery = normalizeTenantSlug(qTenant);
      if (normalizedQuery === 'platform' || normalizedQuery === 'none' || normalizedQuery === 'qrms') {
        return {
          isPlatform: true,
          tenantId: null,
          tenant: null,
          resolutionSource: 'query',
        };
      }
      const matchedTenant = tenants.find((t) => matchesTenantIdentifier(t, qTenant));
      if (matchedTenant) {
        return {
          isPlatform: false,
          tenantId: matchedTenant.id,
          tenant: matchedTenant,
          resolutionSource: 'query',
        };
      }
    }
  }

  // 6. Authenticated user's tenant (for operational roles, excluding platform-wide system_admin)
  if (currentUser && currentUser.tenantId && currentUser.role !== 'system_admin') {
    const userTenant = tenants.find((t) => t.id === currentUser.tenantId);
    if (userTenant) {
      return {
        isPlatform: false,
        tenantId: userTenant.id,
        tenant: userTenant,
        resolutionSource: 'user_session',
      };
    }
  }

  // 7. Default fallback: Platform Mode
  return {
    isPlatform: true,
    tenantId: null,
    tenant: null,
    resolutionSource: 'default_platform',
  };
}
