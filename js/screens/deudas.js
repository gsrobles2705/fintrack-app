// deudas.js

let editingDebtId   = null;
let debtOptionsId   = null;
let payingDebtId    = null;

// ─────────────────────────────────────────────
// DATE UTILITIES — Fix 7
//
// PROBLEM: new Date("YYYY-MM-DD") interprets the string as
// MIDNIGHT UTC. In UTC-5 (Peru) that equals 19:00 of the
// PREVIOUS day, causing the app to show "23 may" when the
// user chose "24 may".
//
// SOLUTION (local components approach):
//   Extract year, month and day from the string and build the Date
//   with the multi-argument constructor → always LOCAL timezone.
//   Noon (12h) is used as the reference time so no real offset
//   (UTC-12 … UTC+14) shifts the date.
// ─────────────────────────────────────────────

/** Converts "YYYY-MM-DD" → ISO string with local date at noon. */
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  // Local constructor: does not depend on UTC
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

/**
 * Converts any ISO string → Date at local noon.
 * Correctly displays dates saved in both the new format (local noon)
 * and the old format (UTC midnight).
 */
function parseDateDisplay(isoStr) {
  if (!isoStr) return new Date();
  const dateParts = isoStr.split('T')[0].split('-').map(Number);
  const [year, month, day] = dateParts;
  if (!year || !month || !day) return new Date(isoStr);
  return new Date(year, month - 1, day, 12, 0, 0);
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function renderDeudas() {
  const user   = Storage.getUser();
  const debts  = Storage.getDebts();
  const symbol = user.symbol;

  const avatarEl = document.getElementById('deudas-avatar');
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  const activeDebts = debts.filter(d => !d.paid);
  const paidDebts   = debts
    .filter(d => d.paid)
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  const total   = activeDebts.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById('deudas-total');
  totalEl.textContent = `${symbol} ${total.toFixed(2)}`;
  totalEl.className   = total === 0 ? 'deudas-total sin-deudas' : 'deudas-total';

  document.getElementById('deudas-empty').style.display =
    debts.length === 0 ? 'block' : 'none';

  document.getElementById('deudas-activas-container').innerHTML =
    activeDebts.map(d => renderDebtCard(d, symbol, false)).join('');

  const paidSection = document.getElementById('deudas-pagadas-section');
  paidSection.style.display = paidDebts.length > 0 ? 'block' : 'none';
  document.getElementById('deudas-pagadas-container').innerHTML =
    paidDebts.map(d => renderDebtCard(d, symbol, true)).join('');
}

// ─────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────

const CALENDAR_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/>
    <path d="M16 3v4M8 3v4M4 11h16M11 15h1M12 15v3"/>
  </svg>`;

function renderDebtCard(debt, currency, isPaid) {
  // Fix 7: use parseDateDisplay to avoid UTC offset on display
  const dueDate    = parseDateDisplay(debt.dueDate);
  const isOverdue  = !isPaid && dueDate < new Date();
  const dueDateStr = dueDate.toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  let datesHtml = '';

  if (isPaid && debt.paidDate) {
    const paidDate    = parseDateDisplay(debt.paidDate);   // Fix 7
    const paidDateStr = paidDate.toLocaleDateString('es-PE', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const onTime = paidDate <= dueDate;
    const tag    = onTime
      ? `<span class="deuda-tag ok">A tiempo</span>`
      : `<span class="deuda-tag tarde">Con retraso</span>`;

    datesHtml = `
      <div class="deuda-fechas-pagada">
        <div class="deuda-fecha">${CALENDAR_ICON} Fecha límite: ${dueDateStr}</div>
        <div class="deuda-fecha">${CALENDAR_ICON} Pagada el: ${paidDateStr} ${tag}</div>
      </div>`;
  } else {
    datesHtml = `
      <div class="deuda-fecha ${isOverdue ? 'vencida' : ''}">
        ${CALENDAR_ICON}
        ${isOverdue ? 'Venció:' : 'Vence:'} ${dueDateStr}
      </div>`;
  }

  return `
    <div class="deuda-card ${isPaid ? 'pagada' : ''}">
      <div class="deuda-card-header">
        <div>
          <p class="deuda-persona">${debt.person}</p>
          ${debt.description
            ? `<p class="deuda-descripcion">${debt.description}</p>`
            : ''}
        </div>
        <button class="btn-deuda-menu" onclick="showDebtOptions('${debt.id}')">
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

      <p class="deuda-monto ${isPaid ? 'pagada' : ''}">
        ${currency} ${debt.amount.toFixed(2)}
      </p>

      <div class="deuda-card-footer">
        ${datesHtml}
        ${!isPaid ? `
          <div class="deuda-acciones">
            <button class="btn-pagar" onclick="payDebt('${debt.id}')">Pagar</button>
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
// OPTIONS MODAL
// ─────────────────────────────────────────────

function showDebtOptions(id) {
  debtOptionsId = id;
  const debt   = Storage.getDebts().find(d => d.id === id);
  const user   = Storage.getUser();
  const symbol = user.symbol;

  const titleEl = document.getElementById('modal-opciones-titulo');
  titleEl.textContent = debt ? debt.person : 'Opciones';

  let subtitleEl = document.getElementById('modal-opciones-subtitulo');
  if (!subtitleEl) {
    subtitleEl           = document.createElement('p');
    subtitleEl.id        = 'modal-opciones-subtitulo';
    subtitleEl.className = 'modal-subtitle';
    titleEl.insertAdjacentElement('afterend', subtitleEl);
  }
  if (debt) {
    const desc                  = debt.description ? ` · ${debt.description}` : '';
    subtitleEl.textContent      = `${symbol} ${debt.amount.toFixed(2)}${desc}`;
    subtitleEl.style.display    = 'block';
  } else {
    subtitleEl.style.display = 'none';
  }

  const buttonsEl = document.getElementById('modal-opciones-botones');
  buttonsEl.innerHTML = debt?.paid
    ? `
      <button class="btn-primary btn-verde" onclick="editFromOptions()">
        Editar deuda
      </button>
      <button class="btn-primary btn-eliminar-pago" onclick="removePaymentFromOptions()">
        Eliminar pago
      </button>
      <button class="btn-primary btn-rojo" onclick="deleteDebtFromOptions()">
        Eliminar deuda
      </button>
      <button class="btn-ghost" onclick="closeDebtOptions()">Cancelar</button>`
    : `
      <button class="btn-primary btn-verde" onclick="editFromOptions()">
        Editar deuda
      </button>
      <button class="btn-primary btn-rojo" onclick="deleteDebtFromOptions()">
        Eliminar deuda
      </button>
      <button class="btn-ghost" onclick="closeDebtOptions()">Cancelar</button>`;

  document.getElementById('modal-opciones-deuda').style.display = 'flex';
}

// Alias for HTML onclick handlers
const opcionesDeuda = showDebtOptions;

function editFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();
  showDebtModal(id);
}

// Alias
const editarDesdeOpciones = editFromOptions;

// Fix 3: async function using corrected AppConfirm from toast.js
async function removePaymentFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();

  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt || !debt.paid) return;

  const ok = await AppConfirm({
    titulo:    'Eliminar pago',
    mensaje:   'La deuda volverá a estar pendiente y el monto se eliminará del historial.',
    tipo:      'warning',
    btnOk:     'Sí, eliminar pago',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;

  if (debt.transactionId) Storage.deleteTransaction(debt.transactionId);
  Storage.updateDebt(id, { paid: false, paidDate: null, transactionId: null });
  renderDeudas();
  Toast.info('Pago eliminado', 'La deuda volvió a estado pendiente.');
}

// Alias
const eliminarPagoDesdeOpciones = removePaymentFromOptions;

// Fix 6: same fix as above
async function deleteDebtFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();

  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt) return;

  const ok = await AppConfirm({
    titulo:    'Eliminar deuda',
    mensaje:   `Se eliminará la deuda con ${debt.person} de forma permanente.${
      debt.paid ? ' El pago vinculado también se eliminará del historial.' : ''}`,
    tipo:      'danger',
    btnOk:     'Sí, eliminar',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;

  if (debt.paid && debt.transactionId) Storage.deleteTransaction(debt.transactionId);
  Storage.deleteDebt(id);
  renderDeudas();
  Toast.success('Deuda eliminada', `La deuda con ${debt.person} fue eliminada.`);
}

// Alias
const eliminarDeudaDesdeOpciones = deleteDebtFromOptions;

function closeDebtOptions() {
  closeModal('modal-opciones-deuda');
  debtOptionsId = null;
}

// Alias
const cerrarModalOpciones = closeDebtOptions;

// ─────────────────────────────────────────────
// PAY MODAL
// ─────────────────────────────────────────────

function payDebt(id) {
  payingDebtId = id;
  const debt   = Storage.getDebts().find(d => d.id === id);
  if (!debt) return;
  const user   = Storage.getUser();
  const symbol = user.symbol;
  document.getElementById('modal-pago-texto').textContent =
    `¿Marcar la deuda de ${debt.person} ` +
    `(${symbol} ${debt.amount.toFixed(2)}) como pagada? ` +
    `Se registrará como gasto.`;
  document.getElementById('modal-confirmar-pago').style.display = 'flex';
}

// Alias
const pagarDeuda = payDebt;

function confirmPayment() {
  if (!payingDebtId) return;
  const debt = Storage.getDebts().find(d => d.id === payingDebtId);
  if (!debt) return;

  const transaction = {
    id: Date.now().toString(),
    type: 'gasto',
    amount: debt.amount,
    category: 'deuda',
    categoryLabel: 'Pago de deuda',
    categoryIcon: 'deuda',
    date: new Date().toISOString()
  };

  Storage.addTransaction(transaction);
  Storage.updateDebt(payingDebtId, {
    paid:          true,
    paidDate:      new Date().toISOString(),
    transactionId: transaction.id
  });

  const user   = Storage.getUser();
  const symbol = user.symbol;
  closePayModal();
  renderDeudas();
  Toast.success(
    'Deuda saldada',
    `Pago de ${symbol}${debt.amount.toFixed(2)} a ${debt.person} registrado.`
  );
}

// Alias
const confirmarPago = confirmPayment;

function closePayModal() {
  closeModal('modal-confirmar-pago');
  payingDebtId = null;
}

// Alias
const cerrarModalPago = closePayModal;

// ─────────────────────────────────────────────
// NEW / EDIT DEBT MODAL
// ─────────────────────────────────────────────

function showDebtModal(id = null) {
  editingDebtId = id;

  ['deuda-input-monto', 'deuda-input-persona',
   'deuda-input-fecha', 'deuda-input-descripcion',
   'deuda-input-fecha-pago'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.value = '';
  });
  _clearDebtErrors();

  // Fix 4: placeholder with dynamic symbol of the active currency
  const amountInput = document.getElementById('deuda-input-monto');
  if (amountInput) {
    const symbol = getCurrencySymbol();
    amountInput.placeholder = `${symbol} 0.00`;
  }

  const titleEl       = document.getElementById('modal-deuda-titulo');
  const subtitleEl    = document.getElementById('modal-deuda-subtitulo');
  const paidDateWrap  = document.getElementById('deuda-fecha-pago-wrap');

  if (id) {
    const debt = Storage.getDebts().find(d => d.id === id);
    if (!debt) return;

    if (debt.paid) {
      titleEl.textContent = 'Editar Deuda Pagada';
      if (subtitleEl) {
        subtitleEl.textContent   = 'Solo puedes editar la descripción y la fecha real de pago.';
        subtitleEl.style.display = 'block';
      }

      const inputAmountEl  = document.getElementById('deuda-input-monto');
      const inputPersonEl  = document.getElementById('deuda-input-persona');
      const inputDateEl    = document.getElementById('deuda-input-fecha');

      inputAmountEl.value    = debt.amount;
      inputPersonEl.value    = debt.person;
      inputDateEl.value      = debt.dueDate.split('T')[0];
      inputAmountEl.disabled = true;
      inputPersonEl.disabled = true;
      inputDateEl.disabled   = true;

      document.getElementById('deuda-input-descripcion').value = debt.description || '';

      if (paidDateWrap) paidDateWrap.style.display = 'block';
      const inputPaidDate = document.getElementById('deuda-input-fecha-pago');
      if (inputPaidDate && debt.paidDate) {
        inputPaidDate.value = debt.paidDate.split('T')[0];
      }

    } else {
      titleEl.textContent = 'Editar Deuda';
      if (subtitleEl) subtitleEl.style.display = 'none';

      ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
        const el = document.getElementById(elId);
        if (el) el.disabled = false;
      });

      document.getElementById('deuda-input-monto').value       = debt.amount;
      document.getElementById('deuda-input-persona').value     = debt.person;
      document.getElementById('deuda-input-fecha').value       = debt.dueDate.split('T')[0];
      document.getElementById('deuda-input-descripcion').value = debt.description || '';

      if (paidDateWrap) paidDateWrap.style.display = 'none';
    }

  } else {
    titleEl.textContent = 'Nueva Deuda';
    if (subtitleEl) subtitleEl.style.display = 'none';

    ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
      const el = document.getElementById(elId);
      if (el) el.disabled = false;
    });

    if (paidDateWrap) paidDateWrap.style.display = 'none';
  }

  document.getElementById('modal-deuda').style.display = 'flex';
}

// Aliases
const mostrarModalDeuda = showDebtModal;

function closeDebtModal() {
  _clearDebtErrors();
  ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.disabled = false;
  });
  closeModal('modal-deuda');
  editingDebtId = null;
}

// Alias
const cerrarModalDeuda = closeDebtModal;

// ─── Inline error helpers ─────────────────────────────────────────

const _DEBT_ERROR_PAIRS = [
  ['deuda-input-monto',      'error-deuda-monto'],
  ['deuda-input-persona',    'error-deuda-persona'],
  ['deuda-input-fecha',      'error-deuda-fecha'],
  ['deuda-input-fecha-pago', 'error-deuda-fecha-pago']
];

function _clearDebtErrors() {
  clearAllFieldErrors(_DEBT_ERROR_PAIRS);
}

// ─────────────────────────────────────────────
// Fix 5: immediate notification if the new debt is already overdue
// ─────────────────────────────────────────────
function _notifyOverdueDebt(person, amount, symbol) {
  const today = new Date();
  today.toDateString(); // force evaluation

  // Avoid duplicating if already notified today for this person+amount
  const alreadyExists = Storage.getNotifications().some(n =>
    n.titulo === '🔴 Deuda con fecha vencida' &&
    n.mensaje.includes(person) &&
    new Date(n.isoDate).toDateString() === today.toDateString()
  );
  if (alreadyExists) return;

  agregarNotificacion(
    NOTIF_TIPO.DANGER,
    '🔴 Deuda con fecha vencida',
    `La deuda registrada con ${person} (${symbol}${amount.toFixed(2)}) ya se encuentra vencida.`
  );
}

// ─────────────────────────────────────────────
// SAVE DEBT
// ─────────────────────────────────────────────

function guardarDeuda() {
  _clearDebtErrors();

  const description = document.getElementById('deuda-input-descripcion').value.trim();

  if (editingDebtId) {
    const debt = Storage.getDebts().find(d => d.id === editingDebtId);
    if (!debt) return;

    if (debt.paid) {
      const inputPaidDate  = document.getElementById('deuda-input-fecha-pago');
      const paidDateValue  = inputPaidDate ? inputPaidDate.value : '';

      if (!paidDateValue) {
        setFieldError('deuda-input-fecha-pago', 'error-deuda-fecha-pago',
          'Ingresa la fecha real de pago');
        return;
      }

      // Fix 7: parseLocalDate (local components)
      const newPaidDate = parseLocalDate(paidDateValue);

      Storage.updateDebt(editingDebtId, { description, paidDate: newPaidDate });

      if (debt.transactionId) {
        const txs = Storage.getTransactions();
        const idx = txs.findIndex(t => t.id === debt.transactionId);
        if (idx !== -1) { txs[idx].date = newPaidDate; Storage.saveTransactions(txs); }
      }

    } else {
      const amount  = parseFloat(document.getElementById('deuda-input-monto').value);
      const person  = document.getElementById('deuda-input-persona').value.trim();
      const date    = document.getElementById('deuda-input-fecha').value;

      let hasError = false;
      if (!amount || amount <= 0) {
        setFieldError('deuda-input-monto', 'error-deuda-monto',
          amount < 0 ? 'El monto no puede ser negativo' : 'Ingresa un monto válido mayor a 0');
        hasError = true;
      }
      if (!person) {
        setFieldError('deuda-input-persona', 'error-deuda-persona', 'El nombre es obligatorio');
        hasError = true;
      }
      if (!date) {
        setFieldError('deuda-input-fecha', 'error-deuda-fecha', 'Selecciona la fecha de vencimiento');
        hasError = true;
      }
      if (hasError) return;

      const dueDateISO = parseLocalDate(date);   // Fix 7
      Storage.updateDebt(editingDebtId, {
        amount,
        person,
        dueDate:     dueDateISO,
        description
      });

      // Fix 5: notify if the edited date is already past
      if (new Date(dueDateISO) < new Date()) {
        const user = Storage.getUser();
        _notifyOverdueDebt(person, amount, user.symbol);
      }
    }

    closeDebtModal();
    renderDeudas();
    Toast.success('Deuda actualizada', 'Los cambios fueron guardados correctamente.');

  } else {
    const amount  = parseFloat(document.getElementById('deuda-input-monto').value);
    const person  = document.getElementById('deuda-input-persona').value.trim();
    const date    = document.getElementById('deuda-input-fecha').value;

    let hasError = false;
    if (!amount || amount <= 0) {
      setFieldError('deuda-input-monto', 'error-deuda-monto',
        amount < 0 ? 'El monto no puede ser negativo' : 'Ingresa un monto válido mayor a 0');
      hasError = true;
    }
    if (!person) {
      setFieldError('deuda-input-persona', 'error-deuda-persona', 'El nombre es obligatorio');
      hasError = true;
    }
    if (!date) {
      setFieldError('deuda-input-fecha', 'error-deuda-fecha', 'Selecciona la fecha de vencimiento');
      hasError = true;
    }
    if (hasError) return;

    const dueDateISO = parseLocalDate(date);   // Fix 7

    Storage.addDebt({
      id:          Date.now().toString(),
      amount,
      person,
      dueDate:     dueDateISO,
      description,
      paid:        false,
      date:        new Date().toISOString()
    });

    // Fix 5: notify immediately if the date has already passed
    if (new Date(dueDateISO) < new Date()) {
      const user = Storage.getUser();
      _notifyOverdueDebt(person, amount, user.symbol);
    }

    closeDebtModal();
    renderDeudas();

    const user = Storage.getUser();
    Toast.success('Deuda creada', `Deuda con ${person} de ${user.symbol}${amount.toFixed(2)} registrada.`);
  }
}