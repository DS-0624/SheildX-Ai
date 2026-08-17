// ShieldX AI Service Worker for Interactive Watch & Phone Notification Actions
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (action === 'SAFE') {
          client.postMessage({ type: 'NOTIFICATION_ACTION_SAFE' });
        } else if (action === 'SOS') {
          client.postMessage({ type: 'NOTIFICATION_ACTION_SOS' });
        } else {
          client.focus();
        }
      }
    })
  );
});
