const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuthApi } = require('./requireAuth');
const db = require('./db');

const router = express.Router();
const RECEIPT_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPT_DIR),
  filename: (req, file, cb) => {
    const unique = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const BASIC_FEE = 30000;
const PRO_FEE = 60000;
const CARD_NUMBER = process.env.PAYMENT_CARD_NUMBER || '0000 0000 0000 0000';
const CARD_HOLDER = process.env.PAYMENT_CARD_HOLDER || 'Ism Familiya';

router.get('/api/payment/info', requireAuthApi, (req, res) => {
  res.json({
    cardNumber: CARD_NUMBER,
    cardHolder: CARD_HOLDER,
    basicAmount: BASIC_FEE,
    proAmount: PRO_FEE
  });
});

router.post('/api/payment/submit', requireAuthApi, upload.single('receipt'), (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: 'Chek rasmi kerak' });
  }

  const plan = req.body.plan || 'basic';

  const amount =
    plan === 'pro'
      ? PRO_FEE
      : BASIC_FEE;

  db.createPayment({
    user_id: req.user.id,
    amount,
    plan,
    receipt_path: req.file.filename
  });

  res.json({
    success: true,
    plan,
    amount
  });
});

router.get('/api/payment/history', requireAuthApi, (req, res) => {
  const rows = db.getPaymentsByUser(req.user.id);
  res.json(rows);
});

module.exports = router;
