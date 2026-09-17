import React, { useState, useEffect } from 'react';
import { Video, ExternalLink, Clock, Loader2, Check, Sparkles } from 'lucide-react';
import { Halaqah, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Props {
  halaqah: Halaqah;
  student: Student;
}

export function OnlineModeStudentWidget({ halaqah, student }: Props) {
  const { bulkMarkAttendance, academicConfig } = useApp();
  const [teacherOnline, setTeacherOnline] = useState(false);
  const [liveMeetingUrl, setLiveMeetingUrl] = useState<string>(halaqah?.onlineConfig?.meetingUrl || '');
  const [liveOnlineConfig, setLiveOnlineConfig] = useState(halaqah?.onlineConfig);
  const [joining, setJoining] = useState(false);

  // Sync with prop updates
  useEffect(() => {
    if (halaqah?.onlineConfig) {
      setLiveOnlineConfig(halaqah.onlineConfig);
      if (halaqah.onlineConfig.meetingUrl) {
        setLiveMeetingUrl(halaqah.onlineConfig.meetingUrl);
      }
    }
  }, [halaqah]);

  // 1. Listen directly to real-time Halaqah document changes in Firestore
  useEffect(() => {
    if (!halaqah?.id) return;
    const halaqahDocRef = doc(db, 'halaqahs', halaqah.id);
    const unsubHalaqah = onSnapshot(halaqahDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.onlineConfig) {
          setLiveOnlineConfig(data.onlineConfig);
          if (data.onlineConfig.meetingUrl) {
            setLiveMeetingUrl(data.onlineConfig.meetingUrl);
          }
        }
      }
    }, (err) => {
      console.warn('Student widget halaqah listener notice:', err);
    });

    return () => unsubHalaqah();
  }, [halaqah?.id]);

  // 2. Listen to real-time Online Sessions & Teacher Presence
  useEffect(() => {
    if (!halaqah?.id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionRef = doc(db, 'onlineSessions', `${halaqah.id}_${todayStr}`);
    const localKey = `online_session_${halaqah.id}_${todayStr}`;
    
    // Check initial local cache
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.teacherOnline) {
          setTeacherOnline(true);
        }
        if (parsed?.meetingUrl) {
          setLiveMeetingUrl(parsed.meetingUrl);
        }
      }
    } catch {}

    // Subscribe to session state to see if teacher joined or updated meetingUrl
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.teacherOnline) {
          setTeacherOnline(true);
        }
        if (data.meetingUrl) {
          setLiveMeetingUrl(data.meetingUrl);
        }
      } else {
        try {
          const cached = localStorage.getItem(localKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setTeacherOnline(!!parsed?.teacherOnline);
            if (parsed?.meetingUrl) {
              setLiveMeetingUrl(parsed.meetingUrl);
            }
          } else {
            setTeacherOnline(false);
          }
        } catch {
          setTeacherOnline(false);
        }
      }
    }, (err) => {
      console.warn('Online session listener note:', err);
      try {
        const cached = localStorage.getItem(localKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setTeacherOnline(!!parsed?.teacherOnline);
          if (parsed?.meetingUrl) {
            setLiveMeetingUrl(parsed.meetingUrl);
          }
        }
      } catch {}
    });

    // 3. Listen to cross-tab and local window events for immediate reactivity
    const handleLocalUpdate = (e: any) => {
      if (e?.detail?.halaqahId === halaqah.id) {
        if (e.detail.updates?.onlineConfig?.meetingUrl) {
          setLiveMeetingUrl(e.detail.updates.onlineConfig.meetingUrl);
          setLiveOnlineConfig(e.detail.updates.onlineConfig);
        } else if (e.detail.meetingUrl) {
          setLiveMeetingUrl(e.detail.meetingUrl);
        }
      }
    };
    window.addEventListener('halaqah_meeting_updated', handleLocalUpdate);
    
    return () => {
      unsubscribe();
      window.removeEventListener('halaqah_meeting_updated', handleLocalUpdate);
    };
  }, [halaqah?.id]);

  const effectiveMeetingUrl = (liveMeetingUrl || liveOnlineConfig?.meetingUrl || halaqah?.onlineConfig?.meetingUrl || '').trim();
  const effectiveEnabled = liveOnlineConfig?.enabled ?? halaqah?.onlineConfig?.enabled ?? (!!effectiveMeetingUrl);

  if (!effectiveEnabled && !effectiveMeetingUrl) return null;

  const { startTime = '16:00', endTime = '18:00', scheduleDays = [0, 1, 2, 3, 4] } = liveOnlineConfig || halaqah?.onlineConfig || {};
  
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

  const handleJoin = async () => {
    if (!effectiveMeetingUrl) return;
    setJoining(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      bulkMarkAttendance(dateStr, academicConfig.currentWeek, halaqah.id, { [student.id]: 'present' });
      window.open(effectiveMeetingUrl, '_blank');
    } catch (e) {
      console.error(e);
    }
    setJoining(false);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 mb-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-600"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-emerald-950 text-lg">الحلقة القرآنية الافتراضية (Online)</h3>
              {teacherOnline ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-500 text-white px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  المعلم متصل الآن
                </span>
              ) : effectiveMeetingUrl ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  الرابط محدث ومتاح
                </span>
              ) : null}
            </div>
            <p className="text-xs text-emerald-800 flex items-center gap-2 mt-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>الموعد: {startTime} - {endTime}</span>
              {isWithinWindow && <span className="font-bold text-emerald-700">(وقت البث الحالي)</span>}
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto">
          {!effectiveMeetingUrl ? (
            <div className="text-xs font-bold text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
              لم يقم المعلم أو الإدارة بإضافة رابط البث حتى الآن.
            </div>
          ) : teacherOnline ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
              <span>المعلم متصل • انضم للبث الآن</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs text-slate-600 font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                بانتظار بدء المعلم للبث
              </span>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full sm:w-auto bg-white border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-800 px-5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4 text-emerald-700" />}
                <span>دخول الغرفة (الرابط جاهز)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
