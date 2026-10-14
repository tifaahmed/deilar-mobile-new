import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Phone, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react';
import { ApiError, postContactMessage } from '../api/http';
import { fetchCard, requestOtp, verifyOtp } from '../api/auth';
import { claimOrders } from '../api/orders';
import { storedOrders } from '../utils/orders';
import { getSession, updateSession } from '../utils/session';
import { useLanguage } from '../context/LanguageContext';

/** Egyptian mobile: 11 digits starting with 01. */
const PHONE_RE = /^01\d{9}$/;
const PHONE_LEN = 11;

export type AccessStep = 'choose' | 'phone' | 'code' | 'card' | 'visitor';

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
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const messageOf = (e: unknown, fallbackAr: string, fallbackEn: string) =>
    e instanceof ApiError && e.status !== 0 && e.reason ? e.message : isAr ? fallbackAr : fallbackEn;

  const cleanPhone = phone;

  const sendCode = async () => {
    if (!PHONE_RE.test(cleanPhone)) {
      setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
      return;
    }

    setBusy(true);
    setError(null);

    // Best effort and only once per number: a failure here must never block signing in.
    if (getSession().leadPhone !== cleanPhone) {
      postContactMessage({
        phone: cleanPhone,
        message: isAr ? 'طلب كرت ديلار مجاناً من تطبيق الموبايل' : 'Free Deilar card request from the mobile app',
        source: 'card_popup',
      })
        .then(() => updateSession({ leadPhone: cleanPhone }))
        .catch(() => undefined);
    }

    try {
      const sent = await requestOtp(cleanPhone);
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
        cardNumber: session.cardNumber ?? result.membership?.membership_number,
      });
      // Orders placed on this device as a guest now belong to the member (already-owned ones are left alone).
      const guestCodes = storedOrders().map((o) => o.code);
      if (guestCodes.length > 0) claimOrders(result.token, guestCodes).catch(() => undefined);
      setWelcome(result.user.name || cleanPhone);
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
      onClose();
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
    <span dir="ltr" className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold ${phoneValid ? 'text-emerald-400' : phone.length ? 'text-amber-400' : 'text-slate-500'}`}>
      {phone.length}/{PHONE_LEN}
    </span>
  );

  const field = `w-full ${isAr ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'} py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:border-amber-400 transition-colors`;
  const primary =
    'w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer';
  const secondary =
    'w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer';
  const back = (to: AccessStep) => (
    <button onClick={() => { setStep(to); setError(null); }} className="text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer">
      {isAr ? '← رجوع' : '← Back'}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className={`bg-slate-950 text-white rounded-3xl max-w-[330px] w-full border border-amber-400/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150 ${isAr ? 'text-right' : 'text-left'}`}>
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <h3 className="text-xs font-black text-amber-300">{isAr ? `كرت ${brandName} الطبي` : `${brandName} medical card`}</h3>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer" title={isAr ? 'إغلاق' : 'Close'}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3.5 space-y-3">
          {welcome ? (
            <div className="py-2 text-center space-y-2.5 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-black">{isAr ? `أهلاً ${welcome}` : `Welcome ${welcome}`}</h4>
              <p className="text-[10px] text-amber-300 font-bold">
                {getSession().cardNumber
                  ? isAr ? `كرتك رقم ${getSession().cardNumber} جاهز` : `Your card ${getSession().cardNumber} is ready`
                  : isAr ? 'لا يوجد كرت مرتبط برقمك بعد' : 'No card is linked to your number yet'}
              </p>
              <button onClick={onClose} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer">
                <span>{isAr ? 'الدخول للتطبيق' : 'Enter app'}</span>
                <ArrowLeft className={`w-3 h-3 ${isAr ? '' : 'rotate-180'}`} />
              </button>
            </div>
          ) : (
            <>
              {step === 'choose' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isAr ? 'سجّل الدخول برقم هاتفك لتصل إلى كرتك تلقائياً، أو اعرض بيانات كرتك برقم العضوية.' : 'Sign in with your phone to get your card automatically, or view your card with its membership number.'}
                  </p>
                  <button onClick={() => setStep('phone')} className={primary}>
                    <Phone className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تسجيل الدخول برقم الهاتف' : 'Sign in with phone number'}</span>
                  </button>
                  <button onClick={() => setStep('card')} className={secondary}>
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'عرض بيانات الكرت برقم العضوية' : 'View card with membership number'}</span>
                  </button>
                  <button onClick={() => setStep('visitor')} className={secondary}>
                    <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'زائر جديد' : 'New visitor'}</span>
                  </button>
                </div>
              )}

              {step === 'phone' && (
                <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">{isAr ? 'أدخل رقم هاتفك' : 'Enter your phone number'}</span>
                    {back('choose')}
                  </div>
                  <div className="relative">
                    <Phone className={`w-3.5 h-3.5 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="tel" inputMode="numeric" required autoFocus dir="ltr" maxLength={PHONE_LEN} placeholder="010xxxxxxxx" value={phone} onChange={onPhoneChange} className={field} />
                    {phoneCounter}
                  </div>
                  <button type="submit" disabled={busy || !phoneValid} className={primary}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{isAr ? 'إرسال كود التحقق' : 'Send verification code'}</span>
                  </button>
                </form>
              )}

              {step === 'code' && (
                <form onSubmit={(e) => { e.preventDefault(); if (code.length === codeLength) verify(code); }} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">
                      {isAr ? `أدخل الكود المرسل إلى ${maskedPhone || 'هاتفك'}` : `Enter the code sent to ${maskedPhone || 'your phone'}`}
                    </span>
                    {back('phone')}
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
                    className="w-full text-center text-lg py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono tracking-[0.6em] focus:outline-none focus:border-amber-400"
                  />
                  <button type="submit" disabled={busy || code.length !== codeLength} className={primary}>
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isAr ? 'تأكيد ودخول' : 'Verify & sign in'}</span>
                  </button>
                  <button type="button" disabled={resendIn > 0 || busy} onClick={sendCode} className="w-full text-[10px] font-bold text-slate-400 hover:text-white disabled:opacity-50 cursor-pointer">
                    {resendIn > 0 ? (isAr ? `إعادة الإرسال بعد ${resendIn} ث` : `Resend in ${resendIn}s`) : isAr ? 'إعادة إرسال الكود' : 'Resend code'}
                  </button>
                </form>
              )}

              {step === 'visitor' && (
                <form onSubmit={(e) => { e.preventDefault(); submitVisitor(); }} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">{isAr ? 'زائر جديد' : 'New visitor'}</span>
                    {back('choose')}
                  </div>
                  <div className="relative">
                    <UserRound className={`w-3.5 h-3.5 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="text" required autoFocus placeholder={isAr ? 'الاسم' : 'Name'} value={visitorName} onChange={(e) => { setVisitorName(e.target.value); setError(null); }} className={field.replace('font-mono tracking-wider', '')} />
                  </div>
                  <div className="relative">
                    <Phone className={`w-3.5 h-3.5 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="tel" inputMode="numeric" required dir="ltr" maxLength={PHONE_LEN} placeholder="010xxxxxxxx" value={phone} onChange={onPhoneChange} className={field} />
                    {phoneCounter}
                  </div>
                  <button type="submit" disabled={busy || !visitorName.trim() || !phoneValid} className={primary}>
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isAr ? 'إرسال' : 'Submit'}</span>
                  </button>
                </form>
              )}

              {step === 'card' && (
                <form onSubmit={(e) => { e.preventDefault(); showCard(); }} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">{isAr ? 'أدخل رقم العضوية' : 'Enter the membership number'}</span>
                    {back('choose')}
                  </div>
                  <div className="relative">
                    <CreditCard className={`w-3.5 h-3.5 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input type="text" required autoFocus dir="ltr" placeholder="1234" value={cardNumber} onChange={(e) => { setCardNumber(e.target.value); setError(null); }} className={field} />
                  </div>
                  <button type="submit" disabled={busy || !cardNumber.trim()} className={primary}>
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isAr ? 'عرض بيانات الكرت' : 'Show my card'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">
                    {isAr ? 'يمكنك تسجيل الدخول برقم الهاتف لاحقاً في أي وقت' : 'You can still sign in with your phone later'}
                  </p>
                </form>
              )}

              {error && (
                <p className="text-[10px] text-rose-400 font-bold" role="alert">
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
