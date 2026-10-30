/* =============================================
   VitalTraining — sw.js (service worker de la app instalable)
   - Las pantallas siempre se piden al servidor primero: tras cada despliegue nadie se queda
     con una versión vieja.
   - Si no hay internet al abrir la app, se muestra offline.html en vez del error del navegador.
   - Los datos (/api/...) nunca se guardan en el celular: son personales y tienen que estar al día.
============================================= */
const CACHE = 'vt-offline-v2';
const SIN_CONEXION = ['/offline.html', '/img/logo.svg', '/img/icono-192.png'];

self.addEventListener('install', evento => {
    evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SIN_CONEXION)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', evento => {
    evento.waitUntil(
        caches.keys()
            .then(claves => Promise.all(claves.filter(c => c !== CACHE).map(c => caches.delete(c))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', evento => {
    const { request } = evento;
    if (request.method !== 'GET') return;
    if (request.mode === 'navigate') {
        // Sin la caché HTTP del navegador: si no, sin internet podría devolver el HTML sin sus estilos
        evento.respondWith(fetch(request.url, { cache: 'no-store', credentials: 'same-origin' }).catch(() => caches.match('/offline.html')));
        return;
    }
    // Recursos de la página sin conexión (logo e icono): de la caché si no hay red
    const ruta = new URL(request.url).pathname;
    if (SIN_CONEXION.includes(ruta)) {
        evento.respondWith(fetch(request).catch(() => caches.match(ruta)));
    }
});
