/* Service worker Jimpitan Ronda — agar aplikasi tetap jalan tanpa internet.
   Strategi: cache-first untuk semua berkas aplikasi (semuanya statis & offline). */

var CACHE = 'jimpitan-v1.7.0';
var ASET = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './lib/html5-qrcode.min.js',
  './lib/qrcode-gen.min.js',
  './ikon/apple-touch-icon.png',
  './ikon/ikon-192.png',
  './ikon/ikon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASET); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nama) {
      return Promise.all(nama.map(function (n) {
        return n === CACHE ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  /* laporan warga harus selalu segar — jangan pernah disimpan di cache */
  if (u.pathname.indexOf('/data/') >= 0 || u.pathname.indexOf('/warga/') >= 0) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var salin = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, salin); });
        }
        return res;
      }).catch(function () {
        /* offline & belum pernah di-cache → kembalikan halaman utama */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
