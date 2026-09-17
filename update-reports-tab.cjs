const fs = require('fs');
let code = `import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Save, FileImage } from 'lucide-react';

export const ReportsSettingsTab: React.FC = () => {
  const { activeTenant, updateReportsConfig } = useApp();
  
  const [headerUrl, setHeaderUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [footerText, setFooterText] = useState('هذه الشهادة معتمدة من إدارة المجمع، ولا تحتاج إلى ختم حي.');

  useEffect(() => {
    if (activeTenant?.reportsConfig) {
      setHeaderUrl(activeTenant.reportsConfig.headerImageUrl || '');
      setSignatureUrl(activeTenant.reportsConfig.signatureImageUrl || '');
      if (activeTenant.reportsConfig.footerText) {
        setFooterText(activeTenant.reportsConfig.footerText);
      }
    }
  }, [activeTenant]);

  const handleSave = () => {
    updateReportsConfig({
      headerImageUrl: headerUrl,
      signatureImageUrl: signatureUrl,
      footerText: footerText
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">إعدادات التقارير والشهادات</h3>
            <p className="text-xs text-slate-500">إدارة الترويسات والتوقيعات الافتراضية</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-slate-400" />
                ترويسة التقارير الرسمية (صورة)
              </label>
              <input 
                type="url" 
                value={headerUrl}
                onChange={(e) => setHeaderUrl(e.target.value)}
                placeholder="https://example.com/header.png" 
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-slate-400" />
                توقيع مدير المجمع (صورة)
              </label>
              <input 
                type="url" 
                value={signatureUrl}
                onChange={(e) => setSignatureUrl(e.target.value)}
                placeholder="https://example.com/signature.png" 
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">نص التذييل للشهادات</label>
            <textarea 
              rows={2} 
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm flex items-center gap-2 transition"
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
fs.writeFileSync('src/components/admin/ReportsSettingsTab.tsx', code);
