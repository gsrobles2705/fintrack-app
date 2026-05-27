// perfil.js

let _paisSeleccionado      = null;
let _monedaSeleccionada    = null;   // currency code (ej: 'COP') — independiente del país
let _comboAbierto          = false;
let _monedaDropdownAbierto = false;

// ─────────────────────────────────────────────────────────────────
// RENDER VISTA PERFIL
// ─────────────────────────────────────────────────────────────────
function renderPerfil() {
  const user = Storage.getUser();
  if (!user) return;

  document.getElementById('perfil-avatar-letra')
    .textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('perfil-nombre')
    .textContent = user.name;

  const paisObj = PAISES.find(p => p.currency === user.currency) ?? PAISES[0];
  document.getElementById('perfil-pais').textContent   = user.country ?? paisObj.country;
  document.getElementById('perfil-moneda').textContent =
    `${user.symbol} — ${paisObj.monedaNombre}`;
}

// ─────────────────────────────────────────────────────────────────
// RENDER EDITAR PERFIL
// ─────────────────────────────────────────────────────────────────
function renderEditarPerfil() {
  const user = Storage.getUser();
  if (!user) return;

  document.getElementById('editar-avatar-letra').textContent =
    user.name.charAt(0).toUpperCase();

  const inputNombre = document.getElementById('editar-input-nombre');
  inputNombre.value = user.name;

  // Limpia errores previos al entrar
  clearFieldError('editar-input-nombre', 'error-editar-nombre');

  inputNombre.oninput = function () {
    document.getElementById('editar-avatar-letra').textContent =
      this.value.charAt(0).toUpperCase() || '?';
    // Limpia error en tiempo real mientras el usuario escribe
    if (this.value.trim()) clearFieldError('editar-input-nombre', 'error-editar-nombre');
  };

  _paisSeleccionado      = PAISES.find(p => p.country === user.country)
                           ?? PAISES.find(p => p.currency === user.currency)
                           ?? PAISES[0];
  _monedaSeleccionada    = user.currency;
  _comboAbierto          = false;
  _monedaDropdownAbierto = false;

  _initCombobox();
  _renderMonedaDropdown();

  document.addEventListener('mousedown', _cerrarComboSiAfuera);
  document.addEventListener('mousedown', _cerrarMonedaSiAfuera);
}

// ─────────────────────────────────────────────────────────────────
// COMBOBOX DE PAÍS
// ─────────────────────────────────────────────────────────────────
function _initCombobox() {
  const input    = document.getElementById('combo-pais-input');
  const dropdown = document.getElementById('combo-pais-dropdown');
  if (!input || !dropdown) return;

  input.value = _paisSeleccionado?.country ?? '';

  const fresh = input.cloneNode(true);
  input.parentNode.replaceChild(fresh, input);

  fresh.onfocus = () => { fresh.value = ''; _abrirCombo(''); };
  fresh.oninput = () => _abrirCombo(fresh.value.trim());
  fresh.onblur  = () => {
    setTimeout(() => { fresh.value = _paisSeleccionado?.country ?? ''; }, 150);
  };
}

function _cerrarComboSiAfuera(e) {
  const wrapper = document.getElementById('combo-pais-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _cerrarCombo();
}

function _abrirCombo(query = '') {
  const dropdown = document.getElementById('combo-pais-dropdown');
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
        const activo = _paisSeleccionado?.currency === p.currency;
        return `
          <div class="combo-option ${activo ? 'selected' : ''}"
               onmousedown="seleccionarPaisCombo('${p.currency}')">
            <span class="combo-option-name">${p.country}</span>
            <span class="combo-option-symbol ${activo ? 'active' : ''}">${p.symbol}</span>
          </div>`;
      }).join('');

  dropdown.style.display = 'block';
  _comboAbierto          = true;
}

function _cerrarCombo() {
  const dropdown = document.getElementById('combo-pais-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const input = document.getElementById('combo-pais-input');
  if (input && _paisSeleccionado) input.value = _paisSeleccionado.country;
  _comboAbierto = false;
}

function seleccionarPaisCombo(currency) {
  _paisSeleccionado = PAISES.find(p => p.currency === currency);
  const input = document.getElementById('combo-pais-input');
  if (input) input.value = _paisSeleccionado.country;
  _cerrarCombo();
  _renderMonedaDropdown();
}

// ─────────────────────────────────────────────────────────────────
// CUSTOM DROPDOWN DE MONEDA
// ─────────────────────────────────────────────────────────────────
function _renderMonedaDropdown() {
  const displayInput = document.getElementById('combo-moneda-display');
  const dropdown     = document.getElementById('combo-moneda-dropdown');
  if (!displayInput || !dropdown) return;

  const monedaObj = PAISES.find(p => p.currency === _monedaSeleccionada) ?? PAISES[0];
  displayInput.value = `${monedaObj.symbol} — ${monedaObj.monedaNombre}`;

  dropdown.innerHTML = PAISES.map(p => {
    const activo = p.currency === _monedaSeleccionada;
    return `
      <div class="combo-option ${activo ? 'selected' : ''}"
           onmousedown="seleccionarMonedaDropdown('${p.currency}')">
        <span class="combo-option-name">${p.symbol} — ${p.monedaNombre}</span>
        ${activo
          ? `<span class="combo-option-symbol active">✓</span>`
          : `<span class="combo-option-symbol">${p.currency}</span>`}
      </div>`;
  }).join('');
}

function _toggleMonedaDropdown() {
  _monedaDropdownAbierto ? _cerrarMonedaDropdown() : _abrirMonedaDropdown();
}

function _abrirMonedaDropdown() {
  _cerrarCombo();
  const dropdown = document.getElementById('combo-moneda-dropdown');
  if (!dropdown) return;
  _renderMonedaDropdown();
  dropdown.style.display = 'block';
  _monedaDropdownAbierto = true;
}

function _cerrarMonedaDropdown() {
  const dropdown = document.getElementById('combo-moneda-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _monedaDropdownAbierto = false;
}

function _cerrarMonedaSiAfuera(e) {
  const wrapper = document.getElementById('combo-moneda-wrapper');
  if (wrapper && !wrapper.contains(e.target)) _cerrarMonedaDropdown();
}

function seleccionarMonedaDropdown(currency) {
  _monedaSeleccionada = currency;
  _cerrarMonedaDropdown();
  _renderMonedaDropdown();
}

// ─────────────────────────────────────────────────────────────────
// GUARDAR EDICIÓN — inline error en nombre + toast de confirmación
// ─────────────────────────────────────────────────────────────────
function guardarEdicion() {
  const nombre = document.getElementById('editar-input-nombre').value.trim();

  // Limpia errores previos
  clearFieldError('editar-input-nombre', 'error-editar-nombre');

  let hayError = false;

  if (!nombre) {
    setFieldError('editar-input-nombre', 'error-editar-nombre',
      'El nombre no puede estar vacío');
    hayError = true;
  }

  if (!_paisSeleccionado) {
    Toast.error('País no seleccionado', 'Por favor elige tu país de residencia.');
    hayError = true;
  }

  if (hayError) return;

  const monedaObj = PAISES.find(p => p.currency === _monedaSeleccionada)
                    ?? _paisSeleccionado;

  const user = Storage.getUser();
  Storage.saveUser({
    ...user,
    name:     nombre,
    country:  _paisSeleccionado.country,
    currency: monedaObj.currency,
    symbol:   monedaObj.symbol
  });

  _limpiarListeners();

  // Toast de éxito antes de navegar
  Toast.success('Perfil actualizado', 'Los cambios se guardaron correctamente.');

  navigate(SCREENS.PERFIL);
}

// ─────────────────────────────────────────────────────────────────
// CERRAR SESIÓN — confirm in-app en lugar de confirm() nativo
// ─────────────────────────────────────────────────────────────────
async function cerrarSesion() {
  const confirmado = await AppConfirm({
    titulo:    'Cerrar sesión',
    mensaje:   'Se eliminarán todos tus datos locales. Esta acción no se puede deshacer.',
    tipo:      'danger',
    btnOk:     'Sí, cerrar sesión',
    btnCancel: 'Cancelar'
  });

  if (!confirmado) return;

  _limpiarListeners();
  Storage.clearAll();
  navigate(SCREENS.ONBOARDING);
}

// ─────────────────────────────────────────────────────────────────
// UTILIDAD INTERNA
// ─────────────────────────────────────────────────────────────────
function _limpiarListeners() {
  document.removeEventListener('mousedown', _cerrarComboSiAfuera);
  document.removeEventListener('mousedown', _cerrarMonedaSiAfuera);
}