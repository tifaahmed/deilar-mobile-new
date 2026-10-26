import { Capacitor } from '@capacitor/core';
import { apiPost } from '../api/http';
import { getSavedGps } from './gps';
import type { Route } from '../router';
import { reportClientError } from './reportError';

const KEY = 'deilar_visitor_key';

/** One id per install, kept on the device; the backend merges every hit under it into one visitor. */
function visitorKey(): string {
  try {
    let key = localStorage.getItem(KEY);
    if (!key) {
      key = `app-${crypto.randomUUID()}`;
      localStorage.setItem(KEY, key);
    }
    return key;
  } catch {
    return `app-session-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

/** The screen's name and, for a product / facility / store page, which one — sent to the backend. */
function describe(route: Route): { page: string; subject_type?: 'product' | 'facility'; subject_slug?: string } {
  if (route.product) return { page: 'products.show', subject_type: 'product', subject_slug: route.product };
  if (route.facility) return { page: 'facility.show', subject_type: 'facility', subject_slug: route.facility };
  if (route.store) return { page: 'stores.show' };
  if (route.orders) return { page: route.orders.code ? 'orders.show' : 'orders.index' };
  if (route.checkout) return { page: route.checkout };
  if (route.section) return { page: `card.${route.section}` };

  return { page: { home: 'home', store: 'stores.index', products: 'products.index', map: 'facility.map', mycard: 'card', profile: 'account' }[route.tab] ?? route.tab };
}

/**
 * Tells the backend a screen was opened (`POST /mobile/visits`). The signed-in member's token is
 * sent when there is one — that is the ONLY thing that links the visit to a member. Fire and
 * forget: tracking must never slow or break a screen.
 */
export function trackVisit(route: Route, token?: string | null): void {
  const platform = Capacitor.getPlatform();
  if (platform !== 'android' && platform !== 'ios') return; // a plain browser is the website's job

  const gps = getSavedGps();

  apiPost(
    '/mobile/visits',
    {
      visitor_key: visitorKey(),
      platform,
      ...describe(route),
      url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined,
      latitude: gps?.lat,
      longitude: gps?.lng,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    undefined,
    token ?? undefined,
  ).catch((e) => reportClientError('trackVisit failed', e));
}
