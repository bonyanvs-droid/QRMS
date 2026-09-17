import React from 'react';
import { getSurahsByDirection, getSurahAyahsCount } from '../../utils/quranMetadata';
import { QuranAyahSelect } from './QuranAyahSelect';

interface QuranSurahAyahPickerProps {
  surahValue: string;
  ayahValue: number;
  onSurahChange: (surah: string) => void;
  onAyahChange: (ayah: number) => void;
  direction?: 'forward' | 'backward';
  title?: string;
  surahLabel?: string;
  ayahLabel?: string;
  idPrefix?: string;
  className?: string;
  layout?: 'grid' | 'inline' | 'stacked';
  disabled?: boolean;
  compact?: boolean;
}

export const QuranSurahAyahPicker: React.FC<QuranSurahAyahPickerProps> = ({
  surahValue,
  ayahValue,
  onSurahChange,
  onAyahChange,
  direction = 'backward',
  title,
  surahLabel = 'السورة',
  ayahLabel = 'رقم الآية',
  idPrefix = 'quran_picker',
  className = '',
  layout = 'grid',
  disabled = false,
  compact = false,
}) => {
  const surahs = getSurahsByDirection(direction);
  const currentSurahAyahs = getSurahAyahsCount(surahValue);

  const handleSurahSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSurah = e.target.value;
    onSurahChange(newSurah);
    // Auto adjust ayah if current ayah exceeds the new surah's ayah count
    const maxAyahsInNew = getSurahAyahsCount(newSurah);
    if (ayahValue > maxAyahsInNew) {
      onAyahChange(maxAyahsInNew);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {title && (
        <span className="text-xs font-bold text-slate-800 block">
          {title}
        </span>
      )}
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-2 gap-2'
            : layout === 'inline'
            ? 'flex items-center gap-2'
            : 'space-y-2'
        }
      >
        {/* Surah Dropdown */}
        <div className="flex-1">
          {surahLabel && (
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`${idPrefix}_surah`}
                className="text-[11px] font-bold text-slate-700"
              >
                {surahLabel}
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                ({currentSurahAyahs} آية)
              </span>
            </div>
          )}
          <select
            id={`${idPrefix}_surah`}
            disabled={disabled}
            value={surahValue}
            onChange={handleSurahSelect}
            className={`w-full bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors font-medium ${
              compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
            } ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {surahs.map((s) => (
              <option key={s.number} value={s.name}>
                {s.number}. سورة {s.name} ({s.ayahsCount} آية)
              </option>
            ))}
          </select>
        </div>

        {/* Ayah Dropdown */}
        <div className="flex-1">
          <QuranAyahSelect
            id={`${idPrefix}_ayah`}
            surah={surahValue}
            value={ayahValue}
            onChange={onAyahChange}
            label={ayahLabel}
            disabled={disabled}
            compact={compact}
          />
        </div>
      </div>
    </div>
  );
};
