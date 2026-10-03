/**
 * Calculates the great circle distance between two points in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} م`;
  }
  return `${distanceKm.toFixed(1)} كم`;
}

// Default benchmark locations in Egypt for quick selector
export const PRESET_LOCATIONS = [
  { name: 'موقعي الحالي (GPS)', lat: 30.0444, lng: 31.2357, isGps: true },
  { name: 'القاهرة - المعادي', lat: 29.9602, lng: 31.2568, isGps: false },
  { name: 'القاهرة - مدينة نصر', lat: 30.0561, lng: 31.3444, isGps: false },
  { name: 'القاهرة - مصر الجديدة', lat: 30.0982, lng: 31.3340, isGps: false },
  { name: 'القاهرة - التجمع الخامس', lat: 30.0245, lng: 31.4421, isGps: false },
  { name: 'الجيزة - الدقي والمهندسين', lat: 30.0450, lng: 31.2080, isGps: false },
  { name: 'الإسكندرية - سموحة ورشدي', lat: 31.2156, lng: 29.9553, isGps: false },
];
