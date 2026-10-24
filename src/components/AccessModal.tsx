import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Phone, ShieldCheck, Sparkles, UserPlus, UserRound, X } from 'lucide-react';
import { ApiError, postContactMessage } from '../api/http';
import { fetchCard, phoneHasCard, requestOtp, verifyOtp } from '../api/auth';
import { navigate, routeHref } from '../router';
import { claimOrders } from '../api/orders';
import { storedOrders } from '../utils/orders';
import { getSession, updateSession } from '../utils/session';
import { useLanguage } from '../context/LanguageContext';
import { usePopupHash } from '../utils/popupHash';

/** Egyptian mobile: 11 digits starting with 01. */
const PHONE_RE = /^01\d{9}$/;
const PHONE_LEN = 11;

export type AccessStep = 'choose' | 'phone' | 'code' | 'card' | 'visitor' | 'offer' | 'confirm';

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
  const [cardNumber, setCardNumber] = useState('');
  const [codeLength, setCodeLength] = useState(4);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const sendCode = async (target: string = cleanPhone) => {
    if (!PHONE_RE.test(target)) {
      setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
      return;
    }

    setBusy(true);
    setError(null);

    // Best effort and only once per number: a failure here must never block signing in.
    if (getSession().leadPhone !== target) {
      postContactMessage({
        phone: target,
        message: isAr ? 'طلب كرت ديلار مجاناً من تطبيق الموبايل' : 'Free Deilar card request from the mobile app',
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

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);

    try {
      const result = await verifyOtp(cleanPhone, value);
      const session = getSession();

      updateSession({
        token: result.token,
        phone: result.user.phone ?? cleanPhone,
        name: result.user.name ?? undefined,
        leadPhone: cleanPhone,
        // A card number the visitor already typed wins; otherwise the member's own card comes with the sign-in.
        // A `REG-` number is a placeholder from a sign-up that holds no card yet — it is not a card to look up.
        cardNumber: session.cardNumber ?? (result.membership?.membership_number.startsWith('REG-') ? undefined : result.membership?.membership_number),
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
        navigate(routeHref({ tab: 'profile' }));
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

  const showCard = async () => {
    const number = cardNumber.trim();
    if (!number) return;

    setBusy(true);
    setError(null);

    try {
      const card = await fetchCard(number);
      updateSession({ cardNumber: card.number });
      onClose();
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
      <div ref={fitRef} className={`bg-slate-950 text-white rounded-3xl max-w-md w-full border border-amber-400/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150 ${isAr ? 'text-right' : 'text-left'}`}>
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <h3 className="text-base font-black text-amber-300">{isAr ? `كرت ${brandName} الطبي` : `${brandName} medical card`}</h3>
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
                  ? isAr ? `كرتك رقم ${getSession().cardNumber} جاهز` : `Your card ${getSession().cardNumber} is ready`
                  : isAr ? 'لا يوجد كرت مرتبط برقمك بعد' : 'No card is linked to your number yet'}
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
                    {isAr ? 'سجّل الدخول برقم هاتفك لتصل إلى كرتك تلقائياً، أو اعرض بيانات كرتك برقم العضوية.' : 'Sign in with your phone to get your card automatically, or view your card with its membership number.'}
                  </p>
                  <button onClick={() => setStep('phone')} className={primary}>
                    <Phone className="w-5 h-5" />
                    <span>{isAr ? 'تسجيل الدخول برقم الهاتف' : 'Sign in with phone number'}</span>
                  </button>
                  <button onClick={() => setStep('card')} className={secondary}>
                    <CreditCard className="w-7 h-7 text-amber-400" />
                    <span>{isAr ? 'عرض بيانات الكرت برقم العضوية' : 'View card with membership number'}</span>
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
                </form>
              )}

              {step === 'code' && (
                <form onSubmit={(e) => { e.preventDefault(); if (code.length === codeLength) verify(code); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">
                      {isAr ? `أدخل الكود المرسل إلى ${maskedPhone || 'هاتفك'}` : `Enter the code sent to ${maskedPhone || 'your phone'}`}
                    </span>
                    {back(trialFlow ? 'confirm' : 'phone')}
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
                  <button type="button" disabled={resendIn > 0 || busy} onClick={() => sendCode()} className="w-full text-base font-bold text-slate-400 hover:text-white disabled:opacity-50 cursor-pointer">
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
                    {isAr ? 'رقمك غير مسجل لدينا. أكمل الآن واحصل على كرت ديلار مجاناً لمدة شهر.' : 'Your number is not registered with us. Complete now and get your Deilar card free for one month.'}
                  </p>
                  <button onClick={() => { setTrialFlow(true); setStep('confirm'); }} className={primary}>
                    <Sparkles className="w-5 h-5" />
                    <span>{isAr ? 'نعم، أريد الكرت المجاني' : 'Yes, get my free card'}</span>
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
                <form onSubmit={(e) => { e.preventDefault(); showCard(); }} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{isAr ? 'أدخل رقم العضوية' : 'Enter the membership number'}</span>
                    {back('choose')}
                  </div>
                  <div className="relative">
                    <CreditCard className={`w-7 h-7 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="text" required autoFocus dir="ltr" placeholder="1234" value={cardNumber} onChange={(e) => { setCardNumber(e.target.value); setError(null); }} className={field} />
                  </div>
                  <button type="submit" disabled={busy || !cardNumber.trim()} className={primary}>
                    {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{isAr ? 'عرض بيانات الكرت' : 'Show my card'}</span>
                  </button>
                  <p className="text-base text-slate-500 text-center">
                    {isAr ? 'يمكنك تسجيل الدخول برقم الهاتف لاحقاً في أي وقت' : 'You can still sign in with your phone later'}
                  </p>
                </form>
              )}

              {error && (
                <p className="text-base text-rose-400 font-bold" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
