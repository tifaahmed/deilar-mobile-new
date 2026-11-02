import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReferProviderButton, NUDGE_EVERY_MS, NUDGE_FIRST_MS, NUDGE_SHOWN_MS } from '../components/ReferProviderButton';
import { LanguageProvider } from '../context/LanguageContext';

const show = () => render(<LanguageProvider><ReferProviderButton /></LanguageProvider>);
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('the label beside the recommend-a-provider icon', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('shows itself every few minutes, stays a few seconds, and goes away by itself', () => {
    localStorage.setItem('deilar_language', 'ar');
    show();
    expect(screen.queryByTestId('referral-nudge')).toBeNull();
    tick(NUDGE_FIRST_MS);
    expect(screen.getByTestId('referral-nudge').textContent).toBe('رشّح مقدم خدمة عايز عليه خصم');
    tick(NUDGE_SHOWN_MS);
    expect(screen.queryByTestId('referral-nudge')).toBeNull();
    tick(NUDGE_EVERY_MS - NUDGE_FIRST_MS - NUDGE_SHOWN_MS + 1); // the second one comes at NUDGE_EVERY_MS
    expect(screen.getByTestId('referral-nudge')).toBeTruthy();
  });

  it('speaks English in an English app and opens the form when tapped', () => {
    localStorage.setItem('deilar_language', 'en');
    show();
    tick(NUDGE_FIRST_MS);
    const nudge = screen.getByTestId('referral-nudge');
    expect(nudge.textContent).toBe('Recommend a provider you want a discount on');
    fireEvent.click(nudge);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByTestId('referral-nudge')).toBeNull();
  });

  it('is a coloured badge-with-percent button, not the maroon gift', () => {
    show();
    const btn = screen.getByRole('button', { name: /Recommend a provider|رشّح مقدم خدمة/ });
    expect(btn.className).not.toContain('941946');
    expect(btn.className).toContain('orange');
  });
});
