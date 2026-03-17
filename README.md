# ⚡ PokéBattle

لعبة معارك بوكيمون 2v2 — React + Express + MongoDB

---

## 🚀 النشر السريع

### 1. MongoDB Atlas (قاعدة البيانات)

1. اذهب لـ [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create Free Cluster (M0 — مجاني)
3. Database Access → Add User (username + password)
4. Network Access → Allow from Anywhere (`0.0.0.0/0`)
5. Connect → Drivers → انسخ Connection String

---

### 2. Railway (الـ Server)

1. اذهب لـ [railway.app](https://railway.app) وسجل بـ GitHub
2. New Project → Deploy from GitHub Repo
3. اختر المجلد `server` كـ Root Directory
4. في Variables أضف كل هذه:

```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=<مفتاح_عشوائي_64_حرف>
CLIENT_URL=https://your-app.vercel.app
JWT_EXPIRES_IN=7d
```

> لتوليد JWT_SECRET:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

5. احفظ رابط السيرفر: `https://pokebattle-xxx.up.railway.app`

---

### 3. Vercel (الـ Client)

1. اذهب لـ [vercel.com](https://vercel.com) وسجل بـ GitHub
2. New Project → Import Git Repository
3. **Root Directory:** `client`
4. **Framework Preset:** Vite
5. في Environment Variables أضف:

```env
VITE_API_URL=https://pokebattle-xxx.up.railway.app/api
```

6. Deploy!

---

### 4. رفع الكود على GitHub

```bash
# من داخل مجلد المشروع
git init
git add .
git commit -m "PokéBattle v1.0 🎮"
git branch -M main
git remote add origin https://github.com/USERNAME/pokebattle.git
git push -u origin main
```

---

### 5. بعد النشر

- حدّث `CLIENT_URL` في Railway بـ رابط Vercel الحقيقي
- حدّث `VITE_API_URL` في Vercel بـ رابط Railway الحقيقي
- Redeploy كلاهما

---

## 🛠️ التطوير المحلي

```bash
# تثبيت dependencies
cd server && npm install
cd ../client && npm install

# تشغيل السيرفر (terminal 1)
cd server && npm run dev

# تشغيل الـ client (terminal 2)
cd client && npm run dev
```

### ملفات البيئة المحلية

**`server/.env`:**
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=any_secret_for_dev
CLIENT_URL=http://localhost:3000
```

**`client/.env.local`:**
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📁 هيكل المشروع

```
pokebattle/
├── client/          # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── store/      # Zustand stores
│   │   ├── engine/     # Battle logic
│   │   └── data/       # 894 Pokémon data
│   └── vercel.json
├── server/          # Express + MongoDB
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── routes/
│   └── railway.json
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## ⚠️ قبل النشر

- [ ] غيّر `JWT_SECRET` لمفتاح عشوائي قوي
- [ ] تأكد أن `.env` في `.gitignore`
- [ ] فعّل Network Access في MongoDB Atlas
- [ ] أضف `CLIENT_URL` في Railway