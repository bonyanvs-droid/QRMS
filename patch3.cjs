const fs = require('fs');
const file = 'src/components/admin/PermissionsDelegationTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      </div>

      {/* Success Toast */}`;

const replacement = `      </div>
      
      {/* Delegation Modal */}
      {delegationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                {delegationModal.type === 'grant' ? 'منح تفويض للمستخدم' : 'تعديل التفويض'}
              </h3>
              <button
                onClick={() => setDelegationModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">نوع التفويض</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delegationType"
                      checked={!delegationExpiryDate}
                      onChange={() => setDelegationExpiryDate('')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-800">تفويض دائم</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delegationType"
                      checked={!!delegationExpiryDate}
                      onChange={() => setDelegationExpiryDate(new Date(Date.now() + 86400000).toISOString().split('T')[0])}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-800">تفويض مؤقت</span>
                  </label>
                </div>
              </div>
              
              {!!delegationExpiryDate && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-slate-700">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={delegationExpiryDate}
                    onChange={(e) => setDelegationExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                  <p className="text-xs text-slate-500">ينتهي التفويض بنهاية اليوم المحدد</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              {delegationModal.type === 'edit' && (
                <button
                  type="button"
                  onClick={() => handleRemoveDelegation(delegationModal.permId)}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors ml-auto"
                >
                  إلغاء التفويض
                </button>
              )}
              <button
                type="button"
                onClick={() => setDelegationModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleSaveDelegation}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                حفظ التفويض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Modal Replaced successfully');
