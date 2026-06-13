// router.js — History API + Modal Stack for Android Back / iOS swipe-back

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

// ─── Screen navigation stack ─────────────────────────────────────
// Tracks the history of screens navigated so back knows where to go
let _screenStack = [SCREENS.HOME];
let _lastMainScreen = SCREENS.HOME;

// ─── Exit toast timer ─────────────────────────────────────────────
let _exitTimer = null;
const EXIT_TIMEOUT = 2500;

// ─────────────────────────────────────────────────────────────────
// VISUAL CORE
// ─────────────────────────────────────────────────────────────────
function _navigateInternal(screenId, direction = null) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'slide-in-left', 'slide-in-right');
  });
  const target = document.getElementById(screenId);
  if (target) {
    if (direction === 'left')  target.classList.add('slide-in-left');
    if (direction === 'right') target.classList.add('slide-in-right');
    target.classList.add('active');
  }

  if (!SUB_SCREENS.has(screenId) && !NO_NAV_SCREENS.has(screenId)) {
    _lastMainScreen = screenId;
  }

  document.body.classList.toggle('no-bottom-nav', NO_NAV_SCREENS.has(screenId));

  document.querySelectorAll('.bottom-nav').forEach(nav => {
    nav.querySelectorAll('.nav-item').forEach((item, i) => {
      item.classList.toggle('active', i === NAV_INDEX[screenId]);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// navigate(screenId)
// Pushes to the screen stack AND to the browser history.
// ─────────────────────────────────────────────────────────────────
function navigate(screenId, direction = null) {
  _navigateInternal(screenId, direction);

  if (NO_NAV_SCREENS.has(screenId)) {
    history.replaceState({ screenId, stackLen: 0 }, '', location.pathname);
    _screenStack = [];
  } else {
    // Avoid duplicate consecutive entries
    if (_screenStack[_screenStack.length - 1] !== screenId) {
      _screenStack.push(screenId);
    }
    history.pushState({ screenId, stackLen: _screenStack.length }, '', location.pathname);
  }
}

function navigateBack() {
  _goBackOneScreen();
}

// ─────────────────────────────────────────────────────────────────
// BACK LOGIC — shared by popstate and hardware back button
// Priority: 1) open modal  2) screen stack  3) exit prompt
// ─────────────────────────────────────────────────────────────────
function _handleBack() {
  // 1. Close topmost open modal
  const openModal = _getTopModal();
  if (openModal) {
    closeModal(openModal.id);
    // Push a new state so the next back press is handled here again
    history.pushState({ screenId: _screenStack[_screenStack.length - 1], stackLen: _screenStack.length }, '', location.pathname);
    return;
  }

  // 2. Navigate back in the screen stack
  _goBackOneScreen();
}

function _getTopModal() {
  // Return the last open modal (stacked order = DOM order)
  const all = [...document.querySelectorAll('.modal-overlay')];
  // Reverse so we get the topmost (last opened) first
  return all.reverse().find(m => m.style.display === 'flex');
}

function _goBackOneScreen() {
  // Pop current screen from stack
  if (_screenStack.length > 1) {
    _screenStack.pop();
    const prev = _screenStack[_screenStack.length - 1];
    window.navigate(prev);
    return;
  }

  // Stack has only one entry (a main tab) — show exit prompt
  _promptExit();
}

function _promptExit() {
  if (_exitTimer) {
    // Second press within window → exit
    clearTimeout(_exitTimer);
    _exitTimer = null;
    window.close();
    setTimeout(() => { window.location.href = 'about:blank'; }, 100);
    return;
  }
  Toast.info('Presiona otra vez para salir', '');
  _exitTimer = setTimeout(() => { _exitTimer = null; }, EXIT_TIMEOUT);
  // Push a dummy state so the next back press fires popstate again
  history.pushState({ screenId: _screenStack[_screenStack.length - 1], stackLen: _screenStack.length }, '', location.pathname);
}

// ─────────────────────────────────────────────────────────────────
// POPSTATE — fires on Android back, iOS swipe-back, browser back
// ─────────────────────────────────────────────────────────────────
window.addEventListener('popstate', (event) => {
  _handleBack();
});

// ─────────────────────────────────────────────────────────────────
// SWIPE NAVIGATION — horizontal swipe between main tabs
// ─────────────────────────────────────────────────────────────────
const MAIN_TAB_ORDER = [
  SCREENS.HOME,
  SCREENS.REGISTRO,
  SCREENS.DEUDAS,
  SCREENS.ACTIVIDAD
];

const SWIPE_THRESHOLD = 50;
const SWIPE_RATIO     = 1.3;

let _touchStartX = 0;
let _touchStartY = 0;
let _touchLocked = false;

function _isModalOpen() {
  return [...document.querySelectorAll('.modal-overlay')].some(
    el => el.style.display !== 'none' && el.style.display !== ''
  );
}

function _isHorizontalScrollable(el) {
  while (el && el !== document.body) {
    const style    = window.getComputedStyle(el);
    const overflow = style.overflowX;
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollWidth > el.clientWidth) {
      return true;
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

// Nueva función para saber si el toque empezó en header, notificación o toast
function _isTouchOnHeaderOrToast(target) {
  let el = target;
  while (el && el !== document.body) {
    if (el.classList && (
      el.classList.contains('header') ||
      el.classList.contains('subscreen-header') ||
      el.classList.contains('toast') ||
      el.classList.contains('notif-card') ||
      el.id === 'toast-container' ||
      el.classList.contains('modal-overlay')
    )) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function _initSwipeNavigation() {
  document.addEventListener('touchstart', (e) => {
    _touchLocked = false;
    if (_currentTabIndex() === -1) return;
    if (_isModalOpen()) { _touchLocked = true; return; }
    if (_isHorizontalScrollable(e.target)) { _touchLocked = true; return; }
    // Si el toque empezó en header o en una notificación, bloquear swipe
    if (_isTouchOnHeaderOrToast(e.target)) { _touchLocked = true; return; }
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (_touchLocked) return;
    if (_currentTabIndex() === -1) return;
    const dx = e.touches[0].clientX - _touchStartX;
    const dy = e.touches[0].clientY - _touchStartY;
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_RATIO) { _touchLocked = true; return; }
    if (Math.abs(dx) > 8) e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (_touchLocked) return;
    const idx = _currentTabIndex();
    if (idx === -1) return;
    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = e.changedTouches[0].clientY - _touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
    if (dx < 0) {
      const next = MAIN_TAB_ORDER[idx + 1];
      if (next) window.navigate(next, 'left');
    } else {
      const prev = MAIN_TAB_ORDER[idx - 1];
      if (prev) window.navigate(prev, 'right');
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', _initSwipeNavigation);

function getCurrentScreen() {
  return document.querySelector('.screen.active')?.id;
}
window.getCurrentScreen = getCurrentScreen;

function closeTopModal() {
  const modal = _getTopModal();
  if (modal) closeModal(modal.id);
}
window.closeTopModal = closeTopModal;