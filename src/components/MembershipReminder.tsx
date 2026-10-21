import React, { useEffect, useState } from 'react';
import { Clock, XCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchMembership, type MemberStatus } from '../api/membership';
import { navigate, routeHref } from '../router';
import { useSession } from '../utils/session';

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
        if (!alive || !current.has_card || (!current.expired && !current.is_trial)) return;

        setStatus(current);
        clearTimeout(hide);
        hide = setTimeout(() => setStatus(null), VISIBLE_MS);
      } catch {
        // A reminder that cannot load is simply not shown.
      }
    };

    const first = setTimeout(tick, 8_000);
    const timer = setInterval(tick, EVERY_MS);

    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
      clearTimeout(hide);
    };
  }, [token]);

  if (!status) return null;

  const expired = status.expired;
  const price = status.price > 0 ? ` (${status.price} ${isAr ? 'ج.م' : 'EGP'})` : '';
  const Icon = expired ? XCircle : Clock;

  return (
    <div
      role="status"
      className={`fixed top-16 inset-x-3 z-40 max-w-md mx-auto rounded-2xl shadow-xl p-3 flex items-start gap-3 animate-in fade-in ${expired ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-950 border border-amber-300'} ${isAr ? 'text-right' : 'text-left'}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-extrabold">
          {expired
            ? isAr ? 'انتهى كرتك' : 'Your card has expired'
            : isAr ? `أنت في الفترة التجريبية — متبقي ${status.days_left} يوماً` : `You are on the free trial — ${status.days_left} days left`}
        </p>
        <p className="text-[11px] leading-relaxed">
          {expired
            ? isAr ? 'لن تحصل على أي خصم، وستدفع السعر الكامل لكل مشترياتك. جدّد كرتك لتستعيد خصوماتك.' : 'You get no discount and pay the full price on every purchase. Renew your card to get your discounts back.'
            : isAr ? `للحصول على الكرت الكامل ادفع سعره${price}.` : `To get the full card, pay its price${price}.`}
        </p>
        <button
          onClick={() => { setStatus(null); navigate(routeHref({ tab: 'profile' })); }}
          className={`text-[11px] font-bold underline cursor-pointer ${expired ? 'text-white' : 'text-amber-900'}`}
        >
          {isAr ? 'ادفع الآن (بطاقة / فودافون كاش / إنستاباي)' : 'Pay now (card / Vodafone Cash / Instapay)'}
        </button>
      </div>
      <button onClick={() => setStatus(null)} aria-label={isAr ? 'إغلاق' : 'Close'} className="opacity-70 hover:opacity-100 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
