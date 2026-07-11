const express = require('express');
const db = require('./db');
const { requireAdminApi } = require('./requireAdmin');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-please';

router.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Login yoki parol xato' });
});

router.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

router.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ---- To'lovlar bo'limi ----
router.get('/api/admin/payments', requireAdminApi, (req, res) => {
  const rows = db.getAllPayments(req.query.status);
  res.json(rows);
});

router.post('/api/admin/payments/:id/approve', requireAdminApi, (req, res) => {
  const result = db.approvePayment(req.params.id);
  if (!result) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ success: true, paidUntil: result.paidUntil });
});

router.post('/api/admin/payments/:id/reject', requireAdminApi, (req, res) => {
  const { note } = req.body;
  const result = db.rejectPayment(req.params.id, note);
  if (!result) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ success: true });
});

// ---- Foydalanuvchilar bo'limi ----
router.get('/api/admin/users', requireAdminApi, (req, res) => {
  const rows = db.getAllUsers();
  const now = new Date();
  const withStatus = rows.map(u => {
    const trialActive = !!(u.trial_end && new Date(u.trial_end) > now);
    const subscriptionActive = !!(u.paid_until && new Date(u.paid_until) > now);
    return { ...u, trialActive, subscriptionActive, hasAccess: trialActive || subscriptionActive };
  });
  res.json(withStatus);
});
router.post('/api/admin/users/:id/plan', requireAdminApi, (req, res) => {
  const { plan } = req.body;

  if (!['free', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Noto‘g‘ri tarif' });
  }

  const user = db.setUserPlan(req.params.id, plan);

  if (!user) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  }

  res.json({
    success: true,
    plan: user.plan,
    max_streams: user.max_streams
  });
});

// ---- Kirimlar bo'limi ----
router.get('/api/admin/income', requireAdminApi, (req, res) => {
  res.json(db.getIncomeStats());
});

module.exports = router;
