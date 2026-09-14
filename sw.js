const CACHE_NAME = 'grocery-sorter-dynamic';

// 1. Install event: Cache the initial files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './app.js',
        './manifest.json'
      ]);
    })
  );
  // Force the waiting service worker to become the active one immediately
  self.skipWaiting(); 
});

// 2. Fetch event: Network-First strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // We have internet! Save a copy of the fresh files to the cache for later
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // We are offline! Serve the files from the cache
        return caches.match(event.request);
      })
  );
});
