import { safeStorage } from '../lib/safeStorage';

/**
 * Browser Web Notifications and Daily Drill Reminder Service
 */

export interface NotificationSettings {
  enabled: boolean;
  drillReminderTime: string; // e.g. "17:00" (5:00 PM)
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'al_ghazzawi_notification_settings_v1';

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = safeStorage.getItem(SETTINGS_KEY);
    if (raw && raw !== 'null' && raw !== 'undefined') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          enabled: Boolean(parsed.enabled),
          drillReminderTime: parsed.drillReminderTime || '17:00',
          soundEnabled: parsed.soundEnabled !== false,
        };
      }
    }
  } catch (e) {
    // fallback
  }
  return {
    enabled: false,
    drillReminderTime: '17:00',
    soundEnabled: true,
  };
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  safeStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Requests Notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Plays a pleasant auditory chime via Web Audio API without requiring external audio files
 */
export function playChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Gentle two-tone chime
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(587.33, now, 0.35); // D5
    playNote(880.0, now + 0.15, 0.5); // A5
  } catch (e) {
    // AudioContext may be restricted by autoplay policy
  }
}

/**
 * Dispatches a system notification and optional audio chime
 */
export function dispatchDailyReminderNotification(
  title: string,
  body: string,
  options?: { sound?: boolean; icon?: string }
): void {
  const settings = getNotificationSettings();

  if (settings.soundEnabled && options?.sound !== false) {
    playChime();
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: options?.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        dir: 'rtl',
        lang: 'ar',
      });
    } catch (e) {
      console.warn('Notification dispatch error:', e);
    }
  }
}
