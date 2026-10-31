import React, { useCallback, useEffect, useState } from 'react';
import { acceptTransfer, cancelTransfer, declineTransfer, listTransfers, lookupRecipient, requestTransfer, type Transfer, type TransferKind } from '../api/transfers';
import { refreshLoyalty } from '../utils/quizStore';

const REASONS: Record<string, string> = {
  disabled: 'التحويل بين الأعضاء مقفول حالياً.',
  not_found: 'مفيش عضو بالرقم ده.',
  not_enough: 'الرصيد لا يكفي.',
  too_many_open: 'عندك طلبات كتير منتظرة، انتظر ردها أو الغِها.',
  bad_amount: 'اكتب مبلغاً صحيحاً.',
  not_open: 'الطلب ده لم يعد مفتوحاً.',
  offline: 'محتاج اتصال بالإنترنت.',
  signed_out: 'سجّل الدخول الأول.',
  failed: 'تعذر تنفيذ الطلب، حاول مرة أخرى.',
};

const STATUS: Record<Transfer['status'], string> = { pending: 'في الانتظار', accepted: 'تم', declined: 'مرفوض', cancelled: 'ملغي', expired: 'انتهت مهلته' };
const unit = (k: TransferKind) => (k === 'points' ? 'نقطة' : 'جنيه');

/** Sending points or wallet money to another member by phone or card number, and answering the requests others send. */
export const TransfersPanel: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [list, setList] = useState<Transfer[]>([]);
  const [kind, setKind] = useState<TransferKind>('points');
  const [who, setWho] = useState('');
  const [amount, setAmount] = useState('');
  const [checked, setChecked] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await listTransfers();
    setEnabled(r.enabled);
    setList(r.transfers);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!enabled) return null;

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
      setNote({ ok: true, text: `تم إرسال الطلب إلى ${checked}. التحويل هيتم لما يوافق.` });
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
    setNote(res.ok ? { ok: true, text: 'تم.' } : { ok: false, text: REASONS[res.reason] ?? REASONS.failed });
    await load();
    void refreshLoyalty();
  };

  const waiting = list.filter((t) => t.status === 'pending');

  return (
    <div className="rounded-3xl bg-white border-2 border-sky-200 p-4 text-right shadow-sm" data-testid="transfers-panel">
      <p className="text-sm font-black text-sky-900">🔁 تحويل لعضو آخر</p>

      {waiting.filter((t) => t.direction === 'in').map((t) => (
        <div key={t.id} className="mt-2 rounded-2xl bg-amber-50 border-2 border-amber-300 p-3" role="group" aria-label="طلب تحويل وارد">
          <p className="text-sm font-black text-amber-900">{t.other} عايز يحوّلك <span dir="ltr">{t.amount}</span> {unit(t.kind)}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => answer(acceptTransfer, t.id)} className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-black text-white cursor-pointer disabled:opacity-40">موافق</button>
            <button type="button" disabled={busy} onClick={() => answer(declineTransfer, t.id)} className="flex-1 rounded-xl bg-slate-200 py-2 text-sm font-black text-slate-700 cursor-pointer disabled:opacity-40">أرفض</button>
          </div>
        </div>
      ))}

      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          {(['points', 'wallet'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-xl py-2 text-sm font-black cursor-pointer ${kind === k ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {k === 'points' ? 'نقاط' : 'رصيد المحفظة'}
            </button>
          ))}
        </div>
        <input aria-label="رقم التليفون أو رقم الكارت" dir="ltr" inputMode="numeric" value={who} onChange={(e) => { setWho(e.target.value.replace(/[^0-9]/g, '')); setChecked(null); }} placeholder="تليفون أو رقم الكارت" className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-bold" />
        {checked ? (
          <>
            <p className="text-sm font-black text-emerald-700">✅ هتبعت إلى: {checked}</p>
            <input aria-label="المبلغ" dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder={`المبلغ بال${unit(kind)}`} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black" />
            <button type="button" disabled={busy || !(Number(amount) > 0)} onClick={send} className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-black text-white cursor-pointer disabled:opacity-40">ابعت طلب التحويل</button>
          </>
        ) : (
          <button type="button" disabled={busy || who.trim().length < 6} onClick={check} className="w-full rounded-2xl bg-sky-600 py-3 text-sm font-black text-white cursor-pointer disabled:opacity-40">تحقق من العضو</button>
        )}
      </div>

      {note && <p className={`mt-2 text-xs font-bold ${note.ok ? 'text-emerald-700' : 'text-red-600'}`} role="status">{note.text}</p>}

      {list.filter((t) => t.direction === 'out' && t.status === 'pending').map((t) => (
        <div key={t.id} className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">
          <span className="flex-1">إلى {t.other}: <span dir="ltr">{t.amount}</span> {unit(t.kind)} · {STATUS[t.status]}</span>
          <button type="button" disabled={busy} onClick={() => answer(cancelTransfer, t.id)} className="rounded-lg bg-slate-200 px-2 py-1 cursor-pointer">إلغاء</button>
        </div>
      ))}
    </div>
  );
};
