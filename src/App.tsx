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
 *    - 'mycard': «كارتي» — the card, PNG download, relatives, subscription / payment.
 *    - 'profile': «حسابي» — a plain list; every row opens its own page (personal data, addresses, orders, support, theme).
 * 
 * 2. 🛒 GLOBAL SHOPPING CART (`cart` & `isGlobalCartOpen`):
 *    - Manages items gathered from stores.
 *    - Accessible from anywhere via Header cart icon or Store triggers.
 *    - A full page (`/cart`, `/checkout`) handled by `<CartCheckoutModal asPage />`: wallet transfer (Vodafone Cash etc.) or pay on delivery.
 * 
 * 3. 📍 GEOLOCATION (`userLocation`):
 *    - Live GPS or Preset Egyptian governorates (Cairo, Giza, Alexandria, etc.).
 *    - Sent to the API as `lat`/`lng`; the server sorts by nearest branch and returns `distance_km`.
 * 
 * 4. 📱 RESPONSIVE CONTAINER:
 *    - A single column: full width on phones, centred (max 768px) on tablets and larger.
 * ==============================================================================
 */

import { useSwipeBack } from './hooks/useSwipeBack';
import { useSwipeDismiss } from './hooks/useSwipeDismiss';
import React, { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeView } from './components/HomeView';
// The quiz carries all its questions (inside the app package, nothing is downloaded): it is a separate file so the home screen
// starts fast, and it is read from the device in the background once the app is idle, so opening the quiz is instant.
const loadQuiz = () => import('./components/QuizGame').then((m) => ({ default: m.QuizGame }));
const QuizGame = React.lazy(loadQuiz);
const MapView = lazy(() => import('./components/MapView').then((m) => ({ default: m.MapView })));
const StoreView = lazy(() => import('./components/StoreView').then((m) => ({ default: m.StoreView })));
const ProductsView = lazy(() => import('./components/ProductsView').then((m) => ({ default: m.ProductsView })));
const ProfileView = lazy(() => import('./components/ProfileView').then((m) => ({ default: m.ProfileView })));
const ProviderDetailView = lazy(() => import('./components/ProviderDetailView').then((m) => ({ default: m.ProviderDetailView })));
const SearchModal = lazy(() => import('./components/SearchModal').then((m) => ({ default: m.SearchModal })));
import { FloatingContactButton } from './components/FloatingContactButton';
const CartCheckoutModal = lazy(() => import('./components/CartCheckoutModal').then((m) => ({ default: m.CartCheckoutModal })));
const AccessModal = lazy(() => import('./components/AccessModal').then((m) => ({ default: m.AccessModal })));
const AreaModal = lazy(() => import('./components/AreaModal').then((m) => ({ default: m.AreaModal })));
const ProductPage = lazy(() => import('./components/ProductPage').then((m) => ({ default: m.ProductPage })));
const OrdersPage = lazy(() => import('./components/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const AccountGate = lazy(() => import('./components/AccountGate').then((m) => ({ default: m.AccountGate })));
import { Beneficiary, Product, CartItem } from './types';
import { fetchCard, fetchProfile, signOut } from './api/auth';
import { ApiError, forgetCached } from './api/http';
import { onMembershipChanged } from './utils/membershipEvents';
import { useApi } from './hooks/useApi';
import { useIsMember } from './utils/pricing';
import { getArea, useArea } from './utils/area';
import { flushQuizAnswers, startQuizSync } from './utils/quizStore';
import { clearSession, markPopupClosed, popupDueIn, popupSilenced, updateSession, useSession } from './utils/session';
import { ProfileReminder } from './components/ProfileReminder';
import { MembershipReminder } from './components/MembershipReminder';
import { AddPhoneReminder } from './components/AddPhoneReminder';
import { onAccessRequested } from './utils/accessEvents';
import { QuizReadyNotifier } from './components/QuizReadyNotifier';
import { PullToRefresh, reloadedByPull } from './components/PullToRefresh';
import { SaveAreaPrompt } from './components/SaveAreaPrompt';
import { NoticeStack } from './components/Notice';
import type { AccessStep } from './components/AccessModal';
import type { FacilityCard } from './api/types';
import { PRESET_LOCATIONS } from './utils/geo';
import { getSavedGps, GpsPoint, isSameSpot, saveGps } from './utils/gps';
import { trackVisit } from './utils/trackVisit';
import { LocationGate, NearestPrompt } from './components/LocationGate';
import { useLanguage } from './context/LanguageContext';
import { navigate, routeHref, useRoute } from './router';
import { ListSkeleton } from './components/ui/Feedback';
import { useForceUpdate } from './utils/forceUpdate';
import { ForceUpdateScreen } from './components/ForceUpdateScreen';
import { usePopupHash } from './utils/popupHash';

export default function App() {
  useSwipeBack();
  const { isAr, t, brandName } = useLanguage();
  // The URL is the source of truth for which page is open (see router.tsx).
  const route = useRoute();
  const forceUpdate = useForceUpdate();
  const activeTab: NavTab = route.tab;

  // Every screen the member opens is filed with the backend's visitors (see utils/trackVisit.ts).
  const routeKey = `${route.tab}|${route.product}|${route.facility}|${route.store}|${route.orders?.code}|${route.checkout}|${route.section}|${route.quiz}${route.quizPath ?? ''}`;
  const selectedTypeId = route.typeId;
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name: string }>(() => {
    // A saved location (from an earlier GPS fix) beats the Cairo default.
    const saved = getSavedGps() ?? getArea()?.point;
    return saved ? { ...saved, name: 'موقعي المحفوظ' } : { lat: 30.0444, lng: 31.2357, name: 'موقعي (القاهرة)' };
  });
  const area = useArea();
  // Start-up flow: GPS gate (until a fix was ever saved) -> "find nearest" prompt -> map -> access popup.
  // With a saved fix the prompt waits ('locating', nothing drawn) for a fresh one: the same place or a very near one needs no prompt.
  const [stage, setStage] = useState<'gate' | 'locating' | 'nearest' | 'done'>(() => (getSavedGps() ? (reloadedByPull ? 'done' : 'locating') : 'gate'));
  const [areaAsk, setAreaAsk] = useState(false);
  const closeArea = useCallback(() => setAreaAsk(false), []);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  // The card the user tapped, shown instantly while the facility page (addressed by URL) loads.
  const [previewCard, setPreviewCard] = useState<FacilityCard | null>(null);
  const selectedProvider = route.facility ? { slug: route.facility, preview: previewCard?.slug === route.facility ? previewCard : undefined } : null;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const openCart = () => navigate(routeHref({ checkout: 'cart' }));

  // Beneficiaries & Usage History state
  // Family members the user adds on this device, on top of the ones the card already has.
  const [addedBeneficiaries, setAddedBeneficiaries] = useState<Beneficiary[]>([]);

  // Who is using the app: signed in by phone, or just showing a card by its number.
  const session = useSession();
  // Re-fires when the member signs in, so that visit carries the token and the visitor row becomes the member.
  useEffect(() => {
    trackVisit(route, session.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, session.token]);
  // Quiz answers played offline (or before signing in) go up whenever there is a member and a connection.
  useEffect(() => startQuizSync(), []);
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => void loadQuiz()) : window.setTimeout(() => void loadQuiz(), 3000);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
  }, []);
  useEffect(() => {
    if (session.token) void flushQuizAnswers();
  }, [session.token]);
  const card = useApi(
    session.cardNumber ? `card:${session.cardNumber}` : null,
    (signal) =>
      fetchCard(session.cardNumber!, signal).catch((err) => {
        // A card number the server no longer knows (deleted, or the server was restored) is forgotten, so the visitor
        // gets the sign-in / free-card screen instead of an error they cannot get out of.
        if (err instanceof ApiError && err.status === 404) updateSession({ cardNumber: undefined });
        throw err;
      }),
  );
  // A finished payment (or coming back from Paymob's own page) must lift the trial notice at once, not after the cache expires.
  const reloadCard = card.reload;
  useEffect(() => {
    if (!session.cardNumber) return;
    const onVisible = () => { if (document.visibilityState === 'visible') { forgetCached('/mobile/card/'); reloadCard(); } };
    document.addEventListener('visibilitychange', onVisible);
    const stop = onMembershipChanged(reloadCard);
    return () => { document.removeEventListener('visibilitychange', onVisible); stop(); };
  }, [session.cardNumber, reloadCard]);
  // A sign-in the server no longer recognises (expired, revoked, restored database) ends here rather than 401-ing every screen.
  useEffect(() => {
    const token = session.token;
    if (!token) return;
    let alive = true;
    fetchProfile(token).catch((err) => {
      if (alive && err instanceof ApiError && err.status === 401) clearSession();
    });
    return () => {
      alive = false;
    };
  }, [session.token]);
  const beneficiaries: Beneficiary[] = card.data
    ? [
        {
          id: 'holder',
          name: card.data.holder,
          relation: isAr ? 'حامل الكارت الرئيسي' : 'Primary cardholder',
          nationalId: '',
          dob: '',
          cardNumber: card.data.number,
          status: card.data.active ? 'active' : 'pending',
        },
        ...card.data.members.map((m): Beneficiary => ({
          id: `member-${m.id}`,
          name: m.name,
          relation: m.relationship,
          nationalId: '',
          dob: '',
          cardNumber: card.data!.number,
          status: 'active',
        })),
        ...addedBeneficiaries,
      ]
    : [];

  const handleLogout = () => {
    const token = session.token;
    clearSession();
    setAddedBeneficiaries([]);
    if (token) signOut(token).catch(() => undefined); // the device is signed out either way
  };

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

  // Access popup (sign in by phone / view card by number). For a visitor with no session it opens
  // a few seconds after load — so it never competes with the first paint — and again every
  // 10 minutes after being closed. Signing in, adding a card number, or sending a phone through
  // it silences it until sign-out. The Profile tab can also open it on demand.
  const [accessStep, setAccessStep] = useState<AccessStep | null>(null);
  const silenced = popupSilenced(session);
  const [reminder, setReminder] = useState(false);
  usePopupHash('new-visit-reminder-popup', reminder && !silenced);

  useEffect(() => {
    if (silenced) return;
    if (accessStep || areaAsk || stage !== 'done' || route.quiz) return;
    if (reminder) return;
    // Randomly either the registration popup itself or a notification banner that opens it.
    const id = setTimeout(() => (Math.random() < 0.5 ? setAccessStep('visitor') : setReminder(true)), Math.max(popupDueIn(), 4000));
    return () => clearTimeout(id);
  }, [silenced, accessStep, areaAsk, stage, reminder, route.quiz]);

  // A guest opening Profile is asked for a name and number straight away.
  useEffect(() => {
    if ((activeTab === 'profile' || activeTab === 'mycard') && stage === 'done' && !silenced && !areaAsk) setAccessStep('visitor');
  }, [activeTab, stage, silenced, areaAsk]);

  // Reminders elsewhere (add the phone to your card) open the popup at a given step.
  useEffect(() => onAccessRequested(setAccessStep), []);

  const closeAccess = () => {
    markPopupClosed();
    setAccessStep(null);
  };
  const dismissReminder = () => {
    markPopupClosed();
    setReminder(false);
  };
  const reminderSwipe = useSwipeDismiss(dismissReminder);
  // In the quiz game nothing interrupts the player: no banner, no popup, no notice.
  const inGame = !!route.quiz;

  // Shopping Cart state for Store & Products
  const [cart, setCart] = useState<CartItem[]>([]);
  // Guests pay the full price; a registered card brings the member price. The server re-prices at checkout.
  const member = useIsMember();
  const pricedCart = member ? cart : cart.map((item) => ({ ...item, product: { ...item.product, price: item.product.originalPrice } }));
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

  // The first fix is forced by <LocationGate>. On later launches the saved point is used at once
  // and refreshed quietly in the background.
  useEffect(() => {
    const saved = getSavedGps();
    if (!saved) return;
    const waiting = stage === 'locating';
    // The same place (or no new fix at all): the visitor already has a location, so skip "Your location is set".
    const skipPrompt = () => {
      if (!waiting) return;
      setStage('done');
      if (!getArea()) setAreaAsk(true);
    };

    if (!navigator.geolocation) { skipPrompt(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveGps(p);
        setUserLocation({ ...p, name: 'موقعي الحالي (GPS مباشر)' });
        if (!waiting) return;
        if (isSameSpot(saved, p)) skipPrompt();
        else setStage('nearest');
      },
      skipPrompt,
      { timeout: 10000, maximumAge: 5 * 60_000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGateGranted = (p: GpsPoint) => {
    setUserLocation({ ...p, name: 'موقعي الحالي (GPS مباشر)' });
    setStage('nearest');
  };

  const handleFindNearest = () => {
    setStage('done');
    navigate(routeHref({ tab: 'map' }));
    // Governorate/city are asked once; otherwise go straight to the three-button access popup.
    if (!getArea()) setAreaAsk(true);
    else if (!silenced) setAccessStep('choose');
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
    setAddedBeneficiaries((prev) => [...prev, newBen]);
  };

  const handleSelectProvider = (card: FacilityCard) => {
    setPreviewCard(card);
    navigate(routeHref({ facility: card.slug }));
  };

  // A build older than the server's minimum can't be used until it is updated.
  if (forceUpdate.required) return <ForceUpdateScreen storeUrl={forceUpdate.storeUrl} />;

  return (
    <div className="relative min-h-dvh w-full text-slate-900 flex flex-col items-center justify-start overflow-x-clip">
      {/* One responsive column: phones use the full width, tablets and larger get a centred 768px page. */}
      <div
        className={`w-full max-w-3xl relative pb-20 min-h-dvh ${
          theme === 'dark' ? 'dark bg-[#0A0E17] text-[#F1F5F9]' : 'bg-white text-slate-900'
        }`}
      >
        {/* Global App Header */}
        <Header
          currentLocationName={userLocation.name}
          currentPoint={userLocation}
          onLocationSelect={handleLocationPresetSelect}
          onRequestGps={handleRequestGps}
          isGpsLoading={isGpsLoading}
          cartCount={totalCartCount}
          onOpenCart={openCart}
        />

        {/* Main Content View based on Active Tab or Selected Medical Provider Page */}
        <main className="p-3.5 sm:p-5">
          <Suspense fallback={<ListSkeleton rows={4} />}>
          {selectedProvider ? (
            <ProviderDetailView
              slug={selectedProvider.slug}
              preview={selectedProvider.preview}
              userLocation={userLocation}
              onBack={() => (history.length > 1 ? history.back() : navigate('/map'))}
              onNavigateToMap={() => navigate(routeHref({ tab: 'map' }))}
              onNavigateToCard={() => navigate(routeHref({ tab: 'mycard' }))}
            />
          ) : route.checkout ? (
            <CartCheckoutModal
              asPage
              isOpen
              initialStep={route.checkout}
              onClose={() => (history.length > 1 ? history.back() : navigate(routeHref({ tab: 'store' })))}
              cart={pricedCart}
              onUpdateCartQty={handleUpdateCartQty}
              onRemoveFromCart={handleRemoveFromCart}
              onClearCart={handleClearCart}
            />
          ) : route.quiz ? (
            <React.Suspense fallback={<div className="py-16 text-center text-4xl animate-bounce">⚽</div>}>
              <QuizGame />
            </React.Suspense>
          ) : route.orders ? (
            <OrdersPage code={route.orders.code} />
          ) : route.product ? (
            <ProductPage
              slug={route.product}
              cartCount={totalCartCount}
              onAddToCart={handleAddToCart}
              onUpdateCartQty={handleUpdateCartQty}
              onOpenCart={openCart}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView
                  userLocation={userLocation}
                  area={area}
                  onSelectProvider={handleSelectProvider}
                  onSearchOpen={() => setIsSearchOpen(true)}
                />
              )}

              {(activeTab === 'store' || activeTab === 'products') && (
                <StoreView
                  subTab={activeTab === 'products' ? 'products' : 'stores'}
                  onSubTabChange={(sub) => navigate(routeHref({ tab: sub === 'products' ? 'products' : 'store' }))}
                  storeSlug={route.store ?? null}
                  onOpenStore={(slug) => navigate(routeHref({ store: slug }))}
                  onCloseStore={() => navigate(routeHref({ tab: 'store' }))}
                  userLocation={userLocation}
                  cart={pricedCart}
                  onAddToCart={handleAddToCart}
                  onUpdateCartQty={handleUpdateCartQty}
                  onRemoveFromCart={handleRemoveFromCart}
                  onClearCart={handleClearCart}
                  onOpenCart={openCart}
                />
              )}

              {activeTab === 'map' && (
                <MapView
                  userLocation={userLocation}
                  selectedTypeId={selectedTypeId}
                  view={route.view}
                  radius={route.radius ?? 1}
                  sort={route.sort ?? null}
                  // The map's filters live in the URL, so a link or a refresh keeps the type, range, view and order.
                  onViewChange={(view) => navigate(routeHref({ ...route, tab: 'map', typeId: selectedTypeId, view }), { replace: true })}
                  onSelectType={(typeId) => navigate(routeHref({ ...route, tab: 'map', typeId }), { replace: true })}
                  onRadiusChange={(radius) => navigate(routeHref({ ...route, tab: 'map', radius }), { replace: true })}
                  onSortChange={(sort) => navigate(routeHref({ ...route, tab: 'map', sort }), { replace: true })}
                  onResetFilters={() => navigate(routeHref({ tab: 'map', view: route.view, radius: 0 }), { replace: true })}
                  onSelectProvider={handleSelectProvider}
                  onRequestGps={handleRequestGps}
                  isGpsLoading={isGpsLoading}
                />
              )}

              {(activeTab === 'profile' || activeTab === 'mycard') && (
                card.data && beneficiaries.length > 0 ? (
                <ProfileView
                  key={card.data.number}
                  onSignIn={() => setAccessStep('phone')}
                  mode={activeTab === 'mycard' ? 'card' : 'account'}
                  section={route.section}
                  onSectionChange={(section) => navigate(routeHref({ tab: activeTab, section }))}
                  account={{
                    name: card.data.holder || session.name || '',
                    phone: session.phone ?? '',
                    number: card.data.number,
                    validTo: card.data.valid_to,
                    signedIn: !!session.token,
                  }}
                  onLogout={handleLogout}
                  beneficiaries={beneficiaries}
                  theme={theme}
                  onThemeChange={handleThemeChange}
                  onAddBeneficiary={handleAddBeneficiary}
                  status={card.data.status}
                />
                ) : (
                  <AccountGate
                    state={card.loading ? 'loading' : card.error ? 'error' : session.token && !session.cardNumber ? 'no-card' : 'guest'}
                    signedIn={!!session.token}
                    token={session.token}
                    defaultName={session.name}
                    onTrialCreated={(number, name) => updateSession({ cardNumber: number, name })}
                    onSignIn={() => setAccessStep('phone')}
                    onEnterCard={() => setAccessStep('card')}
                    onLogout={handleLogout}
                    onRetry={card.reload}
                  />
                )
              )}
            </>
          )}
          </Suspense>
        </main>

        {/* Floating Side Contact Icon with Number */}
        {route.section !== 'pay' && <FloatingContactButton />}

        {/* 
          CRITICAL USER REQUIREMENT:
          "وعايز الناف بار الى تحت يكون ظاهر فى كل الصفحات وعايز بنفس الشكل الى بعته"
          Always visible across all tabs (Home, Card, Map, Profile) with the exact signature curve from screenshot
        */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            navigate(routeHref({ tab }));
          }}
        />
      </div>

      {/* Global Quick Search Modal */}
      {reminder && !silenced && !inGame && (
        <div className="fixed top-[calc(0.5rem+env(safe-area-inset-top))] inset-x-2 z-[999] flex justify-center" dir={isAr ? 'rtl' : 'ltr'}>
          <div {...reminderSwipe.handlers} style={reminderSwipe.style} className="w-full max-w-md bg-slate-950 text-white border border-amber-400/50 rounded-2xl shadow-2xl p-3 flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <p className="flex-1 text-[11px] font-bold leading-snug">
              {isAr ? 'سجّل اسمك ورقمك معنا لتحصل على كارت ديلر وخصومات الخدمات.' : 'Register your name and number with us to get your Deilar card and service discounts.'}
            </p>
            <button
              onClick={() => { setReminder(false); setAccessStep('visitor'); }}
              className="px-3 py-1.5 bg-amber-400 text-slate-950 text-[11px] font-black rounded-lg cursor-pointer shrink-0"
            >
              {isAr ? 'سجّل الآن' : 'Register'}
            </button>
            <button onClick={dismissReminder} className="text-slate-400 text-lg leading-none cursor-pointer shrink-0">×</button>
          </div>
        </div>
      )}
      {stage === 'gate' && <LocationGate onGranted={handleGateGranted} onSkip={handleFindNearest} />}
      {stage === 'nearest' && <NearestPrompt onGo={handleFindNearest} />}
      <Suspense fallback={null}>
      {isSearchOpen && <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        userLocation={userLocation}
        area={area}
        onSelectProvider={(p) => {
          handleSelectProvider(p);
          setIsSearchOpen(false);
        }}
      />}

      {/* Global Shopping Cart & Bank / Wallet Checkout Modal */}
      {areaAsk && !inGame && <AreaModal lat={userLocation.lat} lng={userLocation.lng} onClose={closeArea} />}
      {accessStep && !areaAsk && !inGame && <AccessModal initialStep={accessStep} onClose={closeAccess} />}
      {/* Every minute while a signed-in member's profile is unfinished: how far along it is, and what is missing. */}
      {/* Nothing floats over the payment form. */}
      <NoticeStack>
        {!inGame && <QuizReadyNotifier />}
        <PullToRefresh />
        {!inGame && stage === 'done' && route.section !== 'pay' && <MembershipReminder />}
        {!inGame && stage === 'done' && !accessStep && route.section !== 'pay' && <AddPhoneReminder />}
        {!inGame && stage === 'done' && route.section !== 'pay' && <ProfileReminder />}
        {!inGame && stage === 'done' && !areaAsk && route.section !== 'pay' && <SaveAreaPrompt />}
      </NoticeStack>
      </Suspense>
    </div>
  );
}
