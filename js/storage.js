// storage.js
// Responsibility: all communication with localStorage

const Storage = {

  // ---- USER ----
  saveUser(userData) {
    localStorage.setItem('fintrack_user', JSON.stringify(userData));
  },
  getUser() {
    const data = localStorage.getItem('fintrack_user');
    if (!data) return null;
    const user = JSON.parse(data);
    if (!user.symbol) {
      user.symbol = user.currency === '$' ? '$' : 'S/';
    }
    return user;
  },

  // ---- TRANSACTIONS ----
  saveTransactions(transactions) {
    localStorage.setItem('fintrack_transactions', JSON.stringify(transactions));
  },
  getTransactions() {
    const data = localStorage.getItem('fintrack_transactions');
    return data ? JSON.parse(data) : [];
  },
  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.unshift(transaction);
    this.saveTransactions(transactions);
  },
  deleteTransaction(id) {
    const transactions = this.getTransactions();
    this.saveTransactions(transactions.filter(t => t.id !== id));
  },
  // NUEVA MEJORA 5: actualizar transacción
  updateTransaction(id, updatedData) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updatedData };
      this.saveTransactions(transactions);
      return true;
    }
    return false;
  },

  // ---- WEEKLY GOAL ----
  saveGoal(goal) {
    localStorage.setItem('fintrack_goal', JSON.stringify(goal));
  },
  getGoal() {
    const data = localStorage.getItem('fintrack_goal');
    return data ? JSON.parse(data) : null;
  },

  // ---- DAILY BUDGET ----
  saveDailyBudget(amount) {
    localStorage.setItem('fintrack_daily_budget', JSON.stringify(amount));
  },
  getDailyBudget() {
    const data = localStorage.getItem('fintrack_daily_budget');
    return data ? JSON.parse(data) : null;
  },

  // ---- DEBTS (con tipo: 'por_pagar' o 'por_cobrar') ----
  saveDebts(debts) {
    localStorage.setItem('fintrack_deudas', JSON.stringify(debts));
  },
  getDebts() {
    const data = localStorage.getItem('fintrack_deudas');
    return data ? JSON.parse(data) : [];
  },
  addDebt(debt) {
    const debts = this.getDebts();
    debts.unshift(debt);
    this.saveDebts(debts);
  },
  updateDebt(id, changes) {
    const debts = this.getDebts();
    const idx = debts.findIndex(d => d.id === id);
    if (idx !== -1) debts[idx] = { ...debts[idx], ...changes };
    this.saveDebts(debts);
  },
  deleteDebt(id) {
    this.saveDebts(this.getDebts().filter(d => d.id !== id));
  },

  // ---- NOTIFICATIONS ----
  saveNotifications(notifications) {
    localStorage.setItem('fintrack_notifications', JSON.stringify(notifications));
  },
  getNotifications() {
    const data = localStorage.getItem('fintrack_notifications');
    return data ? JSON.parse(data) : [];
  },
  // NUEVA MEJORA 3: limpiar todas (usada en vaciar notificaciones)
  clearAllNotifications() {
    this.saveNotifications([]);
  },

  // ---- CUSTOM CATEGORIES ----
  saveCustomCategories(data) {
    localStorage.setItem('fintrack_categorias_custom', JSON.stringify(data));
  },
  getCustomCategories() {
    const data = localStorage.getItem('fintrack_categorias_custom');
    return data ? JSON.parse(data) : { gastos: [], ingresos: [] };
  },

  // ---- QUICK AMOUNTS ----
  saveQuickAmounts(amounts) {
    localStorage.setItem('fintrack_quick_amounts', JSON.stringify(amounts));
  },
  getQuickAmounts() {
    const data = localStorage.getItem('fintrack_quick_amounts');
    return data ? JSON.parse(data) : [2, 5, 10, 20, 50, 25];
  },

  // ---- ACTIVE CATEGORIES ----
  saveActiveCategories(type, ids) {
    localStorage.setItem(`fintrack_active_${type}`, JSON.stringify(ids));
  },
  getActiveCategories(type) {
    const stored = localStorage.getItem(`fintrack_active_${type}`);
    return stored ? JSON.parse(stored) : null;
  },

  // ---- MIGRATION ----
  migrateTransactions() {
    try {
      const transactions = this.getTransactions();
      let changed = false;
      for (let t of transactions) {
        if (!t.categoryLabel && t.category) {
          let label, iconKey;
          if (t.category === 'capital_inicial') {
            label = 'Capital inicial';
            iconKey = 'capital_inicial';
          } else if (t.category === 'deuda') {
            label = 'Pago de deuda';
            iconKey = 'deuda';
          } else if (t.category.startsWith('otro_libre:')) {
            label = t.category.slice('otro_libre:'.length);
            iconKey = 'categoria';
          } else {
            const def = window.getCategoryDefinition ? window.getCategoryDefinition(t.category) : null;
            if (def) {
              label = def.label;
              iconKey = def.iconKey;
            } else {
              label = t.category.replace(/_/g, ' ');
              iconKey = 'categoria';
            }
          }
          t.categoryLabel = label;
          t.categoryIcon = iconKey;
          changed = true;
        }
      }
      if (changed) this.saveTransactions(transactions);
    } catch (err) {
      console.error('Error en migrateTransactions:', err);
    }
  },

  // ---- UNIFIED CATEGORIES ----
  saveAllCategories(data) {
    localStorage.setItem('fintrack_all_categories', JSON.stringify(data));
  },
  getAllCategories() {
    const stored = localStorage.getItem('fintrack_all_categories');
    return stored ? JSON.parse(stored) : null;
  },
  initCategoriesFromBase(baseExpense, baseIncome) {
    const all = {
      expense: baseExpense.map(cat => ({ ...cat, custom: false })),
      income: baseIncome.map(cat => ({ ...cat, custom: false }))
    };
    this.saveAllCategories(all);
    this.saveActiveCategories('expense', all.expense.map(c => c.id));
    this.saveActiveCategories('income', all.income.map(c => c.id));
    return all;
  },
  getCategoriesByType(type) {
    const all = this.getAllCategories();
    if (!all) return [];
    return all[type] || [];
  },
  saveCategoriesByType(type, categories) {
    const all = this.getAllCategories() || { expense: [], income: [] };
    all[type] = categories;
    this.saveAllCategories(all);
  },
  addCustomCategory(type, category) {
    const categories = this.getCategoriesByType(type);
    categories.push({ ...category, custom: true });
    this.saveCategoriesByType(type, categories);
    let active = this.getActiveCategories(type) || [];
    if (!active.includes(category.id)) {
      active.push(category.id);
      this.saveActiveCategories(type, active);
    }
  },
  updateCategory(type, id, updates) {
    const categories = this.getCategoriesByType(type);
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...updates };
      this.saveCategoriesByType(type, categories);
    }
  },
  deleteCategory(type, id) {
    let categories = this.getCategoriesByType(type);
    const newCategories = categories.filter(c => c.id !== id);
    if (newCategories.length === categories.length) return false;
    this.saveCategoriesByType(type, newCategories);
    let active = this.getActiveCategories(type) || [];
    active = active.filter(aid => aid !== id);
    this.saveActiveCategories(type, active);
    return true;
  },
  restoreBaseCategories(type, baseCatalogue) {
    const current = this.getCategoriesByType(type);
    const existingIds = current.map(c => c.id);
    const toAdd = baseCatalogue.filter(baseCat => !existingIds.includes(baseCat.id));
    if (toAdd.length === 0) return;
    const updated = [...current, ...toAdd.map(cat => ({ ...cat, custom: false }))];
    this.saveCategoriesByType(type, updated);
    let active = this.getActiveCategories(type) || [];
    const newIds = toAdd.map(c => c.id);
    active = [...active, ...newIds.filter(id => !active.includes(id))];
    this.saveActiveCategories(type, active);
  },

  // ---- STREAK (NUEVA MEJORA 10) ----
  getStreak() {
    const streak = localStorage.getItem('fintrack_streak');
    return streak ? JSON.parse(streak) : { count: 0, lastDate: null };
  },
  updateStreak(hasActivityToday) {
    const streak = this.getStreak();
    const today = new Date().toDateString();
    // Si ya se actualizó hoy, no hacer nada
    if (streak.lastDate === today) return streak;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = streak.lastDate === yesterday.toDateString();
    if (hasActivityToday) {
      streak.count = wasYesterday ? streak.count + 1 : 1;
      streak.lastDate = today;
    } else if (!wasYesterday && streak.lastDate !== today) {
      streak.count = 0;
    }
    localStorage.setItem('fintrack_streak', JSON.stringify(streak));
    return streak;
  },

  // ---- UTILITY ----
  clearAll() {
    localStorage.removeItem('fintrack_user');
    localStorage.removeItem('fintrack_transactions');
    localStorage.removeItem('fintrack_goal');
    localStorage.removeItem('fintrack_deudas');
    localStorage.removeItem('fintrack_daily_budget');
    localStorage.removeItem('fintrack_notifications');
    localStorage.removeItem('fintrack_categorias_custom');
    localStorage.removeItem('fintrack_quick_amounts');
    localStorage.removeItem('fintrack_streak');
  }
};