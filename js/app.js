// app.js — versión actualizada con mejoras v1.2.0

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

// ─── Inicialización de racha (NUEVA MEJORA 10) ─────────────────
function initStreak() {
  Storage.updateStreak(true); // El primer día de uso = día 1
}


// ─── Banner de instalación PWA con cierre antes de mostrar instrucciones ───
const KEY_INSTALL_NEVER = 'fintrack_install_never';

function _isRunningAsPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function checkInstallBanner() {
  if (_isRunningAsPWA()) return;
  if (localStorage.getItem(KEY_INSTALL_NEVER)) return;

  const overlay = document.createElement('div');
  overlay.id = 'install-banner-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(0,0,0,0.72);
    display:flex;align-items:flex-end;
    z-index:9998;
    backdrop-filter:blur(6px);
    -webkit-backdrop-filter:blur(6px);
    animation:overlay-fade-in .18s ease both;
  `;

  overlay.innerHTML = `
    <div id="install-banner-card" style="
      background:var(--bg-card);
      width:100%;
      border-radius:var(--radius-lg) var(--radius-lg) 0 0;
      padding:var(--spacing-lg);
      display:flex;flex-direction:column;gap:20px;
      border-top:1px solid var(--border-color-2);
      animation:modal-slide-up .25s cubic-bezier(0.22,1,0.36,1) both;
    ">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="
          width:48px;height:48px;border-radius:12px;
          background:var(--accent-green-dim);
          border:1px solid var(--accent-green);
          display:flex;align-items:center;justify-content:center;
          font-size:24px;flex-shrink:0;
        ">📲</div>
        <div>
          <p style="font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px">Instala FinTrack</p>
          <p style="font-size:13px;color:var(--text-secondary);margin-top:2px">Acceso rápido desde tu pantalla de inicio</p>
        </div>
      </div>

      <div style="
        background:var(--bg-card-2);border:1px solid var(--border-color-2);
        border-radius:var(--radius-md);padding:18px 14px;
        display:flex;flex-direction:column;gap:15px;
      ">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:16px;flex-shrink:0">⚡</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.45">
            <strong style="color:var(--text-primary)">Más rápido.</strong>
            Abre al instante sin pasar por el navegador.
          </p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:16px;flex-shrink:0">📴</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.45">
            <strong style="color:var(--text-primary)">Sin internet.</strong>
            Registra tus gastos aunque no tengas conexión.
          </p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:16px;flex-shrink:0">🔔</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.45">
            <strong style="color:var(--text-primary)">Notificaciones.</strong>
            Recibe alertas de deudas y objetivos en tiempo real.
          </p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:16px;flex-shrink:0">🛡️</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.45">
            <strong style="color:var(--text-primary)">Tu datos, seguros.</strong>
            Todo se guarda localmente en tu dispositivo, sin servidores externos.
          </p>
        </div>
      </div>

      <button id="install-show-instructions-btn"
              style="display:flex;align-items:center;justify-content:center;gap:8px;
                    width:100%;background:var(--accent-green);color:#000;
                    border:none;border-radius:var(--radius-xl);
                    padding:18px;font-family:var(--font-main);
                    font-size:16px;font-weight:800;letter-spacing:0.2px;
                    box-shadow:0 0 20px rgba(80,200,120,0.25);
                    cursor:pointer;">
        Ver instrucciones de instalación
      </button>

      <div style="display:flex;gap:8px">
        <button onclick="_dismissInstallBanner(false)" style="
          flex:1;background:transparent;
          border:1px solid var(--border-color-2);
          border-radius:var(--radius-xl);padding:13px;
          font-family:var(--font-main);font-size:13px;font-weight:500;
          color:var(--text-secondary);cursor:pointer;
        ">Omitir por ahora</button>
        <button onclick="_dismissInstallBanner(true)" style="
          flex:1;background:transparent;
          border:1px solid var(--border-color-2);
          border-radius:var(--radius-xl);padding:13px;
          font-family:var(--font-main);font-size:13px;font-weight:500;
          color:var(--text-tertiary);cursor:pointer;
        ">No volver a mostrar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const instructionsBtn = document.getElementById('install-show-instructions-btn');
  instructionsBtn.onclick = () => {
    // Cerrar el banner antes de abrir instrucciones
    _dismissInstallBanner(false);
    setTimeout(() => {
      showInstallInstructionsModal();
    }, 300);
  };
}

function _dismissInstallBanner(never) {
  if (never) localStorage.setItem(KEY_INSTALL_NEVER, '1');
  const overlay = document.getElementById('install-banner-overlay');
  if (!overlay) return;
  overlay.style.animation = 'overlay-fade-out .22s ease forwards';
  const card = overlay.querySelector('#install-banner-card');
  if (card) card.style.animation = 'modal-slide-down .22s cubic-bezier(0.4,0,1,1) forwards';
  setTimeout(() => overlay.remove(), 240);
}
window._dismissInstallBanner = _dismissInstallBanner;

// Modal de instrucciones de instalación (diseño mejorado)
window.showInstallInstructionsModal = function() {
  const existing = document.getElementById('modal-install-guide');
  if (existing) {
    closeModal('modal-install-guide', () => existing.remove());
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'modal-install-guide';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal('modal-install-guide', () => modal.remove());
    }
  };

  modal.innerHTML = `
    <div class="modal-card" style="max-height:88vh; overflow-y:auto; gap:0; padding-bottom:24px">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="
          width:44px;height:44px;border-radius:12px;flex-shrink:0;
          background:var(--accent-green-dim);border:1px solid var(--accent-green);
          display:flex;align-items:center;justify-content:center;font-size:22px;">📲</div>
        <div>
          <p style="font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:-0.3px;line-height:1.2">Instalar FinTrack</p>
          <p style="font-size:12px;color:var(--text-tertiary);margin-top:2px">Añádela a tu pantalla de inicio</p>
        </div>
      </div>

      <!-- Pasos en tarjeta interna -->
      <div style="
        background:var(--bg-card-2);border:1px solid var(--border-color-2);
        border-radius:var(--radius-md);padding:16px;margin-bottom:16px;
        display:flex;flex-direction:column;gap:14px;">

        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="
            min-width:26px;height:26px;border-radius:50%;flex-shrink:0;
            background:var(--accent-green-dim);border:1px solid rgba(80,200,120,.3);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:800;color:var(--accent-green);">1</div>
          <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.45;padding-top:3px">
            Abre FinTrack en <strong style="color:var(--text-primary)">Chrome (Android)</strong> o <strong style="color:var(--text-primary)">Safari (iPhone)</strong>.
          </p>
        </div>

        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="
            min-width:26px;height:26px;border-radius:50%;flex-shrink:0;
            background:var(--accent-green-dim);border:1px solid rgba(80,200,120,.3);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:800;color:var(--accent-green);">2</div>
          <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.45;padding-top:3px">
            Toca
            <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.08);border-radius:6px;padding:1px 8px;font-size:12px;font-weight:700;color:var(--text-primary);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Compartir
            </span>
            en iOS, o los
            <span style="display:inline-flex;align-items:center;background:rgba(255,255,255,.08);border-radius:6px;padding:1px 9px;font-size:13px;font-weight:700;color:var(--text-primary);">⋮</span>
            en Android.
          </p>
        </div>

        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="
            min-width:26px;height:26px;border-radius:50%;flex-shrink:0;
            background:var(--accent-green-dim);border:1px solid rgba(80,200,120,.3);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:800;color:var(--accent-green);">3</div>
          <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.45;padding-top:3px">
            Selecciona <strong style="color:var(--text-primary)">"Añadir a pantalla de inicio"</strong>
            o <strong style="color:var(--text-primary)">"Instalar app"</strong>.
          </p>
        </div>

        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="
            min-width:26px;height:26px;border-radius:50%;flex-shrink:0;
            background:var(--accent-green-dim);border:1px solid rgba(80,200,120,.3);
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:800;color:var(--accent-green);">4</div>
          <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.45;padding-top:3px">
            Confirma el nombre y toca <strong style="color:var(--text-primary)">"Añadir"</strong>. ¡Listo!
          </p>
        </div>
      </div>

      <!-- Nota iOS/Android -->
      <div style="
        background:rgba(255,176,58,.06);border:1px solid rgba(255,176,58,.2);
        border-radius:var(--radius-md);padding:12px 14px;margin-bottom:20px;">
        <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.55">
          <strong style="color:#FFB03A">iPhone:</strong> tras tocar "Compartir", desplázate abajo y elige "Añadir a pantalla de inicio".<br>
          <strong style="color:var(--accent-green)">Android:</strong> los pasos varían por navegador; la opción suele estar en el menú <span style="font-weight:700">⋮</span>.
        </p>
      </div>

      <button class="btn-primary" onclick="closeModal('modal-install-guide', () => document.getElementById('modal-install-guide')?.remove())">
        Entendido ✓
      </button>
    </div>
  `;

  document.body.appendChild(modal);
};

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
      initStreak();
      navigate(SCREENS.HOME);
      setTimeout(checkInstallBanner, 800);
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