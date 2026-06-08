// perfil.js

let _selectedCountry       = null;
let _selectedCurrency      = null;   // currency code (e.g. 'COP') — independent of country
let _countryComboOpen      = false;
let _currencyDropdownOpen  = false;

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

  // Clear any previous errors on entry
  clearFieldError('editar-input-nombre', 'error-editar-nombre');

  nameInput.oninput = function () {
    document.getElementById('editar-avatar-letra').textContent =
      this.value.charAt(0).toUpperCase() || '?';
    // Clear error in real time while the user types
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

  // Clear previous errors
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

  // Success toast before navigating
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