// Change the version below every time you update index.html or other files.
const CACHE = 'rehoteq-classroom-v9';
const SHELL = ['./', './index.html', './join.html', './admin.html', './styles.css',
               './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Only handle our own files and the Firebase code files. Never touch live Firebase data requests.
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !u.href.startsWith('https://www.gstatic.com/firebasejs/')) return;
  // Pages: try the network first so updates show up, fall back to the saved copy offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))));
    return;
  }
  // Everything else: saved copy first, then network (and save it).
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  })));
});
