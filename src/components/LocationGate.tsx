import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { saveGps, GpsPoint } from '../utils/gps';
import { usePopupHash } from '../utils/popupHash';

/** Asks for a GPS fix once. If GPS can't be opened the visitor can skip and continue without it. */
export const LocationGate: React.FC<{ onGranted: (p: GpsPoint) => void; onSkip: () => void }> = ({ onGranted, onSkip }) => {
  usePopupHash('location-popup');
  const { isAr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const request = () => {
    if (!navigator.geolocation) {
      setFailed(true);
      return;
    }
    setBusy(true);
    setFailed(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveGps(p);
        setBusy(false);
        onGranted(p);
      },
      () => {
        setBusy(false);
        setFailed(true);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-slate-950 text-white flex items-center justify-center p-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-xs w-full text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-400/15 border border-amber-400/50 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-amber-400 animate-bounce" />
        </div>
        <h2 className="text-lg font-black">{isAr ? 'نحتاج لموقعك' : 'We need your location'}</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isAr
            ? 'لإظهار أقرب مقدمي الخدمة إليك، يجب السماح للتطبيق بتحديد موقعك (GPS).'
            : 'To show the service providers nearest to you, the app must be allowed to read your GPS location.'}
        </p>
        {failed && (
          <p className="text-[11px] text-rose-300 font-bold leading-relaxed">
            {isAr
              ? 'تعذّر تحديد موقعك. فعّل GPS واسمح للتطبيق بالوصول للموقع من الإعدادات ثم حاول مرة أخرى.'
              : 'Could not get your location. Turn on GPS and allow location access in Settings, then try again.'}
          </p>
        )}
        <button
          onClick={request}
          disabled={busy}
          className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-70 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          <span>{failed ? (isAr ? 'حاول مرة أخرى' : 'Try again') : isAr ? 'السماح بتحديد الموقع' : 'Allow location'}</span>
        </button>
        <button
          onClick={onSkip}
          disabled={busy}
          className="w-full py-2.5 text-slate-300 hover:text-white text-xs font-bold underline underline-offset-4 cursor-pointer"
        >
          {isAr ? 'تخطي' : 'Skip'}
        </button>
      </div>
    </div>,
    document.body,
  );
};

/** Shown once the location is known: one button that sends the visitor to the map. */
export const NearestPrompt: React.FC<{ onGo: () => void }> = ({ onGo }) => {
  usePopupHash('nearest-popup');
  const { isAr } = useLanguage();
  return createPortal(
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-950 text-white rounded-3xl max-w-[20.625rem] w-full border border-amber-400/40 shadow-2xl p-5 text-center space-y-4 animate-in zoom-in-95 duration-150">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-400/15 border border-amber-400/50 flex items-center justify-center">
          <MapPin className="w-7 h-7 text-amber-400" />
        </div>
        <p className="text-sm font-black">{isAr ? 'تم تحديد موقعك بنجاح' : 'Your location is set'}</p>
        <button
          onClick={onGo}
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>{isAr ? 'اعثر على أقرب مقدم خدمة' : 'Find the nearest service provider'}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
};
