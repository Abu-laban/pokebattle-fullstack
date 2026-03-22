const User = require('../models/User');

// ── PERF-02 / PERF-03 FIX: Simple in-process TTL cache ───────────────────
// Leaderboard data changes slowly. Caching for 60 s dramatically reduces DB
// load on popular instances without sacrificing data freshness.
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const cache = {};

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// ── GET /api/leaderboard/xp ────────────────────────────────────────────────
const getXPLeaderboard = async (req, res) => {
  try {
    const cached = getCached('xp');
    if (cached) return res.json({ board: cached, cached: true });

    const users = await User.find()
      .sort({ level: -1, xp: -1 })  // covered by compound index { level, xp }
      .limit(100)
      .select('username level xp stats.wins stats.towerBest createdAt')
      .lean();

    const board = users.map((u, i) => ({
      rank:      i + 1,
      username:  u.username,
      level:     u.level,
      xp:        u.xp,
      wins:      u.stats?.wins      ?? 0,
      towerBest: u.stats?.towerBest ?? 0,
    }));

    setCache('xp', board);
    res.json({ board });
  } catch (err) {
    console.error('getXPLeaderboard error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── GET /api/leaderboard/tower ─────────────────────────────────────────────
const getTowerLeaderboard = async (req, res) => {
  try {
    const cached = getCached('tower');
    if (cached) return res.json({ board: cached, cached: true });

    const users = await User.find({ 'stats.towerBest': { $gt: 0 } })
      .sort({ 'stats.towerBest': -1 })  // covered by index { 'stats.towerBest' }
      .limit(100)
      .select('username level stats.towerBest stats.wins')
      .lean();

    const board = users.map((u, i) => ({
      rank:      i + 1,
      username:  u.username,
      level:     u.level,
      towerBest: u.stats?.towerBest ?? 0,
      totalWins: u.stats?.wins      ?? 0,
    }));

    setCache('tower', board);
    res.json({ board });
  } catch (err) {
    console.error('getTowerLeaderboard error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── GET /api/leaderboard/wins ──────────────────────────────────────────────
const getWinsLeaderboard = async (req, res) => {
  try {
    const cached = getCached('wins');
    if (cached) return res.json({ board: cached, cached: true });

    const users = await User.find()
      .sort({ 'stats.wins': -1 })  // covered by index { 'stats.wins' }
      .limit(100)
      .select('username level stats.wins stats.losses stats.totalDamage')
      .lean();

    const board = users.map((u, i) => ({
      rank:        i + 1,
      username:    u.username,
      level:       u.level,
      wins:        u.stats?.wins        ?? 0,
      losses:      u.stats?.losses      ?? 0,
      winRate:     u.stats?.wins
        ? Math.round(u.stats.wins / ((u.stats.wins + u.stats.losses) || 1) * 100)
        : 0,
      totalDamage: u.stats?.totalDamage ?? 0,
    }));

    setCache('wins', board);
    res.json({ board });
  } catch (err) {
    console.error('getWinsLeaderboard error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

module.exports = { getXPLeaderboard, getTowerLeaderboard, getWinsLeaderboard };