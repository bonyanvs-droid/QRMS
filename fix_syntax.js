const fs = require('fs');
let file = fs.readFileSync('src/components/admin/SystemAdminPlatformDashboard.tsx', 'utf8');

// Let's replace the whole header section properly
const newHeader = `        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-white shadow-md shadow-slate-200 dark:shadow-slate-900/50">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  لوحة إدارة المنصة المركزية
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                  School Screen SaaS Admin
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                إدارة المجمعات المشتركة، الباقات، السعات الطلابية، ومراقبة البنية السحابية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2.5">
              <span className={\`w-2.5 h-2.5 rounded-full \${isOffline ? 'bg-amber-400' : 'bg-emerald-500 animate-ping'}\`} />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {isOffline ? 'وضع عدم الاتصال (Offline)' : 'سحابة Firestore: متصلة ومستقرة'}
              </span>
            </div>
          </div>
        </div>`;

// regex target: from `<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">`
// up to `        {/* High-level Platform Metrics */}`

const regex = /<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">[\s\S]*?(?=\{\/\* High-level Platform Metrics \*\/)/;
file = file.replace(regex, newHeader + '\n\n        ');
fs.writeFileSync('src/components/admin/SystemAdminPlatformDashboard.tsx', file);
