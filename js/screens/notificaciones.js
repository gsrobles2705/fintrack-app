// notificaciones.js

// ─────────────────────────────────────────────
// ENUM: notification types
// ─────────────────────────────────────────────
const NOTIF_TIPO = Object.freeze({
  SUCCESS: 'success',
  DANGER:  'danger',
  WARNING: 'warning',
  SUPPORT: 'support',
  SYSTEM:  'system'
});

// ─────────────────────────────────────────────
// Visual config per type
// ─────────────────────────────────────────────
const NOTIF_CONFIG = {
  success: {
    color: '#50C878',
    bg: 'rgba(80, 200, 120, 0.1)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>`
  },
  danger: {
    color: '#F05454',
    bg: 'rgba(240, 84, 84, 0.1)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0"/><path d="M12 16h.01"/></svg>`
  },
  warning: {
    color: '#FFB03A',
    bg: 'rgba(255, 176, 58, 0.1)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M11 15h1"/><path d="M12 15v3"/></svg>`
  },
  support: {
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.1)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10"/><path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2"/></svg>`
  },
  system: {
    color: '#9E9E9E',
    bg: 'rgba(158, 158, 158, 0.1)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/></svg>`
  }
};

// ─────────────────────────────────────────────
// CORE: data and persistence
// ─────────────────────────────────────────────

/**
 * @typedef {Object} NotificationItem
 * @property {string}  id
 * @property {string}  tipo
 * @property {string}  titulo
 * @property {string}  mensaje
 * @property {string}  isoDate  - ISO 8601 of the actual event moment
 * @property {boolean} leido
 */

function agregarNotificacion(tipo, titulo, mensaje, dateOverride = null) {
  const notification = {
    id:      `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    titulo,
    mensaje,
    // dateOverride allows inserting retroactive notifications with
    // the correct past date (case: "missed days")
    isoDate: dateOverride ?? new Date().toISOString(),
    leido:   false
  };

  const list = Storage.getNotifications();
  list.unshift(notification);
  Storage.saveNotifications(list);

  // Update badge synchronously and immediately
  updateNotificationBadge();

  // Native push notification (non-blocking)
  _sendNativePush(titulo, mensaje);

  return notification;
}

function marcarComoLeida(id) {
  const list = Storage.getNotifications();
  const idx  = list.findIndex(n => n.id === id);
  if (idx !== -1) {
    list[idx].leido = true;
    Storage.saveNotifications(list);
    updateNotificationBadge();
  }
}

function marcarTodasLeidas() {
  const list = Storage.getNotifications().map(n => ({ ...n, leido: true }));
  Storage.saveNotifications(list);
  updateNotificationBadge();
}

function eliminarNotificacion(id) {
  const list = Storage.getNotifications().filter(n => n.id !== id);
  Storage.saveNotifications(list);
  updateNotificationBadge();
}

function countUnread() {
  return Storage.getNotifications().filter(n => !n.leido).length;
}

// ─────────────────────────────────────────────
// TIMESTAMP: same logic as actividad.js
// ─────────────────────────────────────────────

/**
 * Formats the elapsed time since isoDate until now.
 * Uses the same reference logic as formatDate() in home.js:
 *   - < 2 min  → "Ahora"
 *   - < 60 min → "Hace Xm"
 *   - < 24 h   → "Hace Xh"
 *   - yesterday → "Ayer"
 *   - rest     → "12 may" (same es-PE locale as actividad)
 *
 * The "today" / "yesterday" comparison is done against local midnight,
 * same as in formatDate(), to avoid timezone offsets.
 */
function formatNotificationTime(isoDate) {
  const date   = new Date(isoDate);
  const now    = new Date();
  const diffMs = now - date;

  // Less than one minute fifty-nine seconds → "Ahora"
  if (diffMs < 120000)  return 'Ahora';

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `Hace ${diffMin}m`;

  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 24)   return `Hace ${diffH}h`;

  // Compare dates at local midnight (same as formatDate in home.js)
  const today  = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dateDay = new Date(date);
  dateDay.setHours(0, 0, 0, 0);

  if (dateDay.getTime() === today.getTime())     return 'Hoy';
  if (dateDay.getTime() === yesterday.getTime()) return 'Ayer';

  // More than 2 days: short format identical to actividad
  return date.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short'
  });
}

// ─────────────────────────────────────────────
// NATIVE PUSH NOTIFICATIONS (Web Notifications API)
// ─────────────────────────────────────────────

/**
 * Requests permission the first time and caches it.
 * Returns true if permission is granted.
 */
async function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted')  return true;
  if (Notification.permission === 'denied')   return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Sends a native push notification if permission is granted.
 * Does not fire if the app is in the foreground AND the document is visible,
 * to avoid duplicating in-app visual feedback.
 */
async function _sendNativePush(title, message) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // If the user has the app open and visible, don't duplicate
  if (document.visibilityState === 'visible') return;

  try {
    new Notification(`FinTrack · ${title}`, {
      body:  message,
      icon:  '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag:   `fintrack-${Date.now()}` // prevents collapsing distinct notifications
    });
  } catch (_) {
    // Silent failure: the environment may not support the constructor
  }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderNotificaciones() {
  marcarTodasLeidas();

  const list      = Storage.getNotifications();
  const container = document.getElementById('notificaciones-lista');

  const now       = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="notif-empty">
        <div class="notif-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16
                    a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/>
            <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
            <path d="M21 21l-18 -18"/>
          </svg>
        </div>
        <p class="notif-empty-title">Todo al día</p>
        <p class="notif-empty-subtitle">
          No tienes notificaciones pendientes.<br>
          Te avisaremos aquí cuando algo requiera tu atención.
        </p>
      </div>`;
    return;
  }

  const todayItems  = list.filter(n => new Date(n.isoDate) >= startOfDay);
  const olderItems  = list.filter(n => new Date(n.isoDate) <  startOfDay);

  let html = '';
  if (todayItems.length  > 0) html += `<p class="notif-seccion-label">HOY</p>`   + todayItems.map(renderNotifCard).join('');
  if (olderItems.length  > 0) html += `<p class="notif-seccion-label">ANTES</p>` + olderItems.map(renderNotifCard).join('');

  container.innerHTML = html;
}

function renderNotifCard(notif) {
  const cfg  = NOTIF_CONFIG[notif.tipo] || NOTIF_CONFIG.system;
  const time = formatNotificationTime(notif.isoDate);

  return `
    <div class="notif-card ${notif.leido ? '' : 'unread'}"
         style="border-left-color: ${cfg.color}">
      <div class="notif-icon-wrap"
           style="background: ${cfg.bg}; color: ${cfg.color}">
        <span style="display:flex">
          ${cfg.icon.replace('stroke="currentColor"', `stroke="${cfg.color}"`)}
        </span>
      </div>
      <div class="notif-body">
        <div class="notif-header-row">
          <p class="notif-title">${notif.titulo}</p>
          <span class="notif-tiempo">${time}</span>
        </div>
        <p class="notif-message">${notif.mensaje}</p>
      </div>
    </div>`;
}