/* GastoLibre · funciona sin internet.
   Red primero (para recibir mejoras) y caché como red de seguridad. */
const CACHE = 'gastolibre-v10';
const ARCHIVOS = [
  './', './index.html', './manifest.json',
  './css/style.css',
  './js/dominio.js', './js/almacen.js', './js/estado.js', './js/interfaz.js',
  './js/exportar.js', './js/archivo.js', './js/app.js',
  './js/vistas/anotar.js', './js/vistas/resumen.js', './js/vistas/ajustes.js', './js/vistas/bienvenida.js',
  './icon-192.png', './icon-512.png', './maskable-192.png', './maskable-512.png', './apple-touch-180.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // pedir cada archivo saltando la caché HTTP: si no, una versión nueva
      // del service worker puede guardar archivos viejos y el bug persiste
      .then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
