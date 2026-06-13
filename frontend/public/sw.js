self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))),
      self.clients.matchAll({ type: 'window' }).then((clients) => clients.forEach((client) => client.navigate(client.url))),
    ])
  );
});
