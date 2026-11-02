import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn(), apiPut: vi.fn(), apiPatch: vi.fn() }));
vi.mock('../api/http', async (orig) => ({ ...(await orig<typeof import('../api/http')>()), ...http, setApiLanguage: vi.fn() }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileView } from '../components/ProfileView';
import { LanguageProvider } from '../context/LanguageContext';
import { clearSession, updateSession } from '../utils/session';

const account = (signedIn: boolean) => ({ name: 'Mona', phone: '01012345678', number: '123456', validTo: null, signedIn });
const show = (signedIn: boolean, onSectionChange = vi.fn()) => {
  render(
    <LanguageProvider>
      <ProfileView mode="account" account={account(signedIn)} onLogout={() => {}} beneficiaries={[{ id: 'b1', name: 'Mona', relation: 'حامل الكارت الرئيسي', nationalId: '', dob: '', cardNumber: '123456', status: 'active' }]} onSignIn={() => {}} section={null} onSectionChange={onSectionChange} />
    </LanguageProvider>,
  );
  return onSectionChange;
};

describe('the account list has a wallet row', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); clearSession();
    for (const fn of Object.values(http)) fn.mockRejectedValue(new Error('offline'));
  });

  it('shows «محفظتي» to a signed-in member and opens the wallet page from it', () => {
    updateSession({ token: 'tok' });
    const onSectionChange = show(true);
    fireEvent.click(screen.getByRole('button', { name: /محفظتي/ }));
    expect(onSectionChange).toHaveBeenCalledWith('wallet');
  });

  it('does not offer a wallet to someone who is not signed in', () => {
    show(false);
    expect(screen.queryByRole('button', { name: /محفظتي/ })).toBeNull();
  });
});
