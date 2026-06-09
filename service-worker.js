/* ============================================================
   Pourō — Service Worker
   Cache-first, fully offline. No external dependencies.
   Bump CACHE_VERSION on every release to invalidate old caches.
   ============================================================ */

const CACHE_VERSION = 'pouro-v1.4.0';

/* All assets the app needs to run fully offline.
   Pourō uses only system fonts and inline CSS/JS, so this list
   is the complete shell. Paths are relative to the SW scope. */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-180.png',
  // UI icons referenced by index.html (only the in-use 128px variants)
  './assets/icons/128/method/icon-method-46-dark.png',
  './assets/icons/128/method/icon-method-hybrid-dark.png',
  './assets/icons/128/method/icon-method-neo-dark.png',
  './assets/icons/128/method/icon-method-ice-dark.png',
  './assets/icons/128/method/icon-method-46-active.png',
  './assets/icons/128/method/icon-method-hybrid-active.png',
  './assets/icons/128/method/icon-method-neo-active.png',
  './assets/icons/128/method/icon-method-ice-active.png',
  './assets/icons/128/ui/icon-ui-brew-muted.png',
  './assets/icons/128/ui/icon-ui-history-muted.png',
  './assets/icons/128/ui/icon-ui-settings-muted.png',
  './assets/icons/128/ui/icon-ui-brew-dark.png',
  './assets/icons/128/ui/icon-ui-history-dark.png',
  './assets/icons/128/ui/icon-ui-settings-dark.png',
  './assets/icons/128/ui/icon-ui-back-dark.png',
  './assets/icons/128/ui/icon-ui-pause-white.png',
  './assets/icons/128/ui/icon-ui-next-dark.png'
];

/* ---- Install: precache the shell, activate immediately ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate: drop stale caches, take control of open pages ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- Fetch: cache-first for same-origin GET ---- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; let everything else hit the network untouched.
  if (req.method !== 'GET') return;

  // Only handle same-origin requests; ignore any cross-origin calls.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (address bar, app launch) → serve the app shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) =>
        cached || fetch(req).catch(() => caches.match('./'))
      )
    );
    return;
  }

  // Everything else: cache-first, fall back to network, then cache the result.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache valid, basic (same-origin) responses.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

/* ---- Allow the page to trigger an immediate update ---- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
