// ui.js — Utilidades visuales globales

const ICON_BELL_NORMAL = `
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16
             a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/>
    <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
  </svg>`;

const ICON_BELL_RINGING = `
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16
             a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/>
    <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
    <path d="M21 6.727a11.05 11.05 0 0 0 -2.794 -3.727"/>
    <path d="M3 6.727a11.05 11.05 0 0 1 2.792 -3.727"/>
  </svg>`;

/**
 * Actualiza todos los .header-icon con el icono y badge correctos.
 * Se llama de forma síncrona desde cualquier punto de la app.
 */
function actualizarBadgeNotificaciones() {
  const noLeidas   = contarNoLeidas();
  const usarRinging = noLeidas > 0;

  document.querySelectorAll('.header-icon').forEach(el => {
    // ── Icono de campana ──
    let svgWrap = el.querySelector('.notif-bell-svg');
    if (!svgWrap) {
      svgWrap = document.createElement('span');
      svgWrap.className = 'notif-bell-svg';
      el.appendChild(svgWrap);
    }
    svgWrap.innerHTML = usarRinging ? ICON_BELL_RINGING : ICON_BELL_NORMAL;

    // ── Badge numérico ──
    let badge = el.querySelector('.notif-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notif-badge';
      el.appendChild(badge);
    }

    if (noLeidas > 0) {
      badge.textContent    = noLeidas > 9 ? '9+' : String(noLeidas);
      badge.style.display  = 'flex';
    } else {
      badge.style.display  = 'none';
    }
  });
}

// ─── Reactivo ante cambios de localStorage desde otras pestañas ──
// El evento 'storage' solo dispara en pestañas distintas a la que escribe,
// por eso usamos también la llamada directa desde agregarNotificacion().
window.addEventListener('storage', e => {
  if (e.key === 'fintrack_notifications') {
    actualizarBadgeNotificaciones();
  }
});

// Inicializa el badge en el primer render
document.addEventListener('DOMContentLoaded', () => {
  actualizarBadgeNotificaciones();
});