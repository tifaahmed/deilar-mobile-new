/** "Within X km" steps the API accepts; 0 means no limit (nearest first, across the country). */
export const RADIUS_OPTIONS = [1, 2, 3, 4, 5, 10, 20, 30, 50, 100, 0];

/**
 * The range to try when nothing was found inside `current` km: the next step up, or null when there is none left
 * (0 = everywhere already). A range that is not a known step widens to the first step larger than it.
 */
export function nextWiderRadius(current: number): number | null {
  if (current === 0) return null;
  const bigger = RADIUS_OPTIONS.find((km) => km !== 0 && km > current);
  return bigger ?? 0;
}

/**
 * The map widens by itself while the chosen kind of place has no branch in range (a pharmacy-filled 1 km circle turned
 * into "clinics" stays empty until it grows). It stops at the first range that shows a pin, when a text search is typed
 * (an empty answer to a search is an answer), or at "everywhere".
 */
export function radiusToTryNext(opts: { armed: boolean; loaded: boolean; pinCount: number; searching: boolean; current: number }): number | null {
  if (!opts.armed || !opts.loaded || opts.pinCount > 0 || opts.searching) return null;
  return nextWiderRadius(opts.current);
}
