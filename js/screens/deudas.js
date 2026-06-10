// deudas.js - versión definitiva con Cuentas por Cobrar / Pagar y lógica de saldo

let editingDebtId   = null;
let debtOptionsId   = null;
let payingDebtId    = null;

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function parseDateDisplay(isoStr) {
  if (!isoStr) return new Date();
  const [year, month, day] = isoStr.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return new Date(isoStr);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function renderDeudas() {
  const user = Storage.getUser();
  const debts = Storage.getDebts();
  const symbol = user.symbol;
  document.getElementById('deudas-avatar').textContent = user.name.charAt(0).toUpperCase();

  const porPagar = debts.filter(d => !d.paid && d.tipo === 'por_pagar');
  const porCobrar = debts.filter(d => !d.paid && d.tipo === 'por_cobrar');
  const paid = debts.filter(d => d.paid);

  const total = porPagar.reduce((s, d) => s + d.amount, 0) + porCobrar.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById('deudas-total');
  totalEl.textContent = `${symbol} ${total.toFixed(2)}`;
  totalEl.className = total === 0 ? 'deudas-total sin-deudas' : 'deudas-total';

  document.getElementById('deudas-empty').style.display = debts.length === 0 ? 'block' : 'none';

  document.getElementById('deudas-por-pagar-container').innerHTML = porPagar.map(d => renderDebtCard(d, symbol, false, 'por_pagar')).join('');
  document.getElementById('deudas-por-cobrar-container').innerHTML = porCobrar.map(d => renderDebtCard(d, symbol, false, 'por_cobrar')).join('');
  const paidSection = document.getElementById('deudas-pagadas-section');
  paidSection.style.display = paid.length > 0 ? 'block' : 'none';
  document.getElementById('deudas-pagadas-container').innerHTML = paid.map(d => renderDebtCard(d, symbol, true, d.tipo)).join('');
}

function renderDebtCard(debt, currency, isPaid, tipo) {
  const dueDate = parseDateDisplay(debt.dueDate);
  const isOverdue = !isPaid && dueDate < new Date();
  const dueDateStr = dueDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  let datesHtml = '';
  if (isPaid && debt.paidDate) {
    const paidDate = parseDateDisplay(debt.paidDate);
    const paidDateStr = paidDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
    const onTime = paidDate <= dueDate;
    const tag = onTime ? `<span class="deuda-tag ok">A tiempo</span>` : `<span class="deuda-tag tarde">Con retraso</span>`;
    datesHtml = `<div class="deuda-fechas-pagada"><div class="deuda-fecha">Fecha límite: ${dueDateStr}</div><div class="deuda-fecha">Pagada el: ${paidDateStr} ${tag}</div></div>`;
  } else {
    datesHtml = `<div class="deuda-fecha ${isOverdue ? 'vencida' : ''}">${isOverdue ? 'Venció:' : 'Vence:'} ${dueDateStr}</div>`;
  }
  const tipoLabel = tipo === 'por_pagar' ? 'Me prestaron' : 'Presté';
  return `
    <div class="deuda-card ${isPaid ? 'pagada' : ''}">
      <div class="deuda-card-header">
        <div>
          <p class="deuda-persona">${escapeHtml(debt.person)}</p>
          ${debt.description ? `<p class="deuda-descripcion">${escapeHtml(debt.description)}</p>` : ''}
          <span class="deuda-tipo-badge ${tipo}">${tipoLabel}</span>
        </div>
        <button class="btn-deuda-menu" onclick="showDebtOptions('${debt.id}')">⋮</button>
      </div>
      <p class="deuda-monto ${isPaid ? 'pagada' : ''}">${currency} ${debt.amount.toFixed(2)}</p>
      <div class="deuda-card-footer">
        ${datesHtml}
        ${!isPaid ? `<div class="deuda-acciones"><button class="btn-pagar" onclick="payDebt('${debt.id}')">Pagar</button></div>` : `<div class="deuda-pagada-badge">Pagada</div>`}
      </div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ---- OPCIONES DE DEUDA ----
function showDebtOptions(id) {
  debtOptionsId = id;
  const debt = Storage.getDebts().find(d => d.id === id);
  const user = Storage.getUser();
  const symbol = user.symbol;
  const titleEl = document.getElementById('modal-opciones-titulo');
  titleEl.textContent = debt ? debt.person : 'Opciones';
  let subtitleEl = document.getElementById('modal-opciones-subtitulo');
  if (!subtitleEl) {
    subtitleEl = document.createElement('p');
    subtitleEl.id = 'modal-opciones-subtitulo';
    subtitleEl.className = 'modal-subtitle';
    titleEl.insertAdjacentElement('afterend', subtitleEl);
  }
  if (debt) {
    const desc = debt.description ? ` · ${debt.description}` : '';
    subtitleEl.textContent = `${symbol} ${debt.amount.toFixed(2)}${desc}`;
    subtitleEl.style.display = 'block';
  } else {
    subtitleEl.style.display = 'none';
  }
  const buttonsEl = document.getElementById('modal-opciones-botones');
  buttonsEl.innerHTML = debt?.paid
    ? `
      <button class="btn-primary btn-verde" onclick="editFromOptions()">Editar deuda</button>
      <button class="btn-primary btn-eliminar-pago" onclick="removePaymentFromOptions()">Eliminar pago</button>
      <button class="btn-primary btn-rojo" onclick="deleteDebtFromOptions()">Eliminar deuda</button>
      <button class="btn-ghost" onclick="closeDebtOptions()">Cancelar</button>`
    : `
      <button class="btn-primary btn-verde" onclick="editFromOptions()">Editar deuda</button>
      <button class="btn-primary btn-rojo" onclick="deleteDebtFromOptions()">Eliminar deuda</button>
      <button class="btn-ghost" onclick="closeDebtOptions()">Cancelar</button>`;
  document.getElementById('modal-opciones-deuda').style.display = 'flex';
}

function editFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();
  showDebtModal(id);
}

async function removePaymentFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();
  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt || !debt.paid) return;
  const ok = await AppConfirm({ titulo: 'Eliminar pago', mensaje: 'La deuda volverá a estar pendiente y el monto se eliminará del historial.', tipo: 'warning', btnOk: 'Sí, eliminar pago' });
  if (!ok) return;
  if (debt.transactionId) Storage.deleteTransaction(debt.transactionId);
  Storage.updateDebt(id, { paid: false, paidDate: null, transactionId: null });
  renderDeudas();
  Toast.info('Pago eliminado', 'La deuda volvió a estado pendiente.');
}

async function deleteDebtFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();
  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt) return;
  const ok = await AppConfirm({ titulo: 'Eliminar deuda', mensaje: `Se eliminará la deuda con ${debt.person} de forma permanente.${debt.paid ? ' El pago vinculado también se eliminará.' : ''}`, tipo: 'danger', btnOk: 'Sí, eliminar' });
  if (!ok) return;
  if (debt.paid && debt.transactionId) Storage.deleteTransaction(debt.transactionId);
  Storage.deleteDebt(id);
  renderDeudas();
  Toast.success('Deuda eliminada', `La deuda con ${debt.person} fue eliminada.`);
}

function closeDebtOptions() {
  closeModal('modal-opciones-deuda');
  debtOptionsId = null;
}

// ---- PAGAR DEUDA ----
function payDebt(id) {
  payingDebtId = id;
  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt) return;
  const user = Storage.getUser();
  document.getElementById('modal-pago-texto').textContent = `¿Marcar la deuda con ${debt.person} (${user.symbol}${debt.amount.toFixed(2)}) como pagada?`;
  document.getElementById('modal-confirmar-pago').style.display = 'flex';
}

function confirmPayment() {
  if (!payingDebtId) return;
  const debt = Storage.getDebts().find(d => d.id === payingDebtId);
  if (!debt) return;
  // Transacción contraria para corregir saldo
  const transaction = {
    id: Date.now().toString(),
    type: debt.tipo === 'por_pagar' ? 'gasto' : 'ingreso',
    amount: debt.amount,
    category: debt.tipo === 'por_pagar' ? 'pago_prestamo' : 'cobro_prestamo',
    categoryLabel: debt.tipo === 'por_pagar' ? 'Pago de préstamo' : 'Cobro de préstamo',
    categoryIcon: 'deuda',
    date: new Date().toISOString()
  };
  Storage.addTransaction(transaction);
  Storage.updateDebt(payingDebtId, { paid: true, paidDate: new Date().toISOString(), transactionId: transaction.id });
  closePayModal();
  renderDeudas();
  Toast.success('Actualizado', 'El saldo se ha ajustado correctamente.');
  vibrate(50);
}

function closePayModal() {
  closeModal('modal-confirmar-pago');
  payingDebtId = null;
}

// ---- MODAL NUEVA/EDITAR DEUDA ----
function showDebtModal(id = null) {
  editingDebtId = id;
  ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha', 'deuda-input-descripcion', 'deuda-input-fecha-pago'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.value = '';
  });
  _clearDebtErrors();
  const amountInput = document.getElementById('deuda-input-monto');
  if (amountInput) amountInput.placeholder = `${getCurrencySymbol()} 0.00`;
  const titleEl = document.getElementById('modal-deuda-titulo');
  const subtitleEl = document.getElementById('modal-deuda-subtitulo');
  const paidDateWrap = document.getElementById('deuda-fecha-pago-wrap');
  const tipoRadios = document.querySelectorAll('input[name="debt-type"]');
  if (tipoRadios.length) {
    tipoRadios.forEach(r => r.disabled = false);
    document.querySelector('input[name="debt-type"][value="por_pagar"]').checked = true;
  }

  if (id) {
    const debt = Storage.getDebts().find(d => d.id === id);
    if (!debt) return;
    if (debt.paid) {
      titleEl.textContent = 'Editar Deuda Pagada';
      if (subtitleEl) { subtitleEl.textContent = 'Solo puedes editar la descripción y la fecha real de pago.'; subtitleEl.style.display = 'block'; }
      document.getElementById('deuda-input-monto').value = debt.amount;
      document.getElementById('deuda-input-persona').value = debt.person;
      document.getElementById('deuda-input-fecha').value = debt.dueDate.split('T')[0];
      document.getElementById('deuda-input-monto').disabled = true;
      document.getElementById('deuda-input-persona').disabled = true;
      document.getElementById('deuda-input-fecha').disabled = true;
      if (tipoRadios.length) tipoRadios.forEach(r => r.disabled = true);
      document.getElementById('deuda-input-descripcion').value = debt.description || '';
      if (paidDateWrap) paidDateWrap.style.display = 'block';
      const inputPaidDate = document.getElementById('deuda-input-fecha-pago');
      if (inputPaidDate && debt.paidDate) inputPaidDate.value = debt.paidDate.split('T')[0];
    } else {
      titleEl.textContent = 'Editar Deuda';
      if (subtitleEl) subtitleEl.style.display = 'none';
      document.getElementById('deuda-input-monto').disabled = false;
      document.getElementById('deuda-input-persona').disabled = false;
      document.getElementById('deuda-input-fecha').disabled = false;
      if (tipoRadios.length) tipoRadios.forEach(r => r.disabled = false);
      document.getElementById('deuda-input-monto').value = debt.amount;
      document.getElementById('deuda-input-persona').value = debt.person;
      document.getElementById('deuda-input-fecha').value = debt.dueDate.split('T')[0];
      document.getElementById('deuda-input-descripcion').value = debt.description || '';
      if (paidDateWrap) paidDateWrap.style.display = 'none';
      // Seleccionar el radio correcto
      if (tipoRadios.length) {
        document.querySelector(`input[name="debt-type"][value="${debt.tipo}"]`).checked = true;
      }
    }
  } else {
    titleEl.textContent = 'Nueva Deuda';
    if (subtitleEl) subtitleEl.style.display = 'none';
    document.getElementById('deuda-input-monto').disabled = false;
    document.getElementById('deuda-input-persona').disabled = false;
    document.getElementById('deuda-input-fecha').disabled = false;
    if (tipoRadios.length) tipoRadios.forEach(r => r.disabled = false);
    if (paidDateWrap) paidDateWrap.style.display = 'none';
  }
  document.getElementById('modal-deuda').style.display = 'flex';
}

function closeDebtModal() {
  _clearDebtErrors();
  ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.disabled = false;
  });
  closeModal('modal-deuda');
  editingDebtId = null;
}

const _DEBT_ERROR_PAIRS = [
  ['deuda-input-monto', 'error-deuda-monto'],
  ['deuda-input-persona', 'error-deuda-persona'],
  ['deuda-input-fecha', 'error-deuda-fecha'],
  ['deuda-input-fecha-pago', 'error-deuda-fecha-pago']
];

function _clearDebtErrors() {
  clearAllFieldErrors(_DEBT_ERROR_PAIRS);
}

function guardarDeuda() {
  _clearDebtErrors();
  const tipoRadio = document.querySelector('input[name="debt-type"]:checked');
  if (!tipoRadio) {
    Toast.error('Selecciona tipo', 'Indica si te prestaron o prestaste.');
    return;
  }
  const tipo = tipoRadio.value;
  const description = document.getElementById('deuda-input-descripcion').value.trim();

  if (editingDebtId) {
    const debt = Storage.getDebts().find(d => d.id === editingDebtId);
    if (!debt) return;
    if (debt.paid) {
      const paidDateValue = document.getElementById('deuda-input-fecha-pago').value;
      if (!paidDateValue) {
        setFieldError('deuda-input-fecha-pago', 'error-deuda-fecha-pago', 'Ingresa la fecha real de pago');
        return;
      }
      const newPaidDate = parseLocalDate(paidDateValue);
      Storage.updateDebt(editingDebtId, { description, paidDate: newPaidDate });
      if (debt.transactionId) {
        const txs = Storage.getTransactions();
        const idx = txs.findIndex(t => t.id === debt.transactionId);
        if (idx !== -1) { txs[idx].date = newPaidDate; Storage.saveTransactions(txs); }
      }
    } else {
      const amount = parseFloat(document.getElementById('deuda-input-monto').value);
      const person = document.getElementById('deuda-input-persona').value.trim();
      const date = document.getElementById('deuda-input-fecha').value;
      let hasError = false;
      if (!amount || amount <= 0) {
        setFieldError('deuda-input-monto', 'error-deuda-monto', amount < 0 ? 'El monto no puede ser negativo' : 'Ingresa un monto mayor a 0');
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
      const dueDateISO = parseLocalDate(date);
      Storage.updateDebt(editingDebtId, { amount, person, dueDate: dueDateISO, description, tipo });
    }
    closeDebtModal();
    renderDeudas();
    Toast.success('Deuda actualizada', 'Los cambios fueron guardados.');
  } else {
    // Nueva deuda
    const amount = parseFloat(document.getElementById('deuda-input-monto').value);
    const person = document.getElementById('deuda-input-persona').value.trim();
    const date = document.getElementById('deuda-input-fecha').value;
    let hasError = false;
    if (!amount || amount <= 0) {
      setFieldError('deuda-input-monto', 'error-deuda-monto', amount < 0 ? 'El monto no puede ser negativo' : 'Ingresa un monto mayor a 0');
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

    const dueDateISO = parseLocalDate(date);
    Storage.addDebt({
      id: Date.now().toString(),
      amount, person, dueDate: dueDateISO, description, tipo,
      paid: false, date: new Date().toISOString()
    });
    // Transacción automática para afectar el saldo real
    const transaction = {
      id: Date.now().toString(),
      type: tipo === 'por_pagar' ? 'ingreso' : 'gasto',
      amount: amount,
      category: tipo === 'por_pagar' ? 'prestamo_recibido' : 'prestamo_otorgado',
      categoryLabel: tipo === 'por_pagar' ? 'Préstamo recibido' : 'Préstamo otorgado',
      categoryIcon: 'deuda',
      date: new Date().toISOString()
    };
    Storage.addTransaction(transaction);
    closeDebtModal();
    renderDeudas();
    Toast.success('Deuda registrada', 'Se actualizó tu saldo.');
  }
}

// Alias globales
window.mostrarModalDeuda = showDebtModal;
window.guardarDeuda = guardarDeuda;
window.cerrarModalDeuda = closeDebtModal;
window.showDebtOptions = showDebtOptions;
window.editFromOptions = editFromOptions;
window.removePaymentFromOptions = removePaymentFromOptions;
window.deleteDebtFromOptions = deleteDebtFromOptions;
window.closeDebtOptions = closeDebtOptions;
window.payDebt = payDebt;
window.confirmarPago = confirmPayment;
window.cerrarModalPago = closePayModal;