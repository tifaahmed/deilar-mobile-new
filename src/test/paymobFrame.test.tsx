import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const native = vi.hoisted(() => ({ on: false }));
const open = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@capacitor/core', async (orig) => ({ ...(await orig<typeof import('@capacitor/core')>()), Capacitor: { isNativePlatform: () => native.on } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open } }));

import { PaymobFrame } from '../components/PaymobFrame';
import { LanguageProvider } from '../context/LanguageContext';

describe('the wallet payment page', () => {
  afterEach(() => { native.on = false; open.mockClear(); });

  it('is framed in a browser', () => {
    const { container } = render(<LanguageProvider><PaymobFrame url="https://pay.example/x" onComplete={() => undefined} /></LanguageProvider>);
    expect(container.querySelector('iframe')).toBeTruthy();
  });

  it('opens in the in-app browser, never framed, in the installed app', async () => {
    native.on = true;
    const { container } = render(<LanguageProvider><PaymobFrame url="https://pay.example/x" onComplete={() => undefined} /></LanguageProvider>);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByTestId('paymob-native')).toBeTruthy();
    await waitFor(() => expect(open).toHaveBeenCalledWith({ url: 'https://pay.example/x' }));
  });

  it('puts the viewport back to no-zoom when it goes away, then restores the meta', () => {
    vi.useFakeTimers();
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.append(meta);
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    const { unmount } = render(<LanguageProvider><PaymobFrame url="https://pay.example/x" onComplete={() => undefined} /></LanguageProvider>);
    unmount();
    expect(meta.content).toContain('maximum-scale=1.0');
    vi.advanceTimersByTime(400);
    expect(meta.content).toBe('width=device-width, initial-scale=1.0');
    vi.useRealTimers();
    meta.remove();
  });
});
