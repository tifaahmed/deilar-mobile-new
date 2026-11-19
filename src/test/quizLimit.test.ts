import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { PLAYS_PER_DAY, dayKey, formatCountdown, lockedSections, markReopenedNotified, nextOpenAt, playsUsed, registerPlay, unseenReopened, useQuizLimit } from '../utils/quizLimit';

const FOOTBALL = 'mcq:football';
const FAWAZEER = 'mcq:fawazeer';

describe('daily plays per section', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 27, 15, 30, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('allows 1 play a day per section', () => {
    expect(PLAYS_PER_DAY).toBe(1);
  });

  it('counts each section on its own, so each section has its own single play', () => {
    for (let i = 0; i < 1; i++) registerPlay(FOOTBALL);

    expect(playsUsed(FOOTBALL)).toBe(1);
    expect(playsUsed(FAWAZEER)).toBe(0);
    expect(lockedSections([FOOTBALL, FAWAZEER])).toEqual([FOOTBALL]);

    for (let i = 0; i < 1; i++) registerPlay(FAWAZEER);
    expect(lockedSections([FOOTBALL, FAWAZEER])).toEqual([FOOTBALL, FAWAZEER]);
  });

  it('opens again at midnight, and counts down to it', () => {
    for (let i = 0; i < 1; i++) registerPlay(FOOTBALL);

    // It is 15:30: eight and a half hours to midnight.
    expect(nextOpenAt() - Date.now()).toBe(8.5 * 3600 * 1000);
    expect(formatCountdown(nextOpenAt() - Date.now())).toBe('08:30:00');

    vi.setSystemTime(new Date(2026, 9, 28, 0, 0, 1));
    expect(playsUsed(FOOTBALL)).toBe(0);
    expect(lockedSections([FOOTBALL])).toEqual([]);
    expect(dayKey()).toBe('2026-10-28');
  });

  it('shows the countdown ticking, and unlocks by itself when it reaches zero', () => {
    for (let i = 0; i < 1; i++) registerPlay(FOOTBALL);
    vi.setSystemTime(new Date(2026, 9, 27, 23, 59, 58));

    const { result } = renderHook(() => useQuizLimit(FOOTBALL));
    expect(result.current).toMatchObject({ used: 1, left: 0, locked: true });
    expect(formatCountdown(result.current.msLeft)).toBe('00:00:02');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toMatchObject({ used: 0, left: 1, locked: false, msLeft: 0 });
  });

  it('remembers a locked day that ended while the app was closed, and tells once', () => {
    for (let i = 0; i < 1; i++) registerPlay(FOOTBALL);
    // FAWAZEER was never played: nothing to announce for it

    expect(unseenReopened([FOOTBALL, FAWAZEER])).toEqual([]); // still the same day

    vi.setSystemTime(new Date(2026, 9, 28, 9, 0, 0));
    expect(unseenReopened([FOOTBALL, FAWAZEER])).toEqual([FOOTBALL]);

    markReopenedNotified([FOOTBALL]);
    expect(unseenReopened([FOOTBALL, FAWAZEER])).toEqual([]);
  });

  it('formats a countdown as HH:MM:SS', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(61_000)).toBe('00:01:01');
    expect(formatCountdown(3_661_000)).toBe('01:01:01');
    expect(formatCountdown(500)).toBe('00:00:01');
  });
});

import { allowanceToday, applyShareState, shareBonusToday } from '../utils/quizLimit';

describe('sharing the referral code refills the plays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 27, 15, 30, 0));
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('a granted share opens one more play on EVERY section for today only', () => {
    registerPlay(FOOTBALL);
    registerPlay(FAWAZEER);
    expect(lockedSections([FOOTBALL, FAWAZEER])).toEqual([FOOTBALL, FAWAZEER]);

    applyShareState({ bonus_plays_today: 1, refills_left_today: 0 });

    expect(allowanceToday()).toBe(PLAYS_PER_DAY + 1);
    expect(lockedSections([FOOTBALL, FAWAZEER])).toEqual([]);

    // The extra play is used too: locked again.
    registerPlay(FOOTBALL);
    expect(lockedSections([FOOTBALL, FAWAZEER])).toEqual([FOOTBALL]);

    // Midnight: the bonus is gone with the plays.
    vi.setSystemTime(new Date(2026, 9, 28, 0, 0, 1));
    expect(shareBonusToday()).toBe(0);
    expect(allowanceToday()).toBe(PLAYS_PER_DAY);
  });

  it('useQuizLimit unlocks the moment the bonus arrives', () => {
    registerPlay(FOOTBALL);
    const { result } = renderHook(() => useQuizLimit(FOOTBALL));
    expect(result.current.locked).toBe(true);

    act(() => applyShareState({ share_bonus_plays_today: 1, share_refills_left_today: 0 }));

    expect(result.current.locked).toBe(false);
    expect(result.current.left).toBe(1);
  });

  it('a reply without the new fields changes nothing', () => {
    applyShareState({ bonus_plays_today: 1 });
    applyShareState({});
    expect(shareBonusToday()).toBe(1);
  });
});
