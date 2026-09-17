import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EmergencySupportSession } from '../../types';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Play,
  StopCircle,
  History,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const EmergencySupportTab: React.FC = () => {
  const {
    activeTenantId,
    activeTenant,
    currentUser,
    activeSupportSession,
    startSupportSession,
    endSupportSession,
    tenants,
  } = useApp();

  const [supportSessionsHistory, setSupportSessionsHistory] = useState<EmergencySupportSession[]>(() => {
    const saved = localStorage.getItem('al_ghazzawi_support_sessions_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(activeTenantId || 'ghazzawi');
  const [reason, setReason] = useState('استكشاف مشكلة فنية في مزامنة سجلات الطلاب بناءً على طلب إدارة المجمع');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Keep history updated with activeSupportSession
  useEffect(() => {
    if (activeSupportSession) {
      setSupportSessionsHistory((prev) => {
        const filtered = prev.filter((s) => s.id !== activeSupportSession.id);
        const updated = [activeSupportSession, ...filtered];
        localStorage.setItem('al_ghazzawi_support_sessions_v1', JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeSupportSession]);

  const supportSessions = useMemo(() => {
    if (!activeSupportSession) return supportSessionsHistory;
    const exists = supportSessionsHistory.some((s) => s.id === activeSupportSession.id);
    return exists ? supportSessionsHistory : [activeSupportSession, ...supportSessionsHistory];
  }, [activeSupportSession, supportSessionsHistory]);

  // Countdown timer for active session
  useEffect(() => {
    if (!activeSupportSession) {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(activeSupportSession.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('منتهية الصلاحية');
        endSupportSession();
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSupportSession, endSupportSession]);

  const handleStartSession = async () => {
    if (!reason.trim()) return;
    await startSupportSession(selectedTenantId, reason, Math.ceil(durationMinutes / 60));
    setIsNewSessionModalOpen(false);
  };

  const handleTerminateSession = async () => {
    if (!activeSupportSession) return;
    setSupportSessionsHistory((prev) =>
      prev.map((s) => (s.id === activeSupportSession.id ? { ...s, isActive: false } : s))
    );
    await endSupportSession();
  };

  return (
    <div className="space-y-6">
      {/* Privacy & Isolation Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-600/60 text-indigo-100 text-xs px-3 py-1 rounded-full font-bold border border-indigo-400/40 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>بروتوكول حماية خصوصية الطلاب (PII Guard)</span>
              </span>
              <span className="text-amber-300 text-xs font-semibold">
                {activeTenant?.name || ''}
              </span>
            </div>
            <h2 className="text-2xl font-black">جلسات الدعم الفني والرقابة الأمنية</h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              تطبيق مبدأ الحد الأدنى من الصلاحيات (Least Privilege). يُمنع مدير النظام من الاطلاع على البيانات الشخصية للطلاب (أرقام الهواتف، الملاحظات الأسرية) إلا عبر جلسة دعم طارئة خاضعة للرقابة وسجل تدقيق غير قابل للتعديل.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shrink-0 text-center sm:text-right">
            <div className="text-xs text-indigo-200 font-bold mb-1">حالة العزل اللحظية:</div>
            {activeSupportSession ? (
              <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>جلسة دعم نشطة ({timeLeft})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>العزل التشغيلي مفعل بالكامل (محمي)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Session Warning Card */}
      {activeSupportSession && (
        <div className="bg-amber-50 border-2 border-amber-400 p-6 rounded-3xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-200 text-amber-900 rounded-2xl">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-black text-amber-950">
                  جلسة دعم فني نشطة حالياً تحت المعاينة
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  السبب المعلن: <span className="font-bold">{activeSupportSession.reason}</span>
                </p>
                <div className="text-xs text-amber-700 mt-1 flex items-center gap-2">
                  <span>المسؤول: {activeSupportSession.systemAdminName}</span>
                  <span>•</span>
                  <span>الرمز المرجعي: {activeSupportSession.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center px-4 py-2 bg-white rounded-xl border border-amber-300">
                <div className="text-xs text-slate-500">الوقت المتبقي</div>
                <div className="text-lg font-black text-amber-900 font-mono" dir="ltr">{timeLeft}</div>
              </div>
              <button
                onClick={handleTerminateSession}
                className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>إنهاء الجلسة فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initiation Control Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">بدء جلسة دعم فني طارئة</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يتطلب فتح الجلسة تبريراً تشغيلياً ملزماً يُسجل فورياً في سجل الرقابة والتدقيق غير القابل للتعديل
            </p>
          </div>

          {!activeSupportSession && (
            <button
              onClick={() => setIsNewSessionModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>بدء جلسة دعم فني جديدة</span>
            </button>
          )}
        </div>

        {/* Support Sessions Audit History */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-slate-500" />
            <h4 className="font-bold text-slate-800 text-xs md:text-sm">سجل جلسات الدعم الفني السابقة</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                  <th className="py-2.5 px-3 rounded-r-xl">رقم الجلسة</th>
                  <th className="py-2.5 px-3">المهندس / المسؤول</th>
                  <th className="py-2.5 px-3">المجمع المستهدف</th>
                  <th className="py-2.5 px-3">السبب المعلن</th>
                  <th className="py-2.5 px-3">تاريخ الإنشاء</th>
                  <th className="py-2.5 px-3 rounded-l-xl">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supportSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      لا توجد جلسات دعم فني سابقة مسجلة
                    </td>
                  </tr>
                ) : (
                  supportSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {session.id.slice(0, 12)}...
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {session.systemAdminName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {tenants.find((t) => t.id === session.tenantId)?.name || session.tenantId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={session.reason}>
                        {session.reason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(session.createdAt).toLocaleString('ar-SA')}
                      </td>
                      <td className="py-2.5 px-3">
                        {session.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>نشطة حالياً</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            <XCircle className="w-3 h-3" />
                            <span>مكتملة / مغلقة</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Start Session Modal */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">بدء جلسة دعم فني طارئة</h3>
                  <p className="text-xs text-slate-500">نظام التدقيق والرقابة SaaS</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المجمع المستهدف</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السبب التشغيلي المعتمد <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="بيان سبب الوصول إلى البيانات واستكشاف الخلل الفني..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مدة الجلسة القصوى</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value={15}>15 دقيقة (استكشاف سريع)</option>
                  <option value={30}>30 دقيقة (فحص ومزامنة)</option>
                  <option value={60}>60 دقيقة (جلسة كاملة)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                تنبيه: سيتم إدراج هذه الجلسة فوريًا في سجل تدقيق العمليات (Audit Trail) المرئي لإدارة المجمع، وستنتهي الصلاحية تلقائيًا بانقضاء المدة.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
              >
                تأكيد وبدء الجلسة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
