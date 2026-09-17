export const DEFAULT_MOSQUE_COORDINATES = {
  latitude: 21.596588,
  longitude: 39.16704,
  radiusMeters: 200,
};

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isRecordForDate(recordDateOrTimestamp?: string, targetDateStr: string = getLocalDateString()): boolean {
  if (!recordDateOrTimestamp) return false;
  const cleanRecordDate = String(recordDateOrTimestamp).trim();
  const cleanTargetDate = String(targetDateStr).trim();
  if (cleanRecordDate === cleanTargetDate) return true;
  if (cleanRecordDate.slice(0, 10) === cleanTargetDate) return true;
  try {
    const d = new Date(cleanRecordDate);
    if (!isNaN(d.getTime()) && getLocalDateString(d) === cleanTargetDate) {
      return true;
    }
  } catch {
    // ignore parse error
  }
  return false;
}

export function isRegularAttendanceDay(regularDays: number[] = [0, 1, 2, 3, 4], date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  return regularDays.includes(dayOfWeek);
}
