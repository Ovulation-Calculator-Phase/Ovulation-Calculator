const CACHE = 'oc-v4';
const PRECACHE = ['/', '/css/styles.css', '/js/app.js', '/js/theme-init.js', '/js/ovulation-core.js', '/assets/logo.svg', '/assets/favicon.svg', '/assets/icon-192.svg', '/assets/icon-512.svg', '/assets/hero-cycle.svg', '/editorial-policy/', '/terms/', '/offline/'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then(response => response || caches.match('/offline/'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => { const fresh = fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => cached); return cached || fresh; }));
});
