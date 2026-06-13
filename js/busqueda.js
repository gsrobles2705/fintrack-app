// busqueda.js — Búsqueda global (transacciones + deudas)

function abrirBusquedaGlobal() {
  const modal = document.getElementById('modal-busqueda-global');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('busqueda-global-resultados').innerHTML = '';
  setTimeout(() => document.getElementById('busqueda-global-input')?.focus(), 100);
  vibrate(30);
}

function cerrarBusquedaGlobal() {
  closeModal('modal-busqueda-global', () => {
    const input = document.getElementById('busqueda-global-input');
    if (input) input.value = '';
    const res = document.getElementById('busqueda-global-resultados');
    if (res) res.innerHTML = '';
  });
}

function buscarGlobal(query) {
  const container = document.getElementById('busqueda-global-resultados');
  if (!container) return;
  const q = query.trim().toLowerCase();
  if (q.length < 2) { container.innerHTML = ''; return; }

  const user = Storage.getUser();
  const symbol = user?.symbol || 'S/';
  const transactions = Storage.getTransactions();
  const debts = Storage.getDebts();

  const txResults = transactions.filter(t =>
    (t.categoryLabel || '').toLowerCase().includes(q) ||
    (t.category || '').toLowerCase().includes(q)
  ).slice(0, 6);

  const debtResults = debts.filter(d =>
    (d.person || '').toLowerCase().includes(q) ||
    (d.description || '').toLowerCase().includes(q)
  ).slice(0, 4);

  if (txResults.length === 0 && debtResults.length === 0) {
    container.innerHTML = `<div class="busqueda-empty">Sin resultados para "${query}"</div>`;
    return;
  }

  let html = '';

  if (txResults.length > 0) {
    html += `<p class="busqueda-seccion-label">TRANSACCIONES</p>`;
    html += txResults.map(t => {
      const label = t.categoryLabel || t.category || 'Otro';
      const date  = new Date(t.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
      const sign  = t.type === 'gasto' ? '-' : '+';
      const cls   = t.type;
      const icon  = Icons.get(t.categoryIcon || 'categoria');
      return `<div class="busqueda-result-item" onclick="cerrarBusquedaGlobal();navigate(SCREENS.ACTIVIDAD)">
        <div class="transaction-icon" style="width:36px;height:36px">${icon}</div>
        <div class="transaction-info">
          <p class="transaction-name">${_highlight(label, q)}</p>
          <p class="transaction-date">${date}</p>
        </div>
        <span class="transaction-amount ${cls}">${sign}${symbol}${t.amount.toFixed(2)}</span>
      </div>`;
    }).join('');
  }

  if (debtResults.length > 0) {
    html += `<p class="busqueda-seccion-label" style="margin-top:12px">DEUDAS</p>`;
    html += debtResults.map(d => {
      const due  = new Date(d.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
      const cls  = d.paid ? 'var(--text-tertiary)' : (d.tipo === 'por_cobrar' ? 'var(--accent-green)' : 'var(--accent-red)');
      return `<div class="busqueda-result-item" onclick="cerrarBusquedaGlobal();navigate(SCREENS.DEUDAS)">
        <div class="transaction-icon" style="width:36px;height:36px">${Icons.get('deuda')}</div>
        <div class="transaction-info">
          <p class="transaction-name">${_highlight(d.person, q)}</p>
          <p class="transaction-date">${d.description ? d.description + ' · ' : ''}Vence ${due}</p>
        </div>
        <span class="transaction-amount" style="color:${cls}">${symbol}${d.amount.toFixed(2)}</span>
      </div>`;
    }).join('');
  }

  container.innerHTML = html;
}

function _highlight(text, query) {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    `<mark style="background:rgba(80,200,120,0.25);color:inherit;border-radius:2px">${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length);
}

window.abrirBusquedaGlobal = abrirBusquedaGlobal;
window.cerrarBusquedaGlobal = cerrarBusquedaGlobal;
window.buscarGlobal = buscarGlobal;