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

export function formatDistance(distanceKm: number, isAr = true): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} ${isAr ? 'م' : 'm'}`;
  }
  return `${distanceKm.toFixed(1)} ${isAr ? 'كم' : 'km'}`;
}

/** The English names of the places the app itself names (the presets below and the GPS / default labels). */
const PLACE_EN: Record<string, string> = {
  'موقعي الحالي (GPS)': 'My current location (GPS)',
  'موقعي الحالي (GPS مباشر)': 'My current location (live GPS)',
  'موقعي المحفوظ': 'My saved location',
  'موقعي (القاهرة)': 'My location (Cairo)',
  'القاهرة - وسط البلد': 'Cairo - Downtown',
  'القاهرة - وسط البلد (افتراضي)': 'Cairo - Downtown (default)',
  'القاهرة - المعادي': 'Cairo - Maadi',
  'القاهرة - مدينة نصر': 'Cairo - Nasr City',
  'القاهرة - مصر الجديدة': 'Cairo - Heliopolis',
  'القاهرة - التجمع الخامس': 'Cairo - Fifth Settlement',
  'الجيزة - الدقي والمهندسين': 'Giza - Dokki & Mohandessin',
  'الإسكندرية - سموحة ورشدي': 'Alexandria - Smouha & Rushdy',
};

/** A place name as the app names it, in the language of the app (names that came from elsewhere are left as they are). */
export const placeName = (name: string, isAr: boolean): string => (isAr ? name : PLACE_EN[name] ?? name);

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
