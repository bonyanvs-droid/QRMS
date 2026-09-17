import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  dispatchDailyReminderNotification,
  NotificationSettings,
} from '../../utils/notificationService';
import { Bell, BellRing, CheckCircle2, AlertCircle, Clock, Volume2, Settings2, Sparkles } from 'lucide-react';

interface DailyReminderWidgetProps {
  halaqahId?: string;
  halaqahName?: string;
}

export const DailyReminderWidget: React.FC<DailyReminderWidgetProps> = ({ halaqahId, halaqahName }) => {
  const { sessionRecords, students, academicConfig } = useApp();
  const currentWeek = academicConfig.currentWeek;
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Students in this halaqah
  const halaqahStudents = students.filter((s) => (halaqahId ? s.halaqahId === halaqahId : true));
  const studentIds = new Set(halaqahStudents.map((s) => s.id));

  // Records for today
  const todayRecords = sessionRecords.filter(
    (r) => r.date === todayStr && studentIds.has(r.studentId)
  );

  const totalStudentsCount = halaqahStudents.length;
  const recordedStudentsCount = todayRecords.length;
  const isAllRecorded = totalStudentsCount > 0 && recordedStudentsCount >= totalStudentsCount;
  const drillMinutesRecorded = todayRecords.some((r) => (r.spellingDrillMinutes || 0) > 0);

  // Check reminder status on mount or when records change
  useEffect(() => {
    if (settings.enabled && permission === 'granted') {
      const now = new Date();
      const currentHour = now.getHours();
      // If late afternoon and not recorded yet, show notification
      if (!isAllRecorded && currentHour >= 16) {
        const lastNotif = sessionStorage.getItem('last_drill_notif_date');
        if (lastNotif !== todayStr) {
          dispatchDailyReminderNotification(
            'تذكير بمتابعة الحلقة – مجمع حلقات القرآن',
            `فضيلة المعلم: لم يكتمل تحضير اليوم وتدوين دقائق تدريب الهجاء العشر لحلقة ${halaqahName || ''}.`
          );
          sessionStorage.setItem('last_drill_notif_date', todayStr);
        }
      }
    }
  }, [isAllRecorded, settings.enabled, permission, todayStr, halaqahName]);

  const handleToggleNotifications = async () => {
    if (!settings.enabled) {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        const updated = { ...settings, enabled: true };
        setSettings(updated);
        saveNotificationSettings(updated);
        dispatchDailyReminderNotification(
          'تم تفعيل تنبيهات التحضير اليومية',
          'ستصلك تنبيهات تذكيرية عند حلول وقت الحلقة لتسجيل الحضور وتدوين تدريب الهجاء (10 دقائق).'
        );
        setStatusMessage('تم تفعيل التنبيهات بنجاح');
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage('يرجى السماح بالإشعارات من إعدادات المتصفح');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } else {
      const updated = { ...settings, enabled: false };
      setSettings(updated);
      saveNotificationSettings(updated);
      setStatusMessage('تم تعطيل التنبيهات');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleTestNotification = () => {
    dispatchDailyReminderNotification(
      'تجربة تنبيه الحلقة القرآنية',
      'صوت التنبيه والتذكير اليومي يعمل بجاهزية تامة.'
    );
    setStatusMessage('تم إرسال إشعار تجريبي');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAllRecorded
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800 animate-pulse'
            }`}
          >
            {isAllRecorded ? <CheckCircle2 className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">
                متابعة التحضير وتدريب الهجاء اليومي
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                اليوم: {todayStr}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isAllRecorded ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> تم اكتمال رصد حضور {recordedStudentsCount} من أصل {totalStudentsCount} طلاب اليوم
                </span>
              ) : (
                <span className="text-amber-800 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> تم تحضير {recordedStudentsCount} من {totalStudentsCount} طلاب حتى الآن
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleToggleNotifications}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              settings.enabled
                ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{settings.enabled ? 'التنبيهات مفعلة' : 'تفعيل تنبيه اليوم'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="إعدادات التنبيه والصوت"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg font-medium border border-emerald-200 animate-fadeIn">
          {statusMessage}
        </div>
      )}

      {/* Expanded Settings Panel */}
      {showSettings && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fadeIn">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              النغمة الصوتية الهادئة
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  const upd = { ...settings, soundEnabled: e.target.checked };
                  setSettings(upd);
                  saveNotificationSettings(upd);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="font-semibold text-slate-700">اختبار الإشعار الصوتي</span>
            <button
              type="button"
              onClick={handleTestNotification}
              className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition-colors"
            >
              تجربة الآن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
