import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { claimReferral, fetchReferral, previewReferral, type ReferralInfo, type ReferralPreview } from '../api/referral';
import { ApiError } from '../api/http';
import { useIsAr } from '../context/LanguageContext';
import { useSession } from '../utils/session';
import { formatNumber } from '../utils/formatNumber';
import { reportClientError } from '../utils/reportError';

type Plans = Partial<Record<'month' | 'half' | 'year', number>>;
const PLAN_AR = { month: 'شهري', half: 'نصف سنوي', year: 'سنوي' } as const;
const PLAN_EN = { month: 'monthly', half: 'half-year', year: 'yearly' } as const;

const REASON_AR: Record<string, string> = {
  disabled: 'الدعوات واقفة دلوقتي.',
  not_found: 'رقم العضوية ده مش موجود. اتأكد منه وجرّب تاني.',
  self: 'مينفعش تستخدم رقم عضويتك انت.',
  mutual: 'العضو ده انت اللي دعيته، فمينفعش يبقى العكس.',
  already_referred: 'انت أدخلت كود دعوة قبل كده، ومينفعش تغيّره.',
  company: 'كود الدعوة للأفراد فقط، مش للشركات.',
  already_paid: 'مينفعش تدخل كود بعد ما اشتركت.',
};
const REASON_EN: Record<string, string> = {
  disabled: 'Invitations are switched off right now.',
  not_found: 'That card number was not found. Check it and try again.',
  self: 'You cannot use your own card number.',
  mutual: 'You invited this member, so it cannot go the other way.',
  already_referred: 'You already entered an invitation code and it cannot be changed.',
  company: 'Invitation codes are for individual members only, not companies.',
  already_paid: 'A code cannot be entered after you have subscribed.',
};
/** Reasons after which the entry can never work for this member: hide the field and show the message. */
const FINAL = new Set(['already_paid', 'company', 'already_referred', 'disabled']);

/**
 * «عندي كود دعوة»: a member who was not brought by anyone enters the referrer's CARD NUMBER once, for ever. Preview (writes nothing) → confirm → claim.
 * Every rule and amount comes from the backend; this only relays the number and draws the answer.
 */
export const ReferralCodeEntry: React.FC = () => {
  const isAr = useIsAr();
  const { token } = useSession();
  const n = (v: number) => formatNumber(v, isAr);
  const cur = isAr ? 'ج.م' : 'EGP';
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ReferralPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [done, setDone] = useState<{ discount: number; discounts: Plans } | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    fetchReferral(token).then((r) => { if (live) setInfo(r); }).catch((e) => reportClientError('Referral entry failed to load', e));
    return () => { live = false; };
  }, [token]);

  if (!token || !info || !info.enabled) return null;

  const reasons = isAr ? REASON_AR : REASON_EN;
  const planLine = (d: Plans, total: number) => {
    const keys = (['month', 'half', 'year'] as const).filter((k) => d[k]);
    if (!keys.length) return `${n(total)} ${cur}`;
    return keys.map((k) => `${(isAr ? PLAN_AR : PLAN_EN)[k]}: ${n(d[k]!)} ${cur}`).join(isAr ? ' · ' : ' · ');
  };

  const fail = (e: unknown, where: string) => {
    const reason = e instanceof ApiError ? e.reason : undefined;
    if (reason && reasons[reason]) {
      if (FINAL.has(reason)) setBlocked(reasons[reason]); else setError(reasons[reason]);
    } else {
      setError(isAr ? 'حصلت مشكلة، جرّب تاني بعد شوية.' : 'Something went wrong, please try again.');
      reportClientError(`Referral ${where} failed`, e);
    }
  };

  if (info.brought_by) {
    const b = info.brought_by;
    return (
      <p className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" data-testid="referral-brought-by">
        {isAr
          ? `جيت عن طريق العضو ${b.number}. ${b.discount_used ? 'استخدمت خصم الدعوة.' : `الخصم: ${planLine(b.discounts ?? {}, b.discount)} على أول اشتراك.`}`
          : `You came through member ${b.number}. ${b.discount_used ? 'Your invitation discount was used.' : `Discount on your first subscription: ${planLine(b.discounts ?? {}, b.discount)}.`}`}
      </p>
    );
  }

  if (done) {
    return (
      <p className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" data-testid="referral-entry-done" role="status">
        {isAr ? `تم تطبيق الكود. خصمك على أول اشتراك: ${planLine(done.discounts, done.discount)}.` : `Code applied. Your discount on your first subscription: ${planLine(done.discounts, done.discount)}.`}
      </p>
    );
  }

  if (blocked) {
    return <p className="p-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200" data-testid="referral-entry-blocked">{blocked}</p>;
  }

  const check = async () => {
    const number = code.trim();
    if (!number || busy) return;
    setBusy(true); setError(null);
    try { setPreview(await previewReferral(token, number)); } catch (e) { fail(e, 'preview'); } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!preview || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await claimReferral(token, preview.number, 'card');
      setDone({ discount: r.discount ?? preview.discount, discounts: preview.discounts ?? {} });
      setPreview(null);
    } catch (e) { setPreview(null); fail(e, 'claim'); } finally { setBusy(false); }
  };

  return (
    <section className="rounded-3xl bg-white border-2 border-slate-200 p-3 space-y-2" data-testid="referral-entry">
      <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#941946]" /> {isAr ? 'عندك كود دعوة؟' : 'Have an invitation code?'}</h2>
      <p className="text-[11px] font-semibold text-slate-500">
        {isAr ? 'اكتب رقم عضوية اللي دعاك واخد خصم على أول اشتراك. ينفع مرة واحدة بس، قبل ما تشترك.' : 'Type the card number of the member who invited you and get a discount on your first subscription. One time only, before you subscribe.'}
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null); }}
          inputMode="numeric"
          dir="ltr"
          maxLength={20}
          placeholder={isAr ? 'رقم العضوية' : 'Card number'}
          aria-label={isAr ? 'رقم عضوية من دعاك' : 'Inviter card number'}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-900"
          data-testid="referral-entry-input"
        />
        <button type="button" onClick={check} disabled={busy || !code.trim()} className="px-4 py-2.5 rounded-xl bg-[#941946] text-white text-xs font-black disabled:opacity-50" data-testid="referral-entry-check">
          {isAr ? 'تحقق' : 'Check'}
        </button>
      </div>
      {error && <p className="text-xs font-bold text-red-700" role="alert" data-testid="referral-entry-error">{error}</p>}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-testid="referral-entry-dialog">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 text-slate-900">
            <p className="text-sm font-black leading-6">
              {isAr ? 'العضوية ' : 'Card '}<span dir="ltr">{preview.number}</span>{preview.name ? ` — ${preview.name}` : ''}
            </p>
            <p className="text-xs font-semibold leading-6">
              {isAr ? 'تستخدم الكود ده؟ ينفع تدخله مرة واحدة بس.' : 'Use this code? It can be entered only once.'}
            </p>
            <p className="text-xs font-bold text-emerald-700">
              {isAr ? 'خصمك: ' : 'Your discount: '}{planLine(preview.discounts ?? {}, preview.discount)}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={confirm} disabled={busy} className="flex-1 px-3 py-2.5 rounded-xl bg-[#941946] text-white text-xs font-black disabled:opacity-50" data-testid="referral-entry-confirm">{isAr ? 'تأكيد' : 'Confirm'}</button>
              <button type="button" onClick={() => setPreview(null)} disabled={busy} className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black" data-testid="referral-entry-cancel">{isAr ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
