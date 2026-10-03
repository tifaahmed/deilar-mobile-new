import React, { useState } from 'react';
import { Phone, MessageCircle, PhoneCall, X } from 'lucide-react';

export const FloatingContactButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const contactNumber = '01020709993';

  return (
    <div className="fixed bottom-20 left-3 sm:left-5 z-40 flex flex-col items-start gap-2 select-none">
      {/* Quick Menu Popover when clicked */}
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-200 text-right space-y-2 animate-in slide-in-from-bottom-3 duration-150 w-56">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-[11px] font-bold text-slate-800">خدمة عملاء ديلار</span>
            <button
              onClick={() => setIsOpen(false)}
              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            متاحون على مدار الساعة للرد على استفساراتكم وحجز الكشوفات.
          </p>

          <a
            href={`tel:${contactNumber}`}
            className="w-full py-2 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-between transition-colors shadow-xs"
          >
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <span>اتصال هاتفي</span>
            </span>
            <span className="font-mono text-[11px] text-amber-300 font-bold">{contactNumber}</span>
          </a>

          <a
            href={`https://wa.me/201020709993`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-between transition-colors shadow-xs"
          >
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>محادثة واتساب</span>
            </span>
            <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded">مباشر</span>
          </a>
        </div>
      )}

      {/* Main Persistent Floating Button Pill */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-2 pl-3.5 pr-2.5 py-2 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white rounded-full shadow-lg shadow-emerald-950/25 border-2 border-white hover:scale-105 active:scale-95 transition-all focus:outline-none"
          title="تواصل معنا هاتفياً أو عبر واتساب"
        >
          {/* Pulsing indicator ring */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
          </span>

          {/* Animated Phone Icon */}
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Phone className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Contact Number Display */}
          <div className="text-right">
            <span className="block font-mono font-black text-xs tracking-wider leading-none text-white drop-shadow-xs">
              {contactNumber}
            </span>
            <span className="text-[9px] text-emerald-100 font-semibold leading-none mt-0.5 block">
              خدمة العملاء
            </span>
          </div>
        </button>

        {/* Quick direct call shortcut button */}
        <a
          href={`tel:${contactNumber}`}
          className="w-9 h-9 rounded-full bg-white text-emerald-700 border border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
          title="اتصال فوري"
        >
          <PhoneCall className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
