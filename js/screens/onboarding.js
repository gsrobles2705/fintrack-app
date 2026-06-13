// onboarding.js

let _selectedCountryOnb       = COUNTRIES[0];
let _selectedCurrencyOnb      = COUNTRIES[0].currency;
let _countryComboOpenOnb      = false;
let _currencyDropdownOpenOnb  = false;
let _onbStep = 1; // 1, 2, 3

function initOnboarding() {
  _selectedCountryOnb       = COUNTRIES[0];
  _selectedCurrencyOnb      = COUNTRIES[0].currency;
  _countryComboOpenOnb      = false;
  _currencyDropdownOpenOnb  = false;
  _onbStep = 1;

  clearFieldError('input-nombre', 'error-onb-nombre');
  clearFieldError('input-capital-inicial', 'error-capital-inicial');

  const nameInput = document.getElementById('input-nombre');
  if (nameInput) {
    nameInput.oninput = () => {
      if (nameInput.value.trim()) clearFieldError('input-nombre', 'error-onb-nombre');
    };
  }

  const input = document.getElementById('onb-combo-input');
  if (!input) return;
  input.value = _selectedCountryOnb.country;
  const freshInput = input.cloneNode(true);
  input.parentNode.replaceChild(freshInput, input);
  freshInput.onfocus = () => { freshInput.value = ''; _openCountryComboOnb(''); };
  freshInput.oninput = () => _openCountryComboOnb(freshInput.value.trim());
  freshInput.onblur  = () => {
    setTimeout(() => { freshInput.value = _selectedCountryOnb?.country ?? ''; }, 150);
  };

  document.addEventListener('mousedown', _closeCountryComboOnbIfOutside);
  document.addEventListener('mousedown', _closeCurrencyOnbIfOutside);

  _renderCurrencyOnbDropdown();
  _goToOnbStep(1);
}

function _goToOnbStep(step) {
  _onbStep = step;
  const steps = ['onb-step-1','onb-step-2','onb-step-3'];
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('onb-step-active', 'onb-step-exit-left');
    if (i + 1 === step) {
      el.style.display = 'block';
      requestAnimationFrame(() => el.classList.add('onb-step-active'));
    } else {
      el.style.display = 'none';
    }
  });
  // Progress dots
  document.querySelectorAll('.onb-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i + 1 <= step);
  });
}

function onbNextStep() {
  if (_onbStep === 1) {
    const name = document.getElementById('input-nombre')?.value.trim();
    if (!name) {
      setFieldError('input-nombre', 'error-onb-nombre', 'Por favor ingresa tu nombre');
      return;
    }
    clearFieldError('input-nombre', 'error-onb-nombre');
  }
  if (_onbStep < 3) _goToOnbStep(_onbStep + 1);
  vibrate(30);
}

function onbPrevStep() {
  if (_onbStep > 1) _goToOnbStep(_onbStep - 1);
}

window.onbNextStep = onbNextStep;
window.onbPrevStep = onbPrevStep;

// ── Country combobox ──────────────────────────────────────────────

function _closeCountryComboOnbIfOutside(e) {
  const wrapper = document.getElementById('onb-combo-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _closeCountryComboOnb();
}

function _openCountryComboOnb(query = '') {
  const dropdown = document.getElementById('onb-combo-dropdown');
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
        const isActive = _selectedCountryOnb?.currency === p.currency;
        return `
          <div class="combo-option ${isActive ? 'selected' : ''}"
               onmousedown="selectCountryOnboarding('${p.currency}')">
            <span class="combo-option-name">${p.country}</span>
            <span class="combo-option-symbol ${isActive ? 'active' : ''}">${p.symbol}</span>
          </div>`;
      }).join('');

  dropdown.style.display = 'block';
  _countryComboOpenOnb   = true;
}

function _closeCountryComboOnb() {
  const dropdown = document.getElementById('onb-combo-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const input = document.getElementById('onb-combo-input');
  if (input && _selectedCountryOnb) input.value = _selectedCountryOnb.country;
  _countryComboOpenOnb = false;
}

function selectCountryOnboarding(currency) {
  _selectedCountryOnb  = COUNTRIES.find(p => p.currency === currency);
  _selectedCurrencyOnb = _selectedCountryOnb.currency;
  const input = document.getElementById('onb-combo-input');
  if (input) input.value = _selectedCountryOnb.country;
  _closeCountryComboOnb();
  _renderCurrencyOnbDropdown();
}

// Alias for HTML onclick handlers
const seleccionarPaisOnboarding = selectCountryOnboarding;

// ── Currency custom dropdown ──────────────────────────────────────

function _renderCurrencyOnbDropdown() {
  const displayInput = document.getElementById('onb-moneda-display');
  const dropdown     = document.getElementById('onb-moneda-dropdown');
  if (!displayInput || !dropdown) return;

  const currencyObj = COUNTRIES.find(p => p.currency === _selectedCurrencyOnb)
                      ?? _selectedCountryOnb
                      ?? COUNTRIES[0];

  displayInput.value = `${currencyObj.symbol} — ${currencyObj.currencyName}`;

  dropdown.innerHTML = COUNTRIES.map(p => {
    const isActive = p.currency === _selectedCurrencyOnb;
    return `
      <div class="combo-option ${isActive ? 'selected' : ''}"
           onmousedown="selectCurrencyOnboarding('${p.currency}')">
        <span class="combo-option-name">${p.symbol} — ${p.currencyName}</span>
        ${isActive
          ? `<span class="combo-option-symbol active">✓</span>`
          : `<span class="combo-option-symbol">${p.currency}</span>`}
      </div>`;
  }).join('');
}

function _toggleCurrencyOnbDropdown() {
  _currencyDropdownOpenOnb
    ? _closeCurrencyOnbDropdown()
    : _openCurrencyOnbDropdown();
}

// Alias for HTML onclick handler
const _toggleMonedaOnbDropdown = _toggleCurrencyOnbDropdown;

function _openCurrencyOnbDropdown() {
  _closeCountryComboOnb();
  const dropdown = document.getElementById('onb-moneda-dropdown');
  if (!dropdown) return;
  _renderCurrencyOnbDropdown();
  dropdown.style.display   = 'block';
  _currencyDropdownOpenOnb = true;
}

function _closeCurrencyOnbDropdown() {
  const dropdown = document.getElementById('onb-moneda-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _currencyDropdownOpenOnb = false;
}

function _closeCurrencyOnbIfOutside(e) {
  const wrapper = document.getElementById('onb-moneda-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _closeCurrencyOnbDropdown();
}

function selectCurrencyOnboarding(currency) {
  _selectedCurrencyOnb = currency;
  _closeCurrencyOnbDropdown();
  _renderCurrencyOnbDropdown();
}

// Alias for HTML onclick handler
const seleccionarMonedaOnboarding = selectCurrencyOnboarding;

// ── Initial capital validation ────────────────────────────────────

function validarCapitalInicial(value) {
  const parsed = parseFloat(value);
  if (value !== '' && parsed < 0) {
    setFieldError('input-capital-inicial', 'error-capital-inicial',
      'El capital no puede ser negativo');
  } else {
    clearFieldError('input-capital-inicial', 'error-capital-inicial');
  }
}

// ── Save ──────────────────────────────────────────────────────────

function guardarUsuario() {
  if (_onbStep < 3) { onbNextStep(); return; }

  const nameEl = document.getElementById('input-nombre');
  const name   = nameEl ? nameEl.value.trim() : '';
  if (!name) {
    _goToOnbStep(1);
    setFieldError('input-nombre', 'error-onb-nombre', 'Por favor ingresa tu nombre para continuar');
    nameEl?.focus();
    return;
  }

  const capitalEl  = document.getElementById('input-capital-inicial');
  const capitalStr = capitalEl?.value ?? '';
  const capital    = parseFloat(capitalStr);
  if (capitalStr !== '' && capital < 0) {
    setFieldError('input-capital-inicial', 'error-capital-inicial', 'El capital no puede ser negativo');
    capitalEl?.focus();
    return;
  }

  const currencyObj = COUNTRIES.find(p => p.currency === _selectedCurrencyOnb) ?? _selectedCountryOnb;

  document.removeEventListener('mousedown', _closeCountryComboOnbIfOutside);
  document.removeEventListener('mousedown', _closeCurrencyOnbIfOutside);

  Storage.saveUser({
    name,
    country:  _selectedCountryOnb.country,
    currency: currencyObj.currency,
    symbol:   currencyObj.symbol
  });

  if (capitalStr !== '' && capital > 0) {
    Storage.addTransaction({
      id: Date.now().toString(),
      type: 'ingreso',
      amount: capital,
      category: 'capital_inicial',
      categoryLabel: 'Capital inicial',
      categoryIcon: 'capital_inicial',
      date: new Date().toISOString()
    });
  }

  Haptics?.success();
  navigate(SCREENS.HOME);
}