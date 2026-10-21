import { apiPost } from '../api/http';

/**
 * Files a failure with the backend's client-error log (`/admin/client-error-logs` there), so a
 * problem a user hit on their phone is findable. Never throws: a reporter that fails would hide
 * the error it is reporting.
 */
export function reportClientError(message: string, error?: unknown, extra: Record<string, unknown> = {}): void {
  const err = error instanceof Error ? error : null;

  apiPost('/client-errors', {
    platform: 'deilar-app',
    route: typeof window !== 'undefined' ? window.location.hash || window.location.pathname : null,
    message: `${message}${err ? `: ${err.message}` : ''}`.slice(0, 5000),
    stack: err?.stack?.slice(0, 20000),
    fatal: false,
    extra,
  }).catch(() => undefined);
}
