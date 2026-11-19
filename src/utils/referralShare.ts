import { ApiError } from '../api/http';
import { markReferralShared } from '../api/referral';
import { applyShareState } from './quizLimit';
import { reportClientError } from './reportError';
import { getSession } from './session';

/** What a share did for the quiz: plays unlocked, today's refill already used, or nothing worth saying (referrals off, signed out, offline). */
export type ShareOutcome = 'granted' | 'used' | 'none';

/**
 * Tells the backend the member shared their referral code, so today's quiz plays come back on every section. Fire and forget:
 * it never throws and must never get in the way of the share itself. A share cannot be verified, so the backend caps the
 * refills a day (an admin setting) — the app only draws the answer.
 */
export async function registerReferralShare(): Promise<ShareOutcome> {
  const token = getSession().token;
  if (!token) return 'none';

  try {
    const r = await markReferralShared(token);
    applyShareState(r);
    return r.granted ? 'granted' : 'used';
  } catch (error) {
    // 409 `disabled` = referrals are off; anything offline is silent. Other failures are worth a log, never a message.
    if (!(error instanceof ApiError) || (error.status >= 500)) reportClientError('Referral share refill failed', error);
    return 'none';
  }
}
