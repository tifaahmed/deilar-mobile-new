import React, { useEffect, useState } from 'react';
import { useIsAr } from '../context/LanguageContext';
import { cancelWithdrawal, fetchWithdrawals, requestWithdrawal, type Withdrawal, type WithdrawalRules, type WithdrawalStatus } from '../api/withdrawals';
import { refreshLoyalty } from '../utils/quizStore';
import { getSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';
import { formatNumber } from '../utils/formatNumber';

const REASONS_AR: Record<string, string> = {
  disabled: 'السحب مقفول حالياً.',
  bad_amount: 'المبلغ خارج الحدود المسموحة.',
  bad_number: 'اكتب رقم فودافون كاش (بيبدأ بـ 010).',
  bad_national_id: 'اكتب الرقم القومي (14 رقم).',
  not_enough: 'رصيد محفظتك لا يكفي.',
  daily_limit: 'المبلغ أكبر من المسموح سحبه في 24 ساعة.',
  open_request: 'عندك طلب سحب شغال بالفعل.',
  failed: 'تعذر إرسال الطلب، حاول مرة أخرى.',
};
const REASONS_EN: Record<string, string> = {
  disabled: 'Cash-out is closed right now.',
  bad_amount: 'The amount is outside the allowed range.',
  bad_number: 'Enter a Vodafone Cash number (starts with 010).',
  bad_national_id: 'Enter your 14-digit national ID.',
  not_enough: 'Your wallet does not hold this amount.',
  daily_limit: 'This is above what can be cashed out in 24 hours.',
  open_request: 'You already have a cash-out in progress.',
  failed: 'The request could not be sent, please try again.',
};

export function withdrawalStatusLabel(s: WithdrawalStatus, refunded: boolean, isAr: boolean): { text: string; tone: string } {
  const map: Record<WithdrawalStatus, { ar: string; en: string; tone: string }> = {
    pending: { ar: 'في انتظار الموافقة', en: 'Waiting for approval', tone: 'bg-amber-100 text-amber-700' },
    processing: { ar: 'جارٍ التحويل', en: 'Being sent', tone: 'bg-sky-100 text-sky-700' },
    paid: { ar: 'تم التحويل', en: 'Sent to your Vodafone Cash', tone: 'bg-emerald-100 text-emerald-700' },
    failed: { ar: 'فشل (رجعت الفلوس لمحفظتك)', en: 'Failed (money returned to your wallet)', tone: 'bg-red-100 text-red-700' },
    rejected: { ar: 'مرفوض (رجعت الفلوس لمحفظتك)', en: 'Rejected (money returned to your wallet)', tone: 'bg-red-100 text-red-700' },
    canceled: { ar: 'ملغي (رجعت الفلوس لمحفظتك)', en: 'Cancelled (money returned to your wallet)', tone: 'bg-slate-100 text-slate-700' },
  };
  const m = map[s];
  void refunded;
  return { text: isAr ? m.ar : m.en, tone: m.tone };
}

/** «اسحب لفودافون كاش»: shown only when the backend says cash-out is on. The wallet is debited by the backend the moment the request is made. */
export const WithdrawPanel: React.FC = () => {
  const isAr = useIsAr();
  const REASONS = isAr ? REASONS_AR : REASONS_EN;
  const [rules, setRules] = useState<WithdrawalRules | null>(null);
  const [list, setList] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState('');
  const [msisdn, setMsisdn] = useState('');
  const [nid, setNid] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const token = getSession().token;
    if (!token) return;
    const data = await fetchWithdrawals(token);
    if (data) {
      setRules(data.rules);
      setList(data.withdrawals);
    }
  };

  useEffect(() => { void load(); }, []);

  if (!rules?.enabled) return null;

  const n = (v: number) => formatNumber(v, isAr);
  const cur = isAr ? 'جنيه' : 'EGP';
  const value = Math.floor(Number(amount) || 0);
  const open = list.some((w) => w.status === 'pending' || w.status === 'processing');
  const ready = !busy && !open && value >= rules.min && value <= rules.max && /^0\d{10}$/.test(msisdn) && /^\d{14}$/.test(nid);

  const submit = async () => {
    const token = getSession().token;
    if (!token) return;
    setBusy(true);
    setNote(null);
    const res = await requestWithdrawal(token, value, msisdn, nid);
    setBusy(false);
    if (res.ok) {
      setAmount('');
      setNid('');
      setNote({ ok: true, text: rules.auto ? (isAr ? 'تم إرسال الطلب ✅' : 'Request sent ✅') : isAr ? 'تم تسجيل الطلب وخصم المبلغ من محفظتك. هيتحول بعد موافقة الإدارة ✅' : 'Request recorded and the amount taken from your wallet. It is sent once the team approves ✅' });
      void refreshLoyalty();
      void load();
    } else {
      if (res.reason === 'failed') reportClientError('Withdrawal request failed', new Error('withdrawal failed'));
      setNote({ ok: false, text: REASONS[res.reason] ?? REASONS.failed });
    }
  };

  const cancel = async (id: number) => {
    const token = getSession().token;
    if (!token) return;
    setBusy(true);
    const ok = await cancelWithdrawal(token, id);
    setBusy(false);
    setNote({ ok, text: ok ? (isAr ? 'تم إلغاء الطلب ورجعت الفلوس لمحفظتك.' : 'Cancelled; the money is back in your wallet.') : isAr ? 'مش ممكن إلغاء الطلب ده دلوقتي.' : 'This request can no longer be cancelled.' });
    void refreshLoyalty();
    void load();
  };

  return (
    <div className="mt-3 space-y-2 rounded-2xl border-2 border-red-100 bg-red-50/40 p-3" data-testid="withdraw-panel">
      <p className="text-xs font-black text-red-900">{isAr ? '💸 اسحب رصيدك إلى فودافون كاش' : '💸 Cash out to Vodafone Cash'}</p>
      <p className="text-[11px] font-semibold text-slate-500">
        {isAr ? `من ${n(rules.min)} إلى ${n(rules.max)} ${cur} في المرة، وحتى ${n(rules.daily_max)} ${cur} كل 24 ساعة.` : `${rules.min}–${rules.max} ${cur} per request, up to ${rules.daily_max} ${cur} every 24 hours.`}
      </p>
      <input aria-label={isAr ? 'المبلغ' : 'Amount'} dir="ltr" inputMode="numeric" value={amount} placeholder={String(rules.min)} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black" data-testid="withdraw-amount" />
      <input aria-label={isAr ? 'رقم فودافون كاش' : 'Vodafone Cash number'} dir="ltr" inputMode="numeric" maxLength={11} value={msisdn} placeholder="010XXXXXXXX" onChange={(e) => setMsisdn(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black" data-testid="withdraw-msisdn" />
      <input aria-label={isAr ? 'الرقم القومي' : 'National ID'} dir="ltr" inputMode="numeric" maxLength={14} value={nid} placeholder={isAr ? 'الرقم القومي (14 رقم)' : 'National ID (14 digits)'} onChange={(e) => setNid(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-base font-black" data-testid="withdraw-nid" />
      <button type="button" disabled={!ready} onClick={() => void submit()} className="w-full rounded-2xl bg-red-600 py-3 text-sm font-black text-white disabled:opacity-40 cursor-pointer" data-testid="withdraw-submit">
        {busy ? '...' : isAr ? `اسحب ${value > 0 ? n(value) : ''} جنيه` : `Cash out ${value > 0 ? value : ''} EGP`}
      </button>
      {open && <p className="text-[11px] font-bold text-amber-700">{isAr ? 'عندك طلب شغال، استنى لحد ما يخلص.' : 'You have a request in progress; wait until it finishes.'}</p>}
      {note && <p className={`text-xs font-bold ${note.ok ? 'text-emerald-700' : 'text-red-600'}`} role="status">{note.text}</p>}

      {list.length > 0 && (
        <ul className="space-y-1 pt-1" data-testid="withdraw-list">
          {list.slice(0, 5).map((w) => {
            const st = withdrawalStatusLabel(w.status, w.refunded, isAr);
            return (
              <li key={w.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-black tabular-nums" dir="ltr">{n(w.amount)} → {w.msisdn}</span>
                <span className="flex items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 font-black ${st.tone}`}>{st.text}</span>
                  {w.status === 'pending' && <button type="button" onClick={() => void cancel(w.id)} disabled={busy} className="font-black text-red-600 underline cursor-pointer" data-testid={`withdraw-cancel-${w.id}`}>{isAr ? 'إلغاء' : 'Cancel'}</button>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
