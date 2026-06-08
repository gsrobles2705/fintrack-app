// categorias.js - Full category management system
// - Complete catalogue of base categories (never deleted)
// - User can activate/deactivate any base or custom category
// - Custom categories can be added/edited/removed (removal only if no transactions)
// - Transaction history stores frozen categoryLabel and categoryIcon

// ==========================================
// 1. BASE CATALOGUE (complete, never changes)
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

// ==========================================
// 2. HELPERS
// ==========================================
/** Get full definition of a category by its ID (base or custom) */
function getCategoryDefinition(id) {
  if (!id) return null;
  // Special categories first
  const special = getSpecialCategory(id);
  if (special) return special;
  // Buscar en catálogo base
  for (let type of ['expense', 'income']) {
    const found = BASE_CATALOGUE[type].find(c => c.id === id);
    if (found) return found;
  }
  // Buscar en categorías personalizadas (guardadas como gastos/ingresos)
  const custom = Storage.getCustomCategories();
  const allCustom = [...(custom.gastos || []), ...(custom.ingresos || [])];
  return allCustom.find(c => c.id === id);
}

/** Get just the iconKey from a category ID (fallback 'categoria') */
function getCategoryIconKeyFromId(id) {
  const def = getCategoryDefinition(id);
  return def?.iconKey || 'categoria';
}

// Expose globally for migration in storage.js
window.getCategoryDefinition = getCategoryDefinition;
window.getCategoryIconKeyFromId = getCategoryIconKeyFromId;

/** Get the list of custom categories (pinned) from Storage */
function getCustomCategories(tipo) {
  const custom = Storage.getCustomCategories();
  return tipo === 'gasto' ? custom.gastos : custom.ingresos;
}

/** Count transactions using a given category ID (for delete safety) */
function _countTransactionsByCategory(catId) {
  return Storage.getTransactions().filter(t => t.category === catId).length;
}

// ==========================================
// 3. ACTIVE CATEGORIES (visible in the grid)
// ==========================================
/**
 * Returns ordered list of active categories for a given type, plus "Otro" at the end.
 * Order respects the active IDs stored by the user.
 */
function getActiveCategories(tipo) {
  const storageType = tipo === 'gasto' ? 'expense' : 'income';
  let activeIds = Storage.getActiveCategories(storageType);
  if (!activeIds || activeIds.length === 0) {
    // First time: all base categories are active
    activeIds = BASE_CATALOGUE[storageType].map(c => c.id);
    Storage.saveActiveCategories(storageType, activeIds);
  }

  const base = BASE_CATALOGUE[storageType];
  const custom = getCustomCategories(tipo);
  const all = [...base, ...custom];

  const ordered = [];
  for (let id of activeIds) {
    const cat = all.find(c => c.id === id);
    if (cat) ordered.push(cat);
  }
  // Always add "Otro" at the end
  ordered.push({ id: 'otro', label: 'Otro', iconKey: 'categoria' });
  return ordered;
}

// Original getCategorias now just calls getActiveCategories
function getCategorias(tipo) {
  return getActiveCategories(tipo);
}

// ==========================================
// 4. ICON PICKER (grouped)
// ==========================================
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

// ==========================================
// 5. MODAL MANAGEMENT (activate/deactivate categories)
// ==========================================
let _categoryType = 'gasto';   // 'gasto' or 'ingreso'
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
  const baseList = BASE_CATALOGUE[storageType];
  const customList = getCustomCategories(_categoryType);
  
  let html = `<div class="cat-group-title">Categorías base</div>`;
  baseList.forEach(cat => {
    const isActive = activeIds.includes(cat.id);
    html += `
      <div class="cat-manage-item base-item">
        <div class="cat-manage-icon">${Icons.get(cat.iconKey)}</div>
        <div class="cat-manage-info">
          <p class="cat-manage-label">${cat.label}</p>
        </div>
        <label class="cat-toggle-switch">
          <input type="checkbox" class="cat-toggle" data-id="${cat.id}" ${isActive ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  });
  
  if (customList.length) {
    html += `<div class="cat-group-title">Mis categorías</div>`;
    customList.forEach(cat => {
      const isActive = activeIds.includes(cat.id);
      html += `
        <div class="cat-manage-item">
          <div class="cat-manage-icon">${Icons.get(cat.iconKey || 'categoria')}</div>
          <div class="cat-manage-info">
            <p class="cat-manage-label">${cat.label}</p>
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
            <button class="cat-btn-delete" onclick="deletePinnedCategory('${cat.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>`;
    });
  }
  
  container.innerHTML = html;
  
  // Attach event listeners to toggles
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
      renderManageModal();      // refresh to keep order
      renderCategorias();       // update the registration grid
    });
  });
  
  // Add "New category" button (only if not already present)
  let newBtn = container.parentElement.querySelector('.btn-nueva-cat');
  if (!newBtn) {
    newBtn = document.createElement('button');
    newBtn.className = 'btn-nueva-cat';
    newBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14"/><path d="M5 12l14 0"/></svg> Nueva categoría`;
    newBtn.onclick = () => abrirFormCategoria();
    container.parentElement.appendChild(newBtn);
  }
}

// ==========================================
// 6. ADD / EDIT CUSTOM CATEGORY
// ==========================================
function abrirFormCategoria(id = null) {
  _editingCategoryId = id;
  const titleEl = document.getElementById('modal-cat-form-titulo');
  const hintEl = document.getElementById('modal-cat-form-hint');
  const labelInput = document.getElementById('cat-input-label');
  labelInput.value = '';
  clearFieldError('cat-input-label', 'error-cat-label');
  
  if (id) {
    const custom = Storage.getCustomCategories();
    const list = _categoryType === 'gasto' ? custom.gastos : custom.ingresos;
    const cat = list.find(c => c.id === id);
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
  
  const custom = Storage.getCustomCategories();
  const list = _categoryType === 'gasto' ? custom.gastos : custom.ingresos;
  const base = _categoryType === 'gasto' ? BASE_CATALOGUE.expense : BASE_CATALOGUE.income;
  
  // Check duplicate name (excluding current editing)
  const isDuplicate = list.some(c => c.label.toLowerCase() === label.toLowerCase() && c.id !== _editingCategoryId);
  const isDupBase = base.some(c => c.label.toLowerCase() === label.toLowerCase());
  if (isDuplicate || isDupBase) {
    setFieldError('cat-input-label', 'error-cat-label', 'Ya existe una categoría con ese nombre');
    return;
  }
  
  const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
  let activeIds = Storage.getActiveCategories(storageType);
  
  if (_editingCategoryId) {
    // Edit existing
    const idx = list.findIndex(c => c.id === _editingCategoryId);
    if (idx !== -1) {
      list[idx].label = label;
      list[idx].iconKey = _selectedIconKey;
    }
    Toast.success('Categoría actualizada', `"${label}" fue modificada correctamente.`);
  } else {
    // New category
    const newId = `custom_${Date.now()}`;
    list.push({ id: newId, label, iconKey: _selectedIconKey, custom: true });
    // Activate it by default
    if (!activeIds.includes(newId)) {
      activeIds.push(newId);
      Storage.saveActiveCategories(storageType, activeIds);
    }
    Toast.success('Categoría añadida', `"${label}" aparecerá siempre en tu grid.`);
  }
  
  if (_categoryType === 'gasto') custom.gastos = list;
  else custom.ingresos = list;
  Storage.saveCustomCategories(custom);
  cerrarFormCategoria();
  renderManageModal();
  renderCategorias();
}

// ==========================================
// 7. DELETE CUSTOM CATEGORY (safe)
// ==========================================
async function deletePinnedCategory(id) {
  const custom = Storage.getCustomCategories();
  const list = _categoryType === 'gasto' ? custom.gastos : custom.ingresos;
  const cat = list.find(c => c.id === id);
  if (!cat) return;
  
  const usageCount = _countTransactionsByCategory(id);
  if (usageCount > 0) {
    Toast.warning('No se puede eliminar', `Esta categoría tiene ${usageCount} transacción(es). Se ocultará del grid pero seguirá en el historial.`);
    // Just deactivate it
    const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
    let activeIds = Storage.getActiveCategories(storageType).filter(i => i !== id);
    Storage.saveActiveCategories(storageType, activeIds);
    renderManageModal();
    renderCategorias();
    return;
  }
  
  const ok = await AppConfirm({
    titulo: 'Eliminar categoría',
    mensaje: `¿Eliminar "${cat.label}" permanentemente?`,
    tipo: 'danger',
    btnOk: 'Sí, eliminar',
    btnCancel: 'Cancelar'
  });
  if (!ok) return;
  
  const newList = list.filter(c => c.id !== id);
  if (_categoryType === 'gasto') custom.gastos = newList;
  else custom.ingresos = newList;
  Storage.saveCustomCategories(custom);
  // Also remove from active list
  const storageType = _categoryType === 'gasto' ? 'expense' : 'income';
  let activeIds = Storage.getActiveCategories(storageType).filter(i => i !== id);
  Storage.saveActiveCategories(storageType, activeIds);
  Toast.success('Categoría eliminada', `"${cat.label}" fue eliminada.`);
  renderManageModal();
  renderCategorias();
}

// Alias for HTML onclick
const eliminarPinned = deletePinnedCategory;

// ==========================================
// 8. LEGACY _getLabelCategoria (kept for compatibility, but will be overridden by transaction's own label)
// ==========================================
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