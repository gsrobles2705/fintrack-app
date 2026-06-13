// perfil.js

let _selectedCountry       = null;
let _selectedCurrency      = null;   // currency code (e.g. 'COP') — independent of country
let _countryComboOpen      = false;
let _currencyDropdownOpen  = false;

// ─── Theme management ─────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('fintrack_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme, false);
}

function applyTheme(theme, animate = true) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('fintrack_theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  renderPerfil();
  vibrate(30);
  Toast.info(next === 'light' ? 'Modo claro activado' : 'Modo oscuro activado', '');
}
window.toggleTheme = toggleTheme;

document.addEventListener('DOMContentLoaded', initTheme);

// ─────────────────────────────────────────────────────────────────
// RENDER PROFILE VIEW
// ─────────────────────────────────────────────────────────────────
function renderPerfil() {
  const user = Storage.getUser();
  if (!user) return;

  document.getElementById('perfil-avatar-letra')
    .textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('perfil-nombre')
    .textContent = user.name;

  const countryObj = COUNTRIES.find(p => p.currency === user.currency) ?? COUNTRIES[0];
  document.getElementById('perfil-pais').textContent    = user.country ?? countryObj.country;
  document.getElementById('perfil-moneda').textContent  =
    `${user.symbol} — ${countryObj.currencyName}`;

  // Theme badge
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    themeBtn.querySelector('.perfil-row-value').textContent = isDark ? 'Oscuro' : 'Claro';
  }
}

// ─────────────────────────────────────────────────────────────────
// RENDER EDIT PROFILE
// ─────────────────────────────────────────────────────────────────
function renderEditarPerfil() {
  const user = Storage.getUser();
  if (!user) return;

  document.getElementById('editar-avatar-letra').textContent =
    user.name.charAt(0).toUpperCase();

  const nameInput = document.getElementById('editar-input-nombre');
  nameInput.value = user.name;

  clearFieldError('editar-input-nombre', 'error-editar-nombre');

  nameInput.oninput = function () {
    document.getElementById('editar-avatar-letra').textContent =
      this.value.charAt(0).toUpperCase() || '?';
    if (this.value.trim()) clearFieldError('editar-input-nombre', 'error-editar-nombre');
  };

  _selectedCountry   = COUNTRIES.find(p => p.country === user.country)
                       ?? COUNTRIES.find(p => p.currency === user.currency)
                       ?? COUNTRIES[0];
  _selectedCurrency  = user.currency;
  _countryComboOpen  = false;
  _currencyDropdownOpen = false;

  _initCountryCombo();
  _renderCurrencyDropdown();

  document.addEventListener('mousedown', _closeCountryComboIfOutside);
  document.addEventListener('mousedown', _closeCurrencyIfOutside);
}

// ─────────────────────────────────────────────────────────────────
// COUNTRY COMBOBOX
// ─────────────────────────────────────────────────────────────────
function _initCountryCombo() {
  const input    = document.getElementById('combo-pais-input');
  const dropdown = document.getElementById('combo-pais-dropdown');
  if (!input || !dropdown) return;

  input.value = _selectedCountry?.country ?? '';

  const freshInput = input.cloneNode(true);
  input.parentNode.replaceChild(freshInput, input);

  freshInput.onfocus = () => { freshInput.value = ''; _openCountryCombo(''); };
  freshInput.oninput = () => _openCountryCombo(freshInput.value.trim());
  freshInput.onblur  = () => {
    setTimeout(() => { freshInput.value = _selectedCountry?.country ?? ''; }, 150);
  };
}

function _closeCountryComboIfOutside(e) {
  const wrapper = document.getElementById('combo-pais-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _closeCountryCombo();
}

function _openCountryCombo(query = '') {
  const dropdown = document.getElementById('combo-pais-dropdown');
  if (!dropdown) return;

  const q        = query.toLowerCase();
  const filtered = q
    ? COUNTRIES.filter(p =>
        p.country.toLowerCase().includes(q) ||
        p.currencyName.toLowerCase().includes(q) ||
        p.symbol.toLowerCase().includes(q))
    : [...COUNTRIES];

  dropdown.innerHTML = filtered.length === 0
    ? `<div class="combo-no-results">Sin resultados</div>`
    : filtered.map(p => {
        const isActive = _selectedCountry?.currency === p.currency;
        return `
          <div class="combo-option ${isActive ? 'selected' : ''}"
               onmousedown="selectCountryCombo('${p.currency}')">
            <span class="combo-option-name">${p.country}</span>
            <span class="combo-option-symbol ${isActive ? 'active' : ''}">${p.symbol}</span>
          </div>`;
      }).join('');

  dropdown.style.display = 'block';
  _countryComboOpen      = true;
}

function _closeCountryCombo() {
  const dropdown = document.getElementById('combo-pais-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const input = document.getElementById('combo-pais-input');
  if (input && _selectedCountry) input.value = _selectedCountry.country;
  _countryComboOpen = false;
}

function selectCountryCombo(currency) {
  _selectedCountry = COUNTRIES.find(p => p.currency === currency);
  const input = document.getElementById('combo-pais-input');
  if (input) input.value = _selectedCountry.country;
  _closeCountryCombo();
  _renderCurrencyDropdown();
}

// Alias for HTML onmousedown handler
const seleccionarPaisCombo = selectCountryCombo;

// ─────────────────────────────────────────────────────────────────
// CURRENCY CUSTOM DROPDOWN
// ─────────────────────────────────────────────────────────────────
function _renderCurrencyDropdown() {
  const displayInput = document.getElementById('combo-moneda-display');
  const dropdown     = document.getElementById('combo-moneda-dropdown');
  if (!displayInput || !dropdown) return;

  const currencyObj = COUNTRIES.find(p => p.currency === _selectedCurrency) ?? COUNTRIES[0];
  displayInput.value = `${currencyObj.symbol} — ${currencyObj.currencyName}`;

  dropdown.innerHTML = COUNTRIES.map(p => {
    const isActive = p.currency === _selectedCurrency;
    return `
      <div class="combo-option ${isActive ? 'selected' : ''}"
           onmousedown="selectCurrencyDropdown('${p.currency}')">
        <span class="combo-option-name">${p.symbol} — ${p.currencyName}</span>
        ${isActive
          ? `<span class="combo-option-symbol active">✓</span>`
          : `<span class="combo-option-symbol">${p.currency}</span>`}
      </div>`;
  }).join('');
}

function _toggleCurrencyDropdown() {
  _currencyDropdownOpen ? _closeCurrencyDropdown() : _openCurrencyDropdown();
}

// Alias for HTML onclick handler
const _toggleMonedaDropdown = _toggleCurrencyDropdown;

function _openCurrencyDropdown() {
  _closeCountryCombo();
  const dropdown = document.getElementById('combo-moneda-dropdown');
  if (!dropdown) return;
  _renderCurrencyDropdown();
  dropdown.style.display = 'block';
  _currencyDropdownOpen  = true;
}

function _closeCurrencyDropdown() {
  const dropdown = document.getElementById('combo-moneda-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _currencyDropdownOpen = false;
}

function _closeCurrencyIfOutside(e) {
  const wrapper = document.getElementById('combo-moneda-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _closeCurrencyDropdown();
}

function selectCurrencyDropdown(currency) {
  _selectedCurrency = currency;
  _closeCurrencyDropdown();
  _renderCurrencyDropdown();
}

// Alias for HTML onmousedown handler
const seleccionarMonedaDropdown = selectCurrencyDropdown;

// ─────────────────────────────────────────────────────────────────
// SAVE EDIT — inline name error + confirmation toast
// ─────────────────────────────────────────────────────────────────
function guardarEdicion() {
  const name = document.getElementById('editar-input-nombre').value.trim();

  clearFieldError('editar-input-nombre', 'error-editar-nombre');

  let hasError = false;

  if (!name) {
    setFieldError('editar-input-nombre', 'error-editar-nombre',
      'El nombre no puede estar vacío');
    hasError = true;
  }

  if (!_selectedCountry) {
    Toast.error('País no seleccionado', 'Por favor elige tu país de residencia.');
    hasError = true;
  }

  if (hasError) return;

  const currencyObj = COUNTRIES.find(p => p.currency === _selectedCurrency)
                      ?? _selectedCountry;

  const user = Storage.getUser();
  Storage.saveUser({
    ...user,
    name,
    country:  _selectedCountry.country,
    currency: currencyObj.currency,
    symbol:   currencyObj.symbol
  });

  _cleanupListeners();

  Toast.success('Perfil actualizado', 'Los cambios se guardaron correctamente.');

  navigate(SCREENS.PERFIL);
}

// ─────────────────────────────────────────────────────────────────
// SIGN OUT — in-app confirm instead of native confirm()
// ─────────────────────────────────────────────────────────────────
async function cerrarSesion() {
  const confirmed = await AppConfirm({
    titulo:    'Cerrar sesión',
    mensaje:   'Se eliminarán todos tus datos locales. Esta acción no se puede deshacer.',
    tipo:      'danger',
    btnOk:     'Sí, cerrar sesión',
    btnCancel: 'Cancelar'
  });

  if (!confirmed) return;

  _cleanupListeners();
  Storage.clearAll();
  navigate(SCREENS.ONBOARDING);
}

// ─────────────────────────────────────────────────────────────────
// INTERNAL UTILITY
// ─────────────────────────────────────────────────────────────────
function _cleanupListeners() {
  document.removeEventListener('mousedown', _closeCountryComboIfOutside);
  document.removeEventListener('mousedown', _closeCurrencyIfOutside);
}

// ─────────────────────────────────────────────────────────────────
// EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────

// 1. Exportar a CSV (formato contable plano)
function exportarDatos(format) {
  const user = Storage.getUser();
  const transactions = Storage.getTransactions();
  const symbol = user?.symbol || 'S/';

  if (format === 'csv') {
    // Encabezados universales
    const header = 'DATE,TIME,TYPE,CATEGORY,DESCRIPTION,AMOUNT,CURRENCY\n';
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const rows = sorted.map(t => {
      const d = new Date(t.date);
      const fecha = d.toISOString().split('T')[0];           // YYYY-MM-DD
      const hora = d.toTimeString().split(' ')[0];           // HH:MM:SS
      const tipo = t.type === 'gasto' ? 'EXPENSE' : 'INCOME';
      let categoria = t.categoryLabel || t.category || 'OTHER';
      categoria = categoria.replace(/"/g, '""');
      const descripcion = (t.categoryLabel && t.categoryLabel !== categoria) ? t.categoryLabel : '';
      const monto = t.amount.toFixed(2);
      const moneda = user?.currency || 'PEN';
      return `"${fecha}","${hora}","${tipo}","${categoria}","${descripcion}","${monto}","${moneda}"`;
    }).join('\n');
    const csvContent = header + rows;
    _downloadFile(`fintrack_transacciones.csv`, 'text/csv;charset=utf-8;', csvContent);
  } else if (format === 'json') {
    // Copia de seguridad completa
    const goal = Storage.getGoal();
    const budget = Storage.getDailyBudget();
    const streak = Storage.getStreak();
    const customCats = Storage.getCustomCategories();
    const quickAmounts = Storage.getQuickAmounts();
    const data = {
      metadata: {
        export_date: new Date().toISOString(),
        app_version: '1.2.0'
      },
      user_profile: {
        name: user?.name,
        country: user?.country,
        currency: user?.currency,
        symbol: user?.symbol,
        daily_budget: budget,
        weekly_goal: goal,
        streak: streak
      },
      transactions: Storage.getTransactions(),
      debts: Storage.getDebts(),
      custom_categories: customCats,
      quick_amounts: quickAmounts
    };
    _downloadFile('fintrack_backup.json', 'application/json', JSON.stringify(data, null, 2));
  }
  vibrate(50);
  Toast.success('Exportado', `Archivo ${format.toUpperCase()} descargado.`);
}

// 2. Exportar a Excel (.xlsx) con ExcelJS (gráficos y formato condicional)
async function exportarDatosExcel() {
  if (typeof Chart === 'undefined') {
    Toast.warning('Cargando librería...', 'Por favor espera un momento y vuelve a intentar.');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    await new Promise(r => setTimeout(r, 200));
    if (typeof Chart === 'undefined') {
      Toast.error('Error', 'No se pudo cargar Chart.js. Intenta recargar la página.');
      return;
    }
  }

  try {
    const user         = Storage.getUser();
    const transactions = Storage.getTransactions();
    const debts        = Storage.getDebts();
    const symbol       = user?.symbol   || 'S/';
    const currency     = user?.currency || 'PEN';

    // ── KPIs globales ──────────────────────────────────────────────
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'ingreso') totalIncome += t.amount;
      else                      totalExpense += t.amount;
    });
    const netBalance     = totalIncome - totalExpense;
    const totalPorCobrar = debts.filter(d => !d.paid && d.tipo === 'por_cobrar').reduce((s, d) => s + d.amount, 0);
    const totalPorPagar  = debts.filter(d => !d.paid && d.tipo === 'por_pagar') .reduce((s, d) => s + d.amount, 0);

    // ── Gastos por categoría ───────────────────────────────────────
    const expenseByCategory = {};
    transactions.filter(t => t.type === 'gasto').forEach(t => {
      const cat = t.categoryLabel || t.category || 'Otro';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
    });
    const sortedCats = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
    const totalExpenseAll = sortedCats.reduce((s, [, v]) => s + v, 0);

    // ── Datos 6 meses para gráfico de barras ──────────────────────
    const months = [], incomesByMonth = [], expensesByMonth = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      months.push(d.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' }));
      let inc = 0, exp = 0;
      transactions.forEach(t => {
        const td = new Date(t.date);
        if (td >= monthStart && td <= monthEnd) {
          if (t.type === 'ingreso') inc += t.amount;
          else exp += t.amount;
        }
      });
      incomesByMonth.push(inc);
      expensesByMonth.push(exp);
    }

    // ── Crear libro y estilos base ────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FinTrack';
    workbook.created = new Date();

    // Estilo de encabezado (negrita + fondo gris oscuro)
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2A2A' } },
      border: { bottom: { style: 'thin' }, top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    };
    // Estilo de borde para celdas normales (finas)
    const borderAll = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    // ════════════════════════════════════════════════════════
    // HOJA 1: DASHBOARD
    // ════════════════════════════════════════════════════════
    const dashboard = workbook.addWorksheet('Dashboard', {
      views: [{ state: 'frozen', ySplit: 5 }]
    });

    const titleStyle = { font: { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF50C878' } } };
    const kpiLabelStyle = { font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF9CA3AF' } } };
    const kpiValueStyle = { font: { name: 'Segoe UI', size: 16, bold: true } };
    const kpiGreen = { font: { color: { argb: 'FF50C878' } } };
    const kpiRed = { font: { color: { argb: 'FFF05454' } } };

    dashboard.getCell('A1').value = 'Reporte Financiero - FinTrack';
    dashboard.getCell('A1').style = titleStyle;
    dashboard.getCell('A2').value = `Exportado: ${new Date().toLocaleString('es-PE')}`;
    dashboard.getCell('A3').value = `Usuario: ${user?.name || 'Anónimo'}`;

    dashboard.getCell('A5').value = 'INGRESOS TOTALES';
    dashboard.getCell('A5').style = kpiLabelStyle;
    dashboard.getCell('B5').value = totalIncome;
    dashboard.getCell('B5').style = { ...kpiValueStyle, ...kpiGreen };
    dashboard.getCell('B5').numFmt = `"${symbol}"#,##0.00`;

    dashboard.getCell('A6').value = 'GASTOS TOTALES';
    dashboard.getCell('A6').style = kpiLabelStyle;
    dashboard.getCell('B6').value = totalExpense;
    dashboard.getCell('B6').style = { ...kpiValueStyle, ...kpiRed };
    dashboard.getCell('B6').numFmt = `"${symbol}"#,##0.00`;

    dashboard.getCell('A7').value = 'BALANCE NETO';
    dashboard.getCell('A7').style = kpiLabelStyle;
    dashboard.getCell('B7').value = netBalance;
    dashboard.getCell('B7').style = { ...kpiValueStyle, ...(netBalance >= 0 ? kpiGreen : kpiRed) };
    dashboard.getCell('B7').numFmt = `"${symbol}"#,##0.00`;

    dashboard.getCell('D5').value = 'POR COBRAR';
    dashboard.getCell('D5').style = kpiLabelStyle;
    dashboard.getCell('E5').value = totalPorCobrar;
    dashboard.getCell('E5').style = { ...kpiValueStyle, ...kpiGreen };
    dashboard.getCell('E5').numFmt = `"${symbol}"#,##0.00`;

    dashboard.getCell('D6').value = 'POR PAGAR';
    dashboard.getCell('D6').style = kpiLabelStyle;
    dashboard.getCell('E6').value = totalPorPagar;
    dashboard.getCell('E6').style = { ...kpiValueStyle, ...kpiRed };
    dashboard.getCell('E6').numFmt = `"${symbol}"#,##0.00`;

    dashboard.getColumn('A').width = 20;
    dashboard.getColumn('B').width = 18;
    dashboard.getColumn('D').width = 18;
    dashboard.getColumn('E').width = 18;

    // ── Gráfico donut (imagen) ──────────────────────────────────────
    const donutCanvas = document.createElement('canvas');
    donutCanvas.width = 400;
    donutCanvas.height = 400;
    new Chart(donutCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: sortedCats.map(([l]) => l).slice(0, 6),
        datasets: [{
          data: sortedCats.map(([, v]) => v).slice(0, 6),
          backgroundColor: ['#50C878','#F05454','#FFB03A','#4285F4','#A78BFA','#34C5B1','#FF7F50'],
          borderWidth: 0
        }]
      },
      options: { responsive: false, maintainAspectRatio: true, cutout: '65%', plugins: { legend: { position: 'right' } } }
    });
    await new Promise(r => setTimeout(r, 300));
    const donutImage = donutCanvas.toDataURL('image/png');
    const donutImgId = workbook.addImage({ base64: donutImage, extension: 'png' });
    dashboard.addImage(donutImgId, 'A10:F35');

    // ── Gráfico de barras (imagen) ─────────────────────────────────
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 600;
    barCanvas.height = 400;
    new Chart(barCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Ingresos', data: incomesByMonth, backgroundColor: 'rgba(80,200,120,0.7)', borderColor: '#50C878', borderWidth: 1 },
          { label: 'Gastos',   data: expensesByMonth, backgroundColor: 'rgba(240,84,84,0.7)',  borderColor: '#F05454', borderWidth: 1 }
        ]
      },
      options: { responsive: false, maintainAspectRatio: true, scales: { y: { beginAtZero: true, ticks: { callback: v => `${symbol} ${v}` } } } }
    });
    await new Promise(r => setTimeout(r, 300));
    const barImage = barCanvas.toDataURL('image/png');
    const barImgId = workbook.addImage({ base64: barImage, extension: 'png' });
    dashboard.addImage(barImgId, 'H10:M35');

    // ── Tabla Top Gastos (con bordes completos) ────────────────────
    const TOP_ROW = 37;
    dashboard.getCell(`A${TOP_ROW}`).value = 'TOP GASTOS POR CATEGORÍA';
    dashboard.getCell(`A${TOP_ROW}`).style = { font: { bold: true, size: 12, color: { argb: 'FF50C878' } } };

    const headerCells = ['Categoría', 'Total', '% del gasto'];
    headerCells.forEach((h, i) => {
      const cell = dashboard.getCell(TOP_ROW + 1, i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });

    sortedCats.forEach(([cat, val], idx) => {
      const r = TOP_ROW + 2 + idx;
      const pct = totalExpenseAll > 0 ? ((val / totalExpenseAll) * 100).toFixed(1) + '%' : '0%';
      const catCell = dashboard.getCell(r, 1);
      const valCell = dashboard.getCell(r, 2);
      const pctCell = dashboard.getCell(r, 3);
      catCell.value = cat;
      valCell.value = val;
      valCell.numFmt = `"${symbol}"#,##0.00`;
      pctCell.value = pct;
      valCell.font = { color: { argb: 'FFF05454' } };

      // Aplicar bordes a toda la fila
      [catCell, valCell, pctCell].forEach(c => { c.style = { ...c.style, border: borderAll }; });

      if (idx % 2 === 0) {
        [catCell, valCell, pctCell].forEach(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF242424' } };
        });
      }
    });

    // Autoajustar columnas
    const maxCatLen = Math.max(20, ...sortedCats.map(([cat]) => cat.length + 2));
    dashboard.getColumn(1).width = Math.min(maxCatLen, 45);
    dashboard.getColumn(2).width = 18;
    dashboard.getColumn(3).width = 14;

    // ════════════════════════════════════════════════════════
    // HOJA 2: LIBRO MAYOR (con bordes y autowidth)
    // ════════════════════════════════════════════════════════
    const ledger = workbook.addWorksheet('Libro Mayor', {
      views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }]
    });

    const ledgerHeaders = ['ID', 'Fecha', 'Hora', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Vínculo a Deuda'];
    const ledgerHeaderRow = ledger.addRow(ledgerHeaders);
    ledgerHeaderRow.eachCell(cell => {
      cell.style = headerStyle;
    });

    const ledgerColWidths = [15, 12, 10, 10, 20, 25, 15, 15];
    const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedTx.forEach(t => {
      const dateObj = new Date(t.date);
      const hora = dateObj.toTimeString().split(' ')[0];
      const tipo = t.type === 'gasto' ? 'Gasto' : 'Ingreso';
      const categoria = t.categoryLabel || t.category || 'Otro';
      const descripcion = (t.category && t.category.startsWith('otro_libre:')) ? t.category.slice(12) : '';
      const monto = t.amount;
      let vinculo = '';
      if (t.debtId) {
        const debt = debts.find(d => d.id === t.debtId);
        if (debt) vinculo = debt.person;
      } else if (t.category === 'pago_prestamo' || t.category === 'cobro_prestamo') {
        const debt = debts.find(d => d.transactionId === t.id);
        if (debt) vinculo = debt.person;
      }

      const row = ledger.addRow([t.id, dateObj, hora, tipo, categoria, descripcion, monto, vinculo]);
      row.getCell(2).numFmt = 'dd/mm/yyyy';
      const montoCell = row.getCell(7);
      montoCell.numFmt = `"${symbol}"#,##0.00`;
      montoCell.font = { color: { argb: tipo === 'Gasto' ? 'FFF05454' : 'FF50C878' } };

      // Aplicar bordes a todas las celdas de la fila
      row.eachCell(cell => { cell.style = { ...cell.style, border: borderAll }; });

      // Actualizar anchos dinámicos
      [t.id, dateObj.toLocaleDateString('es-PE'), hora, tipo, categoria, descripcion, `${symbol}${monto.toFixed(2)}`, vinculo]
        .forEach((val, i) => {
          const len = String(val || '').length + 2;
          if (len > ledgerColWidths[i]) ledgerColWidths[i] = len;
        });
    });

    ledger.autoFilter = { from: 'A1', to: `H${ledger.rowCount}` };
    ledgerColWidths.forEach((w, i) => {
      ledger.getColumn(i + 1).width = Math.min(w, 45);
    });

    // ════════════════════════════════════════════════════════
    // HOJA 3: GESTIÓN DE DEUDAS (con formato condicional y bordes)
    // ════════════════════════════════════════════════════════
    const debtSheet = workbook.addWorksheet('Gestión de Deudas', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    const debtHeaders = ['ID', 'Persona', 'Concepto', 'Tipo', 'Monto Original', 'Fecha Emisión', 'Fecha Vencimiento', 'Estado', 'Fecha Pago Real'];
    const debtHeaderRow = debtSheet.addRow(debtHeaders);
    debtHeaderRow.eachCell(cell => {
      cell.style = headerStyle;
    });

    const debtColWidths = [15, 20, 25, 18, 15, 12, 12, 10, 12];
    debts.forEach(d => {
      const emisionDate = new Date(d.date);
      const vencimientoDate = new Date(d.dueDate);
      const pagoRealDate = d.paidDate ? new Date(d.paidDate) : '';
      const estado = d.paid ? 'Pagada' : 'Pendiente';
      const tipo = d.tipo === 'por_pagar' ? 'Me prestaron' : 'Presté';

      const row = debtSheet.addRow([
        d.id, d.person, d.description || '', tipo, d.amount,
        emisionDate, vencimientoDate, estado, pagoRealDate
      ]);

      row.getCell(6).numFmt = 'dd/mm/yyyy';
      row.getCell(7).numFmt = 'dd/mm/yyyy';
      if (pagoRealDate) row.getCell(9).numFmt = 'dd/mm/yyyy';

      const montoCell = row.getCell(5);
      montoCell.numFmt = `"${symbol}"#,##0.00`;

      const estadoCell = row.getCell(8);
      if (estado === 'Pagada') {
        estadoCell.font = { color: { argb: 'FF50C878' } };
        estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A4D2E' } };
      } else {
        estadoCell.font = { color: { argb: 'FFF05454' } };
        estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4D1A1A' } };
      }

      // Aplicar bordes a toda la fila
      row.eachCell(cell => { cell.style = { ...cell.style, border: borderAll }; });

      // Anchos dinámicos
      [d.id, d.person, d.description||'', tipo,
       `${symbol}${d.amount.toFixed(2)}`,
       emisionDate.toLocaleDateString('es-PE'),
       vencimientoDate.toLocaleDateString('es-PE'),
       estado,
       pagoRealDate ? pagoRealDate.toLocaleDateString('es-PE') : ''
      ].forEach((val, i) => {
        const len = String(val || '').length + 2;
        if (len > debtColWidths[i]) debtColWidths[i] = len;
      });
    });

    debtSheet.autoFilter = { from: 'A1', to: `I${debtSheet.rowCount}` };
    debtColWidths.forEach((w, i) => {
      debtSheet.getColumn(i + 1).width = Math.min(w, 40);
    });

    // ── Descargar archivo ─────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack_reporte_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);

    vibrate(50);
    Toast.success('Excel generado', 'Reporte ejecutivo descargado correctamente.');

  } catch (err) {
    console.error('Error al exportar Excel:', err);
    Toast.error('Error', 'No se pudo generar el archivo Excel. Intenta de nuevo.');
  }
}

function _downloadFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function mostrarModalExportar() {
  let modal = document.getElementById('modal-exportar');
  if (modal) {
    modal.style.display = 'flex';
    return;
  }

  const txCount = Storage.getTransactions().length;
  const debtCount = Storage.getDebts().length;

  const overlay = document.createElement('div');
  overlay.id = 'modal-exportar';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  
  // Cerrar al hacer clic fuera del contenido
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal('modal-exportar');
  });

  overlay.innerHTML = `
    <div class="modal-card">
      <h3 class="modal-title">Exportar datos</h3>
      <p class="modal-subtitle">${txCount} transacciones · ${debtCount} deudas</p>
      <button class="btn-primary" id="btn-export-excel" onclick="exportarDatosExcel();closeModal('modal-exportar')">
        Exportar Excel (.xlsx)
      </button>
      <button class="btn-secondary" onclick="exportarDatos('csv');closeModal('modal-exportar')">
        Exportar CSV
      </button>
      <button class="btn-secondary" onclick="exportarDatos('json');closeModal('modal-exportar')">
        Exportar JSON
      </button>
      <button class="btn-ghost" onclick="closeModal('modal-exportar')">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
}

// Exponer funciones globales
window.exportarDatos = exportarDatos;
window.exportarDatosExcel = exportarDatosExcel;
window.mostrarModalExportar = mostrarModalExportar;