// home.js - Pantalla principal con todas las mejoras v1.2.0

// Flag para sesión (se reinicia al cerrar la pestaña)
let typingAnimationDone = false;

function renderHome() {
  const user = Storage.getUser();
  const transactions = Storage.getTransactions();
  const goal = Storage.getGoal();

  const greeting = getGreeting(user.name); // Ahora recibe el nombre y retorna frase completa
  const greetingNameEl = document.getElementById('home-greeting-name');

  // Animación de máquina de escribir cada vez que se abre la app (nueva pestaña/ventana)
  const sessionKey = 'fintrack_typing_done_session';
  if (!sessionStorage.getItem(sessionKey)) {
    typeWriter(greetingNameEl, greeting);
    sessionStorage.setItem(sessionKey, '1');
  } else {
    greetingNameEl.textContent = greeting;
  }

  document.getElementById('home-avatar-inicial').textContent = user.name.charAt(0).toUpperCase();

  const currentBalance = calculateCurrentBalance(transactions);
  const currency = user.symbol;
  const balanceEl = document.getElementById('home-balance');
  const oldBalance = balanceEl ? parseFloat(balanceEl.textContent.replace(/[^0-9.-]/g, '')) : 0;
  if (balanceEl && Math.abs(currentBalance - oldBalance) > 0.01 && oldBalance !== 0) {
    animateNumber(balanceEl, oldBalance, currentBalance);
  } else {
    balanceEl.textContent = `${currency} ${currentBalance.toFixed(2)}`;
  }

  renderGoal(goal, calculateWeeklyBalance(transactions), currency);
  renderRecentTransactions(transactions.slice(0, 3), currency);
  renderBudget();
  renderStreak();
  renderGrowthIndicator();
  renderMonthSummary(transactions, currency);
  checkAndRenderInvictoDay();
}

/**
 * Nuevo saludo formal sin emojis, con el nombre al final.
 * @param {string} name - Nombre del usuario.
 * @returns {string} Frase completa (ej. "Buenos días, Gabriel.")
 */
function getGreeting(name) {
  const hour = new Date().getHours();
  let base = '';
  if (hour < 12) {
    const options = [
      'Buenos días',
      'Qué tenga un excelente día',
      'Iniciando con buen pie',
      'Un nuevo amanecer financiero'
    ];
    base = options[Math.floor(Math.random() * options.length)];
  } else if (hour < 18) {
    const options = [
      'Buenas tardes',
      'Siga avanzando',
      'La tarde es suya',
      'Sigamos con orden'
    ];
    base = options[Math.floor(Math.random() * options.length)];
  } else {
    const options = [
      'Buenas noches',
      'Termine el día en paz',
      'Balance nocturno',
      'Descanse y repase sus finanzas'
    ];
    base = options[Math.floor(Math.random() * options.length)];
  }
  // Aseguramos mayúscula inicial y punto final
  return `${base.charAt(0).toUpperCase() + base.slice(1)}, ${name}.`;
}

// Efecto de tipeo rápido (no bloqueante)
function typeWriter(element, text, speed = 30) {
  element.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

function animateNumber(element, start, end, duration = 500) {
  if (!element) return;
  const range = end - start;
  const startTime = performance.now();
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    let progress = Math.min(elapsed / duration, 1);
    progress = 1 - Math.pow(1 - progress, 3);
    const current = start + range * progress;
    element.textContent = `${getCurrencySymbol()} ${current.toFixed(2)}`;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Indicador de crecimiento mensual (o semanal si lleva menos de 1 semana)
function renderGrowthIndicator() {
  const transactions = Storage.getTransactions();
  if (transactions.length === 0) {
    const existing = document.querySelector('#screen-home .card:first-child .growth-indicator');
    if (existing) existing.remove();
    return;
  }

  const now = new Date();
  const currentBalance = calculateCurrentBalance(transactions);
  const user = Storage.getUser();
  const symbol = user.symbol;

  // Determinar si el usuario tiene menos de 7 días en la app
  const firstTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const daysSinceFirst = firstTx ? Math.floor((now - new Date(firstTx.date)) / 86400000) : 0;

  let prevBalance = 0;
  let label = '';

  if (daysSinceFirst < 7) {
    // Menos de 1 semana: no hay período anterior comparable, no mostrar
    const existing = document.querySelector('#screen-home .card:first-child .growth-indicator');
    if (existing) existing.remove();
    return;
  } else if (daysSinceFirst < 31) {
    // Entre 1 semana y 1 mes: comparar semana actual vs semana anterior
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setMilliseconds(-1);

    prevBalance = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= prevWeekStart && d <= prevWeekEnd;
      })
      .reduce((sum, t) => t.type === 'ingreso' ? sum + t.amount : sum - t.amount, 0);
    label = 'vs sem. anterior';
  } else {
    // Más de 1 mes: comparar con saldo del mes anterior
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    prevBalance = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= lastMonthStart && d <= lastMonthEnd;
      })
      .reduce((sum, t) => t.type === 'ingreso' ? sum + t.amount : sum - t.amount, 0);
    label = 'vs mes anterior';
  }

  if (prevBalance === 0 && currentBalance === 0) {
    const existing = document.querySelector('#screen-home .card:first-child .growth-indicator');
    if (existing) existing.remove();
    return;
  }

  let percent = 0, direction = 'same';
  if (prevBalance !== 0) {
    const change = ((currentBalance - prevBalance) / Math.abs(prevBalance)) * 100;
    percent = Math.abs(change).toFixed(1);
    direction = change > 0 ? 'up' : change < 0 ? 'down' : 'same';
  } else if (currentBalance > 0) {
    direction = 'up';
    percent = '100';
  }

  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•';
  const sign = direction === 'up' ? '+' : direction === 'down' ? '-' : '';
  const color = direction === 'up' ? 'var(--accent-green)' : direction === 'down' ? 'var(--accent-red)' : 'var(--text-tertiary)';

  const growthHtml = `
    <div class="growth-indicator" onclick="showGrowthModal('${direction}', '${percent}', '${currentBalance.toFixed(2)}', '${prevBalance.toFixed(2)}', '${label}')" style="cursor:pointer;display:flex;align-items:baseline;gap:6px;margin-top:8px;font-size:13px;">
      <span style="color:${color};font-weight:700;font-size:12px">${arrow} ${sign}${percent}%</span>
      <span style="color:var(--text-tertiary)">${label}</span>
    </div>
  `;

  const balanceCard = document.querySelector('#screen-home .card:first-child');
  if (!balanceCard) return;
  const old = balanceCard.querySelector('.growth-indicator');
  if (old) old.outerHTML = growthHtml;
  else balanceCard.insertAdjacentHTML('beforeend', growthHtml);
}

function showGrowthModal(direction, percent, current, previous, label) {
  label = label || 'vs período anterior';
  const modalId = 'modal-growth-' + Date.now();
  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-card" style="text-align:center">
      <h3 class="modal-title">Evolución mensual</h3>
      <div style="font-size:42px;margin:12px 0">${direction === 'up' ? '📈' : '📉'}</div>
      <p style="font-size:28px;font-weight:800;color:${direction === 'up' ? 'var(--accent-green)' : 'var(--accent-red)'}">
        ${direction === 'up' ? '+' : ''}${percent}%
      </p>
      <div style="background:var(--bg-card-2);border-radius:var(--radius-md);padding:12px;margin:12px 0">
        <p>Saldo actual: <strong>${getCurrencySymbol()}${current}</strong></p>
        <p>Saldo ${label}: <strong>${getCurrencySymbol()}${previous}</strong></p>
      </div>
      <button class="btn-primary" onclick="closeModal('${modalId}', () => document.getElementById('${modalId}')?.remove())">Entendido</button>
    </div>
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  vibrate(30);
}
window.showGrowthModal = showGrowthModal;

// Día Invicto
function checkAndRenderInvictoDay() {
  const today = new Date().toDateString();
  const transactions = Storage.getTransactions();
  const hasActivityToday = transactions.some(t => new Date(t.date).toDateString() === today);
  const currentHour = new Date().getHours();
  const isAfternoon = currentHour >= 12;
  const invictoKey = `fintrack_invicto_${today}`;
  const alreadyClaimed = localStorage.getItem(invictoKey);
  
  if (isAfternoon && !hasActivityToday && !alreadyClaimed) {
    let invictoBtn = document.getElementById('invicto-day-btn');
    if (!invictoBtn) {
      invictoBtn = document.createElement('button');
      invictoBtn.id = 'invicto-day-btn';
      invictoBtn.className = 'btn-secondary';
      invictoBtn.style.marginTop = '12px';
      invictoBtn.innerHTML = '✨ ¿Día de ahorro? Confirma que hoy no gastaste ✨';
      invictoBtn.onclick = confirmInvictoDay;
      const lastCard = document.querySelector('#screen-home .card:last-child');
      if (lastCard) lastCard.insertAdjacentElement('afterend', invictoBtn);
    }
  } else {
    const btn = document.getElementById('invicto-day-btn');
    if (btn) btn.remove();
  }
}

async function confirmInvictoDay() {
  const ok = await AppConfirm({
    titulo: 'Día sin gastos',
    mensaje: '¿Confirmas que hoy no realizaste ningún gasto ni ingreso? Tu racha aumentará en 1.',
    btnOk: 'Sí, fue un día de ahorro'
  });
  if (!ok) return;
  const today = new Date().toISOString();
  Storage.addTransaction({
    id: Date.now().toString(),
    type: 'ingreso',
    amount: 0,
    category: 'ahorro_dia_invicto',
    categoryLabel: 'Ahorro del día',
    categoryIcon: 'sparkles',
    date: today
  });
  Storage.updateStreak(true);
  localStorage.setItem(`fintrack_invicto_${new Date().toDateString()}`, '1');
  document.getElementById('invicto-day-btn')?.remove();
  renderHome();
  Toast.success('¡Día ahorrado!', 'Tu racha aumentó +1');
  vibrate(50);
}
window.confirmInvictoDay = confirmInvictoDay;

// Racha: si count = 0 muestra solo fuego sin número
function renderStreak() {
  const streak = Storage.getStreak();
  const streakContainer = document.getElementById('streak-container');
  if (!streakContainer) return;
  if (!streak.count || streak.count < 1) {
    streakContainer.innerHTML = `<div class="streak-badge" onclick="showStreakModal()" style="cursor:pointer"><span class="streak-fire">🔥</span></div>`;
    requestAnimationFrame(() => {
      const badge = streakContainer.querySelector('.streak-badge');
      if (badge) badge.classList.add('streak-animate');
    });
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
  const count = streak.count || 0;
  const modalId = 'modal-streak-' + Date.now();
  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.className = 'modal-overlay';
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
      <button class="btn-primary" style="margin-top:4px" onclick="closeModal('${modalId}', () => document.getElementById('${modalId}')?.remove())">
        ¡Seguir así! 💪
      </button>
    </div>`;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  vibrate(30);
}
window.showStreakModal = showStreakModal;

// Objetivo Semanal con celebración al 100% (semáforo de colores)
function renderGoal(goal, weeklyBalance, currency) {
  const amountsSpan = document.getElementById('home-goal-amounts');
  const goalCard = amountsSpan ? amountsSpan.closest('.card') : null;

  if (!goal) {
    if (amountsSpan) amountsSpan.textContent = 'S/0 / S/0';
    const progressFill = document.getElementById('home-progress-bar');
    if (progressFill) progressFill.style.width = '0%';
    if (goalCard) goalCard.classList.remove('goal-completed');
    return;
  }

  const saved = Math.max(weeklyBalance, 0);
  const percent = Math.min((saved / goal.amount) * 100, 100);
  const progressFill = document.getElementById('home-progress-bar');

  if (percent >= 100) {
    // ✅ Meta cumplida: esmeralda intenso + glow card + check
    progressFill.style.background = 'linear-gradient(90deg, #00FFAA, #00E5CC)';
    progressFill.style.boxShadow = '0 0 16px rgba(0,255,170,0.6)';
    if (goalCard) goalCard.classList.add('goal-completed');
    if (amountsSpan) {
      amountsSpan.innerHTML = `${currency}${saved.toFixed(0)} / ${currency}${goal.amount} <span class="goal-check">✓</span>`;
    }
  } else {
    // Semáforo: verde (0-49%) → ámbar (50-79%) → rojo (80-99%)
    let barColor, barGlow;
    if (percent < 50) {
      barColor = 'var(--accent-green)';
      barGlow = 'rgba(80, 200, 120, 0.5)';
    } else if (percent < 80) {
      barColor = '#FFB03A';
      barGlow = 'rgba(255, 176, 58, 0.5)';
    } else {
      barColor = 'var(--accent-red)';
      barGlow = 'rgba(240, 84, 84, 0.5)';
    }
    progressFill.style.background = barColor;
    progressFill.style.boxShadow = `0 0 8px ${barGlow}`;
    if (goalCard) goalCard.classList.remove('goal-completed');
    if (amountsSpan) amountsSpan.textContent = `${currency}${saved.toFixed(0)} / ${currency}${goal.amount}`;
  }

  progressFill.style.width = `${percent}%`;
  checkWeeklyGoal(goal, saved);
}

function renderBudget() {
  const user = Storage.getUser();
  const budget = Storage.getDailyBudget();
  const transactions = Storage.getTransactions();
  const symbol = user.symbol;

  const amountEl = document.getElementById('presupuesto-restante');
  const boltEl = document.getElementById('presupuesto-bolt-icon');
  const btnEl = document.querySelector('#presupuesto-card .btn-secondary');

  if (!budget) {
    if (amountEl) amountEl.textContent = 'No configurado';
    if (amountEl) amountEl.className = 'presupuesto-monto';
    if (btnEl) btnEl.textContent = '+ Configurar presupuesto diario';
    return;
  }

  const today = new Date();
  const todayExpenses = transactions
    .filter(t => new Date(t.date).toDateString() === today.toDateString() && t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = budget - todayExpenses;
  const percentage = todayExpenses / budget;

  if (amountEl) amountEl.textContent = `${symbol} ${Math.abs(remaining).toFixed(2)} ${remaining >= 0 ? 'restantes' : 'excedido'}`;
  if (btnEl) btnEl.textContent = `Editar: ${symbol}${budget} / día`;

  if (percentage >= 1) {
    if (amountEl) amountEl.className = 'presupuesto-monto danger';
    if (boltEl) boltEl.className = 'presupuesto-bolt danger';
  } else if (percentage >= 0.75) {
    if (amountEl) amountEl.className = 'presupuesto-monto warning';
    if (boltEl) boltEl.className = 'presupuesto-bolt warning';
  } else {
    if (amountEl) amountEl.className = 'presupuesto-monto';
    if (boltEl) boltEl.className = 'presupuesto-bolt';
  }
}

function renderRecentTransactions(transactions, currency) {
  const container = document.getElementById('home-transactions-list');
  if (!container) return;
  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">☕</div>
        <p>Todo tranquilo por ahora.<br>Registra tu primera operación</p>
      </div>`;
    return;
  }
  container.innerHTML = transactions.map(t => {
    const label = t.categoryLabel || _getLabelCategoria(t.category);
    let icon;
    if (t.categoryIcon) icon = Icons.get(t.categoryIcon);
    else if (t.category && t.category.startsWith('otro_libre:')) icon = Icons.get('categoria');
    else icon = getIconoCategoria(t.category);
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

// Modales de objetivo y presupuesto (sin cambios sustanciales)
function mostrarModalObjetivo() {
  const symbol = getCurrencySymbol();
  const input = document.getElementById('input-objetivo');
  if (input) {
    input.value = '';
    input.placeholder = `${symbol} 50`;
  }
  clearFieldError('input-objetivo', 'error-objetivo');
  const btn = document.getElementById('btn-guardar-objetivo');
  if (btn) btn.disabled = true;
  const modal = document.getElementById('modal-objetivo');
  if (modal) modal.style.display = 'flex';
}
function cerrarModalObjetivo() {
  clearFieldError('input-objetivo', 'error-objetivo');
  closeModal('modal-objetivo');
}
function validarInputObjetivo(value) {
  const amount = parseFloat(value);
  const valid = amount && amount > 0;
  const btn = document.getElementById('btn-guardar-objetivo');
  if (btn) btn.disabled = !valid;
  if (value !== '' && !valid) setFieldError('input-objetivo', 'error-objetivo', 'Ingresa un monto mayor a 0');
  else clearFieldError('input-objetivo', 'error-objetivo');
}
function guardarObjetivo() {
  const amount = parseFloat(document.getElementById('input-objetivo').value);
  if (!amount || amount <= 0) {
    setFieldError('input-objetivo', 'error-objetivo', 'Ingresa un monto mayor a 0');
    return;
  }
  Storage.saveGoal({ amount, weekStart: new Date().toISOString() });
  cerrarModalObjetivo();
  renderHome();
  Toast.success('Objetivo guardado', `Meta semanal de ${getCurrencySymbol()}${amount} establecida.`);
}
function mostrarModalPresupuesto() {
  const symbol = getCurrencySymbol();
  const budget = Storage.getDailyBudget();
  const input = document.getElementById('input-presupuesto');
  if (input) {
    input.value = budget || '';
    input.placeholder = `${symbol} 30`;
  }
  clearFieldError('input-presupuesto', 'error-presupuesto');
  const btn = document.getElementById('btn-guardar-presupuesto');
  if (btn) btn.disabled = !budget;
  const modal = document.getElementById('modal-presupuesto');
  if (modal) modal.style.display = 'flex';
}
function cerrarModalPresupuesto() {
  clearFieldError('input-presupuesto', 'error-presupuesto');
  closeModal('modal-presupuesto');
}
function validarInputPresupuesto(value) {
  const amount = parseFloat(value);
  const valid = amount && amount > 0;
  const btn = document.getElementById('btn-guardar-presupuesto');
  if (btn) btn.disabled = !valid;
  if (value !== '' && !valid) setFieldError('input-presupuesto', 'error-presupuesto', 'Ingresa un monto mayor a 0');
  else clearFieldError('input-presupuesto', 'error-presupuesto');
}
function guardarPresupuesto() {
  const amount = parseFloat(document.getElementById('input-presupuesto').value);
  if (!amount || amount <= 0) {
    setFieldError('input-presupuesto', 'error-presupuesto', 'Ingresa un monto mayor a 0');
    return;
  }
  Storage.saveDailyBudget(amount);
  cerrarModalPresupuesto();
  renderHome();
  Toast.success('Presupuesto guardado', `Límite diario de ${getCurrencySymbol()}${amount} configurado.`);
}

// Utilidades
function calculateCurrentBalance(transactions) {
  return transactions.reduce((total, t) => t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);
}
function calculateWeeklyBalance(transactions) {
  const now = new Date();
  const weekStart = new Date(now);
  const dayOfWeek = now.getDay() || 7;
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);
  return transactions
    .filter(t => new Date(t.date) >= weekStart && t.category !== 'capital_inicial')
    .reduce((total, t) => t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);
}
function checkWeeklyGoal(goal, saved) {
  if (!goal || saved < goal.amount) return;
  const flagKey = `fintrack_goal_notif_${goal.weekStart}`;
  if (localStorage.getItem(flagKey)) return;
  const user = Storage.getUser();
  agregarNotificacion(NOTIF_TIPO.SUCCESS, '¡Meta cumplida!', `Alcanzaste tu objetivo semanal de ${user.symbol}${goal.amount}. ¡Excelente disciplina financiera!`);
  localStorage.setItem(flagKey, '1');
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
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderMonthSummary(transactions, currency) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthName = now.toLocaleDateString('es-PE', { month: 'long' });

  const monthTx = transactions.filter(t => new Date(t.date) >= monthStart);
  const gastos   = monthTx.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const ingresos = monthTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const diff = ingresos - gastos;

  const balanceEl = document.querySelector('#screen-home .card:first-child');
  if (!balanceEl) return;

  let summaryEl = document.getElementById('month-summary-block');
  if (!summaryEl) {
    summaryEl = document.createElement('div');
    summaryEl.id = 'month-summary-block';
    summaryEl.className = 'month-summary-block';
    balanceEl.appendChild(summaryEl);
  }

  const diffColor = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const diffSign  = diff >= 0 ? '+' : '';

  summaryEl.innerHTML = `
    <div class="month-summary-label">${monthName.toUpperCase()}</div>
    <div class="month-summary-row">
      <div class="month-summary-item">
        <span class="month-summary-type gasto">↓ Gastos</span>
        <span class="month-summary-amount gasto">${currency}${gastos.toFixed(2)}</span>
      </div>
      <div class="month-summary-divider"></div>
      <div class="month-summary-item">
        <span class="month-summary-type ingreso">↑ Ingresos</span>
        <span class="month-summary-amount ingreso">${currency}${ingresos.toFixed(2)}</span>
      </div>
      <div class="month-summary-divider"></div>
      <div class="month-summary-item">
        <span class="month-summary-type" style="color:var(--text-tertiary)">Balance</span>
        <span class="month-summary-amount" style="color:${diffColor}">${diffSign}${currency}${Math.abs(diff).toFixed(2)}</span>
      </div>
    </div>
  `;
}

const calcularSaldoActual = calculateCurrentBalance;
const renderPresupuesto = renderBudget;
const verificarMetaSemanal = checkWeeklyGoal;

window.mostrarModalObjetivo = mostrarModalObjetivo;
window.cerrarModalObjetivo = cerrarModalObjetivo;
window.validarInputObjetivo = validarInputObjetivo;
window.guardarObjetivo = guardarObjetivo;
window.mostrarModalPresupuesto = mostrarModalPresupuesto;
window.cerrarModalPresupuesto = cerrarModalPresupuesto;
window.validarInputPresupuesto = validarInputPresupuesto;
window.guardarPresupuesto = guardarPresupuesto;
window.renderHome = renderHome;