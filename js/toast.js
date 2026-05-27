// toast.js
// Sistema global de mensajes in-app.
// Reemplaza completamente alert(), confirm() y prompt() nativos.

// ─────────────────────────────────────────────
// ÍCONOS SVG INTERNOS
// ─────────────────────────────────────────────
const _TOAST_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M5 12l5 5l10-10"/>
  </svg>`,

  error: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 9v4"/>
    <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871
             h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536
             a1.914 1.914 0 0 0-3.274 0"/>
    <path d="M12 16h.01"/>
  </svg>`,

  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 9v4"/>
    <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871
             h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536
             a1.914 1.914 0 0 0-3.274 0"/>
    <path d="M12 16h.01"/>
  </svg>`,

  info: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
    <path d="M12 9h.01"/>
    <path d="M10 15h2"/>
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0"/>
  </svg>`
};

// ─────────────────────────────────────────────
// CONTENEDOR — se inyecta una sola vez en el DOM
// ─────────────────────────────────────────────
function _getToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

// ─────────────────────────────────────────────
// API PÚBLICA: showToast(tipo, titulo, mensaje?, duracion?)
//
// tipo     : 'success' | 'error' | 'warning' | 'info'
// titulo   : string  — texto principal (negrita)
// mensaje  : string? — texto secundario opcional
// duracion : number? — ms antes de desaparecer (default 3000)
// ─────────────────────────────────────────────
function showToast(tipo, titulo, mensaje = '', duracion = 3000) {
  const container = _getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${_TOAST_ICONS[tipo] || _TOAST_ICONS.info}
    </div>
    <div class="toast-body">
      <p class="toast-title">${titulo}</p>
      ${mensaje ? `<p class="toast-msg">${mensaje}</p>` : ''}
    </div>`;

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => _dismissToast(toast), duracion);
}

function _dismissToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

// Atajos semánticos
const Toast = {
  success: (titulo, msg, ms)  => showToast('success', titulo, msg, ms),
  error:   (titulo, msg, ms)  => showToast('error',   titulo, msg, ms),
  warning: (titulo, msg, ms)  => showToast('warning', titulo, msg, ms),
  info:    (titulo, msg, ms)  => showToast('info',    titulo, msg, ms),
};

// ─────────────────────────────────────────────
// CONFIRM IN-APP — reemplaza confirm() nativo
//
// Devuelve una Promise<boolean>.
//
// Uso:
//   const ok = await AppConfirm({
//     titulo:  '¿Cerrar sesión?',
//     mensaje: 'Se borrarán todos tus datos.',
//     tipo:    'danger',           // 'danger' | 'warning'
//     btnOk:   'Sí, cerrar sesión',
//     btnCancel: 'Cancelar'
//   });
//   if (ok) { ... }
// ─────────────────────────────────────────────
const _CONFIRM_ICONS = {
  danger: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M14 8v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2
             h7a2 2 0 0 0 2-2v-2"/>
    <path d="M9 12h12l-3-3"/>
    <path d="M18 15l3-3"/>
  </svg>`,

  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 9v4"/>
    <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871
             h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536
             a1.914 1.914 0 0 0-3.274 0"/>
    <path d="M12 16h.01"/>
  </svg>`
};

function AppConfirm({ titulo, mensaje, tipo = 'danger', btnOk = 'Confirmar', btnCancel = 'Cancelar' }) {
  return new Promise(resolve => {
    // Elimina overlay previo si lo hay
    document.getElementById('confirm-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id    = 'confirm-overlay';

    overlay.innerHTML = `
      <div id="confirm-card">
        <div class="confirm-icon-wrap ${tipo}">
          ${_CONFIRM_ICONS[tipo] || _CONFIRM_ICONS.warning}
        </div>
        <p id="confirm-title">${titulo}</p>
        ${mensaje ? `<p id="confirm-message">${mensaje}</p>` : ''}
        <button id="confirm-btn-ok" class="${tipo}">${btnOk}</button>
        <button id="confirm-btn-cancel">${btnCancel}</button>
      </div>`;

    document.body.appendChild(overlay);

    /*
     * FIX 3 & 6 — Crash al cerrar el diálogo de confirmación.
     *
     * BUG ORIGINAL: close() llamaba resolve(result) ANTES de que
     * animationend eliminara el overlay del DOM.  El overlay tiene
     * position:fixed; inset:0 (pantalla completa) y z-index:10000,
     * de modo que bloqueaba TODOS los eventos táctiles/click durante
     * los 150 ms de animación de salida.  Si animationend nunca
     * disparaba (timing incierto según el navegador), el overlay
     * quedaba para siempre → app congelada.
     *
     * FIX: eliminar el overlay de forma síncrona ANTES de resolver
     * la Promise, garantizando que la UI quede libre al instante.
     */
    const close = (result) => {
      overlay.remove();   // síncrono: libera la UI inmediatamente
      resolve(result);    // luego resuelve para que el caller continúe
    };

    overlay.querySelector('#confirm-btn-ok').onclick     = () => close(true);
    overlay.querySelector('#confirm-btn-cancel').onclick = () => close(false);

    // Tap en el fondo cierra con false
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close(false);
    });
  });
}

// ─────────────────────────────────────────────
// HELPERS DE VALIDACIÓN INLINE
// Reutilizados por todos los módulos para
// marcar/desmarcar errores en inputs de forma
// consistente y sin código duplicado.
// ─────────────────────────────────────────────

/**
 * Marca un campo como inválido y muestra su mensaje de error.
 * @param {string} inputId   — id del <input>
 * @param {string} errorId   — id del <div class="input-error-msg">
 * @param {string} [msg]     — texto opcional que sobreescribe el contenido del div
 */
function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errorId);
  if (!input || !err) return;

  input.classList.add('input-invalid');
  err.classList.add('visible');
  if (msg) {
    // Conserva el SVG si existe; actualiza solo el <span> de texto
    const span = err.querySelector('span') ?? err;
    span.textContent = msg;
  }
}

/**
 * Elimina el estado de error de un campo.
 * @param {string} inputId
 * @param {string} errorId
 */
function clearFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errorId);
  if (input) input.classList.remove('input-invalid');
  if (err)   err.classList.remove('visible');
}

/**
 * Limpia todos los pares [inputId, errorId] de un array.
 * @param {Array<[string,string]>} pairs
 */
function clearAllFieldErrors(pairs) {
  pairs.forEach(([i, e]) => clearFieldError(i, e));
}