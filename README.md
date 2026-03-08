# ⚡ PokéBattle — Full-Stack JavaScript

## هيكل المشروع
```
pokebattle-fullstack/
├── server/                  ← Express.js + MongoDB
│   └── src/
│       ├── config/db.js     ← اتصال MongoDB
│       ├── models/          ← User, BattleRecord
│       ├── controllers/     ← auth, user, battle, leaderboard
│       ├── routes/          ← /api/auth  /api/user  ...
│       └── middleware/      ← JWT auth
│
└── client/                  ← React + Vite (نفس اللعبة)
    └── src/
        ├── services/api.js  ← كل API calls
        ├── store/authStore.js
        └── components/
            ├── Auth/        ← شاشة Login/Register
            └── Leaderboard/ ← لوحة المتصدرين
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | تسجيل حساب |
| POST | /api/auth/login | تسجيل دخول |
| GET  | /api/auth/me | بيانات المستخدم |
| GET  | /api/user/profile | الملف الشخصي |
| PATCH| /api/user/progress | تحديث XP |
| POST | /api/battle/result | حفظ نتيجة المعركة |
| GET  | /api/battle/history | سجل المعارك |
| GET  | /api/leaderboard/xp | ترتيب XP |
| GET  | /api/leaderboard/wins | ترتيب الانتصارات |
| GET  | /api/leaderboard/tower | ترتيب البرج |

## التشغيل المحلي

### 1. MongoDB
أنشئ cluster مجاني على [mongodb.com](https://mongodb.com) ثم انسخ الـ URI

### 2. Server
```bash
cd server
cp .env.example .env
# عدّل MONGO_URI و JWT_SECRET في .env
npm install
npm run dev
```

### 3. Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Deploy (Render.com)
1. ارفع الكود على GitHub
2. أنشئ **Web Service** على [render.com](https://render.com)
3. اختر مجلد `server` كـ Root Directory
4. أضف متغيرات البيئة (MONGO_URI, JWT_SECRET, CLIENT_URL)
5. أنشئ **Static Site** للـ client مع `npm run build` → `dist`
