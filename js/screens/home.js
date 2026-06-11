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

  const currentBalance = calculateCurrentBalance(transactions);
  const currency       = user.symbol;
  document.getElementById('home-balance')
    .textContent = `${currency} ${currentBalance.toFixed(2)}`;

  renderGoal(goal, calculateWeeklyBalance(transactions), currency);
  renderRecentTransactions(transactions.slice(0, 3), currency);
  renderBudget();
  renderStreak();
  renderGrowthIndicator();
}

function renderStreak() {
  const streak = Storage.getStreak();
  const streakContainer = document.getElementById('streak-container');
  if (!streakContainer) return;
  // Día 0 (count=0) → no mostrar nada
  if (!streak.count || streak.count < 1) {
    streakContainer.innerHTML = '';
    return;
  }
  streakContainer.innerHTML = `
    <div class="streak-badge" title="${streak.count} días consecutivos" onclick="showStreakModal()">
      <span class="streak-fire">🔥</span>
      <span class="streak-number">${streak.count}</span>
    </div>
  `;
  requestAnimationFrame(() => {
    const badge = streakContainer.querySelector('.streak-badge');
    if (badge) badge.classList.add('streak-animate');
  });
}

function showStreakModal() {
  const streak = Storage.getStreak();
  const count  = streak.count || 0;

  // Crear overlay temporal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-streak';
  overlay.style.display = 'flex';

  overlay.innerHTML = `
    <div class="modal-card" style="text-align:center">
      <div style="font-size:52px;line-height:1;margin:10px 0 8px">🔥</div>
      <h3 class="modal-title" style="text-align:center">¡Racha de ${count} día${count !== 1 ? 's' : ''}!</h3>
      <p class="modal-subtitle" style="text-align:center;font-size:14px;line-height:1.6;margin-top:4px">
        Llevas <strong>${count} día${count !== 1 ? 's' : ''} consecutivo${count !== 1 ? 's' : ''}</strong> usando FinTrack.
        Cada día que registras tus movimientos construyes un hábito que transforma tu vida financiera.
      </p>

      <div style="background:var(--bg-card-2);border:1px solid var(--border-color-2);border-radius:var(--radius-md);padding:16px;margin:4px 0 0;text-align:left;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:18px">📊</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.5">
            <strong style="color:var(--text-primary)">Claridad total.</strong>
            Saber en qué gastas es el primer paso para gastar mejor y ahorrar sin esfuerzo.
          </p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:18px">🎯</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.5">
            <strong style="color:var(--text-primary)">Metas reales.</strong>
            Las personas que registran sus finanzas diariamente alcanzan sus metas 3× más rápido.
          </p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:18px">🧘</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.5">
            <strong style="color:var(--text-primary)">Menos estrés.</strong>
            El orden financiero reduce la ansiedad. Cuando sabes dónde está tu dinero, tienes el control.
          </p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:18px">💪</span>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.5">
            <strong style="color:var(--text-primary)">¡No rompas la racha!</strong>
            Vuelve mañana para mantenerla. Tu yo del futuro te lo agradecerá.
          </p>
        </div>
      </div>

      <button class="btn-primary" style="margin-top:4px" onclick="closeModal('modal-streak', () => document.getElementById('modal-streak')?.remove())">
        ¡Seguir así! 💪
      </button>
    </div>`;

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal('modal-streak', () => overlay.remove());
  };
  document.body.appendChild(overlay);
  vibrate(30);
}
window.showStreakModal = showStreakModal;

function renderGrowthIndicator() {
  const transactions = Storage.getTransactions();
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const currentBalance = calculateCurrentBalance(transactions);
  const balanceLastMonth = transactions
    .filter(t => new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd)
    .reduce((sum, t) => t.type === 'ingreso' ? sum + t.amount : sum - t.amount, 0);
  let percent = 0, direction = 'same';
  if (balanceLastMonth !== 0) {
    const change = ((currentBalance - balanceLastMonth) / Math.abs(balanceLastMonth)) * 100;
    percent = Math.abs(change).toFixed(1);
    direction = change >= 0 ? 'up' : 'down';
  }
  const growthHtml = `
    <div class="growth-indicator ${direction}">
      <span class="growth-value">${direction === 'up' ? '+' : ''}${percent}%</span>
      <span class="growth-label">vs mes anterior</span>
    </div>
  `;
  const balanceCard = document.querySelector('#screen-home .card:first-child');
  if (balanceCard && !balanceCard.querySelector('.growth-indicator')) {
    balanceCard.insertAdjacentHTML('beforeend', growthHtml);
  } else if (balanceCard) {
    balanceCard.querySelector('.growth-indicator').outerHTML = growthHtml;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function calculateCurrentBalance(transactions) {
  return transactions.reduce((total, t) =>
    t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);
}

// Alias used by other modules (registro.js, actividad.js)
const calcularSaldoActual = calculateCurrentBalance;

function calculateWeeklyBalance(transactions) {
  const now         = new Date();
  const weekStart   = new Date(now);
  const dayOfWeek   = now.getDay() || 7;
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);

  return transactions
    .filter(t => new Date(t.date) >= weekStart)
    .filter(t => t.category !== 'capital_inicial')
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

  checkWeeklyGoal(goal, saved);
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

  container.innerHTML = transactions.map(t => {
    const label = t.categoryLabel || _getLabelCategoria(t.category);
    let icon;
    if (t.categoryIcon) {
      icon = Icons.get(t.categoryIcon);
    } else if (t.category && t.category.startsWith('otro_libre:')) {
      icon = Icons.get('categoria');
    } else {
      icon = getIconoCategoria(t.category);
    }
    return `
      <div class="transaction-item">
        <div class="transaction-icon">${icon}</div>
        <div class="transaction-info">
          <p class="transaction-name">${label}</p>
          <p class="transaction-date">${formatDate(t.date)}</p>
        </div>
        <span class="transaction-amount ${t.type}">
          ${t.type === 'gasto' ? '-' : '+'} ${currency}${t.amount.toFixed(2)}
        </span>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// WEEKLY GOAL MODAL
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
  closeModal('modal-objetivo');
}

function validarInputObjetivo(value) {
  const amount = parseFloat(value);
  const valid  = amount && amount > 0;

  document.getElementById('btn-guardar-objetivo').disabled = !valid;

  if (value !== '' && !valid) {
    setFieldError('input-objetivo', 'error-objetivo',
      'Ingresa un monto mayor a 0');
  } else {
    clearFieldError('input-objetivo', 'error-objetivo');
  }
}

function guardarObjetivo() {
  const amount = parseFloat(document.getElementById('input-objetivo').value);

  if (!amount || amount <= 0) {
    setFieldError('input-objetivo', 'error-objetivo',
      'Ingresa un monto mayor a 0');
    return;
  }

  Storage.saveGoal({ amount, weekStart: new Date().toISOString() });
  cerrarModalObjetivo();
  renderHome();

  Toast.success('Objetivo guardado', `Meta semanal de ${getCurrencySymbol()}${amount} establecida.`);
}

// ─────────────────────────────────────────────
// DAILY BUDGET MODAL
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
  closeModal('modal-presupuesto');
}

function validarInputPresupuesto(value) {
  const amount = parseFloat(value);
  const valid  = amount && amount > 0;

  document.getElementById('btn-guardar-presupuesto').disabled = !valid;

  if (value !== '' && !valid) {
    setFieldError('input-presupuesto', 'error-presupuesto',
      'Ingresa un monto mayor a 0');
  } else {
    clearFieldError('input-presupuesto', 'error-presupuesto');
  }
}

function guardarPresupuesto() {
  const amount = parseFloat(document.getElementById('input-presupuesto').value);

  if (!amount || amount <= 0) {
    setFieldError('input-presupuesto', 'error-presupuesto',
      'Ingresa un monto mayor a 0');
    return;
  }

  Storage.saveDailyBudget(amount);
  cerrarModalPresupuesto();
  renderHome();

  Toast.success('Presupuesto guardado', `Límite diario de ${getCurrencySymbol()}${amount} configurado.`);
}

// ─────────────────────────────────────────────
// BUDGET CARD (Home)
// ─────────────────────────────────────────────

function renderBudget() {
  const user         = Storage.getUser();
  const budget       = Storage.getDailyBudget();
  const transactions = Storage.getTransactions();
  const symbol       = user.symbol;

  const amountEl = document.getElementById('presupuesto-restante');
  const boltEl   = document.getElementById('presupuesto-bolt-icon');
  const btnEl    = document.querySelector('#presupuesto-card .btn-secondary');

  if (!budget) {
    amountEl.textContent = 'No configurado';
    amountEl.className   = 'presupuesto-monto';
    return;
  }

  const today         = new Date();
  const todayExpenses = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'gasto' &&
        d.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining  = budget - todayExpenses;
  const percentage = todayExpenses / budget;

  amountEl.textContent =
    `${symbol} ${Math.abs(remaining).toFixed(2)} ` +
    (remaining >= 0 ? 'restantes' : 'excedido');

  if (percentage >= 1) {
    amountEl.className = 'presupuesto-monto danger';
    boltEl.className   = 'presupuesto-bolt danger';
  } else if (percentage >= 0.75) {
    amountEl.className = 'presupuesto-monto warning';
    boltEl.className   = 'presupuesto-bolt warning';
  } else {
    amountEl.className = 'presupuesto-monto';
    boltEl.className   = 'presupuesto-bolt';
  }

  btnEl.textContent = `Editar: ${symbol}${budget} / día`;
}

// Alias kept for compatibility with registro.js which calls renderPresupuesto()
const renderPresupuesto = renderBudget;

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function getCategoryIcon(transaction) {
  if (transaction.categoryIcon) return Icons.get(transaction.categoryIcon);
  if (transaction.category && transaction.category.startsWith('otro_libre:')) return Icons.get('categoria');
  return getIconoCategoria(transaction.category);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString())     return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Trigger: weekly goal reached ────────────────────────────────
function checkWeeklyGoal(goal, saved) {
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

// Alias for legacy call sites
const verificarMetaSemanal = checkWeeklyGoal;