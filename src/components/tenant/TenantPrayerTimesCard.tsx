import React, { useMemo } from 'react';
import { Clock, Sun, Sunrise, Sunset, Moon, MapPin } from 'lucide-react';
import { DailyPrayerTimes, MosqueComplexTenant } from '../../types';
import {
  diffMinutes,
  formatTime12Hour,
  getPrayerTimesForDateSync,
  PRAYER_NAMES_AR,
} from '../../utils/prayerTimesService';

interface TenantPrayerTimesCardProps {
  tenant: MosqueComplexTenant;
  customPrayerTimes?: DailyPrayerTimes | null;
}

export const TenantPrayerTimesCard: React.FC<TenantPrayerTimesCardProps> = ({
  tenant,
  customPrayerTimes,
}) => {
  const prayerTimes = useMemo(() => {
    return customPrayerTimes || getPrayerTimesForDateSync(tenant);
  }, [tenant, customPrayerTimes]);

  // Determine current or next prayer
  const now = new Date();
  const currentClockStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const prayersList: {
    key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    name: string;
    time: string;
    icon: any;
    isSun?: boolean;
  }[] = [
    { key: 'fajr', name: 'الفجر', time: prayerTimes.fajr, icon: Moon },
    { key: 'sunrise', name: 'الشروق', time: prayerTimes.sunrise, icon: Sunrise, isSun: true },
    { key: 'dhuhr', name: 'الظهر', time: prayerTimes.dhuhr, icon: Sun },
    { key: 'asr', name: 'العصر', time: prayerTimes.asr, icon: Sun },
    { key: 'maghrib', name: 'المغرب', time: prayerTimes.maghrib, icon: Sunset },
    { key: 'isha', name: 'العشاء', time: prayerTimes.isha, icon: Moon },
  ];

  // Find next upcoming prayer
  let nextPrayerKey = 'fajr';
  for (const p of prayersList) {
    if (diffMinutes(currentClockStr, p.time) > 0) {
      nextPrayerKey = p.key;
      break;
    }
  }

  return (
    <section className="bg-white rounded-3xl border border-emerald-200/80 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-amber-300 backdrop-blur-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg font-serif">
              مواقيت الصلاة اليومية بالمجمع
            </h3>
            <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5">
              <span>{tenant.city} - {tenant.district}</span>
              <span className="opacity-40">•</span>
              <span>تقويم أم القرى (مكة المكرمة)</span>
            </p>
          </div>
        </div>

        {prayerTimes.hijriDate && (
          <div className="self-start sm:self-auto bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold text-amber-200">
            {prayerTimes.hijriDate}
          </div>
        )}
      </div>

      {/* Prayers Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {prayersList.map((p) => {
          const Icon = p.icon;
          const isNext = p.key === nextPrayerKey;
          const formatted = formatTime12Hour(p.time);

          return (
            <div
              key={p.key}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                isNext
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isNext
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center justify-center gap-1">
                <span>{p.name}</span>
                {isNext && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                )}
              </div>

              <div
                className={`text-sm sm:text-base font-black font-mono ${
                  isNext ? 'text-emerald-950' : 'text-slate-900'
                }`}
              >
                {formatted}
              </div>

              {isNext && (
                <div className="mt-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                    الصلاة القادمة
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
