import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Loader2, Maximize2, Minimize2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PaymobFrameProps {
  /** Paymob's checkout page for this payment (the wallet page; Pixel cannot draw wallets). */
  url: string;
  /** Asked every few seconds: has the server confirmed the payment? Its answer, not the page, decides. */
  check?: () => Promise<boolean>;
  /** The payment is confirmed, or the buyer says they finished. */
  onComplete: () => void;
}

const POLL_MS = 5_000;
/** If the page has not reported loading by then, say so and put the other way in front. */
const SLOW_MS = 12_000;

/** Opens the page in the in-app browser (a sheet over the app); outside the installed app that is a normal tab. */
async function openInAppBrowser(url: string) {
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * The wallet payment page drawn INSIDE the app, in a frame. Paymob (or the wallet's own page) may refuse
 * to be framed — a browser cannot tell us — so the "open in the in-app browser" way is always one tap
 * away and is promoted when the frame is slow to load.
 */
export const PaymobFrame: React.FC<PaymobFrameProps> = ({ url, check, onComplete }) => {
  const { isAr } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [full, setFull] = useState(false);
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, [url]);

  useEffect(() => {
    if (!check) return;
    let alive = true;
    const timer = window.setInterval(async () => {
      try {
        if (alive && (await check())) {
          alive = false;
          done.current();
        }
      } catch {
        /* the next tick tries again */
      }
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [check]);

  const frame = (
    <div className={full ? 'relative flex-1 min-h-0 bg-white' : 'relative rounded-2xl overflow-hidden border border-slate-200 bg-white h-[clamp(640px,92vh,900px)]'}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{isAr ? 'جاري تحميل صفحة الدفع…' : 'Loading the payment page…'}</span>
        </div>
      )}
      <iframe
        title={isAr ? 'الدفع بالمحفظة' : 'Wallet payment'}
        src={url}
        scrolling="yes"
        onLoad={() => setLoaded(true)}
        allow="payment"
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );

  // Full screen: the whole screen is the page, so it has room to scroll. The same iframe is kept mounted only once.
  if (full) {
    return createPortal(
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700"><ShieldCheck className="w-4 h-4" />{isAr ? 'دفع آمن عبر Paymob' : 'Secure payment by Paymob'}</span>
          <button type="button" onClick={() => setFull(false)} className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
            <Minimize2 className="w-4 h-4" />
            <span>{isAr ? 'تصغير' : 'Shrink'}</span>
          </button>
        </div>
        {frame}
        <div className="p-3 border-t border-slate-200 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => void openInAppBrowser(url)} className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{isAr ? 'لا تعمل؟ افتح في المتصفح الداخلي' : 'Not working? Open in the in-app browser'}</span>
          </button>
          <button type="button" onClick={onComplete} className="w-full text-[11px] font-bold text-slate-500 cursor-pointer">{isAr ? 'أنهيت الدفع' : 'I have finished paying'}</button>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
        <span className={`flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 ${isAr ? 'flex-row-reverse' : ''}`}>
          <ShieldCheck className="w-4 h-4" />
          {isAr ? 'دفع آمن عبر Paymob' : 'Secure payment by Paymob'}
        </span>
        <button type="button" onClick={() => setFull(true)} className="flex items-center gap-1 text-[11px] font-bold text-[#941946] cursor-pointer">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{isAr ? 'تكبير الشاشة' : 'Full screen'}</span>
        </button>
      </div>

      {frame}

      {slow && !loaded && (
        <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 border text-amber-900 bg-amber-50 border-amber-200">
          {isAr ? 'صفحة الدفع لا تظهر هنا. افتحها في المتصفح الداخلي.' : 'The payment page is not showing here. Open it in the in-app browser.'}
        </p>
      )}

      <button
        type="button"
        onClick={() => void openInAppBrowser(url)}
        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${slow && !loaded ? 'bg-[#941946] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>{isAr ? 'لا تعمل؟ افتح في المتصفح الداخلي' : 'Not working? Open in the in-app browser'}</span>
      </button>

      <button type="button" onClick={onComplete} className="w-full text-[11px] font-bold text-slate-500 hover:text-[#941946] cursor-pointer">
        {isAr ? 'أنهيت الدفع' : 'I have finished paying'}
      </button>
    </div>
  );
};
