// router.js

const SCREENS = {
  SPLASH:           'screen-splash',
  ONBOARDING:       'screen-onboarding',
  HOME:             'screen-home',
  REGISTRO:         'screen-registro',
  DEUDAS:           'screen-deudas',
  ACTIVIDAD:        'screen-actividad',
  PERFIL:           'screen-perfil',
  EDITAR_PERFIL:    'screen-editar-perfil',
  NOTIFICACIONES:   'screen-notificaciones',
  FEEDBACK:         'screen-feedback'
};

// Pestañas principales del bottom nav (tienen índice)
const NAV_INDEX = {
  [SCREENS.HOME]:      0,
  [SCREENS.REGISTRO]:  1,
  [SCREENS.DEUDAS]:    2,
  [SCREENS.ACTIVIDAD]: 3
};

// Sub-pantallas: tienen su propio header/back.
// FEEDBACK es sub-pantalla pero SÍ incluye bottom-nav en su HTML.
const SUB_SCREENS = new Set([
  SCREENS.PERFIL,
  SCREENS.EDITAR_PERFIL,
  SCREENS.NOTIFICACIONES,
  SCREENS.FEEDBACK           // ← mantiene _lastMainScreen; nav visible vía HTML propio
]);

// Pantallas donde el bottom nav debe estar completamente oculto
const NO_NAV_SCREENS = new Set([
  SCREENS.SPLASH,
  SCREENS.ONBOARDING
]);

let _lastMainScreen = SCREENS.HOME;

function navigate(screenId) {
  document.querySelectorAll('.screen')
    .forEach(s => s.classList.remove('active'));

  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  if (!SUB_SCREENS.has(screenId) &&
      !NO_NAV_SCREENS.has(screenId)) {
    _lastMainScreen = screenId;
  }

  // Muestra u oculta TODOS los bottom-nav del DOM
  const showNav = !NO_NAV_SCREENS.has(screenId);
  document.querySelectorAll('.bottom-nav').forEach(nav => {
    nav.style.display = showNav ? 'flex' : 'none';

    // Actualiza el item activo solo cuando el nav es visible
    if (showNav) {
      nav.querySelectorAll('.nav-item').forEach((item, i) => {
        item.classList.toggle('active', i === NAV_INDEX[screenId]);
      });
    }
  });
}

function navigateBack() {
  navigate(_lastMainScreen);
}