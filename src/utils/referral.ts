import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ApiError, apiPost } from '../api/http';
import { claimReferral } from '../api/referral';
import { reportClientError } from './reportError';

/**
 * The referral code is the REFERRER'S CARD NUMBER. It arrives from a shared link (`https://…/r/<number>`, or `?ref=<number>`), is kept on
 * the phone until the member signs in, and is then sent to `POST /referral/claim`. The backend decides everything else (who may be
 * referred, the 10 / 40 / 50 pounds) — see CLAUDE.md contract item 18.
 */
const KEY = 'deilar_referral_code';
const CODE = /^[A-Za-z0-9-]{3,32}$/;

/** The code inside a link or a query string, or null. A sign-up placeholder (`REG-…`) is never a code. */
export function parseReferralCode(input: string): string | null {
  let value: string | null = null;
  try {
    const url = new URL(input, 'https://deilar.invalid');
    value = url.searchParams.get('ref') ?? url.pathname.match(/\/r\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    value = null;
  }
  value = value ? decodeURIComponent(value).trim() : null;
  return value && CODE.test(value) && !/^REG-/i.test(value) ? value : null;
}

export function pendingReferralCode(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberReferralCode(code: string): void {
  if (!CODE.test(code)) return;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* storage unavailable: the code is simply not kept */
  }
}

export function clearReferralCode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** The message a refused code is shown with. */
export function referralReasonText(reason: string | undefined, isAr = true): string {
  const ar: Record<string, string> = {
    not_found: 'مفيش كارت بالرقم ده. راجع الرقم.',
    self: 'مينفعش تستخدم رقم كارتك إنت.',
    mutual: 'العضو ده إنت اللي جبته، فمينفعش يبقى هو اللي جابك.',
    already_referred: 'سجّلت قبل كده مين جابك.',
    too_late: 'فات الوقت المسموح لإضافة الكود.',
    already_paid: 'الكود بيتضاف قبل أول اشتراك بس.',
    disabled: 'الدعوات متوقفة حالياً.',
  };
  const en: Record<string, string> = {
    not_found: 'There is no card with this number. Check it.',
    self: 'You cannot use your own card number.',
    mutual: 'You brought this member, so they cannot bring you.',
    already_referred: 'You already told us who brought you.',
    too_late: 'The time to add a code has passed.',
    already_paid: 'A code can only be added before your first subscription.',
    disabled: 'Invitations are not available right now.',
  };
  return (isAr ? ar : en)[reason ?? ''] ?? (isAr ? 'تعذّر استخدام الكود.' : 'The code could not be used.');
}

/**
 * Sends the code kept on the phone, if any. A definite answer from the backend (accepted, or refused for a reason) clears it; a
 * network failure keeps it for the next try. Resolves to the discount in pounds when it was accepted, else null.
 */
export async function claimPendingReferral(token: string): Promise<number | null> {
  const code = pendingReferralCode();
  if (!code) return null;

  try {
    const { discount } = await claimReferral(token, code, 'link');
    clearReferralCode();
    return discount;
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) clearReferralCode();
    else reportClientError('Referral claim failed', error);
    return null;
  }
}

const MATCHED_KEY = 'deilar_referral_matched';

/**
 * The first launch after an install: asks the backend which invitation link was tapped from THIS connection in the last day (the site
 * told it when the visitor tapped `/r/<number>` and was sent to the store). One answer only — a definite reply, with a code or without,
 * ends the asking; a network failure is retried on the next launch. Never overrides a code the phone already holds.
 */
export async function matchInstallReferral(): Promise<void> {
  try {
    if (localStorage.getItem(MATCHED_KEY)) return;
  } catch {
    return;
  }

  try {
    const { data } = await apiPost<{ data: { code: string | null } }>('/mobile/referral/match', {});
    if (data.code && !pendingReferralCode()) rememberReferralCode(data.code);
    try {
      localStorage.setItem(MATCHED_KEY, '1');
    } catch {
      /* storage unavailable: asked again next launch, harmless */
    }
  } catch (error) {
    if (error instanceof ApiError) {
      try {
        localStorage.setItem(MATCHED_KEY, '1');
      } catch {
        /* nothing to keep */
      }
    }
  }
}

/** At start-up: a link that opened the app (or the web build) leaves its code on the phone. */
export function captureReferralLinks(): void {
  const fromHere = parseReferralCode(window.location.href);
  if (fromHere) rememberReferralCode(fromHere);

  if (!Capacitor.isNativePlatform()) return;

  void CapacitorApp.getLaunchUrl().then((launch) => {
    const code = launch?.url ? parseReferralCode(launch.url) : null;
    if (code) rememberReferralCode(code);
  }).catch(() => undefined).then(() => matchInstallReferral());

  void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    const code = parseReferralCode(url);
    if (code) rememberReferralCode(code);
  });
}
