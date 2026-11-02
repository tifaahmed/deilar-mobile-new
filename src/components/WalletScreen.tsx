import React, { useEffect, useState } from 'react';
import { History, Wallet } from 'lucide-react';
import { fetchWallet, walletSourceLabel, type WalletEntry } from '../api/wallet';
import { listTransfers, type Transfer } from '../api/transfers';
import { WalletPanel, formatEgp } from './WalletPanel';
import { TransfersPanel } from './TransfersPanel';
import { navigate, routeHref } from '../router';
import { useLoyalty, refreshLoyalty } from '../utils/quizStore';
import { useIsAr } from '../context/LanguageContext';
import { useSession } from '../utils/session';

const STATUS_EN: Record<Transfer['status'], string> = { pending: 'Waiting', accepted: 'Done', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired' };
const STATUS_AR: Record<Transfer['status'], string> = { pending: 'في الانتظار', accepted: 'تم', declined: 'مرفوض', cancelled: 'ملغي', expired: 'انتهت مهلته' };
const when = (iso: string | null, isAr = true) => (iso ? new Date(iso).toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

/** «محفظتي»: the balance, adding money, turning points into money, sending to a member, and every line that moved the wallet. */
export const WalletScreen: React.FC = () => {
  const isAr = useIsAr();
  const STATUS = isAr ? STATUS_AR : STATUS_EN;
  const session = useSession();
  const loyalty = useLoyalty();
  const [entries, setEntries] = useState<WalletEntry[] | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const balance = loyalty.money?.wallet_balance ?? 0;

  useEffect(() => { void refreshLoyalty(); }, []);

  // Read the lines again whenever the balance moves (a top-up, a conversion, a transfer accepted).
  useEffect(() => {
    if (!session.token) return;
    let live = true;
    void fetchWallet(session.token).then((w) => { if (live) setEntries(w ? w.entries : []); });
    void listTransfers().then((r) => { if (live) setTransfers(r.transfers); });
    return () => { live = false; };
  }, [session.token, balance]);

  if (!session.token) {
    return <p className="p-3 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{isAr ? 'سجّل الدخول برقم هاتفك أولاً لترى محفظتك.' : 'Sign in with your phone number first to see your wallet.'}</p>;
  }

  return (
    <div className="space-y-3 text-right" data-testid="wallet-screen">
      <div className="rounded-3xl bg-gradient-to-l from-emerald-600 to-teal-600 text-white p-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><Wallet className="w-6 h-6" /></span>
        <div className="flex-1">
          <p className="text-xs font-bold text-white/80">{isAr ? 'رصيد محفظتي' : 'My wallet balance'}</p>
          <p className="text-2xl font-black" dir="ltr" data-testid="wallet-balance">{formatEgp(balance)} {isAr ? 'ج.م' : 'EGP'}</p>
        </div>
      </div>

      <WalletPanel signedIn />
      <TransfersPanel />

      <section className="rounded-3xl bg-white border-2 border-slate-200 p-3 space-y-2" data-testid="wallet-entries">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><History className="w-4 h-4" /> {isAr ? 'سجل المحفظة' : 'Wallet history'}</h2>
        {entries === null && <p className="text-xs font-semibold text-slate-400">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>}
        {entries !== null && entries.length === 0 && <p className="text-xs font-semibold text-slate-500">{isAr ? 'لا توجد حركات على محفظتك بعد.' : 'There are no movements on your wallet yet.'}</p>}
        {(entries ?? []).map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <span className={`font-black tabular-nums ${e.amount < 0 ? 'text-red-600' : 'text-emerald-700'}`} dir="ltr">{e.amount > 0 ? '+' : ''}{formatEgp(e.amount)}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-black text-slate-800">{walletSourceLabel(e.source, e.amount, isAr)}</span>
              {e.note && e.source === 'admin' && <span className="block text-[11px] font-semibold text-slate-500">{e.note.replace(/^admin\s*[:—-]\s*/i, '')}</span>}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">{when(e.at, isAr)}</span>
          </div>
        ))}
      </section>

      {transfers.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 p-3 space-y-2" data-testid="transfer-history">
          <h2 className="text-sm font-black text-slate-900">{isAr ? 'سجل التحويلات بين الأعضاء' : 'Transfers between members'}</h2>
          {transfers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <span className={`font-black tabular-nums ${t.direction === 'out' ? 'text-red-600' : 'text-emerald-700'}`} dir="ltr">{t.direction === 'out' ? '-' : '+'}{t.amount}</span>
              <span className="flex-1 min-w-0 font-bold text-slate-800">{t.direction === 'out' ? (isAr ? 'إلى' : 'To') : isAr ? 'من' : 'From'} {t.other ?? '—'} · {t.kind === 'points' ? (isAr ? 'نقاط' : 'points') : isAr ? 'جنيه' : 'EGP'} · {STATUS[t.status]}</span>
              <span className="text-[10px] font-semibold text-slate-400">{when(t.at, isAr)}</span>
            </div>
          ))}
        </section>
      )}

      <button onClick={() => navigate(routeHref({ quiz: true, quizPath: 'history' }))} className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-black text-slate-800 cursor-pointer">{isAr ? 'سجل النقاط واللعب' : 'Points and play history'}</button>
    </div>
  );
};
