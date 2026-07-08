const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { getAccessStatus } = require('../middleware/requireActiveSubscription');

const router = express.Router();

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    if (!req.user.username) {
      return res.redirect('/set-username.html');
    }
    res.redirect('/dashboard.html');
  }
);

router.post('/api/set-username', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Tizimga kirilmagan' });
  }
  const { username, password } = req.body;
  if (!username || !password || username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Foydalanuvchi nomi (min 3) va parol (min 4) kerak' });
  }
  const existing = db.findUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'Bu foydalanuvchi nomi band' });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.setUsername(req.user.id, username, hash);
  res.json({ success: true });
});

router.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ error: 'Server xatosi' });
    if (!user) return res.status(401).json({ error: (info && info.message) || 'Login yoki parol xato' });
    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ error: 'Server xatosi' });
      res.json({ success: true });
    });
  })(req, res, next);
});

router.post('/api/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

router.get('/api/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Tizimga kirilmagan' });
  }
  const user = db.findUserById(req.user.id);
  const status = getAccessStatus(user);
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    ...status
  });
});

module.exports = router;
