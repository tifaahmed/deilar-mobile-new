import { describe, expect, it } from 'vitest';
import { isSameSpot } from '../utils/gps';

describe('isSameSpot', () => {
  it('treats the same fix and a very near one as the same place, a far one not', () => {
    const home = { lat: 30.0444, lng: 31.2357 };
    expect(isSameSpot(home, home)).toBe(true);
    expect(isSameSpot(home, { lat: 30.0448, lng: 31.2359 })).toBe(true); // ~50 m
    expect(isSameSpot(home, { lat: 30.06, lng: 31.25 })).toBe(false); // ~2 km
  });
});
