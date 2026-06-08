const CACHE = 'fintrack-v1';
const ARCHIVOS = [
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
  '/fintrack-app/js/screens/splash.js',
  '/fintrack-app/js/screens/onboarding.js',
  '/fintrack-app/js/screens/home.js',
  '/fintrack-app/js/screens/registro.js',
  '/fintrack-app/js/screens/deudas.js',
  '/fintrack-app/js/screens/actividad.js',
  '/fintrack-app/js/screens/perfil.js',
  '/fintrack-app/js/screens/notificaciones.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
