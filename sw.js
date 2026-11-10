/**
 * Service Worker Local-First - FidelizaCard (Fase 1 Llave en Mano)
 * Responsabilidades:
 * - Cacheo de archivos estáticos para funcionamiento sin conexión
 * - Estrategia Cache-First con recarga de red en segundo plano
 * - Limpieza de cachés antiguas al actualizar versiones
 * Reglas estrictas: Vanilla JS puro, cero barras verticales, máximo 300 líneas
 */

const CACHE_NAME = 'fideliza-card-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './styles/variables.css',
  './styles/main.css',
  './styles/card.css',
  './styles/modals.css',
  './styles/admin.css',
  './scripts/config.js',
  './scripts/app.js',
  './scripts/admin.js',
  './scripts/services/storage-service.js',
  './scripts/components/customer-form.js',
  './scripts/components/loyalty-card.js',
  './scripts/utils/dom.js',
  './scripts/utils/qr-generator.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Evitar interceptar llamadas externas como WhatsApp o Google Maps
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        // Retornar caché y actualizar recurso en segundo plano
        fetch(event.request).then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(function () {
          // Sin conexión a red, se mantiene la respuesta de caché
        });
        return cachedResponse;
      }

      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function () {
        // Retorno de fallback al index si se pierde la conexión
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
