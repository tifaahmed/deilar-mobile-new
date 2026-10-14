import { useEffect, useState } from 'react';
import { apiGet } from '../api/http';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.deilar.card';

interface AppConfig {
  /** Lowest Android versionCode still allowed to run; anything older must update. */
  min_version_code?: number;
  /** Where "Update now" goes; defaults to this app's Play Store page. */
  store_url?: string;
}

export interface ForceUpdate {
  required: boolean;
  storeUrl: string;
}

/**
 * Asks the server which build is the oldest allowed. Fails open: if the check
 * can't be made (offline, endpoint missing) the app keeps working rather than
 * locking everyone out.
 */
export function useForceUpdate(): ForceUpdate {
  const [state, setState] = useState<ForceUpdate>({ required: false, storeUrl: PLAY_STORE_URL });

  useEffect(() => {
    if (!__APP_VERSION_CODE__) return;

    const check = () =>
      apiGet<AppConfig>('/mobile/app-config', {}, { ttl: 0 }).then(
        (cfg) =>
          setState({
            required: (cfg.min_version_code ?? 0) > __APP_VERSION_CODE__,
            storeUrl: cfg.store_url || PLAY_STORE_URL,
          }),
        () => {},
      );

    check();

    // Re-check when the user comes back to the app, so a release made while it sat in the background is enforced.
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return state;
}
