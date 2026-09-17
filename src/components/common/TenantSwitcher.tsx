import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, ChevronDown, Check, MapPin } from 'lucide-react';

export const TenantSwitcher: React.FC = () => {
  const { tenants, activeTenantId, activeTenant, setActiveTenantId, currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  // STRICT ACCESS RULE: TenantSwitcher is ONLY accessible to system_admin!
  // Any other role is strictly forbidden from switching tenants.
  if (currentUser && currentUser.role !== 'system_admin') {
    return null;
  }

  // If no user is logged in (public mode), we also hide the switcher from operational pages.
  // Only show dropdown for system_admin.
  if (!currentUser || currentUser.role !== 'system_admin') {
    return null;
  }

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200/90 border border-amber-300 text-amber-950 transition-all text-xs font-bold shadow-2xs cursor-pointer"
        title="التبديل بين المجمعات (خاص بمدير المنصة)"
      >
        <Building2 className="w-3.5 h-3.5 text-amber-800 shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-[170px]">{activeTenant?.name || ''}</span>
        <ChevronDown className="w-3 h-3 text-amber-700 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 sm:right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">إدارة مجمعات المنصة</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {tenants.length} مجمعات
              </span>
            </div>

            <div className="py-1 max-h-60 overflow-y-auto space-y-1">
              {tenants.map((tenant) => {
                const isSelected = tenant.id === activeTenantId;
                return (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => {
                      setActiveTenantId(tenant.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{tenant.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{tenant.city} • {tenant.district}</span>
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
