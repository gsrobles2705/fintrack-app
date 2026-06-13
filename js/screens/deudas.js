// deudas.js

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

  const porPagar  = debts.filter(d => !d.paid && d.tipo === 'por_pagar');
  const porCobrar = debts.filter(d => !d.paid && d.tipo === 'por_cobrar');
  const paid      = debts.filter(d => d.paid);

  const total = porPagar.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById('deudas-total');
  totalEl.textContent = `${symbol} ${total.toFixed(2)}`;
  totalEl.className = total === 0 ? 'deudas-total sin-deudas' : 'deudas-total';

  document.getElementById('deudas-empty').style.display = debts.length === 0 ? 'block' : 'none';

  document.getElementById('deudas-por-pagar-container').innerHTML =
    porPagar.map(d => renderDebtCard(d, symbol, false)).join('');
  document.getElementById('deudas-por-cobrar-container').innerHTML =
    porCobrar.map(d => renderDebtCard(d, symbol, false)).join('');

  const paidSection = document.getElementById('deudas-pagadas-section');
  paidSection.style.display = paid.length > 0 ? 'block' : 'none';
  document.getElementById('deudas-pagadas-container').innerHTML =
    paid.map(d => renderDebtCard(d, symbol, true)).join('');

  // Attach swipe-to-pay on active cards
  setTimeout(() => _attachDebtSwipe(), 50);
}

function renderDebtCard(debt, currency, isPaid) {
  const tipo = debt.tipo;
  const isCobrar = tipo === 'por_cobrar';
  const dueDate = parseDateDisplay(debt.dueDate);
  const isOverdue = !isPaid && dueDate < new Date();
  const dueDateStr = dueDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });

  let datesHtml = '';
  if (isPaid && debt.paidDate) {
    const paidDate = parseDateDisplay(debt.paidDate);
    const paidDateStr = paidDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
    const onTime = paidDate <= dueDate;
    const tag = onTime
      ? `<span class="deuda-tag ok">A tiempo</span>`
      : `<span class="deuda-tag tarde">Con retraso</span>`;
    datesHtml = `<div class="deuda-fechas-pagada">
      <div class="deuda-fecha">Fecha límite: ${dueDateStr}</div>
      <div class="deuda-fecha">Pagada el: ${paidDateStr} ${tag}</div>
    </div>`;
  } else {
    datesHtml = `<div class="deuda-fecha ${isOverdue ? 'vencida' : ''}">${isOverdue ? 'Venció:' : 'Vence:'} ${dueDateStr}</div>`;
  }

  const tipoLabel = isCobrar ? 'Presté' : 'Me prestaron';
  const montoClass = isPaid ? 'pagada' : (isCobrar ? 'cobrar' : '');
  let accionHtml = '';
  if (!isPaid) {
    const btnLabel = isCobrar ? 'Cobrar' : 'Pagar';
    accionHtml = `<div class="deuda-acciones">
      <button class="btn-pagar ${isCobrar ? 'btn-cobrar' : ''}" onclick="payDebt('${debt.id}')">${btnLabel}</button>
    </div>`;
  } else {
    accionHtml = `<div class="deuda-pagada-badge">Pagada</div>`;
  }

  return `
    <div class="deuda-card ${isPaid ? 'pagada' : ''}" data-id="${debt.id}">
      <div class="deuda-card-header">
        <div>
          <p class="deuda-persona">${escapeHtml(debt.person)}</p>
          ${debt.description ? `<p class="deuda-descripcion">${escapeHtml(debt.description)}</p>` : ''}
          <span class="deuda-tipo-badge ${tipo}">${tipoLabel}</span>
        </div>
        <button class="btn-deuda-menu" onclick="showDebtOptions('${debt.id}')">⋮</button>
      </div>
      <p class="deuda-monto ${montoClass}">${currency} ${debt.amount.toFixed(2)}</p>
      <div class="deuda-card-footer">
        ${datesHtml}
        ${accionHtml}
      </div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m =>
    m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;'
  );
}

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
    ? `<button class="btn-primary btn-verde" onclick="editFromOptions()">Editar deuda</button>
       <button class="btn-primary btn-eliminar-pago" onclick="removePaymentFromOptions()">Eliminar pago</button>
       <button class="btn-primary btn-rojo" onclick="deleteDebtFromOptions()">Eliminar deuda</button>
       <button class="btn-ghost" onclick="closeDebtOptions()">Cancelar</button>`
    : `<button class="btn-primary btn-verde" onclick="editFromOptions()">Editar deuda</button>
       <button class="btn-primary btn-rojo" onclick="deleteDebtFromOptions()">Eliminar deuda</button>
       <button class="btn-ghost" onclick="closeDebtOptions()">Cancelar</button>`;

  const modal = document.getElementById('modal-opciones-deuda');
  modal.style.display = 'flex';
  modal.onclick = (e) => { if (e.target === modal) closeDebtOptions(); };
}

function editFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();
  navigate(SCREENS.DEUDAS);
  setTimeout(() => showDebtModal(id), 80);
}

async function removePaymentFromOptions() {
  const id = debtOptionsId;
  closeDebtOptions();
  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt || !debt.paid) return;
  const dueDateStr = parseDateDisplay(debt.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  const desc = debt.description ? ` · ${debt.description}` : '';
  const ok = await AppConfirm({
    titulo: 'Eliminar pago',
    mensaje: `La deuda de ${debt.person}${desc} · Fecha límite ${dueDateStr} volverá a estado pendiente y el monto se eliminará del historial.`,
    tipo: 'warning',
    btnOk: 'Sí, eliminar pago'
  });
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
  const dueDateStr = parseDateDisplay(debt.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  const desc = debt.description ? ` · ${debt.description}` : '';
  const extra = debt.paid ? ' El pago vinculado también se eliminará.' : '';
  const ok = await AppConfirm({
    titulo: 'Eliminar deuda',
    mensaje: `Esta acción eliminará la deuda: ${debt.person}${desc} · ${dueDateStr}.${extra}`,
    tipo: 'danger',
    btnOk: 'Sí, eliminar'
  });
  if (!ok) return;
  if (debt.paid && debt.transactionId) Storage.deleteTransaction(debt.transactionId);
  const allTx = Storage.getTransactions();
  const creationTx = allTx.find(t =>
    (t.category === 'prestamo_recibido' || t.category === 'prestamo_otorgado') &&
    (t.debtId === debt.id || Math.abs(new Date(t.date) - new Date(debt.date)) < 3000)
  );
  if (creationTx) Storage.deleteTransaction(creationTx.id);
  Storage.deleteDebt(id);
  renderDeudas();
  Toast.success('Deuda eliminada', `La deuda con ${debt.person} fue eliminada.`);
}

function closeDebtOptions() {
  closeModal('modal-opciones-deuda');
  debtOptionsId = null;
}

function payDebt(id) {
  payingDebtId = id;
  const debt = Storage.getDebts().find(d => d.id === id);
  if (!debt) return;
  const user = Storage.getUser();
  const verb = debt.tipo === 'por_cobrar' ? 'cobrar' : 'pagar';
  document.getElementById('modal-pago-texto').textContent =
    `¿Marcar la deuda con ${debt.person} (${user.symbol}${debt.amount.toFixed(2)}) como ${verb === 'cobrar' ? 'cobrada' : 'pagada'}?`;

  // Cambiar el texto del botón según el tipo
  const confirmBtn = document.querySelector('#modal-confirmar-pago .btn-primary');
  if (confirmBtn) {
    confirmBtn.textContent = debt.tipo === 'por_cobrar' ? 'Sí, ya cobré' : 'Sí, ya pagué';
  }

  const modal = document.getElementById('modal-confirmar-pago');
  modal.style.display = 'flex';
  modal.onclick = (e) => { if (e.target === modal) closePayModal(); };
}

function confirmPayment() {
  if (!payingDebtId) return;
  const debt = Storage.getDebts().find(d => d.id === payingDebtId);
  if (!debt) return;

  const transaction = {
    id: Date.now().toString(),
    type: debt.tipo === 'por_pagar' ? 'gasto' : 'ingreso',
    amount: debt.amount,
    category: debt.tipo === 'por_pagar' ? 'pago_prestamo' : 'cobro_prestamo',
    categoryLabel: debt.tipo === 'por_pagar' ? `Pago a ${debt.person}` : `Cobro de ${debt.person}`,
    categoryIcon: 'deuda',
    date: new Date().toISOString(),
    debtId: debt.id  // Enlazar con la deuda
  };
  Storage.addTransaction(transaction);
  Storage.updateDebt(payingDebtId, {
    paid: true,
    paidDate: new Date().toISOString(),
    transactionId: transaction.id
  });
  closePayModal();
  Toast.success('Deuda liquidada', '¡Has cumplido con tu compromiso! 🎉');
  if (window.Haptics) Haptics.payment(); else if (navigator.vibrate) navigator.vibrate(50);

  // Celebración: brillo verde → elevación → fade → luego mover a pagadas
  setTimeout(() => {
    const debtCard = document.querySelector(`.deuda-card[data-id="${payingDebtId}"]`);
    if (debtCard) {
      // Fase 1: glow + lift
      debtCard.style.transition = 'box-shadow 0.25s ease, border-color 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)';
      debtCard.style.boxShadow = '0 0 0 2px var(--accent-green), 0 0 24px rgba(80,200,120,0.5)';
      debtCard.style.borderColor = 'var(--accent-green)';
      debtCard.style.transform = 'translateY(-4px) scale(1.015)';

      // Fase 2: bajar suave
      setTimeout(() => {
        debtCard.style.transition = 'box-shadow 0.35s ease, transform 0.35s ease, opacity 0.3s ease';
        debtCard.style.transform = 'translateY(0) scale(1)';
        debtCard.style.boxShadow = '0 0 8px rgba(80,200,120,0.2)';

        // Fase 3: fade out y re-render
        setTimeout(() => {
          debtCard.style.opacity = '0';
          setTimeout(() => renderDeudas(), 320);
        }, 350);
      }, 650);
    } else {
      renderDeudas();
    }
  }, 60);
}

function closePayModal() {
  closeModal('modal-confirmar-pago');
  payingDebtId = null;
}

function showDebtModal(id = null) {
  editingDebtId = id;
  ['deuda-input-monto', 'deuda-input-persona', 'deuda-input-fecha',
   'deuda-input-descripcion', 'deuda-input-fecha-pago'].forEach(elId => {
    const el = document.getElementById(elId);
    if (el) el.value = '';
  });
  _clearDebtErrors();

  const amountInput = document.getElementById('deuda-input-monto');
  if (amountInput) amountInput.placeholder = `${getCurrencySymbol()} 0.00`;

  const titleEl      = document.getElementById('modal-deuda-titulo');
  const subtitleEl   = document.getElementById('modal-deuda-subtitulo');
  const paidDateWrap = document.getElementById('deuda-fecha-pago-wrap');
  const tipoRadios   = document.querySelectorAll('input[name="debt-type"]');

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
      document.getElementById('deuda-input-monto').value   = debt.amount;
      document.getElementById('deuda-input-persona').value = debt.person;
      document.getElementById('deuda-input-fecha').value   = debt.dueDate.split('T')[0];
      document.getElementById('deuda-input-monto').disabled   = true;
      document.getElementById('deuda-input-persona').disabled = true;
      document.getElementById('deuda-input-fecha').disabled   = true;
      if (tipoRadios.length) tipoRadios.forEach(r => r.disabled = true);
      document.getElementById('deuda-input-descripcion').value = debt.description || '';
      if (paidDateWrap) paidDateWrap.style.display = 'block';
      const inputPaidDate = document.getElementById('deuda-input-fecha-pago');
      if (inputPaidDate && debt.paidDate) inputPaidDate.value = debt.paidDate.split('T')[0];
    } else {
      titleEl.textContent = 'Editar Deuda';
      if (subtitleEl) subtitleEl.style.display = 'none';
      document.getElementById('deuda-input-monto').disabled   = false;
      document.getElementById('deuda-input-persona').disabled = false;
      document.getElementById('deuda-input-fecha').disabled   = false;
      if (tipoRadios.length) tipoRadios.forEach(r => r.disabled = false);
      document.getElementById('deuda-input-monto').value   = debt.amount;
      document.getElementById('deuda-input-persona').value = debt.person;
      document.getElementById('deuda-input-fecha').value   = debt.dueDate.split('T')[0];
      document.getElementById('deuda-input-descripcion').value = debt.description || '';
      if (paidDateWrap) paidDateWrap.style.display = 'none';
      if (tipoRadios.length) {
        const radio = document.querySelector(`input[name="debt-type"][value="${debt.tipo}"]`);
        if (radio) radio.checked = true;
      }
    }
  } else {
    titleEl.textContent = 'Nueva Deuda';
    if (subtitleEl) subtitleEl.style.display = 'none';
    document.getElementById('deuda-input-monto').disabled   = false;
    document.getElementById('deuda-input-persona').disabled = false;
    document.getElementById('deuda-input-fecha').disabled   = false;
    if (tipoRadios.length) tipoRadios.forEach(r => r.disabled = false);
    if (paidDateWrap) paidDateWrap.style.display = 'none';
  }

  const modal = document.getElementById('modal-deuda');
  modal.style.display = 'flex';
  modal.onclick = (e) => { if (e.target === modal) closeDebtModal(); };
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
  ['deuda-input-monto',      'error-deuda-monto'],
  ['deuda-input-persona',    'error-deuda-persona'],
  ['deuda-input-fecha',      'error-deuda-fecha'],
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
  const tipo        = tipoRadio.value;
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
      const date   = document.getElementById('deuda-input-fecha').value;
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
    const amount = parseFloat(document.getElementById('deuda-input-monto').value);
    const person = document.getElementById('deuda-input-persona').value.trim();
    const date   = document.getElementById('deuda-input-fecha').value;
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
    const newDebtId  = Date.now().toString();
    const debtDate   = new Date().toISOString();

    Storage.addDebt({
      id: newDebtId, amount, person, dueDate: dueDateISO, description, tipo,
      paid: false, date: debtDate
    });

    const txLabel = tipo === 'por_pagar'
      ? `Préstamo de ${person}`
      : `Préstamo a ${person}`;
    const transaction = {
      id: (Date.now() + 1).toString(),
      type:          tipo === 'por_pagar' ? 'ingreso' : 'gasto',
      amount,
      category:      tipo === 'por_pagar' ? 'prestamo_recibido' : 'prestamo_otorgado',
      categoryLabel: txLabel,
      categoryIcon:  'deuda',
      date:          debtDate,
      debtId:        newDebtId   // Enlazar con la deuda
    };
    Storage.addTransaction(transaction);
    closeDebtModal();
    renderDeudas();
    Toast.success('Deuda registrada', 'Se actualizó tu saldo.');
  }
}

function _attachDebtSwipe() {
  const SWIPE_THRESHOLD = 80;
  document.querySelectorAll('.deuda-card:not(.pagada):not([data-swipe])').forEach(card => {
    card.setAttribute('data-swipe', '1');
    let startX = 0, startY = 0, dragging = false;

    card.style.position = 'relative';
    card.style.overflow = 'hidden';

    card.addEventListener('touchstart', e => {
      e.stopPropagation();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragging = false;
      card.style.transition = 'none';
    }, { passive: false });

    card.addEventListener('touchmove', e => {
      e.stopPropagation();
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
        dragging = true;
        const clamped = Math.min(Math.max(dx, -SWIPE_THRESHOLD * 1.5), SWIPE_THRESHOLD * 1.5);
        card.style.transform = `translateX(${clamped}px)`;
        if (dx > 30) {
          card.style.boxShadow = `0 0 0 2px var(--accent-green), inset 0 0 40px rgba(80,200,120,0.08)`;
        } else {
          card.style.boxShadow = '';
        }
      }
    }, { passive: false });

    card.addEventListener('touchend', e => {
      if (!dragging) return;
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - startX;
      card.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.2s';
      card.style.transform = '';
      card.style.boxShadow = '';

      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        const id = card.dataset.id;
        if (!id) return;
        if (dx > SWIPE_THRESHOLD) {
          // Derecha → pagar
          if (window.Haptics) Haptics.medium(); else if (navigator.vibrate) navigator.vibrate(50);
          payDebt(id);
        } else if (dx < -SWIPE_THRESHOLD) {
          // Izquierda → opciones (editar)
          if (window.Haptics) Haptics.light(); else if (navigator.vibrate) navigator.vibrate(30);
          showDebtOptions(id);
        }
      }
    });
  });
}

(function injectDebtStyles() {
  if (document.getElementById('deudas-extra-styles')) return;
  const style = document.createElement('style');
  style.id = 'deudas-extra-styles';
  style.textContent = `
    .deuda-monto.cobrar { color: var(--accent-green); }
    .btn-cobrar {
      background: var(--accent-green-dim) !important;
      border-color: var(--accent-green) !important;
      color: var(--accent-green) !important;
    }
    .btn-cobrar:active { background: var(--accent-green) !important; color: #000 !important; }
    .deuda-tipo-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; letter-spacing: 0.3px; display: inline-block; margin-top: 4px; }
    .deuda-tipo-badge.por_pagar { background: rgba(240,84,84,.12); color: var(--accent-red); }
    .deuda-tipo-badge.por_cobrar { background: rgba(80,200,120,.12); color: var(--accent-green); }
  `;
  document.head.appendChild(style);
})();

window.mostrarModalDeuda      = showDebtModal;
window.guardarDeuda           = guardarDeuda;
window.cerrarModalDeuda       = closeDebtModal;
window.showDebtOptions        = showDebtOptions;
window.editFromOptions        = editFromOptions;
window.removePaymentFromOptions = removePaymentFromOptions;
window.deleteDebtFromOptions  = deleteDebtFromOptions;
window.closeDebtOptions       = closeDebtOptions;
window.payDebt                = payDebt;
window.confirmarPago          = confirmPayment;
window.cerrarModalPago        = closePayModal;