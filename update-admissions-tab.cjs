const fs = require('fs');
let code = `import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Save } from 'lucide-react';

export const AdmissionsSettingsTab: React.FC = () => {
  const { activeTenant, updateAdmissionsConfig } = useApp();
  
  const [isOpen, setIsOpen] = useState(true);
  const [maxOpenApplications, setMaxOpenApplications] = useState(50);
  const [terms, setTerms] = useState('');

  useEffect(() => {
    if (activeTenant?.admissionsConfig) {
      setIsOpen(activeTenant.admissionsConfig.isOpen);
      setMaxOpenApplications(activeTenant.admissionsConfig.maxOpenApplications);
      setTerms(activeTenant.admissionsConfig.termsAndConditions || '');
    }
  }, [activeTenant]);

  const handleSave = () => {
    updateAdmissionsConfig({
      isOpen,
      maxOpenApplications,
      openTracks: activeTenant?.admissionsConfig?.openTracks || [],
      termsAndConditions: terms
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">إعدادات القبول والتسجيل</h3>
            <p className="text-xs text-slate-500">إدارة فترات التسجيل وشروط القبول</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة التسجيل</label>
              <select 
                value={isOpen ? 'open' : 'closed'}
                onChange={(e) => setIsOpen(e.target.value === 'open')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="open">مفتوح</option>
                <option value="closed">مغلق</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الحد الأقصى للطلبات المفتوحة</label>
              <input 
                type="number" 
                value={maxOpenApplications}
                onChange={(e) => setMaxOpenApplications(parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الشروط والأحكام الخاصة بالقبول</label>
            <textarea 
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
              rows={4}
              placeholder="اكتب الشروط والأحكام التي يجب على ولي الأمر الموافقة عليها..."
            />
          </div>
                    
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
`
fs.writeFileSync('src/components/admin/AdmissionsSettingsTab.tsx', code);
