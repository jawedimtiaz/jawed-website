/* Jawed.co.in Service Worker (PWA Offline Fallback & Cache-First Strategy) */

const CACHE_NAME = 'jawed-co-in-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/assets/images/social-preview.webp',
  '/apple-touch-icon.webp',
  '/apple-touch-icon.png',
  '/pwa-192x192.webp',
  '/pwa-192x192.png',
  '/pwa-512x512.webp',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.webp',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.webp',
  '/pwa-maskable-512x512.png',
  '/offline.html'
];

// Offline HTML fallback template string
const OFFLINE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline | Jawed Imtiaz IT Field Tech</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 2.5rem 2rem;
      border-radius: 1rem;
      max-width: 440px;
      margin: 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    h1 {
      font-size: 1.5rem;
      margin-top: 0;
      color: #38bdf8;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      background: #38bdf8;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 2.5rem; margin-bottom: 1rem;">📡</div>
    <h1>You are Currently Offline</h1>
    <p>It looks like your internet connection was lost. Jawed.co.in cached tools and guides are accessible once reconnected.</p>
    <button className="btn" onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>`;

// Install Event: Precaching Core Static Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Put offline.html synthetic response into cache
      cache.put('/offline.html', new Response(OFFLINE_PAGE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Core asset caching soft warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First for Assets, Network-First with Offline Fallback for Navigation
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Handle HTML document navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful navigation responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response(OFFLINE_PAGE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Cache-First strategy for static assets (CSS, JS, Fonts, Images)
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background (Stale-While-Revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Ignore background fetch errors */});

          return cachedResponse;
        }

        // Fetch from network if not in cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default Network First strategy
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
