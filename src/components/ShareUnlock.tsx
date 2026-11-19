import React from 'react';
import { Gift } from 'lucide-react';
import { navigate } from '../router';
import { useIsAr } from '../context/LanguageContext';
import { useSession } from '../utils/session';
import { useShareRefillsLeft } from '../utils/quizLimit';

/**
 * «شارك كود الإحالة وافتح المحاولات تاني»: the way back into a quiz whose daily plays are used up. Tapping it goes straight to the
 * invite screen, where sharing the code tells the backend to refill today's plays on every section. Shown to a signed-in member
 * (a code needs a card); while today's refill is used up (`share_refills_left_today` = 0) it turns into a polite note instead.
 */
export const ShareUnlockButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const isAr = useIsAr();
  const { token } = useSession();
  const left = useShareRefillsLeft();
  if (!token) return null;

  if (left === 0) {
    return (
      <p role="status" data-testid="quiz-share-used" className={`rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-600 ${className}`}>
        {isAr ? 'استخدمت فتح المحاولات بالمشاركة النهارده. هتقدر تفتحها تاني بكرة.' : "You already unlocked plays by sharing today. You can do it again tomorrow."}
      </p>
    );
  }

  return (
    <button type="button" dir={isAr ? 'rtl' : 'ltr'} onClick={() => navigate('/account/invite')} data-testid="quiz-share-unlock" className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white shadow-md ${className}`}>
      <Gift className="h-4 w-4 shrink-0" />
      {isAr ? 'شارك كود الإحالة وافتح المحاولات تاني' : 'Share to unlock again'}
    </button>
  );
};
