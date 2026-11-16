/**
 * Service Worker Local-First App Cliente - FidelizaCard (v2.2 PWA Dual)
 * Responsabilidades:
 * - Cacheo de archivos estaticos de la tarjeta Wallet Pass para modo sin conexion
 * - Estrategia Cache-First con actualizacion en segundo plano
 * - Aislamiento de alcance respecto a /admin/ y limpieza selectiva de caches
 * Reglas estrictas: Vanilla JS puro, cero barras verticales, maximo 300 lineas
 */

const CACHE_NAME = 'fideliza-card-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/variables.css',
  './styles/main.css',
  './styles/card.css',
  './styles/modals.css',
  './styles/features.css',
  './scripts/config.js',
  './scripts/app.js',
  './scripts/services/storage-service.js',
  './scripts/components/customer-form.js',
  './scripts/components/loyalty-card.js',
  './scripts/components/redeem-modal.js',
  './scripts/components/redeem-views.js',
  './scripts/components/qr-scanner-modal.js',
  './scripts/components/slide-confirm.js',
  './scripts/components/demo-bar.js',
  './scripts/utils/dom.js',
  './scripts/utils/icons.js',
  './scripts/utils/sound-fx.js',
  './scripts/utils/theme-applier.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
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
          if (cacheName.indexOf('fideliza-card-') === 0) {
            if (cacheName !== CACHE_NAME) {
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

  if (requestUrl.pathname.indexOf('/admin/') !== -1) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        fetch(event.request).then(function (networkResponse) {
          if (networkResponse) {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(function (cache) {
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
        caches.open(CACHE_NAME).then(function (cache) {
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
