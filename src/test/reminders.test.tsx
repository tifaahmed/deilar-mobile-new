import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ fetchMembership: vi.fn() }));
const auth = vi.hoisted(() => ({ fetchProfile: vi.fn(), saveMemberArea: vi.fn() }));
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('../api/membership', () => api);
vi.mock('../api/auth', () => auth);
vi.mock('../router', () => ({ navigate: nav.navigate, routeHref: (r: { tab?: string }) => `/${r.tab ?? ''}` }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { MembershipReminder } from '../components/MembershipReminder';
import { SaveAreaPrompt } from '../components/SaveAreaPrompt';
import { LanguageProvider } from '../context/LanguageContext';
import { saveArea } from '../utils/area';
import { updateSession } from '../utils/session';

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

const status = (over: Record<string, unknown>) => ({
  has_card: true, state: 'trial', is_trial: true, expired: false, valid: true, expires_on: '2026-11-20', days_left: 12, price: 600, months: 12, can_pay_online: true,
  contact: {}, progress: { overall: { complete: true, percent: 100, missing: [] } }, ...over,
});

describe('MembershipReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    updateSession({ token: 'tok' });
  });
  afterEach(() => vi.useRealTimers());

  const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it('reminds a member on trial with the days left and the price', async () => {
    api.fetchMembership.mockResolvedValue(status({}));
    wrap(<MembershipReminder />);
    await tick(9_000);

    expect(await screen.findByText('You are on the free trial — 12 days left')).toBeInTheDocument();
    expect(screen.getByText(/pay its price \(600 EGP\)/)).toBeInTheDocument();
  });

  it('says an expired card gets no discount and pays the full price', async () => {
    api.fetchMembership.mockResolvedValue(status({ state: 'trial_expired', expired: true, valid: false, days_left: 0 }));
    wrap(<MembershipReminder />);
    await tick(9_000);

    expect(await screen.findByText('Your card has expired')).toBeInTheDocument();
    expect(screen.getByText(/no discount and pay the full price/)).toBeInTheDocument();
  });

  it('its pay button leads to the profile where the payment options live', async () => {
    api.fetchMembership.mockResolvedValue(status({}));
    wrap(<MembershipReminder />);
    await tick(9_000);

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(await screen.findByRole('button', { name: /Pay now/ }));
    expect(nav.navigate).toHaveBeenCalledWith('/profile');
  });

  it('comes back every minute until the member pays, and hides itself in between', async () => {
    api.fetchMembership.mockResolvedValue(status({}));
    wrap(<MembershipReminder />);
    await tick(9_000);
    expect(await screen.findByRole('status')).toBeInTheDocument();

    await tick(11_000); // 10 s on screen, then gone
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await tick(41_000); // the minute mark: it is back
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(api.fetchMembership.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('stays silent for a paid running card, a member with no card, and a guest', async () => {
    api.fetchMembership.mockResolvedValue(status({ state: 'active', is_trial: false }));
    const { unmount } = wrap(<MembershipReminder />);
    await tick(70_000);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    api.fetchMembership.mockResolvedValue(status({ has_card: false }));
    const second = wrap(<MembershipReminder />);
    await tick(70_000);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    second.unmount();

    updateSession({ token: undefined });
    api.fetchMembership.mockClear();
    wrap(<MembershipReminder />);
    await tick(70_000);
    expect(api.fetchMembership).not.toHaveBeenCalled();
  });

  it('shows the red notice for a paid card that lapsed too', async () => {
    api.fetchMembership.mockResolvedValue(status({ state: 'expired', is_trial: false, expired: true }));
    wrap(<MembershipReminder />);
    await tick(9_000);

    expect(await screen.findByText('Your card has expired')).toBeInTheDocument();
  });
});

describe('SaveAreaPrompt', () => {
  const profile = (over: Record<string, unknown> = {}) => ({ name: 'Mona', email: null, phone: '010', nationalId: null, governorateId: null, cityId: null, hasMembership: true, ...over });

  beforeEach(() => {
    vi.clearAllMocks();
    updateSession({ token: 'tok' });
    saveArea({ governorate: { id: 5, name: 'Giza' }, city: { id: 50, name: 'Dokki' } });
    auth.fetchProfile.mockResolvedValue(profile());
    auth.saveMemberArea.mockResolvedValue({});
  });

  it('offers to save the picked area when the card has none, and saves it on yes', async () => {
    const user = userEvent.setup();
    wrap(<SaveAreaPrompt />);

    expect(await screen.findByText('Save your location to your card?')).toBeInTheDocument();
    expect(screen.getByText(/Dokki، Giza/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes, save' }));

    expect(auth.saveMemberArea).toHaveBeenCalledWith('tok', { governorate_id: 5, city_id: 50 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('saves a governorate alone when no city was picked', async () => {
    saveArea({ governorate: { id: 7, name: 'Matrouh' } });
    const user = userEvent.setup();
    wrap(<SaveAreaPrompt />);

    await user.click(await screen.findByRole('button', { name: 'Yes, save' }));
    expect(auth.saveMemberArea).toHaveBeenCalledWith('tok', { governorate_id: 7, city_id: null });
  });

  it('offers it when only the city is missing', async () => {
    auth.fetchProfile.mockResolvedValue(profile({ governorateId: 5 }));
    wrap(<SaveAreaPrompt />);

    expect(await screen.findByText('Save your location to your card?')).toBeInTheDocument();
  });

  it('"Not now" is remembered for that area and not asked again', async () => {
    const user = userEvent.setup();
    const first = wrap(<SaveAreaPrompt />);
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(auth.saveMemberArea).not.toHaveBeenCalled();
    first.unmount();

    auth.fetchProfile.mockClear();
    wrap(<SaveAreaPrompt />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(auth.fetchProfile).not.toHaveBeenCalled();
  });

  it('asks again when the member picks a different area', async () => {
    const user = userEvent.setup();
    wrap(<SaveAreaPrompt />);
    await user.click(await screen.findByRole('button', { name: 'Not now' }));

    act(() => saveArea({ governorate: { id: 9, name: 'Aswan' } }));

    expect(await screen.findByText(/Aswan/)).toBeInTheDocument();
  });

  it('stays hidden when the card already has its area, for a guest, and for a member without a card row', async () => {
    auth.fetchProfile.mockResolvedValue(profile({ governorateId: 5, cityId: 50 }));
    const a = wrap(<SaveAreaPrompt />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    a.unmount();

    auth.fetchProfile.mockResolvedValue(profile({ hasMembership: false }));
    const b = wrap(<SaveAreaPrompt />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    b.unmount();

    updateSession({ token: undefined });
    auth.fetchProfile.mockClear();
    wrap(<SaveAreaPrompt />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(auth.fetchProfile).not.toHaveBeenCalled();
  });

  it('keeps the offer open with an error when saving fails', async () => {
    auth.saveMemberArea.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    wrap(<SaveAreaPrompt />);

    await user.click(await screen.findByRole('button', { name: 'Yes, save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
