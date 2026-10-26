import React, { useEffect, useId, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { reportClientError } from '../utils/reportError';
import { notifyMembershipChanged } from '../utils/membershipEvents';

/**
 * Paymob Pixel: the card form lives INSIDE this page but is hosted by Paymob, so the card number
 * is typed into their field and never reaches our code or our server (which is why we do not draw
 * our own inputs — that would put the app and backend in PCI-DSS scope).
 *
 * Pinned to an exact version: a floating `@latest` could change the form under a live checkout.
 * Whether the payment WORKED is decided by the signed callback on the server; `onComplete` here only
 * means "the buyer finished the form", so callers re-read the order rather than trusting it.
 */
const PIXEL_VERSION = '1.2.8';
const PIXEL_BASE = `https://cdn.jsdelivr.net/npm/paymob-pixel@${PIXEL_VERSION}`;

interface PixelOptions {
  publicKey: string;
  clientSecret: string;
  paymentMethods: string[];
  elementId: string;
  afterPaymentComplete?: (result: unknown) => void;
  onPaymentCancel?: () => void;
  customStyle?: Record<string, string>;
}

declare global {
  interface Window {
    Pixel?: new (options: PixelOptions) => unknown;
  }
}

/** The app's look for Paymob's form (same brand colour, font and corners as the rest of the app). The card fields stay Paymob's. */
const PIXEL_STYLE: Record<string, string> = {
  Font_Family: 'Cairo, sans-serif',
  Font_Size_Label: '12px',
  Font_Weight_Label: '700',
  Text_Color_For_Label: '#334155',
  Font_Size_Input_Fields: '14px',
  Font_Weight_Input_Fields: '600',
  Text_Color_For_Input_Fields: '#0f172a',
  Color_Input_Fields: '#f8fafc',
  Color_Border_Input_Fields: '#e2e8f0',
  Color_For_Text_Placeholder: '#94a3b8',
  Color_Container: '#ffffff',
  Color_Primary: '#941946',
  Color_Error: '#e11d48',
  Color_Disabled: '#cbd5e1',
  Font_Size_Payment_Button: '14px',
  Font_Weight_Payment_Button: '800',
  Text_Color_For_Payment_Button: '#ffffff',
  Color_Border_Payment_Button: '#941946',
  Radius_Border: '16px',
};

let loading: Promise<void> | null = null;

/** Loads Paymob's script (its styles are bundled inside it) once per page, resolving when `window.Pixel` exists. */
function loadPixel(): Promise<void> {
  if (window.Pixel) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = `${PIXEL_BASE}/main.js`;
    script.onerror = () => reject(new Error('Paymob Pixel could not be downloaded'));
    document.head.appendChild(script);

    const started = Date.now();
    const wait = window.setInterval(() => {
      if (window.Pixel) {
        window.clearInterval(wait);
        resolve();
      } else if (Date.now() - started > 15_000) {
        window.clearInterval(wait);
        reject(new Error('Paymob Pixel did not start'));
      }
    }, 100);
  }).catch((err) => {
    loading = null; // allow a later retry
    throw err;
  });

  return loading;
}

interface PaymobPixelProps {
  publicKey: string;
  clientSecret: string;
  /** Paymob's hosted page — offered if the embedded form cannot load. */
  fallbackUrl?: string | null;
  /** The buyer finished the form. The server's callback is what confirms the money. */
  onComplete: () => void;
}

export const PaymobPixel: React.FC<PaymobPixelProps> = ({ publicKey, clientSecret, fallbackUrl, onComplete }) => {
  const { isAr } = useLanguage();
  const elementId = `paymob-${useId().replace(/:/g, '')}`;
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    loadPixel()
      .then(() => {
        if (cancelled || !window.Pixel) return;
        new window.Pixel({
          publicKey,
          clientSecret,
          paymentMethods: ['card'],
          elementId,
          customStyle: PIXEL_STYLE,
          afterPaymentComplete: () => { notifyMembershipChanged(); onComplete(); },
        });
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        reportClientError('Paymob Pixel failed to load', err);
        setState('failed');
      });

    return () => {
      cancelled = true;
      document.getElementById(elementId)?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, clientSecret, elementId]);

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 ${isAr ? 'flex-row-reverse justify-end' : ''}`}>
        <ShieldCheck className="w-4 h-4" />
        <span>{isAr ? 'دفع آمن — بيانات البطاقة تُدخل لدى Paymob ولا تصل إلى خوادمنا' : 'Secure payment — card details go to Paymob, never to our servers'}</span>
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{isAr ? 'جاري تحميل نموذج الدفع…' : 'Loading the payment form…'}</span>
        </div>
      )}

      <div id={elementId} dir="ltr" className="min-h-px" />

      {state === 'failed' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold p-3 space-y-2">
          <p>{isAr ? 'تعذر تحميل نموذج الدفع هنا.' : 'The payment form could not load here.'}</p>
          {fallbackUrl && (
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline">
              {isAr ? 'افتح صفحة الدفع من Paymob' : "Open Paymob's payment page"}
            </a>
          )}
        </div>
      )}
    </div>
  );
};
