import { beforeEach, describe, expect, it, vi } from 'vitest';

const mark = vi.fn();
let token: string | undefined = 'tok';
vi.mock('../api/referral', () => ({ markReferralShared: (t: string) => mark(t) }));
vi.mock('../utils/session', () => ({ getSession: () => ({ token }) }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { ApiError } from '../api/http';
import { registerReferralShare } from '../utils/referralShare';
import { shareBonusToday } from '../utils/quizLimit';

describe('registerReferralShare', () => {
  beforeEach(() => {
    localStorage.clear();
    mark.mockReset();
    token = 'tok';
  });

  it('stores the bonus the backend granted and says so', async () => {
    mark.mockResolvedValue({ granted: true, bonus_plays_today: 1, refills_left_today: 0, plays_per_day: 1 });
    expect(await registerReferralShare()).toBe('granted');
    expect(shareBonusToday()).toBe(1);
  });

  it('says the refill was already used when the backend did not grant', async () => {
    mark.mockResolvedValue({ granted: false, bonus_plays_today: 1, refills_left_today: 0, plays_per_day: 1 });
    expect(await registerReferralShare()).toBe('used');
  });

  it('never throws: referrals off or a failed call just says nothing', async () => {
    mark.mockRejectedValue(new ApiError('off', 409, 'disabled'));
    expect(await registerReferralShare()).toBe('none');
    mark.mockRejectedValue(new Error('offline'));
    expect(await registerReferralShare()).toBe('none');
  });

  it('does not call the backend when signed out', async () => {
    token = undefined;
    expect(await registerReferralShare()).toBe('none');
    expect(mark).not.toHaveBeenCalled();
  });
});
