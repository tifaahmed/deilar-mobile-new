import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SyncChip } from '../components/QuizGame';

describe('SyncChip', () => {
  it('says «محفوظة» with an icon and explains itself when tapped', () => {
    render(<SyncChip synced signedIn />);
    expect(screen.getByText('محفوظة')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toContain('حسابك على السيرفر');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says it is only on the device, and the explanation differs for a guest and a signed-in player', () => {
    const { unmount } = render(<SyncChip synced={false} signedIn />);
    expect(screen.getByText('على الجهاز')).toBeTruthy();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toContain('أول ما يتوفر اتصال');
    unmount();

    render(<SyncChip synced={false} signedIn={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('status').textContent).toContain('لم تسجّل الدخول');
  });
});
