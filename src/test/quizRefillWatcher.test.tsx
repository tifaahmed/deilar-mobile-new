import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiGetAuth: vi.fn(), apiPost: vi.fn() }));
vi.mock('../api/http', () => ({ apiGetAuth: http.apiGetAuth, apiPost: http.apiPost, apiGet: vi.fn(), ApiError: class ApiError extends Error { constructor(m: string, readonly status: number) { super(m); } } }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { act, render, screen } from '@testing-library/react';
import { QuizRefillWatcher, REFILL_POLL_MS } from '../components/QuizRefillWatcher';
import { applyShareState, dayKey, shareBonusToday } from '../utils/quizLimit';
import { refreshLoyalty } from '../utils/quizStore';
import { clearSession, updateSession } from '../utils/session';

const reply = (bonus: number, left = 0) => ({ data: { points: 0, badges: [], share_bonus_plays_today: bonus, share_refills_left_today: left } });

describe('quiz refill watcher', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear(); clearSession(); });
  afterEach(() => vi.useRealTimers());

  it('stays quiet when signed out (no request at all)', async () => {
    render(<QuizRefillWatcher />);
    await act(async () => { await vi.advanceTimersByTimeAsync(REFILL_POLL_MS * 2); });
    expect(http.apiGetAuth).not.toHaveBeenCalled();
  });

  it('reads GET /loyalty when it opens and then every minute, and stops when it leaves', async () => {
    updateSession({ token: 'tok' });
    http.apiGetAuth.mockResolvedValue(reply(0, 1));
    const { unmount } = render(<QuizRefillWatcher />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(http.apiGetAuth).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(REFILL_POLL_MS); });
    expect(http.apiGetAuth).toHaveBeenCalledTimes(2);
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(REFILL_POLL_MS * 3); });
    expect(http.apiGetAuth).toHaveBeenCalledTimes(2);
  });

  it('reads again when the app comes back to the foreground', async () => {
    updateSession({ token: 'tok' });
    http.apiGetAuth.mockResolvedValue(reply(0, 1));
    render(<QuizRefillWatcher />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(0); });
    expect(http.apiGetAuth).toHaveBeenCalledTimes(2);
  });

  it('never overlaps: a slow request is shared, not repeated', async () => {
    updateSession({ token: 'tok' });
    let release: (v: unknown) => void = () => {};
    http.apiGetAuth.mockReturnValue(new Promise((r) => { release = r; }));
    const a = refreshLoyalty();
    const b = refreshLoyalty();
    expect(http.apiGetAuth).toHaveBeenCalledTimes(1);
    release(reply(0, 1));
    await Promise.all([a, b]);
    http.apiGetAuth.mockResolvedValue(reply(0, 1));
    await refreshLoyalty();
    expect(http.apiGetAuth).toHaveBeenCalledTimes(2);
  });

  it('shows the notice once per increase, never on the first load', async () => {
    updateSession({ token: 'tok' });
    http.apiGetAuth.mockResolvedValueOnce(reply(1, 1));
    render(<QuizRefillWatcher />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(shareBonusToday()).toBe(1);
    expect(screen.queryByTestId('quiz-refill-notice')).toBeNull(); // first value of the day = a load

    http.apiGetAuth.mockResolvedValueOnce(reply(1, 1)); // unchanged
    await act(async () => { await vi.advanceTimersByTimeAsync(REFILL_POLL_MS); });
    expect(screen.queryByTestId('quiz-refill-notice')).toBeNull();

    http.apiGetAuth.mockResolvedValueOnce(reply(2, 1)); // a friend registered
    await act(async () => { await vi.advanceTimersByTimeAsync(REFILL_POLL_MS); });
    expect(screen.getByTestId('quiz-refill-notice').textContent).toContain('حد سجّل بكودك');
    expect(shareBonusToday()).toBe(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
    expect(screen.queryByTestId('quiz-refill-notice')).toBeNull();
  });

  it('a stored value from another day does not count as known', () => {
    localStorage.setItem('deilar_quiz_share_bonus', JSON.stringify({ day: '2000-01-01', bonus: 0, left: 1 }));
    const seen: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return import('../utils/quizLimit').then(({ onRefillGranted }) => {
      const off = onRefillGranted((n) => seen.push(n));
      applyShareState({ share_bonus_plays_today: 2, share_refills_left_today: 0 });
      off();
      expect(dayKey()).not.toBe('2000-01-01');
      expect(seen).toEqual([]);
    });
  });
});
