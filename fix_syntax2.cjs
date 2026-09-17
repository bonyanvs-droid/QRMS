const fs = require('fs');
let file = fs.readFileSync('src/components/admin/SystemAdminPlatformDashboard.tsx', 'utf8');

const regex = /<\/p>\s*<\/div>\s*<\/div>\s*<span className=\{\`w-2\.5 h-2\.5 rounded-full \$\{isOffline \? 'bg-amber-400' : 'bg-emerald-500 animate-ping'\}\`\} \/>\s*<span className="text-slate-700 dark:text-slate-300 font-medium">\s*\{isOffline \? 'وضع عدم الاتصال \(Offline\)' : 'سحابة Firestore: متصلة ومستقرة'\}\s*<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/;

const replacement = `              </p>
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

file = file.replace(regex, replacement);
fs.writeFileSync('src/components/admin/SystemAdminPlatformDashboard.tsx', file);
