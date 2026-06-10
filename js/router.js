// router.js — History API for the Android Back button and iOS swipe-back

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

const NAV_INDEX = {
  [SCREENS.HOME]:      0,
  [SCREENS.REGISTRO]:  1,
  [SCREENS.DEUDAS]:    2,
  [SCREENS.ACTIVIDAD]: 3
};

const SUB_SCREENS = new Set([
  SCREENS.PERFIL,
  SCREENS.EDITAR_PERFIL,
  SCREENS.NOTIFICACIONES,
  SCREENS.FEEDBACK
]);

const NO_NAV_SCREENS = new Set([
  SCREENS.SPLASH,
  SCREENS.ONBOARDING
]);

let _lastMainScreen = SCREENS.HOME;

// ─────────────────────────────────────────────────────────────────
// VISUAL CORE
// Shows/hides screens and updates the nav.
// Does NOT call pushState — navigate() handles that separately.
// This allows popstate to call this without creating an infinite loop.
// ─────────────────────────────────────────────────────────────────
function _navigateInternal(screenId, direction = null) {
  // Remove active from all screens; apply directional slide class to the incoming one
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'slide-in-left', 'slide-in-right');
  });
  const target = document.getElementById(screenId);
  if (target) {
    if (direction === 'left')  target.classList.add('slide-in-left');
    if (direction === 'right') target.classList.add('slide-in-right');
    target.classList.add('active');
  }

  // Track the last main tab
  if (!SUB_SCREENS.has(screenId) && !NO_NAV_SCREENS.has(screenId)) {
    _lastMainScreen = screenId;
  }

  // Hide nav on splash/onboarding
  document.body.classList.toggle(
    'no-bottom-nav',
    NO_NAV_SCREENS.has(screenId)
  );

  // Update active nav item
  document.querySelectorAll('.bottom-nav').forEach(nav => {
    nav.querySelectorAll('.nav-item').forEach((item, i) => {
      item.classList.toggle('active', i === NAV_INDEX[screenId]);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// navigate(screenId)
// Public entry point. Updates DOM + pushes to history.
// app.js overrides window.navigate to add render calls.
// ─────────────────────────────────────────────────────────────────
function navigate(screenId, direction = null) {
  _navigateInternal(screenId, direction);

  // Splash and Onboarding use replaceState so they don't remain in history
  if (NO_NAV_SCREENS.has(screenId)) {
    history.replaceState({ screenId }, '', location.pathname);
  } else {
    history.pushState({ screenId }, '', location.pathname);
  }
}

function navigateBack() {
  navigate(_lastMainScreen);
}

// ─────────────────────────────────────────────────────────────────
// INTERCEPT BACK BUTTON (Android) and SWIPE-BACK (iOS Safari)
//
// FIX: previously the listener manipulated the DOM directly, which
// showed the correct screen but did NOT execute renders
// (renderHome, renderDebts, etc.), leaving stale data.
//
// Now we call window.navigate() which in app.js is wrapped
// to also execute the corresponding renders.
// The only caveat: window.navigate() calls pushState, but here
// we come from a popstate (the browser already went back in
// history), so the extra push creates a new entry that
// "compensates" the pop — the user can keep pressing Back
// without getting stuck in a loop.
// ─────────────────────────────────────────────────────────────────
window.addEventListener('popstate', (event) => {
  const screenId = event.state?.screenId;

  // No state or loading screen → go to Home
  if (!screenId || NO_NAV_SCREENS.has(screenId)) {
    window.navigate(SCREENS.HOME);
    return;
  }

  // Call window.navigate so that renders defined in app.js
  // are executed in addition to the visual change
  window.navigate(screenId);
});
// ─────────────────────────────────────────────────────────────────
// SWIPE NAVIGATION — horizontal swipe between main tabs
//
// Rules:
//   · Only active on the 4 main tabs (HOME, REGISTRO, DEUDAS, ACTIVIDAD)
//   · Swipe left  → next tab  (higher index)
//   · Swipe right → prev tab  (lower index)
//   · Gesture is ignored when:
//       - A modal overlay is open (display !== 'none')
//       - The touch starts inside a horizontally-scrollable element
//       - The vertical component exceeds the horizontal (normal scroll)
//   · Minimum horizontal distance: 50px
//   · Horizontal/vertical ratio must be > 1.3 to avoid accidental triggers
// ─────────────────────────────────────────────────────────────────

const MAIN_TAB_ORDER = [
  SCREENS.HOME,
  SCREENS.REGISTRO,
  SCREENS.DEUDAS,
  SCREENS.ACTIVIDAD
];

const SWIPE_THRESHOLD   = 50;   // min px to count as a swipe
const SWIPE_RATIO       = 1.3;  // horizontal must be this times greater than vertical

let _touchStartX = 0;
let _touchStartY = 0;
let _touchLocked = false;       // true when gesture is determined to be vertical

function _isModalOpen() {
  return [...document.querySelectorAll('.modal-overlay')].some(
    el => el.style.display !== 'none' && el.style.display !== ''
  );
}

function _isHorizontalScrollable(el) {
  while (el && el !== document.body) {
    const style    = window.getComputedStyle(el);
    const overflow = style.overflowX;
    if ((overflow === 'auto' || overflow === 'scroll')) {
      // Solo si realmente hay contenido desbordado horizontalmente
      if (el.scrollWidth > el.clientWidth) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

function _currentTabIndex() {
  return MAIN_TAB_ORDER.findIndex(id => {
    const el = document.getElementById(id);
    return el && el.classList.contains('active');
  });
}

function _initSwipeNavigation() {
  document.addEventListener('touchstart', (e) => {
    _touchLocked = false;

    // Only act on main tabs
    if (_currentTabIndex() === -1) return;

    // Ignore if a modal is open
    if (_isModalOpen()) { _touchLocked = true; return; }

    // Ignore if touch starts inside a horizontal-scroll container
    if (_isHorizontalScrollable(e.target)) { _touchLocked = true; return; }

    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (_touchLocked) return;
    if (_currentTabIndex() === -1) return;

    const dx = e.touches[0].clientX - _touchStartX;
    const dy = e.touches[0].clientY - _touchStartY;

    // If vertical movement dominates early, lock out swipe for this gesture
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_RATIO) {
      _touchLocked = true;
      return;
    }

    // Horizontal gesture confirmed — block native scroll/pan
    if (Math.abs(dx) > 8) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (_touchLocked) return;

    const idx = _currentTabIndex();
    if (idx === -1) return;

    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = e.changedTouches[0].clientY - _touchStartY;

    // Must clear the threshold and ratio check
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;

    if (dx < 0) {
      // Swipe left → next tab
      const next = MAIN_TAB_ORDER[idx + 1];
      if (next) window.navigate(next, 'left');
    } else {
      // Swipe right → prev tab
      const prev = MAIN_TAB_ORDER[idx - 1];
      if (prev) window.navigate(prev, 'right');
    }
  }, { passive: true });
}

// Boot after DOM is ready
document.addEventListener('DOMContentLoaded', _initSwipeNavigation);

// NUEVA MEJORA 1: obtener pantalla actual y cerrar modal superior
function getCurrentScreen() {
  return document.querySelector('.screen.active')?.id;
}
window.getCurrentScreen = getCurrentScreen;

function closeTopModal() {
  const modals = document.querySelectorAll('.modal-overlay');
  const openModal = Array.from(modals).find(m => m.style.display === 'flex');
  if (openModal) closeModal(openModal.id);
}
window.closeTopModal = closeTopModal;