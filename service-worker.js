const CACHE_NAME = 'nexuslib-cache-v95';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  // Navegaciones (HTML): network-first — el documento debe ser fresco tras
  // un deploy; el cache queda como fallback offline y se refresca solo.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached =>
        cached || caches.match('./index.html')
      ))
    );
    return;
  }
  // Resto (assets, CDN, APIs): cache-first — solo lo precacheado responde
  // desde cache; el resto va a red (nunca cacheamos respuestas de API).
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});