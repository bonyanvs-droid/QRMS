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

    const origin = window.location.origin;
    const rawLogo = activeTenant.logoUrl || logoUrl;
    // data:/blob: URIs are not valid manifest icon sources — exclude them
    const tenantLogo = rawLogo && !/^(data|blob):/i.test(rawLogo) ? rawLogo : null;
    const isSvgLogo = Boolean(tenantLogo && iconMime(tenantLogo) === 'image/svg+xml');

    // Icons: tenant logo first (installed-app icon), platform PNGs as fallback
    const icons: { src: string; sizes: string; type: string; purpose?: string }[] = [];
    if (tenantLogo) {
      const absLogo = /^https?:\/\//.test(tenantLogo)
        ? tenantLogo
        : origin + (tenantLogo.startsWith('/') ? tenantLogo : '/' + tenantLogo);
      icons.push(
        { src: absLogo, sizes: isSvgLogo ? 'any' : '512x512', type: iconMime(tenantLogo) },
        { src: absLogo, sizes: isSvgLogo ? 'any' : '192x192', type: iconMime(tenantLogo), purpose: 'any maskable' }
      );
    }
    icons.push(
      { src: origin + DEFAULT_ICON_192, sizes: '192x192', type: 'image/png' },
      { src: origin + DEFAULT_ICON_512, sizes: '512x512', type: 'image/png' },
      { src: origin + DEFAULT_ICON_512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    );

    const manifest = {
      // Per-tenant app id → separate installable PWA per tenant (Chrome 96+)
      id: `qrms-${activeTenant.id}`,
      name: activeTenant.name,
      short_name: shortNameOf(activeTenant.name),
      description: `${activeTenant.name} — منصة إدارة الحلقات القرآنية والمخرجات التعليمية`,
      theme_color: DEFAULT_THEME,
      background_color: '#f8fafc',
      display: 'standalone',
      orientation: 'portrait',
      start_url: origin + '/',
      scope: origin + '/',
      lang: 'ar',
      dir: 'rtl',
      icons,
    };

    // Swap manifest to tenant-branded Blob manifest
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const url = URL.createObjectURL(blob);
    if (manifestLink) manifestLink.href = url;
    if (manifestBlobUrl && manifestBlobUrl !== url) URL.revokeObjectURL(manifestBlobUrl);
    manifestBlobUrl = url;

    // Theme color + favicon + apple-touch-icon (raster only for apple)
    if (themeMeta) themeMeta.content = DEFAULT_THEME;
    if (tenantLogo) {
      setLink('icon', tenantLogo, iconMime(tenantLogo));
      if (!isSvgLogo) setLink('apple-touch-icon', tenantLogo);
    }

    return () => {
      // Don't revoke here — manifest link still references it; revoke on next swap
    };
  }, [activeTenant, logoUrl]);
}
