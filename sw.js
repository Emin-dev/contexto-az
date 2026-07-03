// Contexto AZ service worker — offline-first cache with versioned busting.
// Bump CACHE_VERSION whenever the cached assets change to force an update.
const CACHE_VERSION = 'contexto-az-v1.0.1';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './favicon.svg',
  './js/main.js',
  './js/dataset.js',
  './js/daily.js',
  './js/guess.js',
  './js/state.js',
  './js/checkout.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first for same-origin GETs, falling back to network and caching the
// result. Keeps the game instant and fully playable offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
