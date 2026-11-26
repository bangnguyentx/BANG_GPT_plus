const CACHE_NAME = 'apiai-v50-shell-v1';
const ASSETS = ['./', './index.html', './app.css', './app.js', './office-studio.js', './skills-pack.js', './v36-pro.js', './v37-engine.js', './v38-engine.js', './v50-centrix.js', './logo.png', './logo-mark.png', './manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
