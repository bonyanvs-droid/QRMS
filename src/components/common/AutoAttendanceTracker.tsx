import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateDistanceMeters, isRegularAttendanceDay, getLocalDateString, isRecordForDate } from '../../utils/geoAttendance';
import { getHalaqahActiveDays } from '../../utils/scheduleCalculator';
import { CheckCircle2, MapPin, X, Navigation, Building2, Sparkles } from 'lucide-react';

interface AutoAttSuccessInfo {
  distance?: number;
  time: string;
  tenantName?: string;
  welcomeMessage?: string;
  reason: string;
  isWithinPerimeter?: boolean;
}

// Gentle pleasant audio chime on successful auto-attendance
function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
}

export const AutoAttendanceTracker: React.FC = () => {
  const { currentUser, activeTenant, staffAttendanceRecords, recordGeoAttendance, halaqahs = [] } = useApp();
  const [successInfo, setSuccessInfo] = useState<AutoAttSuccessInfo | null>(null);
  const isCheckingRef = useRef(false);
  const lastCheckTimestampRef = useRef<number>(0);

  const todayStr = getLocalDateString();
  const localDoneKey = currentUser && activeTenant ? `smart_att_done_${activeTenant.id}_${currentUser.id}_${todayStr}` : null;

  // Eligible roles for staff attendance
  const isStaff = currentUser && [
    'teacher',
    'supervisor',
    'admin',
    'campus_admin',
    'system_admin',
    'manager',
  ].includes(currentUser.role);

  // Instant local guard: check localStorage first to prevent re-triggering on fresh page loads / reloads
  const hasLocalGuardToday = Boolean(
    localDoneKey && typeof window !== 'undefined' && window.localStorage?.getItem(localDoneKey) === 'true'
  );

  // Check if attendance is already recorded today in memory/state
  const isAlreadyCheckedToday = Boolean(
    hasLocalGuardToday ||
    (currentUser &&
      activeTenant &&
      staffAttendanceRecords?.some(
        (r) =>
          (r.tenantId === activeTenant?.id || !r.tenantId) &&
          r.userId === currentUser.id &&
          isRecordForDate(r.date || r.timestamp, todayStr)
      ))
  );

  // Sync state to local guard if records arrived from Firestore
  useEffect(() => {
    if (localDoneKey && !hasLocalGuardToday && isAlreadyCheckedToday) {
      try {
        window.localStorage?.setItem(localDoneKey, 'true');
      } catch {
        // ignore storage errors
      }
    }
  }, [localDoneKey, hasLocalGuardToday, isAlreadyCheckedToday]);

  const isManagerOrAdmin = currentUser && ['campus_admin', 'system_admin', 'admin', 'manager'].includes(currentUser.role);

  const performAutoAttendanceCheck = async () => {
    // Immediate return if attendance is already recorded or user not eligible
    if (!isStaff || !activeTenant || isAlreadyCheckedToday || hasLocalGuardToday) {
      return;
    }

    // Rate-limit checks (at least 45 seconds between automated checks)
    const now = Date.now();
    if (now - lastCheckTimestampRef.current < 45000) {
      return;
    }
    lastCheckTimestampRef.current = now;

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    const attendanceCfg = activeTenant?.attendanceConfig || {
      latitude: 21.56466,
      longitude: 39.1442,
      radiusMeters: 200,
      regularDays: [0, 1, 2, 3, 4],
    };

    const markAttendanceSuccess = (dist?: number, reasonText?: string, isPerimeter: boolean = false) => {
      if (localDoneKey) {
        try {
          window.localStorage?.setItem(localDoneKey, 'true');
        } catch {
          // ignore
        }
      }
      playSuccessChime();
      setSuccessInfo({
        distance: dist,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        tenantName: activeTenant?.name,
        welcomeMessage: attendanceCfg.welcomeMessage,
        reason: reasonText || 'تسجيل حضور ذكي',
        isWithinPerimeter: isPerimeter,
      });
    };

    // If browser does not support geolocation
    if (!navigator.geolocation) {
      if (isManagerOrAdmin) {
        try {
          const reason = 'حضور إداري - مدير المجمع (تسجيل دخول المنصة)';
          const result = await recordGeoAttendance(reason);
          if (result.success) {
            markAttendanceSuccess(undefined, reason, false);
          }
        } finally {
          isCheckingRef.current = false;
        }
        return;
      }
      isCheckingRef.current = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const distance = calculateDistanceMeters(
            userLat,
            userLng,
            attendanceCfg.latitude,
            attendanceCfg.longitude
          );

          // If the user is inside the approved mosque perimeter
          if (distance <= attendanceCfg.radiusMeters) {
            let effectiveRegularDays = attendanceCfg.regularDays || [0, 1, 2, 3, 4];
            const userStageId = currentUser?.stageId || currentUser?.assignedStageIds?.[0];
            if (attendanceCfg.attendanceScope === 'halaqah' && currentUser?.halaqahId) {
              const matchedHalaqah = halaqahs.find((h) => h.id === currentUser.halaqahId);
              if (matchedHalaqah) {
                effectiveRegularDays = getHalaqahActiveDays(matchedHalaqah);
              } else if (attendanceCfg.halaqahOverrides?.[currentUser.halaqahId]) {
                effectiveRegularDays = attendanceCfg.halaqahOverrides[currentUser.halaqahId].regularDays;
              }
            } else if (attendanceCfg.attendanceScope === 'stage' && userStageId && attendanceCfg.stageOverrides?.[userStageId]) {
              effectiveRegularDays = attendanceCfg.stageOverrides[userStageId].regularDays;
            }
            const isRegular = isRegularAttendanceDay(effectiveRegularDays, new Date());
            const reason = isRegular ? 'حضور تلقائي ذكي عند الوصول' : 'حضور اعتيادي (رصد تلقائي)';

            const result = await recordGeoAttendance(reason);
            if (result.success) {
              markAttendanceSuccess(distance, reason, true);
            }
          } else if (isManagerOrAdmin) {
            // For Campus Admin / Manager: auto-record administrative check-in even when logging in from remote office/home
            const reason = `حضور إداري - مدير المجمع (${distance}م عن المقر)`;
            const result = await recordGeoAttendance(reason);
            if (result.success) {
              markAttendanceSuccess(distance, reason, false);
            }
          }
        } catch (err) {
          console.error('Error during auto geo-attendance check:', err);
        } finally {
          isCheckingRef.current = false;
        }
      },
      async (error) => {
        // If geolocation permission denied or unavailable, auto-record for Campus Admin
        try {
          if (isManagerOrAdmin) {
            const reason = 'حضور إداري - مدير المجمع (تسجيل دخول المنصة)';
            const result = await recordGeoAttendance(reason);
            if (result.success) {
              markAttendanceSuccess(undefined, reason, false);
            }
          }
        } catch (err) {
          console.error('Error recording admin presence fallback:', err);
        } finally {
          isCheckingRef.current = false;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // 1. Check automatically upon component mount / when user & tenant are ready
  // Delay by 1500ms to allow Firestore initial subscriptions to settle
  useEffect(() => {
    if (isStaff && activeTenant && !isAlreadyCheckedToday && !hasLocalGuardToday) {
      const timer = setTimeout(() => {
        performAutoAttendanceCheck();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.id, activeTenant?.id, isAlreadyCheckedToday, hasLocalGuardToday, isStaff]);

  // 2. Also check when user returns to the tab or unlocks phone screen (e.g. walked into the mosque)
  useEffect(() => {
    if (!isStaff || isAlreadyCheckedToday || hasLocalGuardToday) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performAutoAttendanceCheck();
      }
    };

    const handleFocus = () => {
      performAutoAttendanceCheck();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isStaff, isAlreadyCheckedToday, hasLocalGuardToday, activeTenant?.id]);

  // Auto-dismiss the success banner after 9 seconds
  useEffect(() => {
    if (successInfo) {
      const dismissTimer = setTimeout(() => {
        setSuccessInfo(null);
      }, 9000);
      return () => clearTimeout(dismissTimer);
    }
  }, [successInfo]);

  if (!successInfo) return null;

  const isWithin = successInfo.isWithinPerimeter ?? (successInfo.distance !== undefined && successInfo.distance <= 200);

  return (
    <div
      id="auto-attendance-success-toast"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-top-4 duration-300"
      dir="rtl"
    >
      <div className="bg-white/95 backdrop-blur-md border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl shadow-emerald-900/20 text-slate-800 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>تم تسجيل حضورك الذكي تلقائياً!</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 mt-0.5">
                أهلاً بك في {successInfo.tenantName}
              </h4>
            </div>
          </div>
          <button
            onClick={() => setSuccessInfo(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successInfo.welcomeMessage && (
          <p className="text-xs text-slate-600 bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 font-medium leading-relaxed">
            "{successInfo.welcomeMessage}"
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span className={`flex items-center gap-1 font-semibold ${isWithin ? 'text-emerald-700' : 'text-blue-700'}`}>
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {isWithin
                ? `داخل النطاق (المسافة: ${successInfo.distance ?? 0} متراً)`
                : successInfo.distance !== undefined
                ? `حضور إداري عن بُعد (${(successInfo.distance / 1000).toFixed(1)} كم عن المقر)`
                : 'حضور إداري معتمد (تسجيل دخول)'}
            </span>
          </span>
          <span>وقت الرصد: {successInfo.time}</span>
        </div>
      </div>
    </div>
  );
};
