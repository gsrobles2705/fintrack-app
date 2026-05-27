// notificaciones.js

// ─────────────────────────────────────────────
// ENUM: tipos de notificación
// ─────────────────────────────────────────────
const NOTIF_TIPO = Object.freeze({
  SUCCESS: 'success',
  DANGER:  'danger',
  WARNING: 'warning',
  SUPPORT: 'support',
  SYSTEM:  'system'
});

// ─────────────────────────────────────────────
// CONFIG visual por tipo
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
// CORE: datos y persistencia
// ─────────────────────────────────────────────

/**
 * @typedef {Object} NotificationItem
 * @property {string}  id
 * @property {string}  tipo
 * @property {string}  titulo
 * @property {string}  mensaje
 * @property {string}  isoDate  - ISO 8601 del momento real del evento
 * @property {boolean} leido
 */

function agregarNotificacion(tipo, titulo, mensaje, fechaOverride = null) {
  const notif = {
    id:      `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    titulo,
    mensaje,
    // fechaOverride permite insertar notificaciones retroactivas con
    // la fecha correcta del pasado (caso "días perdidos")
    isoDate: fechaOverride ?? new Date().toISOString(),
    leido:   false
  };

  const lista = Storage.getNotifications();
  lista.unshift(notif);
  Storage.saveNotifications(lista);

  // Actualiza badge de forma síncrona e inmediata
  actualizarBadgeNotificaciones();

  // Notificación push nativa (no bloqueante)
  _enviarPushNativa(titulo, mensaje);

  return notif;
}

function marcarComoLeida(id) {
  const lista = Storage.getNotifications();
  const idx   = lista.findIndex(n => n.id === id);
  if (idx !== -1) {
    lista[idx].leido = true;
    Storage.saveNotifications(lista);
    actualizarBadgeNotificaciones();
  }
}

function marcarTodasLeidas() {
  const lista = Storage.getNotifications().map(n => ({ ...n, leido: true }));
  Storage.saveNotifications(lista);
  actualizarBadgeNotificaciones();
}

function eliminarNotificacion(id) {
  const lista = Storage.getNotifications().filter(n => n.id !== id);
  Storage.saveNotifications(lista);
  actualizarBadgeNotificaciones();
}

function contarNoLeidas() {
  return Storage.getNotifications().filter(n => !n.leido).length;
}

// ─────────────────────────────────────────────
// TIMESTAMP: misma lógica que actividad.js
// ─────────────────────────────────────────────

/**
 * Formatea el tiempo transcurrido desde isoDate hasta ahora.
 * Usa la misma lógica de referencia que formatDate() en home.js:
 *   - < 2 min  → "Ahora"
 *   - < 60 min → "Hace Xm"
 *   - < 24 h   → "Hace Xh"
 *   - ayer     → "Ayer"
 *   - resto    → "12 may" (mismo locale es-PE que actividad)
 *
 * La comparación de "hoy" / "ayer" se hace contra medianoche local,
 * igual que en formatDate(), para evitar desfases de zona horaria.
 */
function formatearTiempoNotif(isoDate) {
  const fecha  = new Date(isoDate);
  const ahora  = new Date();
  const diffMs = ahora - fecha;

  // Menos de un minuto con cincuenta y nueve segundos → "Ahora"
  if (diffMs < 120000)  return 'Ahora';

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `Hace ${diffMin}m`;

  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 24)   return `Hace ${diffH}h`;

  // Compara fechas en medianoche local (igual que formatDate en home.js)
  const hoy  = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);

  const fechaDia = new Date(fecha);
  fechaDia.setHours(0, 0, 0, 0);

  if (fechaDia.getTime() === hoy.getTime())  return 'Hoy';
  if (fechaDia.getTime() === ayer.getTime()) return 'Ayer';

  // Más de 2 días: formato corto idéntico al de actividad
  return fecha.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short'
  });
}

// ─────────────────────────────────────────────
// NOTIFICACIONES PUSH NATIVAS (Web Notifications API)
// ─────────────────────────────────────────────

/**
 * Solicita permiso la primera vez y lo cachea.
 * Devuelve true si el permiso está concedido.
 */
async function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted')  return true;
  if (Notification.permission === 'denied')   return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Lanza una notificación push nativa si el permiso está concedido.
 * No lanza si la app está en primer plano Y el documento es visible,
 * para no duplicar el feedback visual in-app.
 */
async function _enviarPushNativa(titulo, mensaje) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Si el usuario tiene la app abierta y visible, no duplicar
  if (document.visibilityState === 'visible') return;

  try {
    new Notification(`FinTrack · ${titulo}`, {
      body: mensaje,
      icon: '/icons/icon-192.png',   // ajusta a tu ruta de icono PWA
      badge: '/icons/badge-72.png',  // icono monocromático para Android
      tag:  `fintrack-${Date.now()}` // evita colapsar notificaciones distintas
    });
  } catch (_) {
    // Fallo silencioso: el entorno puede no soportar el constructor
  }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderNotificaciones() {
  marcarTodasLeidas();

  const lista     = Storage.getNotifications();
  const container = document.getElementById('notificaciones-lista');

  const ahora     = new Date();
  const inicioDia = new Date(ahora);
  inicioDia.setHours(0, 0, 0, 0);

  if (lista.length === 0) {
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

  const hoy   = lista.filter(n => new Date(n.isoDate) >= inicioDia);
  const antes = lista.filter(n => new Date(n.isoDate) <  inicioDia);

  let html = '';
  if (hoy.length   > 0) html += `<p class="notif-seccion-label">HOY</p>`   + hoy.map(renderNotifCard).join('');
  if (antes.length > 0) html += `<p class="notif-seccion-label">ANTES</p>` + antes.map(renderNotifCard).join('');

  container.innerHTML = html;
}

function renderNotifCard(notif) {
  const cfg    = NOTIF_CONFIG[notif.tipo] || NOTIF_CONFIG.system;
  const tiempo = formatearTiempoNotif(notif.isoDate);

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
          <span class="notif-tiempo">${tiempo}</span>
        </div>
        <p class="notif-message">${notif.mensaje}</p>
      </div>
    </div>`;
}