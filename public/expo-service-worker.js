// Service worker for Xpress Vet web push notifications.
//
// This handles the browser side of Expo's web push support (Web Push API,
// not Firebase Messaging — see expo-notifications/getDevicePushTokenAsync.web.js).
// Required by app.json's expo.notification.serviceWorkerPath.
// Docs: https://docs.expo.dev/versions/latest/guides/using-vapid/

let notificationIcon = null;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// expo-notifications posts { fromExpoWebClient: { notificationIcon } } to the
// active service worker right after subscribing (see getDevicePushTokenAsync.web.js).
self.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.fromExpoWebClient?.notificationIcon) {
      notificationIcon = data.fromExpoWebClient.notificationIcon;
    }
  } catch {
    // Ignore anything that isn't the JSON message above.
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Xpress Vet', body: event.data.text() };
  }

  const title = payload.title || 'Xpress Vet';
  const body = payload.body || '';
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: notificationIcon || undefined,
      badge: notificationIcon || undefined,
      data,
    })
  );
});

// Tapping the notification focuses an existing tab if there is one (else
// opens a new one at the site root), and posts the notification's data back
// to that page — the service worker has no access to React state or a bearer
// token to report the tap itself, so notifications.ts's message listener
// picks this up and calls /api/notifications/track-open instead.
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      const client = existing ? await existing.focus() : await self.clients.openWindow('/');
      client?.postMessage({ type: 'xpressvet-notification-click', data });
    })
  );
});
