const fs = require('fs');
const file = 'src/components/admin/PermissionsDelegationTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_PERMISSIONS.map(perm => {
                      const isInherited = baseInheritedPerms.includes(perm.id) && !userCustomPerms.includes(perm.id);
                      const isCustomGranted = userCustomPerms.includes(perm.id);
                      const isGranted = isInherited || isCustomGranted;

                      return (
                        <div key={perm.id} className={\`p-4 border rounded-xl flex items-start gap-3 transition-colors \${
                          isGranted ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'
                        }\`}>
                          <button
                            onClick={() => handleUserDelegationToggle(perm.id)}
                            disabled={isInherited || perm.isSensitive}
                            className={\`mt-1 flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors \${
                              isInherited 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-600 cursor-not-allowed'
                                : isCustomGranted 
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-300 bg-white hover:border-indigo-400'
                            }\`}
                            title={isInherited ? 'موروث من الدور الأساسي' : ''}
                          >
                            {isGranted && <Check className="w-4 h-4" />}
                          </button>
                          <div>
                            <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                              {perm.label}
                              {isInherited && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">موروث</span>
                              )}
                              {isCustomGranted && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">تفويض خاص</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{perm.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>`;

const replacement = `                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_PERMISSIONS.map(perm => {
                      const tempPerm = userTempPerms.find(t => t.id === perm.id);
                      const isInherited = baseInheritedPerms.includes(perm.id) && !userCustomPerms.includes(perm.id) && !tempPerm;
                      const isCustomGranted = userCustomPerms.includes(perm.id) || !!tempPerm;
                      const isGranted = isInherited || isCustomGranted;
                      const isExpired = tempPerm && new Date(tempPerm.expiresAt) < new Date();

                      return (
                        <div key={perm.id} className={\`p-4 border rounded-xl flex items-start gap-3 transition-colors \${
                          isGranted ? (isExpired ? 'border-amber-200 bg-amber-50/30' : 'border-indigo-200 bg-indigo-50/30') : 'border-slate-200 bg-white'
                        }\`}>
                          <button
                            onClick={() => handleOpenDelegationModal(perm.id)}
                            disabled={isInherited || perm.isSensitive}
                            className={\`mt-1 flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors \${
                              isInherited 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-600 cursor-not-allowed'
                                : isCustomGranted 
                                  ? (isExpired ? 'bg-amber-500 border-amber-500 text-white' : 'bg-indigo-600 border-indigo-600 text-white')
                                  : 'border-slate-300 bg-white hover:border-indigo-400'
                            }\`}
                            title={isInherited ? 'موروث من الدور الأساسي' : ''}
                          >
                            {isGranted && <Check className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                            <div className="font-bold text-slate-700 text-sm flex items-center flex-wrap gap-2">
                              {perm.label}
                              {isInherited && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">موروث</span>
                              )}
                              {isCustomGranted && !tempPerm && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">تفويض خاص (دائم)</span>
                              )}
                              {tempPerm && !isExpired && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">تفويض مؤقت (ينتهي: {tempPerm.expiresAt.split('T')[0]})</span>
                              )}
                              {isExpired && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">منتهي الصلاحية</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{perm.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('JSX Replaced successfully');
