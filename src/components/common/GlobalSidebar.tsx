import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, Send } from 'lucide-react';
import { MosqueComplexTenant, User } from '../../types';
import { getNavigationGroups, NavigationItem, NavigationGroup } from '../../lib/navigationConfig';
import { useApp } from '../../context/AppContext';
import { MosqueLogo } from './logos/MosqueLogo';

interface GlobalSidebarProps {
  isDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  activeTenant?: MosqueComplexTenant | null;
  currentUser?: User | null;
  badges?: Record<string, number | undefined>;
  onOpenGroupReport?: () => void;
  onLogout?: () => void;
  className?: string;
}

export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({
  isDrawer = false,
  isOpen = false,
  onClose,
  activeTenant: propTenant,
  currentUser: propUser,
  badges: propBadges,
  onOpenGroupReport,
  onLogout,
  className = '',
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    activeTenant: contextTenant,
    currentUser: contextUser,
    students,
    teachers,
    users,
    halaqahs,
    admissionsRequests,
    associationNominations,
    trackNominations,
    stages,
    archives,
    auditLogs,
    logout,
  } = useApp();

  const activeTenant = propTenant || contextTenant;
  const currentUser = propUser || contextUser;

  // Compute live badges
  const computedBadges = useMemo(() => {
    const tenantId = activeTenant?.id;
    return {
      students: students.filter((s) => !tenantId || s.tenantId === tenantId).length,
      teachers: teachers.filter((t) => !t.isArchived && !t.teacherArchived && t.staffRole !== 'supervisor' && (!tenantId || !t.tenantId || t.tenantId === tenantId || (tenantId.includes('ghazzawi') && t.tenantId?.includes('ghazzawi')))).length,
      supervisors: (users || []).filter((u) => !u.isArchived && !u.supervisorArchived && (u.role === 'supervisor' || u.staffRole === 'supervisor') && (!tenantId || !u.tenantId || u.tenantId === tenantId || (tenantId.includes('ghazzawi') && u.tenantId?.includes('ghazzawi')))).length,
      halaqahs: halaqahs.filter((h) => !tenantId || h.tenantId === tenantId).length,
      admissions: admissionsRequests?.filter((r) => r.status === 'pending' && (!tenantId || r.tenantId === tenantId)).length || 0,
      nominations: associationNominations?.filter((n) => n.supervisorStatus === 'pending').length || 0,
      tracks: trackNominations?.filter((t) => t.status === 'submitted').length || 0,
      stages: stages?.length || 0,
      archives: archives?.length || 0,
      audit: auditLogs?.length || 0,
      ...propBadges,
    };
  }, [
    students, teachers, users, halaqahs, admissionsRequests, associationNominations,
    trackNominations, stages, archives, auditLogs, propBadges, activeTenant,
  ]);

  // Unified Data-Driven Navigation Groups
  const navGroups = useMemo(() => {
    return getNavigationGroups(currentUser, activeTenant);
  }, [currentUser, activeTenant]);

  const handleItemClick = (item: NavigationItem) => {
    if (item.isAction) {
      if (item.id === 'group-report' && onOpenGroupReport) {
        onOpenGroupReport();
      }
      if (isDrawer && onClose) {
        onClose();
      }
      return;
    }
    if (item.path) {
      navigate(item.path);
      if (isDrawer && onClose) {
        onClose();
      }
    }
  };

  const handleLogoutClick = () => {
    if (isDrawer && onClose) {
      onClose();
    }
    if (onLogout) {
      onLogout();
    } else {
      logout();
      navigate('/');
    }
  };

  // If Drawer is closed, do not render
  if (isDrawer && !isOpen) {
    return null;
  }

  const sidebarContent = (
    <div className="flex flex-col h-full select-none overflow-y-auto scrollbar-none pb-10">
      <div className="p-3 border-b border-slate-100 flex items-center justify-center bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-2">
           <MosqueLogo size="sm" />
           <span className="font-bold text-sm text-slate-800">{activeTenant?.name || 'QRMS'}</span>
        </div>
      </div>
      
      <div className="flex-1 p-3 space-y-5 overflow-y-auto">
        {navGroups.map((group, groupIdx) => (
          <div key={group.category} className="space-y-1">
            {/* Section Header */}
            <div className="px-2 pb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{group.title}</span>
            </div>
            
            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = item.badgeKey ? computedBadges[item.badgeKey] : undefined;
                const itemPath = item.path || '';
                const [itemPathname, itemSearch] = itemPath.split('?');
                const isItemActive = Boolean(itemPath) && (() => {
                  if (itemSearch) {
                    return location.pathname === itemPathname && location.search.includes(itemSearch);
                  }
                  // Item has no query params: active only if current path matches and current URL has no subtab query param
                  if (location.pathname === itemPathname) {
                    return !location.search.includes('subtab=');
                  }
                  if (itemPathname !== '/' && itemPathname !== '/admin' && location.pathname.startsWith(itemPathname + '/')) {
                    return true;
                  }
                  return false;
                })();

                if (item.isAction) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-right transition-all cursor-pointer bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 text-emerald-700" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-right transition-colors cursor-pointer ${
                      isItemActive
                        ? 'bg-emerald-800 text-white shadow-xs font-black'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isItemActive ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {typeof count === 'number' && count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                            isItemActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0 mt-auto">
          <button
            onClick={handleLogoutClick}
            className="w-full py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
  );

  // If Drawer mode on mobile
  if (isDrawer) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 animate-in fade-in duration-200"
          onClick={onClose}
        />
        {/* Slide-over Drawer */}
        <aside className="lg:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop Persistent Sidebar: Attached to layout, sticky top-16, full viewport height
  return (
    <aside
      className={`hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-white border-l border-slate-200 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden z-20 ${className}`}
    >
      {sidebarContent}
    </aside>
  );
};
