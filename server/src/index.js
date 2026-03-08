require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');

const connectDB  = require('./config/db');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const leaderRouter = require('./routes/leaderboard');
const battleRouter = require('./routes/battle');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect Database ──────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/user',        userRouter);
app.use('/api/leaderboard', leaderRouter);
app.use('/api/battle',      battleRouter);

// ── Serve React build in production ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
  );
}

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server Error' });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
