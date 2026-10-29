import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { apiGet } from '../api/http';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.deilar.card';
/** iOS has no Play Store: the server's `store_url` must be the App Store page; without one the update screen never shows there. */
const IS_IOS = Capacitor.getPlatform() === 'ios';

interface AppConfig {
  /** Lowest Android versionCode still allowed to run; anything older must update. */
  min_version_code?: number;
  /** Where "Update now" goes; defaults to this app's Play Store page. */
  store_url?: string;
  /** iOS: lowest build still allowed, and the App Store page. */
  ios_min_build?: number;
  ios_store_url?: string;
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
            required: IS_IOS ? !!cfg.ios_store_url && (cfg.ios_min_build ?? 0) > __APP_VERSION_CODE__ : (cfg.min_version_code ?? 0) > __APP_VERSION_CODE__,
            storeUrl: (IS_IOS ? cfg.ios_store_url : cfg.store_url) || PLAY_STORE_URL,
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
