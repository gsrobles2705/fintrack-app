// actividad.js
// Responsabilidad: mostrar historial completo

let ordenAscendente = false;

function renderActividad() {
  const user = Storage.getUser();
  const transactions = Storage.getTransactions();

  // Avatar
  document.getElementById('actividad-avatar')
    .textContent = user.name.charAt(0).toUpperCase();

  // Saldo total — FIX: usa símbolo gráfico, no código ISO
  const balance = calcularBalanceTotal(transactions);
  const saldoEl = document.getElementById('actividad-saldo');
  saldoEl.textContent =
    `${user.symbol} ${Math.abs(balance).toFixed(2)}`;
  saldoEl.className = 'actividad-saldo' +
    (balance < 0 ? ' negativo' : '');

  // Lista agrupada por fecha — FIX: pasa símbolo
  renderListaAgrupada(transactions, user.symbol);
}

function calcularBalanceTotal(transactions) {
  return transactions.reduce((total, t) => {
    return t.type === 'ingreso'
      ? total + t.amount
      : total - t.amount;
  }, 0);
}

function renderListaAgrupada(transactions, currency) {
  const container = document.getElementById('actividad-lista');

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Aún no tienes transacciones.<br>
        Registra tu primera operación
      </div>`;
    return;
  }

  // Ordena
  const ordenadas = [...transactions].sort((a, b) => {
    return ordenAscendente
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date);
  });

  // Agrupa por fecha
  const grupos = {};
  ordenadas.forEach(t => {
    const label = formatDate(t.date);
    if (!grupos[label]) grupos[label] = [];
    grupos[label].push(t);
  });

  // Renderiza grupos
  container.innerHTML = Object.entries(grupos).map(
    ([fecha, items]) => `
      <div class="fecha-grupo">
        <p class="fecha-grupo-label">${fecha.toUpperCase()}</p>
        ${items.map(t => renderTransaccionItem(t, currency))
          .join('')}
      </div>
    `
  ).join('');
}

function renderTransaccionItem(t, currency) {
  return `
    <div class="transaction-item-swipeable">
      <div class="transaction-icon">
        ${getCategoryIcon(t.category)}
      </div>
      <div class="transaction-info">
        <p class="transaction-name">
          ${capitalize(t.category)}
        </p>
        <p class="transaction-date">
          ${formatTime(t.date)}
        </p>
      </div>
      <span class="transaction-amount ${t.type}">
        ${t.type === 'gasto' ? '-' : '+'} ${currency}${t.amount.toFixed(2)}
      </span>
      <button class="btn-eliminar" 
              onclick="eliminarTransaccion('${t.id}')">
        ✕
      </button>
    </div>
  `;
}

let txAEliminar = null;

function eliminarTransaccion(id) {
  txAEliminar = id;

  const transactions = Storage.getTransactions();
  const tx = transactions.find(t => t.id === id);
  const esDeuda = tx && tx.category === 'deuda';

  const modal = document.getElementById('modal-eliminar-tx');
  const titulo = modal.querySelector('.modal-title');
  const subtitulo = modal.querySelector('.modal-subtitle');

  if (esDeuda) {
    titulo.textContent = 'Eliminar pago de deuda';
    subtitulo.textContent =
      'Esta acción devolverá la deuda a pendiente y el monto regresará a tu saldo.';
  } else {
    titulo.textContent = 'Eliminar transacción';
    subtitulo.textContent = 'Esta acción no se puede deshacer.';
  }

  modal.style.display = 'flex';
  document.getElementById('btn-confirmar-eliminar-tx')
    .onclick = confirmarEliminarTx;
}

function confirmarEliminarTx() {
  if (!txAEliminar) return;

  const deudas = Storage.getDeudas();
  const deudaVinculada = deudas.find(d => d.transactionId === txAEliminar);
  if (deudaVinculada) {
    Storage.updateDeuda(deudaVinculada.id, {
      paid: false,
      paidDate: null,
      transactionId: null
    });
  }

  Storage.deleteTransaction(txAEliminar);
  txAEliminar = null;
  cerrarModalEliminarTx();
  renderActividad();
}

function cerrarModalEliminarTx() {
  document.getElementById('modal-eliminar-tx').style.display = 'none';
  txAEliminar = null;
}

function toggleFiltro() {
  ordenAscendente = !ordenAscendente;
  renderActividad();
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}