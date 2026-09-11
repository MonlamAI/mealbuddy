// MealBuddy Production Service Worker
// Cache Versioning
const VERSION = 'v1';
const STATIC_CACHE = `mealbuddy-static-${VERSION}`;
const ASSETS_CACHE = `mealbuddy-assets-${VERSION}`;
const PAGES_CACHE = `mealbuddy-pages-${VERSION}`;

const CURRENT_CACHES = [STATIC_CACHE, ASSETS_CACHE, PAGES_CACHE];

// Core App Shell & Fallback Assets to Pre-cache
const PRECACHE_ASSETS = [
  '/offline',
  '/MonlamTBslim.ttf',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
];

// Paths that must NEVER be cached (Dynamic / Sensitive Data)
const API_ROUTES = [
  '/api/',
  '/v1/',
  '/sanctum/',
  '/filament/',
  '/livewire/',
  '/admin/',
  '/storage/',
];

function isApiOrDynamic(url) {
  return API_ROUTES.some((route) => url.pathname.startsWith(route));
}

// Install Event: Pre-cache core shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        // Precache error should not prevent registration
        console.warn('[SW] Pre-cache encountered an issue:', err);
      })
  );
  // Do NOT blindly call self.skipWaiting() here.
  // We allow a controlled update flow initiated by user interaction.
});

// Activate Event: Clean up outdated cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!CURRENT_CACHES.includes(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Message Event: Listen for controlled skipWaiting trigger from frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: Conservative, robust routing strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Mutating requests: NEVER cache POST, PUT, PATCH, DELETE
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 2. Cross-Origin Requests (e.g. backend API on different port/domain): NEVER intercept
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. API & Dynamic Endpoints: NEVER cache
  if (isApiOrDynamic(url)) {
    // Network-only for API requests
    return;
  }

  // 3. Page Navigation (HTML documents)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If network succeeded, optionally update pages cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed: try cached page or serve offline page fallback
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) {
            return offlineFallback;
          }
          return new Response('Network unavailable and offline page not cached.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 4. Next.js Static Build Assets (/_next/static/*)
  // Content-hashed files: Stale-While-Revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(ASSETS_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Static Shell Resources (fonts, icons, public assets)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network with cache fallback for other GET requests
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).catch(() => {
          // If offline and not in cache, let it fail naturally
          return new Response('', { status: 503, statusText: 'Offline' });
        })
      );
    })
  );
});
