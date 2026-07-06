// Tony's European Auto Service — service worker
// Strategy: network-first for HTML (always fresh content), cache-first for
// versioned static assets, and never touch the /api/diagnose endpoint.
const CACHE = 'tonys-v4';
const SHELL = ['/', '/assets/logo-sm.png', '/assets/video/hero-poster.jpg'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache the live AI advisor.
  if (url.pathname.startsWith('/api/')) return;

  // HTML navigations: network-first, fall back to cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Same-origin static assets: cache-first (assets are immutable / versioned).
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached)
      )
    );
  }
  // Cross-origin (fonts, map embed): pass through to the network.
});
