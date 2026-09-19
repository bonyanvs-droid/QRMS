import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { useApp } from '../../context/AppContext';
import { Download, WifiOff, X, Smartphone, CheckCircle } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isOffline, installApp } = usePWA();
  const { activeTenant, mosqueLogoUrl } = useApp();
  const appName = activeTenant?.name || 'المنصة';
  const appIcon = activeTenant?.logoUrl || mosqueLogoUrl || '/pwa-192x192.png';
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Detect iOS Safari
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (dismissed && !isOffline) return null;

  return (
    <>
      {/* Offline Status Bar */}
      {isOffline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-inner transition-all">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
            <span>
              أنت الآن في وضع عدم الاتصال بالإنترنت. البيانات المسجلة محفوظة محلياً وسيتم مزامنتها تلقائياً مع السحابة فور عودة الشبكة.
            </span>
          </div>
        </div>
      )}

      {/* PWA Install Invitation Banner */}
      {!isInstalled && !dismissed && (isInstallable || isIos) && (
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-4 py-2.5 shadow-md border-b border-emerald-700/50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700/80 p-1 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <img src={appIcon} alt={`أيقونة ${appName}`} className="w-full h-full object-contain rounded" />
              </div>
              <div>
                <p className="font-bold text-emerald-100 flex items-center gap-1.5">
                  <span>تثبيت تطبيق {appName} على هاتفك</span>
                  <span className="text-[10px] bg-emerald-700 text-emerald-200 px-1.5 py-0.5 rounded font-mono">PWA</span>
                </p>
                <p className="text-[11px] text-emerald-300">
                  لوصول سريع من الشاشة الرئيسية، وتجربة شاشة كاملة وسرعة فائقة للمعلم وولي الأمر
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isInstallable && (
                <button
                  type="button"
                  onClick={installApp}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تثبيت التطبيق الآن</span>
                </button>
              )}

              {isIos && !isInstallable && (
                <button
                  type="button"
                  onClick={() => setShowIosGuide(!showIosGuide)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-emerald-100 font-bold text-xs transition-colors border border-emerald-500/40"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>طريقة التثبيت على الآيفون</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="p-1 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* iOS Safari Installation Guide Modal / Dropdown */}
          {showIosGuide && (
            <div className="max-w-xl mx-auto mt-3 p-3 bg-emerald-950/90 rounded-xl border border-emerald-600/50 text-xs text-emerald-200 space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span>خطوات إضافة التطبيق لشاشة الآيفون الرئيسية:</span>
                <button type="button" onClick={() => setShowIosGuide(false)} className="text-emerald-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p>1. اضغط على زر <strong>المشاركة (Share)</strong> أسفل شاشة سفاري (مربع يخرج منه سهم لأعلى).</p>
              <p>2. مرر لأسفل القائمة واختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</p>
              <p>3. اضغط على <strong>"إضافة" (Add)</strong> في أعلى الزاوية، وسيظهر تطبيق المجمع القرآني في شاشة هاتفك.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};
