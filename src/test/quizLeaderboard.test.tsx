import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/leaderboard', () => ({
  fetchLeaderboard: vi.fn().mockResolvedValue({
    top: [
      { rank: 1, name: 'محمد ع.', points: 900, me: false },
      { rank: 2, name: 'سارة ح.', points: 500, me: true },
      { rank: 4, name: 'عمر خ.', points: 50, me: false },
    ],
    me: { rank: 2, points: 500, players: 3 },
  }),
}));
vi.mock('../utils/session', () => ({ useSession: () => ({ token: 't', cardNumber: '123456' }) }));
vi.mock('../context/LanguageContext', () => ({ useIsAr: () => true }));

import { QuizLeaderboard } from '../components/QuizLeaderboard';

describe('the quiz leaderboard', () => {
  it('shows my place, every player and a cup beside the first three', async () => {
    render(<QuizLeaderboard />);
    expect(await screen.findByText(/ترتيبك 2 من 3 لاعب/)).toBeTruthy();
    expect(screen.getByText('محمد ع.')).toBeTruthy();
    expect(screen.getByText('عمر خ.')).toBeTruthy();
    expect(document.querySelectorAll('li').length).toBe(3);
    expect(document.body.textContent).toContain('🏆');
  });
});
