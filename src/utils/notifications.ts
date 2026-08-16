import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com';

// Same key AuthScreen.tsx persists the Supabase access token under — reused
// here so the web click-tracking bridge (below) can report a tap even though
// it fires from a service-worker message, outside any React auth context.
const ACCESS_TOKEN_STORAGE_KEY = 'access_token';

// Controls how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Reports that the current user tapped a push carrying an
 * adminNotificationId — the "who is clicking" half of admin-sent
 * notifications (see backend services/adminNotification.service.js /
 * api/notifications.controller.js). Best-effort: a failure here should
 * never surface to the user, it's just analytics.
 */
export async function reportNotificationOpen(
  data: Record<string, unknown> | undefined | null,
  accessToken?: string | null,
): Promise<void> {
  const notificationId = data?.adminNotificationId;
  if (!notificationId || typeof notificationId !== 'string') return;

  try {
    const token = accessToken ?? (await AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
    if (!token) return;
    await fetch(`${BASE_URL}/api/notifications/track-open`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ notificationId }),
    });
  } catch {
    // best-effort only
  }
}

// Web taps happen inside the service worker (see public/expo-service-worker.js
// notificationclick handler), which has no access to React state or a bearer
// token directly — it posts a message to the page instead, and this listener
// (set up once, module load) picks it up and reports the open using the
// persisted access token. Set up unconditionally at import time so it's
// active even before the user is on a screen that calls
// registerForPushNotificationsAsync.
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'xpressvet-notification-click') {
      reportNotificationOpen(event.data.data);
    }
  });
}

async function requestPermissionAndChannel(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:              'Default',
      importance:        Notifications.AndroidImportance.MAX,
      vibrationPattern:  [0, 250, 250, 250],
      lightColor:        '#E8610A',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Web push registration. Deliberately does NOT go through
 * getExpoPushTokenAsync() — confirmed against the live API that Expo's push
 * relay rejects type:"web" outright ("Invalid enum value. Expected 'apns' |
 * 'fcm' | 'gcm'"), so there is no unified ExponentPushToken for browsers.
 * Instead this gets a real W3C Push API subscription (getDevicePushTokenAsync,
 * using app.json's notification.vapidPublicKey + serviceWorkerPath) and saves
 * it to its own endpoint; the backend delivers to it directly via web-push
 * (see mobile_backend services/pushNotification.service.js sendWebPush*).
 */
// A browser only allows one applicationServerKey per PushManager subscription.
// If a device already subscribed under an older key (e.g. the very first
// VAPID key this project used, before switching to the current one),
// subscribing again throws InvalidStateError — confirmed in production:
// "A subscription with a different applicationServerKey ... already exists;
// to change the applicationServerKey, unsubscribe then resubscribe."
// expo-notifications doesn't handle this itself, so clear any existing
// subscription first — safe no-op when there isn't one.
async function unsubscribeExistingWebPush(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const existing = await registration?.pushManager.getSubscription();
    await existing?.unsubscribe();
  } catch {
    // best-effort — if this fails, the subscribe() call below will just
    // surface its own error as before.
  }
}

async function registerWebPush(accessToken: string): Promise<string | null> {
  await unsubscribeExistingWebPush();

  let subscription: { endpoint: string; keys: { p256dh: string; auth: string } } | null = null;
  try {
    const result = await Notifications.getDevicePushTokenAsync();
    // On web, result.data is { endpoint, keys: { p256dh, auth } } — see
    // expo-notifications/getDevicePushTokenAsync.web.ts.
    subscription = result.data as any;
  } catch (err) {
    console.warn('[Push][Web] Could not get push subscription:', err);
    return null;
  }
  if (!subscription?.endpoint) return null;

  try {
    await fetch(`${BASE_URL}/api/auth/web-push-subscription`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subscription }),
    });
  } catch (err) {
    console.warn('[Push][Web] Could not save subscription to backend:', err);
  }

  return subscription.endpoint;
}

/**
 * Native (iOS/Android) push registration — unchanged Expo relay flow,
 * returns a normal ExponentPushToken[...].
 */
async function registerNativePush(accessToken: string): Promise<string | null> {
  const projectId =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  let token: string | null = null;
  try {
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    token = result.data;
  } catch (err) {
    console.warn('[Push] Could not get push token:', err);
    return null;
  }

  try {
    await fetch(`${BASE_URL}/api/auth/push-token`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.warn('[Push] Could not save push token to backend:', err);
  }

  return token;
}

export async function registerForPushNotificationsAsync(accessToken: string): Promise<string | null> {
  const granted = await requestPermissionAndChannel();
  if (!granted) return null;

  return Platform.OS === 'web' ? registerWebPush(accessToken) : registerNativePush(accessToken);
}
