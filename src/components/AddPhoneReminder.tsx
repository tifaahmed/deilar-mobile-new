import { REMINDER_EVERY_MS } from '../utils/reminderEvery';
import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchCard } from '../api/auth';
import { useSession } from '../utils/session';
import { requestAccess } from '../utils/accessEvents';
import { usePopupHash } from '../utils/popupHash';
import { Notice } from './Notice';

/** How often the reminder comes back while the card still has no phone. */
const EVERY_MS = REMINDER_EVERY_MS;
/** How long one reminder stays on screen. */
const VISIBLE_MS = 10_000;

/**
 * "Add the phone linked to your card" — for someone who typed a correct card number whose card holds no phone, so no
 * code can be sent and nothing of the account opens. Every minute until a phone is added (which signs them in).
 * Whether a phone exists is the backend's call (`has_phone`); a signed-in member and a guest never see this.
 */
export const AddPhoneReminder: React.FC = () => {
  const { isAr } = useLanguage();
  const { token, pendingCard: cardNumber } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (token || !cardNumber) {
      setShow(false);
      return;
    }

    let hide: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const tick = async () => {
      if (!alive || document.visibilityState === 'hidden') return;

      try {
        const card = await fetchCard(cardNumber);
        if (!alive) return;

        clearTimeout(hide);
        if (card.has_phone !== false) {
          setShow(false);
          return;
        }

        setShow(true);
        hide = setTimeout(() => setShow(false), VISIBLE_MS);
      } catch {
        // A reminder that cannot load is simply not shown.
      }
    };

    const first = setTimeout(tick, 5_000);
    const timer = setInterval(tick, EVERY_MS);

    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(timer);
      clearTimeout(hide);
    };
  }, [token, cardNumber]);

  usePopupHash('add-phone-reminder-popup', show);
  if (!show) return null;

  return (
    <Notice
      icon={<Phone className="w-4 h-4" />}
      tone="bg-amber-100 text-amber-950 border border-amber-300"
      onOpen={() => { setShow(false); requestAccess('addphone'); }}
      onClose={() => setShow(false)}
    >
      {isAr ? `كارتك رقم ${cardNumber} بلا رقم هاتف — أضف رقمك لتأكيده والدخول` : `Card ${cardNumber} has no phone — add yours to sign in`}
    </Notice>
  );
};
