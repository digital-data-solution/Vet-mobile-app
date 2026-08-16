import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com';

// Controls how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export async function registerForPushNotificationsAsync(accessToken: string): Promise<string | null> {
  // Web push uses the browser's native Web Push API under the hood (see
  // app.json's expo.notification.vapidPublicKey / serviceWorkerPath and
  // public/expo-service-worker.js) — no Firebase SDK involved. It still
  // returns a normal ExponentPushToken[...], so the backend needs no
  // web-specific handling.

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:              'Default',
      importance:        Notifications.AndroidImportance.MAX,
      vibrationPattern:  [0, 250, 250, 250],
      lightColor:        '#E8610A',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // Get Expo push token — needs projectId for EAS builds
  // projectId is populated in app.json extra.eas.projectId after running `eas init`
  const projectId =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  // expo-application's applicationId is hardcoded null on web (no native
  // bundle ID there), which otherwise makes getExpoPushTokenAsync throw
  // ERR_NOTIFICATIONS_NO_APPLICATION_ID. Reuse the iOS/Android identifier
  // from app.json so the web token request succeeds too.
  const applicationId =
    Platform.OS === 'web'
      ? (Constants.expoConfig as any)?.ios?.bundleIdentifier ?? (Constants.expoConfig as any)?.android?.package
      : undefined;

  let token: string | null = null;
  try {
    const result = await Notifications.getExpoPushTokenAsync({
      ...(projectId ? { projectId } : {}),
      ...(applicationId ? { applicationId } : {}),
    });
    token = result.data;
  } catch (err) {
    console.warn('[Push] Could not get push token:', err);
    return null;
  }

  // Save token to backend
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
