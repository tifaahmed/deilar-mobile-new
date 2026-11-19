import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('../router', () => ({ navigate: nav.navigate }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { act, fireEvent, render, screen } from '@testing-library/react';
import { ShareUnlockButton } from '../components/ShareUnlock';
import { applyShareState, dayKey } from '../utils/quizLimit';
import { clearSession, updateSession } from '../utils/session';

describe('share to unlock again', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); });

  it('shows nothing when signed out (a code needs a card)', () => {
    const { container } = render(<ShareUnlockButton />);
    expect(container.innerHTML).toBe('');
  });

  it('is a visible button that goes straight to the invite screen while a refill is available or unknown', () => {
    updateSession({ token: 'tok' });
    render(<ShareUnlockButton />);
    const btn = screen.getByTestId('quiz-share-unlock');
    expect(btn.textContent).toContain('شارك كود الإحالة وافتح المحاولات تاني');
    fireEvent.click(btn);
    expect(nav.navigate).toHaveBeenCalledWith('/account/invite');
  });

  it('turns into the polite "already used today" note only when no refill is left', () => {
    updateSession({ token: 'tok' });
    render(<ShareUnlockButton />);
    expect(screen.queryByTestId('quiz-share-used')).toBeNull();

    act(() => applyShareState({ bonus_plays_today: 1, refills_left_today: 0 }));

    expect(screen.queryByTestId('quiz-share-unlock')).toBeNull();
    expect(screen.getByTestId('quiz-share-used').textContent).toContain('بكرة');
  });

  it('a new day brings the button back (the stored refill count is per day)', () => {
    updateSession({ token: 'tok' });
    localStorage.setItem('deilar_quiz_share_bonus', JSON.stringify({ day: '2000-01-01', bonus: 1, left: 0 }));
    expect(dayKey()).not.toBe('2000-01-01');
    render(<ShareUnlockButton />);
    expect(screen.getByTestId('quiz-share-unlock')).toBeTruthy();
  });
});
