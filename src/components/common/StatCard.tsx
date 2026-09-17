import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate';
  progress?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'emerald',
  progress,
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-800',
      text: 'text-emerald-950',
      bar: 'bg-emerald-600',
    },
    blue: {
      bg: 'bg-blue-50/70',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100 text-blue-800',
      text: 'text-blue-950',
      bar: 'bg-blue-600',
    },
    amber: {
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100 text-amber-800',
      text: 'text-amber-950',
      bar: 'bg-amber-500',
    },
    purple: {
      bg: 'bg-purple-50/70',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100 text-purple-800',
      text: 'text-purple-950',
      bar: 'bg-purple-600',
    },
    slate: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      iconBg: 'bg-slate-200 text-slate-800',
      text: 'text-slate-900',
      bar: 'bg-slate-600',
    },
  }[color];

  return (
    <div className={`rounded-2xl p-4 md:p-5 border transition-all duration-200 hover:shadow-md ${colorMap.bg} ${colorMap.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-700 block">{title}</span>
          <div className="text-2xl md:text-3xl font-black mt-1 text-slate-900">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl ${colorMap.iconBg} shadow-xs`}>{icon}</div>
      </div>

      {subtitle && <p className="text-xs text-slate-700 mt-2">{subtitle}</p>}

      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
            <span>نسبة الإنجاز</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorMap.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        </div>
      )}

      {trend && (
        <div className="mt-2 text-[11px] font-medium text-emerald-800 flex items-center gap-1">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
