import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIGHT_SECONDS, LOGO_SECONDS, QuizLaunch } from '../components/QuizLaunch';

describe('QuizLaunch (the 1-2-3 lights and the Deilar logo before a play)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lights 1, 2, 3, says go, shows the logo and the name, then starts the quiz once', () => {
    const onDone = vi.fn();
    render(<QuizLaunch sound={false} onDone={onDone} />);

    act(() => { vi.advanceTimersByTime(10); });
    expect(screen.getByText('1')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(LIGHT_SECONDS * 1000); });
    expect(screen.getByText('2')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(LIGHT_SECONDS * 1000); });
    expect(screen.getByText('3')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(LIGHT_SECONDS * 1000); });
    expect(screen.getByText('انطلق!')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByText('ديلر')).toBeTruthy();
    expect(screen.getByAltText('Deilar')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(LOGO_SECONDS * 1000 + 100); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be skipped', () => {
    const onDone = vi.fn();
    render(<QuizLaunch sound={false} onDone={onDone} />);
    act(() => { screen.getByText('تخطي').click(); });
    expect(onDone).toHaveBeenCalled();
  });
});
