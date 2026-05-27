// feedback.js
// Buzón de Soporte — Feedback anónimo vía Discord Webhook

// ─────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────

const FEEDBACK_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1506348790007730187/' +
  '1PCwLfxPWJOs7hohz0WIvjTAxbCMQ7g574EuSCBYdXcYTMilLwSav6f1goyoCJvF3uxD';

/**
 * Catálogo de categorías con su color decimal para el embed de Discord
 * y el identificador de acento CSS para el chip activo.
 */
const FB_CATEGORIAS = {
  error: {
    label:  '🐛 Error',
    color:  15750228,   // #F05454
    acento: 'rojo'
  },
  sugerencia: {
    label:  '💡 Sugerencia',
    color:  16756794,   // #FFB03A
    acento: 'dorado'
  },
  elogio: {
    label:  '✨ Elogio',
    color:  5294200,    // #50C878
    acento: 'verde'
  }
};

// ─────────────────────────────────────────────────────────────────
// ESTADO LOCAL
// ─────────────────────────────────────────────────────────────────

let _fbEstrellas = 0;
let _fbCategoria = null;   // 'error' | 'sugerencia' | 'elogio' | null
let _fbEnviando  = false;

// ─────────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// Llamada desde app.js cada vez que se navega a SCREENS.FEEDBACK
// ─────────────────────────────────────────────────────────────────

function initFeedback() {
  _fbEstrellas = 0;
  _fbCategoria = null;
  _fbEnviando  = false;

  // Reset campos
  const asunto  = document.getElementById('fb-asunto');
  const mensaje = document.getElementById('fb-mensaje');
  const contador = document.getElementById('fb-contador');
  const btn      = document.getElementById('fb-btn-enviar');

  if (asunto)   asunto.value   = '';
  if (mensaje)  mensaje.value  = '';
  if (contador) contador.textContent = '0 / 500';
  if (btn) {
    btn.disabled    = true;
    btn.textContent = 'Enviar mensaje';
  }

  // Listeners del textarea (contador + validación)
  if (mensaje) {
    // Clonar para evitar listeners duplicados al re-entrar en la pantalla
    const fresh = mensaje.cloneNode(true);
    mensaje.parentNode.replaceChild(fresh, mensaje);

    fresh.oninput = () => {
      const n = fresh.value.length;
      if (contador) {
        contador.textContent = `${n} / 500`;
        contador.className   = 'fb-contador' +
          (n >= 500 ? ' al-limite' : n >= 420 ? ' cerca' : '');
      }
      _fbValidar();
    };
  }

  // Listener del campo asunto (opcional, no bloquea envío)
  if (asunto) {
    const freshA = asunto.cloneNode(true);
    asunto.parentNode.replaceChild(freshA, asunto);
  }

  // Renderizar estrellas y chips en estado inicial
  _fbRenderEstrellas();
  _fbRenderChips();
}

// ─────────────────────────────────────────────────────────────────
// ESTRELLAS
// ─────────────────────────────────────────────────────────────────

function _fbRenderEstrellas() {
  const container = document.getElementById('fb-estrellas');
  if (!container) return;

  container.innerHTML = [1, 2, 3, 4, 5]
    .map(n => `
      <button
        class="fb-estrella ${n <= _fbEstrellas ? 'activa' : ''}"
        onclick="fbSeleccionarEstrella(${n})"
        aria-label="${n} estrella${n > 1 ? 's' : ''}">
        ★
      </button>`)
    .join('');
}

/** Pública: llamada desde onclick en el HTML generado por JS */
function fbSeleccionarEstrella(n) {
  if (_fbEnviando) return;
  // Clic en la misma estrella activa → deseleccionar
  _fbEstrellas = (_fbEstrellas === n) ? 0 : n;
  _fbRenderEstrellas();
  _fbValidar();
}

// ─────────────────────────────────────────────────────────────────
// CHIPS DE CATEGORÍA
// ─────────────────────────────────────────────────────────────────

function _fbRenderChips() {
  Object.entries(FB_CATEGORIAS).forEach(([key, cat]) => {
    const chip = document.getElementById(`fb-chip-${key}`);
    if (!chip) return;

    const estaActivo = _fbCategoria === key;
    // Limpiar todas las clases de acento anteriores
    chip.className = 'fb-chip';
    if (estaActivo) {
      chip.classList.add('activo');
      chip.classList.add(`activo-${cat.acento}`);
    }
  });
}

/** Pública: llamada desde onclick en el HTML */
function fbSeleccionarCategoria(key) {
  if (_fbEnviando) return;
  // Clic en la misma categoría → deseleccionar
  _fbCategoria = (_fbCategoria === key) ? null : key;
  _fbRenderChips();
  _fbValidar();
}

// ─────────────────────────────────────────────────────────────────
// VALIDACIÓN EN TIEMPO REAL
// ─────────────────────────────────────────────────────────────────

function _fbValidar() {
  const btn     = document.getElementById('fb-btn-enviar');
  const mensaje = document.getElementById('fb-mensaje');
  if (!btn || !mensaje) return;

  const textoValido = mensaje.value.trim().length >= 10;
  const valido      = _fbCategoria !== null &&
                      _fbEstrellas >= 1      &&
                      textoValido;

  btn.disabled = !valido || _fbEnviando;
}

// ─────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DEL PAYLOAD DE DISCORD
// ─────────────────────────────────────────────────────────────────

function _fbConstruirPayload() {
  const user   = Storage.getUser() ?? {};
  const cat    = FB_CATEGORIAS[_fbCategoria];
  const asunto = (document.getElementById('fb-asunto')?.value ?? '').trim();
  const mensaje = (document.getElementById('fb-mensaje')?.value ?? '').trim();

  const estrellasStr =
    '★'.repeat(_fbEstrellas) + '☆'.repeat(5 - _fbEstrellas) +
    `  (${_fbEstrellas}/5)`;

  const fields = [
    { name: '👤 Usuario',    value: user.name     || 'Anónimo', inline: true },
    { name: '🌍 País',       value: user.country  || '—',       inline: true },
    { name: '💰 Moneda',     value: user.currency || '—',       inline: true },
    { name: '🏷️ Categoría', value: cat.label,                   inline: true },
    { name: '⭐ Puntuación', value: estrellasStr,                inline: true },
    // Columna vacía para alinear la fila de 3
    { name: '\u200B',        value: '\u200B',                   inline: true },
    ...(asunto
      ? [{ name: '📌 Asunto',  value: asunto,  inline: false }]
      : []),
    { name: '📝 Mensaje',    value: mensaje,  inline: false }
  ];

  return {
    embeds: [{
      title:       '💬 Nuevo Feedback · FinTrack',
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
// ENVÍO AL WEBHOOK
// ─────────────────────────────────────────────────────────────────

async function sendFeedbackToDiscord() {
  const btn = document.getElementById('fb-btn-enviar');
  if (!btn || btn.disabled || _fbEnviando) return;

  // ── 1. Estado de carga ──────────────────────────────────────
  _fbEnviando      = true;
  btn.disabled     = true;
  btn.textContent  = 'Transmitiendo datos...';

  // ── 2. Retraso elegante (UX) ────────────────────────────────
  await new Promise(resolve => setTimeout(resolve, 1200));

  // ── 3. Construcción del payload ─────────────────────────────
  const payload = _fbConstruirPayload();

  // ── 4. Petición al webhook ──────────────────────────────────
  try {
    const response = await fetch(FEEDBACK_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    // Discord devuelve 204 No Content en éxito
    if (!response.ok && response.status !== 204) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ── 5. Éxito ─────────────────────────────────────────────
    Toast.success(
      '¡Enviado con éxito!',
      'Tu mensaje ha sido indexado en nuestro buzón central.'
    );

    // Limpiar formulario y navegar a Perfil
    _fbEnviando = false;
    initFeedback();
    navigate(SCREENS.PERFIL);

  } catch (err) {
    // ── 6. Error de red ───────────────────────────────────────
    console.error('[Feedback] Error en webhook:', err);
    Toast.error(
      'Error de conexión',
      'No se pudo enviar el mensaje. Comprueba tu conexión e inténtalo de nuevo.'
    );

    _fbEnviando     = false;
    btn.disabled    = false;
    btn.textContent = 'Enviar mensaje';
  }
}