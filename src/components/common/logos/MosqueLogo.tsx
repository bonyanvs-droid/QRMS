import React from 'react';
import { useApp } from '../../../context/AppContext';

interface MosqueLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  customLogoUrl?: string;
  customName?: string;
}

export const MosqueLogo: React.FC<MosqueLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  textColor = 'text-slate-900',
  customLogoUrl,
  customName,
}) => {
  const { mosqueLogoUrl, activeTenant } = useApp();
  const effectiveLogo = customLogoUrl || mosqueLogoUrl || activeTenant?.logoUrl;
  const tenantName = customName || activeTenant?.name || 'مسجد الغزاوي';
  const subtitle = [activeTenant?.district, activeTenant?.city].filter(Boolean).join(' - ') || 'بمدينة جدة';

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12 md:w-14 md:h-14',
    lg: 'w-16 h-16 md:w-20 md:h-20',
    xl: 'w-24 h-24 md:w-32 md:h-32',
  };

  // If a custom image has been provided/uploaded by the user or configured in tenant
  if (effectiveLogo) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <img
          src={effectiveLogo}
          alt={`شعار ${tenantName}`}
          className={`${sizeClasses[size]} object-contain rounded-xl shadow-xs`}
          referrerPolicy="no-referrer"
        />
        {showText && (
          <div className="text-right">
            <span className={`block font-black text-sm md:text-base leading-tight ${textColor}`}>
              {tenantName}
            </span>
            <span className="block text-[11px] text-emerald-800 font-semibold">{subtitle}</span>
          </div>
        )}
      </div>
    );
  }

  // Authentic vector recreation of the Mosque emblem (Golden Dome Arch, Navy Minaret, Calligraphy)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center shrink-0 bg-white rounded-2xl p-1 shadow-xs border border-amber-200/60 overflow-hidden`}
        title="شعار مسجد الغزاوي"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Minaret Crescent Top */}
          <path
            d="M42 20C40 16 38 12 40 8C43 14 47 18 52 19C48 21 44 24 43 28C42 24 41 21 42 20Z"
            fill="#E5A124"
          />
          {/* Minaret Finial & Dome Cap */}
          <circle cx="42" cy="27" r="4.5" fill="#E5A124" />
          <path d="M37 32C37 30 47 30 47 32L46 36L38 36L37 32Z" fill="#E5A124" />
          {/* Minaret Balcony Crescent Wings */}
          <path
            d="M26 48C30 40 40 37 42 36C44 37 54 40 58 48C51 44 42 42 33 46C30 47 27 48 26 48Z"
            fill="#162E54"
          />
          {/* Minaret Shaft */}
          <path
            d="M34 47L36 120C36 123 37 125 39 125L45 125C47 125 48 123 48 120L50 47C47 48 44 49 42 49C40 49 37 48 34 47Z"
            fill="#162E54"
          />

          {/* Golden Dome Sweeping Arch */}
          <path
            d="M80 62C105 60 135 68 155 86C175 104 185 128 180 152C182 142 180 126 172 110C162 90 142 74 120 66C105 60 88 61 80 62Z"
            fill="#E5A124"
          />
          <path
            d="M40 136C45 110 65 85 92 72C118 59 148 62 172 79C152 70 128 69 105 78C78 88 56 110 48 136H40Z"
            fill="#E5A124"
          />

          {/* Navy Blue Base Swoosh Arc */}
          <path
            d="M52 136C65 148 95 156 130 155C160 154 185 142 195 132C178 145 150 151 120 150C85 149 62 142 52 136Z"
            fill="#162E54"
          />
          <path
            d="M52 136C80 152 120 156 160 148C180 144 195 136 200 132C188 143 162 154 135 156C95 159 65 150 52 136Z"
            fill="#162E54"
          />

          {/* Golden Lower Base Arc */}
          <path
            d="M50 145C55 162 85 178 120 178C155 178 180 165 185 150C175 164 150 174 120 174C90 174 65 162 50 145Z"
            fill="#E5A124"
          />

          {/* Arabic Calligraphy in Center: مَسْجِدُ الغَزَّاوِيّ */}
          <g id="calligraphy" transform="translate(118, 128) scale(0.92)">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              className="font-serif font-black select-none"
              style={{
                fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif",
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                fill: '#111827',
              }}
            >
              مَسْجِدُ الغَزَّاوِيّ
            </text>
          </g>
        </svg>
      </div>

      {showText && (
        <div className="text-right">
          <span className={`block font-black text-sm md:text-base leading-tight ${textColor}`}>
            مسجد الغزاوي
          </span>
          <span className="block text-[11px] text-amber-700 font-bold">بمدينة جدة</span>
        </div>
      )}
    </div>
  );
};
