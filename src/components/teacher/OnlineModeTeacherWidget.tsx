import React, { useState, useEffect } from 'react';
import { Video, ExternalLink, Link as LinkIcon, Save, Clock, Loader2, Check, Sparkles } from 'lucide-react';
import { Halaqah, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { saveOnlineSession } from '../../lib/dbService';
import { safeStorage } from '../../lib/safeStorage';

interface Props {
  halaqah: Halaqah;
  students: Student[];
}

export function OnlineModeTeacherWidget({ halaqah, students }: Props) {
  const { currentUser, updateHalaqah, bulkMarkAttendance, activeTenantId, academicConfig } = useApp();
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [joining, setJoining] = useState(false);
  const [liveConfig, setLiveConfig] = useState(halaqah.onlineConfig);

  useEffect(() => {
    if (halaqah?.onlineConfig?.meetingUrl) {
      setMeetingUrl(halaqah.onlineConfig.meetingUrl);
      setLiveConfig(halaqah.onlineConfig);
    }
  }, [halaqah]);

  const effectiveConfig: NonNullable<Halaqah['onlineConfig']> = liveConfig || halaqah.onlineConfig || {
    enabled: false,
    meetingUrl: '',
    startTime: '16:00',
    endTime: '18:00',
    scheduleDays: [0, 1, 2, 3, 4],
  };
  const { startTime = '16:00', endTime = '18:00', scheduleDays = [0, 1, 2, 3, 4] } = effectiveConfig;
  const currentMeetingUrl = effectiveConfig.meetingUrl || halaqah.onlineConfig?.meetingUrl || '';
  
  // Basic Time Window Check
  const now = new Date();
  const todayDay = now.getDay();
  const isScheduledToday = scheduleDays.includes(todayDay);

  const [startH, startM] = (startTime || '16:00').split(':').map(Number);
  const [endH, endM] = (endTime || '18:00').split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const isLiveNow = isScheduledToday && currentMinutes >= (startMinutes - 15) && currentMinutes <= (endMinutes + 15);

  const handleSaveUrl = async () => {
    if (!meetingUrl.trim()) return;
    setSavingUrl(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const trimmedUrl = meetingUrl.trim();
    try {
      const updatedConfig = {
        enabled: true,
        meetingUrl: trimmedUrl,
        startTime: effectiveConfig?.startTime || halaqah.onlineConfig?.startTime || '16:00',
        endTime: effectiveConfig?.endTime || halaqah.onlineConfig?.endTime || '18:00',
        scheduleDays: effectiveConfig?.scheduleDays || halaqah.onlineConfig?.scheduleDays || [0, 1, 2, 3, 4],
      };

      // 1. Update Context & PostgreSQL Halaqah
      await updateHalaqah(halaqah.id, {
        onlineConfig: updatedConfig
      });

      // 2. Also record in onlineSessions for instant student widget discovery
      try {
        await saveOnlineSession(`${halaqah.id}_${todayStr}`, {
          tenantId: activeTenantId,
          halaqahId: halaqah.id,
          date: todayStr,
          meetingUrl: trimmedUrl,
          enabled: true,
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('Session doc update notice:', err);
      }

      // 3. Update localStorage for instant local/cross-tab reactivity
      try {
        const localKey = `online_session_${halaqah.id}_${todayStr}`;
        const prevSession = safeStorage.getItem(localKey);
        const parsedPrev = prevSession ? JSON.parse(prevSession) : {};
        safeStorage.setItem(localKey, JSON.stringify({
          ...parsedPrev,
          tenantId: activeTenantId,
          halaqahId: halaqah.id,
          date: todayStr,
          meetingUrl: trimmedUrl,
          enabled: true,
          updatedAt: new Date().toISOString(),
        }));
      } catch {}

      setLiveConfig(updatedConfig);
      setIsEditingUrl(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving meeting URL:', e);
    }
    setSavingUrl(false);
  };

  const handleToggleOnline = async () => {
    const nextEnabled = !effectiveConfig?.enabled;
    try {
      const updatedConfig = {
        enabled: nextEnabled,
        meetingUrl: effectiveConfig?.meetingUrl || halaqah.onlineConfig?.meetingUrl || '',
        startTime: effectiveConfig?.startTime || halaqah.onlineConfig?.startTime || '16:00',
        endTime: effectiveConfig?.endTime || halaqah.onlineConfig?.endTime || '18:00',
        scheduleDays: effectiveConfig?.scheduleDays || halaqah.onlineConfig?.scheduleDays || [0, 1, 2, 3, 4],
      };
      await updateHalaqah(halaqah.id, {
        onlineConfig: updatedConfig
      });
      setLiveConfig(updatedConfig);
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async () => {
    if (!currentMeetingUrl) {
      setIsEditingUrl(true);
      return;
    }
    setJoining(true);

    const todayStr = new Date().toISOString().split('T')[0];

    // Mark online session state in backend
    try {
      await saveOnlineSession(`${halaqah.id}_${todayStr}`, {
        tenantId: activeTenantId,
        halaqahId: halaqah.id,
        date: todayStr,
        teacherId: currentUser?.id,
        teacherName: currentUser?.name,
        teacherOnline: true,
        lastTeacherPing: new Date().toISOString(),
        meetingUrl: currentMeetingUrl,
      });
    } catch (err: any) {
      console.warn('Session online broadcast notice:', err);
    }

    // Auto mark attendance for online students
    if (students && students.length > 0) {
      try {
        const studentIds = students.map((s) => s.id);
        const weekNumber = (academicConfig as any)?.currentWeekNumber || 1;
        await bulkMarkAttendance(todayStr, weekNumber, halaqah.id, studentIds);
      } catch (e) {
        console.warn('Auto attendance notice:', e);
      }
    }

    setTimeout(() => {
      setJoining(false);
      window.open(currentMeetingUrl, '_blank', 'noopener,noreferrer');
    }, 400);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/30 mb-6 relative overflow-hidden backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLiveNow ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-400/30 animate-pulse' : 'bg-white/10 text-emerald-300'}`}>
              <Video className="w-6 h-6" />
            </div>
            {isLiveNow && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-bold text-white tracking-wide">الغرفة الافتراضية للحلقة</h3>
              {isLiveNow && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Sparkles className="w-3 h-3" /> جارية الآن
                </span>
              )}
            </div>
            <p className="hidden sm:block text-xs text-emerald-100/70 mt-0.5">
              رابط البث المباشر (Google Meet / Zoom / Teams) لطلاب الحلقة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {isEditingUrl ? (
            <div className="flex items-center gap-2 w-full md:w-auto bg-slate-950/60 p-1.5 rounded-xl border border-white/10">
              <div className="relative flex-1 md:w-80">
                <LinkIcon className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  className="w-full bg-transparent text-white text-xs pr-9 pl-3 py-2 rounded-lg border-0 focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-500 font-mono text-left"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSaveUrl}
                disabled={savingUrl || !meetingUrl.trim()}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              >
                {savingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>حفظ الرابط</span>
              </button>
              <button
                onClick={() => {
                  setIsEditingUrl(false);
                  setMeetingUrl(currentMeetingUrl);
                }}
                className="px-2.5 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <>
              {currentMeetingUrl ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
                      isLiveNow
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-400/50 shadow-emerald-950/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {joining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    <span>بدء البث ومباشرة الحلقة</span>
                  </button>

                  <button
                    onClick={() => setIsEditingUrl(true)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 text-xs font-medium"
                    title="تعديل رابط البث"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingUrl(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>إضافة رابط اجتماع الحلقة</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="mt-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs py-1.5 px-3 rounded-lg flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>تم حفظ وتفعيل رابط الغرفة الافتراضية بنجاح! سيتمكن الطلاب من الانضمام الآن.</span>
        </div>
      )}
    </div>
  );
}
