import { registerSW } from 'virtual:pwa-register';

export function registerPwaServiceWorker() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        // Automatically activate new service worker when available
        updateSW(true);
      },
      onOfflineReady() {
        console.log('منصة مجمع حلقات الغزاوي جاهزة للعمل في وضع عدم الاتصال');
      },
    });
  }
}
