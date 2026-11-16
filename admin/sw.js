/**
 * Service Worker Aislado App Admin - FidelizaCard (v2.2 PWA Dual)
 * Responsabilidades:
 * - Cacheo independiente dentro del alcance /admin/
 * - Estrategia Cache-First con actualizacion en segundo plano
 * - Limpieza automatica de versiones anteriores de cache administrativa
 * Reglas estrictas: Vanilla JS puro, cero barras verticales, maximo 300 lineas
 */

const ADMIN_CACHE_NAME = 'fideliza-admin-v4';

const ADMIN_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  '../styles/variables.css',
  '../styles/main.css',
  '../styles/admin.css',
  '../styles/features.css',
  '../scripts/config.js',
  '../scripts/admin.js',
  '../scripts/services/storage-service.js',
  '../scripts/components/admin-ops.js',
  '../scripts/components/admin-demo-sim.js',
  '../scripts/utils/dom.js',
  '../scripts/utils/icons.js',
  '../scripts/utils/qr-generator.js',
  '../scripts/utils/theme-applier.js',
  '../assets/icon-192.png',
  '../assets/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(ADMIN_CACHE_NAME).then(function (cache) {
      return cache.addAll(ADMIN_ASSETS);
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
          if (cacheName.indexOf('fideliza-admin-') === 0) {
            if (cacheName !== ADMIN_CACHE_NAME) {
              return caches.delete(cacheName);
            }
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
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        fetch(event.request).then(function (networkResponse) {
          if (networkResponse) {
            if (networkResponse.status === 200) {
              caches.open(ADMIN_CACHE_NAME).then(function (cache) {
                cache.put(event.request, networkResponse);
              });
            }
          }
        }).catch(function () {
          // Modo sin conexion activo
        });
        return cachedResponse;
      }

      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse) {
          return networkResponse;
        }
        if (networkResponse.status !== 200) {
          return networkResponse;
        }
        if (networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(ADMIN_CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function () {
        const acceptHeader = event.request.headers.get('accept');
        if (acceptHeader) {
          if (acceptHeader.indexOf('text/html') !== -1) {
            return caches.match('./index.html');
          }
        }
      });
    })
  );
});
