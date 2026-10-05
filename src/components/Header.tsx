import React from 'react';
import { MapPin, Smartphone, Monitor, Navigation, ShoppingCart } from 'lucide-react';
import { PRESET_LOCATIONS } from '../utils/geo';
import { DeilarLogo } from './DeilarLogo';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  currentLocationName: string;
  onLocationSelect: (location: typeof PRESET_LOCATIONS[0]) => void;
  onRequestGps: () => void;
  isGpsLoading: boolean;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocationName,
  onLocationSelect,
  onRequestGps,
  isGpsLoading,
  isMobileFrame,
  onToggleFrame,
  cartCount = 0,
  onOpenCart,
}) => {
  const [showLocationDropdown, setShowLocationDropdown] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const { language, brandName, t, isAr } = useLanguage();

  // Dynamic Scroll Direction Detection:
  // - Scroll DOWN -> Hide header smoothly
  // - Scroll UP or near top -> Show header smoothly
  React.useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // At top of page: always visible
      if (currentScrollY < 40) {
        setIsVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY;
      if (Math.abs(diff) > 10) {
        if (diff > 0) {
          // Scrolling DOWN -> Hide header
          setIsVisible(false);
          setShowLocationDropdown(false);
        } else {
          // Scrolling UP -> Show header
          setIsVisible(true);
        }
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      }`}
    >
      <div className="max-w-6xl mx-auto px-3.5 py-2 flex items-center justify-between gap-2.5">
        {/* Brand Lockup with Official Deilar Ticket Logo */}
        <div className="flex items-center gap-2">
          <DeilarLogo className="h-8 sm:h-9 w-auto" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                {brandName}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden xs:block">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Middle: Geographic Location Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-full transition-colors border border-slate-200/60 cursor-pointer"
            title={t('selectLocationPrompt')}
          >
            <MapPin className="w-3.5 h-3.5 text-[#931A47] shrink-0" />
            <span className="max-w-[110px] sm:max-w-[140px] truncate text-[11px] font-semibold">{currentLocationName}</span>
            <span className="text-[9px] text-slate-400">▼</span>
          </button>

          {showLocationDropdown && (
            <div className={`absolute top-full ${isAr ? 'left-0 text-right' : 'right-0 text-left'} mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150`}>
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{t('selectLocationPrompt')}</p>
              </div>
              <button
                onClick={() => {
                  onRequestGps();
                  setShowLocationDropdown(false);
                }}
                disabled={isGpsLoading}
                className={`w-full ${isAr ? 'text-right' : 'text-left'} px-3 py-2 text-xs text-[#931A47] font-semibold hover:bg-rose-50 flex items-center justify-between transition-colors cursor-pointer`}
              >
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  {isGpsLoading ? t('gpsLoading') : t('autoGps')}
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">GPS</span>
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              {PRESET_LOCATIONS.filter((l) => !l.isGps).map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => {
                    onLocationSelect(loc);
                    setShowLocationDropdown(false);
                  }}
                  className={`w-full ${isAr ? 'text-right' : 'text-left'} px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer`}
                >
                  <span>{loc.name}</span>
                  <span className="text-[10px] text-slate-400">{isAr ? 'مصر' : 'Egypt'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions: Cart & Frame Toggle */}
        <div className="flex items-center gap-1.5">
          {onOpenCart && (
            <button
              onClick={onOpenCart}
              className="relative p-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-full transition-all border border-slate-200/80 cursor-pointer"
              title={t('cart')}
            >
              <ShoppingCart className="w-4 h-4 text-slate-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#931A47] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Desktop/Tablet Mode Viewport Frame Switcher */}
          <button
            onClick={onToggleFrame}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors border border-slate-200/80 cursor-pointer"
            title={isMobileFrame ? t('expandedView') : t('phoneFrame')}
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-[#931A47]" />
                <span className="text-[11px] font-medium">{t('expandedView')}</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#931A47]" />
                <span className="text-[11px] font-medium">{t('phoneFrame')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
