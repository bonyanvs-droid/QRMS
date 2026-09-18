import { registerSW } from 'virtual:pwa-register';

export function registerPwaServiceWorker() {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    if (import.meta.env.DEV || isInIframe) {
      try {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().catch(() => {});
          }
        }).catch(() => {});
      } catch {}
      return;
    }

    const updateSW = registerSW({
      onNeedRefresh() {
        updateSW(true);
      },
      onOfflineReady() {
        console.log('منصة مجمع حلقات الغزاوي جاهزة للعمل في وضع عدم الاتصال');
      },
    });
  } catch (err) {
    console.warn('[PWA] Service worker registration skipped:', err);
  }
}
