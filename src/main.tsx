import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPwaServiceWorker } from './pwa.ts';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

registerPwaServiceWorker();

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err: any) {
    console.error('Fatal initialization error:', err);
    rootElement.innerHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; direction: rtl; text-align: right; padding: 2rem; max-width: 600px; margin: 2rem auto; background: #fff; border-radius: 1rem; border: 1px solid #fed7aa; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="color: #9a3412; margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: bold;">تنبيه: تعذر بدء التطبيق</h2>
        <p style="color: #475569; font-size: 0.875rem; margin-bottom: 1rem;">حدث خطأ غير متوقع أثناء تشغيل واجهة النظام: ${err?.message || err}</p>
        <button onclick="try{localStorage.clear()}catch(e){}try{sessionStorage.clear()}catch(e){}window.location.hash='#/';window.location.reload();" style="background: #ea580c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">
          مسح الذاكرة المؤقتة وإعادة التحميل
        </button>
      </div>
    `;
  }
}

