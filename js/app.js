// app.js

const APP_VERSION = '1.1.0';

// ─── Versión ──────────────────────────────────────────────────────
function verificarNotificacionVersion() {
  const flagKey = `fintrack_version_notif_${APP_VERSION}`;
  if (localStorage.getItem(flagKey)) return;

  agregarNotificacion(
    NOTIF_TIPO.SYSTEM,
    `Novedades de la versión ${APP_VERSION}`,
    'Las notificaciones ahora se guardan entre sesiones. ' +
    'También mejoramos el presupuesto diario, el seguimiento ' +
    'de deudas y el historial de actividad.'
  );

  localStorage.setItem(flagKey, '1');
}

// ─── Utilidad: normaliza una fecha a medianoche local ─────────────
function _medianoche(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Utilidad: genera array de días entre dos fechas (inclusive) ──
function _rangosDias(desde, hasta) {
  const dias = [];
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = _medianoche(hasta);

  while (cursor <= fin) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

// ─────────────────────────────────────────────────────────────────
// VERIFICACIÓN RETROSPECTIVA DE DEUDAS
// Cubre tanto los días que el usuario no abrió la app ("días perdidos")
// como el recordatorio diario de deudas ya vencidas y aún pendientes.
// ─────────────────────────────────────────────────────────────────
const DIAS_AVISO_PREVIO    = 2;   // días antes del vencimiento para avisar
const KEY_ULTIMA_APERTURA  = 'fintrack_ultima_apertura';

function verificarDeudasPorVencer() {
  const deudas = Storage.getDeudas();
  const user   = Storage.getUser();
  if (!user || deudas.length === 0) return;

  const symbol = user.symbol;
  const hoy    = _medianoche(new Date());

  // Determina el rango retrospectivo: desde la última apertura hasta hoy
  const ultimaAperturaStr = localStorage.getItem(KEY_ULTIMA_APERTURA);
  const desde = ultimaAperturaStr
    ? _medianoche(new Date(ultimaAperturaStr))
    : hoy;

  // Genera todos los días a evaluar (días perdidos + hoy)
  const diasAEvaluar = _rangosDias(desde, hoy);

  deudas
    .filter(d => !d.paid)
    .forEach(d => {
      const venceDia = _medianoche(new Date(d.dueDate));

      diasAEvaluar.forEach(dia => {
        const diffDias = Math.round((venceDia - dia) / 86400000);
        const diaStr   = dia.toISOString().split('T')[0];

        // ── Caso 1: deuda ya vencida → recordatorio diario ──────
        if (diffDias < 0) {
          const diasVencida = Math.abs(diffDias);
          const flagKey = `fintrack_vencida_${d.id}_${diaStr}`;
          if (localStorage.getItem(flagKey)) return;

          // isoDate retroactivo: medianoche del día evaluado + 8h
          // para que aparezca con hora natural en el historial
          const fechaNotif = new Date(dia);
          fechaNotif.setHours(8, 0, 0, 0);

          agregarNotificacion(
            NOTIF_TIPO.DANGER,
            '🔴 Deuda vencida',
            `Tu deuda con ${d.person} venció hace ` +
            `${diasVencida === 1 ? '1 día' : `${diasVencida} días`} ` +
            `(${symbol}${d.amount.toFixed(2)}). Sigue pendiente.`,
            fechaNotif.toISOString()   // fecha retroactiva correcta
          );

          localStorage.setItem(flagKey, '1');
          return;
        }

        // ── Caso 2: deuda próxima (dentro del margen de aviso) ──
        if (diffDias > DIAS_AVISO_PREVIO) return;

        const flagKey = `fintrack_vence_notif_${d.id}_${diaStr}`;
        if (localStorage.getItem(flagKey)) return;

        const diasTexto = diffDias === 0
          ? 'hoy'
          : diffDias === 1
            ? 'en 1 día'
            : `en ${diffDias} días`;

        const fechaNotif = new Date(dia);
        fechaNotif.setHours(8, 0, 0, 0);

        agregarNotificacion(
          NOTIF_TIPO.WARNING,
          '⚠️ Deuda próxima a vencer',
          `Tu deuda con ${d.person} vence ${diasTexto} ` +
          `(${symbol}${d.amount.toFixed(2)}).`,
          fechaNotif.toISOString()
        );

        localStorage.setItem(flagKey, '1');
      });
    });

  // Registra la fecha de esta apertura para el próximo cálculo retrospectivo
  localStorage.setItem(KEY_ULTIMA_APERTURA, hoy.toISOString());
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
function initApp() {
  navigate(SCREENS.SPLASH);

  setTimeout(async () => {
    const user = Storage.getUser();

    if (user) {
      // Solicita permiso de notificaciones push la primera vez
      await solicitarPermisoNotificaciones();

      verificarNotificacionVersion();
      verificarDeudasPorVencer();
      navigate(SCREENS.HOME);
    } else {
      navigate(SCREENS.ONBOARDING);
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);

// ─── navigate global con badge reactivo ──────────────────────────
const originalNavigate = navigate;
window.navigate = function(screenId) {
  originalNavigate(screenId);
  actualizarBadgeNotificaciones();
  if (screenId === SCREENS.ONBOARDING)     initOnboarding();
  if (screenId === SCREENS.HOME)           renderHome();
  if (screenId === SCREENS.REGISTRO)       initRegistro();
  if (screenId === SCREENS.DEUDAS)         renderDeudas();
  if (screenId === SCREENS.ACTIVIDAD)      renderActividad();
  if (screenId === SCREENS.PERFIL)         renderPerfil();
  if (screenId === SCREENS.EDITAR_PERFIL)  renderEditarPerfil();
  if (screenId === SCREENS.NOTIFICACIONES) renderNotificaciones();
  if (screenId === SCREENS.FEEDBACK)       initFeedback();
};