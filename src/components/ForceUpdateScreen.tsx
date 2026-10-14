import { Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/** Full-screen, non-dismissable wall shown when this build is older than the minimum the server allows. */
export function ForceUpdateScreen({ storeUrl }: { storeUrl: string }) {
  const { isAr } = useLanguage();

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-white px-8 text-center text-slate-900 dark:bg-[#0A0E17] dark:text-[#F1F5F9]"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#941946]/10 text-[#941946]">
        <Download size={36} />
      </div>
      <h1 className="text-xl font-extrabold">{isAr ? 'يتوفر تحديث جديد' : 'A new update is available'}</h1>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">
        {isAr
          ? 'لمتابعة استخدام التطبيق، يرجى تحديثه إلى أحدث إصدار.'
          : 'To keep using the app, please update to the latest version.'}
      </p>
      <button
        onClick={() => {
          window.location.href = storeUrl;
        }}
        className="w-full max-w-xs rounded-2xl bg-[#941946] py-3.5 text-base font-bold text-white active:scale-95"
      >
        {isAr ? 'حدّث الآن' : 'Update now'}
      </button>
    </div>
  );
}
