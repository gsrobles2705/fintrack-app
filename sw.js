const CACHE = 'fintrack-v1';
const ARCHIVOS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/css/screens.css',
  '/css/toast.css',
  '/js/icons.js',
  '/js/config.js',
  '/js/storage.js',
  '/js/router.js',
  '/js/toast.js',
  '/js/ui.js',
  '/js/app.js',
  '/js/feedback.js',
  '/js/screens/splash.js',
  '/js/screens/onboarding.js',
  '/js/screens/home.js',
  '/js/screens/registro.js',
  '/js/screens/deudas.js',
  '/js/screens/actividad.js',
  '/js/screens/perfil.js',
  '/js/screens/notificaciones.js'
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