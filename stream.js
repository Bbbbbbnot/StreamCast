const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { requireAuthApi } = require('../middleware/requireAuth');
const { requireActiveSubscriptionApi } = require('../middleware/requireActiveSubscription');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'videos');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOAD_DIR, String(req.user.id));
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => cb(null, 'current' + path.extname(file.originalname))
});
const upload = multer({ storage });

// Har bir foydalanuvchi uchun alohida ffmpeg jarayoni
const activeStreams = {}; // { userId: { process, status } }

router.post('/api/upload', requireAuthApi, requireActiveSubscriptionApi, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video fayl topilmadi' });
  res.json({ success: true, path: req.file.filename });
});

router.post('/api/stream/start', requireAuthApi, requireActiveSubscriptionApi, (req, res) => {
  const userId = req.user.id;
  const { streamKey } = req.body;
  if (!streamKey) return res.status(400).json({ error: 'Stream key kerak' });
  if (activeStreams[userId]) return res.status(400).json({ error: 'Stream allaqachon ishlamoqda' });

  const userDir = path.join(UPLOAD_DIR, String(userId));
  const files = fs.existsSync(userDir) ? fs.readdirSync(userDir).filter(f => f.startsWith('current')) : [];
  if (files.length === 0) return res.status(400).json({ error: 'Avval video yuklang' });

  const videoPath = path.join(userDir, files[0]);
  const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

  const args = [
    '-re', '-stream_loop', '-1', '-i', videoPath,
    '-vf', 'scale=1280:720', '-r', '30',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
    '-b:v', '1500k', '-maxrate', '1500k', '-bufsize', '3000k',
    '-pix_fmt', 'yuv420p', '-g', '60',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-f', 'flv', rtmpUrl
  ];

  const proc = spawn('ffmpeg', args);
  activeStreams[userId] = { process: proc, running: true, startedAt: new Date().toISOString(), log: [] };

  proc.stderr.on('data', (data) => {
    const entry = activeStreams[userId];
    if (entry) {
      entry.log.push(data.toString());
      if (entry.log.length > 100) entry.log.shift();
    }
  });

  proc.on('close', () => { delete activeStreams[userId]; });
  proc.on('error', () => { delete activeStreams[userId]; });

  res.json({ success: true });
});

router.post('/api/stream/stop', requireAuthApi, (req, res) => {
  const userId = req.user.id;
  const entry = activeStreams[userId];
  if (!entry) return res.status(400).json({ error: 'Ishlab turgan stream yo\'q' });
  entry.process.kill('SIGINT');
  delete activeStreams[userId];
  res.json({ success: true });
});

router.get('/api/stream/status', requireAuthApi, (req, res) => {
  const entry = activeStreams[req.user.id];
  if (!entry) return res.json({ running: false, log: [] });
  res.json({ running: true, startedAt: entry.startedAt, log: entry.log.slice(-5) });
});

module.exports = router;
