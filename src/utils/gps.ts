const KEY = 'deilar_gps';

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
