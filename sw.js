const CACHE_NAME = 'fintrack-v3'; // ← versión incrementada
const ASSETS = [
  '/fintrack-app/',
  '/fintrack-app/index.html',
  '/fintrack-app/css/main.css',
  '/fintrack-app/css/components.css',
  '/fintrack-app/css/screens.css',
  '/fintrack-app/css/toast.css',
  '/fintrack-app/js/icons.js',
  '/fintrack-app/js/config.js',
  '/fintrack-app/js/storage.js',
  '/fintrack-app/js/router.js',
  '/fintrack-app/js/toast.js',
  '/fintrack-app/js/ui.js',
  '/fintrack-app/js/app.js',
  '/fintrack-app/js/feedback.js',
  '/fintrack-app/js/categorias.js',
  '/fintrack-app/js/screens/onboarding.js',
  '/fintrack-app/js/screens/home.js',
  '/fintrack-app/js/screens/registro.js',
  '/fintrack-app/js/screens/deudas.js',
  '/fintrack-app/js/screens/actividad.js',
  '/fintrack-app/js/screens/perfil.js',
  '/fintrack-app/js/screens/notificaciones.js',
  '/fintrack-app/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Activar nueva versión inmediatamente
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', e => {
  // Para index.html siempre priorizar red (evita versión cacheada antigua)
  if (e.request.url.includes('/index.html') || e.request.url === '/fintrack-app/') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Para el resto: network first, luego cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Notificación diaria (sin cambios)
function scheduleDailyNotification() {
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  let delay = target - now;
  if (delay < 0) delay += 86400000;
  setTimeout(() => {
    self.registration.showNotification('FinTrack', {
      body: '¡No olvides registrar tus gastos de hoy para mantener tu racha!',
      icon: '/fintrack-app/icons/icon-192.png',
      badge: '/fintrack-app/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'daily-reminder'
    });
    scheduleDailyNotification();
  }, delay);
}
scheduleDailyNotification();