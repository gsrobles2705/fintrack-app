// app.js

const APP_VERSION = '1.2.0';

// ─── Version notification (sin emojis) ─────────────────────────
function checkVersionNotification() {
  const flagKey = `fintrack_version_notif_${APP_VERSION}`;
  if (localStorage.getItem(flagKey)) return;

  agregarNotificacion(
    NOTIF_TIPO.SYSTEM,
    `Novedades de la versión ${APP_VERSION}`,
    'Notificaciones persistentes, edición de transacciones, deudas separadas por tipo, racha de días y más.'
  );
  localStorage.setItem(flagKey, '1');
}

// ─── Utility: normalise a date to local midnight ──────────────────
function _midnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

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

const ADVANCE_WARNING_DAYS  = 2;
const KEY_LAST_OPEN         = 'fintrack_ultima_apertura';

function checkDueDateDebts() {
  const debts = Storage.getDebts();
  const user  = Storage.getUser();
  if (!user || debts.length === 0) return;
  const symbol  = user.symbol;
  const today   = _midnight(new Date());
  const lastOpenStr = localStorage.getItem(KEY_LAST_OPEN);
  const from        = lastOpenStr ? _midnight(new Date(lastOpenStr)) : today;
  const daysToEvaluate = _dayRange(from, today);

  debts.filter(d => !d.paid).forEach(d => {
    const dueDay = _midnight(new Date(d.dueDate));
    daysToEvaluate.forEach(day => {
      const diffDays = Math.round((dueDay - day) / 86400000);
      const dayStr   = day.toISOString().split('T')[0];
      if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays);
        const flagKey = `fintrack_vencida_${d.id}_${dayStr}`;
        if (localStorage.getItem(flagKey)) return;
        const notifDate = new Date(day);
        notifDate.setHours(8, 0, 0, 0);
        agregarNotificacion(
          NOTIF_TIPO.DANGER,
          'Deuda vencida',
          `Tu deuda con ${d.person} venció hace ${overdueDays === 1 ? '1 día' : `${overdueDays} días`} (${symbol}${d.amount.toFixed(2)}). Sigue pendiente.`,
          notifDate.toISOString()
        );
        localStorage.setItem(flagKey, '1');
        return;
      }
      if (diffDays > ADVANCE_WARNING_DAYS) return;
      const flagKey = `fintrack_vence_notif_${d.id}_${dayStr}`;
      if (localStorage.getItem(flagKey)) return;
      const daysText = diffDays === 0 ? 'hoy' : diffDays === 1 ? 'en 1 día' : `en ${diffDays} días`;
      const notifDate = new Date(day);
      notifDate.setHours(8, 0, 0, 0);
      agregarNotificacion(
        NOTIF_TIPO.WARNING,
        'Deuda próxima a vencer',
        `Tu deuda con ${d.person} vence ${daysText} (${symbol}${d.amount.toFixed(2)}).`,
        notifDate.toISOString()
      );
      localStorage.setItem(flagKey, '1');
    });
  });
  localStorage.setItem(KEY_LAST_OPEN, today.toISOString());
}

// ─── DOUBLE BACK TO EXIT (NUEVA MEJORA 2) ──────────────────────
let exitTimer = null;
function onBackButton() {
  // Cerrar modal si hay alguno abierto
  const openModals = document.querySelectorAll('.modal-overlay');
  for (let modal of openModals) {
    if (modal.style.display === 'flex') {
      closeModal(modal.id);
      return;
    }
  }
  // Si estamos en una pantalla principal (no subpantalla)
  const activeScreen = document.querySelector('.screen.active');
  const isMainScreen = [SCREENS.HOME, SCREENS.REGISTRO, SCREENS.DEUDAS, SCREENS.ACTIVIDAD].includes(activeScreen?.id);
  if (isMainScreen && !exitTimer) {
    Toast.info('Presiona otra vez para salir', '');
    exitTimer = setTimeout(() => exitTimer = null, 2000);
    return;
  }
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = null;
    // Intento de cerrar la pestaña (funciona en la mayoría de navegadores)
    window.close();
    setTimeout(() => window.location.href = 'about:blank', 100);
  } else {
    window.navigateBack();
  }
}

// ─── Inicialización de racha (NUEVA MEJORA 10) ─────────────────
function initStreak() {
  const today = new Date().toDateString();
  const streak = Storage.getStreak();
  if (streak.lastDate !== today) {
    Storage.updateStreak(false);
  }
}

// ─── INIT ─────────────────────────────────────────────────────
function initApp() {
  navigate(SCREENS.SPLASH);
  setTimeout(async () => {
    const user = Storage.getUser();
    if (user) {
      await solicitarPermisoNotificaciones();
      checkVersionNotification();
      checkDueDateDebts();
      window.ensureCategoriesInitialized();
      Storage.migrateTransactions();
      initStreak();                     // NUEVO
      navigate(SCREENS.HOME);
    } else {
      navigate(SCREENS.ONBOARDING);
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);

// Sobrescribir popstate para manejar back button
window.addEventListener('popstate', (event) => {
  onBackButton();
  event.preventDefault();
});

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