import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ShieldAlert, CheckCircle, X, Loader2 } from 'lucide-react';

export const PasswordChangeModal: React.FC = () => {
  const { currentUser, changePassword, showPasswordChangeModal, setShowPasswordChangeModal } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showPasswordChangeModal || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تتكون من 6 خانات على الأقل.');
      return;
    }

    if (newPassword === '123456') {
      setError('لا يمكن استخدام كلمة المرور الافتراضية الأولية (123456)، يرجى اختيار كلمة مرور آمنة جديدة.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين، يرجى التأكد من التطابق.');
      return;
    }

    setIsSubmitting(true);
    try {
      const changed = await changePassword(newPassword);
      if (changed) {
        setSuccess(true);
        setTimeout(() => {
          setShowPasswordChangeModal(false);
          setSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {currentUser.mustChangePassword ? 'تغيير كلمة المرور الأولية (إلزامي)' : 'تحديث كلمة المرور'}
              </h3>
              <p className="text-xs text-slate-700">المستخدم: {currentUser.name}</p>
            </div>
          </div>
          {!currentUser.mustChangePassword && (
            <button
              onClick={() => {
                setShowPasswordChangeModal(false);
                setError('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-700 mt-3 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
          {currentUser.mustChangePassword
            ? 'لدواعي الأمان وسلامة بيانات الطلاب، يلزم تغيير كلمة المرور الافتراضية لأول تسجيل دخول لحسابك.'
            : 'اختر كلمة مرور قوية لتأمين حسابك وصلاحياتك في المنصة.'}
        </p>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <span className="font-bold text-sm">تم تحديث كلمة المرور بنجاح!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية جديدة"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>جاري تحديث كلمة المرور...</span>
                </>
              ) : (
                <span>حفظ كلمة المرور ومتابعة الدخول</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
