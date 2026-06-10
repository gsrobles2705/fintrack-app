// actividad.js - con edición, búsqueda y filtros

let sortAscending = false;
let currentSearch = '';
let currentTypeFilter = 'all';

function renderActividad() {
  // Asegurar que los botones reflejen el filtro actual
  if (document.querySelector('.filter-btn')) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentTypeFilter);
    });
  }

  const user = Storage.getUser();
  let transactions = Storage.getTransactions();
  
  // Aplicar filtros
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

// NUEVO: tarjeta clickeable (sin botón eliminar)
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

// NUEVA MEJORA 5: modal de opciones para editar/eliminar
let pendingTransactionId = null;
function openTransactionOptions(id) {
  pendingTransactionId = id;
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (!tx) return;
  document.getElementById('tx-options-title').textContent = tx.categoryLabel || 'Transacción';
  document.getElementById('tx-options-amount').innerHTML = `${tx.type === 'gasto' ? '-' : '+'} ${getCurrencySymbol()}${tx.amount.toFixed(2)}`;
  document.getElementById('modal-transaction-options').style.display = 'flex';
  vibrate(50); // NUEVA MEJORA 12
}

function editTransaction() {
  const id = pendingTransactionId;
  if (!id) return;
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (tx) {
    closeModal('modal-transaction-options');
    window.editTransactionData = tx;
    window._editingTransactionId = id;
    navigate(SCREENS.REGISTRO);
  }
}

function deleteTransactionFromOptions() {
  const id = pendingTransactionId;
  closeModal('modal-transaction-options');
  deleteTransaction(id);
}

// Función de eliminación original adaptada
function deleteTransaction(id) {
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
    vibrate([100, 50, 100]); // vibración para acción destructiva
  });
}

// NUEVA MEJORA 6: Filtros y búsqueda
function filterTransactions() {
  const searchInput = document.getElementById('search-transaction');
  if (searchInput) currentSearch = searchInput.value;
  // Ya no usamos select, usamos los botones
  renderActividad();
}

// Exponer funciones globales
window.openTransactionOptions = openTransactionOptions;
window.editTransaction = editTransaction;
window.deleteTransactionFromOptions = deleteTransactionFromOptions;
window.filterTransactions = filterTransactions;

// Funciones auxiliares existentes
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
  // Actualizar clases activas en los botones
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type);
  });
  renderActividad();
}