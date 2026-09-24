import React from 'react';
import { useApp } from '../../../context/AppContext';
import { EducationalStage } from '../../../types';
import { Layers } from 'lucide-react';

interface StageLogoProps {
  stage?: EducationalStage | null;
  stageId?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'compact' | 'full' | 'badge' | 'icon';
  showName?: boolean;
  fallbackToIcon?: boolean;
}

export const StageLogo: React.FC<StageLogoProps> = ({
  stage: stageProp,
  stageId,
  className = '',
  size = 'md',
  variant = 'compact',
  showName = false,
  fallbackToIcon = false,
}) => {
  const { stages } = useApp();

  const resolvedStage =
    stageProp || (stageId ? stages.find((s) => s.id === stageId) : null);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10 md:w-12 md:h-12',
    lg: 'w-14 h-14 md:w-16 md:h-16',
    xl: 'w-20 h-20 md:w-24 md:h-24',
    '2xl': 'w-32 h-32 md:w-40 md:h-40',
  };

  const hasActiveLogo =
    resolvedStage?.logoUrl && resolvedStage.isLogoActive !== false;

  if (hasActiveLogo) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <img
          src={resolvedStage.logoUrl!}
          alt={resolvedStage.name || 'شعار المرحلة'}
          className={`${sizeClasses[size]} object-contain rounded-xl drop-shadow-xs`}
          referrerPolicy="no-referrer"
        />
        {showName && (
          <span className="text-xs font-bold text-slate-700">
            {resolvedStage.name}
          </span>
        )}
      </div>
    );
  }

  if (fallbackToIcon && resolvedStage) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold ${sizeClasses[size]} ${className}`}
        title={resolvedStage.name}
      >
        <Layers className="w-1/2 h-1/2 text-slate-500" />
      </div>
    );
  }

  return null;
};
