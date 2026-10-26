import React, { useEffect, useState } from 'react';
import { Clock, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchMembership, type MemberStatus } from '../api/membership';
import { navigate, routeHref } from '../router';
import { useSession } from '../utils/session';
import { usePopupHash } from '../utils/popupHash';
import { onMembershipChanged } from '../utils/membershipEvents';
import { Notice } from './Notice';

/** How often the reminder comes back while the card is on trial or expired. */
const EVERY_MS = 60_000;
/** How long one reminder stays on screen. */
const VISIBLE_MS = 10_000;

/**
 * The constant card reminder for a signed-in member:
 *  - on trial: "you are on the free trial, N days left — pay the card price for the full card";
 *  - expired (trial ended unpaid, or a paid card lapsed): "your card expired, no discounts, you pay full price".
 * Both lead to the profile, where the subscribe panel (Paymob, Vodafone Cash, Instapay + receipt) lives.
 * Whether the card is trial or expired is the backend's call (`status.is_trial` / `status.expired`);
 * a paid, running card and a guest never see this.
 */
export const MembershipReminder: React.FC = () => {
  const { isAr } = useLanguage();
  const session = useSession();
  const [status, setStatus] = useState<MemberStatus | null>(null);
  const token = session.token;

  useEffect(() => {
    if (!token) {
      setStatus(null);
      return;
    }

    let hide: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const tick = async () => {
      if (!alive || document.visibilityState === 'hidden') return;

      try {
        const current = await fetchMembership(token);
        if (!alive) return;

        // Paid (or no card): the trial/expired notice must go away now, not whenever its timer runs out.
        if (!current.has_card || (!current.expired && !current.is_trial)) {
          clearTimeout(hide);
          setStatus(null);
          return;
        }

        setStatus(current);
        clearTimeout(hide);
        hide = setTimeout(() => setStatus(null), VISIBLE_MS);
      } catch {
        // A reminder that cannot load is simply not shown.
      }
    };

    const first = setTimeout(tick, 8_000);
    // Coming back from the payment page: re-read straight away so a paid card stops showing the trial notice.
    const onVisible = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', onVisible);
    const stopListening = onMembershipChanged(() => void tick());
    const timer = setInterval(tick, EVERY_MS);

    return () => {
      alive = false;
      clearTimeout(first);
      document.removeEventListener('visibilitychange', onVisible);
      stopListening();
      clearInterval(timer);
      clearTimeout(hide);
    };
  }, [token]);

  usePopupHash('membership-popup', !!status);
  if (!status) return null;

  const expired = status.expired;
  const Icon = expired ? XCircle : Clock;

  return (
    <Notice
      icon={<Icon className="w-4 h-4" />}
      tone={expired ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-950 border border-amber-300'}
      onOpen={() => { setStatus(null); navigate(routeHref({ tab: 'mycard' })); }}
      onClose={() => setStatus(null)}
    >
      {expired
        ? isAr ? 'انتهى كرتك، لا خصم — اضغط للتجديد' : 'Your card has expired, no discount — tap to renew'
        : isAr ? `الفترة التجريبية — متبقي ${status.days_left} يوماً · اضغط للدفع` : `Free trial — ${status.days_left} days left · tap to pay`}
    </Notice>
  );
};
