import React from 'react';
import { useApp } from '../../../context/AppContext';
import { BookOpen, Heart, Award, Users, Trophy } from 'lucide-react';

interface BaraemLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'compact' | 'badge' | 'icon';
  showPillars?: boolean;
}

export const BaraemLogo: React.FC<BaraemLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'compact',
  showPillars = false,
}) => {
  const { stageLogoUrl, stages } = useApp();
  const baraemStage = stages.find((s) => s.id === 'baraem');
  const activeLogo = (baraemStage?.isLogoActive !== false && baraemStage?.logoUrl) ? baraemStage.logoUrl : stageLogoUrl;

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-14 h-14 md:w-16 md:h-16',
    lg: 'w-20 h-20 md:w-24 md:h-24',
    xl: 'w-28 h-28 md:w-36 md:h-36',
    '2xl': 'w-48 h-48 md:w-60 md:h-60',
  };

  // If a custom image was uploaded by the user or configured in stage
  if (activeLogo) {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <img
          src={activeLogo}
          alt="شعار مرحلة البراعم"
          className={`${sizeClasses[size]} object-contain rounded-2xl drop-shadow-md`}
          referrerPolicy="no-referrer"
        />
        {showPillars && (
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              قرآن
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
              إيمان
            </span>
            <span className="text-[10px] font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">
              آداب
            </span>
            <span className="text-[10px] font-bold bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full">
              نشاط
            </span>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full">
              تميز
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full Rich Emblem Representation of the Stage Logo
  if (variant === 'full') {
    return (
      <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
        {/* Main Badge Card */}
        <div className="relative bg-gradient-to-b from-emerald-50 via-white to-amber-50/40 p-4 md:p-6 rounded-3xl border-2 border-emerald-300 shadow-xl max-w-sm w-full text-center overflow-hidden">
          {/* Top Leaf Accent & Sub-Motto */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 rounded-full border border-emerald-200 text-emerald-900 text-[11px] font-bold shadow-xs mb-2">
            <span>🌱</span>
            <span>نَبْتَدِي بالقرآن ونرتقي بالعِلم وبالعمل</span>
          </div>

          {/* Arched Illustration Header */}
          <div className="relative my-2 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-emerald-600 to-emerald-800 p-1 flex items-center justify-center shadow-lg border-2 border-amber-300 relative">
              {/* Crescent finial */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-[10px] px-2 py-0.5 rounded-full font-black shadow-xs">
                🌙
              </div>
              <div className="w-full h-full rounded-full bg-emerald-900/40 flex flex-col items-center justify-center text-white p-2">
                <span className="text-3xl sm:text-4xl drop-shadow-md">👦🏻</span>
                <span className="text-[10px] font-bold text-amber-200 mt-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-amber-300" /> المصحف الشريف
                </span>
              </div>
            </div>
          </div>

          {/* Big 3D Title: البراعم */}
          <div className="relative my-1">
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-600 drop-shadow-[0_4px_6px_rgba(5,150,105,0.3)] font-serif">
              البَـرَاعِـم
            </div>
            {/* Cloud banner: حلقات القرآن */}
            <div className="inline-block bg-white px-4 py-1 rounded-full border-2 border-emerald-400 font-bold text-xs sm:text-sm text-blue-900 shadow-xs mt-1">
              حَـلَقَـاتُ القُـرْآن
            </div>
          </div>

          {/* Blue Ribbon: نغرس اليوم .. لنحصد غداً */}
          <div className="my-2.5 mx-auto bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-md border-y border-blue-400 flex items-center justify-center gap-1.5">
            <span>🌿</span>
            <span>نَغْرِسُ اليوم .. لنَحْصُدَ غَداً</span>
            <span>🌿</span>
          </div>

          {/* The 5 Pillars of Baraem */}
          <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-100">
            <div className="bg-amber-100 text-amber-900 p-1.5 rounded-xl text-center border border-amber-300 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 mx-auto text-amber-700 mb-0.5" />
              <div className="text-[10px] font-black">قرآن</div>
            </div>
            <div className="bg-emerald-100 text-emerald-900 p-1.5 rounded-xl text-center border border-emerald-300 shadow-2xs">
              <Heart className="w-3.5 h-3.5 mx-auto text-emerald-700 mb-0.5" />
              <div className="text-[10px] font-black">إيمان</div>
            </div>
            <div className="bg-sky-100 text-sky-900 p-1.5 rounded-xl text-center border border-sky-300 shadow-2xs">
              <Award className="w-3.5 h-3.5 mx-auto text-sky-700 mb-0.5" />
              <div className="text-[10px] font-black">آداب</div>
            </div>
            <div className="bg-orange-100 text-orange-900 p-1.5 rounded-xl text-center border border-orange-300 shadow-2xs">
              <Users className="w-3.5 h-3.5 mx-auto text-orange-700 mb-0.5" />
              <div className="text-[10px] font-black">نشاط</div>
            </div>
            <div className="bg-purple-100 text-purple-900 p-1.5 rounded-xl text-center border border-purple-300 shadow-2xs">
              <Trophy className="w-3.5 h-3.5 mx-auto text-purple-700 mb-0.5" />
              <div className="text-[10px] font-black">تميز</div>
            </div>
          </div>

          {/* Footer Values */}
          <div className="mt-3 text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-2">
            <span>محبة</span>
            <span className="text-emerald-400">•</span>
            <span>انتماء</span>
            <span className="text-emerald-400">•</span>
            <span>عطاء</span>
          </div>
        </div>
      </div>
    );
  }

  // Compact Variant (Ideal for Header, Modals, Badges)
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center shrink-0 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 rounded-2xl shadow-md border-2 border-amber-300 overflow-hidden text-white p-1`}
        title="شعار مرحلة البراعم - حلقات القرآن"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Subtle arched background */}
          <path d="M15 90V45C15 25 30 10 50 10C70 10 85 25 85 45V90H15Z" fill="#064E3B" opacity="0.6" />
          {/* Top Crescent */}
          <circle cx="50" cy="18" r="4.5" fill="#FBBF24" />
          {/* Cute boy silhouette / Quran icon */}
          <circle cx="50" cy="38" r="12" fill="#FEF3C7" />
          {/* Cap (kufi) */}
          <path d="M40 34C40 26 60 26 60 34H40Z" fill="#FFFFFF" />
          {/* Holy Quran in hands */}
          <path d="M38 52L50 48L62 52L50 56L38 52Z" fill="#10B981" />
          <path d="M50 48V56" stroke="#F59E0B" strokeWidth="1.5" />
          {/* Arabic 3D Title: البراعم */}
          <text
            x="50"
            y="76"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="18"
            fontWeight="900"
            fontFamily="'Amiri', 'Traditional Arabic', serif"
          >
            البراعم
          </text>
          {/* Slogan pill banner */}
          <rect x="18" y="82" width="64" height="12" rx="6" fill="#1D4ED8" />
          <text x="50" y="91" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">
            حلقات القرآن
          </text>
        </svg>
      </div>

      {variant === 'badge' && (
        <div className="text-right">
          <span className="block font-black text-sm text-emerald-900 leading-tight">
            مرحلة البراعم
          </span>
          <span className="block text-[11px] text-blue-800 font-bold">
            حلقات القرآن الكريم
          </span>
        </div>
      )}
    </div>
  );
};
