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

// Tapping the notification focuses an existing tab if there is one, otherwise
// opens a new one at the site root.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow('/');
    })
  );
});
