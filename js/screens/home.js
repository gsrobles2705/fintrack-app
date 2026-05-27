// home.js

function renderHome() {
  const user         = Storage.getUser();
  const transactions = Storage.getTransactions();
  const goal         = Storage.getGoal();

  const greeting = getGreeting();
  document.getElementById('home-greeting-name')
    .textContent = `${greeting}, ${user.name}`;

  document.getElementById('home-avatar-inicial')
    .textContent = user.name.charAt(0).toUpperCase();

  const saldoActual = calcularSaldoActual(transactions);
  const currency    = user.symbol;
  document.getElementById('home-balance')
    .textContent = `${currency} ${saldoActual.toFixed(2)}`;

  renderGoal(goal, calcularBalanceSemanal(transactions), currency);
  renderRecentTransactions(transactions.slice(0, 3), currency);
  renderPresupuesto();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function calcularSaldoActual(transactions) {
  return transactions.reduce((total, t) =>
    t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);
}

function calcularBalanceSemanal(transactions) {
  const ahora       = new Date();
  const inicioSemana = new Date(ahora);
  const dia         = ahora.getDay() || 7;
  inicioSemana.setDate(ahora.getDate() - dia + 1);
  inicioSemana.setHours(0, 0, 0, 0);

  return transactions
    .filter(t => new Date(t.date) >= inicioSemana)
    .reduce((total, t) =>
      t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);
}

function renderGoal(goal, weeklyBalance, currency) {
  if (!goal) return;
  const saved   = Math.max(weeklyBalance, 0);
  const percent = Math.min((saved / goal.amount) * 100, 100);

  document.getElementById('home-goal-amounts')
    .textContent = `${currency}${saved.toFixed(0)} / ${currency}${goal.amount}`;

  document.getElementById('home-progress-bar')
    .style.width = `${percent}%`;

  verificarMetaSemanal(goal, saved);
}

function renderRecentTransactions(transactions, currency) {
  const container = document.getElementById('home-transactions-list');

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        Aún no tienes transacciones.<br>
        Registra tu primera operación
      </div>`;
    return;
  }

  container.innerHTML = transactions.map(t => `
    <div class="transaction-item">
      <div class="transaction-icon">
        ${getCategoryIcon(t.category)}
      </div>
      <div class="transaction-info">
        <p class="transaction-name">${capitalize(t.category)}</p>
        <p class="transaction-date">${formatDate(t.date)}</p>
      </div>
      <span class="transaction-amount ${t.type}">
        ${t.type === 'gasto' ? '-' : '+'} ${currency}${t.amount.toFixed(2)}
      </span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// MODAL OBJETIVO SEMANAL
// ─────────────────────────────────────────────

function mostrarModalObjetivo() {
  const symbol = getCurrencySymbol();
  const input  = document.getElementById('input-objetivo');
  input.value       = '';
  input.placeholder = `${symbol} 50`;

  clearFieldError('input-objetivo', 'error-objetivo');
  document.getElementById('btn-guardar-objetivo').disabled = true;
  document.getElementById('modal-objetivo').style.display  = 'flex';
}

function cerrarModalObjetivo() {
  clearFieldError('input-objetivo', 'error-objetivo');
  document.getElementById('modal-objetivo').style.display = 'none';
}

function validarInputObjetivo(valor) {
  const monto  = parseFloat(valor);
  const valido = monto && monto > 0;

  document.getElementById('btn-guardar-objetivo').disabled = !valido;

  if (valor !== '' && !valido) {
    setFieldError('input-objetivo', 'error-objetivo',
      'Ingresa un monto mayor a 0');
  } else {
    clearFieldError('input-objetivo', 'error-objetivo');
  }
}

function guardarObjetivo() {
  const monto = parseFloat(document.getElementById('input-objetivo').value);

  if (!monto || monto <= 0) {
    setFieldError('input-objetivo', 'error-objetivo',
      'Ingresa un monto mayor a 0');
    return;
  }

  Storage.saveGoal({ amount: monto, weekStart: new Date().toISOString() });
  cerrarModalObjetivo();
  renderHome();

  Toast.success('Objetivo guardado', `Meta semanal de ${getCurrencySymbol()}${monto} establecida.`);
}

// ─────────────────────────────────────────────
// MODAL PRESUPUESTO DIARIO
// ─────────────────────────────────────────────

function mostrarModalPresupuesto() {
  const symbol = getCurrencySymbol();
  const budget = Storage.getDailyBudget();
  const input  = document.getElementById('input-presupuesto');
  input.value       = budget || '';
  input.placeholder = `${symbol} 30`;

  clearFieldError('input-presupuesto', 'error-presupuesto');
  document.getElementById('btn-guardar-presupuesto').disabled = !budget;
  document.getElementById('modal-presupuesto').style.display  = 'flex';
}

function cerrarModalPresupuesto() {
  clearFieldError('input-presupuesto', 'error-presupuesto');
  document.getElementById('modal-presupuesto').style.display = 'none';
}

function validarInputPresupuesto(valor) {
  const monto  = parseFloat(valor);
  const valido = monto && monto > 0;

  document.getElementById('btn-guardar-presupuesto').disabled = !valido;

  if (valor !== '' && !valido) {
    setFieldError('input-presupuesto', 'error-presupuesto',
      'Ingresa un monto mayor a 0');
  } else {
    clearFieldError('input-presupuesto', 'error-presupuesto');
  }
}

function guardarPresupuesto() {
  const monto = parseFloat(document.getElementById('input-presupuesto').value);

  if (!monto || monto <= 0) {
    setFieldError('input-presupuesto', 'error-presupuesto',
      'Ingresa un monto mayor a 0');
    return;
  }

  Storage.saveDailyBudget(monto);
  cerrarModalPresupuesto();
  renderHome();

  Toast.success('Presupuesto guardado', `Límite diario de ${getCurrencySymbol()}${monto} configurado.`);
}

// ─────────────────────────────────────────────
// PRESUPUESTO CARD (Home)
// ─────────────────────────────────────────────

function renderPresupuesto() {
  const user         = Storage.getUser();
  const budget       = Storage.getDailyBudget();
  const transactions = Storage.getTransactions();
  const symbol       = user.symbol;

  const montoEl = document.getElementById('presupuesto-restante');
  const boltEl  = document.getElementById('presupuesto-bolt-icon');
  const btnEl   = document.querySelector('#presupuesto-card .btn-secondary');

  if (!budget) {
    montoEl.textContent = 'No configurado';
    montoEl.className   = 'presupuesto-monto';
    return;
  }

  const hoy       = new Date();
  const gastosHoy = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'gasto' &&
        d.toDateString() === hoy.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const restante   = budget - gastosHoy;
  const porcentaje = gastosHoy / budget;

  montoEl.textContent =
    `${symbol} ${Math.abs(restante).toFixed(2)} ` +
    (restante >= 0 ? 'restantes' : 'excedido');

  if (porcentaje >= 1) {
    montoEl.className = 'presupuesto-monto danger';
    boltEl.className  = 'presupuesto-bolt danger';
  } else if (porcentaje >= 0.75) {
    montoEl.className = 'presupuesto-monto warning';
    boltEl.className  = 'presupuesto-bolt warning';
  } else {
    montoEl.className = 'presupuesto-monto';
    boltEl.className  = 'presupuesto-bolt';
  }

  btnEl.textContent = `Editar: ${symbol}${budget} / día`;
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

function getCategoryIcon(category) {
  const map = {
    mesada:    Icons.mesada,
    freelance: Icons.freelance,
    regalos:   Icons.regalos,
    deuda:     Icons.deuda,
    otros:     Icons.categoria
  };
  return map[category] || Icons.get(category);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const hoy  = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  if (date.toDateString() === hoy.toDateString())  return 'Hoy';
  if (date.toDateString() === ayer.toDateString()) return 'Ayer';

  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Trigger: meta semanal cumplida ──────────────────────────────
function verificarMetaSemanal(goal, saved) {
  if (!goal || saved < goal.amount) return;

  const flagKey = `fintrack_goal_notif_${goal.weekStart}`;
  if (localStorage.getItem(flagKey)) return;

  const user = Storage.getUser();

  agregarNotificacion(
    NOTIF_TIPO.SUCCESS,
    '¡Meta cumplida! 🎉',
    `Alcanzaste tu objetivo semanal de ${user.symbol}${goal.amount}. ` +
    `¡Excelente disciplina financiera!`
  );

  localStorage.setItem(flagKey, '1');
}