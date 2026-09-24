import React, { useState } from 'react';
import {
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sliders,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { MosqueComplexTenant, PrayerReference, TenantPrayerConfig } from '../../types';
import {
  formatTime12Hour,
  getPrayerTimesForDateSync,
  PRAYER_NAMES_AR,
  syncAndSavePrayerTimes,
} from '../../utils/prayerTimesService';

interface MosquePrayerSettingsCardProps {
  tenant: MosqueComplexTenant;
  onSaveConfig: (updatedConfig: TenantPrayerConfig) => Promise<void>;
}

export const MosquePrayerSettingsCard: React.FC<MosquePrayerSettingsCardProps> = ({
  tenant,
  onSaveConfig,
}) => {
  const currentYear = new Date().getFullYear();
  const prayerConfig = tenant.prayerConfig || {
    calculationMethod: 4, // 4 = Umm Al-Qura
    showOnPublicPage: true,
  };

  const [method, setMethod] = useState<number>(prayerConfig.calculationMethod || 4);
  const [showOnPublicPage, setShowOnPublicPage] = useState<boolean>(
    prayerConfig.showOnPublicPage !== false
  );
  const [adjustments, setAdjustments] = useState<Record<PrayerReference, number>>({
    fajr: prayerConfig.adjustments?.fajr || 0,
    sunrise: prayerConfig.adjustments?.sunrise || 0,
    dhuhr: prayerConfig.adjustments?.dhuhr || 0,
    asr: prayerConfig.adjustments?.asr || 0,
    maghrib: prayerConfig.adjustments?.maghrib || 0,
    isha: prayerConfig.adjustments?.isha || 0,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Today's preview with current adjustments
  const previewTimes = getPrayerTimesForDateSync({
    ...tenant,
    prayerConfig: {
      ...prayerConfig,
      calculationMethod: method,
      adjustments,
    },
  });

  const handleSyncFromAladhan = async () => {
    setIsSyncing(true);
    setSyncStatus(null);

    const tempTenant: MosqueComplexTenant = {
      ...tenant,
      prayerConfig: {
        ...prayerConfig,
        calculationMethod: method,
        adjustments,
      },
    };

    const res = await syncAndSavePrayerTimes(tempTenant, currentYear);
    setIsSyncing(false);

    if (res.success) {
      setSyncStatus({
        type: 'success',
        message: `تم جلب وتخزين مواقيت ${res.totalDays} يوماً لعام ${currentYear} في قاعدة بيانات المجمع بنجاح!`,
      });
      // Save last synced timestamp
      await onSaveConfig({
        ...prayerConfig,
        calculationMethod: method,
        showOnPublicPage,
        adjustments,
        lastSyncedAt: new Date().toISOString(),
        source: 'aladhan',
      });
    } else {
      setSyncStatus({
        type: 'error',
        message: res.error || 'تعذر الاتصال بخدمة المواقيت. تم اعتماد الحساب الفلكي المحلي تلقائياً.',
      });
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveConfig({
        ...prayerConfig,
        calculationMethod: method,
        showOnPublicPage,
        adjustments,
        lastSyncedAt: prayerConfig.lastSyncedAt,
        source: prayerConfig.source || 'aladhan',
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      setIsSaving(false);
      alert('حدث خطأ أثناء حفظ إعدادات المواقيت: ' + e.message);
    }
  };

  const prayers: PrayerReference[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              منظومة مواقيت الصلاة والتوقيت الذكي للمجمع
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مصدر مواقيت الصلاة المعتمد لربط مواعيد الحلقات ونوافذ الحضور وعرض المواقيت في صفحة المجمع
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <button
          type="button"
          onClick={handleSyncFromAladhan}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'جاري المزامنة...' : `مزامنة مواقيت عام ${currentYear}`}</span>
        </button>
      </div>

      {/* Sync Status Feedback */}
      {syncStatus && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            syncStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {syncStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{syncStatus.message}</span>
        </div>
      )}

      {/* Today's Calculated Prayer Times Preview */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-black text-slate-800">
              معاينة مواقيت اليوم في المجمع:
            </span>
            {previewTimes.hijriDate && (
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {previewTimes.hijriDate}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            الإحداثيات: {tenant.city} ({tenant.attendanceConfig?.latitude || '21.56'}°N, {tenant.attendanceConfig?.longitude || '39.14'}°E)
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {prayers.map((pkey) => {
            const rawTime = previewTimes[pkey];
            const formatted = formatTime12Hour(rawTime);
            return (
              <div
                key={pkey}
                className="bg-white rounded-xl p-2.5 border border-slate-200 text-center space-y-0.5 shadow-2xs"
              >
                <div className="text-[11px] font-bold text-slate-600">
                  {PRAYER_NAMES_AR[pkey]}
                </div>
                <div className="text-xs font-black font-mono text-emerald-900">
                  {formatted}
                </div>
                {adjustments[pkey] !== 0 && (
                  <div className="text-[9px] font-bold text-amber-700">
                    {adjustments[pkey] > 0 ? `+${adjustments[pkey]}` : adjustments[pkey]} د
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Calculation Method & Public Toggle */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              طريقة الحساب والتقويم المعتمد
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(parseInt(e.target.value, 10))}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              <option value={4}>جامعة أم القرى - مكة المكرمة (الافتراضي بالمملكة)</option>
              <option value={3}>رابطة العالم الإسلامي (Muslim World League)</option>
              <option value={5}>الهيئة العامة المصرية للمساحة</option>
              <option value={1}>جامعة العلوم الإسلامية بكراتشي</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              يتم الحساب التلقائي وفق إحداثيات موقع المجمع الجغرافي المحدد في النظام.
            </p>
          </div>

          {/* Toggle for Public Landing Page */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
            <input
              type="checkbox"
              id="showPrayerOnPublic"
              checked={showOnPublicPage}
              onChange={(e) => setShowOnPublicPage(e.target.checked)}
              className="rounded text-emerald-600 w-4 h-4 mt-0.5 cursor-pointer"
            />
            <label htmlFor="showPrayerOnPublic" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-slate-900 block">
                عرض بطاقة مواقيت الصلاة في صفحة الهبوط العامة للمجمع
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                عند إيقاف هذا الخيار، سيتم إخفاء البطاقة من الصفحة العامة فقط، وستظل مواقيت الصلاة تعمل داخلياً لحساب مواعيد الحلقات والحضور بدقة.
              </span>
            </label>
          </div>

          {prayerConfig.lastSyncedAt && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                آخر مزامنة لقاعدة البيانات:{' '}
                {new Date(prayerConfig.lastSyncedAt).toLocaleString('ar-SA')}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Minute Adjustments */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800">
              التصحيح الدقيق لمواقيت الصلاة (بالدقائق ±):
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            يمكنك تقديم أو تأخير أي صلاة بدقائق محددة لمطابقة أذان المسجد المحلي تماماً.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {prayers.map((pkey) => (
              <div
                key={pkey}
                className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1"
              >
                <span className="block text-[11px] font-bold text-slate-700">
                  {PRAYER_NAMES_AR[pkey]}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={adjustments[pkey]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setAdjustments((prev) => ({ ...prev, [pkey]: val }));
                    }}
                    className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 text-center font-mono"
                  />
                  <span className="text-[10px] text-slate-400 shrink-0">د</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ إعدادات مواقيت الصلاة بنجاح</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات المواقيت'}</span>
        </button>
      </div>
    </div>
  );
};
