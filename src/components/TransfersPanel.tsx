import React, { useCallback, useEffect, useState } from 'react';
import { acceptTransfer, cancelTransfer, declineTransfer, listTransfers, lookupRecipient, requestTransfer, transferSplit, type Transfer, type TransferKind } from '../api/transfers';
import { useIsAr } from '../context/LanguageContext';
import { refreshLoyalty } from '../utils/quizStore';

const REASONS_EN: Record<string, string> = {
  disabled: 'Transfers between members are currently closed.',
  not_found: 'There is no member with this number.',
  not_enough: 'The balance is not enough.',
  too_many_open: 'You have many waiting requests; wait for a reply or cancel them.',
  bad_amount: 'Enter a valid amount.',
  not_open: 'This request is no longer open.',
  offline: 'You need an internet connection.',
  kind_disabled: 'This kind of transfer is closed right now.',
  signed_out: 'Sign in first.',
  failed: 'The request failed, please try again.',
};

const REASONS_AR: Record<string, string> = {
  disabled: 'التحويل بين الأعضاء مقفول دلوقتي.',
  kind_disabled: 'النوع ده من التحويل مقفول دلوقتي.',
  not_found: 'مفيش عضو بالرقم ده.',
  not_enough: 'الرصيد مش كفاية.',
  too_many_open: 'عندك طلبات كتير مستنية، استنى ردها أو الغيها.',
  bad_amount: 'اكتب مبلغ صح.',
  not_open: 'الطلب ده اتقفل.',
  offline: 'محتاج اتصال بالإنترنت.',
  signed_out: 'سجّل الدخول الأول.',
  failed: 'مقدرناش ننفّذ الطلب، جرّب تاني.',
};

const STATUS_EN: Record<Transfer['status'], string> = { pending: 'Waiting', accepted: 'Done', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired' };
const STATUS_AR: Record<Transfer['status'], string> = { pending: 'مستني', accepted: 'تم', declined: 'مرفوض', cancelled: 'ملغي', expired: 'وقته خلص' };
const unitOf = (k: TransferKind, isAr: boolean) => (k === 'points' ? (isAr ? 'نقطة' : 'points') : isAr ? 'جنيه' : 'EGP');

/** Sending points or wallet money to another member by phone or card number, and answering the requests others send. */
export const TransfersPanel: React.FC<{
  /** Offer only this kind (the loyalty-points screens pass `points`). */
  kindOnly?: TransferKind;
  /** A card or phone number to start with (a relative's card on the family list). */
  initialWho?: string;
  /** Also draw the log of finished requests (sent, received, declined, cancelled, expired). */
  withLog?: boolean;
  /** Say so when the admin has this closed, instead of drawing nothing. */
  noteWhenOff?: boolean;
}> = ({ kindOnly, initialWho, withLog, noteWhenOff }) => {
  const isAr = useIsAr();
  const REASONS = isAr ? REASONS_AR : REASONS_EN;
  const STATUS = isAr ? STATUS_AR : STATUS_EN;
  const unit = (k: TransferKind) => unitOf(k, isAr);
  const [enabled, setEnabled] = useState(false);
  const [list, setList] = useState<Transfer[]>([]);
  const [kinds, setKinds] = useState<Record<TransferKind, boolean>>({ points: true, wallet: true });
  const [kind, setKind] = useState<TransferKind>(kindOnly ?? 'points');
  const [who, setWho] = useState(initialWho ?? '');
  const [amount, setAmount] = useState('');
  const [checked, setChecked] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** The transfer fee (a share of every transfer), as the backend says it; 0 / unknown = none. */
  const [feePercent, setFeePercent] = useState(0);

  const load = useCallback(async () => {
    const r = await listTransfers();
    setEnabled(r.enabled);
    setKinds(r.kinds);
    setFeePercent(r.fee_percent ?? 0);
    setKind((k) => (kindOnly ? kindOnly : r.kinds[k] ? k : r.kinds.points ? 'points' : 'wallet'));
    setList(kindOnly ? r.transfers.filter((t) => t.kind === kindOnly) : r.transfers);
    setLoaded(true);
  }, [kindOnly]);

  useEffect(() => { void load(); }, [load]);

  const open = enabled && (!kindOnly || kinds[kindOnly]);
  if (!open) {
    return noteWhenOff && loaded ? (
      <p data-testid="transfers-off" className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs font-bold text-slate-600">
        {isAr ? 'مشاركة النقاط بين الأعضاء مقفولة دلوقتي. هتظهر هنا أول ما تتفتح.' : 'Sharing points between members is closed right now. It will appear here when it opens.'}
      </p>
    ) : null;
  }

  const isCard = /^\d{6,}$/.test(who.trim()) && who.trim().length !== 11;
  const target = isCard ? { card: who.trim() } : { phone: who.trim() };

  const check = async () => {
    setBusy(true);
    setNote(null);
    const name = await lookupRecipient(target);
    setBusy(false);
    setChecked(name);
    if (!name) setNote({ ok: false, text: REASONS.not_found });
  };

  const send = async () => {
    setBusy(true);
    const res = await requestTransfer({ ...target, kind, amount: Number(amount) });
    setBusy(false);
    if (res.ok) {
      setNote({ ok: true, text: isAr ? `تم إرسال الطلب إلى ${checked}. التحويل هيتم لما يوافق.${split ? ` هيتخصم منك ${num(typed)} ${unit(kind)} والمستلم هياخد ${num(split.net)} بعد ضريبة ${num(split.fee)}.` : ''}` : `The request was sent to ${checked}. The transfer happens once they accept.${split ? ` ${num(typed)} ${unit(kind)} leave you; they receive ${num(split.net)} after a fee of ${num(split.fee)}.` : ''}` });
      setAmount('');
      setChecked(null);
      setWho('');
      void load();
    } else setNote({ ok: false, text: REASONS[res.reason] ?? REASONS.failed });
  };

  const answer = async (fn: (id: number) => Promise<{ ok: true } | { ok: false; reason: string }>, id: number) => {
    setBusy(true);
    const res = await fn(id);
    setBusy(false);
    setNote(res.ok ? { ok: true, text: isAr ? 'تم.' : 'Done.' } : { ok: false, text: REASONS[res.reason] ?? REASONS.failed });
    await load();
    void refreshLoyalty();
  };

  const waiting = list.filter((t) => t.status === 'pending');
  const typed = Number(amount);
  const split = feePercent > 0 && typed > 0 ? transferSplit(kind, typed, feePercent) : null;
  const num = (n: number) => n.toLocaleString(isAr ? 'ar-EG' : 'en-GB', { maximumFractionDigits: 2 });

  return (
    <div className="rounded-3xl bg-white border-2 border-sky-200 p-4 text-right shadow-sm" data-testid="transfers-panel">
      <p className="text-sm font-black text-sky-900">{isAr ? '🔁 تحويل لعضو تاني' : '🔁 Send to another member'}</p>
      {feePercent > 0 && (
        <p data-testid="transfer-fee-notice" className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          {isAr ? `⚠️ فيه ضريبة تحويل ${num(feePercent)}٪ على كل تحويل: بيتخصم منك المبلغ كله، والعضو التاني بياخد الباقي بعد الضريبة.` : `⚠️ Every transfer carries a ${num(feePercent)}% fee: the whole amount leaves you and the other member gets what is left after the fee.`}
        </p>
      )}

      {waiting.filter((t) => t.direction === 'in').map((t) => (
        <div key={t.id} className="mt-2 rounded-2xl bg-amber-50 border-2 border-amber-300 p-3" role="group" aria-label={isAr ? 'طلب تحويل جاي ليك' : 'Incoming transfer request'}>
          <p className="text-sm font-black text-amber-900">{isAr ? `${t.other} عايز يحوّلك` : `${t.other} wants to send you`} <span dir="ltr">{t.amount}</span> {unit(t.kind)}</p>
          {(t.fee ?? 0) > 0 && <p className="mt-1 text-xs font-bold text-amber-800">{isAr ? `بعد ضريبة التحويل (${num(t.fee ?? 0)} ${unit(t.kind)}) هتستلم ${num(t.net ?? t.amount)} ${unit(t.kind)}.` : `After the transfer fee (${num(t.fee ?? 0)} ${unit(t.kind)}) you receive ${num(t.net ?? t.amount)} ${unit(t.kind)}.`}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => answer(acceptTransfer, t.id)} className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-black text-white cursor-pointer disabled:opacity-40">{isAr ? 'موافق' : 'Accept'}</button>
            <button type="button" disabled={busy} onClick={() => answer(declineTransfer, t.id)} className="flex-1 rounded-xl bg-slate-200 py-2 text-sm font-black text-slate-700 cursor-pointer disabled:opacity-40">{isAr ? 'أرفض' : 'Decline'}</button>
          </div>
        </div>
      ))}

      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          {(['points', 'wallet'] as const).filter((k) => kinds[k] && (!kindOnly || k === kindOnly)).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-xl py-2 text-sm font-black cursor-pointer ${kind === k ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {k === 'points' ? (isAr ? 'نقاط' : 'Points') : isAr ? 'رصيد المحفظة' : 'Wallet balance'}
            </button>
          ))}
        </div>
        <input aria-label={isAr ? 'رقم التليفون أو رقم الكارت' : 'Phone or card number'} dir="ltr" inputMode="numeric" value={who} onChange={(e) => { setWho(e.target.value.replace(/[^0-9]/g, '')); setChecked(null); }} placeholder={isAr ? 'تليفون أو رقم الكارت' : 'Phone or card number'} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-bold" />
        {checked ? (
          <>
            <p className="text-sm font-black text-emerald-700">{isAr ? `✅ هتبعت إلى: ${checked}` : `✅ You will send to: ${checked}`}</p>
            <input aria-label={isAr ? 'المبلغ' : 'Amount'} dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder={isAr ? `المبلغ بال${unit(kind)}` : `Amount in ${unit(kind)}`} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black" />
            {split && (
              <div data-testid="transfer-fee-preview" className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs font-bold text-amber-900 space-y-0.5">
                <div className="flex justify-between"><span>{isAr ? 'هيتخصم منك' : 'Leaves you'}</span><span dir="ltr">{num(typed)} {unit(kind)}</span></div>
                <div className="flex justify-between"><span>{isAr ? `ضريبة التحويل (${num(feePercent)}٪)` : `Transfer fee (${num(feePercent)}%)`}</span><span dir="ltr">-{num(split.fee)} {unit(kind)}</span></div>
                <div className="flex justify-between font-black border-t border-amber-200 pt-0.5"><span>{isAr ? 'المستلم هياخد' : 'They receive'}</span><span dir="ltr">{num(split.net)} {unit(kind)}</span></div>
              </div>
            )}
            <button type="button" disabled={busy || !(typed > 0) || (split != null && split.net <= 0)} onClick={send} className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-black text-white cursor-pointer disabled:opacity-40">{isAr ? 'ابعت طلب التحويل' : 'Send the transfer request'}</button>
          </>
        ) : (
          <button type="button" disabled={busy || who.trim().length < 6} onClick={check} className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-black text-white cursor-pointer disabled:opacity-40">{isAr ? 'اتأكد من العضو' : 'Check the member'}</button>
        )}
      </div>

      {note && <p className={`mt-2 text-xs font-bold ${note.ok ? 'text-emerald-700' : 'text-red-600'}`} role="status">{note.text}</p>}

      {list.filter((t) => t.direction === 'out' && t.status === 'pending').map((t) => (
        <div key={t.id} className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">
          <span className="flex-1">{isAr ? 'لـ' : 'To'} {t.other}: <span dir="ltr">{t.amount}</span> {unit(t.kind)}{(t.fee ?? 0) > 0 && (isAr ? ` (ضريبة ${num(t.fee ?? 0)}، المستلم ${num(t.net ?? t.amount)})` : ` (fee ${num(t.fee ?? 0)}, they get ${num(t.net ?? t.amount)})`)} · {STATUS[t.status]}</span>
          <button type="button" disabled={busy} onClick={() => answer(cancelTransfer, t.id)} className="rounded-lg bg-slate-200 px-2 py-1 cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      ))}

      {withLog && (
        <div className="mt-4" data-testid="transfers-log">
          <p className="text-sm font-black text-sky-900">{isAr ? '📜 سجل المشاركة' : '📜 Sharing log'}</p>
          {list.filter((t) => t.status !== 'pending').length === 0 ? (
            <p className="mt-2 text-xs font-bold text-slate-500">{isAr ? 'لسه مفيش مشاركات.' : 'Nothing shared yet.'}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {list.filter((t) => t.status !== 'pending').map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">
                  <span aria-hidden="true">{t.direction === 'out' ? '⬆️' : '⬇️'}</span>
                  <span className="flex-1">
                    {t.direction === 'out' ? (isAr ? 'أرسلت إلى' : 'Sent to') : isAr ? 'استلمت من' : 'Received from'} {t.other}: <span dir="ltr">{t.direction === 'in' && t.net != null ? t.net : t.amount}</span> {unit(t.kind)}
                    {(t.fee ?? 0) > 0 && <span className="block text-[10px] font-semibold text-amber-700">{isAr ? `ضريبة التحويل: ${num(t.fee ?? 0)} ${unit(t.kind)}` : `Transfer fee: ${num(t.fee ?? 0)} ${unit(t.kind)}`}</span>}
                    {t.at && <span className="block text-[10px] font-semibold text-slate-400" dir="ltr">{new Date(t.at).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}</span>}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${t.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{STATUS[t.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
