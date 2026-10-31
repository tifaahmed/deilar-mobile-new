import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fam = vi.hoisted(() => ({ addFamilyMember: vi.fn() }));
vi.mock('../api/family', async (orig) => ({ ...(await orig<typeof import('../api/family')>()), addFamilyMember: fam.addFamilyMember }));
vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddMemberForm } from '../components/AddMemberForm';

const png = (n: string) => new File(['x'], n, { type: 'image/png' });
const setup = (onSent = vi.fn()) => {
  const { container } = render(<AddMemberForm token="t" isAr isDark={false} onCancel={() => {}} onSent={onSent} />);
  const text = container.querySelectorAll('input[type="text"]');
  const files = container.querySelectorAll('input[type="file"]');
  return { container, name: text[0], nid: text[1], files };
};
const fill = (c: ReturnType<typeof setup>, phone?: string) => {
  fireEvent.change(c.name, { target: { value: 'Mona Hassan' } });
  fireEvent.change(c.nid, { target: { value: '29001011234567' } });
  c.files.forEach((f, i) => fireEvent.change(f, { target: { files: [png(`p${i}.png`)] } }));
  if (phone !== undefined) fireEvent.change(screen.getByLabelText('رقم الهاتف'), { target: { value: phone } });
};

describe('adding a relative other than a child', () => {
  beforeEach(() => { vi.clearAllMocks(); fam.addFamilyMember.mockResolvedValue(undefined); });

  it('stays disabled until the name, ID and the three pictures are given', () => {
    const c = setup();
    const send = screen.getByRole('button', { name: /إرسال للموافقة/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(c.name, { target: { value: 'Mona' } });
    expect(send.disabled).toBe(true);
    fill(c);
    expect(send.disabled).toBe(false);
  });

  it('refuses a phone that is too short, and letters never get into the field', () => {
    const c = setup();
    fill(c, '123');
    const send = screen.getByRole('button', { name: /إرسال للموافقة/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('رقم الهاتف'), { target: { value: 'abc' } });
    expect((screen.getByLabelText('رقم الهاتف') as HTMLInputElement).value).toBe('');
    expect(send.disabled).toBe(false);
  });

  it('posts the phone with the picture fields', async () => {
    const c = setup();
    fill(c, '01012345678');
    fireEvent.click(screen.getByRole('button', { name: /إرسال للموافقة/ }));
    await waitFor(() => expect(fam.addFamilyMember).toHaveBeenCalledTimes(1));
    const body = fam.addFamilyMember.mock.calls[0][1] as FormData;
    expect(body.get('phone')).toBe('01012345678');
    expect(body.get('national_id')).toBe('29001011234567');
    expect(body.get('id_front')).toBeInstanceOf(File);
    expect(body.get('photo')).toBeInstanceOf(File);
  });

  it('leaves the phone out when it is empty', async () => {
    const c = setup();
    fill(c);
    fireEvent.click(screen.getByRole('button', { name: /إرسال للموافقة/ }));
    await waitFor(() => expect(fam.addFamilyMember).toHaveBeenCalled());
    expect((fam.addFamilyMember.mock.calls[0][1] as FormData).has('phone')).toBe(false);
  });
});
