import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbort, Params, peek } from '../api/http';
import type { Paged } from '../api/types';

export interface PagedState<T> {
  items: T[];
  /** First page in flight (nothing to show yet). */
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * An infinite list over a `{ data, has_more }` endpoint.
 *
 * Resets (and aborts whatever was in flight) whenever the path or params
 * change; pass `enabled = false` to stay idle. A first page that is already in
 * the API cache is shown instantly while it revalidates.
 */
export function usePaged<T>(
  path: string,
  params: Params,
  fetchPage: (page: number, signal: AbortSignal) => Promise<Paged<T>>,
  enabled = true,
): PagedState<T> {
  const key = `${path}?${JSON.stringify(params)}`;
  const [state, setState] = useState<{ key: string; items: T[]; page: number; hasMore: boolean; status: 'loading' | 'idle' | 'more' | 'error' }>({
    key: '',
    items: [],
    page: 0,
    hasMore: false,
    status: 'idle',
  });
  const [nonce, setNonce] = useState(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const cached = peek<Paged<T>>(path, { ...paramsRef.current, page: 1 });
    setState({ key, items: cached?.data ?? [], page: cached ? 1 : 0, hasMore: cached?.has_more ?? false, status: cached ? 'idle' : 'loading' });

    fetchRef.current(1, controller.signal).then(
      (res) => setState({ key, items: res.data, page: 1, hasMore: res.has_more, status: 'idle' }),
      (e) => {
        if (!isAbort(e)) setState((s) => (s.key === key && s.items.length === 0 ? { ...s, status: 'error' } : s));
      },
    );

    return () => controller.abort();
  }, [key, enabled, nonce, path]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (s.key !== key || s.status !== 'idle' || !s.hasMore) return;

    const next = s.page + 1;
    const signal = controllerRef.current?.signal ?? new AbortController().signal;

    // Flip the status first so a second near-simultaneous call is ignored.
    stateRef.current = { ...s, status: 'more' };
    setState(stateRef.current);

    fetchRef.current(next, signal).then(
      (res) =>
        setState((cur) =>
          cur.key === key && cur.page === next - 1
            ? { ...cur, items: [...cur.items, ...res.data], page: next, hasMore: res.has_more, status: 'idle' }
            : cur,
        ),
      (e) => {
        if (!isAbort(e)) setState((cur) => (cur.key === key ? { ...cur, status: 'idle' } : cur));
      },
    );
  }, [key]);

  const current = state.key === key;

  return {
    items: current ? state.items : [],
    loading: enabled && (!current || (state.status === 'loading' && state.items.length === 0)),
    loadingMore: current && state.status === 'more',
    error: current && state.status === 'error',
    hasMore: current && state.hasMore,
    loadMore,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}
