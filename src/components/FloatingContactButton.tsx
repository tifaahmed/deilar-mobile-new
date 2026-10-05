import React, { useState } from 'react';
import { MessageCircle, PhoneCall, X } from 'lucide-react';

export const FloatingContactButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const contactNumber = '01020709993';

  return (
    <div className="fixed bottom-20 left-4 sm:left-6 z-40 flex flex-col items-start gap-2.5 select-none">
      {/* 2 Quick Action Buttons Popover (اتصال هاتفي + محادثة واتس بس كده) */}
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-slate-200/90 text-right space-y-2 animate-in slide-in-from-bottom-2 duration-150 w-48">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-700">تواصل مباشر</span>
            <button
              onClick={() => setIsOpen(false)}
              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* 1. زرار الاتصال الهاتفي */}
          <a
            href={`tel:${contactNumber}`}
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors shadow-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold leading-tight">اتصال هاتفي</span>
              <span className="font-mono text-[10px] text-amber-300 font-semibold">{contactNumber}</span>
            </div>
          </a>

          {/* 2. زرار محادثة واتس */}
          <a
            href={`https://wa.me/201020709993`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors shadow-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
              <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold leading-tight">محادثة واتس</span>
              <span className="text-[10px] text-emerald-100 font-medium">شات مباشر 24/7</span>
            </div>
          </a>
        </div>
      )}

      {/* Main Single Floating Phone Icon Button (بديل ايقونة خدمة العملاء السابقة) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-950/30 border-2 border-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
        title="اتصال هاتفي أو واتساب"
        aria-label="اتصال هاتفي أو واتساب"
      >
        {/* Subtle pulsing beacon */}
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
        </span>

        {isOpen ? (
          <X className="w-5 h-5 text-white animate-in zoom-in-75 duration-150" />
        ) : (
          <PhoneCall className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  );
};
