// registro.js
// Responsabilidad: capturar y guardar transacciones

let tipoActual      = 'gasto';
let montoActual     = 0;
let categoriaActual = null;

const CATEGORIAS_GASTO = [
  { id: 'comida',     icon: Icons.comida,     label: 'Comida'     },
  { id: 'transporte', icon: Icons.transporte,  label: 'Transporte' },
  { id: 'diversion',  icon: Icons.diversion,   label: 'Diversión'  },
  { id: 'compras',    icon: Icons.compras,     label: 'Compras'    },
  { id: 'salud',      icon: Icons.salud,       label: 'Salud'      },
  { id: 'otros',      icon: Icons.categoria,   label: 'Otros'      }
];

const CATEGORIAS_INGRESO = [
  { id: 'mesada',    icon: Icons.mesada,    label: 'Mesada'    },
  { id: 'trabajo',   icon: Icons.trabajo,   label: 'Trabajo'   },
  { id: 'freelance', icon: Icons.freelance, label: 'Freelance' },
  { id: 'venta',     icon: Icons.venta,     label: 'Venta'     },
  { id: 'regalos',   icon: Icons.regalos,   label: 'Regalos'   },
  { id: 'otros',     icon: Icons.otros,     label: 'Otros'     }
];

const MONTOS_RAPIDOS = [2, 5, 10, 20, 50, 25];

function initRegistro() {
  tipoActual      = 'gasto';
  montoActual     = 0;
  categoriaActual = null;

  const user    = Storage.getUser();
  const avatarEl = document.getElementById('registro-avatar-inicial');
  if (avatarEl && user) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  document.getElementById('input-monto-custom').value = '';
  document.getElementById('monto-display').textContent =
    `${getCurrencySymbol()} 0.00`;
  document.querySelectorAll('.monto-btn')
    .forEach(b => b.classList.remove('selected'));

  _renderMontosRapidos();
  setTipoRegistro('gasto');
  actualizarPresupuesto();
}

function _renderMontosRapidos() {
  const symbol = getCurrencySymbol();
  const grid   = document.querySelector('.montos-grid');
  if (!grid) return;

  grid.innerHTML = MONTOS_RAPIDOS.map(m => `
    <button class="monto-btn" onclick="seleccionarMonto(${m})">
      ${symbol}${m}
    </button>`).join('');
}

function mostrarPresupuesto() {
  const el = document.getElementById('presupuesto-info');
  if (el) el.style.display = 'flex';
  actualizarPresupuesto();
}

function ocultarPresupuesto() {
  const el = document.getElementById('presupuesto-info');
  if (el) el.style.display = 'none';
}

function setTipoRegistro(tipo) {
  tipoActual      = tipo;
  categoriaActual = null;

  const btnGasto     = document.getElementById('btn-gasto');
  const btnIngreso   = document.getElementById('btn-ingreso');
  const btnConfirmar = document.getElementById('btn-confirmar');
  const wrapper      = document.querySelector('.monto-custom-wrapper');

  btnGasto.classList.remove('active', 'gasto', 'ingreso');
  btnIngreso.classList.remove('active', 'gasto', 'ingreso');

  if (tipo === 'gasto') {
    btnGasto.classList.add('active', 'gasto');
    btnConfirmar.textContent = 'Confirmar Gasto';
    btnConfirmar.style.backgroundColor = '';
    btnConfirmar.className = 'btn-primary btn-confirmar modo-gasto';
    if (wrapper) { wrapper.classList.remove('tipo-ingreso'); wrapper.classList.add('tipo-gasto'); }
    mostrarPresupuesto();
  } else {
    btnIngreso.classList.add('active', 'ingreso');
    btnConfirmar.textContent = 'Confirmar Ingreso';
    btnConfirmar.style.backgroundColor = '';
    btnConfirmar.className = 'btn-primary btn-confirmar modo-ingreso';
    if (wrapper) { wrapper.classList.remove('tipo-gasto'); wrapper.classList.add('tipo-ingreso'); }
    ocultarPresupuesto();
  }

  if (montoActual > 0) validarMonto(montoActual);
  else                 ocultarAdvertencia();

  renderCategorias();
}

function renderCategorias() {
  const categorias = tipoActual === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;
  const modoClass  = `modo-${tipoActual}`;
  const container  = document.getElementById('categorias-container');

  container.innerHTML = categorias.map(cat => `
    <button
      class="categoria-btn ${categoriaActual === cat.id ? `selected ${modoClass}` : ''}"
      onclick="seleccionarCategoria('${cat.id}')">
      <div class="categoria-icon-wrap">${cat.icon}</div>
      <span class="categoria-label">${cat.label}</span>
    </button>`).join('');
}

function seleccionarMonto(monto) {
  montoActual = monto;
  document.getElementById('input-monto-custom').value = '';
  document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
  actualizarDisplay();
  validarMonto(monto);
}

function seleccionarMontoCustom(valor) {
  const parsed = parseFloat(valor) || 0;
  montoActual  = parsed < 0 ? 0 : parsed;
  document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('selected'));
  actualizarDisplay();
  validarMonto(montoActual);
}

function seleccionarCategoria(id) {
  categoriaActual = id;
  renderCategorias();
}

function actualizarDisplay() {
  document.getElementById('monto-display')
    .textContent = `${getCurrencySymbol()} ${montoActual.toFixed(2)}`;
}

function actualizarPresupuesto() {
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

  const hoy       = new Date();
  const gastosHoy = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'gasto' && d.toDateString() === hoy.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const restante   = budget - gastosHoy;
  const porcentaje = gastosHoy / budget;
  const symbol     = user.symbol;

  let nivel = '';
  if (porcentaje >= 1)         nivel = 'danger';
  else if (porcentaje >= 0.75) nivel = 'warning';

  el.innerHTML = `
    <div class="presupuesto-info-icon ${nivel}">${boltSVG}</div>
    <div class="presupuesto-info-row">
      <span class="presupuesto-info-label">Presupuesto diario</span>
      <span class="presupuesto-info-monto ${nivel}">
        ${symbol} ${Math.abs(restante).toFixed(2)}
        ${restante < 0 ? 'excedido' : 'restantes'}
      </span>
    </div>`;
}

function validarMonto(monto) {
  if (tipoActual !== 'gasto') { ocultarAdvertencia(); return true; }

  const transactions = Storage.getTransactions();
  const user         = Storage.getUser();
  const saldo        = calcularSaldoActual(transactions);

  if (monto > saldo) { mostrarAdvertencia(saldo, user.symbol); return false; }

  ocultarAdvertencia();
  return true;
}

function mostrarAdvertencia(balance, currency) {
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

function ocultarAdvertencia() {
  const el = document.getElementById('aviso-balance');
  if (el) el.style.display = 'none';
}

// ─────────────────────────────────────────────
// CONFIRMAR REGISTRO
// Reemplaza el banner ad-hoc por el sistema Toast unificado
// ─────────────────────────────────────────────
function confirmarRegistro() {
  // Monto
  if (montoActual <= 0) {
    Toast.error('Monto inválido', 'Ingresa un monto mayor a 0 para continuar.');
    return;
  }

  // Categoría
  if (!categoriaActual) {
    Toast.warning('Categoría requerida', 'Selecciona una categoría antes de confirmar.');
    return;
  }

  // Balance suficiente (solo gastos)
  if (!validarMonto(montoActual)) {
    Toast.error('Saldo insuficiente', 'El monto supera tu balance actual.');
    return;
  }

  const transaccion = {
    id:       Date.now().toString(),
    type:     tipoActual,
    amount:   montoActual,
    category: categoriaActual,
    date:     new Date().toISOString()
  };

  Storage.addTransaction(transaccion);
  verificarPresupuestoTrasGasto();

  // Fix 5 — Comprobar meta semanal en el momento del registro,
  // sin esperar a que el usuario vuelva a la pestaña Inicio.
  _verificarMetaInmediata();

  // Toast de éxito inmediato
  const symbol = getCurrencySymbol();
  const label  = tipoActual === 'gasto' ? 'Gasto' : 'Ingreso';
  Toast.success(
    `${label} registrado`,
    `${symbol}${montoActual.toFixed(2)} en ${capitalize(categoriaActual)}`
  );

  // Feedback visual en el botón
  const btn = document.getElementById('btn-confirmar');
  btn.textContent   = '¡Registrado con éxito! ✔';
  btn.style.opacity = '0.75';

  setTimeout(() => {
    montoActual     = 0;
    categoriaActual = null;

    document.getElementById('input-monto-custom').value = '';
    document.getElementById('monto-display').textContent =
      `${getCurrencySymbol()} 0.00`;
    document.querySelectorAll('.monto-btn').forEach(b => b.classList.remove('selected'));

    btn.textContent  = tipoActual === 'gasto' ? 'Confirmar Gasto' : 'Confirmar Ingreso';
    btn.style.opacity = '';

    const content = document.querySelector('#screen-registro .screen-content');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });

    renderCategorias();
    actualizarPresupuesto();
    ocultarAdvertencia();
  }, 1200);
}

// ─── Trigger: presupuesto excedido ───────────────────────────────
function verificarPresupuestoTrasGasto() {
  const budget = Storage.getDailyBudget();
  if (!budget) return;

  const hoy       = new Date();
  const gastosHoy = Storage.getTransactions()
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'gasto' && d.toDateString() === hoy.toDateString();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  if (gastosHoy <= budget) return;

  const yaDisparada = Storage.getNotifications().some(n =>
    n.tipo   === NOTIF_TIPO.DANGER &&
    n.titulo === '¡Presupuesto excedido!' &&
    new Date(n.isoDate).toDateString() === hoy.toDateString()
  );
  if (yaDisparada) return;

  const user   = Storage.getUser();
  const symbol = user.symbol;
  const exceso = (gastosHoy - budget).toFixed(2);

  agregarNotificacion(
    NOTIF_TIPO.DANGER,
    '¡Presupuesto excedido!',
    `Superaste tu límite diario de ${symbol}${budget.toFixed(2)}. ` +
    `Llevas ${symbol}${exceso} de más hoy.`
  );
}

// ─── Fix 5: meta semanal comprobada en el momento del registro ───
//
// verificarMetaSemanal() se define en home.js y normalmente solo
// se llama desde renderHome().  Esta función replica el cálculo
// del balance semanal para poder disparar la notificación de
// "¡Meta cumplida! 🎉" inmediatamente al confirmar un ingreso,
// sin tener que navegar primero a la pestaña Inicio.
function _verificarMetaInmediata() {
  const goal = Storage.getGoal();
  if (!goal) return;

  const txs   = Storage.getTransactions();
  const ahora = new Date();

  // Inicio de semana (lunes local)
  const inicioSemana = new Date(ahora);
  const diaSemana    = ahora.getDay() || 7;   // 0 (dom) → 7
  inicioSemana.setDate(ahora.getDate() - diaSemana + 1);
  inicioSemana.setHours(0, 0, 0, 0);

  const balanceSemanal = txs
    .filter(t => new Date(t.date) >= inicioSemana)
    .reduce((total, t) =>
      t.type === 'ingreso' ? total + t.amount : total - t.amount, 0);

  const saved = Math.max(balanceSemanal, 0);

  // Reutiliza la misma lógica de deduplicación que home.js
  verificarMetaSemanal(goal, saved);
}