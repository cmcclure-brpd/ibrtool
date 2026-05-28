/**
 * BRPD NIBRS Compliance Tool — Service Worker
 *
 * UPDATE INSTRUCTIONS:
 *   When deploying a new version of index.html, increment CACHE_VERSION below.
 *   Format: 'vYYYY.M.N'  (e.g. 'v2025.2.0')
 *   On next visit, users will see an "Update available" toast and can refresh
 *   to get the new version immediately.
 */

const CACHE_VERSION   = 'v2025.1.0';
const CACHE_NAME      = `brpd-nibrs-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── Install ────────────────────────────────────────────────────────────────
// Do NOT call self.skipWaiting() here.
// The new SW stays in "waiting" state until the user clicks "Update Now",
// which posts a SKIP_WAITING message (handled below).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// ── Activate: purge old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('brpd-nibrs-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.destination === 'document') {
    // Network-first for HTML so updates propagate quickly
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for everything else
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()));
            return res;
          })
      )
    );
  }
});

// ── Message: user clicked "Update Now" ────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
