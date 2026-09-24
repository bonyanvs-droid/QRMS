import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Globe,
  Key,
  Phone,
  Server,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Send,
  Zap,
} from 'lucide-react';
import { WhatsAppApiConfig } from '../../types';
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppApiConnection,
} from '../../lib/whatsappCloudApi';

interface WhatsAppApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppApiSettingsModal: React.FC<WhatsAppApiSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<WhatsAppApiConfig>(getWhatsAppConfig());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getWhatsAppConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsAppConfig(config);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testWhatsAppApiConnection(config);
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        message: 'حدث خطأ غير متوقع أثناء فحص الاتصال.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-teal-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">بنية وتكامل WhatsApp Business Cloud API</h3>
                <span className="text-[11px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  جاهزية P2
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                إدارة وسائط الإرسال لأولياء الأمور (الروابط المباشرة المجانية أو الربط السحابي الرسمي)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Toast */}
        {savedToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تم حفظ إعدادات الواتساب بنجاح وتطبيقها في كامل المنصة!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Dispatch Mode Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-black text-slate-900 mb-2">
              طريقة إرسال رسائل الواتساب لأولياء الأمور:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: Direct Web Link */}
              <div
                onClick={() => setConfig({ ...config, isEnabled: false })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  !config.isEnabled
                    ? 'bg-white border-emerald-600 shadow-xs'
                    : 'bg-white/50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>الروابط المباشرة الفورية (wa.me)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    مفعّل حالياً
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يفتح محادثة واتساب الرسمية مباشرة في جهاز المعلم دون أي حاجة لرمز API أو رسوم Meta. جاهز للعمل 100%.
                </p>
              </div>

              {/* Option 2: Meta Cloud API */}
              <div
                onClick={() => setConfig({ ...config, isEnabled: true })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  config.isEnabled
                    ? 'bg-white border-teal-600 shadow-xs'
                    : 'bg-white/50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                    <Server className="w-4 h-4 text-teal-600" />
                    <span>Meta Cloud API المؤسسي</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    بنية مهيأة
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  إرسال تلقائي في الخلفية بدون تدخل المعلم عبر حساب Meta for Developers وباقة القوالب المعتمدة.
                </p>
              </div>
            </div>
          </div>

          {/* Cloud API Credentials Fields */}
          <div
            className={`space-y-4 transition-opacity ${
              config.isEnabled ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-600" />
                <span>بيانات الاعتماد السحابية (Meta Business Platform)</span>
              </h4>
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
              >
                <span>دليل Meta للمطورين</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  معرف رقم الهاتف (Phone Number ID):
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    placeholder="مثال: 109876543210987"
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  معرف حساب الأعمال (WABA Account ID):
                </label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={config.businessAccountId}
                    onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                    placeholder="مثال: 987654321098765"
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                رمز الوصول الدائم (System User Permanent Access Token):
              </label>
              <textarea
                rows={2}
                value={config.permanentAccessToken}
                onChange={(e) => setConfig({ ...config, permanentAccessToken: e.target.value })}
                placeholder="EAAGm0PX4ZC... (يبدأ بـ EAA)"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رمز التحقق للويبهوك (Webhook Verify Token):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.webhookVerifyToken}
                    onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.webhookVerifyToken, 'token')}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedField === 'token' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  نطاق القوالب المعتمدة (Template Namespace):
                </label>
                <input
                  type="text"
                  value={config.templateNamespace || ''}
                  onChange={(e) => setConfig({ ...config, templateNamespace: e.target.value })}
                  placeholder="baraem_complex_v1"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Test Connection Box */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-700" />
                <span className="font-bold text-xs text-teal-950">فحص الجاهزية والاتصال الحي:</span>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{isTesting ? 'جارٍ الفحص...' : 'اختبار الاتصال بـ Meta'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                    : 'bg-rose-100/70 text-rose-900 border-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Meta Pre-Approved Message Templates List */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>قوالب الرسائل المهيأة مسبقاً في النظام:</span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900">student_badge_celebration</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    إرسال بطاقة تهنئة فورية لولي الأمر عند نيل الطالب وسام الهجاء أو الحفظ
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  مهيأ
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900">remedial_intervention_guidance</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    توجيهات مساندة هادئة ومقترحات تعزيز منزلية عند رصد تعثر في الهجاء
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  مهيأ
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-900">daily_attendance_alert</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    إشعار فوري لولي الأمر في حال الغياب غير المبرر للحفاظ على سلامة ومتابعة الطالب
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  مهيأ
                </span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              حفظ الإعدادات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
