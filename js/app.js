// app.js

const APP_VERSION = '1.1.0';

// ─── Version notification ─────────────────────────────────────────
function checkVersionNotification() {
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

// ─── Utility: normalise a date to local midnight ──────────────────
function _midnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Utility: generate array of days between two dates (inclusive) ─
function _dayRange(from, to) {
  const days   = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = _midnight(to);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────
// RETROSPECTIVE DEBT CHECK
// Covers both days the user did not open the app ("missed days")
// and the daily reminder for already overdue pending debts.
// ─────────────────────────────────────────────────────────────────
const ADVANCE_WARNING_DAYS  = 2;   // days before due date to warn
const KEY_LAST_OPEN         = 'fintrack_ultima_apertura';

function checkDueDateDebts() {
  const debts = Storage.getDebts();
  const user  = Storage.getUser();
  if (!user || debts.length === 0) return;

  const symbol  = user.symbol;
  const today   = _midnight(new Date());

  // Determine the retrospective range: from the last opening until today
  const lastOpenStr = localStorage.getItem(KEY_LAST_OPEN);
  const from        = lastOpenStr
    ? _midnight(new Date(lastOpenStr))
    : today;

  // Generate all days to evaluate (missed days + today)
  const daysToEvaluate = _dayRange(from, today);

  debts
    .filter(d => !d.paid)
    .forEach(d => {
      const dueDay = _midnight(new Date(d.dueDate));

      daysToEvaluate.forEach(day => {
        const diffDays = Math.round((dueDay - day) / 86400000);
        const dayStr   = day.toISOString().split('T')[0];

        // ── Case 1: already overdue → daily reminder ─────────
        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          const flagKey     = `fintrack_vencida_${d.id}_${dayStr}`;
          if (localStorage.getItem(flagKey)) return;

          // Retroactive isoDate: midnight of the evaluated day + 8h
          // so it appears with a natural time in the history
          const notifDate = new Date(day);
          notifDate.setHours(8, 0, 0, 0);

          agregarNotificacion(
            NOTIF_TIPO.DANGER,
            '🔴 Deuda vencida',
            `Tu deuda con ${d.person} venció hace ` +
            `${overdueDays === 1 ? '1 día' : `${overdueDays} días`} ` +
            `(${symbol}${d.amount.toFixed(2)}). Sigue pendiente.`,
            notifDate.toISOString()   // correct retroactive date
          );

          localStorage.setItem(flagKey, '1');
          return;
        }

        // ── Case 2: upcoming debt (within warning margin) ────
        if (diffDays > ADVANCE_WARNING_DAYS) return;

        const flagKey = `fintrack_vence_notif_${d.id}_${dayStr}`;
        if (localStorage.getItem(flagKey)) return;

        const daysText = diffDays === 0
          ? 'hoy'
          : diffDays === 1
            ? 'en 1 día'
            : `en ${diffDays} días`;

        const notifDate = new Date(day);
        notifDate.setHours(8, 0, 0, 0);

        agregarNotificacion(
          NOTIF_TIPO.WARNING,
          '⚠️ Deuda próxima a vencer',
          `Tu deuda con ${d.person} vence ${daysText} ` +
          `(${symbol}${d.amount.toFixed(2)}).`,
          notifDate.toISOString()
        );

        localStorage.setItem(flagKey, '1');
      });
    });

  // Record today's opening date for the next retrospective calculation
  localStorage.setItem(KEY_LAST_OPEN, today.toISOString());
}

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
function initApp() {
  navigate(SCREENS.SPLASH);

  setTimeout(async () => {
    const user = Storage.getUser();

    if (user) {
      // Request push notification permission the first time
      await solicitarPermisoNotificaciones();
      checkVersionNotification();
      checkDueDateDebts();
      window.ensureCategoriesInitialized();
      Storage.migrateTransactions();   // add categoryLabel/Icon to old transactions
      navigate(SCREENS.HOME);
    } else {
      navigate(SCREENS.ONBOARDING);
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);

// ─── Global navigate with reactive badge ─────────────────────────
const _originalNavigate = navigate;
window.navigate = function(screenId) {
  _originalNavigate(screenId);
  updateNotificationBadge();
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