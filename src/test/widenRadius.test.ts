import { describe, expect, it } from 'vitest';
import { nextWiderRadius, radiusToTryNext } from '../utils/widenRadius';

const base = { armed: true, loaded: true, pinCount: 0, searching: false, current: 1 };

describe('the map widens its range when the picked kind of place is not near', () => {
  it('goes up one step at a time and ends at everywhere', () => {
    expect(nextWiderRadius(1)).toBe(2);
    expect(nextWiderRadius(2)).toBe(3);
    expect(nextWiderRadius(100)).toBe(0);
    expect(nextWiderRadius(0)).toBeNull();
    expect(nextWiderRadius(7)).toBe(10);
  });

  it('widens a 1 km circle that is empty after the type changed', () => {
    expect(radiusToTryNext(base)).toBe(2);
    expect(radiusToTryNext({ ...base, current: 2 })).toBe(3);
  });

  it('stops once something is found, while loading, when not armed, or when searching', () => {
    expect(radiusToTryNext({ ...base, pinCount: 3, current: 3 })).toBeNull();
    expect(radiusToTryNext({ ...base, loaded: false })).toBeNull();
    expect(radiusToTryNext({ ...base, armed: false })).toBeNull();
    expect(radiusToTryNext({ ...base, searching: true })).toBeNull();
    expect(radiusToTryNext({ ...base, current: 0 })).toBeNull();
  });
});
