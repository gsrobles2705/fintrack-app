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

  // ---- DEBTS ----

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

  // ---- CUSTOM CATEGORIES ----
  //
  // Stored structure:
  // {
  //   expenses: [{ id, label, iconKey, custom: true }, ...],
  //   income:   [{ id, label, iconKey, custom: true }, ...]
  // }
  //
  // System categories (food, transport, etc.) are NOT stored here —
  // they are defined in categorias.js and merged at runtime.
  // Only custom ones are persisted.

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

  // ---- MIGRATION for old transactions (add categoryLabel and categoryIcon) ----
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
  }
};