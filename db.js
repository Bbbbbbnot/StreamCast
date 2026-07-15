const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'app.json');

function loadRaw() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], payments: [], nextUserId: 1, nextPaymentId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: [], payments: [], nextUserId: 1, nextPaymentId: 1 };
  }
}

let state = loadRaw();

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

// ---------------- USERS ----------------

function findUserByGoogleId(googleId) {
  return state.users.find(u => u.google_id === googleId) || null;
}

function findUserById(id) {
  return state.users.find(u => u.id === Number(id)) || null;
}

function findUserByUsername(username) {
  return state.users.find(u => u.username === username) || null;
}

function createUser({ google_id = null, email = null, trial_end = null }) {
  const user = {
    id: state.nextUserId++,
    google_id,
    email,
    username: null,
    password_hash: null,
    created_at: new Date().toISOString(),
    trial_end,
    paid_until: null,

    // Tarif
    plan: 'free',

    // Stream limiti
    max_streams: 1
  };

  state.users.push(user);
  save();
  return user;
}

function setUsername(id, username, passwordHash) {
  const user = findUserById(id);
  if (!user) return null;
  user.username = username;
  user.password_hash = passwordHash;
  save();
  return user;
}

function updateUserPaidUntil(id, paidUntilIso) {
  const user = findUserById(id);
  if (!user) return null;
  user.paid_until = paidUntilIso;
  save();
  return user;
}

function getAllUsers() {
  return [...state.users]
    .map(u => ({
      ...u,
      plan: u.plan || 'free',
      max_streams: u.max_streams || 1
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ---------------- PAYMENTS ----------------

function createPayment({ user_id, amount, plan = 'basic', receipt_path }) {
  const payment = {
    id: state.nextPaymentId++,
    user_id,
    amount,
    plan,
    receipt_path,
    status: 'pending',
    note: null,
    created_at: new Date().toISOString(),
    reviewed_at: null
  };

  state.payments.push(payment);
  save();
  return payment;
}

function findPaymentById(id) {
  return state.payments.find(p => p.id === Number(id)) || null;
}

function getPaymentsByUser(userId) {
  return state.payments
    .filter(p => p.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getAllPayments(status) {
  let rows = state.payments;
  if (status) rows = rows.filter(p => p.status === status);
  const withUser = rows.map(p => {
    const user = findUserById(p.user_id);
    return { ...p, username: user ? user.username : null, email: user ? user.email : null };
  });
  return withUser.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function approvePayment(id) {
  const payment = findPaymentById(id);
  if (!payment) return null;
  payment.status = 'approved';
  payment.reviewed_at = new Date().toISOString();

  const user = findUserById(payment.user_id);
  const now = new Date();
  const currentPaidUntil = user.paid_until ? new Date(user.paid_until) : null;
  const base = (currentPaidUntil && currentPaidUntil > now) ? currentPaidUntil : now;
  const newPaidUntil = new Date(base);
  newPaidUntil.setDate(newPaidUntil.getDate() + 30);
  user.paid_until = newPaidUntil.toISOString();
  if (payment.plan === 'pro') {
  user.plan = 'pro';
  user.max_streams = 5;
} else {
  user.plan = 'free';
  user.max_streams = 1;
}

  save();
  return { payment, paidUntil: user.paid_until };
}

function rejectPayment(id, note) {
  const payment = findPaymentById(id);
  if (!payment) return null;
  payment.status = 'rejected';
  payment.note = note || null;
  payment.reviewed_at = new Date().toISOString();
  save();
  return payment;
}

function getIncomeStats() {
  const approved = state.payments.filter(p => p.status === 'approved');
  const total = approved.reduce((sum, p) => sum + p.amount, 0);

  const byMonthMap = {};
  approved.forEach(p => {
    const month = (p.reviewed_at || p.created_at).slice(0, 7); // YYYY-MM
    if (!byMonthMap[month]) byMonthMap[month] = { month, count: 0, total: 0 };
    byMonthMap[month].count += 1;
    byMonthMap[month].total += p.amount;
  });
  const byMonth = Object.values(byMonthMap).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);

  const now = new Date();
  const totalUsers = state.users.length;
  const payingUsers = state.users.filter(u => u.paid_until && new Date(u.paid_until) > now).length;
  const pendingPayments = state.payments.filter(p => p.status === 'pending').length;

  return { total, byMonth, totalUsers, payingUsers, pendingPayments };
}
function setUserPlan(id, plan) {
  const user = findUserById(id);
  if (!user) return null;

  user.plan = plan;

  if (plan === 'pro') {
    user.max_streams = 5;
  } else {
    user.max_streams = 1;
  }

  save();
  return user;
}

module.exports = {
  findUserByGoogleId,
  findUserById,
  findUserByUsername,
  createUser,
  setUsername,
  updateUserPaidUntil,
  getAllUsers,
  createPayment,
  findPaymentById,
  getPaymentsByUser,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getIncomeStats,
  setUserPlan
};
