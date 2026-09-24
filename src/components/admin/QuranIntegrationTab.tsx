import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Server,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Lock,
  Zap,
  Layers,
  ArrowRightLeft,
  FileCheck,
  Check,
} from 'lucide-react';
import { QuranProviderConfig, ConnectionTestResult } from '../../quran/types/config';

export const QuranIntegrationTab: React.FC = () => {
  const {
    integrationConfig,
    availableMushafProfiles,
    updateIntegrationProviderConfig,
    setPrimaryQuranProvider,
    setActiveMushafProfile,
    testQuranProviderConnection,
    currentUser,
    currentRole,
    auditLogs,
  } = useApp();

  const isAdmin = currentRole === 'admin' || currentRole === 'supervisor';

  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    integrationConfig.primaryProviderId || 'bundled'
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Editable form state for the selected provider
  const currentProvider = integrationConfig.providers[selectedProviderId];
  const [formState, setFormState] = useState<Partial<QuranProviderConfig>>({
    timeoutMs: currentProvider?.timeoutMs || 8000,
    retryPolicy: {
      maxRetries: currentProvider?.retryPolicy?.maxRetries ?? 2,
      backoffMs: currentProvider?.retryPolicy?.backoffMs ?? 1000,
    },
    cachePolicy: {
      ttlMs: currentProvider?.cachePolicy?.ttlMs ?? 86400000,
      persistOffline: currentProvider?.cachePolicy?.persistOffline ?? true,
    },
    syncSettings: {
      autoSync: currentProvider?.syncSettings?.autoSync ?? false,
      intervalHours: currentProvider?.syncSettings?.intervalHours ?? 168,
    },
    fallbackProviderId: currentProvider?.fallbackProviderId || 'bundled',
  });

  // Keep form state in sync when selected provider changes
  React.useEffect(() => {
    if (currentProvider) {
      setFormState({
        timeoutMs: currentProvider.timeoutMs,
        retryPolicy: { ...currentProvider.retryPolicy },
        cachePolicy: { ...currentProvider.cachePolicy },
        syncSettings: { ...currentProvider.syncSettings },
        fallbackProviderId: currentProvider.fallbackProviderId || 'bundled',
      });
    }
  }, [selectedProviderId, currentProvider]);

  // Test connection
  const handleTestConnection = async (providerId: string) => {
    setTestingProviderId(providerId);
    setSaveErrorMsg(null);
    try {
      const res = await testQuranProviderConnection(providerId);
      setTestResults((prev) => ({ ...prev, [providerId]: res }));
    } catch (err: any) {
      setSaveErrorMsg(`فشل اختبار الاتصال: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setTestingProviderId(null);
    }
  };

  // Change primary provider
  const handleSetPrimary = async (providerId: string) => {
    if (!isAdmin) return;
    try {
      await setPrimaryQuranProvider(
        providerId,
        `تعديل المزود الأساسي للقرآن الكريم إلى ${integrationConfig.providers[providerId]?.name || providerId}`
      );
      setSaveSuccessMsg(`تم اعتماد المزود الأساسي بنجاح: ${integrationConfig.providers[providerId]?.name || providerId}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(`تعذر تغيير المزود الأساسي: ${err.message}`);
    }
  };

  // Change Mushaf profile
  const handleSetMushaf = async (mushafId: string) => {
    if (!isAdmin) return;
    try {
      await setActiveMushafProfile(
        mushafId,
        `تعديل مصحف النظام المعتمد إلى ${mushafId}`
      );
      setSaveSuccessMsg('تم تحديث قالب المصحف الشريف المعتمد في النظام.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(`تعذر تحديث قالب المصحف: ${err.message}`);
    }
  };

  // Save provider config fine-tuning
  const handleSaveProviderConfig = async () => {
    if (!isAdmin) return;
    try {
      await updateIntegrationProviderConfig(
        selectedProviderId,
        formState,
        `تحديث إعدادات مزود القرآن الكريم (${selectedProviderId}) من لوحة الإدارة`
      );
      setSaveSuccessMsg(`تم حفظ إعدادات المزود (${currentProvider?.name}) بنجاح.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(`تعذر حفظ الإعدادات: ${err.message}`);
    }
  };

  // Filter integration-related audit logs
  const integrationLogs = (auditLogs || []).filter(
    (log) =>
      log.action.includes('QURAN') ||
      log.action.includes('INTEGRATION') ||
      log.action.includes('MUSHAF') ||
      log.targetId?.includes('quran')
  ).slice(0, 8);

  const activeMushaf = availableMushafProfiles.find(
    (m) => m.id === (integrationConfig.activeMushafProfileId || 'madani_15_lines')
  ) || availableMushafProfiles[0];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner & Security Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
              <Server className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                إدارة تكاملات القرآن الكريم ومصادر المصحف الشريف
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تكوين مزودات البيانات، الاحتياط التلقائي (Fallback)، وضبط قوالب المصاحف المعتمدة.
              </p>
            </div>
          </div>
        </div>

        {/* Environment & Security Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            البيئة: {integrationConfig.environment || 'production'}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            المفاتيح محمية في السيرفر
          </span>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-bold flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Core Principle Notice: Historical Immutability */}
      <div className="p-5 rounded-3xl bg-linear-to-l from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shrink-0 mt-0.5">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-emerald-950">
              ضمانة حرمة السجل التاريخي (Historical Immutability Guarantee)
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              تغيير مزود البيانات أو قالب المصحف لا يمس إطلاقًا <strong>الأهداف الأصلية (Original Target)</strong> أو <strong>السجلات اليومية التاريخية المعتمدة (Historical Records)</strong> للطلاب. يقتصر التأثير حصريًا على حساب الخطط المستقبلية غير المنجزة أو التحقق من نصوص الآيات الجديدة.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Primary Provider & Active Mushaf Profile Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Provider Selector Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-900 text-base">المزود الأساسي المعتمد (Primary Provider)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              ID: {integrationConfig.primaryProviderId}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            اختر مصدر البيانات الرئيسي الذي يعتمد عليه النظام لجلب بيانات السور والآيات وحساب الخطط.
          </p>

          <div className="space-y-2.5">
            {Object.values(integrationConfig.providers).map((prov) => {
              const isPrimary = prov.id === integrationConfig.primaryProviderId;
              const testRes = testResults[prov.id];

              return (
                <div
                  key={prov.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPrimary
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{prov.name}</span>
                        {isPrimary && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black">
                            المعتمد حالياً
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          prov.connectionStatus === 'connected'
                            ? 'bg-emerald-100 text-emerald-800'
                            : prov.connectionStatus === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {prov.connectionStatus === 'connected' ? 'متصل' : prov.connectionStatus === 'failed' ? 'فشل' : 'غير مجرب'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                        <span>نوع: {prov.provider}</span>
                        <span>•</span>
                        <span>الرابط: {prov.baseUrl}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTestConnection(prov.id)}
                        disabled={testingProviderId === prov.id}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="اختبار الاتصال المباشر"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingProviderId === prov.id ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>{testingProviderId === prov.id ? 'جارٍ الفحص...' : 'فحص الاتصال'}</span>
                      </button>

                      {!isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(prov.id)}
                          disabled={!isAdmin}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تعيين كأساسي</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Test Result Display if available */}
                  {testRes && (
                    <div className={`mt-3 p-3 rounded-xl text-xs border ${
                      testRes.success
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                        : 'bg-red-100/70 border-red-300 text-red-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          {testRes.success ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <XCircle className="w-4 h-4 text-red-700" />}
                          {testRes.message}
                        </span>
                        <span className="font-mono text-[11px] font-bold">
                          زمن الاستجابة: {testRes.latencyMs}ms
                        </span>
                      </div>
                      {testRes.sampleAyahFetched && (
                        <div className="mt-1.5 text-[11px] p-2 bg-white/80 rounded-lg text-slate-800 font-serif border border-emerald-200/50">
                          عينة مسترجعة: &ldquo;{testRes.sampleAyahFetched}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mushaf Profile Selection Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-900 text-base">قالب المصحف الشريف المعتمد (Mushaf Profile)</h3>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
              {activeMushaf?.nameArabic || 'مصحف المدينة'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            يحدد تقسيم الصفحات وعدد الأسطر وترقيم الأرباع والأجزاء في شاشات الحفظ ومتابعة التقدم.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableMushafProfiles.map((mushaf) => {
                const isSelected = mushaf.id === (integrationConfig.activeMushafProfileId || 'madani_15_lines');

                return (
                  <div
                    key={mushaf.id}
                    onClick={() => handleSetMushaf(mushaf.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{mushaf.nameArabic}</div>
                        <div className="text-[11px] text-slate-500">{mushaf.descriptionArabic}</div>
                      </div>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-emerald-600 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                      <span>{mushaf.linesPerPage} أسطر/صفحة</span>
                      <span>{mushaf.totalPages} صفحة</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Profile Inspector */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>تفاصيل المصحف المعتمد:</span>
                <span className="font-mono text-emerald-700">{activeMushaf?.id}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">عدد الصفحات</span>
                  <span className="font-bold text-sm text-slate-800">{activeMushaf?.totalPages}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">الأسطر / صفحة</span>
                  <span className="font-bold text-sm text-slate-800">{activeMushaf?.linesPerPage}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">بداية الجزء 30</span>
                  <span className="font-bold text-sm text-slate-800">ص {activeMushaf?.juzToPageMap?.[30] || 582}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">نوع الرسم</span>
                  <span className="font-bold text-sm text-slate-800">{activeMushaf?.orthography || 'عثماني'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Fine-Tuning & Advanced Provider Settings */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-black text-slate-900 text-base">
                الضبط المتقدم وسياسات الاستجابة والاحتياط (Provider Policies)
              </h3>
              <p className="text-xs text-slate-500">
                تكوين مهلة الاتصال (Timeout)، سياسة إعادة المحاولة (Retry)، التخزين المؤقت، ومزود الاحتياط (Fallback).
              </p>
            </div>
          </div>

          {/* Provider selector tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
            {Object.values(integrationConfig.providers).map((prov) => (
              <button
                key={prov.id}
                onClick={() => setSelectedProviderId(prov.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedProviderId === prov.id
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prov.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Timeout */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>مهلة الاتصال (Timeout) بالمللي ثانية:</span>
            </label>
            <input
              type="number"
              min="1000"
              max="30000"
              step="500"
              disabled={!isAdmin || currentProvider?.provider === 'bundled'}
              value={formState.timeoutMs || 0}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, timeoutMs: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold disabled:bg-slate-100"
            />
            <span className="text-[10px] text-slate-500 block">
              {currentProvider?.provider === 'bundled'
                ? 'المزود المدمج محلي ولا يحتاج مهلة شبكية (0ms)'
                : 'المهلة القصوى قبل تفعيل مزود الاحتياط (Fallback)'}
            </span>
          </div>

          {/* Fallback Provider */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
              <span>مزود الاحتياط عند التعثر (Fallback Provider):</span>
            </label>
            <select
              disabled={!isAdmin || currentProvider?.provider === 'bundled'}
              value={formState.fallbackProviderId || 'bundled'}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, fallbackProviderId: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold disabled:bg-slate-100"
            >
              {Object.values(integrationConfig.providers)
                .filter((p) => p.id !== selectedProviderId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              <option value="bundled">المصدر المحلي المدمج (Default Bundled)</option>
            </select>
            <span className="text-[10px] text-slate-500 block">
              يتم الرجوع إليه تلقائيًا في حال انقطاع الشبكة أو فشل المزود الرئيسي.
            </span>
          </div>

          {/* Retry Policy */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>أقصى عدد لإعادة المحاولة (Max Retries):</span>
            </label>
            <input
              type="number"
              min="0"
              max="5"
              disabled={!isAdmin || currentProvider?.provider === 'bundled'}
              value={formState.retryPolicy?.maxRetries ?? 2}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  retryPolicy: {
                    maxRetries: Number(e.target.value),
                    backoffMs: prev.retryPolicy?.backoffMs || 1000,
                  },
                }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold disabled:bg-slate-100"
            />
            <span className="text-[10px] text-slate-500 block">
              عدد المحاولات السريعة قبل إعلان تعذر الاتصال والتبديل إلى الاحتياط.
            </span>
          </div>

          {/* Cache Policy */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>التخزين المؤقت دون اتصال (Offline Persistence):</span>
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={formState.cachePolicy?.persistOffline ?? true}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      cachePolicy: {
                        ttlMs: prev.cachePolicy?.ttlMs || 86400000,
                        persistOffline: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700">تفعيل التخزين المحلي الدائم</span>
              </label>
            </div>
            <span className="text-[10px] text-slate-500 block">
              يضمن استمرار عمل التطبيق بكفاءة 100% حتى في حال انقطاع الإنترنت الكامل.
            </span>
          </div>

          {/* Sync Settings */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-slate-500" />
              <span>المزامنة التلقائية (Auto-Sync):</span>
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isAdmin || currentProvider?.provider === 'bundled'}
                  checked={formState.syncSettings?.autoSync ?? false}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      syncSettings: {
                        autoSync: e.target.checked,
                        intervalHours: prev.syncSettings?.intervalHours || 168,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-700">تحديث دوري للخلفية</span>
              </label>
            </div>
            <span className="text-[10px] text-slate-500 block">
              تحديث بيانات السور والترجمات كل {formState.syncSettings?.intervalHours || 168} ساعة.
            </span>
          </div>
        </div>

        {/* Save button with admin authorization */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-slate-500">
            {isAdmin ? (
              <span>يتم تسجيل جميع التغييرات في سجل التدقيق المؤسسي (Audit Log) تلقائيًا.</span>
            ) : (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                تعديل إعدادات التكامل محصور على مدراء النظام والمشرفين فقط.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTestConnection(selectedProviderId)}
              disabled={testingProviderId === selectedProviderId}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingProviderId === selectedProviderId ? 'animate-spin' : ''}`} />
              <span>اختبار المزود المختار</span>
            </button>

            <button
              onClick={handleSaveProviderConfig}
              disabled={!isAdmin}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>حفظ الإعدادات المحدثة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Integration Audit Trail (Recent Activity) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-900 text-base">
              سجل تدقيق تكاملات القرآن الكريم (Integration Audit Trail)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            آخر {integrationLogs.length} عمليات مسجلة
          </span>
        </div>

        {integrationLogs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
            لا توجد تعديلات سابقة مسجلة على إعدادات التكامل حتى الآن.
          </div>
        ) : (
          <div className="space-y-2">
            {integrationLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-[10px]">
                      {log.performedByRole || 'admin'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{log.notes || 'تعديل تكوين النظام'}</p>
                </div>
                <div className="text-[10px] text-slate-400 font-mono self-end sm:self-auto">
                  {new Date(log.timestamp).toLocaleString('ar-SA')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
