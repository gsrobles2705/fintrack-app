// ui.js — Global visual utilities + Haptics system

const ICON_BELL_NORMAL = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/>
  <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
</svg>`;

const ICON_BELL_RINGING = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/>
  <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
  <path d="M21 6.727a11.05 11.05 0 0 0 -2.794 -3.727"/>
  <path d="M3 6.727a11.05 11.05 0 0 1 2.792 -3.727"/>
</svg>`;

// ─────────────────────────────────────────────────────────────────
// HAPTICS — Patrones de vibración para distintas acciones
// ─────────────────────────────────────────────────────────────────
const Haptics = {
  light:   () => navigator.vibrate && navigator.vibrate(30),
  medium:  () => navigator.vibrate && navigator.vibrate(50),
  success: () => navigator.vibrate && navigator.vibrate([40, 30, 80]),
  error:   () => navigator.vibrate && navigator.vibrate([80, 40, 80, 40, 80]),
  payment: () => navigator.vibrate && navigator.vibrate([60, 50, 120, 50, 60]),
  warning: () => navigator.vibrate && navigator.vibrate([80, 60, 80]),
};

// Función global de vibración que usa Haptics según el patrón
window.vibrate = function(pattern, type = 'light') {
  if (!navigator.vibrate) return;
  if (typeof pattern === 'number') {
    if (pattern === 30) Haptics.light();
    else if (pattern === 50) Haptics.medium();
    else if (pattern === 80) Haptics.warning();
    else navigator.vibrate(pattern);
  } else if (Array.isArray(pattern)) {
    navigator.vibrate(pattern);
  } else {
    Haptics.light();
  }
};

// Exponer Haptics globalmente
window.Haptics = Haptics;

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION BADGE (sin cambios, solo por completitud)
// ─────────────────────────────────────────────────────────────────
function updateNotificationBadge() {
  const unreadCount  = window.countUnread ? window.countUnread() : 0;
  const useRinging   = unreadCount > 0;

  document.querySelectorAll('.header-icon').forEach(el => {
    let svgWrap = el.querySelector('.notif-bell-svg');
    if (!svgWrap) {
      svgWrap = document.createElement('span');
      svgWrap.className = 'notif-bell-svg';
      el.appendChild(svgWrap);
    }
    svgWrap.innerHTML = useRinging ? ICON_BELL_RINGING : ICON_BELL_NORMAL;

    let badge = el.querySelector('.notif-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notif-badge';
      el.appendChild(badge);
    }
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}
window.updateNotificationBadge = updateNotificationBadge;
const actualizarBadgeNotificaciones = updateNotificationBadge;

window.addEventListener('storage', e => {
  if (e.key === 'fintrack_notifications') updateNotificationBadge();
});
document.addEventListener('DOMContentLoaded', updateNotificationBadge);

// ─────────────────────────────────────────────────────────────────
// CLOSE MODAL con animación
// ─────────────────────────────────────────────────────────────────
function closeModal(id, callback) {
  const overlay = typeof id === 'string' ? document.getElementById(id) : id;
  if (!overlay) { if (callback) callback(); return; }
  if (overlay.classList.contains('closing')) return;
  overlay.classList.add('closing');
  overlay.addEventListener('animationend', function handler() {
    overlay.removeEventListener('animationend', handler);
    overlay.classList.remove('closing');
    overlay.style.display = 'none';
    if (callback) callback();
  }, { once: true });
}
window.closeModal = closeModal;