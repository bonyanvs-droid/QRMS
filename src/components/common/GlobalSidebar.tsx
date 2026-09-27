import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, Send, ChevronsUpDown } from 'lucide-react';
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

  // Track collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Dynamic measurement to guarantee the sidebar height matches the page body content exactly:
  // - Never shorter than page ("القائمة اقصر من الصفحة")
  // - Never exceeds page ("تنتهي مع انتهائها")
  // - Internal scrollbar active whenever sidebar items overflow available height ("ويعمل شريط جانبي لو متاح")
  const [mainContentHeight, setMainContentHeight] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerHeight : 800;
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        setViewportHeight(window.innerHeight);
      }
      const mainEl = document.getElementById('main-content-body');
      if (mainEl) {
        const h = Math.max(mainEl.offsetHeight, mainEl.scrollHeight);
        if (h > 0) {
          setMainContentHeight(h);
        }
      }
    };

    updateDimensions();

    const mainEl = document.getElementById('main-content-body');
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mainEl) {
      ro = new ResizeObserver(() => {
        updateDimensions();
      });
      ro.observe(mainEl);
    }

    window.addEventListener('resize', updateDimensions);
    const timer = setTimeout(updateDimensions, 100);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  // Compute matched height:
  // - Matches main content height exactly down to the end of the page ("تنتهي مع انتهائها")
  // - Covers at least full viewport height below header so there are no empty gaps
  const targetSidebarHeight = useMemo(() => {
    const headerHeight = (() => {
      if (typeof document !== 'undefined') {
        const val = getComputedStyle(document.documentElement).getPropertyValue('--app-header-height');
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      return 105;
    })();

    const availViewport = Math.max(viewportHeight - headerHeight, 400);

    if (mainContentHeight > 0) {
      const matched = Math.max(mainContentHeight, availViewport);
      return `${matched}px`;
    }

    return `calc(100vh - var(--app-header-height, 105px))`;
  }, [mainContentHeight, viewportHeight]);

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

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const areAllCollapsed = useMemo(() => {
    if (navGroups.length === 0) return false;
    return navGroups.every((g) => collapsedCategories[g.category]);
  }, [navGroups, collapsedCategories]);

  const toggleAllCategories = () => {
    if (areAllCollapsed) {
      setCollapsedCategories({});
    } else {
      const all: Record<string, boolean> = {};
      navGroups.forEach((g) => {
        all[g.category] = true;
      });
      setCollapsedCategories(all);
    }
  };

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

  const renderNavContent = () => (
    <div className="flex flex-col h-full w-full select-none overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MosqueLogo size="sm" />
          <div className="truncate">
            <span className="font-bold text-xs sm:text-sm text-slate-800 block truncate">
              {activeTenant?.name || 'مجمع حلقات الغزاوي'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">القائمة الإدارية الموحدة</span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAllCategories}
          title={areAllCollapsed ? 'توسيع كافة الأقسام' : 'طي كافة الأقسام'}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md text-[10px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          <span className="text-[9px] font-bold">{areAllCollapsed ? 'توسيع' : 'طي'}</span>
        </button>
      </div>
      
      {/* Navigation Categories & Items with internal smooth scroll */}
      <div className="p-2.5 sm:p-3 space-y-3.5 flex-1 overflow-y-auto min-h-0 overscroll-contain">
        {navGroups.map((group) => {
          const isCollapsed = Boolean(collapsedCategories[group.category]);
          
          // Check if any item in this group is active
          const hasActiveItem = group.items.some((item) => {
            const itemPath = item.path || '';
            const [itemPathname, itemSearch] = itemPath.split('?');
            if (itemSearch) {
              return location.pathname === itemPathname && location.search.includes(itemSearch);
            }
            if (location.pathname === itemPathname) {
              return !location.search.includes('subtab=');
            }
            if (itemPathname !== '/' && itemPathname !== '/admin' && location.pathname.startsWith(itemPathname + '/')) {
              return true;
            }
            return false;
          });

          return (
            <div key={group.category} className="space-y-1">
              {/* Collapsible Section Header */}
              <button
                type="button"
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-black tracking-wide truncate">{group.title}</span>
                  {hasActiveItem && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600">
                  <span className="text-[9px] font-bold">{group.items.length}</span>
                  {isCollapsed ? (
                    <ChevronLeft className="w-3 h-3 transition-transform" />
                  ) : (
                    <ChevronDown className="w-3 h-3 transition-transform" />
                  )}
                </div>
              </button>
              
              {/* Category Items */}
              {!isCollapsed && (
                <div className="space-y-0.5 pt-0.5 animate-in fade-in duration-150">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const count = item.badgeKey ? computedBadges[item.badgeKey] : undefined;
                    const itemPath = item.path || '';
                    const [itemPathname, itemSearch] = itemPath.split('?');
                    const isItemActive = Boolean(itemPath) && (() => {
                      if (itemSearch) {
                        return location.pathname === itemPathname && location.search.includes(itemSearch);
                      }
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-right transition-all cursor-pointer ${
                          isItemActive
                            ? 'bg-emerald-800 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
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
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      {currentUser && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0 mt-auto">
          <div className="mb-2 px-1 text-right">
            <span className="text-[11px] font-bold text-slate-800 block truncate">{currentUser.name}</span>
            <span className="text-[10px] text-slate-400 font-medium">{currentUser.role === 'admin' || currentUser.role === 'campus_admin' ? 'مدير المجمع' : currentUser.role === 'system_admin' ? 'مدير النظام' : 'مشرف'}</span>
          </div>
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
        <aside className="lg:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
          {renderNavContent()}
        </aside>
      </>
    );
  }

  // Desktop Persistent Sidebar:
  // - Perfectly matches page/body content height (never shorter than page, never creates artificial extra length)
  // - Ends exactly where page content ends ("تنتهي مع انتهائها")
  // - Internal smooth scrollbar for navigation items whenever content or space requires it ("ويعمل شريط جانبي لو متاح")
  return (
    <aside
      className={`hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-white border-l border-slate-200 z-20 self-stretch ${className}`}
      style={{
        height: targetSidebarHeight,
        minHeight: 'calc(100vh - var(--app-header-height, 105px))',
        maxHeight: targetSidebarHeight,
      }}
    >
      {renderNavContent()}
    </aside>
  );
};
