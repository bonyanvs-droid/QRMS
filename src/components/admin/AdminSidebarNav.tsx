import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getGroupedAdminNav } from '../../lib/adminNavigationConfig';
import { MosqueComplexTenant } from '../../types';

interface AdminSidebarNavProps {
  activeTenant: MosqueComplexTenant | null;
  isSysAdmin: boolean;
  badges?: Record<string, number | undefined>;
  onItemClick?: () => void;
  className?: string;
}

export const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({
  activeTenant,
  isSysAdmin,
  badges = {},
  onItemClick,
  className = '',
}) => {
  const groupedNav = getGroupedAdminNav(activeTenant, isSysAdmin);

  return (
    <nav className={`space-y-6 ${className}`} aria-label="شريط التنقل الإداري">
      {groupedNav.map((group) => (
        <div key={group.id} className="space-y-1.5">
          <div className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
            {group.title}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = item.badgeKey ? badges[item.badgeKey] : undefined;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {typeof count === 'number' && count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black tabular-nums ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                        <ChevronLeft
                          className={`w-3.5 h-3.5 transition-transform ${
                            isActive
                              ? 'text-white/60 -translate-x-0.5'
                              : 'text-transparent group-hover:text-slate-400'
                          }`}
                        />
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};
