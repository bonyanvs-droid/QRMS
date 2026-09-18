import React, { useState, useEffect } from 'react';
import { Video, ExternalLink, Clock, Loader2, Check, Sparkles } from 'lucide-react';
import { Halaqah, Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { subscribeToOnlineSession } from '../../lib/dbService';
import { safeStorage } from '../../lib/safeStorage';

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

  // Listen to real-time Online Sessions & Teacher Presence
  useEffect(() => {
    if (!halaqah?.id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionId = `${halaqah.id}_${todayStr}`;
    const localKey = `online_session_${halaqah.id}_${todayStr}`;
    
    // Check initial local cache
    try {
      const cached = safeStorage.getItem(localKey);
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

    const unsub = subscribeToOnlineSession(sessionId, (data) => {
      if (data) {
        if (data.teacherOnline) {
          setTeacherOnline(true);
        }
        if (data.meetingUrl) {
          setLiveMeetingUrl(data.meetingUrl);
        }
      }
    });

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
      unsub();
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

  const [startH, startM] = (startTime || '16:00').split(':').map(Number);
  const [endH, endM] = (endTime || '18:00').split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const isWithinTime = isScheduledToday && currentMinutes >= (startMinutes - 15) && currentMinutes <= (endMinutes + 15);
  const isLive = teacherOnline || isWithinTime;

  const handleJoin = async () => {
    if (!effectiveMeetingUrl) return;
    setJoining(true);

    const todayStr = new Date().toISOString().split('T')[0];

    // Auto mark attendance for student on remote join
    try {
      const weekNumber = (academicConfig as any)?.currentWeekNumber || 1;
      await bulkMarkAttendance(todayStr, weekNumber, halaqah.id, [student.id]);
    } catch (e) {
      console.warn('Auto attendance error:', e);
    }

    setTimeout(() => {
      setJoining(false);
      window.open(effectiveMeetingUrl, '_blank', 'noopener,noreferrer');
    }, 400);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/30 mb-6 relative overflow-hidden backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLive ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-400/30 animate-pulse' : 'bg-white/10 text-emerald-300'}`}>
              <Video className="w-6 h-6" />
            </div>
            {isLive && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">الغرفة الافتراضية للحلقة (عن بُعد)</h3>
              {isLive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{teacherOnline ? 'المعلم متصل الآن' : 'وقت الحلقة'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  <Clock className="w-3 h-3" />
                  <span>{startTime} - {endTime}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-100/70 mt-0.5">
              {halaqah.name} {halaqah.teacherName ? `• إشراف المعلم: ${halaqah.teacherName}` : ''}
            </p>
          </div>
        </div>

        <div>
          {effectiveMeetingUrl ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 w-full sm:w-auto ${
                isLive
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-400/50 shadow-emerald-950/50 animate-bounce'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              <span>دخول حلقة البث المباشر</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 bg-white/5 px-3 py-2 rounded-lg inline-block">
              بانتظار إضافة المعلم لرابط الاجتماع
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
