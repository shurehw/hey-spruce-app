// Service Worker for Spruce App Portal - Minimal Version
// Version 3.0 - Simplified to avoid caching issues with clean URLs

const CACHE_VERSION = 'spruceapp-v3';

// Install event - skip caching for now
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v3...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clear all old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v3...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('Service Worker: Clearing cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('Service Worker: All caches cleared');
        return self.clients.claim();
      })
  );
});

// Fetch event - pass through all requests without caching
self.addEventListener('fetch', (event) => {
  // Simply pass through all requests to the network
  event.respondWith(fetch(event.request));
});

console.log('Service Worker: Loaded (minimal version)');