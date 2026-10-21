import React from 'react';
import { CreditCard, LogOut, Phone, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ErrorState, Skeleton } from './ui/Feedback';
import { TrialCardForm } from './TrialCardForm';

interface AccountGateProps {
  /** What the profile cannot show yet. */
  state: 'guest' | 'no-card' | 'loading' | 'error';
  signedIn: boolean;
  onSignIn: () => void;
  onEnterCard: () => void;
  onLogout: () => void;
  onRetry: () => void;
  /** The signed-in member's token; with it, a member who holds no card is offered the free trial. */
  token?: string;
  defaultName?: string;
  /** The trial card was created: show it. */
  onTrialCreated?: (number: string, name: string) => void;
}

/** The Profile tab before there is a card to show: both ways in, or what is still missing. */
export const AccountGate: React.FC<AccountGateProps> = ({ state, signedIn, onSignIn, onEnterCard, onLogout, onRetry, token, defaultName, onTrialCreated }) => {
  const { isAr } = useLanguage();

  if (state === 'loading') {
    return (
      <div className="space-y-3 pt-2" aria-hidden>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-3 pt-2">
        <ErrorState onRetry={onRetry} />
        <button onClick={onLogout} className="w-full text-xs font-bold text-[#941946] cursor-pointer">
          {isAr ? 'استخدام رقم آخر' : 'Use a different number'}
        </button>
      </div>
    );
  }

  const noCard = state === 'no-card';

  // Signed in with no card: the free 1-month card is the first thing offered, the number lookup stays below it.
  if (noCard && token && onTrialCreated) {
    return (
      <div className="space-y-2">
        <TrialCardForm token={token} defaultName={defaultName} onCreated={onTrialCreated} />
        <button onClick={onEnterCard} className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-[#941946] flex items-center justify-center gap-1.5 cursor-pointer">
          <CreditCard className="w-3.5 h-3.5" />
          <span>{isAr ? 'لدي كارت — عرضه برقم العضوية' : 'I already have a card — view it by number'}</span>
        </button>
        <button onClick={onLogout} className="w-full py-2 text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 cursor-pointer">
          <LogOut className="w-3.5 h-3.5" />
          <span>{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 text-center mt-2 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#941946]/10 text-[#941946] flex items-center justify-center mx-auto">
        <UserRound className="w-7 h-7" />
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-sm font-black text-slate-900">
          {noCard ? (isAr ? 'لا يوجد كرت مرتبط برقمك' : 'No card is linked to your number') : isAr ? 'حسابي' : 'My account'}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {noCard
            ? isAr ? 'إذا كان لديك كرت، أدخل رقم العضوية لعرض بياناته.' : 'If you have a card, enter its membership number to see it.'
            : isAr ? 'سجّل الدخول برقم هاتفك فيظهر كرتك تلقائياً، أو اعرض بيانات كرتك برقم العضوية.' : 'Sign in with your phone and your card appears automatically, or view it with its membership number.'}
        </p>
      </div>

      <div className="space-y-2">
        {!signedIn && (
          <button onClick={onSignIn} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
            <Phone className="w-4 h-4" />
            <span>{isAr ? 'تسجيل الدخول برقم الهاتف' : 'Sign in with phone number'}</span>
          </button>
        )}

        <button onClick={onEnterCard} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
          <CreditCard className="w-4 h-4 text-amber-400" />
          <span>{isAr ? 'عرض بيانات الكرت برقم العضوية' : 'View card with membership number'}</span>
        </button>

        {signedIn && (
          <button onClick={onLogout} className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-[#941946] flex items-center justify-center gap-1.5 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
