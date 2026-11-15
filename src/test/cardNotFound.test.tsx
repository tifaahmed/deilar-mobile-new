import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const auth = vi.hoisted(() => ({ fetchCard: vi.fn(), cardPhoneHint: vi.fn(), requestCardOtp: vi.fn(), requestCardPhone: vi.fn(), phoneHasCard: vi.fn(), requestOtp: vi.fn(), verifyOtp: vi.fn() }));

vi.mock('../api/auth', () => auth);
vi.mock('../api/orders', () => ({ claimOrders: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { ApiError } from '../api/http';
import { AccessModal } from '../components/AccessModal';
import { LanguageProvider } from '../context/LanguageContext';
import { getSession, updateSession } from '../utils/session';

describe('card number that does not exist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSession({ pendingCard: '99999' });
  });

  it('says so, forgets the stale card and offers a new account', async () => {
    const user = userEvent.setup();
    auth.fetchCard.mockRejectedValue(new ApiError('no card', 404, 'unknown_card'));
    render(
      <LanguageProvider>
        <AccessModal onClose={vi.fn()} initialStep="card" />
      </LanguageProvider>,
    );

    await user.clear(screen.getByPlaceholderText('1234'));
    await user.type(screen.getByPlaceholderText('1234'), '99999');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Membership number not found')).toBeInTheDocument();
    expect(getSession().pendingCard).toBeUndefined();

    await user.click(screen.getByTestId('create-new-account'));
    expect(screen.getByText('Enter your phone number')).toBeInTheDocument();
  });
});
