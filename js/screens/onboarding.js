// onboarding.js

let _paisOnboarding           = PAISES[0];
let _monedaOnboarding         = PAISES[0].currency;
let _comboOnbAbierto          = false;
let _monedaOnbDropdownAbierto = false;

function initOnboarding() {
  _paisOnboarding           = PAISES[0];
  _monedaOnboarding         = PAISES[0].currency;
  _comboOnbAbierto          = false;
  _monedaOnbDropdownAbierto = false;

  const input = document.getElementById('onb-combo-input');
  if (!input) return;

  input.value = _paisOnboarding.country;

  // Limpia errores previos al (re)entrar en onboarding
  clearFieldError('input-nombre', 'error-onb-nombre');
  clearFieldError('input-capital-inicial', 'error-capital-inicial');

  // Activa validación en tiempo real en el campo nombre
  const inputNombre = document.getElementById('input-nombre');
  if (inputNombre) {
    inputNombre.oninput = () => {
      if (inputNombre.value.trim()) {
        clearFieldError('input-nombre', 'error-onb-nombre');
      }
    };
  }

  // Limpia listeners previos clonando el nodo
  const nuevoInput = input.cloneNode(true);
  input.parentNode.replaceChild(nuevoInput, input);

  nuevoInput.onfocus = () => { nuevoInput.value = ''; _abrirComboOnb(''); };
  nuevoInput.oninput = () => _abrirComboOnb(nuevoInput.value.trim());
  nuevoInput.onblur  = () => {
    setTimeout(() => { nuevoInput.value = _paisOnboarding?.country ?? ''; }, 150);
  };

  document.addEventListener('mousedown', _cerrarComboOnbSiAfuera);
  document.addEventListener('mousedown', _cerrarMonedaOnbSiAfuera);

  _renderMonedaOnbDropdown();
}

// ── Combobox de país ─────────────────────────────────────────────

function _cerrarComboOnbSiAfuera(e) {
  const wrapper = document.getElementById('onb-combo-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _cerrarComboOnb();
}

function _abrirComboOnb(query = '') {
  const dropdown = document.getElementById('onb-combo-dropdown');
  if (!dropdown) return;

  const q         = query.toLowerCase();
  const filtrados = q
    ? PAISES.filter(p =>
        p.country.toLowerCase().includes(q) ||
        p.monedaNombre.toLowerCase().includes(q) ||
        p.symbol.toLowerCase().includes(q))
    : [...PAISES];

  dropdown.innerHTML = filtrados.length === 0
    ? `<div class="combo-no-results">Sin resultados</div>`
    : filtrados.map(p => {
        const activo = _paisOnboarding?.currency === p.currency;
        return `
          <div class="combo-option ${activo ? 'selected' : ''}"
               onmousedown="seleccionarPaisOnboarding('${p.currency}')">
            <span class="combo-option-name">${p.country}</span>
            <span class="combo-option-symbol ${activo ? 'active' : ''}">${p.symbol}</span>
          </div>`;
      }).join('');

  dropdown.style.display = 'block';
  _comboOnbAbierto       = true;
}

function _cerrarComboOnb() {
  const dropdown = document.getElementById('onb-combo-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const input = document.getElementById('onb-combo-input');
  if (input && _paisOnboarding) input.value = _paisOnboarding.country;
  _comboOnbAbierto = false;
}

function seleccionarPaisOnboarding(currency) {
  _paisOnboarding   = PAISES.find(p => p.currency === currency);
  _monedaOnboarding = _paisOnboarding.currency;
  const input = document.getElementById('onb-combo-input');
  if (input) input.value = _paisOnboarding.country;
  _cerrarComboOnb();
  _renderMonedaOnbDropdown();
}

// ── Custom dropdown de moneda ─────────────────────────────────────

function _renderMonedaOnbDropdown() {
  const displayInput = document.getElementById('onb-moneda-display');
  const dropdown     = document.getElementById('onb-moneda-dropdown');
  if (!displayInput || !dropdown) return;

  const monedaObj = PAISES.find(p => p.currency === _monedaOnboarding)
                    ?? _paisOnboarding
                    ?? PAISES[0];

  displayInput.value = `${monedaObj.symbol} — ${monedaObj.monedaNombre}`;

  dropdown.innerHTML = PAISES.map(p => {
    const activo = p.currency === _monedaOnboarding;
    return `
      <div class="combo-option ${activo ? 'selected' : ''}"
           onmousedown="seleccionarMonedaOnboarding('${p.currency}')">
        <span class="combo-option-name">${p.symbol} — ${p.monedaNombre}</span>
        ${activo
          ? `<span class="combo-option-symbol active">✓</span>`
          : `<span class="combo-option-symbol">${p.currency}</span>`}
      </div>`;
  }).join('');
}

function _toggleMonedaOnbDropdown() {
  _monedaOnbDropdownAbierto
    ? _cerrarMonedaOnbDropdown()
    : _abrirMonedaOnbDropdown();
}

function _abrirMonedaOnbDropdown() {
  _cerrarComboOnb();
  const dropdown = document.getElementById('onb-moneda-dropdown');
  if (!dropdown) return;
  _renderMonedaOnbDropdown();
  dropdown.style.display    = 'block';
  _monedaOnbDropdownAbierto = true;
}

function _cerrarMonedaOnbDropdown() {
  const dropdown = document.getElementById('onb-moneda-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _monedaOnbDropdownAbierto = false;
}

function _cerrarMonedaOnbSiAfuera(e) {
  const wrapper = document.getElementById('onb-moneda-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _cerrarMonedaOnbDropdown();
}

function seleccionarMonedaOnboarding(currency) {
  _monedaOnboarding = currency;
  _cerrarMonedaOnbDropdown();
  _renderMonedaOnbDropdown();
}

// ── Validación capital inicial ────────────────────────────────────

function validarCapitalInicial(valor) {
  const parsed = parseFloat(valor);
  if (valor !== '' && parsed < 0) {
    setFieldError('input-capital-inicial', 'error-capital-inicial',
      'El capital no puede ser negativo');
  } else {
    clearFieldError('input-capital-inicial', 'error-capital-inicial');
  }
}

// ── Guardar ──────────────────────────────────────────────────────

function guardarUsuario() {
  const nombreEl = document.getElementById('input-nombre');
  const nombre   = nombreEl ? nombreEl.value.trim() : '';

  // Validar nombre
  if (!nombre) {
    setFieldError('input-nombre', 'error-onb-nombre',
      'Por favor ingresa tu nombre para continuar');
    nombreEl?.focus();
    return;
  }
  clearFieldError('input-nombre', 'error-onb-nombre');

  // Validar capital inicial
  const capitalEl  = document.getElementById('input-capital-inicial');
  const capitalVal = capitalEl?.value ?? '';
  const capital    = parseFloat(capitalVal);

  if (capitalVal !== '' && capital < 0) {
    setFieldError('input-capital-inicial', 'error-capital-inicial',
      'El capital no puede ser negativo');
    capitalEl?.focus();
    return;
  }

  const monedaObj = PAISES.find(p => p.currency === _monedaOnboarding)
                    ?? _paisOnboarding;

  document.removeEventListener('mousedown', _cerrarComboOnbSiAfuera);
  document.removeEventListener('mousedown', _cerrarMonedaOnbSiAfuera);

  Storage.saveUser({
    name:     nombre,
    country:  _paisOnboarding.country,
    currency: monedaObj.currency,
    symbol:   monedaObj.symbol
  });

  // Capital inicial (opcional): solo si es un número positivo
  if (capitalVal !== '' && capital > 0) {
    Storage.addTransaction({
      id:       Date.now().toString(),
      type:     'ingreso',
      amount:   capital,
      category: 'capital_inicial',
      date:     new Date().toISOString()
    });
  }

  navigate(SCREENS.HOME);
}