import React from 'react';
import { StudentStatus } from '../../types';

interface StatusBadgeProps {
  status: StudentStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  switch (status) {
    case 'advanced':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 ${sizeClasses}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>{label || 'متقدم ⭐'}</span>
        </span>
      );
    case 'on_track':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-100 text-blue-800 border border-blue-300 ${sizeClasses}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>{label || 'على الخطة 🔵'}</span>
        </span>
      );
    case 'needs_support':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 ${sizeClasses}`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>{label || 'يحتاج دعمًا 🟠'}</span>
        </span>
      );
    case 'lagging':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-100 text-rose-800 border border-rose-300 ${sizeClasses}`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-600"></span>
          <span>{label || 'متأخر 🔴'}</span>
        </span>
      );
    case 'not_moved_yet':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-purple-100 text-purple-800 border border-purple-300 ${sizeClasses}`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          <span>{label || 'لم ينتقل بعد (تثبيت)'}</span>
        </span>
      );
    default:
      return null;
  }
};
