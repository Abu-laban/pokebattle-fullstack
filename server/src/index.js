require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const path         = require('path');

const connectDB      = require('./config/db');
const authRouter     = require('./routes/auth');
const userRouter     = require('./routes/user');
const leaderRouter   = require('./routes/leaderboard');
const battleRouter   = require('./routes/battle');
const missionRouter  = require('./routes/missions');

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

// Trust proxy (required for Codespace, Heroku, etc.)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    // Allow any GitHub Codespace or github.dev URL
    const isCodespace = /\.app\.github\.dev$/.test(origin) || /\.github\.dev$/.test(origin);
    if (allowed.includes(origin) || isCodespace) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Cookie parser (optional — only if installed)
try {
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
} catch {}

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth',        authRouter);
app.use('/api/user',        userRouter);
app.use('/api/leaderboard', leaderRouter);
app.use('/api/battle',      battleRouter);
app.use('/api/missions',    missionRouter);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
  );
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));