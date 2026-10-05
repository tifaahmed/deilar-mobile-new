/**
 * ==============================================================================
 * 📌 DEILAR MEDICAL & SPECIALTY STORE APP - ROOT APPLICATION COMPONENT (App.tsx)
 * ==============================================================================
 * 
 * 🤖 AI / CLAUDE DEVELOPER GUIDE:
 * This is the central orchestrator of the entire application. It manages:
 * 
 * 1. 🧭 NAVIGATION (`activeTab`):
 *    - 'home': Main dashboard with 6 medical facility buttons, 3 quick action buttons (Store, Products, Card).
 *    - 'store': Specialty Stores Front (coffee roasters, honey apiaries, olive oil presseries).
 *    - 'products': 2-per-row full catalog of natural products with store links & filters.
 *    - 'map': Interactive Google Map & Provider directory filtered by distance and category.
 *    - 'profile': User's account, 3D official medical card, PNG download buttons, family members.
 * 
 * 2. 🛒 GLOBAL SHOPPING CART (`cart` & `isGlobalCartOpen`):
 *    - Manages items gathered from stores.
 *    - Accessible from anywhere via Header cart icon or Store triggers.
 *    - Handled by `<CartCheckoutModal />` supporting Bank (InstaPay/IBAN) and Mobile Wallet (Vodafone Cash) transfers.
 * 
 * 3. 📍 GEOLOCATION (`userLocation` & `providersWithDistance`):
 *    - Live GPS or Preset Egyptian governorates (Cairo, Giza, Alexandria, etc.).
 *    - Recalculates distances dynamically via Haversine formula (`utils/geo.ts`).
 * 
 * 4. 📱 RESPONSIVE CONTAINER:
 *    - Toggleable between simulated mobile device frame (`isMobileFrame = true`) and full desktop view.
 * ==============================================================================
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { MapView } from './components/MapView';
import { StoreView } from './components/StoreView';
import { ProductsView } from './components/ProductsView';
import { ProfileView } from './components/ProfileView';
import { ProviderDetailView } from './components/ProviderDetailView';
import { SearchModal } from './components/SearchModal';
import { FloatingContactButton } from './components/FloatingContactButton';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import { FreeCardRequestModal } from './components/FreeCardRequestModal';
import { 
  MEDICAL_PROVIDERS, 
  INITIAL_BENEFICIARIES, 
  INITIAL_USAGE_HISTORY 
} from './data/mockData';
import { MedicalProvider, ProviderCategory, Beneficiary, UsageRecord, Product, CartItem } from './types';
import { calculateDistanceKm, PRESET_LOCATIONS } from './utils/geo';
import { Smartphone, Monitor } from 'lucide-react';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { isAr, t, brandName } = useLanguage();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name: string }>({
    lat: 30.0444,
    lng: 31.2357,
    name: 'موقعي (القاهرة)',
  });
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory>('all');
  const [selectedProvider, setSelectedProvider] = useState<(MedicalProvider & { distanceKm?: number }) | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGlobalCartOpen, setIsGlobalCartOpen] = useState(false);

  // Beneficiaries & Usage History state
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(INITIAL_BENEFICIARIES);
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>(INITIAL_USAGE_HISTORY);

  // App Appearance Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('deilar_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('deilar_theme', newTheme);
  };

  // Free Card Request Modal for first-time / unregistered visitors
  const [isFreeCardModalOpen, setIsFreeCardModalOpen] = useState<boolean>(() => {
    try {
      const isRegistered = localStorage.getItem('deilar_user_registered');
      return !isRegistered;
    } catch {
      return true;
    }
  });

  // Shopping Cart state for Store & Products
  const [cart, setCart] = useState<CartItem[]>([]);
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => setCart([]);

  // Calculate live distance from user location to all providers
  const providersWithDistance = useMemo(() => {
    return MEDICAL_PROVIDERS.map((provider) => {
      const distanceKm = calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        provider.lat,
        provider.lng
      );
      return {
        ...provider,
        distanceKm,
      };
    });
  }, [userLocation]);

  // Request browser GPS position
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 30.0444, lng: 31.2357, name: 'القاهرة - وسط البلد' });
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'موقعي الحالي (GPS مباشر)',
        });
      },
      (err) => {
        setIsGpsLoading(false);
        setUserLocation({
          lat: 30.0444,
          lng: 31.2357,
          name: 'القاهرة - وسط البلد (افتراضي)',
        });
      },
      { timeout: 7000 }
    );
  };

  const handleLocationPresetSelect = (loc: typeof PRESET_LOCATIONS[0]) => {
    setUserLocation({
      lat: loc.lat,
      lng: loc.lng,
      name: loc.name,
    });
  };

  const handleAddBeneficiary = (newBenData: Beneficiary | Omit<Beneficiary, 'id' | 'status'>) => {
    const newBen: Beneficiary = 'id' in newBenData
      ? newBenData
      : {
          ...newBenData,
          id: `ben-${Date.now()}`,
          status: 'active',
        };
    setBeneficiaries((prev) => [...prev, newBen]);
  };

  const handleNavigateToMap = (cat: ProviderCategory = 'all') => {
    setSelectedCategory(cat);
    setActiveTab('map');
  };

  return (
    <div className="relative min-h-screen text-slate-900 flex flex-col items-center justify-start py-0 md:py-6 px-0 md:px-4 overflow-x-hidden">
      {/* 
        CRITICAL USER REQUIREMENT:
        "انا عايز اكون شايف فى الخلفيه صوره الكارت"
        Rich Crimson Silk Background (matching user screenshot) + Floating 3D Deilar VIP Medical Cards
      */}
      <div 
        className="fixed inset-0 -z-30 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url('/src/assets/images/crimson_silk_backdrop_1791012317592.jpg')` }}
      >
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
      </div>

      {/* Floating Official Deilar Cards visible in background left & right (Front & Back) */}
      <div className="hidden lg:block fixed -left-12 top-24 w-88 h-56 -z-20 pointer-events-none opacity-60 rotate-[-14deg] drop-shadow-2xl transition-transform hover:scale-105 duration-500">
        <img
          src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
          alt="Deilar Official Family Card Front"
          className="w-full h-full object-cover rounded-2xl shadow-2xl border-2 border-amber-300/80"
        />
      </div>

      <div className="hidden lg:block fixed -right-12 bottom-20 w-96 h-60 -z-20 pointer-events-none opacity-60 rotate-[12deg] drop-shadow-2xl transition-transform hover:scale-105 duration-500">
        <img
          src="/src/assets/images/deilar_card_back_official_1791012725831.jpg"
          alt="Deilar Official Family Card Back"
          className="w-full h-full object-cover rounded-2xl shadow-2xl border-2 border-amber-300/80"
        />
      </div>

      {/* Top Banner Bar on desktop for device frame switch */}
      <div className="hidden md:flex items-center justify-between w-full max-w-md px-3 py-1.5 text-xs text-white/90 bg-black/40 backdrop-blur-md rounded-xl border border-white/20 mb-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-300">{t('brandPlatform')}</span>
          <span>•</span>
          <span className="text-white/80">{t('certifiedCard')}</span>
        </div>

        <button
          onClick={() => setIsMobileFrame(!isMobileFrame)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg text-white font-semibold transition-colors cursor-pointer"
        >
          {isMobileFrame ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('expandedView')}</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('phoneFrame')}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container: Exact Smartphone Frame matching screenshot or Expanded layout */}
      <div
        className={`w-full transition-all duration-300 relative pb-20 ${
          theme === 'dark' ? 'dark bg-[#0A0E17] text-[#F1F5F9]' : 'bg-white text-slate-900'
        } ${
          isMobileFrame
            ? `max-w-[440px] rounded-none sm:rounded-[44px] border-0 sm:border-[10px] ${
                theme === 'dark' ? 'sm:border-[#181B26]' : 'sm:border-slate-900'
              } shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden min-h-screen sm:min-h-[880px]`
            : `max-w-4xl rounded-3xl border ${
                theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-300'
              } shadow-2xl overflow-hidden min-h-screen`
        }`}
      >
        {/* Smartphone top bezel & camera punch-hole (only in mobile frame mode on tablet/desktop) */}
        {isMobileFrame && (
          <div className="hidden sm:flex items-center justify-center h-6 bg-slate-900 w-full relative z-50">
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-950/70"></div>
            </div>
          </div>
        )}

        {/* Global App Header */}
        <Header
          currentLocationName={userLocation.name}
          onLocationSelect={handleLocationPresetSelect}
          onRequestGps={handleRequestGps}
          isGpsLoading={isGpsLoading}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          cartCount={totalCartCount}
          onOpenCart={() => setIsGlobalCartOpen(true)}
        />

        {/* Main Content View based on Active Tab or Selected Medical Provider Page */}
        <main className="p-3.5 sm:p-5">
          {selectedProvider ? (
            <ProviderDetailView
              provider={selectedProvider}
              onBack={() => setSelectedProvider(null)}
              onNavigateToMap={() => {
                setSelectedProvider(null);
                setActiveTab('map');
              }}
              onNavigateToCard={() => {
                setSelectedProvider(null);
                setActiveTab('profile');
              }}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView
                  userLocation={userLocation}
                  providersWithDistance={providersWithDistance}
                  onSelectProvider={(p) => {
                    const withDist = providersWithDistance.find((item) => item.id === p.id);
                    setSelectedProvider(withDist || p);
                  }}
                  onNavigateToMap={handleNavigateToMap}
                  onNavigateToCard={() => setActiveTab('profile')}
                  onNavigateToStore={() => setActiveTab('store')}
                  onNavigateToProducts={() => setActiveTab('products')}
                  onSearchOpen={() => setIsSearchOpen(true)}
                />
              )}

              {activeTab === 'store' && (
                <StoreView
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onUpdateCartQty={handleUpdateCartQty}
                  onRemoveFromCart={handleRemoveFromCart}
                  onClearCart={handleClearCart}
                  onOpenCart={() => setIsGlobalCartOpen(true)}
                />
              )}

              {activeTab === 'products' && (
                <ProductsView
                  onBackToStore={() => setActiveTab('store')}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onUpdateCartQty={handleUpdateCartQty}
                  onRemoveFromCart={handleRemoveFromCart}
                  onClearCart={handleClearCart}
                />
              )}

              {activeTab === 'map' && (
                <MapView
                  userLocation={userLocation}
                  providers={providersWithDistance}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onSelectProvider={(p) => {
                    const withDist = providersWithDistance.find((item) => item.id === p.id);
                    setSelectedProvider(withDist || p);
                  }}
                  onRequestGps={handleRequestGps}
                  isGpsLoading={isGpsLoading}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  beneficiaries={beneficiaries}
                  usageHistory={usageHistory}
                  theme={theme}
                  onThemeChange={handleThemeChange}
                  onAddBeneficiary={handleAddBeneficiary}
                />
              )}
            </>
          )}
        </main>

        {/* Floating Side Contact Icon with Number */}
        <FloatingContactButton />

        {/* 
          CRITICAL USER REQUIREMENT:
          "وعايز الناف بار الى تحت يكون ظاهر فى كل الصفحات وعايز بنفس الشكل الى بعته"
          Always visible across all tabs (Home, Card, Map, Profile) with the exact signature curve from screenshot
        */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setSelectedProvider(null);
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>

      {/* Global Quick Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        providers={providersWithDistance}
        onSelectProvider={(p) => {
          setSelectedProvider(p);
          setIsSearchOpen(false);
        }}
      />

      {/* Global Shopping Cart & Bank / Wallet Checkout Modal */}
      <CartCheckoutModal
        isOpen={isGlobalCartOpen}
        onClose={() => setIsGlobalCartOpen(false)}
        cart={cart}
        onUpdateCartQty={handleUpdateCartQty}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      {/* Free Card Request Modal for First-time / Unregistered Visitors */}
      <FreeCardRequestModal
        isOpen={isFreeCardModalOpen}
        onClose={() => setIsFreeCardModalOpen(false)}
        onSuccessRegister={(phone, name) => {
          if (name) {
            setBeneficiaries((prev) =>
              prev.map((b, idx) => (idx === 0 ? { ...b, name } : b))
            );
          }
        }}
      />
    </div>
  );
}
