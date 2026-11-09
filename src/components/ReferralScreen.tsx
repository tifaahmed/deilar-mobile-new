import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Gift, MessageCircle, Share2, Users, Wallet } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { fetchReferral, type ReferralInfo, type ReferralReward, type ReferralRow, type ReferralStage } from '../api/referral';
import { useIsAr } from '../context/LanguageContext';
import { useSession } from '../utils/session';
import { formatNumber } from '../utils/formatNumber';
import { reportClientError } from '../utils/reportError';

const when = (iso: string | null, isAr: boolean) => (iso ? new Date(iso).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' }) : '');

const PLAN_AR = { month: 'شهري', half: 'نصف سنوي', year: 'سنوي', other: 'اشتراك' } as const;
const PLAN_EN = { month: 'monthly', half: 'half-year', year: 'yearly', other: 'subscription' } as const;

/** The stage chip of one invited member: where they are right now. */
export function stageLabel(r: Pick<ReferralRow, 'stage' | 'plan'>, isAr: boolean): { text: string; tone: string } {
  const plan = r.plan ? (isAr ? PLAN_AR : PLAN_EN)[r.plan] : '';
  const map: Record<ReferralStage, { ar: string; en: string; tone: string }> = {
    registered: { ar: 'أنشأ حساباً', en: 'Created an account', tone: 'bg-slate-100 text-slate-700' },
    trial: { ar: 'بدأ التجربة', en: 'Started the trial', tone: 'bg-amber-100 text-amber-700' },
    subscribed: { ar: `اشترك ${plan}`, en: `Subscribed ${plan}`, tone: 'bg-emerald-100 text-emerald-700' },
    renewed: { ar: 'جدّد اشتراكه', en: 'Renewed', tone: 'bg-emerald-200 text-emerald-800' },
  };
  const m = map[r.stage];
  return { text: isAr ? m.ar : m.en, tone: m.tone };
}

/** One line of the details of a payout. */
export function rewardLabel(w: ReferralReward, isAr: boolean): string {
  if (w.kind === 'trial') return isAr ? 'مكافأة بدء التجربة' : 'Trial reward';
  const plan = w.plan ? (isAr ? PLAN_AR : PLAN_EN)[w.plan] : '';
  if (!w.rate) return isAr ? `عمولة ثابتة على ${plan} (${w.base_amount})` : `Fixed commission on ${plan} (${w.base_amount})`;
  return isAr ? `عمولة ${w.rate}% على ${plan} (${w.base_amount})` : `${w.rate}% commission on ${plan} (${w.base_amount})`;
}

/** The message that goes with the link: what the friend gets, in the backend's own numbers. */
export function inviteText(info: ReferralInfo, isAr: boolean): string {
  /* Each plan has its own discount: the message promises the best one ("up to"). */
  const discount = Math.max(info.amounts.discount, ...Object.values(info.amounts.plans ?? {}).map((p) => p?.discount ?? 0));
  return isAr
    ? `انضم لديلر كارت الخصومات 💳\nحمّل التطبيق من اللينك ده وهتاخد خصم لحد ${formatNumber(discount, true)} ج.م على اشتراكك.\nرقم عضوية اللي دعاك: ${info.code}\n${info.link}`
    : `Join Deilar, the discount card 💳\nDownload the app from this link and get up to ${discount} EGP off your subscription.\nMy card number: ${info.code}\n${info.link}`;
}

/** «ادعُ أصدقاءك»: my code, the share link, a QR, and who I brought (did they subscribe, what did it pay me). */
export const ReferralScreen: React.FC = () => {
  const isAr = useIsAr();
  const { token } = useSession();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    fetchReferral(token).then((r) => { if (live) setInfo(r); }).catch((e) => { reportClientError('Referral screen failed to load', e); if (live) setFailed(true); });
    return () => { live = false; };
  }, [token]);

  useEffect(() => {
    if (!info?.link) return;
    let live = true;
    void import('qrcode').then((m) => m.toDataURL(info.link!, { margin: 1, width: 320, color: { dark: '#941946', light: '#ffffff' } }))
      .then((url) => { if (live) setQr(url); })
      .catch((e) => reportClientError('Referral QR failed', e));
    return () => { live = false; };
  }, [info?.link]);

  if (!token) return <p className="p-3 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{isAr ? 'سجّل الدخول أولاً لتدعو أصدقاءك.' : 'Sign in first to invite friends.'}</p>;
  if (failed) return <p className="p-3 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200">{isAr ? 'تعذّر تحميل الصفحة. جرّب تاني.' : 'Could not load this page. Try again.'}</p>;
  if (!info) return <p className="text-xs font-semibold text-slate-400">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>;
  if (!info.enabled) return <p className="p-3 rounded-xl text-xs font-bold bg-slate-50 text-slate-600">{isAr ? 'الدعوات متوقفة حالياً.' : 'Invitations are not available right now.'}</p>;

  const { trial_bonus: trial, plans } = info.amounts;
  const n = (v: number) => formatNumber(v, isAr);
  const cur = isAr ? 'ج.م' : 'EGP';

  const share = async () => {
    const text = inviteText(info, isAr);
    try {
      if (Capacitor.isNativePlatform()) await Share.share({ title: isAr ? 'ديلر' : 'Deilar', text, dialogTitle: isAr ? 'ادعُ أصدقاءك' : 'Invite friends' });
      else if (navigator.share) await navigator.share({ title: 'Deilar', text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    } catch (error) {
      if (!/cancel|abort/i.test(String((error as Error)?.message ?? error))) reportClientError('Referral share failed', error);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteText(info, isAr));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      reportClientError('Referral copy failed', error);
    }
  };

  return (
    <div className="space-y-3 text-right" data-testid="referral-screen">
      <div className="rounded-3xl bg-gradient-to-l from-[#941946] to-[#c2305f] text-white p-4 space-y-1">
        <p className="flex items-center gap-2 text-base font-black"><Gift className="w-5 h-5" /> {isAr ? 'ادعُ أصدقاءك واكسب' : 'Invite friends and earn'}</p>
        <p className="text-xs leading-6 text-white/90">
          {isAr
            ? `لما صاحبك ينزّل التطبيق بلينكك ويبدأ التجربة تاخد ${n(trial)} ${cur} في محفظتك، وبعدها عمولة على كل اشتراك يدفعه (وكل تجديد). الخصم والعمولة بيختلفوا حسب الباقة:`
            : `When your friend installs with your link and starts the trial you get ${trial} ${cur} in your wallet, then a commission on every subscription they pay (renewals too). The discount and the commission depend on the plan:`}
        </p>
        {plans && (
          <ul className="space-y-1 text-[11px] font-bold" data-testid="referral-plans">
            {(['month', 'half', 'year'] as const).filter((key) => plans[key]).map((key) => {
              const rule = plans[key]!;
              const earn = rule.commission_type === 'fixed'
                ? `${n(rule.commission_fixed)} ${cur}`
                : `${n(rule.commission_percent)}%`;
              return (
                <li key={key} data-testid={`referral-plan-${key}`} className="rounded-xl bg-white/15 px-3 py-1.5">
                  {isAr
                    ? `${PLAN_AR[key]}: صاحبك ياخد خصم ${n(rule.discount)} ${cur} · انت تاخد ${earn}`
                    : `${PLAN_EN[key]}: your friend gets ${n(rule.discount)} ${cur} off · you earn ${earn}`}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {info.code && info.link ? (
        <section className="rounded-3xl bg-white border-2 border-slate-200 p-4 space-y-3 text-center">
          <p className="text-xs font-bold text-slate-500">{isAr ? 'كودك (رقم عضويتك)' : 'Your code (card number)'}</p>
          <p className="text-3xl font-black tracking-widest text-[#941946]" dir="ltr" data-testid="referral-code">{info.code}</p>
          {qr && <img src={qr} alt={isAr ? 'QR للدعوة' : 'Invite QR code'} className="mx-auto w-48 h-48 rounded-2xl border border-slate-200" data-testid="referral-qr" />}
          <p className="text-[11px] text-slate-500">{isAr ? 'اعرض الـ QR على صاحبك ليفتحه بكاميرا موبايله، أو ابعتله اللينك.' : 'Show this QR to your friend to scan, or send the link.'}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void share()} className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-[#941946] text-white text-sm font-black cursor-pointer" data-testid="referral-share">
              <Share2 className="w-4 h-4" /> {isAr ? 'مشاركة' : 'Share'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(inviteText(info, isAr))}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black" data-testid="referral-whatsapp">
              <MessageCircle className="w-4 h-4" /> {isAr ? 'واتساب' : 'WhatsApp'}
            </a>
          </div>
          <button type="button" onClick={() => void copy()} className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? (isAr ? 'تم النسخ' : 'Copied') : isAr ? 'نسخ الرسالة' : 'Copy message'}
          </button>
        </section>
      ) : (
        <p className="p-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">{isAr ? 'اعمل كارتك الأول عشان يبقى عندك كود تشاركه.' : 'Create your card first so you have a code to share.'}</p>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 p-3 space-y-2" data-testid="referral-dashboard">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> {isAr ? 'لوحة أرباحك' : 'Your earnings'}</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['registered', isAr ? 'سجّلوا' : 'Signed up', n(info.totals.registered)],
            ['trials', isAr ? 'بدأوا التجربة' : 'Started a trial', n(info.totals.trials)],
            ['subscribed', isAr ? 'عندهم اشتراك مدفوع' : 'Paid subscribers', n(info.totals.subscribed)],
            ['trial-earned', isAr ? 'مكافآت التجربة' : 'Trial rewards', `${n(info.totals.trial_earned)} ${cur}`],
            ['commission', isAr ? 'عمولات الاشتراكات' : 'Subscription commissions', `${n(info.totals.commission_earned)} ${cur}`],
            ['earned', isAr ? 'إجمالي الأرباح' : 'Total earned', `${n(info.totals.earned)} ${cur}`],
            ['wallet', isAr ? 'رصيد المحفظة' : 'Wallet balance', `${n(info.totals.wallet_balance)} ${cur}`],
            ['pending', isAr ? 'أرباح معلّقة' : 'Pending earnings', `${n(info.totals.pending)} ${cur}`],
          ].map(([key, label, value]) => (
            <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold text-slate-500">{label}</p>
              <p className="text-base font-black text-slate-900 tabular-nums" dir="ltr" data-testid={`referral-stat-${key}`}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-slate-400">
          {isAr
            ? `ضغطوا على لينكك ${n(info.totals.clicks)} مرة، وفتحوا التطبيق ${n(info.totals.app_opens)} مرة (أرقام إجمالية فقط). المعلّق: مكافآت في انتظار تأكيد رقم الصديق، وعمولة اشتراكات لسه ما اتأكدتش.`
            : `Your link was tapped ${info.totals.clicks} times and the app opened ${info.totals.app_opens} times (totals only). Pending: rewards waiting for your friend's phone to be verified, and commission on payments not yet confirmed.`}
        </p>
      </section>

      {info.brought_by && (
        <p className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200" data-testid="referral-brought-by">
          {isAr
            ? `جيت عن طريق العضو ${info.brought_by.number}. ${info.brought_by.discount_used ? 'استخدمت خصم الدعوة.' : `خصم ${n(info.brought_by.discount)} ${cur} مستنيك على أول اشتراك.`}`
            : `You came through member ${info.brought_by.number}. ${info.brought_by.discount_used ? 'Your invitation discount was used.' : `${info.brought_by.discount} ${cur} off is waiting on your first subscription.`}`}
        </p>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 p-3 space-y-2" data-testid="referral-list">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5"><Users className="w-4 h-4" /> {isAr ? 'اللي سجّلوا عن طريقك' : 'Who joined through you'}</h2>
        {info.referrals.length === 0 && <p className="text-xs font-semibold text-slate-500">{isAr ? 'لسه محدش سجّل عن طريقك.' : 'Nobody has joined through you yet.'}</p>}
        {info.referrals.map((r) => {
          const st = stageLabel(r, isAr);
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-xl bg-slate-50 px-3 py-2" data-testid={`referral-row-${r.id}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="w-full flex items-center gap-3 text-start cursor-pointer" aria-expanded={isOpen}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{r.name || (isAr ? 'عضو جديد' : 'New member')}{r.phone_last4 && <span className="text-[11px] font-semibold text-slate-400" dir="ltr"> ••{r.phone_last4}</span>}</p>
                  <p className="text-[11px] text-slate-500">{when(r.joined_at, isAr)}</p>
                </div>
                <div className="text-end">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${st.tone}`} data-testid={`referral-stage-${r.id}`}>{st.text}</span>
                  <p className="text-[11px] font-black text-emerald-700 tabular-nums" dir="ltr">+{n(r.earned)} {cur}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2" data-testid={`referral-rewards-${r.id}`}>
                  {r.rewards.length === 0 && <li className="text-[11px] text-slate-500">{isAr ? 'لسه مفيش مكافآت من العضو ده.' : 'No payouts from this member yet.'}</li>}
                  {r.rewards.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className={w.status === 'reversed' ? 'text-slate-400 line-through' : 'text-slate-700'}>
                        {rewardLabel(w, isAr)} · {when(w.at, isAr)}{w.status === 'reversed' ? (isAr ? ' — تم الاسترداد' : ' — reversed') : ''}
                      </span>
                      <b className={`tabular-nums ${w.status === 'reversed' ? 'text-slate-400 line-through' : 'text-emerald-700'}`} dir="ltr">+{n(w.amount)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};
