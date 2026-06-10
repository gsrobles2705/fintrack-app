const CACHE_NAME = 'fintrack-v2';
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
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

// NUEVA MEJORA 8: Notificación push local diaria a las 20:00
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