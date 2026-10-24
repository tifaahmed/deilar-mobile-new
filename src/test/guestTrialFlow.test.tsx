import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const auth = vi.hoisted(() => ({
  phoneHasCard: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  fetchCard: vi.fn(),
}));
const membership = vi.hoisted(() => ({ startTrial: vi.fn() }));
const contact = vi.hoisted(() => ({ postContactMessage: vi.fn() }));

vi.mock('../api/auth', () => auth);
vi.mock('../api/membership', () => membership);
vi.mock('../api/orders', () => ({ claimOrders: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));
vi.mock('../api/http', async (orig) => ({ ...(await orig<typeof import('../api/http')>()), postContactMessage: contact.postContactMessage }));

import { ApiError } from '../api/http';
import { AccessModal } from '../components/AccessModal';
import { LanguageProvider } from '../context/LanguageContext';
import { getSession } from '../utils/session';

const PHONE = '01012345678';
const ID = '29001011234567';

const open = (onClose = vi.fn(), step: 'visitor' | 'choose' | 'phone' = 'visitor') => {
  render(
    <LanguageProvider>
      <AccessModal onClose={onClose} initialStep={step} />
    </LanguageProvider>,
  );
  return onClose;
};

/** Fills the "new visitor" form and submits it. */
async function submitVisitor(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Name'), 'Mona Hassan');
  await user.type(screen.getByPlaceholderText('010xxxxxxxx'), PHONE);
  await user.click(screen.getByRole('button', { name: 'Submit' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  contact.postContactMessage.mockResolvedValue(undefined);
  auth.requestOtp.mockResolvedValue({ phone_masked: '010****678', registering: true, code_length: 4, expires_in: 300, resend_after: 60 });
  auth.verifyOtp.mockResolvedValue({ token: 'tok-1', user: { id: 1, name: null, phone: PHONE }, membership: { membership_number: 'REG-ABC', is_active: false, expiration_date: null } });
  membership.startTrial.mockResolvedValue({ membership_number: '4821', days_left: 30 });
});

describe('guest → free trial card', () => {
  it('walks a new number through offer, confirm and code, then sends them to the card page', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(false);
    const onClose = open();

    await submitVisitor(user);

    // The lead is still sent, then the number is checked and the free card is offered.
    expect(contact.postContactMessage).toHaveBeenCalledWith(expect.objectContaining({ phone: PHONE, name: 'Mona Hassan' }));
    expect(auth.phoneHasCard).toHaveBeenCalledWith(PHONE);
    expect(await screen.findByText('Do you want to complete the process?')).toBeInTheDocument();
    expect(screen.getByText(/free for one month/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Yes → the form holds what was already typed; nothing is sent until it is confirmed.
    await user.click(screen.getByRole('button', { name: /Yes, get my free card/ }));
    expect(screen.getByPlaceholderText('Name')).toHaveValue('Mona Hassan');
    expect(screen.getByPlaceholderText('010xxxxxxxx')).toHaveValue(PHONE);
    expect(auth.requestOtp).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Confirm & send verification code/ }));
    expect(auth.requestOtp).toHaveBeenCalledWith(PHONE);

    // A correct code signs the user in but issues no card: the popup closes and the card PAGE takes over (no form in the popup).
    await user.type(await screen.findByPlaceholderText('••••'), '1234');
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith(PHONE, '1234'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(window.location.pathname).toBe('/card');
    expect(screen.queryByText('Last step: phone, gender and national ID')).not.toBeInTheDocument();
    expect(membership.startTrial).not.toHaveBeenCalled();
    expect(getSession().token).toBe('tok-1');
    expect(getSession().name).toBe('Mona Hassan');
    expect(getSession().cardNumber).toBeUndefined();
  });

  it('does not offer a trial to a phone that already holds a card', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(true);
    const onClose = open();

    await submitVisitor(user);

    // No silent close: the number is asked for its code so the member is signed in, and no trial is offered.
    expect(await screen.findByPlaceholderText('••••')).toBeInTheDocument();
    expect(auth.requestOtp).toHaveBeenCalledWith(PHONE);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Do you want to complete the process?')).not.toBeInTheDocument();
  });

  it('says so when the phone lookup fails, instead of closing without an answer', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockRejectedValue(new ApiError('down', 0));
    const onClose = open();

    await submitVisitor(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check the number right now');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('"Not now" ends the offer without sending a code', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(false);
    const onClose = open();

    await submitVisitor(user);
    await user.click(await screen.findByRole('button', { name: 'Not now' }));

    expect(onClose).toHaveBeenCalled();
    expect(auth.requestOtp).not.toHaveBeenCalled();
  });

  it('a wrong code keeps the visitor on the code step and issues nothing', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(false);
    auth.verifyOtp.mockRejectedValue(new ApiError('wrong', 422, 'invalid_code'));
    open();

    await submitVisitor(user);
    await user.click(await screen.findByRole('button', { name: /Yes, get my free card/ }));
    await user.click(screen.getByRole('button', { name: /Confirm & send verification code/ }));
    await user.type(await screen.findByPlaceholderText('••••'), '0000');

    expect(await screen.findByRole('alert')).toHaveTextContent('wrong');
    expect(screen.queryByText('Last step: phone, gender and national ID')).not.toBeInTheDocument();
    expect(membership.startTrial).not.toHaveBeenCalled();
  });

  it('a number that turns out to hold a real card at sign-in skips the trial steps', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(false);
    auth.verifyOtp.mockResolvedValue({ token: 'tok-2', user: { id: 2, name: 'Mona', phone: PHONE }, membership: { membership_number: '777', is_active: true, expiration_date: null } });
    open();

    await submitVisitor(user);
    await user.click(await screen.findByRole('button', { name: /Yes, get my free card/ }));
    await user.click(screen.getByRole('button', { name: /Confirm & send verification code/ }));
    await user.type(await screen.findByPlaceholderText('••••'), '1234');

    expect(await screen.findByText('Welcome Mona')).toBeInTheDocument();
    expect(membership.startTrial).not.toHaveBeenCalled();
  });
  it('sign in with a phone: an existing member is logged in automatically after the code', async () => {
    const user = userEvent.setup();
    auth.verifyOtp.mockResolvedValue({ token: 'tok-9', user: { id: 9, name: 'Mona Hassan', phone: PHONE }, membership: { membership_number: '4821', is_active: true, expiration_date: '2027-01-01' } });
    const onClose = open(vi.fn(), 'phone');

    await user.type(screen.getByPlaceholderText('010xxxxxxxx'), PHONE);
    await user.click(screen.getByRole('button', { name: /Send verification code/ }));
    expect(auth.requestOtp).toHaveBeenCalledWith(PHONE);
    await user.type(await screen.findByPlaceholderText('••••'), '1234');

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 4000 });
    expect(getSession().token).toBe('tok-9');
    expect(membership.startTrial).not.toHaveBeenCalled();
  });

  it('sign in with a phone: a new number goes straight to the card page after the code', async () => {
    const user = userEvent.setup();
    const onClose = open(vi.fn(), 'phone');

    await user.type(screen.getByPlaceholderText('010xxxxxxxx'), PHONE);
    await user.click(screen.getByRole('button', { name: /Send verification code/ }));
    await user.type(await screen.findByPlaceholderText('••••'), '1234');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(window.location.pathname).toBe('/card');
    expect(membership.startTrial).not.toHaveBeenCalled();
    expect(getSession().token).toBe('tok-1');
  });
});
