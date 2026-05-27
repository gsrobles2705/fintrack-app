// deudas.js

let deudaEditandoId = null;
let deudaOpcionesId = null;
let deudaPagoId     = null;

// ─────────────────────────────────────────────
// UTILIDADES DE FECHA — Fix 7
//
// PROBLEMA: new Date("YYYY-MM-DD") interpreta la cadena como
// MEDIANOCHE UTC.  En UTC-5 (Perú) eso equivale a las 19:00 del
// día ANTERIOR, provocando que la app muestre "23 may" cuando el
// usuario eligió "24 may".
//
// SOLUCIÓN (enfoque por componentes locales):
//   Extraer año, mes y día del string y construir el Date con el
//   constructor multi-argumento → siempre zona horaria LOCAL.
//   Se usa mediodía (12 h) como hora de referencia para que ningún
//   offset real (UTC-12 … UTC+14) desplace la fecha.
// ─────────────────────────────────────────────

/** Convierte "YYYY-MM-DD" → ISO string con fecha local al mediodía. */
function parseFechaLocal(fechaStr) {
  if (!fechaStr) return null;
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  // Constructor local: no depende de UTC
  return new Date(anio, mes - 1, dia, 12, 0, 0).toISOString();
}

/**
 * Convierte cualquier ISO string → Date al mediodía local.
 * Permite mostrar correctamente tanto fechas guardadas con el
 * formato nuevo (mediodía local) como las antiguas (medianoche UTC).
 */
function parseDateDisplay(isoStr) {
  if (!isoStr) return new Date();
  const partesFecha = isoStr.split('T')[0].split('-').map(Number);
  const [anio, mes, dia] = partesFecha;
  if (!anio || !mes || !dia) return new Date(isoStr);
  return new Date(anio, mes - 1, dia, 12, 0, 0);
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────

function renderDeudas() {
  const user   = Storage.getUser();
  const deudas = Storage.getDeudas();
  const symbol = user.symbol;

  const avatarEl = document.getElementById('deudas-avatar');
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  const activas = deudas.filter(d => !d.paid);
  const pagadas = deudas
    .filter(d => d.paid)
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  const total   = activas.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById('deudas-total');
  totalEl.textContent = `${symbol} ${total.toFixed(2)}`;
  totalEl.className   = total === 0 ? 'deudas-total sin-deudas' : 'deudas-total';

  document.getElementById('deudas-empty').style.display =
    deudas.length === 0 ? 'block' : 'none';

  document.getElementById('deudas-activas-container').innerHTML =
    activas.map(d => renderDeudaCard(d, symbol, false)).join('');

  const pagadasSection = document.getElementById('deudas-pagadas-section');
  pagadasSection.style.display = pagadas.length > 0 ? 'block' : 'none';
  document.getElementById('deudas-pagadas-container').innerHTML =
    pagadas.map(d => renderDeudaCard(d, symbol, true)).join('');
}

// ─────────────────────────────────────────────
// TARJETA
// ─────────────────────────────────────────────

const ICONO_CALENDARIO = `
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/>
    <path d="M16 3v4M8 3v4M4 11h16M11 15h1M12 15v3"/>
  </svg>`;

function renderDeudaCard(deuda, currency, pagada) {
  // Fix 7: usar parseDateDisplay para evitar desfase UTC en display
  const venceDate     = parseDateDisplay(deuda.dueDate);
  const vencida       = !pagada && venceDate < new Date();
  const venceFechaStr = venceDate.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  let fechaHtml = '';

  if (pagada && deuda.paidDate) {
    const pagadaDate = parseDateDisplay(deuda.paidDate);   // Fix 7
    const pagadaStr  = pagadaDate.toLocaleDateString('es-PE', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const aTiempo = pagadaDate <= venceDate;
    const tag = aTiempo
      ? `<span class="deuda-tag ok">A tiempo</span>`
      : `<span class="deuda-tag tarde">Con retraso</span>`;

    fechaHtml = `
      <div class="deuda-fechas-pagada">
        <div class="deuda-fecha">${ICONO_CALENDARIO} Fecha límite: ${venceFechaStr}</div>
        <div class="deuda-fecha">${ICONO_CALENDARIO} Pagada el: ${pagadaStr} ${tag}</div>
      </div>`;
  } else {
    fechaHtml = `
      <div class="deuda-fecha ${vencida ? 'vencida' : ''}">
        ${ICONO_CALENDARIO}
        ${vencida ? 'Venció:' : 'Vence:'} ${venceFechaStr}
      </div>`;
  }

  return `
    <div class="deuda-card ${pagada ? 'pagada' : ''}">
      <div class="deuda-card-header">
        <div>
          <p class="deuda-persona">${deuda.person}</p>
          ${deuda.description
            ? `<p class="deuda-descripcion">${deuda.description}</p>`
            : ''}
        </div>
        <button class="btn-deuda-menu" onclick="opcionesDeuda('${deuda.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
            <path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
            <path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
          </svg>
        </button>
      </div>

      <p class="deuda-monto ${pagada ? 'pagada' : ''}">
        ${currency} ${deuda.amount.toFixed(2)}
      </p>

      <div class="deuda-card-footer">
        ${fechaHtml}
        ${!pagada ? `
          <div class="deuda-acciones">
            <button class="btn-pagar" onclick="pagarDeuda('${deuda.id}')">Pagar</button>
          </div>
        ` : `
          <div class="deuda-pagada-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M5 12l5 5l10-10"/>
            </svg>
            Pagada
          </div>
        `}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// MODAL OPCIONES
// ─────────────────────────────────────────────

function opcionesDeuda(id) {
  deudaOpcionesId = id;
  const deuda  = Storage.getDeudas().find(d => d.id === id);
  const user   = Storage.getUser();
  const symbol = user.symbol;

  const tituloEl = document.getElementById('modal-opciones-titulo');
  tituloEl.textContent = deuda ? deuda.person : 'Opciones';

  let subtituloEl = document.getElementById('modal-opciones-subtitulo');
  if (!subtituloEl) {
    subtituloEl           = document.createElement('p');
    subtituloEl.id        = 'modal-opciones-subtitulo';
    subtituloEl.className = 'modal-subtitle';
    tituloEl.insertAdjacentElement('afterend', subtituloEl);
  }
  if (deuda) {
    const desc = deuda.description ? ` · ${deuda.description}` : '';
    subtituloEl.textContent   = `${symbol} ${deuda.amount.toFixed(2)}${desc}`;
    subtituloEl.style.display = 'block';
  } else {
    subtituloEl.style.display = 'none';
  }

  const botonesEl = document.getElementById('modal-opciones-botones');
  botonesEl.innerHTML = deuda?.paid
    ? `
      <button class="btn-primary btn-verde" onclick="editarDesdeOpciones()">
        Editar deuda
      </button>
      <button class="btn-primary btn-eliminar-pago" onclick="eliminarPagoDesdeOpciones()">
        Eliminar pago
      </button>
      <button class="btn-primary btn-rojo" onclick="eliminarDeudaDesdeOpciones()">
        Eliminar deuda
      </button>
      <button class="btn-ghost" onclick="cerrarModalOpciones()">Cancelar</button>`
    : `
      <button class="btn-primary btn-verde" onclick="editarDesdeOpciones()">
        Editar deuda
      </button>
      <button class="btn-primary btn-rojo" onclick="eliminarDeudaDesdeOpciones()">
        Eliminar deuda
      </button>
      <button class="btn-ghost" onclick="cerrarModalOpciones()">Cancelar</button>`;

  document.getElementById('modal-opciones-deuda').style.display = 'flex';
}

function editarDesdeOpciones() {
  const id = deudaOpcionesId;
  cerrarModalOpciones();
  mostrarModalDeuda(id);
}

// Fix 3: async function que usa AppConfirm ya corregido en toast.js
async function eliminarPagoDesdeOpciones() {
  const id = deudaOpcionesId;
  cerrarModalOpciones();

  const deuda = Storage.getDeudas().find(d => d.id === id);
  if (!deuda || !deuda.paid) return;

  const ok = await AppConfirm({
    titulo:    'Eliminar pago',
    mensaje:   'La deuda volverá a estar pendiente y el monto se eliminará del historial.',
    tipo:      'warning',
    btnOk:     'Sí, eliminar pago',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;

  if (deuda.transactionId) Storage.deleteTransaction(deuda.transactionId);
  Storage.updateDeuda(id, { paid: false, paidDate: null, transactionId: null });
  renderDeudas();
  Toast.info('Pago eliminado', 'La deuda volvió a estado pendiente.');
}

// Fix 6: mismo fix que el anterior
async function eliminarDeudaDesdeOpciones() {
  const id = deudaOpcionesId;
  cerrarModalOpciones();

  const deuda = Storage.getDeudas().find(d => d.id === id);
  if (!deuda) return;

  const ok = await AppConfirm({
    titulo:    'Eliminar deuda',
    mensaje:   `Se eliminará la deuda con ${deuda.person} de forma permanente.${
      deuda.paid ? ' El pago vinculado también se eliminará del historial.' : ''}`,
    tipo:      'danger',
    btnOk:     'Sí, eliminar',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;

  if (deuda.paid && deuda.transactionId) Storage.deleteTransaction(deuda.transactionId);
  Storage.deleteDeuda(id);
  renderDeudas();
  Toast.success('Deuda eliminada', `La deuda con ${deuda.person} fue eliminada.`);
}

function cerrarModalOpciones() {
  document.getElementById('modal-opciones-deuda').style.display = 'none';
  deudaOpcionesId = null;
}

// ─────────────────────────────────────────────
// MODAL PAGAR
// ─────────────────────────────────────────────

function pagarDeuda(id) {
  deudaPagoId = id;
  const deuda  = Storage.getDeudas().find(d => d.id === id);
  if (!deuda) return;
  const user   = Storage.getUser();
  const symbol = user.symbol;
  document.getElementById('modal-pago-texto').textContent =
    `¿Marcar la deuda de ${deuda.person} ` +
    `(${symbol} ${deuda.amount.toFixed(2)}) como pagada? ` +
    `Se registrará como gasto.`;
  document.getElementById('modal-confirmar-pago').style.display = 'flex';
}

function confirmarPago() {
  if (!deudaPagoId) return;
  const deuda = Storage.getDeudas().find(d => d.id === deudaPagoId);
  if (!deuda) return;

  const transaccion = {
    id:       Date.now().toString(),
    type:     'gasto',
    amount:   deuda.amount,
    category: 'deuda',
    date:     new Date().toISOString()
  };

  Storage.addTransaction(transaccion);
  Storage.updateDeuda(deudaPagoId, {
    paid:          true,
    paidDate:      new Date().toISOString(),
    transactionId: transaccion.id
  });

  const user   = Storage.getUser();
  const symbol = user.symbol;
  cerrarModalPago();
  renderDeudas();
  Toast.success(
    'Deuda saldada',
    `Pago de ${symbol}${deuda.amount.toFixed(2)} a ${deuda.person} registrado.`
  );
}

function cerrarModalPago() {
  document.getElementById('modal-confirmar-pago').style.display = 'none';
  deudaPagoId = null;
}

// ─────────────────────────────────────────────
// MODAL NUEVA / EDITAR DEUDA
// ─────────────────────────────────────────────

function mostrarModalDeuda(id = null) {
  deudaEditandoId = id;

  ['deuda-input-monto', 'deuda-input-persona',
   'deuda-input-fecha', 'deuda-input-descripcion',
   'deuda-input-fecha-pago'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.value = '';
  });
  _deudaLimpiarErrores();

  // Fix 4: placeholder con símbolo dinámico de la moneda activa
  const inputMonto = document.getElementById('deuda-input-monto');
  if (inputMonto) {
    const symbol = getCurrencySymbol();
    inputMonto.placeholder = `${symbol} 0.00`;
  }

  const tituloEl      = document.getElementById('modal-deuda-titulo');
  const subtituloEl   = document.getElementById('modal-deuda-subtitulo');
  const fechaPagoWrap = document.getElementById('deuda-fecha-pago-wrap');

  if (id) {
    const deuda = Storage.getDeudas().find(d => d.id === id);
    if (!deuda) return;

    if (deuda.paid) {
      tituloEl.textContent = 'Editar Deuda Pagada';
      if (subtituloEl) {
        subtituloEl.textContent   = 'Solo puedes editar la descripción y la fecha real de pago.';
        subtituloEl.style.display = 'block';
      }

      const inputMontoEl = document.getElementById('deuda-input-monto');
      const inputPersona = document.getElementById('deuda-input-persona');
      const inputFecha   = document.getElementById('deuda-input-fecha');

      inputMontoEl.value    = deuda.amount;
      inputPersona.value    = deuda.person;
      inputFecha.value      = deuda.dueDate.split('T')[0];
      inputMontoEl.disabled = true;
      inputPersona.disabled = true;
      inputFecha.disabled   = true;

      document.getElementById('deuda-input-descripcion').value = deuda.description || '';

      if (fechaPagoWrap) fechaPagoWrap.style.display = 'block';
      const inputFechaPago = document.getElementById('deuda-input-fecha-pago');
      if (inputFechaPago && deuda.paidDate) {
        inputFechaPago.value = deuda.paidDate.split('T')[0];
      }

    } else {
      tituloEl.textContent = 'Editar Deuda';
      if (subtituloEl) subtituloEl.style.display = 'none';

      ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
        const el = document.getElementById(elId);
        if (el) el.disabled = false;
      });

      document.getElementById('deuda-input-monto').value   = deuda.amount;
      document.getElementById('deuda-input-persona').value = deuda.person;
      document.getElementById('deuda-input-fecha').value   = deuda.dueDate.split('T')[0];
      document.getElementById('deuda-input-descripcion').value = deuda.description || '';

      if (fechaPagoWrap) fechaPagoWrap.style.display = 'none';
    }

  } else {
    tituloEl.textContent = 'Nueva Deuda';
    if (subtituloEl) subtituloEl.style.display = 'none';

    ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
      const el = document.getElementById(elId);
      if (el) el.disabled = false;
    });

    if (fechaPagoWrap) fechaPagoWrap.style.display = 'none';
  }

  document.getElementById('modal-deuda').style.display = 'flex';
}

function cerrarModalDeuda() {
  _deudaLimpiarErrores();
  ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.disabled = false;
  });
  document.getElementById('modal-deuda').style.display = 'none';
  deudaEditandoId = null;
}

// ─── Helpers de error inline ─────────────────────────────────────

const _DEUDA_ERROR_PAIRS = [
  ['deuda-input-monto',      'error-deuda-monto'],
  ['deuda-input-persona',    'error-deuda-persona'],
  ['deuda-input-fecha',      'error-deuda-fecha'],
  ['deuda-input-fecha-pago', 'error-deuda-fecha-pago']
];

function _deudaLimpiarErrores() {
  clearAllFieldErrors(_DEUDA_ERROR_PAIRS);
}

// ─────────────────────────────────────────────
// Fix 5: notificación inmediata si la nueva deuda ya está vencida
// ─────────────────────────────────────────────
function _notificarDeudaVencida(persona, monto, symbol) {
  const hoy = new Date();
  hoy.toDateString(); // solo para forzar evaluación

  // Evita duplicar si ya se notificó hoy por esta persona+monto
  const yaExiste = Storage.getNotifications().some(n =>
    n.titulo === '🔴 Deuda con fecha vencida' &&
    n.mensaje.includes(persona) &&
    new Date(n.isoDate).toDateString() === hoy.toDateString()
  );
  if (yaExiste) return;

  agregarNotificacion(
    NOTIF_TIPO.DANGER,
    '🔴 Deuda con fecha vencida',
    `La deuda registrada con ${persona} (${symbol}${monto.toFixed(2)}) ya se encuentra vencida.`
  );
}

// ─────────────────────────────────────────────
// GUARDAR DEUDA
// ─────────────────────────────────────────────

function guardarDeuda() {
  _deudaLimpiarErrores();

  const descripcion = document.getElementById('deuda-input-descripcion').value.trim();

  if (deudaEditandoId) {
    const deuda = Storage.getDeudas().find(d => d.id === deudaEditandoId);
    if (!deuda) return;

    if (deuda.paid) {
      const inputFechaPago = document.getElementById('deuda-input-fecha-pago');
      const fechaPagoVal   = inputFechaPago ? inputFechaPago.value : '';

      if (!fechaPagoVal) {
        setFieldError('deuda-input-fecha-pago', 'error-deuda-fecha-pago',
          'Ingresa la fecha real de pago');
        return;
      }

      // Fix 7: parseFechaLocal (componentes locales)
      const nuevaFechaPago = parseFechaLocal(fechaPagoVal);

      Storage.updateDeuda(deudaEditandoId, { description: descripcion, paidDate: nuevaFechaPago });

      if (deuda.transactionId) {
        const txs = Storage.getTransactions();
        const idx = txs.findIndex(t => t.id === deuda.transactionId);
        if (idx !== -1) { txs[idx].date = nuevaFechaPago; Storage.saveTransactions(txs); }
      }

    } else {
      const monto   = parseFloat(document.getElementById('deuda-input-monto').value);
      const persona = document.getElementById('deuda-input-persona').value.trim();
      const fecha   = document.getElementById('deuda-input-fecha').value;

      let hayError = false;
      if (!monto || monto <= 0) {
        setFieldError('deuda-input-monto', 'error-deuda-monto',
          monto < 0 ? 'El monto no puede ser negativo' : 'Ingresa un monto válido mayor a 0');
        hayError = true;
      }
      if (!persona) {
        setFieldError('deuda-input-persona', 'error-deuda-persona', 'El nombre es obligatorio');
        hayError = true;
      }
      if (!fecha) {
        setFieldError('deuda-input-fecha', 'error-deuda-fecha', 'Selecciona la fecha de vencimiento');
        hayError = true;
      }
      if (hayError) return;

      const dueDateISO = parseFechaLocal(fecha);   // Fix 7
      Storage.updateDeuda(deudaEditandoId, {
        amount:      monto,
        person:      persona,
        dueDate:     dueDateISO,
        description: descripcion
      });

      // Fix 5: notificar si la fecha editada ya está vencida
      if (new Date(dueDateISO) < new Date()) {
        const user = Storage.getUser();
        _notificarDeudaVencida(persona, monto, user.symbol);
      }
    }

    cerrarModalDeuda();
    renderDeudas();
    Toast.success('Deuda actualizada', 'Los cambios fueron guardados correctamente.');

  } else {
    const monto   = parseFloat(document.getElementById('deuda-input-monto').value);
    const persona = document.getElementById('deuda-input-persona').value.trim();
    const fecha   = document.getElementById('deuda-input-fecha').value;

    let hayError = false;
    if (!monto || monto <= 0) {
      setFieldError('deuda-input-monto', 'error-deuda-monto',
        monto < 0 ? 'El monto no puede ser negativo' : 'Ingresa un monto válido mayor a 0');
      hayError = true;
    }
    if (!persona) {
      setFieldError('deuda-input-persona', 'error-deuda-persona', 'El nombre es obligatorio');
      hayError = true;
    }
    if (!fecha) {
      setFieldError('deuda-input-fecha', 'error-deuda-fecha', 'Selecciona la fecha de vencimiento');
      hayError = true;
    }
    if (hayError) return;

    const dueDateISO = parseFechaLocal(fecha);   // Fix 7

    Storage.addDeuda({
      id:          Date.now().toString(),
      amount:      monto,
      person:      persona,
      dueDate:     dueDateISO,
      description: descripcion,
      paid:        false,
      date:        new Date().toISOString()
    });

    // Fix 5: notificar inmediatamente si la fecha ya pasó
    if (new Date(dueDateISO) < new Date()) {
      const user = Storage.getUser();
      _notificarDeudaVencida(persona, monto, user.symbol);
    }

    cerrarModalDeuda();
    renderDeudas();

    const user = Storage.getUser();
    Toast.success('Deuda creada', `Deuda con ${persona} de ${user.symbol}${monto.toFixed(2)} registrada.`);
  }
}