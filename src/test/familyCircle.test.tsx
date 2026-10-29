import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FamilyCircle } from '../components/FamilyCircle';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('../api/family', async (orig) => ({
  ...(await orig<typeof import('../api/family')>()),
  fetchFamilyOverview: vi.fn().mockResolvedValue({
    role: 'primary',
    can_add_relatives: true,
    former: [],
    current: [
      { id: 1, name: 'Ahmed Ali', phone: '01062587475', phone_verified: true, avatar_url: null, membership_number: '100001', is_primary: true, is_me: true, relationship: null, relationship_label: null, is_active: true, approval_status: 'approved', points: 30, badges: [] },
      { id: 2, name: 'Omar Ahmed', phone: '01012345678', phone_verified: false, avatar_url: null, membership_number: '100002', national_id: '29901011234567', date_of_birth: '2015-05-05', is_primary: false, is_me: false, editable: true, relationship: 'son', relationship_label: 'Son', is_active: true, approval_status: 'approved', points: 10, badges: [] },
    ],
  }),
}));

describe('FamilyCircle accordion', () => {
  it('offers photo, edit and remove only on people the owner may change', async () => {
    render(<LanguageProvider><FamilyCircle token="t" dark={false} /></LanguageProvider>);
    await waitFor(() => expect(screen.getByText('Omar Ahmed')).toBeTruthy());

    fireEvent.click(screen.getByText('Ahmed Ali'));
    expect(screen.queryByText(/رفع \/ تغيير الصورة|Upload \/ change photo/)).toBeNull();

    fireEvent.click(screen.getByText('Omar Ahmed'));
    expect(screen.getByText(/رفع \/ تغيير الصورة|Upload \/ change photo/)).toBeTruthy();
    expect(screen.getByText(/تعديل \/ استكمال البيانات|Edit \/ complete data/)).toBeTruthy();
    expect(screen.getByText(/^حذف$|^Remove$/)).toBeTruthy();
  });

  it('shows only names until a person is opened', async () => {
    render(<LanguageProvider><FamilyCircle token="t" dark={false} /></LanguageProvider>);
    await waitFor(() => expect(screen.getByText('Omar Ahmed')).toBeTruthy());
    expect(screen.queryByText('01012345678')).toBeNull();

    fireEvent.click(screen.getByText('Omar Ahmed'));
    expect(screen.getByText('01012345678')).toBeTruthy();
    expect(screen.getByText(/not verified|غير موثق/)).toBeTruthy();
    expect(screen.getByText('29901011234567')).toBeTruthy();
    expect(screen.getByText('2015-05-05')).toBeTruthy();
    expect(screen.queryByText('01062587475')).toBeNull();
  });
});
