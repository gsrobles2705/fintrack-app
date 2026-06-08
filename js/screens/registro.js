// registro.js
// Responsibility: capture and save transactions

let currentType     = 'gasto';
let currentAmount   = 0;
let currentCategory = null;   // can be a normal id or "otro_libre:free text"

const DEFAULT_QUICK_AMOUNTS = [2, 5, 10, 20, 50, 25];

function initRegistro() {
  currentType     = 'gasto';
  currentAmount   = 0;
  currentCategory = null;

  const user    = Storage.getUser();
  const avatarEl = document.getElementById('registro-avatar-inicial');
  if (avatarEl && user) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  document.getElementById('input-monto-custom').value = '';
  document.getElementById('monto-display').textContent =
    `${getCurrencySymbol()} 0.00`;
  document.querySelectorAll('.monto-btn')
    .forEach(b => b.classList.remove('selected'));

  _renderQuickAmounts();
  setTipoRegistro('gasto');
  updateBudgetDisplay();
}

function _renderQuickAmounts() {
  const symbol  = getCurrencySymbol();
  const amounts = Storage.getQuickAmounts();
  const grid    = document.querySelector('.montos-grid');
  if (!grid) return;

  grid.innerHTML = amounts.map(m => `
    <button class="monto-btn" onclick="seleccionarMonto(${m})">
      ${symbol}${m}
    </button>`).join('');
}

// ─────────────────────────────────────────────────────────────────
// QUICK AMOUNTS EDIT MODAL
// ─────────────────────────────────────────────────────────────────

function abrirModalMontos() {
  const amounts = Storage.getQuickAmounts();
  const symbol  = getCurrencySymbol();
  const modal   = document.getElementById('modal-montos');
  if (!modal) return;
  _renderMontoInputs(amounts, symbol);
  modal.style.display = 'flex';
}

function _renderMontoInputs(amounts, symbol) {
  const container = document.getElementById('modal-montos-inputs');
  if (!container) return;

  container.innerHTML = amounts.map((m, i) => `
    <div class="monto-edit-row">
      <span class="monto-edit-num">${i + 1}</span>
      <div class="monto-edit-input-wrap">
        <span class="monto-edit-symbol">${symbol}</span>
        <input
          type="number"
          class="input-field monto-edit-input"
          id="monto-edit-${i}"
          value="${m}"
          min="0.01"
          step="0.01"
          placeholder="0.00"
        >
      </div>
    </div>`).join('');
}

function cerrarModalMontos() {
  closeModal('modal-montos');
}

function guardarMontos() {
  const amounts = [];
  let hasError  = false;

  for (let i = 0; i < 6; i++) {
    const input = document.getElementById(`monto-edit-${i}`);
    if (!input) continue;
    const val = parseFloat(input.value);
    if (!val || val <= 0) {
      input.classList.add('input-invalid');
      hasError = true;
    } else {
      input.classList.remove('input-invalid');
      amounts.push(val);
    }
  }

  if (hasError) {
    Toast.error('Montos inválidos', 'Todos los montos deben ser mayores a 0.');
    return;
  }

  Storage.saveQuickAmounts(amounts);
  cerrarModalMontos();
  _renderQuickAmounts();
  Toast.success('Montos actualizados', 'Los montos sugeridos fueron guardados.');
}

function restaurarMontosDefault() {
  Storage.saveQuickAmounts([...DEFAULT_QUICK_AMOUNTS]);
  const symbol = getCurrencySymbol();
  _renderMontoInputs([...DEFAULT_QUICK_AMOUNTS], symbol);
  Toast.info('Montos restaurados', 'Se volvieron a los valores predeterminados.');
}

function mostrarPresupuesto() {
  const el = document.getElementById('presupuesto-info');
  if (el) el.style.display = 'flex';
  updateBudgetDisplay();
}

function ocultarPresupuesto() {
  const el = document.getElementById('presupuesto-info');
  if (el) el.style.display = 'none';
}

function setTipoRegistro(tipo) {
  currentType     = tipo;
  currentCategory = null;

  const btnExpense  = document.getElementById('btn-gasto');
  const btnIncome   = document.getElementById('btn-ingreso');
  const btnConfirm  = document.getElementById('btn-confirmar');
  const wrapper     = document.querySelector('.monto-custom-wrapper');

  btnExpense.classList.remove('active', 'gasto', 'ingreso');
  btnIncome.classList.remove('active', 'gasto', 'ingreso');

  if (tipo === 'gasto') {
    btnExpense.classList.add('active', 'gasto');
    btnConfirm.textContent = 'Confirmar Gasto';
    btnConfirm.style.backgroundColor = '';
    btnConfirm.className = 'btn-primary btn-confirmar modo-gasto';
    if (wrapper) { wrapper.classList.remove('tipo-ingreso'); wrapper.classList.add('tipo-gasto'); }
    mostrarPresupuesto();
  } else {
    btnIncome.classList.add('active', 'ingreso');
    btnConfirm.textContent = 'Confirmar Ingreso';
    btnConfirm.style.backgroundColor = '';
    btnConfirm.className = 'btn-primary btn-confirmar modo-ingreso';
    if (wrapper) { wrapper.classList.remove('tipo-gasto'); wrapper.classList.add('tipo-ingreso'); }
    ocultarPresupuesto();
  }

  if (currentAmount > 0) validateAmount(currentAmount);
  else                   hideBalanceWarning();

  renderCategorias();
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY GRID RENDER
// ─────────────────────────────────────────────────────────────────

// Full catalogue → used in the category grid.
// "otro" has special treatment: opens an inline input.

function renderCategorias() {
  const categories = getCategorias(currentType); // base(without otro) + pinned + otro
  const modeClass  = `modo-${currentType}`;
  const container  = document.getElementById('categorias-container');

  // Was there an active "otro libre" selection? Preserve the text
  const activeOtherText = (currentCategory && currentCategory.startsWith('otro_libre:'))
    ? currentCategory.slice('otro_libre:'.length)
    : '';

  const isOtherSelected = currentCategory === 'otro'
    || (currentCategory && currentCategory.startsWith('otro_libre:'));

  container.innerHTML = categories.map(cat => {
    const isOther   = cat.id === 'otro';
    const isSelected = isOther
      ? isOtherSelected
      : currentCategory === cat.id;

    return `
      <button
        class="categoria-btn ${isSelected ? `selected ${modeClass}` : ''}"
        onclick="${isOther ? 'toggleCategoriaOtro()' : `seleccionarCategoria('${cat.id}')`}">
        <div class="categoria-icon-wrap">${Icons.get(cat.iconKey)}</div>
        <span class="categoria-label">${cat.label}</span>
      </button>`;
  }).join('');

  // Inline "Otro" input — only visible when selected
  _renderOtherInput(isOtherSelected, activeOtherText, modeClass);

  // Custom category label (if any exist)
  _renderCustomCategoryLabel();
}

/**
 * Injects (or updates) the "Otro" free-text input
 * right after the category grid.
 */
function _renderOtherInput(visible, currentText, modeClass) {
  const container = document.getElementById('categorias-container');
  let wrap = document.getElementById('otro-input-wrap');

  if (!visible) {
    if (wrap) wrap.style.display = 'none';
    return;
  }

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'otro-input-wrap';
    container.insertAdjacentElement('afterend', wrap);
  }

  wrap.style.display = 'block';
  const isGasto     = modeClass === 'modo-gasto';
  const placeholder = isGasto
    ? '¿En qué gastaste?'
    : '¿De dónde proviene?';
  const hint = isGasto
    ? 'Describe brevemente — se guardará como etiqueta'
    : 'Describe la fuente — se guardará como etiqueta';

  wrap.innerHTML = `
    <div class="otro-input-container ${modeClass}">
      <input
        type="text"
        id="otro-input-text"
        class="input-field otro-input"
        placeholder="${placeholder}"
        maxlength="30"
        autocomplete="off"
        value="${currentText}"
        oninput="onOtroTextChange(this.value)"
      >
      <span class="otro-input-hint">
        ${hint}
      </span>
    </div>`;

  // Auto-focus the field
  setTimeout(() => {
    const inp = document.getElementById('otro-input-text');
    if (inp) inp.focus();
  }, 80);
}

/**
 * Shows a visual separator before pinned categories
 * only when there are pinned ones for the current type.
 */
function _renderCustomCategoryLabel() {
  // No longer needed: the grid is continuous, the design makes it obvious
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY HANDLERS
// ─────────────────────────────────────────────────────────────────

function seleccionarCategoria(id) {
  currentCategory = id;
  renderCategorias();
}

/**
 * Toggle for the "Otro" category:
 *   · If already active → deselects it
 *   · Otherwise → marks it and shows the input
 */
function toggleCategoriaOtro() {
  const isOtherActive = currentCategory === 'otro'
    || (currentCategory && currentCategory.startsWith('otro_libre:'));

  if (isOtherActive) {
    currentCategory = null;
  } else {
    // Mark as plain "otro"; the free text fills in via onOtroTextChange
    currentCategory = 'otro';
  }
  renderCategorias();
}

/**
 * Updates currentCategory in real time based on the free-text input.
 * If empty → stays as 'otro' (no text → not valid for confirmation).
 */
function onOtroTextChange(value) {
  const text      = value.trim();
  currentCategory = text.length > 0 ? `otro_libre:${text}` : 'otro';
}

// ─────────────────────────────────────────────────────────────────
// AMOUNTS
// ─────────────────────────────────────────────────────────────────

function seleccionarMonto(amount) {
  currentAmount = amount;
  document.getElementById('input-monto-custom').value = '';
  document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
  updateAmountDisplay();
  validateAmount(amount);
}

function seleccionarMontoCustom(value) {
  const parsed  = parseFloat(value) || 0;
  currentAmount = parsed < 0 ? 0 : parsed;
  document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('selected'));
  updateAmountDisplay();
  validateAmount(currentAmount);
}

function updateAmountDisplay() {
  document.getElementById('monto-display')
    .textContent = `${getCurrencySymbol()} ${currentAmount.toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────────────────────────

function updateBudgetDisplay() {
  const user         = Storage.getUser();
  const budget       = Storage.getDailyBudget();
  const transactions = Storage.getTransactions();
  const el           = document.getElementById('presupuesto-info');
  if (!el) return;

  const boltSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"/>
  </svg>`;

  if (!budget) {
    el.innerHTML = `
      <div class="presupuesto-info-icon">${boltSVG}</div>
      <div class="presupuesto-info-row">
        <span class="presupuesto-info-label">Presupuesto diario</span>
        <span class="presupuesto-info-monto">No configurado</span>
      </div>`;
    return;
  }

  const today         = new Date();
  const todayExpenses = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'gasto' && d.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining  = budget - todayExpenses;
  const percentage = todayExpenses / budget;
  const symbol     = user.symbol;

  let levelClass = '';
  if (percentage >= 1)         levelClass = 'danger';
  else if (percentage >= 0.75) levelClass = 'warning';

  el.innerHTML = `
    <div class="presupuesto-info-icon ${levelClass}">${boltSVG}</div>
    <div class="presupuesto-info-row">
      <span class="presupuesto-info-label">Presupuesto diario</span>
      <span class="presupuesto-info-monto ${levelClass}">
        ${symbol} ${Math.abs(remaining).toFixed(2)}
        ${remaining < 0 ? 'excedido' : 'restantes'}
      </span>
    </div>`;
}

// Alias kept for compatibility with initRegistro which calls actualizarPresupuesto()
const actualizarPresupuesto = updateBudgetDisplay;

function validateAmount(amount) {
  if (currentType !== 'gasto') { hideBalanceWarning(); return true; }

  const transactions  = Storage.getTransactions();
  const user          = Storage.getUser();
  const currentBalance = calculateCurrentBalance(transactions);

  if (amount > currentBalance) { showBalanceWarning(currentBalance, user.symbol); return false; }

  hideBalanceWarning();
  return true;
}

// Alias for compatibility
const validarMonto = validateAmount;

function showBalanceWarning(balance, currency) {
  let el = document.getElementById('aviso-balance');
  if (!el) {
    el           = document.createElement('div');
    el.id        = 'aviso-balance';
    el.className = 'aviso-balance';
    const container = document.querySelector('.monto-custom-container');
    container.insertAdjacentElement('afterend', el);
  }

  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
         viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 9v4"/>
      <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871
               h16.214a1.914 1.914 0 0 0 1.636-2.87l-8.106-13.536
               a1.914 1.914 0 0 0-3.274 0"/>
      <path d="M12 16h.01"/>
    </svg>
    <div class="aviso-balance-texto">
      <span>Monto mayor al balance actual.</span>
      <span>Balance: ${currency} ${balance.toFixed(2)}</span>
    </div>`;
  el.style.display = 'flex';
}

function hideBalanceWarning() {
  const el = document.getElementById('aviso-balance');
  if (el) el.style.display = 'none';
}

// Aliases for compatibility
const mostrarAdvertencia  = showBalanceWarning;
const ocultarAdvertencia  = hideBalanceWarning;

// ─────────────────────────────────────────────────────────────────
// CONFIRM REGISTRATION
// ─────────────────────────────────────────────────────────────────

function confirmarRegistro() {
  // Amount
  if (currentAmount <= 0) {
    Toast.error('Monto inválido', 'Ingresa un monto mayor a 0 para continuar.');
    return;
  }

  // Category
  if (!currentCategory) {
    Toast.warning('Categoría requerida', 'Selecciona una categoría antes de confirmar.');
    return;
  }

  // "Otro" selected but no free text
  if (currentCategory === 'otro') {
    // Try reading the input in case the user typed something without triggering oninput
    const inp   = document.getElementById('otro-input-text');
    const text  = inp ? inp.value.trim() : '';
    if (text.length === 0) {
      Toast.warning('Describe tu gasto', 'Escribe qué fue para poder registrarlo.');
      inp && inp.focus();
      return;
    }
    currentCategory = `otro_libre:${text}`;
  }

  // Sufficient balance (expenses only)
  if (!validateAmount(currentAmount)) {
    Toast.error('Saldo insuficiente', 'El monto supera tu balance actual.');
    return;
  }

  let categoryLabel, categoryIcon;
  if (currentCategory.startsWith('otro_libre:')) {
    categoryLabel = currentCategory.slice('otro_libre:'.length);
    categoryIcon = 'categoria';
  } else {
    const def = getCategoryDefinition(currentCategory);
    categoryLabel = def ? def.label : _getLabelCategoria(currentCategory);
    categoryIcon = def ? def.iconKey : 'categoria';
  }

  const transaction = {
    id: Date.now().toString(),
    type: currentType,
    amount: currentAmount,
    category: currentCategory,        // ID original (para posible uso futuro)
    categoryLabel: categoryLabel,     // nombre congelado
    categoryIcon: categoryIcon,       // clave del ícono congelada
    date: new Date().toISOString()
  };

  Storage.addTransaction(transaction);
  checkBudgetAfterExpense();
  _checkGoalImmediately();

  // Success toast
  const symbol   = getCurrencySymbol();
  const typeLabel = currentType === 'gasto' ? 'Gasto' : 'Ingreso';
  const catLabel  = _getLabelCategoria(currentCategory);
  Toast.success(
    `${typeLabel} registrado`,
    `${symbol}${currentAmount.toFixed(2)} · ${catLabel}`
  );

  // Visual feedback on the button
  const btn = document.getElementById('btn-confirmar');
  btn.textContent   = '¡Registrado con éxito! ✔';
  btn.style.opacity = '0.75';

  setTimeout(() => {
    currentAmount   = 0;
    currentCategory = null;

    document.getElementById('input-monto-custom').value = '';
    document.getElementById('monto-display').textContent =
      `${getCurrencySymbol()} 0.00`;
    document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('selected'));

    // Hide "otro" input
    const wrap = document.getElementById('otro-input-wrap');
    if (wrap) wrap.style.display = 'none';

    btn.textContent   = currentType === 'gasto' ? 'Confirmar Gasto' : 'Confirmar Ingreso';
    btn.style.opacity = '';

    const content = document.querySelector('#screen-registro .screen-content');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });

    renderCategorias();
    updateBudgetDisplay();
    hideBalanceWarning();
  }, 1200);
}

// ─── Trigger: budget exceeded ─────────────────────────────────────
function checkBudgetAfterExpense() {
  const budget = Storage.getDailyBudget();
  if (!budget) return;

  const today         = new Date();
  const todayExpenses = Storage.getTransactions()
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'gasto' && d.toDateString() === today.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  if (todayExpenses <= budget) return;

  const alreadyFired = Storage.getNotifications().some(n =>
    n.tipo   === NOTIF_TIPO.DANGER &&
    n.titulo === '¡Presupuesto excedido!' &&
    new Date(n.isoDate).toDateString() === today.toDateString()
  );
  if (alreadyFired) return;

  const user   = Storage.getUser();
  const symbol = user.symbol;
  const excess = (todayExpenses - budget).toFixed(2);

  agregarNotificacion(
    NOTIF_TIPO.DANGER,
    '¡Presupuesto excedido!',
    `Superaste tu límite diario de ${symbol}${budget.toFixed(2)}. ` +
    `Llevas ${symbol}${excess} de más hoy.`
  );
}

// Alias for compatibility
const verificarPresupuestoTrasGasto = checkBudgetAfterExpense;

// ─── Fix 5: weekly goal checked at registration moment ───────────
function _checkGoalImmediately() {
  const goal = Storage.getGoal();
  if (!goal) return;

  const txs  = Storage.getTransactions();
  const now  = new Date();

  const weekStart   = new Date(now);
  const dayOfWeek   = now.getDay() || 7;
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weeklySaved = txs
    .filter(t => new Date(t.date) >= weekStart)
    .reduce((total, t) =>
      t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);

  const saved = Math.max(weeklySaved, 0);
  checkWeeklyGoal(goal, saved);
}