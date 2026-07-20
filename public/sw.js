const CACHE_NAME = 'vainilla-crm-cache-v2';

// Install event: skip waiting immediately to activate fresh worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: clean all old caches completely
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-First for API and Page Navigations, Cache-First only for static media
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. API routes & non-GET requests -> Always Network Only (Never cache API calls)
  if (requestUrl.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return;
  }

  // 2. HTML Page Navigations & Next.js Data -> Always Network First
  if (
    event.request.mode === 'navigate' || 
    event.request.headers.get('accept')?.includes('text/html') ||
    requestUrl.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 3. Static Media Assets (images/icons) -> Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
