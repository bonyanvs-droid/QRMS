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
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isPaused]);

  // If no banners, still render the unified hero with complex identity
  const currentBanner = activeBanners.length > 0 ? activeBanners[currentIndex] || activeBanners[0] : null;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  // Touch Swipe Handlers for mobile gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    // In RTL: swipe left (diff > 50) means next, swipe right (diff < -50) means prev
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  const handleCtaClick = (b: BannerItem | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!b || !b.linkUrl || b.linkUrl === '#' || b.linkUrl.toLowerCase().includes('admission')) {
      if (onOpenAdmission) {
        e.preventDefault();
        onOpenAdmission();
      }
    }
  };

  // Check if banner has custom text
  const hasCustomTitle = !!currentBanner?.title && currentBanner.title.trim().length > 0;
  const hasCustomSubtitle = !!currentBanner?.subtitle && currentBanner.subtitle.trim().length > 0;
  const hasCta = !!currentBanner?.ctaText && currentBanner.ctaText.trim().length > 0;

  // Fallback title only if no banner image exists
  const displayTitle = hasCustomTitle
    ? currentBanner!.title
    : !currentBanner?.imageUrl
    ? config.name || tenant?.name || 'مجمع الغزاوي لتحفيظ القرآن الكريم'
    : '';

  const displaySubtitle = hasCustomSubtitle
    ? currentBanner!.subtitle
    : !currentBanner?.imageUrl
    ? config.description || tenant?.notes || 'صرح قرآني رائد يُعنى بغرس كتاب الله الكريم في نفوس الناشئة'
    : '';

  const showContentCard = displayTitle || displaySubtitle || hasCta;

  return (
    <div
      className="w-full relative overflow-hidden bg-slate-950 text-white min-h-[380px] sm:min-h-[480px] lg:min-h-[540px] flex items-center select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Full-Bleed Background Layer with Light Green Islamic Transparency */}
      {currentBanner?.imageUrl ? (
        <div key={currentBanner.id || currentIndex} className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out">
          <img
            src={currentBanner.imageUrl}
            alt={displayTitle || 'بانر المجمع'}
            className="w-full h-full object-cover object-center opacity-90 transition-all duration-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center overflow-hidden pointer-events-none">
          <div className="absolute -right-20 -top-20 w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-3xl" />
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

      {/* 2. Refined Authentic Green Islamic Transparency (الشفافية الخضراء التراثية بنعومة وخفة فائقة) */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/30 via-emerald-900/10 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, rgba(6, 95, 70, 0.22) 0%, rgba(16, 185, 129, 0.12) 40%, rgba(5, 150, 105, 0.05) 70%, transparent 100%)',
        }}
      />

      {/* 3. Natural Text & Action Elements */}
      {showContentCard && (
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 text-right pointer-events-none">
          <div
            key={`content-${currentIndex}`}
            className="max-w-xl space-y-2.5 pointer-events-auto"
          >
            {/* Tag / Badge - Shown cleanly if title exists */}
            {displayTitle && (
              <div className="animate-banner-fade-in inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-md mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-950 shrink-0" />
                <span>{currentBanner ? 'إعلان وتنويه رسمي للمجمع' : 'البوابة الرسمية للمجمع القرآني المعتمد'}</span>
              </div>
            )}

            {/* Main Headline with crisp drop shadow directly over graphic */}
            {displayTitle && (
              <h1 className="animate-banner-fade-delayed-1 text-2xl sm:text-3xl md:text-4xl font-black font-serif text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {displayTitle}
              </h1>
            )}

            {/* Subtitle / Description */}
            {displaySubtitle && (
              <p className="animate-banner-fade-delayed-2 text-xs sm:text-sm md:text-base text-white/95 leading-relaxed font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] max-w-lg">
                {displaySubtitle}
              </p>
            )}

            {/* CTA Buttons & Status Row */}
            <div className="animate-banner-fade-delayed-3 pt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Primary Action Button (Admission / Banner Link) */}
              {(hasCta || (!currentBanner?.imageUrl && onOpenAdmission)) && (
                currentBanner?.linkUrl && !currentBanner.linkUrl.toLowerCase().includes('admission') ? (
                  <a
                    href={currentBanner.linkUrl}
                    target={currentBanner.linkUrl.startsWith('http') ? '_blank' : '_self'}
                    rel="noreferrer"
                    onClick={(e) => handleCtaClick(currentBanner, e)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-amber-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <span>{currentBanner.ctaText || 'المزيد'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleCtaClick(currentBanner, e)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-amber-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-amber-950" />
                    <span>{currentBanner?.ctaText || 'المزيد'}</span>
                  </button>
                )
              )}

              {/* Secondary Action: Login or Return to Portal */}
              {effectiveUser ? (
                <button
                  type="button"
                  onClick={() => onNavigatePortal?.(getRolePortalRoute(effectiveUser.role, effectiveUser.tenantId))}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900/85 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm border border-emerald-600/40 shadow-xs transition-all cursor-pointer"
                >
                  {RoleIcon ? <RoleIcon className="w-4 h-4 text-emerald-200" /> : <LayoutDashboard className="w-4 h-4 text-emerald-200" />}
                  <span>العودة إلى {roleDetails?.portalLabel || 'البوابة'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-100 font-bold text-xs sm:text-sm border border-slate-700/80 shadow-xs transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>تسجيل الدخول</span>
                </button>
              )}

              {/* Numerical Slide Counter Pill */}
              {activeBanners.length > 1 && (
                <span className="text-xs font-bold text-slate-300 bg-slate-900/85 px-3 py-2 rounded-xl border border-slate-800/80 select-none">
                  {currentIndex + 1} من {activeBanners.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Slide Navigation Controls (Side Arrows & Center Dots) */}
      {activeBanners.length > 1 && (
        <>
          {/* Previous Slide Button (Left Arrow) */}
          <button
            onClick={handlePrev}
            aria-label="البانر السابق"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/70 hover:bg-emerald-800 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer z-20 hover:scale-105 active:scale-95 shadow-xl"
            title="السابق"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next Slide Button (Right Arrow) */}
          <button
            onClick={handleNext}
            aria-label="البانر التالي"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950/70 hover:bg-emerald-800 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer z-20 hover:scale-105 active:scale-95 shadow-xl"
            title="التالي"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Center Indicator Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {activeBanners.map((b, idx) => (
              <button
                key={b.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'w-7 bg-amber-400 shadow-sm'
                    : 'w-2 bg-white/35 hover:bg-white/70'
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

