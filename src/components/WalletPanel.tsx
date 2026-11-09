import React from 'react';
import { useIsAr } from '../context/LanguageContext';
import { WithdrawPanel } from './WithdrawPanel';
import { useLoyalty } from '../utils/quizStore';

/** One number with at most two decimals, no trailing zeros. */
export const formatEgp = (n: number): string => String(Math.round(n * 100) / 100);

/**
 * The member's wallet balance and the cash-out. Points can NOT be turned into wallet money and money can NOT be paid into the wallet
 * any more (owner decision 2026-11-09; the backend answers 410), so this panel offers neither.
 */
export const WalletPanel: React.FC<{ signedIn: boolean }> = ({ signedIn }) => {
  const isAr = useIsAr();
  const egp = isAr ? 'جنيه' : 'EGP';
  const { money } = useLoyalty();

  if (!money) return null;

  return (
    <div className="rounded-3xl bg-white border-2 border-violet-200 p-4 text-right shadow-sm" data-testid="wallet-panel">
      <p className="text-sm font-black text-violet-900">{isAr ? '👛 محفظتك' : '👛 Your wallet'}</p>
      {signedIn && (
        <p className="mt-1 text-sm font-black text-slate-900">
          {isAr ? 'رصيد المحفظة:' : 'Wallet balance:'} <span dir="ltr" className="text-emerald-600">{formatEgp(money.wallet_balance)} {egp}</span>
        </p>
      )}

      {signedIn && <WithdrawPanel />}

    </div>
  );
};
