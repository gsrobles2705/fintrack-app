// categorias.js - Full category management system (unified storage)

// ==========================================
// 1. BASE CATALOGUE (used only for reset)
// ==========================================
const BASE_CATALOGUE = {
  expense: [
    { id: 'comida',     label: 'Comida',     iconKey: 'comida'     },
    { id: 'transporte', label: 'Transporte', iconKey: 'transporte' },
    { id: 'diversion',  label: 'Diversión',  iconKey: 'diversion'  },
    { id: 'compras',    label: 'Compras',    iconKey: 'compras'    },
    { id: 'salud',      label: 'Salud',      iconKey: 'salud'      }
  ],
  income: [
    { id: 'mesada',    label: 'Mesada',    iconKey: 'mesada'    },
    { id: 'trabajo',   label: 'Trabajo',   iconKey: 'trabajo'   },
    { id: 'freelance', label: 'Freelance', iconKey: 'freelance' },
    { id: 'venta',     label: 'Venta',     iconKey: 'venta'     },
    { id: 'regalos',   label: 'Regalos',   iconKey: 'regalos'   }
  ]
};

// ==========================================
// 1.5 SPECIAL CATEGORIES (not editable)
// ==========================================
function getSpecialCategory(id) {
  if (id === 'capital_inicial') {
    return { id: 'capital_inicial', label: 'Capital inicial', iconKey: 'capital_inicial' };
  }
  if (id === 'deuda') {
    return { id: 'deuda', label: 'Pago de deuda', iconKey: 'deuda' };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// COLOR PALETTE para categorías personalizadas
// ─────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#50C878', '#F05454', '#FFB03A', '#4285F4', '#A78BFA',
  '#34C5B1', '#FF7F50', '#63C5DA', '#E91E8C', '#8BC34A'
];

// ==========================================
// 2. HELPERS
// ==========================================
function ensureCategoriesInitialized() {
  let all = Storage.getAllCategories();
  if (!all) {
    Storage.initCategoriesFromBase(BASE_CATALOGUE.expense, BASE_CATALOGUE.income);
  }
}

function getAllCategoriesOfType(tipo) {
  ensureCategoriesInitialized();
  const storageType = tipo === 'gasto' ? 'expense' : 'income';
  return Storage.getCategoriesByType(storageType) || [];
}

function getCategoryDefinition(id) {
  if (!id) return null;
  const special = getSpecialCategory(id);
  if (special) return special;
  const expenseCats = getAllCategoriesOfType('gasto');
  const incomeCats = getAllCategoriesOfType('ingreso');
  const all = [...expenseCats, ...incomeCats];
  return all.find(c => c.id === id);
}

function getCategoryIconKeyFromId(id) {
  const def = getCategoryDefinition(id);
  return def?.iconKey || 'categoria';
}

window.getCategoryDefinition = getCategoryDefinition;
window.getCategoryIconKeyFromId = getCategoryIconKeyFromId;

function _countTransactionsByCategory(catId) {
  return Storage.getTransactions().filter(t => t.category === catId).length;
}

// ─────────────────────────────────────────────────────────────────
// ACTIVE CATEGORIES (grid visibles)
// ─────────────────────────────────────────────────────────────────
function getActiveCategories(tipo) {
  const storageType = tipo === 'gasto' ? 'expense' : 'income';
  let activeIds = Storage.getActiveCategories(storageType);
  const allCats = getAllCategoriesOfType(tipo);
  if (!activeIds || activeIds.length === 0) {
    activeIds = allCats.map(c => c.id);
    Storage.saveActiveCategories(storageType, activeIds);
  }
  const ordered = [];
  for (let id of activeIds) {
    const cat = allCats.find(c => c.id === id);
    if (cat) ordered.push(cat);
  }
  ordered.push({ id: 'otro', label: 'Otro', iconKey: 'categoria' });
  return ordered;
}

function getCategorias(tipo) { return getActiveCategories(tipo); }

// ─────────────────────────────────────────────────────────────────
// ICON PICKER
// ─────────────────────────────────────────────────────────────────
function _renderIconPicker() {
  const grid = document.getElementById('cat-icon-grid');
  if (!grid) return;
  let lastGroup = '';
  let html = '';
  for (let icon of ICONS_CATALOG) {
    if (icon.group !== lastGroup) {
      if (lastGroup !== '') html += `<div class="icon-group-divider"></div>`;
      html += `<div class="icon-group-label">${icon.group}</div>`;
      lastGroup = icon.group;
    }
    html += `<button class="icon-picker-btn ${icon.key === _selectedIconKey ? 'selected' : ''}" onclick="seleccionarIconoCat('${icon.key}')" title="${icon.label}">${Icons.get(icon.key)}</button>`;
  }
  grid.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────
// MODAL DE GESTIÓN (muestra colores en la lista)
// ─────────────────────────────────────────────────────────────────
let _categoryType = 'gasto';
let _editingCategoryId = null;
let _selectedIconKey = 'categoria';

function abrirModalCategorias(tipo) {
  _categoryType = tipo;
  renderManageModal();
  document.getElementById('modal-categorias').style.display = 'flex';
}

function cerrarModalCategorias() {
  closeModal('modal-categorias', () => renderCategorias());
}

function renderManageModal() {
  const titleEl = document.getElementById('modal-cats-titulo');
  titleEl.textContent = _categoryType === 'gasto' ? 'Categorías de Gastos' : 'Categorías de Ingresos';
  
  const container = document.getElementById('modal-cats-lista');
  const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
  let activeIds = Storage.getActiveCategories(storageType) || [];
  const allCategories = getAllCategoriesOfType(_categoryType);
  
  let html = '';
  allCategories.forEach(cat => {
    const isActive = activeIds.includes(cat.id);
    const colorStyle = cat.color ? `style="background:${cat.color}20; border-color:${cat.color}"` : '';
    html += `
      <div class="cat-manage-item">
        <div class="cat-manage-icon" ${colorStyle}>${Icons.get(cat.iconKey)}</div>
        <div class="cat-manage-info">
          <p class="cat-manage-label">${cat.label}</p>
          ${cat.color ? `<span class="cat-manage-meta" style="color:${cat.color}">● Color asignado</span>` : ''}
        </div>
        <div class="cat-manage-acciones">
          <button class="cat-btn-edit" onclick="abrirFormCategoria('${cat.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
              <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415" />
              <path d="M16 5l3 3" />
            </svg>
          </button>
          <label class="cat-toggle-switch">
            <input type="checkbox" class="cat-toggle" data-id="${cat.id}" ${isActive ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <button class="cat-btn-delete" onclick="deleteCategory('${cat.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M18 6l-12 12" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>`;
  });
  container.innerHTML = html;
  
  container.querySelectorAll('.cat-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const id = toggle.dataset.id;
      let newActive = [...activeIds];
      if (toggle.checked) {
        if (!newActive.includes(id)) newActive.push(id);
      } else {
        newActive = newActive.filter(i => i !== id);
      }
      Storage.saveActiveCategories(storageType, newActive);
      renderManageModal();
      renderCategorias();
    });
  });
  
  let oldNewBtn = container.parentElement.querySelector('.btn-nueva-cat');
  let oldResetBtn = container.parentElement.querySelector('.btn-reset-cats');
  let oldCloseBtn = container.parentElement.querySelector('.btn-ghost');
  if (oldNewBtn) oldNewBtn.remove();
  if (oldResetBtn) oldResetBtn.remove();
  if (oldCloseBtn) oldCloseBtn.remove();

  // Botón Nueva categoría
  const newBtn = document.createElement('button');
  newBtn.className = 'btn-nueva-cat';
  newBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14"/><path d="M5 12l14 0"/></svg> Nueva categoría`;
  newBtn.onclick = () => abrirFormCategoria();
  container.parentElement.appendChild(newBtn);

  // Botón Restablecer
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-secondary btn-reset-cats';
  resetBtn.textContent = 'Restablecer categorías predeterminadas';
  resetBtn.onclick = () => resetDefaultCategories();
  container.parentElement.appendChild(resetBtn);

  // Botón Cerrar
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-ghost';
  closeBtn.textContent = 'Cerrar';
  closeBtn.onclick = () => cerrarModalCategorias();
  container.parentElement.appendChild(closeBtn);
}

// ─────────────────────────────────────────────────────────────────
// FORMULARIO NUEVA/EDITAR categoría (asigna color automático)
// ─────────────────────────────────────────────────────────────────
function abrirFormCategoria(id = null) {
  _editingCategoryId = id;
  const titleEl = document.getElementById('modal-cat-form-titulo');
  const hintEl = document.getElementById('modal-cat-form-hint');
  const labelInput = document.getElementById('cat-input-label');
  labelInput.value = '';
  clearFieldError('cat-input-label', 'error-cat-label');
  
  if (id) {
    const cat = getCategoryDefinition(id);
    if (!cat) return;
    titleEl.textContent = 'Editar categoría';
    if (hintEl) hintEl.textContent = 'Modifica el nombre o el ícono.';
    labelInput.value = cat.label;
    _selectedIconKey = cat.iconKey || 'categoria';
  } else {
    titleEl.textContent = 'Nueva categoría';
    if (hintEl) hintEl.textContent = 'Aparecerá siempre en tu grid, junto a las categorías base.';
    _selectedIconKey = 'categoria';
  }
  
  document.getElementById('cat-icon-section').style.display = 'block';
  _renderIconPicker();
  document.getElementById('modal-cat-form').style.display = 'flex';
}

function cerrarFormCategoria() {
  closeModal('modal-cat-form');
  _editingCategoryId = null;
}

function guardarCategoria() {
  const labelInput = document.getElementById('cat-input-label');
  const label = labelInput.value.trim();
  clearFieldError('cat-input-label', 'error-cat-label');
  
  if (!label) {
    setFieldError('cat-input-label', 'error-cat-label', 'El nombre es obligatorio');
    return;
  }
  if (label.length > 20) {
    setFieldError('cat-input-label', 'error-cat-label', 'Máximo 20 caracteres');
    return;
  }
  
  const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
  const allCats = getAllCategoriesOfType(_categoryType);
  const isDuplicate = allCats.some(c => c.label.toLowerCase() === label.toLowerCase() && c.id !== _editingCategoryId);
  if (isDuplicate) {
    setFieldError('cat-input-label', 'error-cat-label', 'Ya existe una categoría con ese nombre');
    return;
  }
  
  // Asignar color si es nueva categoría
  const existingColors = allCats.map(c => c.color).filter(Boolean);
  let assignedColor = null;
  if (!_editingCategoryId) {
    for (let col of CATEGORY_COLORS) {
      if (!existingColors.includes(col)) {
        assignedColor = col;
        break;
      }
    }
    if (!assignedColor) assignedColor = CATEGORY_COLORS[allCats.length % CATEGORY_COLORS.length];
  }
  
  if (_editingCategoryId) {
    const updateData = { label, iconKey: _selectedIconKey };
    if (assignedColor) updateData.color = assignedColor;
    Storage.updateCategory(storageType, _editingCategoryId, updateData);
    Toast.success('Categoría actualizada', `"${label}" fue modificada correctamente.`);
  } else {
    const newId = `custom_${Date.now()}`;
    Storage.addCustomCategory(storageType, {
      id: newId, label, iconKey: _selectedIconKey,
      color: assignedColor,
      custom: true
    });
    Toast.success('Categoría añadida', `"${label}" aparecerá siempre en tu grid.`);
  }
  
  cerrarFormCategoria();
  renderManageModal();
  renderCategorias();
}

// ─────────────────────────────────────────────────────────────────
// DELETE CATEGORY
// ─────────────────────────────────────────────────────────────────
async function deleteCategory(id) {
  if (id === 'otro') return;
  const cat = getCategoryDefinition(id);
  if (!cat) return;
  
  const ok = await AppConfirm({
    titulo: 'Eliminar categoría',
    mensaje: `¿Eliminar "${cat.label}" permanentemente? Esta acción no se puede deshacer.`,
    tipo: 'danger',
    btnOk: 'Sí, eliminar',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;
  
  const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
  Storage.deleteCategory(storageType, id);
  renderManageModal();
  renderCategorias();
  Toast.success('Categoría eliminada', `"${cat.label}" fue eliminada.`);
}

// ─────────────────────────────────────────────────────────────────
// RESET DEFAULT CATEGORIES
// ─────────────────────────────────────────────────────────────────
async function resetDefaultCategories() {
  const ok = await AppConfirm({
    titulo: 'Restablecer categorías',
    mensaje: 'Se añadirán las categorías base que falten (Comida, Transporte, etc.). No se eliminarán tus categorías personalizadas.',
    tipo: 'warning',
    btnOk: 'Restablecer',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;
  
  const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
  const baseList = _categoryType === 'gasto' ? BASE_CATALOGUE.expense : BASE_CATALOGUE.income;
  Storage.restoreBaseCategories(storageType, baseList);
  renderManageModal();
  renderCategorias();
  Toast.success('Categorías restablecidas', 'Se añadieron las categorías base faltantes.');
}

// ─────────────────────────────────────────────────────────────────
// RENDER de la cuadrícula en la pantalla de registro (con color visual)
// ─────────────────────────────────────────────────────────────────
function renderCategorias() {
  const categories = getCategorias(currentType);
  const modeClass  = `modo-${currentType}`;
  const container  = document.getElementById('categorias-container');
  const activeOtherText = (currentCategory && currentCategory.startsWith('otro_libre:'))
    ? currentCategory.slice('otro_libre:'.length)
    : '';
  const isOtherSelected = currentCategory === 'otro' || (currentCategory && currentCategory.startsWith('otro_libre:'));
  
  container.innerHTML = categories.map(cat => {
    const isOther   = cat.id === 'otro';
    const isSelected = isOther ? isOtherSelected : currentCategory === cat.id;
    const colorStyle = cat.color ? `style="--cat-color:${cat.color}"` : '';
    return `
      <button
        class="categoria-btn ${isSelected ? `selected ${modeClass}` : ''}"
        onclick="${isOther ? 'toggleCategoriaOtro()' : `seleccionarCategoria('${cat.id}')`}"
        ${colorStyle}>
        <div class="categoria-icon-wrap" style="${cat.color ? `border-color:${cat.color}80` : ''}">
          ${Icons.get(cat.iconKey)}
        </div>
        <span class="categoria-label">${cat.label}</span>
      </button>`;
  }).join('');
  
  _renderOtherInput(isOtherSelected, activeOtherText, modeClass);
}

// ─────────────────────────────────────────────────────────────────
// LEGACY COMPATIBILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────
function _getLabelCategoria(catId) {
  if (catId && catId.startsWith('otro_libre:')) {
    return catId.slice('otro_libre:'.length);
  }
  const def = getCategoryDefinition(catId);
  return def ? def.label : capitalize((catId || '').replace(/_/g, ' '));
}

function getIconoCategoria(id) {
  if (id === 'otro_libre') return Icons.get('categoria');
  const special = getSpecialCategory(id);
  if (special) return Icons.get(special.iconKey);
  const def = getCategoryDefinition(id);
  if (def) return Icons.get(def.iconKey);
  return Icons.get('categoria');
}

function seleccionarIconoCat(key) {
  _selectedIconKey = key;
  _renderIconPicker();
}

// Expose initialization for app.js
window.ensureCategoriesInitialized = ensureCategoriesInitialized;