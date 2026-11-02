import React, { useState } from 'react';
import { useIsAr } from '../context/LanguageContext';
import { convertPointsToWallet, pointsToEgp, refreshLoyalty, startWalletTopup, useLoyalty } from '../utils/quizStore';

const REASONS_EN: Record<string, string> = {
  disabled: 'Converting points to the wallet is currently closed.',
  below_minimum: 'The amount is below the minimum.',
  not_enough_points: 'You do not have enough points for this amount.',
  no_rate: 'The conversion rate is not set at the moment.',
  offline: 'You need an internet connection to convert.',
  signed_out: 'Sign in first.',
  failed: 'The conversion failed, please try again.',
  amount: 'The amount is not allowed (below the minimum top-up or above the maximum).',
};

const REASONS_AR: Record<string, string> = {
  disabled: 'تحويل النقاط للمحفظة مقفول حالياً.',
  below_minimum: 'المبلغ أقل من الحد الأدنى للتحويل.',
  not_enough_points: 'نقاطك لا تكفي لهذا المبلغ.',
  no_rate: 'سعر التحويل غير محدد حالياً.',
  offline: 'محتاج اتصال بالإنترنت عشان تحوّل.',
  signed_out: 'سجّل الدخول الأول.',
  failed: 'تعذر التحويل، حاول مرة أخرى.',
  amount: 'المبلغ غير مسموح به (أقل من الحد الأدنى للشحن أو أكبر من الحد الأقصى).',
};

/** One number with at most two decimals, no trailing zeros. */
export const formatEgp = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * What the player's points are worth in pounds, their wallet, and — when the admin has opened it — a way to turn points into wallet money.
 * Every figure here is the backend's (`loyalty_points_per_egp`, the wallet, the minimum); the phone only relays the number of pounds asked for.
 */
export const WalletPanel: React.FC<{ signedIn: boolean }> = ({ signedIn }) => {
  const isAr = useIsAr();
  const REASONS = isAr ? REASONS_AR : REASONS_EN;
  const egp = isAr ? 'جنيه' : 'EGP';
  const { total, money } = useLoyalty();
  const worth = pointsToEgp(total, money?.points_per_egp);
  const whole = Math.floor(worth);
  const min = money?.wallet_min_egp ?? 20;
  const [asked, setAsked] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [topup, setTopup] = useState('');

  if (!money) return null;

  const minTopup = money.wallet_min_topup ?? 20;
  const topupAmount = Math.floor(Number(topup) || 0);

  const addMoney = async () => {
    setBusy(true);
    setNote(null);
    const res = await startWalletTopup(topupAmount);
    setBusy(false);
    if (res.ok) {
      // The payment page opens outside the app; when the member comes back the balance is read again.
      window.open(res.checkoutUrl, '_blank', 'noopener');
      setNote({ ok: true, text: isAr ? 'أكمل الدفع في الصفحة المفتوحة، وبعدها هيظهر الرصيد في محفظتك.' : 'Finish the payment in the page that opened; the balance will then appear in your wallet.' });
      setTimeout(() => void refreshLoyalty(), 15000);
    } else setNote({ ok: false, text: REASONS[res.reason] ?? REASONS.failed });
  };

  const amount = asked === '' ? whole : Math.floor(Number(asked) || 0);
  const canConvert = signedIn && money.wallet_enabled && amount >= min && amount <= whole && !busy;

  const convert = async () => {
    setBusy(true);
    setNote(null);
    const res = await convertPointsToWallet(amount);
    setBusy(false);
    if (res.ok) {
      setAsked('');
      setNote({ ok: true, text: isAr ? `تم تحويل ${amount} جنيه إلى محفظتك ✅` : `${amount} EGP was added to your wallet ✅` });
    } else {
      setNote({ ok: false, text: REASONS[res.reason] ?? REASONS.failed });
    }
  };

  return (
    <div className="rounded-3xl bg-white border-2 border-violet-200 p-4 text-right shadow-sm" data-testid="wallet-panel">
      <p className="text-sm font-black text-violet-900">{isAr ? '👛 محفظتك' : '👛 Your wallet'}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">
        {isAr ? 'نقاطك تساوي' : 'Your points are worth'} <span dir="ltr" className="font-black text-violet-700">{formatEgp(worth)} {egp}</span>
        <span className="text-slate-400"> {isAr ? `(كل 1 جنيه = ${formatEgp(money.points_per_egp)} نقطة)` : `(1 EGP = ${formatEgp(money.points_per_egp)} points)`}</span>
      </p>
      {signedIn && (
        <p className="mt-1 text-sm font-black text-slate-900">
          {isAr ? 'رصيد المحفظة:' : 'Wallet balance:'} <span dir="ltr" className="text-emerald-600">{formatEgp(money.wallet_balance)} {egp}</span>
        </p>
      )}

      {signedIn && (
        <div className="mt-3 space-y-2" data-testid="wallet-topup">
          <label className="block text-xs font-bold text-slate-700" htmlFor="egp-to-topup">{isAr ? `اشحن محفظتك بالجنيه (الحد الأدنى ${minTopup})` : `Top up your wallet in EGP (minimum ${minTopup})`}</label>
          <input id="egp-to-topup" dir="ltr" inputMode="numeric" value={topup} placeholder={String(minTopup)} onChange={(e) => setTopup(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black" />
          <button type="button" disabled={busy || topupAmount < minTopup} onClick={addMoney} className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-40 cursor-pointer">
            {topupAmount >= minTopup ? (isAr ? `اشحن ${topupAmount} جنيه` : `Top up ${topupAmount} EGP`) : isAr ? 'اشحن المحفظة' : 'Top up wallet'}
          </button>
        </div>
      )}

      {signedIn && !money.wallet_enabled && <p className="mt-2 text-xs font-semibold text-slate-500">{isAr ? 'تحويل النقاط إلى المحفظة هيتفتح قريباً.' : 'Converting points to the wallet will open soon.'}</p>}

      {signedIn && money.wallet_enabled && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-bold text-slate-700" htmlFor="egp-to-convert">{isAr ? `كام جنيه عايز تحوّل؟ (الحد الأدنى ${min} جنيه، الحد الأقصى ${whole})` : `How many EGP do you want to convert? (minimum ${min}, maximum ${whole})`}</label>
          <input
            id="egp-to-convert"
            dir="ltr"
            inputMode="numeric"
            value={asked}
            placeholder={String(whole)}
            onChange={(e) => setAsked(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black"
          />
          <button
            type="button"
            disabled={!canConvert}
            onClick={convert}
            className="w-full rounded-2xl bg-violet-600 py-3 text-sm font-black text-white disabled:opacity-40 cursor-pointer"
          >
            {busy ? '...' : isAr ? `حوّل ${amount > 0 ? amount : ''} جنيه لمحفظتي` : `Convert ${amount > 0 ? amount : ''} EGP to my wallet`}
          </button>
        </div>
      )}

      {note && <p className={`mt-2 text-xs font-bold ${note.ok ? 'text-emerald-700' : 'text-red-600'}`} role="status">{note.text}</p>}
    </div>
  );
};
