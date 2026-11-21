import React, { useState } from 'react';
import { Check, LogOut, UserPlus, Users, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MAX_ACCOUNTS, getSession, switchAccount, useAccounts, type SavedAccount } from '../utils/session';
import { flushQuizAnswers } from '../utils/quizStore';

export type AccountsMode = 'switch' | 'logout';

interface AccountsModalProps {
  mode: AccountsMode;
  onClose: () => void;
  /** Sign in another account next to the ones held (phone + code once, then it is kept on the phone). */
  onAdd: () => void;
  /** Called after the active account changed (the caller resets what belonged to the old one). */
  onSwitched: () => void;
  /** Sign the ACTIVE account out of this phone (only offered in `logout` mode). */
  onLogout: () => void;
}

const labelOf = (a: SavedAccount, isAr: boolean) => a.name || a.phone || a.leadPhone || (a.cardNumber ? `#${a.cardNumber}` : isAr ? 'حساب' : 'Account');

/**
 * The accounts held on this phone. Pressing one makes it the active account at once — no code: its own sign-in is still valid.
 * Opened from «تبديل حساب», «إضافة حساب» and from «تسجيل الخروج», so leaving an account is never the only way to reach another.
 */
export const AccountsModal: React.FC<AccountsModalProps> = ({ mode, onClose, onAdd, onSwitched, onLogout }) => {
  const { isAr } = useLanguage();
  const accounts = useAccounts();
  const active = getSession().token;
  const [busy, setBusy] = useState(false);
  const full = accounts.length >= MAX_ACCOUNTS;

  const pick = async (token: string) => {
    if (token === active || busy) return;
    setBusy(true);
    // Answers played on the old account are sent with ITS sign-in first, so their points are not credited to the next one.
    await flushQuizAnswers().catch(() => undefined);
    if (switchAccount(token)) onSwitched();
    setBusy(false);
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} onClick={onClose} className="fixed inset-0 z-[999] bg-black/70 flex items-end sm:items-center justify-center p-3" data-testid="accounts-modal">
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[#941946]">
            <Users className="w-6 h-6 shrink-0" />
            <h2 className="text-base font-black">{mode === 'logout' ? (isAr ? 'قبل ما تخرج' : 'Before you go') : isAr ? 'تبديل الحساب' : 'Switch account'}</h2>
          </div>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-xs font-semibold leading-relaxed text-slate-600">
          {mode === 'logout'
            ? isAr ? 'مش لازم تخرج عشان تدخل على حساب تاني. ضيف حساب أو بدّل لحساب تاني من غير ما تكتب كود تاني.' : 'You do not have to sign out to use another account. Add one or switch to another without a new code.'
            : isAr ? 'دوس على الحساب اللي عايز تدخله، من غير كود.' : 'Tap the account you want to use, no code needed.'}
        </p>

        <div className="space-y-1.5" data-testid="accounts-list">
          {accounts.map((a) => (
            <button key={a.token} type="button" disabled={busy} onClick={() => void pick(a.token)} data-testid={`account-${a.cardNumber ?? a.token.slice(-6)}`}
              className={`w-full flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-start cursor-pointer disabled:opacity-60 ${a.token === active ? 'border-[#941946] bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <span className="w-9 h-9 rounded-full bg-[#941946] text-white font-black flex items-center justify-center shrink-0">{labelOf(a, isAr).replace('#', '').charAt(0).toUpperCase()}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-black truncate">{labelOf(a, isAr)}</span>
                <span className="block text-[11px] font-semibold text-slate-500 truncate" dir="ltr">{[a.phone, a.cardNumber && `#${a.cardNumber}`].filter(Boolean).join(' · ')}</span>
              </span>
              {a.token === active && <span className="flex items-center gap-1 text-[11px] font-black text-[#941946]"><Check className="w-4 h-4" />{isAr ? 'الحالي' : 'Current'}</span>}
            </button>
          ))}
        </div>

        <button type="button" onClick={onAdd} disabled={full} data-testid="accounts-add" className="w-full py-3 rounded-2xl bg-[#941946] hover:bg-[#7d1439] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer">
          <UserPlus className="w-4 h-4" />{isAr ? 'إضافة حساب' : 'Add an account'}
        </button>
        {full && <p data-testid="accounts-full" className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{isAr ? `وصلت للحد الأقصى: ${MAX_ACCOUNTS} حسابات على الموبايل. اخرج من حساب الأول لو عايز تضيف حساب تاني.` : `Limit reached: ${MAX_ACCOUNTS} accounts per phone. Sign out of one to add another.`}</p>}

        {mode === 'logout' && (
          <button type="button" onClick={onLogout} data-testid="accounts-logout" className="w-full py-2.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />{isAr ? 'اخرج من الحساب الحالي' : 'Sign out of the current account'}
          </button>
        )}
      </div>
    </div>
  );
};
