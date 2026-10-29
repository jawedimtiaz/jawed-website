/* Jawed.co.in Service Worker (PWA Offline Fallback & Cache-First Strategy) */

const CACHE_NAME = 'jawed-pwa-v4';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
  '/assets/images/social-preview.webp'
];

// Offline HTML fallback template string with auto-reload upon reconnection
const OFFLINE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0f172a" />
  <title>Offline | Jawed Imtiaz IT Field Tech</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --border: #334155;
      --accent: #38bdf8;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      margin: 0;
      padding: 1.5rem;
      background-color: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      line-height: 1.6;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 2.5rem 2rem;
      border-radius: 1rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 12px 36px rgba(0,0,0,0.4);
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      display: inline-block;
    }
    h1 {
      font-size: 1.5rem;
      margin-top: 0;
      margin-bottom: 0.75rem;
      color: var(--text);
    }
    p {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 1.5rem;
      text-align: left;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
    }
    .links a {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .links a:hover {
      text-decoration: underline;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #0284c7;
      color: #ffffff;
      padding: 0.75rem 1.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      border: none;
      transition: background-color 0.15s ease;
      min-height: 44px;
      width: 100%;
    }
    .btn:hover {
      background: var(--accent);
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="card" role="main">
    <div class="icon" aria-hidden="true">📡</div>
    <h1>You are Currently Offline</h1>
    <p>Your internet connection was interrupted. Pre-cached tools and guides remain accessible offline:</p>
    <div class="links">
      <a href="/tools">🛠️ Diagnostic &amp; IT Field Tools</a>
      <a href="/tools/ipv4-subnet-calculator">🌐 IPv4 Subnet Calculator</a>
      <a href="/tools/it-resume-bullet-builder">📄 IT Resume Bullet Builder</a>
    </div>
    <button class="btn" onclick="window.location.reload()">Retry Connection</button>
  </div>
  <script>
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>`;

// Install Event: Precaching Core Static Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Put offline fallback into cache
      await cache.put('/offline.html', new Response(OFFLINE_PAGE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));

      // Cache core assets safely without aborting on a single non-critical asset
      await Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[ServiceWorker] Precache soft notice for:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup Old Caches & Claim Clients Immediately
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

// Listen for skip waiting messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper: Network fetch with timeout for navigation
function fetchWithTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network request timed out'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Fetch Event:
// - Navigation: Network-First (with timeout fallback to cached SPA shell / offline page)
// - Hashed assets (/assets/*.js, /assets/*.css): Cache-First
// - Images, icons, manifests: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept blob:/data: URLs, audio/video media elements, byte-range requests, or Vite dev modules
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    request.headers.has('range') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // Skip browser extensions and cross-origin non-CDN requests
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.googleapis.com') && !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // 1. Navigation requests (HTML documents)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 2500)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: try to serve cached requested document or cached SPA shell
          const cachedDoc = await caches.match(request);
          if (cachedDoc) return cachedDoc;

          const cachedShell = await caches.match('/index.html');
          if (cachedShell) return cachedShell;

          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response(OFFLINE_PAGE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 2. Hashed static bundles (/assets/*.js, /assets/*.css) -> Cache-First
  const isHashedAsset = url.pathname.startsWith('/assets/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));
  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Static assets, fonts, icons, manifest -> Stale-While-Revalidate
  const isStaticResource =
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.webmanifest');

  if (isStaticResource) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default Network-First for other requests
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
