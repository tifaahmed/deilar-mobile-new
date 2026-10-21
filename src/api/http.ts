/**
 * Tiny fetch layer for the Deilar API.
 *
 * - GET only, no custom request headers: the browser treats it as a "simple"
 *   CORS request, so there is no OPTIONS preflight round trip before each call.
 *   The language travels as `?lang=` for the same reason (and it keeps the URL
 *   a correct HTTP-cache key per language).
 * - Identical in-flight requests share one network call.
 * - A short in-memory cache makes tab switches instant; beyond that the server's
 *   `Cache-Control` + `ETag` let the browser revalidate with a body-less `304`.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://card.deilar.com/api/v1';

export type Param = string | number | boolean | null | undefined;
export type Params = Record<string, Param>;

/** Absolute URL of an API path, for things the browser loads itself (images). */
export const apiUrl = (path: string): string => `${API_URL}${path}`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The API's own machine-readable cause (`invalid_code`, `cooldown`, ...) when it sent one. */
    readonly reason?: string,
    readonly body?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let language = 'ar';

export function setApiLanguage(lang: string): void {
  language = lang;
}

export function buildUrl(path: string, params: Params = {}): string {
  const query = new URLSearchParams();

  const all: Params = { ...params, lang: language };

  // Sorted so the same request always has the same URL — the cache key.
  for (const key of Object.keys(all).sort()) {
    const value = all[key];
    if (value !== null && value !== undefined && value !== '') query.set(key, String(value));
  }

  return `${API_URL}${path}?${query}`;
}

interface Entry {
  at: number;
  data: unknown;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Answers worth keeping across visits (the facility types, the home page's nearest list…), saved on
 * the device so the next visit paints from them at once and refreshes in the background — instead of
 * showing a skeleton while the same list is fetched again. Only requests that ask for `persist`
 * are saved, and only a handful, so this can never grow into a second database.
 */
const STORE_KEY = 'deilar_api_cache_v1';
const STORE_MAX_ENTRIES = 24;
/** A saved answer older than this is not shown at all (a week-old "nearest" is worse than a skeleton). */
const STORE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

let stored: Map<string, Entry> | null = null;

function loadStored(): Map<string, Entry> {
  if (stored) return stored;
  stored = new Map();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    for (const [url, entry] of Object.entries(raw ? (JSON.parse(raw) as Record<string, Entry>) : {})) {
      if (Date.now() - entry.at < STORE_MAX_AGE_MS) stored.set(url, entry);
    }
  } catch {
    /* storage unavailable or corrupt: behave as if nothing was saved */
  }
  return stored;
}

function saveStored(url: string, entry: Entry): void {
  const map = loadStored();
  map.delete(url);
  map.set(url, entry);
  while (map.size > STORE_MAX_ENTRIES) map.delete(map.keys().next().value as string);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    /* full or blocked: the in-memory cache still works */
  }
}

/** Fresh enough to skip the network entirely. */
const DEFAULT_TTL_MS = 60_000;

/** Whatever is already in memory for this request, however old — for instant paint. */
export function peek<T>(path: string, params?: Params): T | undefined {
  const url = buildUrl(path, params);
  return (cache.get(url) ?? loadStored().get(url))?.data as T | undefined;
}

export function apiGet<T>(path: string, params?: Params, opts: { signal?: AbortSignal; ttl?: number; persist?: boolean } = {}): Promise<T> {
  const url = buildUrl(path, params);
  const hit = cache.get(url);

  if (hit && Date.now() - hit.at < (opts.ttl ?? DEFAULT_TTL_MS)) {
    return Promise.resolve(hit.data as T);
  }

  let request = inflight.get(url) as Promise<T> | undefined;

  if (!request) {
    request = fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
        return (await res.json()) as T;
      })
      .then((data) => {
        const entry = { at: Date.now(), data };
        cache.set(url, entry);
        if (opts.persist) saveStored(url, entry);
        return data;
      })
      .finally(() => inflight.delete(url));

    inflight.set(url, request);
  }

  return opts.signal ? abortable(request, opts.signal) : request;
}

/** Lets one caller walk away without cancelling the request other callers share. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));

    if (signal.aborted) return abort();

    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

/** Public site root (the API base without its `/v1`), for the few endpoints that live outside `/v1`. */
const SITE_API_URL = API_URL.replace(/\/v1\/?$/, '');

async function send<T>(url: string, init: { method: string; body?: unknown; token?: string }): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const res = await fetch(url, {
    method: init.method,
    headers: {
      // A FormData body sets its own multipart boundary.
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new ApiError(String(json.message ?? `Request failed (${res.status})`), res.status, json.reason as string | undefined, json);
  }

  return json as T;
}

/** POST to a `/v1` endpoint (query carries the language, like GETs). */
export const apiPost = <T>(path: string, body: unknown, params?: Params, token?: string) =>
  send<T>(buildUrl(path, params), { method: 'POST', body, token });

/** Authenticated GET (never cached — it is the member's own data). */
export const apiGetAuth = <T>(path: string, token: string, params?: Params) => send<T>(buildUrl(path, params), { method: 'GET', token });

export const apiPut = <T>(path: string, body: unknown, token: string, params?: Params) => send<T>(buildUrl(path, params), { method: 'PUT', body, token });

/** Sends a "call me" request to the Contact Us inbox. */
export async function postContactMessage(body: { phone: string; name?: string; message: string; source: 'card_popup' | 'contact_form' }): Promise<void> {
  await send(`${SITE_API_URL}/contact-messages`, { method: 'POST', body });
}
