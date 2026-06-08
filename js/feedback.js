// feedback.js
// Support Mailbox — Anonymous feedback via Discord Webhook

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const FEEDBACK_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1506348790007730187/' +
  '1PCwLfxPWJOs7hohz0WIvjTAxbCMQ7g574EuSCBYdXcYTMilLwSav6f1goyoCJvF3uxD';

/**
 * Category catalogue with their decimal colour for the Discord embed
 * and the CSS accent identifier for the active chip.
 */
const FEEDBACK_CATEGORIES = {
  error: {
    label:  'Error',
    color:  15750228,   // #F05454
    accent: 'rojo'
  },
  sugerencia: {
    label:  'Sugerencia',
    color:  16756794,   // #FFB03A
    accent: 'dorado'
  },
  elogio: {
    label:  'Elogio',
    color:  5294200,    // #50C878
    accent: 'verde'
  }
};

// ─────────────────────────────────────────────────────────────────
// LOCAL STATE
// ─────────────────────────────────────────────────────────────────

let _starRating      = 0;
let _selectedCategory = null;   // 'error' | 'sugerencia' | 'elogio' | null
let _isSending       = false;

// ─────────────────────────────────────────────────────────────────
// INITIALISATION
// Called from app.js every time the user navigates to SCREENS.FEEDBACK
// ─────────────────────────────────────────────────────────────────

function initFeedback() {
  _starRating       = 0;
  _selectedCategory = null;
  _isSending        = false;

  // Reset fields
  const subjectEl  = document.getElementById('fb-asunto');
  const messageEl  = document.getElementById('fb-mensaje');
  const counterEl  = document.getElementById('fb-contador');
  const btnEl      = document.getElementById('fb-btn-enviar');

  if (subjectEl)  subjectEl.value   = '';
  if (messageEl)  messageEl.value   = '';
  if (counterEl)  counterEl.textContent = '0 / 500';
  if (btnEl) {
    btnEl.disabled    = true;
    btnEl.textContent = 'Enviar mensaje';
  }

  // Textarea listeners (counter + validation)
  if (messageEl) {
    // Clone to avoid duplicate listeners when re-entering the screen
    const freshMessage = messageEl.cloneNode(true);
    messageEl.parentNode.replaceChild(freshMessage, messageEl);

    freshMessage.oninput = () => {
      const n = freshMessage.value.length;
      if (counterEl) {
        counterEl.textContent = `${n} / 500`;
        counterEl.className   = 'fb-contador' +
          (n >= 500 ? ' al-limite' : n >= 420 ? ' cerca' : '');
      }
      _validateFeedback();
    };
  }

  // Subject field listener (optional, does not block submission)
  if (subjectEl) {
    const freshSubject = subjectEl.cloneNode(true);
    subjectEl.parentNode.replaceChild(freshSubject, subjectEl);
  }

  // Render stars and chips in their initial state
  _renderStars();
  _renderCategoryChips();
}

// ─────────────────────────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────────────────────────

function _renderStars() {
  const container = document.getElementById('fb-estrellas');
  if (!container) return;

  container.innerHTML = [1, 2, 3, 4, 5]
    .map(n => `
      <button
        class="fb-estrella ${n <= _starRating ? 'activa' : ''}"
        onclick="fbSeleccionarEstrella(${n})"
        aria-label="${n} estrella${n > 1 ? 's' : ''}">
        ★
      </button>`)
    .join('');
}

/** Public: called from onclick in the JS-generated HTML */
function fbSeleccionarEstrella(n) {
  if (_isSending) return;
  // Click on the currently active star → deselect
  _starRating = (_starRating === n) ? 0 : n;
  _renderStars();
  _validateFeedback();
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY CHIPS
// ─────────────────────────────────────────────────────────────────

function _renderCategoryChips() {
  Object.entries(FEEDBACK_CATEGORIES).forEach(([key, cat]) => {
    const chip = document.getElementById(`fb-chip-${key}`);
    if (!chip) return;

    const isActive = _selectedCategory === key;
    // Clear all previous accent classes
    chip.className = 'fb-chip';
    if (isActive) {
      chip.classList.add('activo');
      chip.classList.add(`activo-${cat.accent}`);
    }
  });
}

/** Public: called from onclick in the HTML */
function fbSeleccionarCategoria(key) {
  if (_isSending) return;
  // Click on the same category → deselect
  _selectedCategory = (_selectedCategory === key) ? null : key;
  _renderCategoryChips();
  _validateFeedback();
}

// ─────────────────────────────────────────────────────────────────
// REAL-TIME VALIDATION
// ─────────────────────────────────────────────────────────────────

function _validateFeedback() {
  const btnEl     = document.getElementById('fb-btn-enviar');
  const messageEl = document.getElementById('fb-mensaje');
  if (!btnEl || !messageEl) return;

  const isTextValid = messageEl.value.trim().length >= 10;
  const isValid     = _selectedCategory !== null &&
                      _starRating >= 1           &&
                      isTextValid;

  btnEl.disabled = !isValid || _isSending;
}

// ─────────────────────────────────────────────────────────────────
// BUILD DISCORD PAYLOAD
// ─────────────────────────────────────────────────────────────────

function _buildDiscordPayload() {
  const user    = Storage.getUser() ?? {};
  const cat     = FEEDBACK_CATEGORIES[_selectedCategory];
  const subject = (document.getElementById('fb-asunto')?.value ?? '').trim();
  const message = (document.getElementById('fb-mensaje')?.value ?? '').trim();

  const starsStr =
    '★'.repeat(_starRating) + '☆'.repeat(5 - _starRating) +
    `  (${_starRating}/5)`;

  const fields = [
    { name: '👤 Usuario',    value: user.name     || 'Anónimo', inline: true },
    { name: '🌍 País',       value: user.country  || '—',       inline: true },
    { name: '💰 Moneda',     value: user.currency || '—',       inline: true },
    { name: '🏷️ Categoría', value: cat.label,                   inline: true },
    { name: '⭐ Puntuación', value: starsStr,                    inline: true },
    // Empty column to align the 3-column row
    { name: '\u200B',        value: '\u200B',                   inline: true },
    ...(subject
      ? [{ name: 'Asunto',  value: subject, inline: false }]
      : []),
    { name: 'Mensaje',    value: message, inline: false }
  ];

  return {
    embeds: [{
      title:       'Nuevo Feedback · FinTrack',
      description: 'Mensaje recibido desde el Buzón de Soporte de la aplicación.',
      color:       cat.color,
      fields,
      footer: {
        text: 'FinTrack · Buzón de Soporte · Envío anónimo'
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// ─────────────────────────────────────────────────────────────────
// SEND TO WEBHOOK
// ─────────────────────────────────────────────────────────────────

async function sendFeedbackToDiscord() {
  const btnEl = document.getElementById('fb-btn-enviar');
  if (!btnEl || btnEl.disabled || _isSending) return;

  // ── 1. Loading state ─────────────────────────────────────────
  _isSending        = true;
  btnEl.disabled    = true;
  btnEl.textContent = 'Transmitiendo datos...';

  // ── 2. Elegant delay (UX) ────────────────────────────────────
  await new Promise(resolve => setTimeout(resolve, 1200));

  // ── 3. Build the payload ─────────────────────────────────────
  const payload = _buildDiscordPayload();

  // ── 4. Request to the webhook ────────────────────────────────
  try {
    const response = await fetch(FEEDBACK_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    // Discord returns 204 No Content on success
    if (!response.ok && response.status !== 204) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ── 5. Success ───────────────────────────────────────────
    Toast.success(
      '¡Enviado con éxito!',
      'Tu mensaje ha sido indexado en nuestro buzón central.'
    );

    // Reset form and navigate to Profile
    _isSending = false;
    initFeedback();
    navigate(SCREENS.PERFIL);

  } catch (err) {
    // ── 6. Network error ─────────────────────────────────────
    console.error('[Feedback] Error en webhook:', err);
    Toast.error(
      'Error de conexión',
      'No se pudo enviar el mensaje. Comprueba tu conexión e inténtalo de nuevo.'
    );

    _isSending        = false;
    btnEl.disabled    = false;
    btnEl.textContent = 'Enviar mensaje';
  }
}