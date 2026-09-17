import React, { useState, useEffect } from 'react';
import { Video, ExternalLink, Link as LinkIcon, Save, Clock, Loader2, Check, Sparkles } from 'lucide-react';
import { Halaqah, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

  // Real-time listener for direct halaqah updates in Firestore
  useEffect(() => {
    if (!halaqah?.id) return;
    const halaqahDocRef = doc(db, 'halaqahs', halaqah.id);
    const unsub = onSnapshot(halaqahDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.onlineConfig) {
          setLiveConfig(data.onlineConfig);
          if (!isEditingUrl && data.onlineConfig.meetingUrl) {
            setMeetingUrl(data.onlineConfig.meetingUrl);
          }
        }
      }
    }, (err) => {
      console.warn('Teacher widget halaqah listener notice:', err);
    });

    return () => unsub();
  }, [halaqah.id, isEditingUrl]);

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

  const [startHour, startMin] = (startTime || '16:00').split(':').map(Number);
  const [endHour, endMin] = (endTime || '18:00').split(':').map(Number);
  
  const startObj = new Date();
  startObj.setHours(startHour, startMin, 0, 0);
  const startObjMinus15 = new Date(startObj.getTime() - 15 * 60000);
  
  const endObj = new Date();
  endObj.setHours(endHour, endMin, 0, 0);
  
  const isWithinWindow = isScheduledToday && now >= startObjMinus15 && now <= endObj;

  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const formattedDays = scheduleDays.map((d: number) => dayNames[d]).filter(Boolean).join('، ');

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

      // 1. Update Context and Firestore Halaqah doc
      await updateHalaqah(halaqah.id, {
        onlineConfig: updatedConfig
      });

      // 2. Also record in onlineSessions for instant student widget discovery
      try {
        const sessionRef = doc(db, 'onlineSessions', `${halaqah.id}_${todayStr}`);
        await setDoc(sessionRef, {
          tenantId: activeTenantId,
          halaqahId: halaqah.id,
          date: todayStr,
          meetingUrl: trimmedUrl,
          enabled: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err: any) {
        console.warn('Session doc update notice:', err);
      }

      // 3. Update localStorage for instant local/cross-tab reactivity
      try {
        const localKey = `online_session_${halaqah.id}_${todayStr}`;
        const prevSession = localStorage.getItem(localKey);
        const parsedPrev = prevSession ? JSON.parse(prevSession) : {};
        localStorage.setItem(localKey, JSON.stringify({
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
    try {
      // Record Teacher online status in Firestore
      try {
        const sessionRef = doc(db, 'onlineSessions', `${halaqah.id}_${todayStr}`);
        await setDoc(sessionRef, {
          tenantId: activeTenantId,
          halaqahId: halaqah.id,
          date: todayStr,
          meetingUrl: currentMeetingUrl,
          enabled: true,
          teacherOnline: true,
          lastSeenAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err: any) {
        console.warn('Teacher status update notice:', err);
      }

      // Also record in localStorage fallback for instant cross-tab / demo awareness
      try {
        const localKey = `online_session_${halaqah.id}_${todayStr}`;
        localStorage.setItem(localKey, JSON.stringify({
          tenantId: activeTenantId,
          halaqahId: halaqah.id,
          date: todayStr,
          meetingUrl: currentMeetingUrl,
          enabled: true,
          teacherOnline: true,
          lastSeenAt: new Date().toISOString(),
        }));
      } catch {}

      // Record Attendance for Teacher (Idempotent by logic)
      if (currentUser?.id) {
        bulkMarkAttendance(todayStr, academicConfig.currentWeek, halaqah.id, { [currentUser.id]: 'present' });
      }
      
      // Open URL
      window.open(currentMeetingUrl, '_blank');
    } catch (e) {
      console.error(e);
    }
    setJoining(false);
  };

  if (!halaqah?.onlineConfig?.enabled) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">وضع الحلقة: حضورية بالمقر</span>
            <span className="text-[11px] text-slate-500">هل ترغب في تفعيل الغرفة الافتراضية والتعليم عن بعد لهذه الحلقة؟</span>
          </div>
        </div>
        <button
          onClick={handleToggleOnline}
          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          🌐 تفعيل البث عن بعد (Online)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border-2 border-blue-300/80 rounded-2xl p-5 mb-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600"></div>
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-blue-950 text-base sm:text-lg">دخول الحلقة الافتراضية (Online)</h3>
              {isWithinWindow ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  البث المباشر نشط الآن
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  وضع التعليم عن بعد مفعّل
                </span>
              )}
            </div>
            <p className="text-xs text-blue-800 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 font-medium">
              <span className="inline-flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                الموعد: {startTime} - {endTime}
              </span>
              {formattedDays && (
                <span className="text-blue-700/90 text-[11px]">
                  الأيام: {formattedDays}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="w-full lg:w-auto">
          {!currentMeetingUrl || isEditingUrl ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-1.5 rounded-2xl shadow-xs border border-blue-200">
              <div className="relative flex-1 min-w-[240px]">
                <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="ضع رابط Google Meet أو Zoom هنا..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-slate-50 outline-none border border-slate-200 focus:border-blue-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
              <button
                onClick={handleSaveUrl}
                disabled={savingUrl || !meetingUrl.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {savingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <><Check className="w-4 h-4 text-emerald-300" /> تم الحفظ</> : 'حفظ الرابط'}
              </button>
              {isEditingUrl && currentMeetingUrl && (
                <button
                  onClick={() => setIsEditingUrl(false)}
                  className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span>دخول الحلقة الافتراضية (بدء البث)</span>
              </button>
              <button
                onClick={() => {
                  setMeetingUrl(currentMeetingUrl);
                  setIsEditingUrl(true);
                }}
                className="px-3.5 py-2.5 rounded-xl text-blue-800 hover:bg-blue-100 font-bold text-xs bg-white border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                title="تعديل رابط الاجتماع"
              >
                تغيير الرابط
              </button>
            </div>
          )}
        </div>
      </div>
      
      {!currentMeetingUrl && !isEditingUrl && (
        <div className="mt-3 text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium flex items-center justify-between gap-2">
          <span>⚠️ لم يتم تحديد رابط الاجتماع بعد. اضغط على "تغيير الرابط" لإدخال رابط Zoom أو Google Meet للحلقة.</span>
          <button
            onClick={() => setIsEditingUrl(true)}
            className="text-xs text-blue-700 underline font-bold shrink-0"
          >
            إدخال الرابط الآن
          </button>
        </div>
      )}
    </div>
  );
}
