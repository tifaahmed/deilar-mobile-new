import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiPost } from '../api/http';
import { navigate } from '../router';

/**
 * Push notifications from the admin's dashboard (Firebase Cloud Messaging).
 *
 * On a phone the app asks permission once, gets this install's FCM token and hands it to the backend
 * (`POST /mobile/push-token`; the member's bearer token rides along when signed in, so the backend can link the phone to the member).
 * The notification itself is drawn by the system when the app is closed or in the background; while the app is open the
 * plugin reports it here and nothing else is needed. Tapping one opens its `url`: an app path (`/products`) or an https link.
 * Every step is best-effort — a failure never blocks the app — and the web build does nothing.
 */
let started = false;
let lastToken: string | null = null;

const platform = (): 'android' | 'ios' => (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android');

async function sendToken(token: string, memberToken?: string | null): Promise<void> {
  try {
    await apiPost('/mobile/push-token', { token, platform: platform(), locale: document.documentElement.lang || 'ar' }, undefined, memberToken ?? undefined);
  } catch {
    /* offline or backend down: it is sent again next launch / sign-in */
  }
}

/** Fired when a tapped notification opens an app page, so the start-up screens (location gate, area pop-up) get out of its way. */
export const PUSH_OPEN_EVENT = 'deilar:push-open';

function open(url: string | undefined): void {
  if (!url) return;
  if (url.startsWith('/')) {
    window.dispatchEvent(new Event(PUSH_OPEN_EVENT));
    navigate(url);
  }
  else if (/^https:\/\//i.test(url)) void Browser.open({ url });
}

/** Call once at start-up; call again with the member's token after sign-in so the phone is linked to the member. */
export async function startPush(memberToken?: string | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (!started) {
      started = true;
      await PushNotifications.addListener('registration', (t) => {
        lastToken = t.value;
        void sendToken(t.value, memberToken);
      });
      await PushNotifications.addListener('registrationError', () => {
        /* no Google services / permission refused: nothing to do */
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', (a) => open(a.notification.data?.url));

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') return;
      await PushNotifications.register();
    } else if (lastToken) {
      await sendToken(lastToken, memberToken);
    }
  } catch {
    /* never block the app on notifications */
  }
}
