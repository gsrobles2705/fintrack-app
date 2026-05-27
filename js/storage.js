// storage.js
// Responsabilidad: toda la comunicación con localStorage
// Si algo necesita guardarse o leerse, pasa por aquí

const Storage = {

  // ---- USUARIO ----

  saveUser(userData) {
    // Convierte el objeto a texto y lo guarda
    localStorage.setItem('fintrack_user', 
      JSON.stringify(userData));
  },

  // Agrega getUser con fallback de symbol para usuarios viejos
  getUser() {
    const data = localStorage.getItem('fintrack_user');
    if (!data) return null;
    const user = JSON.parse(data);
    // Retrocompatibilidad: usuarios que solo tenían currency="S/"
    if (!user.symbol) {
      user.symbol = user.currency === '$' ? '$' : 'S/';
    }
    return user;
  },

  // ---- TRANSACCIONES ----

  saveTransactions(transactions) {
    localStorage.setItem('fintrack_transactions',
      JSON.stringify(transactions));
  },

  getTransactions() {
    const data = localStorage.getItem('fintrack_transactions');
    return data ? JSON.parse(data) : [];
  },

  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.unshift(transaction); // Agrega al inicio
    this.saveTransactions(transactions);
  },

  deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    this.saveTransactions(filtered);
  },

  // ---- OBJETIVO SEMANAL ----

  saveGoal(goal) {
    localStorage.setItem('fintrack_goal',
      JSON.stringify(goal));
  },

  getGoal() {
    const data = localStorage.getItem('fintrack_goal');
    return data ? JSON.parse(data) : null;
  },

  // ---- PRESUPUESTO DIARIO ----

  saveDailyBudget(amount) {
    localStorage.setItem('fintrack_daily_budget',
      JSON.stringify(amount));
  },

  getDailyBudget() {
    const data = localStorage.getItem('fintrack_daily_budget');
    return data ? JSON.parse(data) : null;
  },

  // ---- DEUDAS ----

  saveDeudas(deudas) {
    localStorage.setItem('fintrack_deudas',
      JSON.stringify(deudas));
  },

  getDeudas() {
    const data = localStorage.getItem('fintrack_deudas');
    return data ? JSON.parse(data) : [];
  },

  addDeuda(deuda) {
    const deudas = this.getDeudas();
    deudas.unshift(deuda);
    this.saveDeudas(deudas);
  },

  updateDeuda(id, changes) {
    const deudas = this.getDeudas();
    const idx = deudas.findIndex(d => d.id === id);
    if (idx !== -1) deudas[idx] = { ...deudas[idx], ...changes };
    this.saveDeudas(deudas);
  },

  deleteDeuda(id) {
    const deudas = this.getDeudas().filter(d => d.id !== id);
    this.saveDeudas(deudas);
  },

  // ---- NOTIFICACIONES ----

  saveNotifications(notifications) {
    localStorage.setItem('fintrack_notifications',
      JSON.stringify(notifications));
  },

  getNotifications() {
    const data = localStorage.getItem('fintrack_notifications');
    // Estado inicial: array vacío (nunca null)
    return data ? JSON.parse(data) : [];
  },

  // ---- UTILIDAD ----

  clearAll() {
    localStorage.removeItem('fintrack_user');
    localStorage.removeItem('fintrack_transactions');
    localStorage.removeItem('fintrack_goal');
    localStorage.removeItem('fintrack_deudas');
    localStorage.removeItem('fintrack_daily_budget');
    localStorage.removeItem('fintrack_notifications');
  }
};