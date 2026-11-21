import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../utils/quizStore', async (orig) => ({ ...(await orig<typeof import('../utils/quizStore')>()), flushQuizAnswers: vi.fn().mockResolvedValue(undefined) }));

import { AccountsModal } from '../components/AccountsModal';
import { LanguageProvider } from '../context/LanguageContext';
import { MAX_ACCOUNTS, canAddAccount, clearSession, getAccounts, getSession, switchAccount, updateSession } from '../utils/session';

const signIn = (token: string, phone: string, name: string, cardNumber: string) => updateSession({ token, phone, name, cardNumber, leadPhone: phone });

describe('several accounts on one phone', () => {
  beforeEach(() => { localStorage.clear(); });

  it('keeps every signed-in account and switches with no code', () => {
    signIn('t1', '01011111111', 'Mona', '100001');
    signIn('t2', '01022222222', 'Omar', '100002');
    expect(getAccounts().map((a) => a.token)).toEqual(['t1', 't2']);
    expect(getSession().token).toBe('t2');

    expect(switchAccount('t1')).toBe(true);
    expect(getSession()).toMatchObject({ token: 't1', name: 'Mona', cardNumber: '100001' });
    expect(switchAccount('nope')).toBe(false);
  });

  it('signing out removes only the active account', () => {
    signIn('t1', '01011111111', 'Mona', '100001');
    signIn('t2', '01022222222', 'Omar', '100002');
    clearSession();
    expect(getSession().token).toBeUndefined();
    expect(getAccounts().map((a) => a.token)).toEqual(['t1']);
  });

  it('the same phone signing in again replaces its old entry', () => {
    signIn('t1', '01011111111', 'Mona', '100001');
    signIn('t9', '01011111111', 'Mona', '100001');
    expect(getAccounts().map((a) => a.token)).toEqual(['t9']);
  });

  it('the logout popup lists accounts, offers add, and switching needs no code', async () => {
    signIn('t1', '01011111111', 'Mona', '100001');
    signIn('t2', '01022222222', 'Omar', '100002');
    const onSwitched = vi.fn();
    const onAdd = vi.fn();
    render(<LanguageProvider><AccountsModal mode="logout" onClose={() => undefined} onAdd={onAdd} onSwitched={onSwitched} onLogout={() => undefined} /></LanguageProvider>);

    expect(screen.getByTestId('accounts-logout')).toBeTruthy();
    fireEvent.click(screen.getByTestId('account-100001'));
    await waitFor(() => expect(onSwitched).toHaveBeenCalled());
    expect(getSession().token).toBe('t1');
  });

  it('holds at most two accounts', () => {
    expect(MAX_ACCOUNTS).toBe(2);
    signIn('t1', '01011111111', 'Mona', '100001');
    expect(canAddAccount()).toBe(true);
    signIn('t2', '01022222222', 'Omar', '100002');
    expect(canAddAccount()).toBe(false);
    signIn('t3', '01033333333', 'Sara', '100003');
    expect(getAccounts().map((a) => a.token)).toEqual(['t2', 't3']);
  });

  it('the popup disables «add» and says why when two accounts are held', () => {
    signIn('t1', '01011111111', 'Mona', '100001');
    signIn('t2', '01022222222', 'Omar', '100002');
    render(<LanguageProvider><AccountsModal mode="switch" onClose={() => undefined} onAdd={vi.fn()} onSwitched={vi.fn()} onLogout={() => undefined} /></LanguageProvider>);
    expect((screen.getByTestId('accounts-add') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('accounts-full')).toBeTruthy();
  });

  it('with one account the popup offers «add»', () => {
    signIn('t1', '01011111111', 'Mona', '100001');
    const onAdd = vi.fn();
    render(<LanguageProvider><AccountsModal mode="logout" onClose={() => undefined} onAdd={onAdd} onSwitched={vi.fn()} onLogout={() => undefined} /></LanguageProvider>);
    fireEvent.click(screen.getByTestId('accounts-add'));
    expect(onAdd).toHaveBeenCalled();
  });
});
