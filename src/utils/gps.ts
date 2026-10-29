import { calculateDistanceKm } from './geo';

const KEY = 'deilar_gps';

/** Two fixes closer than this (km) are the same place for the "your location is set" prompt. */
export const SAME_SPOT_KM = 0.5;

export interface GpsPoint {
  lat: number;
  lng: number;
}

/** The last GPS fix kept on this device. Once it exists the location gate never shows again. */
export function getSavedGps(): GpsPoint | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as GpsPoint | null;
    return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? p : null;
  } catch {
    return null;
  }
}

export function saveGps(point: GpsPoint) {
  try {
    localStorage.setItem(KEY, JSON.stringify(point));
  } catch {
    /* storage unavailable: asked again next launch */
  }
}

/** Whether two fixes are the same place or very near each other. */
export const isSameSpot = (a: GpsPoint, b: GpsPoint): boolean => calculateDistanceKm(a.lat, a.lng, b.lat, b.lng) <= SAME_SPOT_KM;
