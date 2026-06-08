// actividad.js
// Responsibility: display full transaction history

let sortAscending = false;

function renderActividad() {
  const user         = Storage.getUser();
  const transactions = Storage.getTransactions();

  // Avatar
  document.getElementById('actividad-avatar')
    .textContent = user.name.charAt(0).toUpperCase();

  // Total balance — uses graphic symbol, not ISO code
  const balance = calculateTotalBalance(transactions);
  const balanceEl = document.getElementById('actividad-saldo');
  balanceEl.textContent =
    `${user.symbol} ${Math.abs(balance).toFixed(2)}`;
  balanceEl.className = 'actividad-saldo' +
    (balance < 0 ? ' negativo' : '');

  // List grouped by date — passes symbol
  renderGroupedList(transactions, user.symbol);
}

function calculateTotalBalance(transactions) {
  return transactions.reduce((total, t) => {
    return t.type === 'ingreso'
      ? total + t.amount
      : total - t.amount;
  }, 0);
}

// Alias for compatibility
const calcularBalanceTotal = calculateTotalBalance;

function renderGroupedList(transactions, currency) {
  const container = document.getElementById('actividad-lista');

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Aún no tienes transacciones.<br>
        Registra tu primera operación
      </div>`;
    return;
  }

  // Sort
  const sorted = [...transactions].sort((a, b) => {
    return sortAscending
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date);
  });

  // Group by date
  const groups = {};
  sorted.forEach(t => {
    const label = formatDate(t.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  });

  // Render groups
  container.innerHTML = Object.entries(groups).map(
    ([date, items]) => `
      <div class="fecha-grupo">
        <p class="fecha-grupo-label">${date.toUpperCase()}</p>
        ${items.map(t => renderTransactionItem(t, currency))
          .join('')}
      </div>
    `
  ).join('');
}

function renderTransactionItem(t, currency) {
  // Usar label congelado si existe, sino resolver como antes
  const label = t.categoryLabel || _getLabelCategoria(t.category);
  
  // Obtener el ícono: priorizar categoryIcon congelado
  let icon;
  if (t.categoryIcon) {
    icon = Icons.get(t.categoryIcon);
  } else if (t.category && t.category.startsWith('otro_libre:')) {
    icon = Icons.get('categoria');
  } else {
    icon = getCategoryIcon(t.category);   // esta función existe en home.js, pero aquí no la tenemos importada. Mejor usar getIconoCategoria
    // O bien directamente: icon = Icons.get(getCategoryIconKeyFromId(t.category));
  }
  // Para mantener compatibilidad, usa getIconoCategoria (definida en categorias.js)
  if (!icon) icon = getIconoCategoria(t.category);

  return `
    <div class="transaction-item-swipeable">
      <div class="transaction-icon">${icon}</div>
      <div class="transaction-info">
        <p class="transaction-name">${label}</p>
        <p class="transaction-date">${formatTime(t.date)}</p>
      </div>
      <span class="transaction-amount ${t.type}">
        ${t.type === 'gasto' ? '-' : '+'} ${currency}${t.amount.toFixed(2)}
      </span>
      <button class="btn-eliminar" onclick="deleteTransaction('${t.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M18 6l-12 12" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;
}

let pendingDeleteId = null;

function deleteTransaction(id) {
  pendingDeleteId = id;

  const transactions = Storage.getTransactions();
  const tx           = transactions.find(t => t.id === id);
  const isDebt       = tx && tx.category === 'deuda';

  const modal    = document.getElementById('modal-eliminar-tx');
  const titleEl  = modal.querySelector('.modal-title');
  const subtitleEl = modal.querySelector('.modal-subtitle');

  if (isDebt) {
    titleEl.textContent    = 'Eliminar pago de deuda';
    subtitleEl.textContent =
      'Esta acción devolverá la deuda a pendiente y el monto regresará a tu saldo.';
  } else {
    titleEl.textContent    = 'Eliminar transacción';
    subtitleEl.textContent = 'Esta acción no se puede deshacer.';
  }

  modal.style.display = 'flex';
  document.getElementById('btn-confirmar-eliminar-tx')
    .onclick = confirmDeleteTransaction;
}

// Alias kept so the HTML onclick handler continues to work
const eliminarTransaccion = deleteTransaction;

function confirmDeleteTransaction() {
  if (!pendingDeleteId) return;

  const debts        = Storage.getDebts();
  const linkedDebt   = debts.find(d => d.transactionId === pendingDeleteId);
  if (linkedDebt) {
    Storage.updateDebt(linkedDebt.id, {
      paid:          false,
      paidDate:      null,
      transactionId: null
    });
  }

  Storage.deleteTransaction(pendingDeleteId);
  pendingDeleteId = null;
  closeDeleteModal();
  renderActividad();
}

function closeDeleteModal() {
  closeModal('modal-eliminar-tx');
  pendingDeleteId = null;
}

// Alias for HTML onclick
const cerrarModalEliminarTx = closeDeleteModal;

function toggleFiltro() {
  sortAscending = !sortAscending;
  renderActividad();
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}