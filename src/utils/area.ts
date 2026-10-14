import { useSyncExternalStore } from 'react';

/** The governorate (and city) the visitor picked after the GPS fix. */
export interface Area {
  governorate: { id: number; name: string };
  city?: { id: number; name: string };
  /** The GPS fix it was chosen from, so the next visit starts from here instead of a default. */
  point?: { lat: number; lng: number };
}

const KEY = 'deilar_area';
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Area | null } | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getArea(): Area | null {
  const raw = readRaw();
  if (cache?.raw === raw) return cache.value;

  let value: Area | null = null;
  try {
    value = raw ? (JSON.parse(raw) as Area) : null;
  } catch {
    /* corrupt entry: ask again */
  }
  cache = { raw, value };
  return value;
}

export function saveArea(area: Area | null) {
  try {
    if (area) localStorage.setItem(KEY, JSON.stringify(area));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the choice lasts until reload */
  }
  listeners.forEach((l) => l());
}

export const useArea = (): Area | null =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getArea,
  );
