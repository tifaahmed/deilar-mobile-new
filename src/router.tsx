import React, { useSyncExternalStore } from 'react';
import type { NavTab } from './components/BottomNav';

/**
 * Minimal History-API router: every page has a real URL, so the browser back
 * button, refresh and shared links land on the right screen.
 *
 *   /                      home
 *   /store                 stores
 *   /products              products
 *   /map  /map?type=22     map / list, optionally filtered by facility type
 *   /map?view=list         the map's list view
 *   /card                  my card (profile)
 *   /card/members  /card/support  /card/personal  /card/theme   profile sections
 *   /products/:slug        one product
 *   /cart  /checkout       the basket / the payment page
 *   /orders  /orders/:code my orders / one order
 *   /facilities/:slug      one facility
 */
export interface Route {
  tab: NavTab;
  /** Facility type filter on the map. */
  typeId: number | null;
  /** Set when a facility page is open. */
  facility: string | null;
  /** Set when a product page is open. */
  product: string | null;
  /** Set on the orders screens: `code` is null on the list. */
  orders: { code: string | null } | null;
  /** Set on the basket and the payment page. */
  checkout: 'cart' | 'checkout' | null;
  /** Map display: the default map, or the list. */
  view: 'map' | 'list';
  /** Profile section; null = the card itself. */
  section: ProfileSection | null;
}

export const PROFILE_SECTIONS = ['members', 'support', 'personal', 'theme'] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

const TAB_PATHS: Record<NavTab, string> = { home: '/', store: '/store', products: '/products', map: '/map', profile: '/card' };

export function parseRoute(pathname: string, search: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  const facility = path.match(/^\/facilities\/([^/]+)$/);

  if (facility) return { tab: 'map', typeId: null, facility: decodeURIComponent(facility[1]), product: null, orders: null, checkout: null, view: 'map', section: null };

  const product = path.match(/^\/products\/([^/]+)$/);

  if (product) return { tab: 'products', typeId: null, facility: null, product: decodeURIComponent(product[1]), orders: null, checkout: null, view: 'map', section: null };

  if (path === '/cart' || path === '/checkout') {
    return { tab: 'store', typeId: null, facility: null, product: null, orders: null, checkout: path === '/cart' ? 'cart' : 'checkout', view: 'map', section: null };
  }

  const orders = path.match(/^\/orders(?:\/([^/]+))?$/);

  if (orders) return { tab: 'profile', typeId: null, facility: null, product: null, orders: { code: orders[1] ? decodeURIComponent(orders[1]).toUpperCase() : null }, checkout: null, view: 'map', section: null };

  const profile = path.match(/^\/card\/([^/]+)$/);
  const section = profile && (PROFILE_SECTIONS as readonly string[]).includes(profile[1]) ? (profile[1] as ProfileSection) : null;

  const tab = profile && section ? 'profile' : ((Object.keys(TAB_PATHS) as NavTab[]).find((t) => TAB_PATHS[t] === path) ?? 'home');
  const params = new URLSearchParams(search);
  const type = Number(params.get('type'));

  return { tab, typeId: tab === 'map' && type > 0 ? type : null, facility: null, product: null, orders: null, checkout: null, view: tab === 'map' && params.get('view') === 'list' ? 'list' : 'map', section };
}

export function routeHref(route: Partial<Route> & { tab?: NavTab }): string {
  if (route.facility) return `/facilities/${encodeURIComponent(route.facility)}`;
  if (route.product) return `/products/${encodeURIComponent(route.product)}`;
  if (route.checkout) return route.checkout === 'cart' ? '/cart' : '/checkout';
  if (route.orders) return route.orders.code ? `/orders/${encodeURIComponent(route.orders.code)}` : '/orders';

  const base = TAB_PATHS[route.tab ?? 'home'];

  if (route.tab === 'profile' && route.section) return `${base}/${route.section}`;

  if (route.tab === 'map') {
    const query = new URLSearchParams();
    if (route.typeId) query.set('type', String(route.typeId));
    if (route.view === 'list') query.set('view', 'list');
    return query.size ? `${base}?${query}` : base;
  }

  return base;
}

const listeners = new Set<() => void>();

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  if (to !== location.pathname + location.search) {
    history[opts.replace ? 'replaceState' : 'pushState'](null, '', to);
    window.scrollTo({ top: 0 });
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

const snapshot = () => location.pathname + location.search;

export function useRoute(): Route {
  const url = useSyncExternalStore(subscribe, snapshot);
  const [pathname, search = ''] = url.split('?');
  return React.useMemo(() => parseRoute(pathname, search ? `?${search}` : ''), [pathname, search]);
}

/** A real `<a href>`: ctrl/cmd-click and "open in new tab" work; a plain click navigates in-app. */
export const Link: React.FC<Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: Partial<Route> & { tab?: NavTab } }> = ({ to, onClick, children, ...rest }) => {
  const href = routeHref(to);

  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
};
