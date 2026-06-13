// actividad.js - con edición, búsqueda y filtros, y sincronización mejorada con deudas
// MEJORA: gráfico de barras para balance mensual cuando filtro = 'all'

let sortAscending = false;
let currentSearch = '';
let currentTypeFilter = 'all';
let actividadView = 'list'; // 'list' | 'chart'
let _chartInstance = null;
let currentChartMonthOffset = 0; // 0 = mes actual, -1 = anterior, etc.
let _barChartInstance = null;
let _pendingChartRender = null;

// Categorías que pertenecen al sistema de deudas (no editables desde aquí)
const DEBT_CATEGORIES = new Set([
  'prestamo_recibido', 'prestamo_otorgado',
  'pago_prestamo', 'cobro_prestamo'
]);

function renderActividad() {
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

  // Toggle buttons
  _renderViewToggle();

  if (actividadView === 'chart') {
    document.getElementById('actividad-lista').style.display = 'none';
    _renderChartView(transactions, user.symbol, currentTypeFilter);
  } else {
    document.getElementById('actividad-lista').style.display = 'block';
    const chartWrap = document.getElementById('actividad-chart-wrap');
    if (chartWrap) chartWrap.style.display = 'none';
    renderGroupedList(transactions, user.symbol);
  }
  updateSortButtonState();
}

function updateSortButtonState() {
  const sortBtn = document.getElementById('sort-btn');
  if (!sortBtn) return;
  if (actividadView === 'chart') {
    sortBtn.classList.remove('show');
    sortBtn.classList.add('hide');
    sortBtn.classList.remove('active');
  } else {
    sortBtn.classList.remove('hide');
    sortBtn.classList.add('show');
    if (sortAscending) {
      sortBtn.classList.add('active');
    } else {
      sortBtn.classList.remove('active');
    }
  }
}

function _renderViewToggle() {
  let toggle = document.getElementById('actividad-view-toggle');
  if (!toggle) {
    const sectionHeader = document.querySelector('#screen-actividad .section-header');
    if (!sectionHeader) return;
    toggle = document.createElement('div');
    toggle.id = 'actividad-view-toggle';
    toggle.className = 'actividad-view-toggle';
    sectionHeader.appendChild(toggle);
  }
  
  toggle.innerHTML = `
    <button class="view-toggle-btn sort-btn ${actividadView === 'list' ? 'show' : 'hide'} ${sortAscending && actividadView === 'list' ? 'active' : ''}" id="sort-btn" onclick="toggleFiltro()">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3l0 18" /><path d="M10 6l-3 -3l-3 3" /><path d="M20 18l-3 3l-3 -3" /><path d="M17 21l0 -18" /></svg>
    </button>
    <button class="view-toggle-btn ${actividadView === 'list' ? 'active' : ''}" id="vtbtn-list" onclick="setActividadView('list')">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/></svg>
    </button>
    <button class="view-toggle-btn ${actividadView === 'chart' ? 'active' : ''}" id="vtbtn-chart" onclick="setActividadView('chart')">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="M12 3v9l4.5 4.5"/></svg>
    </button>
  `;
  
  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) {
    if (actividadView === 'list') {
      sortBtn.classList.remove('hide');
      sortBtn.classList.add('show');
      if (sortAscending) sortBtn.classList.add('active');
    } else {
      sortBtn.classList.remove('show');
      sortBtn.classList.add('hide');
      sortBtn.classList.remove('active');
    }
  }
}

function setActividadView(view) {
  actividadView = view;
  renderActividad();
}
window.setActividadView = setActividadView;

// Función para obtener el mes y año según el offset
function getTargetMonth(offset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  return new Date(year, month, 1);
}

function _renderChartView(transactions, symbol, filterType) {
  // Cancelar cualquier frame pendiente previo
  if (_pendingChartRender) {
    cancelAnimationFrame(_pendingChartRender);
    _pendingChartRender = null;
  }

  // Destruir instancias existentes
  if (_chartInstance) {
    _chartInstance.destroy();
    _chartInstance = null;
  }
  if (_barChartInstance) {
    _barChartInstance.destroy();
    _barChartInstance = null;
  }

  let chartWrap = document.getElementById('actividad-chart-wrap');
  if (!chartWrap) {
    chartWrap = document.createElement('div');
    chartWrap.id = 'actividad-chart-wrap';
    const lista = document.getElementById('actividad-lista');
    lista.insertAdjacentElement('afterend', chartWrap);
  }

  // Limpiar completamente el contenedor (elimina cualquier canvas residual)
  chartWrap.innerHTML = '';
  chartWrap.style.display = 'block';

  // Forzar un pequeño reflow antes de crear nuevos canvas
  chartWrap.offsetHeight;

  // Usar requestAnimationFrame con gestión de cancelación
  _pendingChartRender = requestAnimationFrame(() => {
    if (filterType === 'all') {
      _renderBarChart(transactions, symbol, chartWrap);
    } else {
      _renderDonutChart(transactions, symbol, chartWrap, filterType);
    }
    _pendingChartRender = null;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

function _buildGlassCard(titleText) {
  const card = document.createElement('div');
  card.className = 'chart-glass-card';
  if (titleText) {
    const label = document.createElement('p');
    label.className = 'chart-section-title';
    label.textContent = titleText;
    card.appendChild(label);
  }
  return card;
}

function _buildSummaryRow(items) {
  const row = document.createElement('div');
  row.className = 'chart-summary-cards';
  row.style.marginTop = '0';
  items.forEach(({ label, value, cls }) => {
    row.insertAdjacentHTML('beforeend', `
      <div class="chart-summary-card">
        <span class="summary-label">${label}</span>
        <span class="summary-amount ${cls}">${value}</span>
      </div>`);
  });
  return row;
}

function _buildCustomLegend(labels, colors, values, symbol, total) {
  const wrap = document.createElement('div');
  wrap.className = 'chart-custom-legend';
  labels.forEach((label, i) => {
    const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
    wrap.insertAdjacentHTML('beforeend', `
      <div class="chart-legend-item">
        <span class="chart-legend-dot" style="background:${colors[i]}"></span>
        <span class="chart-legend-label">${label}</span>
        <span class="chart-legend-value">${symbol}${values[i].toFixed(2)}</span>
        <span class="chart-legend-pct">${pct}%</span>
      </div>`);
  });
  return wrap;
}

function _buildTrendBadge(direction, pct) {
  const badge = document.createElement('div');
  badge.className = `chart-trend-badge chart-trend-${direction}`;
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•';
  const label = direction === 'up'
    ? 'Gastos por encima del promedio'
    : direction === 'down'
      ? 'Gastos por debajo del promedio'
      : 'Gastos en el promedio';
  badge.innerHTML = `<span>${arrow} ${pct}%</span><span class="chart-trend-label">${label}</span>`;
  return badge;
}

function _renderBarChart(transactions, symbol, container) {
  // Destruir instancias anteriores
  if (_chartInstance) { _chartInstance.destroy(); _chartInstance = null; }
  if (_barChartInstance) { _barChartInstance.destroy(); _barChartInstance = null; }

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + currentChartMonthOffset, 1);
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  const monthName = targetDate.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  // Filtrar transacciones del mes
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  const incomes = monthTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTx.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const net = incomes - expenses;

  // Mes anterior para comparación
  const prevMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const prevMonthStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1);
  const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0);
  const prevExpenses = transactions
    .filter(t => t.type === 'gasto' && new Date(t.date) >= prevMonthStart && new Date(t.date) <= prevMonthEnd)
    .reduce((s, t) => s + t.amount, 0);

  // Tarjeta de resumen
  const summaryCard = _buildGlassCard(`RESUMEN · ${monthName.toUpperCase()}`);
  summaryCard.appendChild(_buildSummaryRow([
    { label: 'INGRESOS', value: `${symbol}${incomes.toFixed(2)}`, cls: 'ingreso' },
    { label: 'GASTOS',   value: `${symbol}${expenses.toFixed(2)}`, cls: 'gasto' },
    { label: 'BALANCE',  value: `${net >= 0 ? '+' : ''}${symbol}${Math.abs(net).toFixed(2)}`, cls: net >= 0 ? 'positivo' : 'negativo' }
  ]));

  // Tendencia vs mes anterior
  if (prevExpenses > 0) {
    const change = ((expenses - prevExpenses) / prevExpenses) * 100;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•';
    const sign = change > 0 ? '+' : '';
    summaryCard.appendChild(_buildTrendBadge(direction, `${sign}${Math.abs(change).toFixed(1)}`));
  }
  container.appendChild(summaryCard);

  // Controles de navegación
  const navDiv = document.createElement('div');
  navDiv.className = 'chart-month-navbar';
  navDiv.innerHTML = `
    <button class="chart-month-prev" onclick="cambiarMesGrafico(-1)">‹</button>
    <span class="chart-month-name">${monthName}</span>
    <button class="chart-month-next" onclick="cambiarMesGrafico(1)">›</button>
  `;
  container.appendChild(navDiv);

  // Gráfico de barras
  const chartCard = _buildGlassCard('INGRESOS VS GASTOS');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%; height:280px; display:block; margin:0 auto;';
  chartCard.appendChild(canvas);
  container.appendChild(chartCard);

  _barChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        label: '',
        data: [incomes, expenses],
        backgroundColor: ['rgba(80,200,120,0.7)', 'rgba(240,84,84,0.7)'],
        borderColor: ['#50C878', '#F05454'],
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: ctx => `${symbol}${ctx.raw.toFixed(2)}` } },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { callback: v => `${symbol}${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}` }
        }
      }
    }
  });
  _chartInstance = _barChartInstance;
}

// ─── Donut chart (gastos o ingresos) ─────────────────────────────

function _renderDonutChart(transactions, symbol, container, type) {
  const CHART_COLORS = ['#50C878','#F05454','#FFB03A','#4285F4','#A78BFA','#34C5B1','#FF7F50','#63C5DA'];
  const filtered = transactions.filter(t => t.type === type);

  if (filtered.length === 0) {
    const empty = _buildGlassCard();
    empty.innerHTML += `<div class="empty-state" style="padding:32px 0">No hay ${type === 'gasto' ? 'gastos' : 'ingresos'} para mostrar.</div>`;
    container.appendChild(empty);
    return;
  }

  const catMap = {};
  filtered.forEach(t => {
    const label = t.categoryLabel || t.category || 'Otro';
    catMap[label] = (catMap[label] || 0) + t.amount;
  });
  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  const labels  = entries.map(([l]) => l);
  const values  = entries.map(([, v]) => v);
  const colors  = entries.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  // Tendencia respecto al mes anterior
  const now       = new Date();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevTotal = transactions
    .filter(t => t.type === type && new Date(t.date) >= prevStart && new Date(t.date) <= prevEnd)
    .reduce((s, t) => s + t.amount, 0);

  // ── KPI card ─────────────────────────────────────────────────
  const kpiLabel   = type === 'gasto' ? 'TOTAL GASTOS' : 'TOTAL INGRESOS';
  const kpiCls     = type === 'gasto' ? 'gasto' : 'ingreso';
  const summaryCard = _buildGlassCard('RESUMEN DEL PERÍODO');
  summaryCard.appendChild(_buildSummaryRow([
    { label: kpiLabel,          value: `${symbol}${total.toFixed(2)}`,           cls: kpiCls  },
    { label: 'MES ANTERIOR',    value: `${symbol}${prevTotal.toFixed(2)}`,       cls: ''      },
    { label: 'DIFERENCIA',      value: `${prevTotal > 0 ? (((total - prevTotal) / prevTotal) * 100).toFixed(1) : '—'}%`, cls: total <= prevTotal ? 'positivo' : 'negativo' }
  ]));

  if (prevTotal > 0) {
    const trendPct  = (((total - prevTotal) / prevTotal) * 100).toFixed(1);
    const direction = type === 'gasto'
      ? (total > prevTotal ? 'up' : 'down')
      : (total > prevTotal ? 'down' : 'up'); // para ingresos "up" es bueno
    summaryCard.appendChild(_buildTrendBadge(direction, Math.abs(trendPct)));
  }
  container.appendChild(summaryCard);

  // ── Donut + leyenda ──────────────────────────────────────────
  const chartCard = _buildGlassCard(
    `DISTRIBUCIÓN DE ${type === 'gasto' ? 'GASTOS' : 'INGRESOS'} POR CATEGORÍA`
  );

  const donutWrap = document.createElement('div');
  donutWrap.className = 'chart-donut-responsive-wrap';

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'chart-donut-container';

  const canvas = document.createElement('canvas');
  canvasWrap.appendChild(canvas);

  // Centro del donut
  const center = document.createElement('div');
  center.className = 'chart-donut-center';
  center.innerHTML = `
    <span class="center-total">${symbol}${total >= 1000 ? (total/1000).toFixed(1)+'k' : total.toFixed(0)}</span>
    <span class="center-label">${type === 'gasto' ? 'GASTOS' : 'INGRESOS'}</span>`;
  canvasWrap.appendChild(center);

  donutWrap.appendChild(canvasWrap);
  chartCard.appendChild(donutWrap);

  // Leyenda custom
  chartCard.appendChild(_buildCustomLegend(labels, colors, values, symbol, total));
  container.appendChild(chartCard);

  // Renderizar Chart DESPUÉS de insertar en el DOM
  requestAnimationFrame(() => {
    _chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: colors,
          borderWidth:     0,
          hoverOffset:     8
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: true,
        cutout:              '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${symbol}${ctx.raw.toFixed(2)} (${((ctx.raw / total) * 100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  });
}

// Función para cambiar el mes en el gráfico (ya no se usa con la nueva vista)
window.cambiarMesGrafico = function(delta) {
  chartMonthOffset += delta;
  if (chartMonthOffset < -12) chartMonthOffset = -12;
  if (chartMonthOffset > 12) chartMonthOffset = 12;
  renderActividad();
};

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

  setTimeout(() => attachSwipeToTransactions(), 50);
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

let pendingTransactionId = null;

function openTransactionOptions(id) {
  pendingTransactionId = id;
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (!tx) return;

  const isDebt = DEBT_CATEGORIES.has(tx.category);
  const titleEl = document.getElementById('tx-options-title');
  const amountEl = document.getElementById('tx-options-amount');

  if (isDebt) {
    const allDebts = Storage.getDebts();
    const linked = allDebts.find(d => d.transactionId === id || d.id === tx.debtId);
    titleEl.textContent = linked ? linked.person : (tx.categoryLabel || 'Transacción');
  } else {
    titleEl.textContent = `Categoría: ${tx.categoryLabel || _getLabelCategoria(tx.category)}`;
  }

  amountEl.textContent = `${tx.type === 'gasto' ? '-' : '+'} ${getCurrencySymbol()}${tx.amount.toFixed(2)}`;

  const modal = document.getElementById('modal-transaction-options');
  const btnArea = modal.querySelector('.modal-card');
  btnArea.querySelectorAll('.tx-opt-btn').forEach(b => b.remove());

  if (isDebt) {
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

// ─── Eliminar transacción de deuda con sincronización completa ─────
async function deleteDebtTransaction(id, tx) {
  const allDebts = Storage.getDebts();
  let linkedDebt = allDebts.find(d => d.transactionId === id || d.id === tx.debtId);

  if (tx.category === 'prestamo_recibido' || tx.category === 'prestamo_otorgado') {
    if (!linkedDebt) {
      linkedDebt = allDebts.find(d => Math.abs(new Date(d.date) - new Date(tx.date)) < 3000);
    }
    const detalles = linkedDebt
      ? `${linkedDebt.person}${linkedDebt.description ? ' · ' + linkedDebt.description : ''} · Vence ${parseDateDisplay(linkedDebt.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';
    const ok = await AppConfirm({
      titulo: 'Eliminar préstamo',
      mensaje: `Esta acción eliminará el préstamo${detalles ? ': ' + detalles : ''}. La deuda asociada y su pago (si existiera) también se eliminarán.`,
      tipo: 'danger',
      btnOk: 'Sí, eliminar todo'
    });
    if (!ok) return;
    if (linkedDebt && linkedDebt.paid && linkedDebt.transactionId) {
      Storage.deleteTransaction(linkedDebt.transactionId);
    }
    if (linkedDebt) Storage.deleteDebt(linkedDebt.id);
    Storage.deleteTransaction(id);
    renderActividad();
    Toast.success('Eliminado', 'Préstamo y todos sus registros eliminados.');
    vibrate([100, 50, 100]);
    return;
  }

  if (tx.category === 'pago_prestamo' || tx.category === 'cobro_prestamo') {
    const detalles = linkedDebt
      ? `${linkedDebt.person}${linkedDebt.description ? ' · ' + linkedDebt.description : ''} · Fecha límite ${parseDateDisplay(linkedDebt.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';
    const ok = await AppConfirm({
      titulo: 'Eliminar pago',
      mensaje: `Esta acción dejará la deuda${detalles ? ' de ' + detalles : ''} en estado pendiente.`,
      tipo: 'warning',
      btnOk: 'Sí, eliminar pago'
    });
    if (!ok) return;
    if (linkedDebt) {
      Storage.updateDebt(linkedDebt.id, { paid: false, paidDate: null, transactionId: null });
    }
    Storage.deleteTransaction(id);
    renderActividad();
    Toast.info('Pago eliminado', 'La deuda volvió a estado pendiente.');
    vibrate([100, 50, 100]);
  }
}

// ─── Editar transacción normal con modal de íconos ─────
let _editIconKey = null;
let _editType = null;

function openEditModal(id) {
  const tx = Storage.getTransactions().find(t => t.id === id);
  if (!tx) return;

  _editType = tx.type;
  _editIconKey = tx.categoryIcon || 'categoria';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-edit-tx';
  overlay.style.display = 'flex';

  const symbol = getCurrencySymbol();
  const currentIconSvg = Icons.get(_editIconKey);

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

      <p class="registro-label" style="margin-bottom:0">ÍCONO</p>
      <button id="edit-icon-preview-btn" onclick="abrirModalIconosEdit()" style="
        display:flex;align-items:center;gap:12px;
        width:100%;background:var(--bg-card-2);
        border:1px solid var(--border-color-2);
        border-radius:var(--radius-md);
        padding:12px 16px;cursor:pointer;
        transition:border-color 0.15s;margin-bottom:8px;
      ">
        <div id="edit-icon-preview" style="
          width:44px;height:44px;border-radius:var(--radius-md);
          background:var(--accent-green-dim);border:1.5px solid var(--accent-green);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent-green);
        ">${currentIconSvg}</div>
        <div style="text-align:left;flex:1">
          <p style="font-size:14px;font-weight:600;color:var(--text-primary)">Ícono actual</p>
          <p style="font-size:12px;color:var(--text-tertiary);margin-top:1px">Toca para cambiar</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="stroke:var(--text-tertiary)"><path d="M9 6l6 6l-6 6"/></svg>
      </button>

      <button class="btn-primary" onclick="saveEditedTransaction('${id}')">Guardar cambios</button>
      <button class="btn-ghost" onclick="closeModal('modal-edit-tx', () => document.getElementById('modal-edit-tx')?.remove())">Cancelar</button>
    </div>`;

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal('modal-edit-tx', () => overlay.remove());
  };

  document.body.appendChild(overlay);
}

function abrirModalIconosEdit() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-edit-icons';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-card" style="max-height:80vh; overflow-y:auto">
      <h3 class="modal-title">Seleccionar ícono</h3>
      <div class="icon-picker-grid" id="edit-icon-modal-grid" style="max-height: 380px;"></div>
      <button class="btn-primary" onclick="cerrarModalIconosEdit()">Cerrar</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  const grid = document.getElementById('edit-icon-modal-grid');
  let lastGroup = '';
  let html = '';
  for (const icon of ICONS_CATALOG) {
    if (icon.group !== lastGroup) {
      if (lastGroup !== '') html += `<div class="icon-group-divider"></div>`;
      html += `<div class="icon-group-label">${icon.group}</div>`;
      lastGroup = icon.group;
    }
    html += `<button class="icon-picker-btn ${icon.key === _editIconKey ? 'selected' : ''}"
      onclick="seleccionarIconoDesdeModal('${icon.key}')" title="${icon.label}">
      ${Icons.get(icon.key)}
    </button>`;
  }
  grid.innerHTML = html;
  
  modal.onclick = (e) => { if (e.target === modal) cerrarModalIconosEdit(); };
}

function cerrarModalIconosEdit() {
  const modal = document.getElementById('modal-edit-icons');
  if (modal) closeModal('modal-edit-icons', () => modal.remove());
}

function seleccionarIconoDesdeModal(key) {
  _editIconKey = key;
  const preview = document.getElementById('edit-icon-preview');
  if (preview) preview.innerHTML = Icons.get(key);
  cerrarModalIconosEdit();
}
window.seleccionarIconoDesdeModal = seleccionarIconoDesdeModal;
window.abrirModalIconosEdit = abrirModalIconosEdit;
window.cerrarModalIconosEdit = cerrarModalIconosEdit;

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
  const label = document.getElementById('edit-tx-label').value.trim();
  const type = _editType || tx.type;

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
    categoryIcon: _editIconKey || tx.categoryIcon || 'categoria',
    date: tx.date
  });

  const overlay = document.getElementById('modal-edit-tx');
  if (overlay) closeModal('modal-edit-tx', () => overlay.remove());
  Storage.updateStreak(true);
  renderActividad();
  Toast.success('Transacción actualizada', '');
}

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
  if (actividadView === 'chart') return;
  sortAscending = !sortAscending;
  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) {
    if (sortAscending) {
      sortBtn.classList.add('active');
    } else {
      sortBtn.classList.remove('active');
    }
  }
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
  currentChartMonthOffset = 0;
  const labels = { all: 'Todos', gasto: 'Gastos', ingreso: 'Ingresos' };
  const labelEl = document.getElementById('filter-dropdown-label');
  if (labelEl) labelEl.textContent = labels[type] || 'Todos';
  document.querySelectorAll('.filter-dropdown-item').forEach(el => {
    el.classList.toggle('active', el.dataset.value === type);
  });
  _closeFilterDropdown();
  renderActividad();
}

function toggleFilterDropdown() {
  const menu = document.getElementById('filter-dropdown-menu');
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  isOpen ? _closeFilterDropdown() : _openFilterDropdown();
}

function _openFilterDropdown() {
  const menu = document.getElementById('filter-dropdown-menu');
  const btn = document.getElementById('filter-dropdown-btn');
  if (!menu) return;
  menu.style.display = 'block';
  btn && btn.classList.add('open');
  setTimeout(() => {
    document.addEventListener('click', _filterOutsideHandler, { once: true });
  }, 0);
}

function _closeFilterDropdown() {
  const menu = document.getElementById('filter-dropdown-menu');
  const btn = document.getElementById('filter-dropdown-btn');
  if (menu) menu.style.display = 'none';
  btn && btn.classList.remove('open');
}

function _filterOutsideHandler(e) {
  const wrap = document.getElementById('filter-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) _closeFilterDropdown();
}

function attachSwipeToTransactions() {
  const SWIPE_THRESHOLD = 72;

  document.querySelectorAll('#actividad-lista .transaction-item:not([data-swipe])').forEach(item => {
    item.setAttribute('data-swipe', '1');
    item.style.position   = 'relative';
    item.style.overflow   = 'hidden';
    item.style.transition = 'none';

    let startX = 0, startY = 0, dragging = false, locked = false;

    item.addEventListener('touchstart', e => {
      startX   = e.touches[0].clientX;
      startY   = e.touches[0].clientY;
      dragging = false;
      locked   = false;
      item.style.transition = 'none';
    }, { passive: true });

    item.addEventListener('touchmove', e => {
      if (locked) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      // Bloquear si el gesto es más vertical que horizontal
      if (!dragging && Math.abs(dy) > Math.abs(dx)) { locked = true; return; }
      if (Math.abs(dx) > 8) {
        dragging = true;
        e.preventDefault();
        const clamped = Math.max(-160, Math.min(160, dx));
        item.style.transform = `translateX(${clamped}px)`;
        const ratio = Math.min(Math.abs(clamped) / 120, 1);

        if (dx < -20) {
          item.style.boxShadow = `inset 0 0 0 1px rgba(80,200,120,0.4)`;
        } else if (dx > 20) {
          item.style.boxShadow = `inset 0 0 0 1px rgba(240,84,84,0.4)`;
        } else {
          item.style.boxShadow = '';
        }
        item.style.opacity = `${1 - ratio * 0.25}`;
      }
    }, { passive: false });

    item.addEventListener('touchend', e => {
      if (!dragging) return;
      const dx = e.changedTouches[0].clientX - startX;
      item.style.transition  = 'transform 0.22s cubic-bezier(0.34,1.2,0.64,1), opacity 0.2s, box-shadow 0.2s';
      item.style.transform   = '';
      item.style.opacity     = '';
      item.style.boxShadow   = '';

      const id = item.dataset.id;
      if (!id) return;

      if (dx < -SWIPE_THRESHOLD) {
        // ← Izquierda: Editar
        vibrate(30);
        const tx = Storage.getTransactions().find(t => t.id === id);
        if (tx && !DEBT_CATEGORIES.has(tx.category)) {
          openEditModal(id);
        }
      } else if (dx > SWIPE_THRESHOLD) {
        // → Derecha: Eliminar
        vibrate([80, 40, 80]);
        deleteTransactionConfirm(id);
      }
    });
  });
}