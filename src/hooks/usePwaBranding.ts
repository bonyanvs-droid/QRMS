import { useEffect } from 'react';
import { MosqueComplexTenant } from '../types';

const DEFAULT_THEME = '#065f46';
const DEFAULT_MANIFEST = '/manifest.webmanifest';
const DEFAULT_ICON_192 = '/pwa-192x192.png';
const DEFAULT_ICON_512 = '/pwa-512x512.png';
const DEFAULT_FAVICON = '/quran-favicon.svg';
const DEFAULT_APPLE_TOUCH = '/apple-touch-icon.png';

let manifestBlobUrl: string | null = null;

function iconMime(url: string): string {
  const u = url.split('?')[0].toLowerCase();
  if (u.endsWith('.svg')) return 'image/svg+xml';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function shortNameOf(name: string): string {
  const words = name.trim().split(/\s+/);
  // Take up to 3 words, capped at 15 chars for launcher space
  let out = '';
  for (const w of words) {
    const candidate = out ? `${out} ${w}` : w;
    if (candidate.length > 15) break;
    out = candidate;
  }
  return out || name.slice(0, 15);
}

function setLink(rel: string, href: string, type?: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (type) el.type = type;
}

/**
 * Tenant-branded PWA identity:
 * Builds a per-tenant manifest (distinct `id` → separate installable PWA),
 * swaps the <link rel="manifest"> to a Blob URL, and updates theme-color,
 * favicon, and apple-touch-icon to the tenant's logo.
 * Reverts to default QRMS identity when no tenant is resolved.
 */
export function usePwaBranding(
  activeTenant: MosqueComplexTenant | null | undefined,
  logoUrl: string | null
): void {
  useEffect(() => {
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

    if (!activeTenant) {
      // Restore defaults
      if (manifestLink) manifestLink.href = DEFAULT_MANIFEST;
      if (themeMeta) themeMeta.content = DEFAULT_THEME;
      setLink('icon', DEFAULT_FAVICON, 'image/svg+xml');
      setLink('apple-touch-icon', DEFAULT_APPLE_TOUCH);
      return;
    }

    const tenantSlug = activeTenant.slug || activeTenant.id || 'ghazawi';
    const serverManifestUrl = `${origin}/api/tenants/${tenantSlug}/manifest.webmanifest`;

    // 1. Swap Web App Manifest link to the tenant's dynamic endpoint
    if (manifestLink) {
      manifestLink.href = serverManifestUrl;
    }
    if (manifestBlobUrl) {
      URL.revokeObjectURL(manifestBlobUrl);
      manifestBlobUrl = null;
    }

    // 2. Set theme color
    if (themeMeta) themeMeta.content = DEFAULT_THEME;

    // 3. Set tenant-specific favicon and apple-touch-icon
    const tenantFavicon = `${origin}/api/tenants/${tenantSlug}/logo?size=192`;
    const tenantAppleIcon = `${origin}/api/tenants/${tenantSlug}/logo?size=192&apple=1`;
    setLink('icon', tenantFavicon, 'image/png');
    setLink('apple-touch-icon', tenantAppleIcon);

    // 4. Update Apple PWA title
    const appTitleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appTitleMeta) {
      appTitleMeta.content = shortNameOf(activeTenant.name || 'المجمع');
    }

    return () => {
      // Cleanup if needed
    };
  }, [activeTenant, logoUrl]);
}
