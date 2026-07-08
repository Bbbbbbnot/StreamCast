require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const passport = require('./auth');

const authRoutes = require('./auth');
const streamRoutes = require('./stream');
const paymentRoutes = require('./payment');
const adminRoutes = require('./admin');
const { requireAuth } = require('./middleware/requireAuth');
const { requireActiveSubscription } = require('./middleware/requireActiveSubscription');
const { requireAdmin } = require('./middleware/requireAdmin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new FileStore({ path: path.join(__dirname, 'data', 'sessions') }),
  secret: process.env.SESSION_SECRET || 'iltimos-buni-ozgartiring',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 kun
}));

app.use(passport.initialize());
app.use(passport.session());

// Receipt va video fayllarga statik ruxsat (faqat tizim ichida ko'rsatish uchun)
app.use('/uploads/receipts', express.static(path.join(__dirname, 'uploads', 'receipts')));

// API yo'llari
app.use(authRoutes);
app.use(streamRoutes);
app.use(paymentRoutes);
app.use(adminRoutes);

// ---- Sahifalarni himoyalash ----
// Dashboard (video yuklash/stream) - kirish + faol obuna kerak
app.get('/dashboard.html', requireAuth, requireActiveSubscription, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// To'lov sahifasi - faqat kirish kerak (obuna talab qilinmaydi, chunki shu yerda to'laydi)
app.get('/payment.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment.html'));
});

// Username o'rnatish sahifasi
app.get('/set-username.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'set-username.html'));
});

// Admin panel
app.get('/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-public', 'admin.html'));
});

// Qolgan statik fayllar (login, register, css va h.k.)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin-login.html', express.static(path.join(__dirname, 'admin-public', 'admin-login.html')));

app.get('/', (req, res) => res.redirect('/login.html'));

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda`);
});
