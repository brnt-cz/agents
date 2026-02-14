// Minimal service worker for PWA installability
// No caching strategy - this app requires live connection to local Vite dev server

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
