/**
 * Umm Al-Qura Hijri display helpers — DISPLAY ONLY.
 * Stored dates remain ISO (YYYY-MM-DD); these helpers only affect rendering.
 */
import { parseDateString } from '../quran/utils/dateUtils';

/** Today's date as YYYY-MM-DD in the user's LOCAL timezone (no UTC drift). */
export function getTodayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formats an ISO date as Hijri (Umm Al-Qura) — e.g. "١٥ رمضان ١٤٤٧ هـ". */
export function formatHijriDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parseDateString(dateStr));
  } catch {
    return dateStr; // Environment lacks Islamic calendar support — fall back to ISO
  }
}

/** Short Hijri — day + month only. */
export function formatHijriDateShort(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
    }).format(parseDateString(dateStr));
  } catch {
    return dateStr;
  }
}

/** Formats an ISO date as Gregorian in Arabic locale. */
export function formatGregorianDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parseDateString(dateStr));
  } catch {
    return dateStr;
  }
}
