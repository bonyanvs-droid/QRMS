import React, { useState } from 'react';
import {
  MessageSquare, ShieldCheck, Globe, Key, Phone, Server,
  CheckCircle2, AlertCircle, Copy, Send, Zap, Save
} from 'lucide-react';
import { WhatsAppApiConfig } from '../../types';
import { useApp } from '../../context/AppContext';
import { DEFAULT_WHATSAPP_CONFIG, testWhatsAppApiConnection } from '../../lib/whatsappCloudApi';

export const WhatsAppSettingsTab: React.FC = () => {
  const { activeTenant, updateWhatsAppConfig } = useApp();
  const [config, setConfig] = useState<WhatsAppApiConfig>(activeTenant?.whatsappConfig || DEFAULT_WHATSAPP_CONFIG);

  React.useEffect(() => {
    if (activeTenant) {
      setConfig(activeTenant?.whatsappConfig || DEFAULT_WHATSAPP_CONFIG);
    }
  }, [activeTenant]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWhatsAppConfig(config);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const copyToClipboard = (text: string, field: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testWhatsAppApiConnection(config);
    setTestResult(result);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">ربط وإعدادات WhatsApp Cloud API</h3>
            <p className="text-xs text-slate-500">تهيئة إرسال الرسائل الرسمية لأولياء الأمور والمستفيدين</p>
          </div>
        </div>

        {savedToast && (
          <div className="mb-4 bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-200 flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5" />
            <span>تم حفظ إعدادات الواتساب بنجاح! النظام جاهز الآن للربط.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم المعتمد للإرسال (Phone Number ID)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">معرف حساب الأعمال (WABA Account ID)</label>
                <div className="relative">
                  <Server className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={config.businessAccountId}
                    onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                    className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز الوصول الدائم (System User Permanent Access Token)</label>
              <textarea
                rows={2}
                value={config.permanentAccessToken}
                onChange={(e) => setConfig({ ...config, permanentAccessToken: e.target.value })}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز التحقق للويبهوك (Webhook Verify Token)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.webhookVerifyToken}
                    onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.webhookVerifyToken, 'token')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedField === 'token' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نطاق القوالب المعتمدة (Template Namespace)</label>
                <input
                  type="text"
                  value={config.templateNamespace || ''}
                  onChange={(e) => setConfig({ ...config, templateNamespace: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-700" />
                <span className="font-bold text-sm text-teal-950">فحص الجاهزية والاتصال الحي:</span>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{isTesting ? 'جارٍ الفحص...' : 'اختبار الاتصال بـ Meta'}</span>
              </button>
            </div>
            {testResult && (
              <div className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${
                testResult.success ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition">
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
