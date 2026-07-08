# YT Live Platform

Google akkaunt orqali ro'yxatdan o'tish, 1 kunlik bepul sinov, qo'lda tasdiqlanadigan to'lov tizimi va admin panel bilan YouTube Live streaming platformasi.

## Imkoniyatlar

- Google akkaunt orqali ro'yxatdan o'tish, so'ng foydalanuvchi nomi/parol o'rnatish
- 1 kunlik avtomatik bepul sinov muddati
- Sinov tugagach to'lov sahifasi (karta raqami ko'rsatiladi, chek rasm sifatida yuklanadi)
- Admin panel: to'lovlarni qo'lda tasdiqlash/rad etish, foydalanuvchilar ro'yxati, kirimlar hisoboti
- Har bir foydalanuvchi o'z videosini yuklab, YouTube Live'ga loop qilib uzatadi
- Ma'lumotlar oddiy JSON fayl asosida saqlanadi — hech qanday native kompilyatsiya yoki tashqi baza kerak emas

## Talab qilinadigan narsalar

- Node.js 18+ va ffmpeg o'rnatilgan server (VPS)
- Google Cloud Console'da yaratilgan OAuth 2.0 client ID/secret

## 1-qadam: Google OAuth sozlash

1. https://console.cloud.google.com ga kiring
2. Yangi loyiha yarating (yoki mavjudini tanlang)
3. **"APIs & Services" → "Credentials"** ga o'ting
4. **"Create Credentials" → "OAuth client ID"** ni tanlang
5. Application type: **Web application**
6. **Authorized redirect URIs** ga qo'shing:
   ```
   https://sizning-domeningiz.com/auth/google/callback
   ```
   (lokal test uchun: `http://localhost:3000/auth/google/callback`)
7. Yaratilgan **Client ID** va **Client Secret**ni saqlab qo'ying

## 2-qadam: Muhit o'zgaruvchilarini sozlash

`.env.example` faylidan nusxa oling:

```bash
cp .env.example .env
```

`.env` faylini oching va quyidagilarni to'ldiring:

- `SESSION_SECRET` — istalgan uzun, tasodifiy matn
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — 1-qadamda olingan ma'lumotlar
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — admin panelga kirish uchun (albatta o'zgartiring!)
- `PAYMENT_CARD_NUMBER`, `PAYMENT_CARD_HOLDER` — foydalanuvchilarga ko'rsatiladigan to'lov karta ma'lumotlari

## 3-qadam: VPS'da o'rnatish

```bash
# ffmpeg va Node.js o'rnatish (Ubuntu/Debian)
sudo apt update
sudo apt install -y ffmpeg nodejs npm

# Loyihani serverga ko'chiring, so'ng:
cd yt-platform
npm install
node server.js
```

Doimiy ishlashi uchun PM2 orqali:

```bash
sudo npm install -g pm2
pm2 start server.js --name yt-platform
pm2 save
pm2 startup
```

## 3-qadam (muqobil): Docker orqali o'rnatish

```bash
docker build -t yt-platform .
docker run -d -p 3000:3000 --env-file .env -v $(pwd)/data:/app/data -v $(pwd)/uploads:/app/uploads yt-platform
```

**Muhim:** `-v` orqali `data` va `uploads` papkalarini tashqariga chiqarib qo'ying — aks holda konteyner qayta ishga tushganda barcha foydalanuvchi va to'lov ma'lumotlari, video va cheklar yo'qolib qoladi.

## Ishlash tartibi (foydalanuvchi tomondan)

1. `/login.html` sahifasida **"Google orqali kirish"** tugmasi bosiladi
2. Birinchi marta kirganda foydalanuvchi nomi va parol o'rnatish so'raladi (`/set-username.html`)
3. Foydalanuvchi 1 kun davomida `/dashboard.html`da video yuklab, YouTube stream key kiritib, efirni boshlashi mumkin
4. Sinov tugagach, tizim avtomatik `/payment.html`ga yo'naltiradi:
   - Karta raqami ko'rsatiladi
   - Foydalanuvchi to'lov qilib, chek rasmini yuklaydi
   - Chek "kutilmoqda" holatida admin tasdiqlashini kutadi
5. Admin tasdiqlagach, foydalanuvchi yana 30 kunga dashboard'dan foydalana oladi

## Admin panel

`/admin-login.html` orqali kiring (`.env`dagi `ADMIN_USERNAME`/`ADMIN_PASSWORD` bilan).

Bo'limlar:
- **To'lovlar** — barcha cheklar (kutilayotgan/tasdiqlangan/rad etilgan), chek rasmini ko'rish, tasdiqlash yoki rad etish
- **Foydalanuvchilar** — barcha ro'yxatdan o'tganlar, ularning sinov/obuna holati
- **Kirimlar** — jami tushum, oylik taqsimot, to'lovchi foydalanuvchilar soni

## Fayl tuzilishi

```
yt-platform/
├── server.js              # Asosiy server
├── auth.js                # Google OAuth + lokal login sozlamalari
├── db.js                  # JSON-fayl asosidagi ma'lumotlar bazasi
├── routes/
│   ├── auth.js             # Login/register/logout
│   ├── payment.js          # Chek yuklash, to'lov tarixi
│   ├── admin.js            # Admin panel API'lari
│   └── stream.js           # Video yuklash, YouTube stream boshqaruvi
├── middleware/
│   ├── requireAuth.js
│   ├── requireActiveSubscription.js
│   └── requireAdmin.js
├── public/                # Foydalanuvchi sahifalari (login, dashboard, payment)
├── admin-public/          # Admin panel sahifalari
├── data/                  # JSON ma'lumotlar bazasi va sessiyalar shu yerda saqlanadi
└── uploads/               # Yuklangan videolar va to'lov cheklari
```

## Muhim eslatmalar

- Ma'lumotlar bazasi oddiy JSON fayl (`data/app.json`) — bu kichik/o'rta miqyosdagi loyiha uchun yetarli, lekin bir vaqtning o'zida bir nechta server jarayoni (masalan PM2 cluster mode) bilan ishlatilmasligi kerak.
- `uploads/` va `data/` papkalarini albatta zaxira nusxalab turing — bu yerda barcha foydalanuvchi, to'lov va video ma'lumotlari saqlanadi.
- Ishlab chiqarish (production) muhitida `SESSION_SECRET`, `ADMIN_PASSWORD` kabi maxfiy ma'lumotlarni albatta o'zgartiring.
