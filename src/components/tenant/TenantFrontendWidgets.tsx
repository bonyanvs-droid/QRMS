import React, { useState, useEffect, useRef } from 'react';
import { FrontendConfig, AdItem, BannerItem, MosqueComplexTenant, User } from '../../types';
import {
  Megaphone,
  ExternalLink,
  Play,
  X,
  Video,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  UserPlus,
  BookOpen,
  LogIn,
  LayoutDashboard,
  Building2,
} from 'lucide-react';
import { extractYouTubeId, getYouTubeThumbnail, getYouTubeEmbedUrl } from '../../lib/storageService';
import { getRolePortalRoute } from '../../lib/roleRoutes';

interface Props {
  config: FrontendConfig;
  onOpenAdmission?: () => void;
}

export interface TenantBannersProps {
  config: FrontendConfig;
  tenant?: MosqueComplexTenant;
  onOpenAdmission?: () => void;
  onOpenLogin?: () => void;
  effectiveUser?: User | null;
  onNavigatePortal?: (route: string) => void;
  roleDetails?: { portalLabel: string };
  RoleIcon?: React.ComponentType<{ className?: string }>;
}

export function TenantAdMarquee({ config }: Props) {
  const [selectedVideoAd, setSelectedVideoAd] = useState<AdItem | null>(null);

  const activeAds = (config.announcements || config.ads || []).filter((a) => a.isActive);
  if (!activeAds.length) return null;

  return (
    <>
      <div className="bg-amber-500 text-amber-950 border-b border-amber-600/30 overflow-hidden relative z-30 shadow-xs">
        <div className="flex items-center">
          <div className="bg-amber-600 text-white px-3 py-2 shrink-0 z-10 flex items-center gap-1.5 font-bold text-xs">
            <Megaphone className="w-4 h-4 animate-bounce" />
            <span className="hidden sm:inline">إعلانات المجمع:</span>
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap py-2">
            <div className="animate-marquee inline-block text-amber-950 font-bold text-xs sm:text-sm">
              {activeAds.map((ad) => {
                const youtubeId = ad.type === 'video' ? extractYouTubeId(ad.mediaUrl) : null;

                return (
                  <span key={ad.id} className="mx-6 sm:mx-10 inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-900 inline-block"></span>
                    <span>{ad.title}</span>

                    {ad.type === 'video' && youtubeId && (
                      <button
                        onClick={() => setSelectedVideoAd(ad)}
                        className="inline-flex items-center gap-1 bg-amber-900 text-amber-100 hover:bg-amber-950 text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer mr-1"
                        title="مشاهدة الفيديو"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>مشاهدة الفيديو</span>
                      </button>
                    )}

                    {ad.ctaUrl && (
                      <a
                        href={ad.ctaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-amber-900 hover:text-black font-extrabold underline text-xs mr-1"
                      >
                        <span>{ad.ctaText || 'التفاصيل'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal Player */}
      {selectedVideoAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden border border-slate-700 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Video className="w-4 h-4 text-amber-400" />
                <span>{selectedVideoAd.title}</span>
              </div>
              <button
                onClick={() => setSelectedVideoAd(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              {(() => {
                const vidId = extractYouTubeId(selectedVideoAd.mediaUrl);
                if (vidId) {
                  return (
                    <iframe
                      src={getYouTubeEmbedUrl(vidId)}
                      title={selectedVideoAd.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <video
                    src={selectedVideoAd.mediaUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                );
              })()}
            </div>

            {selectedVideoAd.description && (
              <div className="p-4 bg-slate-950 text-slate-300 text-xs leading-relaxed border-t border-slate-800">
                {selectedVideoAd.description}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function TenantBanners({
  config,
  tenant,
  onOpenAdmission,
  onOpenLogin,
  effectiveUser,
  onNavigatePortal,
  roleDetails,
  RoleIcon,
}: TenantBannersProps) {
  const activeBanners = (config.banners || []).filter((b) => b.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isPaused]);

  // If no banners, still render the unified hero with complex identity
  const currentBanner = activeBanners.length > 0 ? activeBanners[currentIndex] || activeBanners[0] : null;

  const handlePrev = () => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handleCtaClick = (b: BannerItem | null, e: React.MouseEvent) => {
    if (!b || !b.linkUrl || b.linkUrl === '#' || b.linkUrl.toLowerCase().includes('admission')) {
      if (onOpenAdmission) {
        e.preventDefault();
        onOpenAdmission();
      }
    }
  };

  const displayTitle =
    currentBanner?.title ||
    config.name ||
    tenant?.name ||
    'مجمع الغزاوي لتحفيظ القرآن الكريم';

  const displaySubtitle =
    currentBanner?.subtitle ||
    config.description ||
    tenant?.notes ||
    'صرح قرآني رائد يُعنى بغرس كتاب الله الكريم في نفوس الناشئة، وتأسيس القراءة القرآنية الصحيحة بالهجاء المتقن والقيم الإسلامية السامية.';

  return (
    <div
      className="w-full relative overflow-hidden bg-emerald-950 text-white min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex items-center group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Full-Bleed Background Layer (Single Layer - No Duplication) */}
      {currentBanner?.imageUrl ? (
        <img
          src={currentBanner.imageUrl}
          alt={displayTitle}
          key={currentBanner.id}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-45 sm:opacity-60 transition-all duration-700 pointer-events-none group-hover:scale-102"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-emerald-900 flex items-center justify-center overflow-hidden pointer-events-none">
          <div className="absolute -right-20 -top-20 w-[500px] h-[500px] rounded-full bg-emerald-700/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-3xl" />
          <svg
            className="absolute right-12 top-1/2 -translate-y-1/2 w-[500px] h-[500px] text-emerald-500/10 pointer-events-none"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <circle cx="100" cy="100" r="80" />
            <circle cx="100" cy="100" r="60" />
            <path d="M100 20 L180 100 L100 180 L20 100 Z" />
            <path d="M43.4 43.4 L156.6 43.4 L156.6 156.6 L43.4 156.6 Z" />
            <circle cx="100" cy="100" r="30" strokeDasharray="3 3" />
          </svg>
        </div>
      )}

      {/* 2. Olive Green Gradient Overlay with linear-gradient(to right, #858e5d, transparent) and fixed full-screen positioning */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/40 to-transparent pointer-events-none" />
      <div 
        className="pointer-events-none" 
        style={{ 
          background: 'linear-gradient(to right, #858e5d, transparent)',
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1
        }} 
      />

      {/* 3. Hero Content Container (Flush & Full Viewport Span) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 text-right">
        <div className="max-w-3xl space-y-4 sm:space-y-5">
          {/* Complex / Official Banner Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-md self-start">
            <Sparkles className="w-3.5 h-3.5 text-amber-950 shrink-0" />
            <span>{currentBanner ? 'إعلان وتنويه رسمي للمجمع' : 'البوابة الرسمية للمجمع القرآني المعتمد'}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-serif text-white leading-tight tracking-tight drop-shadow-md">
            {displayTitle}
          </h1>

          {/* Subtitle / Description */}
          <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 leading-relaxed font-medium max-w-2xl">
            {displaySubtitle}
          </p>

          {/* CTA Buttons & Slide Status */}
          <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Primary Action Button (Admission / Banner Link) */}
            {currentBanner?.linkUrl && !currentBanner.linkUrl.toLowerCase().includes('admission') ? (
              <a
                href={currentBanner.linkUrl}
                target={currentBanner.linkUrl.startsWith('http') ? '_blank' : '_self'}
                rel="noreferrer"
                onClick={(e) => handleCtaClick(currentBanner, e)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-amber-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all hover:scale-102 cursor-pointer"
              >
                <span>{currentBanner.ctaText || 'سجّل الآن'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button
                type="button"
                onClick={(e) => handleCtaClick(currentBanner, e)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-amber-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all hover:scale-102 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-950" />
                <span>{currentBanner?.ctaText || 'سجّل الآن'}</span>
              </button>
            )}

            {/* Secondary Action: Login or Return to Portal */}
            {effectiveUser ? (
              <button
                type="button"
                onClick={() => onNavigatePortal?.(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm border border-emerald-500/40 shadow-md transition-all cursor-pointer"
              >
                {RoleIcon ? <RoleIcon className="w-4 h-4 text-emerald-200" /> : <LayoutDashboard className="w-4 h-4 text-emerald-200" />}
                <span>العودة إلى {roleDetails?.portalLabel || 'البوابة'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 font-bold text-xs sm:text-sm border border-slate-700 shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>تسجيل الدخول</span>
              </button>
            )}

            {/* Active Banner Counter */}
            {activeBanners.length > 1 && (
              <span className="text-xs font-bold text-slate-300 bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800">
                {currentIndex + 1} من {activeBanners.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Slide Navigation Arrows & Dots */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="البانر السابق"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/70 hover:bg-emerald-700 text-white flex items-center justify-center backdrop-blur-md border border-slate-700/80 transition-all cursor-pointer z-20 hover:scale-110 shadow-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            aria-label="البانر التالي"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/70 hover:bg-emerald-700 text-white flex items-center justify-center backdrop-blur-md border border-slate-700/80 transition-all cursor-pointer z-20 hover:scale-110 shadow-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {activeBanners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'w-7 bg-amber-400 shadow-md'
                    : 'w-2 bg-white/40 hover:bg-white/80'
                }`}
                aria-label={`الانتقال إلى الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

