var CACHE_NAME = 'ipra-ariri-v6';
var STATIC_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/config.js',
  '/js/sync.js',
  '/js/resize.js',
  '/js/app.js',
  '/js/pages/splash.js',
  '/js/pages/info.js',
  '/js/pages/day-detail.js',
  '/js/pages/forms.js',
  '/js/pages/form-new.js',
  '/js/pages/diary.js',
  '/js/pages/post-new.js',
  '/js/pages/menu.js',
  '/js/pages/accounts.js',
  '/js/pages/receipt-new.js',
  '/js/pages/team.js',
  '/js/pages/volunteer-profile.js',
  '/assets/logo.png',
  '/manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (c) { return c.addAll(STATIC_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // POST requests: always network (forms, sync, etc)
  if (e.request.method !== 'GET') {
    e.respondWith(
      fetch(e.request).catch(function () {
        return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // API GET: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var clone = r.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
        return r;
      }).catch(function () {
        return caches.match(e.request).then(function (c) {
          return c || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  // Uploads: network first, cache fallback
  if (url.pathname.startsWith('/uploads/')) {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var clone = r.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
        return r;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  // Static: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (r) {
        if (r.ok) { var clone = r.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); }); }
        return r;
      });
    }).catch(function () {
      if (e.request.mode === 'navigate') return caches.match('/index.html');
    })
  );
});
