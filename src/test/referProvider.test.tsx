import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('../api/http', async (orig) => ({ ...(await orig<typeof import('../api/http')>()), postContactMessage: post }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReferProviderButton } from '../components/ReferProviderButton';
import { LanguageProvider } from '../context/LanguageContext';
import { clearSession, updateSession } from '../utils/session';
import { isValidProviderPhone, referralMessage } from '../utils/providerReferral';

const show = () => render(<LanguageProvider><ReferProviderButton /></LanguageProvider>);
const open = () => fireEvent.click(screen.getByRole('button', { name: /رشّح مقدم خدمة/ }));

describe('recommending a service provider', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); post.mockResolvedValue(undefined); });

  it('sends phone and optional name to the inbox under the referral subject', async () => {
    updateSession({ token: 't', name: 'Mona', phone: '01011112222', cardNumber: '123456' });
    show(); open();
    fireEvent.change(screen.getByLabelText('اسم مقدم الخدمة'), { target: { value: 'مطعم الأمل' } });
    fireEvent.change(screen.getByLabelText('رقم تليفون مقدم الخدمة'), { target: { value: '01099998888' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الترشيح' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const body = post.mock.calls[0][0];
    expect(body).toMatchObject({ phone: '01099998888', name: 'مطعم الأمل', subject: 'ترشيح عميل لمقدم خدمة', source: 'provider_referral' });
    expect(body.message).not.toContain('نوع المكان');
    expect(body.message).toContain('كارت 123456');
    expect(await screen.findByTestId('referral-sent')).toBeTruthy();
  });

  it('refuses a bad phone and sends nothing, and the name is optional', async () => {
    show(); open();
    expect(screen.queryByRole('button', { name: 'طبي' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الترشيح' }));
    expect((await screen.findByRole('alert')).textContent).toContain('تليفون');
    fireEvent.change(screen.getByLabelText('رقم تليفون مقدم الخدمة'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الترشيح' }));
    expect((await screen.findByRole('alert')).textContent).toContain('تليفون');
    fireEvent.change(screen.getByLabelText('رقم تليفون مقدم الخدمة'), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الترشيح' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0].name).toBeUndefined();
  });

  it('shows an error and keeps the form when the send fails', async () => {
    post.mockRejectedValue(new Error('down'));
    show(); open();
    fireEvent.change(screen.getByLabelText('اسم مقدم الخدمة'), { target: { value: 'عيادة النور' } });
    fireEvent.change(screen.getByLabelText('رقم تليفون مقدم الخدمة'), { target: { value: '0223334444' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الترشيح' }));
    expect((await screen.findByRole('alert')).textContent).toContain('مقدرناش نبعت');
    expect(screen.queryByTestId('referral-sent')).toBeNull();
  });

  it('builds the message and checks the phone', () => {
    expect(isValidProviderPhone('+20 101 234 5678')).toBe(true);
    expect(isValidProviderPhone('abc')).toBe(false);
    expect(referralMessage({ providerPhone: '01', from: {} })).toContain('تليفون مقدم الخدمة: 01');
  });
});
