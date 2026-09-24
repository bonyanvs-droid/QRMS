import React, { useEffect, useMemo } from 'react';
import { getAyahOptions, getSurahAyahsCount, clampAyahNumber } from '../../utils/quranMetadata';

interface QuranAyahSelectProps {
  surah: string | number | undefined | null;
  value: number;
  onChange: (ayah: number) => void;
  label?: string;
  id?: string;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
  compact?: boolean;
  showEndIndicator?: boolean;
}

export const QuranAyahSelect: React.FC<QuranAyahSelectProps> = ({
  surah,
  value,
  onChange,
  label,
  id,
  className = '',
  selectClassName = '',
  disabled = false,
  compact = false,
  showEndIndicator = true,
}) => {
  const maxAyahs = useMemo(() => getSurahAyahsCount(surah), [surah]);
  const ayahOptions = useMemo(() => getAyahOptions(surah), [surah]);

  // Keep value strictly clamped if surah changes to one with fewer verses
  useEffect(() => {
    if (value && value > maxAyahs) {
      onChange(maxAyahs);
    } else if (!value || value < 1) {
      onChange(1);
    }
  }, [surah, maxAyahs, value, onChange]);

  const currentValue = clampAyahNumber(surah, value || 1);

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="text-[11px] font-bold text-slate-700">
            {label}
          </label>
          <span className="text-[10px] text-slate-500 font-medium font-mono">
            {currentValue} / {maxAyahs}
          </span>
        </div>
      )}
      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full bg-white rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors font-medium ${
            compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
          } ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed' : 'cursor-pointer'} ${selectClassName}`}
        >
          {ayahOptions.map((ayahNum) => {
            const isLast = ayahNum === maxAyahs;
            return (
              <option key={ayahNum} value={ayahNum}>
                {ayahNum} {isLast && showEndIndicator ? '(آخر السورة)' : ''}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};
