import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbort } from '../api/http';

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Runs `fetcher` whenever `key` changes (pass `null` to stay idle).
 * The previous key's data is never shown under a new key, and a request that
 * is no longer wanted is abandoned rather than allowed to overwrite newer state.
 *
 * `initial` lets a caller paint from an already-cached response immediately.
 */
export function useApi<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  initial?: () => T | undefined,
): QueryState<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error: boolean }>({ key: null, error: false });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    if (key === null) return;

    const controller = new AbortController();
    const cached = initialRef.current?.();
    // A reload of the same request keeps what is on screen until the new answer arrives (the UI must not blink away
    // — or unmount a payment form that is open); a different request starts from its cached answer, if any.
    setState((prev) => ({ key, data: prev.key === key ? prev.data : cached, error: false }));

    fetcherRef.current(controller.signal).then(
      (data) => setState({ key, data, error: false }),
      (e) => {
        if (!isAbort(e)) setState((s) => (s.key === key ? { ...s, error: true } : s));
      },
    );

    return () => controller.abort();
  }, [key, nonce]);

  const current = state.key === key ? state : undefined;
  const data = current?.data;

  return {
    data,
    loading: key !== null && data === undefined && !current?.error,
    error: !!current?.error && data === undefined,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}
