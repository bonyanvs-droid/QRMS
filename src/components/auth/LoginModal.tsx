import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Lock, Phone, LogIn, X, Shield } from 'lucide-react';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import { getRolePortalRoute } from '../../lib/roleRoutes';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminOnly?: boolean;
  defaultTenantId?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  adminOnly = false,
  defaultTenantId,
}) => {
  const navigate = useNavigate();
  const { login, activeTenant, tenants } = useApp();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentTenant = defaultTenantId
    ? tenants.find((t) => t.id === defaultTenantId) || activeTenant
    : activeTenant;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(phone.trim(), password);
      if (user) {
        onClose();
        // Direct route transition to authenticated role portal (Single canonical source)
        const targetRoute = getRolePortalRoute(user.role, user.tenantId);
        navigate(targetRoute, { replace: true });
      } else {
        setError('بيانات الدخول غير صحيحة، يرجى التأكد من رقم الجوال أو رقم الهوية الوطنية وكلمة المرور.');
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول، يرجى التحقق من اتصالك بالشبكة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {adminOnly ? (
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
            ) : (
              <div className="shrink-0">
                <MosqueLogo size="md" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                تسجيل الدخول
              </h3>
              <p className="text-xs text-slate-600">
                {adminOnly
                  ? 'منصة إدارة المجمعات القرآنية'
                  : currentTenant?.name || 'بوابة المجمع القرآني'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
            {error}
          </div>
        )}



        {/* Regular Login Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              معرف تسجيل الدخول (رقم الهوية الوطنية أو رقم الجوال)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 2396012458 أو 0569990593"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 ${
              adminOnly
                ? 'bg-slate-900 hover:bg-slate-800'
                : 'bg-emerald-700 hover:bg-emerald-800'
            } disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer`}
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {adminOnly
              ? 'بوابة آمنة ومخصصة لمدير النظام العام فقط'
              : 'تسجيل الدخول محمي بنظام الصلاحيات (RBAC) ومربوط بالمجمع المعين'}
          </p>
        </div>
      </div>
    </div>
  );
};
