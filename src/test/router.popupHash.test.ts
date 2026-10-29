import { describe, expect, it } from 'vitest';
import { navigate } from '../router';

describe('navigate keeps an open popup in the URL', () => {
  it('replace carries #…-popup over, push does not', () => {
    window.history.replaceState(null, '', '/map?radius=1#new-visit-popup');
    navigate('/map?radius=2', { replace: true });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/map?radius=2#new-visit-popup');

    navigate('/map?radius=3');
    expect(window.location.hash).toBe('');
  });
});
