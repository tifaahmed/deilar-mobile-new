import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ fetchProfile: vi.fn() }));
vi.mock('../api/auth', () => auth);
vi.mock('../api/membership', () => ({ subscribe: vi.fn() }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { PayPage } from '../components/PayPage';
import { LanguageProvider } from '../context/LanguageContext';
import type { MemberStatus } from '../api/membership';

const status = { price: 1200, months: 12, can_pay_online: true, online_channels: ['card'], contact: {} } as unknown as MemberStatus;

const open = () =>
  render(
    <LanguageProvider>
      <PayPage token="tok" status={status} onDone={vi.fn()} />
    </LanguageProvider>,
  );

beforeEach(() => vi.clearAllMocks());

describe('payment page', () => {
  it('fills the email box with the email saved on the profile', async () => {
    auth.fetchProfile.mockResolvedValue({ email: 'mona@example.com' });
    open();

    await waitFor(() => expect(screen.getByPlaceholderText(/Email for your receipt/)).toHaveValue('mona@example.com'));
    expect(auth.fetchProfile).toHaveBeenCalledWith('tok');
  });

  it('leaves the box empty when the profile has no email', async () => {
    auth.fetchProfile.mockResolvedValue({ email: null });
    open();

    await waitFor(() => expect(auth.fetchProfile).toHaveBeenCalled());
    expect(screen.getByPlaceholderText(/Email for your receipt/)).toHaveValue('');
  });
});
