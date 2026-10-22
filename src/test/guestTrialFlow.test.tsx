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

const open = (onClose = vi.fn(), step: 'visitor' | 'choose' = 'visitor') => {
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
  it('walks a new number through offer, confirm, code, gender + ID and an active trial', async () => {
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

    // A correct code registers the user but issues no card yet: the next step is gender + ID.
    await user.type(await screen.findByPlaceholderText('••••'), '1234');
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith(PHONE, '1234'));
    expect(await screen.findByText('Last step: phone, gender and national ID')).toBeInTheDocument();
    expect(membership.startTrial).not.toHaveBeenCalled();
    expect(getSession().token).toBe('tok-1');
    expect(getSession().cardNumber).toBeUndefined();

    // The form shows the number the code just proved.
    expect(screen.getByPlaceholderText('010xxxxxxxx')).toHaveValue(PHONE);

    const activate = screen.getByRole('button', { name: 'Activate my free card' });
    expect(activate).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Female' }));
    expect(activate).toBeDisabled(); // an ID is still missing
    await user.type(screen.getByPlaceholderText('National ID (14 digits)'), '123');
    expect(activate).toBeDisabled(); // too short
    await user.clear(screen.getByPlaceholderText('National ID (14 digits)'));
    await user.type(screen.getByPlaceholderText('National ID (14 digits)'), ID);
    expect(activate).toBeEnabled();

    await user.click(activate);

    expect(membership.startTrial).toHaveBeenCalledWith('tok-1', { name: 'Mona Hassan', national_id: ID, gender: 'female' });
    expect(await screen.findByText('Welcome Mona Hassan')).toBeInTheDocument();
    expect(screen.getByText(/Your card 4821 is ready/)).toBeInTheDocument();
    expect(screen.getByText(/active for 30 days/)).toBeInTheDocument();
    expect(getSession().cardNumber).toBe('4821');
  });

  it('editing the phone in the last step asks for a new code before the card is made', async () => {
    const user = userEvent.setup();
    const OTHER = '01155556666';
    auth.phoneHasCard.mockResolvedValue(false);
    open();

    await submitVisitor(user);
    await user.click(await screen.findByRole('button', { name: /Yes, get my free card/ }));
    await user.click(screen.getByRole('button', { name: /Confirm & send verification code/ }));
    await user.type(await screen.findByPlaceholderText('••••'), '1234');
    await screen.findByText('Last step: phone, gender and national ID');
    expect(auth.requestOtp).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('radio', { name: 'Male' }));
    await user.type(screen.getByPlaceholderText('National ID (14 digits)'), ID);
    await user.clear(screen.getByPlaceholderText('010xxxxxxxx'));
    await user.type(screen.getByPlaceholderText('010xxxxxxxx'), OTHER);

    // A different number is a different proof: the button now verifies instead of activating.
    expect(screen.queryByRole('button', { name: 'Activate my free card' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verify the new number' }));

    await waitFor(() => expect(auth.requestOtp).toHaveBeenLastCalledWith(OTHER));
    expect(membership.startTrial).not.toHaveBeenCalled();

    auth.verifyOtp.mockResolvedValueOnce({ token: 'tok-2', user: { id: 2, name: null, phone: OTHER }, membership: { membership_number: 'REG-XYZ', is_active: false, expiration_date: null } });
    await user.type(await screen.findByPlaceholderText('••••'), '5678');
    await waitFor(() => expect(auth.verifyOtp).toHaveBeenLastCalledWith(OTHER, '5678'));

    // Back on the form with the proved number, and the card is made for THAT account.
    expect(await screen.findByPlaceholderText('010xxxxxxxx')).toHaveValue(OTHER);
    await user.click(screen.getByRole('radio', { name: 'Male' }));
    await user.type(screen.getByPlaceholderText('National ID (14 digits)'), ID);
    await user.click(screen.getByRole('button', { name: 'Activate my free card' }));
    expect(membership.startTrial).toHaveBeenCalledWith('tok-2', expect.objectContaining({ national_id: ID }));
  });

  it('does not offer a trial to a phone that already holds a card', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(true);
    const onClose = open();

    await submitVisitor(user);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByText('Do you want to complete the process?')).not.toBeInTheDocument();
  });

  it('just closes when the phone lookup fails, never trapping the visitor', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockRejectedValue(new ApiError('down', 0));
    const onClose = open();

    await submitVisitor(user);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
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

  it('shows the backend refusal when the ID already has a card', async () => {
    const user = userEvent.setup();
    auth.phoneHasCard.mockResolvedValue(false);
    membership.startTrial.mockRejectedValue(new ApiError('taken', 422, 'national_id_taken'));
    open();

    await submitVisitor(user);
    await user.click(await screen.findByRole('button', { name: /Yes, get my free card/ }));
    await user.click(screen.getByRole('button', { name: /Confirm & send verification code/ }));
    await user.type(await screen.findByPlaceholderText('••••'), '1234');
    await screen.findByText('Last step: phone, gender and national ID');
    await user.click(screen.getByRole('radio', { name: 'Male' }));
    await user.type(screen.getByPlaceholderText('National ID (14 digits)'), ID);
    await user.click(screen.getByRole('button', { name: 'Activate my free card' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This ID number already has a card');
    expect(getSession().cardNumber).toBeUndefined();
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
});
