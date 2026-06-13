// toast.js
// Global in-app messaging system.
// Completely replaces native alert(), confirm() and prompt().

// ─────────────────────────────────────────────
// INTERNAL SVG ICONS
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
// CONTAINER — injected once into the DOM
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
// PUBLIC API: showToast(type, title, message?, duration?)
//
// type     : 'success' | 'error' | 'warning' | 'info'
// title    : string  — main text (bold)
// message  : string? — optional secondary text
// duration : number? — ms before dismissal (default 3000)
// ─────────────────────────────────────────────
function showToast(type, title, message = '', duration = 3000) {
  const container = _getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${_TOAST_ICONS[type] || _TOAST_ICONS.info}</div>
    <div class="toast-body">
      <p class="toast-title">${title}</p>
      ${message ? `<p class="toast-msg">${message}</p>` : ''}
    </div>`;

  container.appendChild(toast);
  // Micro-vibración al aparecer
  if (navigator.vibrate) navigator.vibrate(30);

  // Swipe to dismiss (izquierda/derecha)
  let touchStartX = 0, touchStartY = 0, isSwiping = false;
  const SWIPE_THRESHOLD = 60;

  const onTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
    toast.style.transition = 'transform 0.12s ease, opacity 0.12s ease';
  };
  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
      e.stopPropagation();
      isSwiping = true;
      toast.style.transition = 'none';
      toast.style.transform = `translateX(${dx}px)`;
      toast.style.opacity = `${1 - Math.min(Math.abs(dx) / (SWIPE_THRESHOLD * 1.5), 1)}`;
    }
  };
  const onTouchEnd = (e) => {
    if (!isSwiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      _dismissToast(toast);
    } else {
      toast.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.22s ease';
      toast.style.transform = '';
      toast.style.opacity = '';
    }
    toast.removeEventListener('touchstart', onTouchStart);
    toast.removeEventListener('touchmove', onTouchMove);
    toast.removeEventListener('touchend', onTouchEnd);
  };
  toast.addEventListener('touchstart', onTouchStart, { passive: false });
  toast.addEventListener('touchmove', onTouchMove, { passive: false });
  toast.addEventListener('touchend', onTouchEnd);

  setTimeout(() => _dismissToast(toast), duration);
}

// Smooth dismiss: slide out first, then collapse height so siblings flow without lag
function _dismissToast(toast) {
  if (!toast.parentNode || toast._dismissing) return;
  toast._dismissing = true;

  const height = toast.offsetHeight;

  // Step 1: slide out + fade (fast)
  toast.style.transition = 'transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.18s ease';
  toast.style.transform = 'translateX(-110%)';
  toast.style.opacity = '0';

  // Step 2: collapse height smoothly so siblings slide up without lag
  setTimeout(() => {
    toast.style.transition = [
      'max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      'margin-bottom 0.22s ease',
      'padding-top 0.22s ease',
      'padding-bottom 0.22s ease'
    ].join(', ');
    toast.style.overflow = 'hidden';
    toast.style.maxHeight = height + 'px';
    // Force reflow before collapsing
    void toast.getBoundingClientRect();
    requestAnimationFrame(() => {
      toast.style.maxHeight = '0';
      toast.style.marginBottom = '0';
      toast.style.paddingTop = '0';
      toast.style.paddingBottom = '0';
    });
    setTimeout(() => toast.remove(), 240);
  }, 200);
}

// Semantic shorthand methods
const Toast = {
  success: (title, msg, ms)  => showToast('success', title, msg, ms),
  error:   (title, msg, ms)  => showToast('error',   title, msg, ms),
  warning: (title, msg, ms)  => showToast('warning', title, msg, ms),
  info:    (title, msg, ms)  => showToast('info',    title, msg, ms),
};

// ─────────────────────────────────────────────
// IN-APP CONFIRM — replaces native confirm()
//
// Returns a Promise<boolean>.
//
// Usage:
//   const ok = await AppConfirm({
//     titulo:    '¿Cerrar sesión?',
//     mensaje:   'Se borrarán todos tus datos.',
//     tipo:      'danger',           // 'danger' | 'warning'
//     btnOk:     'Sí, cerrar sesión',
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
    // Remove any existing overlay
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
     * FIX 3 & 6 — Crash when closing the confirmation dialog.
     *
     * ORIGINAL BUG: close() called resolve(result) BEFORE animationend
     * removed the overlay from the DOM. The overlay has position:fixed;
     * inset:0 (full-screen) and z-index:10000, blocking ALL touch/click
     * events during the 150ms exit animation. If animationend never fired
     * (uncertain timing per browser), the overlay stayed forever → frozen app.
     *
     * FIX: remove the overlay synchronously BEFORE resolving the Promise,
     * ensuring the UI is freed immediately.
     */
    const close = (result) => {
      overlay.remove();   // synchronous: frees the UI immediately
      resolve(result);    // then resolve so the caller can continue
    };

    overlay.querySelector('#confirm-btn-ok').onclick     = () => close(true);
    overlay.querySelector('#confirm-btn-cancel').onclick = () => close(false);

    // Tap on the backdrop closes with false
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close(false);
    });
  });
}

// ─────────────────────────────────────────────
// INLINE VALIDATION HELPERS
// Reused by all modules to mark/unmark errors
// on inputs in a consistent, non-duplicated way.
// ─────────────────────────────────────────────

/**
 * Marks a field as invalid and shows its error message.
 * @param {string} inputId   — id of the <input>
 * @param {string} errorId   — id of the <div class="input-error-msg">
 * @param {string} [msg]     — optional text that overwrites the div content
 */
function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errorId);
  if (!input || !err) return;

  input.classList.add('input-invalid');
  err.classList.add('visible');
  if (msg) {
    // Preserve any existing SVG; only update the text <span>
    const span = err.querySelector('span') ?? err;
    span.textContent = msg;
  }
}

/**
 * Removes the error state from a field.
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
 * Clears all [inputId, errorId] pairs in an array.
 * @param {Array<[string,string]>} pairs
 */
function clearAllFieldErrors(pairs) {
  pairs.forEach(([i, e]) => clearFieldError(i, e));
}