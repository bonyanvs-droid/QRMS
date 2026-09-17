import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DailyPrayerTimes,
  MosqueComplexTenant,
  PrayerAdjustmentMinutes,
  PrayerReference,
  TenantPrayerConfig,
  TenantPrayerTimesDocument,
} from '../types';

// In-memory runtime cache: tenantId_year -> TenantPrayerTimesDocument
const memoryPrayerCache: Map<string, TenantPrayerTimesDocument> = new Map();

/**
 * Standard prayer names in Arabic
 */
export const PRAYER_NAMES_AR: Record<PrayerReference, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

/**
 * Helper to clean time strings returned by APIs (e.g., "04:57 (+03)" -> "04:57")
 */
export function cleanTimeStr(raw: string): string {
  if (!raw) return '00:00';
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return raw.trim();
  const hours = match[1].padStart(2, '0');
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

/**
 * Add or subtract minutes from an "HH:mm" time string
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  if (!timeStr) return '00:00';
  const clean = cleanTimeStr(timeStr);
  const [h, m] = clean.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutesToAdd;

  // Handle wrap-around across midnight
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const newH = Math.floor(normalizedMinutes / 60);
  const newM = normalizedMinutes % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Convert 24-hour "HH:mm" to Arabic 12-hour format: "04:30 م"
 */
export function formatTime12Hour(timeStr: string): string {
  if (!timeStr) return '--:--';
  const clean = cleanTimeStr(timeStr);
  const parts = clean.split(':');
  if (parts.length < 2) return timeStr;

  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const isPm = hour >= 12;

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  const formattedHour = String(hour).padStart(2, '0');
  const period = isPm ? 'م' : 'ص';
  return `${formattedHour}:${minute} ${period}`;
}

/**
 * Calculate difference in minutes between two "HH:mm" times (timeB - timeA)
 */
export function diffMinutes(timeA: string, timeB: string): number {
  const [hA, mA] = cleanTimeStr(timeA).split(':').map(Number);
  const [hB, mB] = cleanTimeStr(timeB).split(':').map(Number);
  return (hB * 60 + mB) - (hA * 60 + mA);
}

/**
 * Convert current local date to "YYYY-MM-DD"
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Algorithmic solar calculation fallback for Umm Al-Qura (Western / Central Saudi Arabia)
 * Used immediately if Firestore has not yet been synced or in offline scenarios.
 */
export function calculateFallbackPrayerTimes(
  dateStr: string,
  latitude: number = 21.56466,
  longitude: number = 39.1442
): DailyPrayerTimes {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfYear = Math.floor((d.getTime() - new Date(Date.UTC(year, 0, 0)).getTime()) / 86400000);

  // Approximate Solar Declination & Equation of Time
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // in minutes
  const declination = 23.45 * Math.sin(B) * (Math.PI / 180); // in radians
  const latRad = latitude * (Math.PI / 180);

  // Solar Noon (Dhuhr) in UTC+3 timezone (Riyadh / Makkah)
  // Timezone standard meridian for UTC+3 is 45° E
  const timeZoneMeridian = 45;
  const solarNoonMinutes = 720 + (timeZoneMeridian - longitude) * 4 - EoT;

  const dhuhrMinutes = Math.round(solarNoonMinutes);

  // Hour angle helper
  const hourAngle = (angleRad: number) => {
    const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(declination)) /
                  (Math.cos(latRad) * Math.cos(declination));
    if (cosHA > 1) return 0;
    if (cosHA < -1) return Math.PI;
    return Math.acos(cosHA);
  };

  // Sunrise / Sunset: sun altitude = -0.833°
  const sunRadiusAngle = -0.833 * (Math.PI / 180);
  const haSun = hourAngle(sunRadiusAngle) * (180 / Math.PI) * 4; // in minutes

  const sunriseMinutes = Math.round(solarNoonMinutes - haSun);
  const maghribMinutes = Math.round(solarNoonMinutes + haSun);

  // Fajr: Umm Al-Qura uses 18.5° below horizon
  const fajrAngle = -18.5 * (Math.PI / 180);
  const haFajr = hourAngle(fajrAngle) * (180 / Math.PI) * 4;
  const fajrMinutes = Math.round(solarNoonMinutes - haFajr);

  // Asr: Shafi'i / Hanbali shadow length = 1
  const asrAlt = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - declination))));
  const haAsr = hourAngle(asrAlt) * (180 / Math.PI) * 4;
  const asrMinutes = Math.round(solarNoonMinutes + haAsr);

  // Isha: Umm Al-Qura standard is 90 minutes after Maghrib
  const ishaMinutes = maghribMinutes + 90;

  const toTimeStr = (mins: number) => {
    const norm = ((Math.round(mins) % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    date: dateStr,
    fajr: toTimeStr(fajrMinutes),
    sunrise: toTimeStr(sunriseMinutes),
    dhuhr: toTimeStr(dhuhrMinutes),
    asr: toTimeStr(asrMinutes),
    maghrib: toTimeStr(maghribMinutes),
    isha: toTimeStr(ishaMinutes),
  };
}

/**
 * Retrieve prayer times document from cache or Firestore for a given tenant and year.
 */
export async function getTenantPrayerTimesDoc(
  tenantId: string,
  year: number
): Promise<TenantPrayerTimesDocument | null> {
  const cacheKey = `${tenantId}_${year}`;

  // 1. In-memory cache
  if (memoryPrayerCache.has(cacheKey)) {
    return memoryPrayerCache.get(cacheKey)!;
  }

  // 2. LocalStorage cache
  try {
    const rawLocal = localStorage.getItem(`qrms_prayer_times_${cacheKey}`);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as TenantPrayerTimesDocument;
      if (parsed && parsed.timingsByDate) {
        memoryPrayerCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage prayer cache read notice:', e);
  }

  // 3. Firestore
  try {
    const docRef = doc(db, 'prayer_times', cacheKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as TenantPrayerTimesDocument;
      memoryPrayerCache.set(cacheKey, data);
      try {
        localStorage.setItem(`qrms_prayer_times_${cacheKey}`, JSON.stringify(data));
      } catch (e) {
        // quota exceeded or private mode, ignore
      }
      return data;
    }
  } catch (err) {
    console.warn('Firestore prayer_times fetch notice:', err);
  }

  return null;
}

/**
 * Fetch and sync a full year (or active months) from Aladhan API and persist in Firestore
 */
export async function syncAndSavePrayerTimes(
  tenant: MosqueComplexTenant,
  targetYear?: number
): Promise<{ success: boolean; totalDays: number; error?: string }> {
  const year = targetYear || new Date().getFullYear();
  const lat = tenant.prayerConfig?.latitude || tenant.attendanceConfig?.latitude || 21.56466;
  const lng = tenant.prayerConfig?.longitude || tenant.attendanceConfig?.longitude || 39.1442;
  const method = tenant.prayerConfig?.calculationMethod || 4; // 4 = Umm Al-Qura

  try {
    const url = `https://api.aladhan.com/v1/calendar/${year}?latitude=${lat}&longitude=${lng}&method=${method}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Aladhan API responded with status ${response.status}`);
    }

    const json = await response.json();
    if (!json || !json.data) {
      throw new Error('Invalid response structure from Aladhan API');
    }

    const timingsByDate: Record<string, DailyPrayerTimes> = {};
    const monthsData = json.data; // object with keys 1..12 or array

    const monthKeys = Object.keys(monthsData);
    for (const mKey of monthKeys) {
      const days = monthsData[mKey];
      if (Array.isArray(days)) {
        for (const item of days) {
          const greg = item.date?.gregorian;
          const timings = item.timings;
          const hijri = item.date?.hijri;

          if (greg && timings) {
            const dayStr = String(greg.day).padStart(2, '0');
            const monthStr = String(greg.month?.number || greg.month).padStart(2, '0');
            const yearStr = String(greg.year);
            const isoDate = `${yearStr}-${monthStr}-${dayStr}`;

            let hijriDateStr: string | undefined;
            if (hijri) {
              hijriDateStr = `${hijri.day} ${hijri.month?.ar || hijri.month?.en || ''} ${hijri.year}هـ`.trim();
            }

            timingsByDate[isoDate] = {
              date: isoDate,
              fajr: cleanTimeStr(timings.Fajr),
              sunrise: cleanTimeStr(timings.Sunrise),
              dhuhr: cleanTimeStr(timings.Dhuhr),
              asr: cleanTimeStr(timings.Asr),
              maghrib: cleanTimeStr(timings.Maghrib),
              isha: cleanTimeStr(timings.Isha),
              hijriDate: hijriDateStr,
            };
          }
        }
      }
    }

    const totalDays = Object.keys(timingsByDate).length;
    if (totalDays === 0) {
      throw new Error('No valid prayer timings extracted from Aladhan API');
    }

    const docId = `${tenant.id}_${year}`;
    const docData: TenantPrayerTimesDocument = {
      id: docId,
      tenantId: tenant.id,
      year,
      latitude: lat,
      longitude: lng,
      timezone: 'Asia/Riyadh',
      method,
      lastSyncedAt: new Date().toISOString(),
      source: 'aladhan',
      timingsByDate,
      adjustments: tenant.prayerConfig?.adjustments,
    };

    // Save to Firestore
    await setDoc(doc(db, 'prayer_times', docId), docData, { merge: true });

    // Update Memory and LocalStorage cache
    memoryPrayerCache.set(docId, docData);
    try {
      localStorage.setItem(`qrms_prayer_times_${docId}`, JSON.stringify(docData));
    } catch (e) {
      // ignore
    }

    return { success: true, totalDays };
  } catch (err: any) {
    console.error('Error syncing prayer times:', err);
    return { success: false, totalDays: 0, error: err?.message || 'فشل في جلب مواقيت الصلاة' };
  }
}

/**
 * Get prayer times for a specific date (defaults to today)
 * Uses cached Firestore document if available, with smooth fallback to astronomical calculations.
 * Always applies configured manual minute adjustments.
 */
export function getPrayerTimesForDateSync(
  tenant: MosqueComplexTenant | null | undefined,
  dateStr?: string
): DailyPrayerTimes {
  const date = dateStr || getTodayDateStr();
  const year = parseInt(date.split('-')[0], 10) || new Date().getFullYear();
  const tenantId = tenant?.id || 'ghazzawi';

  let baseTimings: DailyPrayerTimes | null = null;
  const cacheKey = `${tenantId}_${year}`;

  // 1. Memory cache
  if (memoryPrayerCache.has(cacheKey)) {
    const docData = memoryPrayerCache.get(cacheKey)!;
    if (docData.timingsByDate && docData.timingsByDate[date]) {
      baseTimings = docData.timingsByDate[date];
    }
  }

  // 2. LocalStorage cache
  if (!baseTimings) {
    try {
      const raw = localStorage.getItem(`qrms_prayer_times_${cacheKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as TenantPrayerTimesDocument;
        if (parsed.timingsByDate && parsed.timingsByDate[date]) {
          baseTimings = parsed.timingsByDate[date];
          memoryPrayerCache.set(cacheKey, parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback calculation if not in cache
  if (!baseTimings) {
    const lat = tenant?.prayerConfig?.latitude || tenant?.attendanceConfig?.latitude || 21.56466;
    const lng = tenant?.prayerConfig?.longitude || tenant?.attendanceConfig?.longitude || 39.1442;
    baseTimings = calculateFallbackPrayerTimes(date, lat, lng);
  }

  // 4. Apply custom adjustments if configured
  const adjustments = tenant?.prayerConfig?.adjustments;
  if (!adjustments) {
    return baseTimings;
  }

  return {
    ...baseTimings,
    fajr: adjustments.fajr ? addMinutesToTime(baseTimings.fajr, adjustments.fajr) : baseTimings.fajr,
    sunrise: adjustments.sunrise ? addMinutesToTime(baseTimings.sunrise, adjustments.sunrise) : baseTimings.sunrise,
    dhuhr: adjustments.dhuhr ? addMinutesToTime(baseTimings.dhuhr, adjustments.dhuhr) : baseTimings.dhuhr,
    asr: adjustments.asr ? addMinutesToTime(baseTimings.asr, adjustments.asr) : baseTimings.asr,
    maghrib: adjustments.maghrib ? addMinutesToTime(baseTimings.maghrib, adjustments.maghrib) : baseTimings.maghrib,
    isha: adjustments.isha ? addMinutesToTime(baseTimings.isha, adjustments.isha) : baseTimings.isha,
  };
}
