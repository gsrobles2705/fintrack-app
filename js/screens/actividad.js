// actividad.js - con edición, búsqueda y filtros

let sortAscending = false;
let currentSearch = '';
let currentTypeFilter = 'all';

// Categorías que pertenecen al sistema de deudas (no editables desde aquí)
const DEBT_CATEGORIES = new Set([
  'prestamo_recibido', 'prestamo_otorgado',
  'pago_prestamo', 'cobro_prestamo'
]);

function renderActividad() {
  // Sync dropdown label
  const labels = { all: 'Todos', gasto: 'Gastos', ingreso: 'Ingresos' };
  const labelEl = document.getElementById('filter-dropdown-label');
  if (labelEl) labelEl.textContent = labels[currentTypeFilter] || 'Todos';
  document.querySelectorAll('.filter-dropdown-item').forEach(el => {
    el.classList.toggle('active', el.dataset.value === currentTypeFilter);
  });

  const user = Storage.getUser();
  let transactions = Storage.getTransactions();

  if (currentSearch) {
    const lower = currentSearch.toLowerCase();
    transactions = transactions.filter(t =>
      (t.categoryLabel || '').toLowerCase().includes(lower) ||
      (t.category || '').toLowerCase().includes(lower)
    );
  }
  if (currentTypeFilter !== 'all') {
    transactions = transactions.filter(t => t.type === currentTypeFilter);
  }

  document.getElementById('actividad-avatar').textContent = user.name.charAt(0).toUpperCase();
  const balance = calculateTotalBalance(transactions);
  const balanceEl = document.getElementById('actividad-saldo');
  balanceEl.textContent = `${user.symbol} ${Math.abs(balance).toFixed(2)}`;
  balanceEl.className = 'actividad-saldo' + (balance < 0 ? ' negativo' : '');
  renderGroupedList(transactions, user.symbol);
}

function calculateTotalBalance(transactions) {
  return transactions.reduce((total, t) => t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);
}

function renderGroupedList(transactions, currency) {
  const container = document.getElementById('actividad-lista');
  if (transactions.length === 0) {
    container.innerHTML = `<div class="empty-state">No hay transacciones que coincidan con tu búsqueda.<br>Prueba otro filtro.</div>`;
    return;
  }
  const sorted = [...transactions].sort((a, b) => sortAscending ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
  const groups = {};
  sorted.forEach(t => {
    const label = formatDate(t.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  });
  container.innerHTML = Object.entries(groups).map(([date, items]) => `
    <div class="fecha-grupo">
      <p class="fecha-grupo-label">${date.toUpperCase()}</p>
      ${items.map(t => renderTransactionItem(t, currency)).join('')}
    </div>
  `).join('');
}

function renderTransactionItem(t, currency) {
  const label = t.categoryLabel || _getLabelCategoria(t.category);
  let icon;
  if (t.categoryIcon) icon = Icons.get(t.categoryIcon);
  else if (t.category && t.category.startsWith('otro_libre:')) icon = Icons.get('categoria');
  else icon = getIconoCategoria(t.category);
  if (!icon) icon = Icons.get('categoria');
  return `
    <div class="transaction-item" data-id="${t.id}" onclick="openTransactionOptions('${t.id}')">
      <div class="transaction-icon">${icon}</div>
      <div class="transaction-info">
        <p class="transaction-name">${label}</p>
        <p class="transaction-date">${formatTime(t.date)}</p>
      </div>
      <span class="transaction-amount ${t.type}">
        ${t.type === 'gasto' ? '-' : '+'} ${currency}${t.amount.toFixed(2)}
      </span>
    </div>
  `;
}

// ─── Modal de opciones ────────────────────────────────────────────
let pendingTransactionId = null;

function openTransactionOptions(id) {
  pendingTransactionId = id;
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (!tx) return;

  const isDebt = DEBT_CATEGORIES.has(tx.category);
  const titleEl = document.getElementById('tx-options-title');
  const amountEl = document.getElementById('tx-options-amount');

  // Título: para deudas mostrar solo el nombre; para normales mostrar "Categoría: ..."
  if (isDebt) {
    // Buscar la deuda vinculada para mostrar el nombre de la persona
    const allDebts = Storage.getDebts();
    const linked = allDebts.find(d => d.transactionId === id) ||
                   allDebts.find(d =>
                     d.date && Math.abs(new Date(d.date) - new Date(tx.date)) < 2000
                   );
    titleEl.textContent = linked ? linked.person : (tx.categoryLabel || 'Transacción');
  } else {
    titleEl.textContent = `Categoría: ${tx.categoryLabel || _getLabelCategoria(tx.category)}`;
  }

  amountEl.textContent = `${tx.type === 'gasto' ? '-' : '+'} ${getCurrencySymbol()}${tx.amount.toFixed(2)}`;

  const modal = document.getElementById('modal-transaction-options');

  // Botones según tipo
  const btnArea = modal.querySelector('.modal-card');
  // Limpiar botones anteriores dinámicos
  btnArea.querySelectorAll('.tx-opt-btn').forEach(b => b.remove());

  if (isDebt) {
    // Deuda: solo redirigir a Deudas para editar, o eliminar con advertencia especial
    const editBtn = _makeTxBtn('btn-primary btn-verde tx-opt-btn', 'Ir a Deudas para editar', () => {
      closeModal('modal-transaction-options');
      navigate(SCREENS.DEUDAS);
    });
    const delBtn = _makeTxBtn('btn-primary btn-rojo tx-opt-btn', 'Eliminar', () => {
      closeModal('modal-transaction-options');
      deleteDebtTransaction(id, tx);
    });
    const cancelBtn = _makeTxBtn('btn-ghost tx-opt-btn', 'Cancelar', () => closeModal('modal-transaction-options'));
    btnArea.appendChild(editBtn);
    btnArea.appendChild(delBtn);
    btnArea.appendChild(cancelBtn);
  } else {
    const editBtn = _makeTxBtn('btn-primary tx-opt-btn', 'Editar', () => {
      closeModal('modal-transaction-options', () => openEditModal(id));
    });
    const delBtn = _makeTxBtn('btn-primary btn-rojo tx-opt-btn', 'Eliminar', () => {
      closeModal('modal-transaction-options');
      deleteTransactionConfirm(id);
    });
    const cancelBtn = _makeTxBtn('btn-ghost tx-opt-btn', 'Cancelar', () => closeModal('modal-transaction-options'));
    btnArea.appendChild(editBtn);
    btnArea.appendChild(delBtn);
    btnArea.appendChild(cancelBtn);
  }

  modal.style.display = 'flex';
  // Cerrar al tocar fuera
  modal.onclick = (e) => { if (e.target === modal) closeModal('modal-transaction-options'); };
  vibrate(50);
}

function _makeTxBtn(classes, text, handler) {
  const btn = document.createElement('button');
  btn.className = classes;
  btn.textContent = text;
  btn.onclick = handler;
  return btn;
}

// ─── Eliminar transacción de deuda con advertencia específica ─────
async function deleteDebtTransaction(id, tx) {
  const allDebts = Storage.getDebts();

  // Transacciones de creación de préstamo (prestamo_recibido / prestamo_otorgado)
  if (tx.category === 'prestamo_recibido' || tx.category === 'prestamo_otorgado') {
    // Buscar deuda vinculada por fecha aproximada (creadas juntas)
    const linked = allDebts.find(d =>
      !d.paid && Math.abs(new Date(d.date) - new Date(tx.date)) < 3000
    );
    const detalles = linked
      ? `${linked.person}${linked.description ? ' · ' + linked.description : ''} · Vence ${parseDateDisplay(linked.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';
    const ok = await AppConfirm({
      titulo: 'Eliminar préstamo',
      mensaje: `Esta acción eliminará el préstamo${detalles ? ': ' + detalles : ''}. La deuda asociada también se eliminará permanentemente.`,
      tipo: 'danger',
      btnOk: 'Sí, eliminar'
    });
    if (!ok) return;
    if (linked) Storage.deleteDebt(linked.id);
    Storage.deleteTransaction(id);
    renderActividad();
    Toast.success('Eliminado', 'El préstamo fue eliminado.');
    vibrate([100, 50, 100]);
    return;
  }

  // Transacciones de pago/cobro de deuda (pago_prestamo / cobro_prestamo)
  if (tx.category === 'pago_prestamo' || tx.category === 'cobro_prestamo') {
    const linked = allDebts.find(d => d.transactionId === id);
    const detalles = linked
      ? `${linked.person}${linked.description ? ' · ' + linked.description : ''} · Fecha límite ${parseDateDisplay(linked.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';
    const ok = await AppConfirm({
      titulo: 'Eliminar pago',
      mensaje: `Esta acción dejará la deuda${detalles ? ' de ' + detalles : ''} en estado pendiente.`,
      tipo: 'warning',
      btnOk: 'Sí, eliminar pago'
    });
    if (!ok) return;
    if (linked) Storage.updateDebt(linked.id, { paid: false, paidDate: null, transactionId: null });
    Storage.deleteTransaction(id);
    renderActividad();
    Toast.info('Pago eliminado', 'La deuda volvió a estado pendiente.');
    vibrate([100, 50, 100]);
  }
}

// ─── Editar transacción normal (modal inline) ─────────────────────
let _editIconKey = null;

function openEditModal(id) {
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (!tx) return;

  _editType    = tx.type;
  _editIconKey = tx.categoryIcon || 'categoria';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-edit-tx';
  overlay.style.display = 'flex';

  const symbol = getCurrencySymbol();
  overlay.innerHTML = `
    <div class="modal-card" style="max-height:88vh;overflow-y:auto">
      <h3 class="modal-title">Editar transacción</h3>
      <p class="modal-subtitle">Modifica los valores y guarda.</p>

      <div style="display:flex;gap:8px;margin-bottom:4px;">
        <button class="toggle-btn ${tx.type === 'gasto' ? 'active gasto' : ''}" id="edit-btn-gasto" onclick="setEditType('gasto')" style="flex:1">Gasto</button>
        <button class="toggle-btn ${tx.type === 'ingreso' ? 'active ingreso' : ''}" id="edit-btn-ingreso" onclick="setEditType('ingreso')" style="flex:1">Ingreso</button>
      </div>

      <input type="number" id="edit-tx-amount" class="input-field" placeholder="${symbol} 0.00"
        value="${tx.amount}" min="0.01" step="0.01">

      <input type="text" id="edit-tx-label" class="input-field" placeholder="Categoría / descripción"
        value="${tx.categoryLabel || _getLabelCategoria(tx.category)}" maxlength="30">

      <p class="registro-label" style="margin-bottom:8px">ÍCONO</p>
      <div class="icon-picker-grid" id="edit-icon-grid"></div>

      <button class="btn-primary" onclick="saveEditedTransaction('${id}')">Guardar cambios</button>
      <button class="btn-ghost" onclick="closeModal('modal-edit-tx', () => document.getElementById('modal-edit-tx')?.remove())">Cancelar</button>
    </div>`;

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal('modal-edit-tx', () => overlay.remove());
    }
  };

  document.body.appendChild(overlay);
  _renderEditIconPicker();
}

function _renderEditIconPicker() {
  const grid = document.getElementById('edit-icon-grid');
  if (!grid) return;
  let lastGroup = '';
  let html = '';
  for (const icon of ICONS_CATALOG) {
    if (icon.group !== lastGroup) {
      if (lastGroup !== '') html += `<div class="icon-group-divider"></div>`;
      html += `<div class="icon-group-label">${icon.group}</div>`;
      lastGroup = icon.group;
    }
    html += `<button class="icon-picker-btn ${icon.key === _editIconKey ? 'selected' : ''}"
      onclick="selectEditIcon('${icon.key}')" title="${icon.label}">
      ${Icons.get(icon.key)}
    </button>`;
  }
  grid.innerHTML = html;
}

function selectEditIcon(key) {
  _editIconKey = key;
  _renderEditIconPicker();
}
window.selectEditIcon = selectEditIcon;

let _editType = null;
function setEditType(type) {
  _editType = type;
  const gBtn = document.getElementById('edit-btn-gasto');
  const iBtn = document.getElementById('edit-btn-ingreso');
  if (!gBtn || !iBtn) return;
  gBtn.className = `toggle-btn ${type === 'gasto' ? 'active gasto' : ''}`;
  iBtn.className = `toggle-btn ${type === 'ingreso' ? 'active ingreso' : ''}`;
}

function saveEditedTransaction(id) {
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (!tx) return;
  const amount = parseFloat(document.getElementById('edit-tx-amount').value);
  const label  = document.getElementById('edit-tx-label').value.trim();
  const type   = _editType || tx.type;

  if (!amount || amount <= 0) {
    Toast.error('Monto inválido', 'Ingresa un monto mayor a 0.');
    return;
  }
  if (!label) {
    Toast.error('Descripción requerida', 'Escribe una categoría o descripción.');
    return;
  }

  Storage.updateTransaction(id, {
    type,
    amount,
    categoryLabel: label,
    categoryIcon:  _editIconKey || tx.categoryIcon || 'categoria',
    date: tx.date
  });

  const overlay = document.getElementById('modal-edit-tx');
  if (overlay) {
    closeModal('modal-edit-tx', () => overlay.remove());
  }
  Storage.updateStreak(true);
  renderActividad();
  Toast.success('Transacción actualizada', '');
}

// ─── Eliminar transacción normal ──────────────────────────────────
function deleteTransactionConfirm(id) {
  AppConfirm({
    titulo: 'Eliminar transacción',
    mensaje: '¿Estás seguro? Esta acción no se puede deshacer.',
    tipo: 'danger',
    btnOk: 'Eliminar'
  }).then(ok => {
    if (!ok) return;
    const debts = Storage.getDebts();
    const linkedDebt = debts.find(d => d.transactionId === id);
    if (linkedDebt) {
      Storage.updateDebt(linkedDebt.id, { paid: false, paidDate: null, transactionId: null });
    }
    Storage.deleteTransaction(id);
    renderActividad();
    Toast.success('Eliminado', 'La transacción fue eliminada.');
    vibrate([100, 50, 100]);
  });
}

// Mantener alias legacy (usados desde index.html)
function editTransaction() {
  const id = pendingTransactionId;
  if (!id) return;
  closeModal('modal-transaction-options', () => openEditModal(id));
}

function deleteTransactionFromOptions() {
  const id = pendingTransactionId;
  closeModal('modal-transaction-options');
  deleteTransactionConfirm(id);
}

// ─── Filtros y búsqueda ───────────────────────────────────────────
function filterTransactions() {
  const searchInput = document.getElementById('search-transaction');
  if (searchInput) currentSearch = searchInput.value;
  renderActividad();
}

window.openTransactionOptions = openTransactionOptions;
window.editTransaction = editTransaction;
window.deleteTransactionFromOptions = deleteTransactionFromOptions;
window.filterTransactions = filterTransactions;
window.saveEditedTransaction = saveEditedTransaction;
window.setEditType = setEditType;

function toggleFiltro() {
  sortAscending = !sortAscending;
  renderActividad();
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function setTypeFilter(type) {
  currentTypeFilter = type;
  const labels = { all: 'Todos', gasto: 'Gastos', ingreso: 'Ingresos' };
  const labelEl = document.getElementById('filter-dropdown-label');
  if (labelEl) labelEl.textContent = labels[type] || 'Todos';
  // Update active item style
  document.querySelectorAll('.filter-dropdown-item').forEach(el => {
    el.classList.toggle('active', el.dataset.value === type);
  });
  _closeFilterDropdown();
  renderActividad();
}

// AGREGAR estas funciones nuevas:
function toggleFilterDropdown() {
  const menu = document.getElementById('filter-dropdown-menu');
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  isOpen ? _closeFilterDropdown() : _openFilterDropdown();
}

function _openFilterDropdown() {
  const menu = document.getElementById('filter-dropdown-menu');
  const btn  = document.getElementById('filter-dropdown-btn');
  if (!menu) return;
  menu.style.display = 'block';
  btn && btn.classList.add('open');
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', _filterOutsideHandler, { once: true });
  }, 0);
}

function _closeFilterDropdown() {
  const menu = document.getElementById('filter-dropdown-menu');
  const btn  = document.getElementById('filter-dropdown-btn');
  if (menu) menu.style.display = 'none';
  btn && btn.classList.remove('open');
}

function _filterOutsideHandler(e) {
  const wrap = document.getElementById('filter-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) _closeFilterDropdown();
}