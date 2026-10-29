import React, { useEffect, useRef, useState } from 'react';
import { LegalConsent } from './LegalPages';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, MessageCircle, Phone, PhoneCall, ShieldCheck, Sparkles, UserPlus, UserRound, X } from 'lucide-react';
import { ApiError, postContactMessage } from '../api/http';
import { previewSignIn } from '../utils/quizStore';
import { cardPhoneHint, fetchCard, phoneHasCard, requestCardOtp, requestCardPhone, requestOtp, verifyCardOtp, verifyCardPhone, verifyOtp } from '../api/auth';
import { navigate, routeHref } from '../router';
import { claimOrders } from '../api/orders';
import { storedOrders } from '../utils/orders';
import { getSession, updateSession } from '../utils/session';
import { useLanguage } from '../context/LanguageContext';
import { usePopupHash } from '../utils/popupHash';
import { useContact } from '../hooks/useCatalog';

/** Egyptian mobile: 11 digits starting with 01. */
const PHONE_RE = /^01\d{9}$/;
const PHONE_LEN = 11;

export type AccessStep = 'choose' | 'phone' | 'code' | 'card' | 'addphone' | 'visitor' | 'offer' | 'confirm';

/** Whose phone the code on screen was sent to: the one typed, the one already on a card, or a new one being added to a card. */
type CodeFor = 'phone' | 'card' | 'addphone';

interface AccessModalProps {
  onClose: () => void;
  initialStep?: AccessStep;
}

/**
 * The app's two doors, in one popup:
 *  1. sign in with a phone number + the code texted by the backend — the member's
 *     own card is attached automatically;
 *  2. "just show my card" by typing a membership number, no sign-in.
 *
 * Typing a card number first never blocks signing in later: the session keeps
 * the number that was entered, and a later sign-in only fills it in when it is empty.
 * The phone typed here is also sent to the Contact Us inbox (source: card popup),
 * so the team can call people who started but never finished.
 */
export const AccessModal: React.FC<AccessModalProps> = ({ onClose, initialStep = 'choose' }) => {
  // Shrinks the whole card to the screen when its content is taller than the viewport, so nothing ever scrolls.
  const fitRef = useRef<HTMLDivElement>(null);
  const { isAr, brandName } = useLanguage();
  const [step, setStep] = useState<AccessStep>(initialStep);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [cardNumber, setCardNumber] = useState(() => getSession().pendingCard ?? '');
  const [codeFor, setCodeFor] = useState<CodeFor>('phone');
  const [codeLength, setCodeLength] = useState(4);
  const [maskedPhone, setMaskedPhone] = useState('');
  /** The phone on the typed card (last 4 digits), shown for the holder to check BEFORE the code is sent. */
  const [cardHint, setCardHint] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contact = useContact();
  const [welcome, setWelcome] = useState<string | null>(null);

  // The URL names the form on screen (/map#otp-popup), so a link, a refresh or a bug report says where the visitor is.
  usePopupHash(
    welcome !== null
      ? 'welcome-popup'
      : ({
          choose: 'new-visit-popup',
          phone: 'sign-in-popup',
          code: 'otp-popup',
          visitor: 'new-visitor-popup',
          offer: 'free-card-offer-popup',
          confirm: 'free-card-confirm-popup',
          card: 'card-number-popup',
          addphone: 'add-phone-popup',
        } satisfies Record<AccessStep, string>)[step],
  );
  /** The visitor accepted the free trial card: after the code the card page (/card) takes over. */
  const [trialFlow, setTrialFlow] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  // An existing member is signed in as soon as the code is right: show who they are for a moment, then close.
  useEffect(() => {
    if (welcome === null || !getSession().cardNumber) return;
    const id = setTimeout(onClose, 1600);
    return () => clearTimeout(id);
  }, [welcome, onClose]);

  const messageOf = (e: unknown, fallbackAr: string, fallbackEn: string) =>
    e instanceof ApiError && e.status !== 0 && e.reason ? e.message : isAr ? fallbackAr : fallbackEn;

  const cleanPhone = phone;

  /** Said BEFORE a code is sent when signing in would move or delete the quiz points on this phone. */
  const [notice, setNotice] = useState<{ move: { answers: number; points: number }; remove: { answers: number; points: number }; go: () => void } | null>(null);
  const [acked, setAcked] = useState('');

  /** Runs `go` now, or asks first when it would add guest points to the account or delete another account's points. */
  const confirmPoints = (who: { card?: string; phone?: string }, go: () => void): boolean => {
    const key = JSON.stringify(who);
    const preview = previewSignIn(who);
    if (acked === key || (preview.move.answers === 0 && preview.remove.answers === 0)) return true;

    setNotice({ ...preview, go: () => { setAcked(key); setNotice(null); go(); } });
    return false;
  };

  const sendCode = async (target: string = cleanPhone) => {
    if (!PHONE_RE.test(target)) {
      setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
      return;
    }

    if (!confirmPoints({ phone: target }, () => void sendCode(target))) return;

    setBusy(true);
    setError(null);

    // Best effort and only once per number: a failure here must never block signing in.
    if (getSession().leadPhone !== target) {
      postContactMessage({
        phone: target,
        message: isAr ? 'طلب كارت ديلر مجاناً من تطبيق الموبايل' : 'Free Deilar card request from the mobile app',
        source: 'card_popup',
      })
        .then(() => updateSession({ leadPhone: target }))
        .catch(() => undefined);
    }

    try {
      const sent = await requestOtp(target);
      setCodeLength(sent.code_length);
      setMaskedPhone(sent.phone_masked);
      setResendIn(sent.resend_after);
      setCode('');
      setStep('code');
    } catch (e) {
      // A code is already on its way (cooldown): go to the code step instead of an error.
      if (e instanceof ApiError && e.reason === 'cooldown') {
        setResendIn(Number(e.body?.retry_after ?? 60));
        setStep('code');
      } else {
        setError(messageOf(e, 'تعذر إرسال الكود، حاول مرة أخرى', 'Could not send the code, please try again'));
      }
    } finally {
      setBusy(false);
    }
  };

  /** Sends the code for a card number: to the phone on the card, or to the new phone being added to it. */
  const sendCardCode = async (mode: 'card' | 'addphone') => {
    if (mode === 'addphone' && !PHONE_RE.test(cleanPhone)) {
      setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
      return;
    }

    if (!confirmPoints({ card: cardNumber.trim(), phone: mode === 'addphone' ? cleanPhone : undefined }, () => void sendCardCode(mode))) return;

    setBusy(true);
    setError(null);

    try {
      const number = cardNumber.trim();
      const sent = mode === 'card' ? await requestCardOtp(number) : await requestCardPhone(number, cleanPhone);

      if (!sent.has_phone && mode === 'card') {
        // The card holds no phone: nothing was sent and nothing opens. Only the number is remembered, to ask for the phone.
        updateSession({ pendingCard: number });
        setStep('addphone');
        return;
      }

      setCodeFor(mode);
      setCodeLength(sent.code_length ?? 4);
      setMaskedPhone(sent.phone_masked ?? '');
      setResendIn(sent.resend_after ?? 60);
      setCode('');
      setStep('code');
    } catch (e) {
      if (e instanceof ApiError && e.reason === 'cooldown') {
        setCodeFor(mode);
        setResendIn(Number(e.body?.retry_after ?? 60));
        setStep('code');
      } else if (e instanceof ApiError && e.status === 404) {
        setError(isAr ? 'رقم العضوية غير موجود' : 'Membership number not found');
      } else {
        setError(messageOf(e, 'تعذر إرسال الكود، حاول مرة أخرى', 'Could not send the code, please try again'));
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);

    try {
      const card = cardNumber.trim();
      const result =
        codeFor === 'card' ? await verifyCardOtp(card, value) : codeFor === 'addphone' ? await verifyCardPhone(card, cleanPhone, value) : await verifyOtp(cleanPhone, value);
      const session = getSession();

      updateSession({
        token: result.token,
        pendingCard: undefined,
        phone: result.user.phone ?? (codeFor === 'card' ? undefined : cleanPhone),
        name: result.user.name ?? undefined,
        leadPhone: result.user.phone ?? cleanPhone,
        // A card number the visitor already typed wins; otherwise the member's own card comes with the sign-in.
        // A `REG-` number is a placeholder from a sign-up that holds no card yet — it is not a card to look up.
        cardNumber: (codeFor === 'phone' ? session.cardNumber : card) ?? (result.membership?.membership_number.startsWith('REG-') ? undefined : result.membership?.membership_number),
      });
      // Orders placed on this device as a guest now belong to the member (already-owned ones are left alone).
      const guestCodes = storedOrders().map((o) => o.code);
      if (guestCodes.length > 0) claimOrders(result.token, guestCodes).catch(() => undefined);
      const hasRealCard = !!result.membership && !result.membership.membership_number.startsWith('REG-');

      if (!hasRealCard) {
        // A new member (signed in with the code but holding no card): the free card is made on the card page, not in
        // this popup. The name typed so far travels with the session; an existing member is simply signed in.
        const typed = visitorName.trim() || result.user.name || undefined;
        if (typed) updateSession({ name: typed });
        onClose();
        navigate(routeHref({ tab: 'mycard' }));
      } else {
        setWelcome(result.user.name || cleanPhone);
      }
    } catch (e) {
      setCode('');
      setError(messageOf(e, 'الكود غير صحيح', 'That code is not right'));
      codeInput.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const submitVisitor = async () => {
    const name = visitorName.trim();
    if (!name) {
      setError(isAr ? 'أدخل اسمك' : 'Enter your name');
      return;
    }
    if (!PHONE_RE.test(cleanPhone)) {
      setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await postContactMessage({
        phone: cleanPhone,
        name,
        message: isAr ? `زائر جديد: ${name}` : `New visitor: ${name}`,
        source: 'card_popup',
      });
      updateSession({ name, phone: cleanPhone, leadPhone: cleanPhone });

      // A number that holds no card yet is offered the free trial. One that already has a card is signed in with
      // its code. A failed lookup says so — the popup never closes without an answer.
      const hasCard = await phoneHasCard(cleanPhone).then((v) => v, () => null);
      if (hasCard === null) {
        setError(isAr ? 'تعذر التحقق من الرقم الآن، حاول مرة أخرى' : 'Could not check the number right now, please try again');
      } else if (hasCard) {
        setBusy(false);
        await sendCode();
        return;
      } else {
        setStep('offer');
      }
    } catch (e) {
      setError(messageOf(e, 'تعذر إرسال بياناتك، حاول مرة أخرى', 'Could not send your details, please try again'));
    } finally {
      setBusy(false);
    }
  };

  /** A card number is only a key to look the card up: the data opens after the code texted to the phone on the card. */
  const showCard = async () => {
    const number = cardNumber.trim();
    if (!number) return;

    setBusy(true);
    setError(null);

    try {
      const card = await fetchCard(number);
      setCardNumber(card.number);

      if (card.has_phone === false) {
        // The card is real but holds no phone: nothing opens until one is added and confirmed by its code.
        updateSession({ pendingCard: card.number });
        setStep('addphone');
      } else {
        // Show the last 4 digits first; the code is sent only when the holder confirms them.
        const hint = await cardPhoneHint(card.number);
        if (hint.has_phone === false) {
          updateSession({ pendingCard: card.number });
          setStep('addphone');
        } else {
          setCardHint(hint.phone_masked ?? '');
        }
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? isAr ? 'رقم العضوية غير موجود' : 'Membership number not found'
          : e instanceof ApiError && e.status === 429
            ? isAr ? 'محاولات كثيرة، انتظر قليلاً ثم حاول مرة أخرى' : 'Too many attempts, wait a moment and try again'
            : isAr ? 'تعذر التحقق من الرقم، حاول مرة أخرى' : 'Could not check the number, please try again',
      );
    } finally {
      setBusy(false);
    }
  };

  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, '').slice(0, PHONE_LEN));
    setError(null);
  };
  const phoneValid = PHONE_RE.test(phone);
  const phoneCounter = (
    <span dir="ltr" className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-base font-mono font-bold ${phoneValid ? 'text-emerald-400' : phone.length ? 'text-amber-400' : 'text-slate-500'}`}>
      {phone.length}/{PHONE_LEN}
    </span>
  );

  const field = `w-full ${isAr ? 'pr-11 pl-3 text-right' : 'pl-11 pr-3 text-left'} py-3.5 text-base rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:border-amber-400 transition-colors`;
  const primary =
    'w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-2xl text-base flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer';
  const secondary =
    'w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-1.5 transition-colors cursor-pointer';
  const back = (to: AccessStep) => (
    <button onClick={() => { setStep(to); setError(null); }} className="text-base text-slate-400 hover:text-white font-bold cursor-pointer">
      {isAr ? '← رجوع' : '← Back'}
    </button>
  );

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const fit = () => {
      el.style.zoom = '1';
      const room = window.innerHeight - 24;
      el.style.zoom = el.offsetHeight > room ? String(Math.max(0.5, room / el.offsetHeight)) : '1';
    };
    fit();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro?.disconnect(); window.removeEventListener('resize', fit); };
  });

  return (
    <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      {notice && (
        <div role="alertdialog" aria-modal="true" dir={isAr ? 'rtl' : 'ltr'} className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-black">{isAr ? 'نقاط على هذا الهاتف' : 'Points on this phone'}</h3>
            {notice.move.answers > 0 && (
              <p className="text-[13px] leading-6">
                {isAr
                  ? `النقاط التي لُعبت على هذا الهاتف دون حساب (${notice.move.points} نقطة من ${notice.move.answers} إجابة) ستُضاف إلى الحساب الذي تدخل به.`
                  : `The points played on this phone without an account (${notice.move.points} points from ${notice.move.answers} answers) will be added to the account you sign in to.`}
              </p>
            )}
            {notice.remove.answers > 0 && (
              <p className="text-[13px] leading-6 font-bold text-rose-700">
                {isAr
                  ? `على الهاتف نقاط تخص حساباً آخر (${notice.remove.points} نقطة من ${notice.remove.answers} إجابة). إن لم يكن هذا حسابها فستُحذف من الهاتف.`
                  : `This phone holds points of another account (${notice.remove.points} points from ${notice.remove.answers} answers). If this is not that account, they will be deleted from the phone.`}
              </p>
            )}
            <p className="text-[12px] text-slate-500">{isAr ? 'عند الموافقة نرسل كود التحقق.' : 'If you agree, we send the verification code.'}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setNotice(null)} className="py-3 rounded-2xl bg-slate-100 text-slate-800 text-sm font-bold cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={notice.go} className="py-3 rounded-2xl bg-[#941946] text-white text-sm font-bold cursor-pointer">{isAr ? 'موافق، أرسل الكود' : 'Agree, send code'}</button>
            </div>
          </div>
        </div>
      )}
      <div ref={fitRef} className={`bg-slate-950 text-white rounded-3xl max-w-md w-full border border-amber-400/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150 ${isAr ? 'text-right' : 'text-left'}`}>
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <h3 className="text-base font-black text-amber-300">{isAr ? `كارت ${brandName}` : `${brandName} medical card`}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer" title={isAr ? 'إغلاق' : 'Close'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 space-y-3">
          {welcome ? (
            <div className="py-3 text-center space-y-3.5 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black">{isAr ? `أهلاً ${welcome}` : `Welcome ${welcome}`}</h4>
              <p className="text-base text-amber-300 font-bold">
                {getSession().cardNumber
                  ? isAr ? `كارتك رقم ${getSession().cardNumber} جاهز` : `Your card ${getSession().cardNumber} is ready`
                  : isAr ? 'لا يوجد كارت مرتبط برقمك بعد' : 'No card is linked to your number yet'}
              </p>
              <button onClick={onClose} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-base flex items-center justify-center gap-1 cursor-pointer">
                <span>{isAr ? 'الدخول للتطبيق' : 'Enter app'}</span>
                <ArrowLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
              </button>
            </div>
          ) : (
            <>
              {step === 'choose' && (
                <div className="space-y-3.5">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {isAr ? 'سجّل الدخول برقم هاتفك لتصل إلى كارتك تلقائياً، أو اعرض بيانات كارتك برقم العضوية.' : 'Sign in with your phone to get your card automatically, or view your card with its membership number.'}
                  </p>
                  <button onClick={() => setStep('phone')} className={primary}>
                    <Phone className="w-5 h-5" />
                    <span>{isAr ? 'تسجيل الدخول برقم الهاتف' : 'Sign in with phone number'}</span>
                  </button>
                  <button onClick={() => { setCardHint(null); setStep('card'); }} className={secondary}>
                    <CreditCard className="w-7 h-7 text-amber-400" />
                    <span>{isAr ? 'عرض بيانات الكارت برقم العضوية' : 'View card with membership number'}</span>
                  </button>
                  <button onClick={() => setStep('visitor')} className={secondary}>
                    <UserPlus className="w-7 h-7 text-amber-400" />
                    <span>{isAr ? 'زائر جديد' : 'New visitor'}</span>
                  </button>
                </div>
              )}

              {step === 'phone' && (
                <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{isAr ? 'أدخل رقم هاتفك' : 'Enter your phone number'}</span>
                    {back('choose')}
                  </div>
                  <div className="relative">
                    <Phone className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="tel" inputMode="numeric" required autoFocus dir="ltr" maxLength={PHONE_LEN} placeholder="010xxxxxxxx" value={phone} onChange={onPhoneChange} className={field} />
                    {phoneCounter}
                  </div>
                  <button type="submit" disabled={busy || !phoneValid} className={primary}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    <span>{isAr ? 'إرسال كود التحقق' : 'Send verification code'}</span>
                  </button>
                  <LegalConsent className="text-slate-400 text-center" />
                </form>
              )}

              {step === 'code' && (
                <form onSubmit={(e) => { e.preventDefault(); if (code.length === codeLength) verify(code); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">
                      {isAr ? 'أدخل الكود المرسل إلى ' : 'Enter the code sent to '}
                      {/* Digits keep their left-to-right order inside the Arabic sentence (••••1460, not 1460••••). */}
                      {maskedPhone ? <bdi dir="ltr" className="font-mono">{maskedPhone}</bdi> : isAr ? 'هاتفك' : 'your phone'}
                    </span>
                    {back(codeFor === 'card' ? 'card' : codeFor === 'addphone' ? 'addphone' : trialFlow ? 'confirm' : 'phone')}
                  </div>
                  <input
                    ref={codeInput}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    maxLength={codeLength}
                    value={code}
                    placeholder={'•'.repeat(codeLength)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setCode(value);
                      setError(null);
                      if (value.length === codeLength && !busy) verify(value);
                    }}
                    className="w-full text-center text-2xl py-4 rounded-2xl bg-slate-900 border border-slate-700 text-white font-mono tracking-[0.6em] focus:outline-none focus:border-amber-400"
                  />
                  <button type="submit" disabled={busy || code.length !== codeLength} className={primary}>
                    {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{isAr ? 'تأكيد ودخول' : 'Verify & sign in'}</span>
                  </button>
                  <button type="button" disabled={resendIn > 0 || busy} onClick={() => (codeFor === 'phone' ? sendCode() : sendCardCode(codeFor))} className="w-full text-base font-bold text-slate-400 hover:text-white disabled:opacity-50 cursor-pointer">
                    {resendIn > 0 ? (isAr ? `إعادة الإرسال بعد ${resendIn} ث` : `Resend in ${resendIn}s`) : isAr ? 'إعادة إرسال الكود' : 'Resend code'}
                  </button>
                </form>
              )}

              {step === 'visitor' && (
                <form onSubmit={(e) => { e.preventDefault(); submitVisitor(); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{isAr ? 'زائر جديد' : 'New visitor'}</span>
                    {back('choose')}
                  </div>
                  <div className="relative">
                    <UserRound className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="text" required autoFocus placeholder={isAr ? 'الاسم' : 'Name'} value={visitorName} onChange={(e) => { setVisitorName(e.target.value); setError(null); }} className={field.replace('font-mono tracking-wider', '')} />
                  </div>
                  <div className="relative">
                    <Phone className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="tel" inputMode="numeric" required dir="ltr" maxLength={PHONE_LEN} placeholder="010xxxxxxxx" value={phone} onChange={onPhoneChange} className={field} />
                    {phoneCounter}
                  </div>
                  <button type="submit" disabled={busy || !visitorName.trim() || !phoneValid} className={primary}>
                    {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{isAr ? 'إرسال' : 'Submit'}</span>
                  </button>
                </form>
              )}

              {step === 'offer' && (
                <div className="space-y-3.5 text-center">
                  <div className="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-400 text-amber-400 mx-auto flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black">{isAr ? 'هل تريد إكمال الخطوات؟' : 'Do you want to complete the process?'}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {isAr ? 'رقمك غير مسجل لدينا. أكمل الآن واحصل على كارت ديلر مجاناً لمدة شهر.' : 'Your number is not registered with us. Complete now and get your Deilar card free for one month.'}
                  </p>
                  <button onClick={() => { setTrialFlow(true); setStep('confirm'); }} className={primary}>
                    <Sparkles className="w-5 h-5" />
                    <span>{isAr ? 'نعم، أريد الكارت المجاني' : 'Yes, get my free card'}</span>
                  </button>
                  <button onClick={onClose} className="w-full text-base font-bold text-slate-400 hover:text-white cursor-pointer">
                    {isAr ? 'ليس الآن' : 'Not now'}
                  </button>
                </div>
              )}

              {step === 'confirm' && (
                <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{isAr ? 'تأكيد بياناتك' : 'Confirm your details'}</span>
                    {back('offer')}
                  </div>
                  <div className="relative">
                    <UserRound className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="text" required minLength={3} placeholder={isAr ? 'الاسم' : 'Name'} value={visitorName} onChange={(e) => { setVisitorName(e.target.value); setError(null); }} className={field.replace('font-mono tracking-wider', '')} />
                  </div>
                  <div className="relative">
                    <Phone className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="tel" inputMode="numeric" required dir="ltr" maxLength={PHONE_LEN} placeholder="010xxxxxxxx" value={phone} onChange={onPhoneChange} className={field} />
                    {phoneCounter}
                  </div>
                  <button type="submit" disabled={busy || visitorName.trim().length < 3 || !phoneValid} className={primary}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    <span>{isAr ? 'تأكيد وإرسال كود التحقق' : 'Confirm & send verification code'}</span>
                  </button>
                </form>
              )}

              {step === 'card' && (
                <form onSubmit={(e) => { e.preventDefault(); if (cardHint !== null) void sendCardCode('card'); else void showCard(); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{isAr ? 'أدخل رقم العضوية' : 'Enter the membership number'}</span>
                    {back('choose')}
                  </div>
                  {cardHint !== null && (
                    <div role="status" className="p-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 space-y-1 text-center">
                      <p className="text-sm text-slate-300">{isAr ? 'سنرسل الكود إلى الهاتف المنتهي بـ' : 'We will text the code to the phone ending in'}</p>
                      <p dir="ltr" className="text-2xl font-black tracking-widest text-amber-300" data-testid="card-phone-hint">{cardHint}</p>
                      <p className="text-xs text-slate-400">{isAr ? 'تأكد أنه رقمك قبل الإرسال. إن لم يكن، راجع رقم العضوية.' : 'Check it is your number before sending. If not, re-check the membership number.'}</p>
                    </div>
                  )}
                  <div className="relative">
                    <CreditCard className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="text" required autoFocus dir="ltr" placeholder="1234" value={cardNumber} onChange={(e) => { setCardNumber(e.target.value); setCardHint(null); setError(null); }} className={field} />
                  </div>
                  <button type="submit" disabled={busy || !cardNumber.trim()} className={primary}>
                    {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{cardHint !== null ? (isAr ? 'إرسال كود التحقق' : 'Send verification code') : isAr ? 'متابعة' : 'Continue'}</span>
                  </button>
                  <p className="text-base text-slate-500 text-center">
                    {isAr ? 'سنرسل كوداً إلى الهاتف المرتبط بالكارت لتأكيد دخولك' : 'We text a code to the phone linked to the card to confirm it is you'}
                  </p>
                </form>
              )}

              {step === 'addphone' && (
                <form onSubmit={(e) => { e.preventDefault(); sendCardCode('addphone'); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{isAr ? 'أضف رقم هاتف لكارتك' : 'Add a phone to your card'}</span>
                    {back('card')}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {isAr
                      ? `كارت رقم ${cardNumber} غير مرتبط برقم هاتف. أضف رقمك وسنرسل إليه كود تأكيد لتسجيل الدخول. الرقم لا يمكن تغييره بعد إضافته.`
                      : `Card ${cardNumber} has no phone number yet. Add yours and we will text it a code to sign in. The number cannot be changed once added.`}
                  </p>
                  <div className="relative">
                    <Phone className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="tel" inputMode="numeric" required autoFocus dir="ltr" maxLength={PHONE_LEN} placeholder="010xxxxxxxx" value={phone} onChange={onPhoneChange} className={field} />
                    {phoneCounter}
                  </div>
                  <button type="submit" disabled={busy || !phoneValid} className={primary}>
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    <span>{isAr ? 'إرسال كود التحقق' : 'Send verification code'}</span>
                  </button>
                </form>
              )}

              {error && (
                <p className="text-base text-rose-400 font-bold" role="alert">
                  {error}
                </p>
              )}

              {/* Whatever went wrong, the member can reach customer service from here (numbers come from the admin settings). */}
              {error && (contact.phone || contact.whatsapp) && (
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-slate-400 font-bold">{isAr ? 'تواصل مع خدمة العملاء:' : 'Contact customer service:'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {contact.phone && (
                      <a href={`tel:${contact.dial ?? contact.phone}`} className="py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-bold flex items-center justify-center gap-1.5">
                        <PhoneCall className="w-4 h-4 text-amber-400" />
                        <span dir="ltr" className="font-mono">{contact.phone}</span>
                      </a>
                    )}
                    {contact.whatsapp && (
                      <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="py-3 rounded-2xl bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
