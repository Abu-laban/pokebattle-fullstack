const User = require('../models/User');

// ── GET /api/leaderboard/xp ────────────────────────────────────────────────
const getXPLeaderboard = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ level: -1, xp: -1 })
      .limit(100)
      .select('username level xp stats.wins stats.towerBest createdAt')
      .lean();

    const board = users.map((u, i) => ({
      rank:       i + 1,
      username:   u.username,
      level:      u.level,
      xp:         u.xp,
      wins:       u.stats?.wins ?? 0,
      towerBest:  u.stats?.towerBest ?? 0,
    }));

    res.json({ board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/leaderboard/tower ─────────────────────────────────────────────
const getTowerLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ 'stats.towerBest': { $gt: 0 } })
      .sort({ 'stats.towerBest': -1 })
      .limit(100)
      .select('username level stats.towerBest stats.wins')
      .lean();

    const board = users.map((u, i) => ({
      rank:      i + 1,
      username:  u.username,
      level:     u.level,
      towerBest: u.stats?.towerBest ?? 0,
      totalWins: u.stats?.wins      ?? 0,  // normal battle wins (for reference)
    }));

    res.json({ board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/leaderboard/wins ──────────────────────────────────────────────
const getWinsLeaderboard = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ 'stats.wins': -1 })
      .limit(100)
      .select('username level stats.wins stats.losses stats.totalDamage')
      .lean();

    const board = users.map((u, i) => ({
      rank:        i + 1,
      username:    u.username,
      level:       u.level,
      wins:        u.stats?.wins   ?? 0,
      losses:      u.stats?.losses ?? 0,
      winRate:     u.stats?.wins
        ? Math.round(u.stats.wins / ((u.stats.wins + u.stats.losses) || 1) * 100)
        : 0,
      totalDamage: u.stats?.totalDamage ?? 0,
    }));

    res.json({ board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getXPLeaderboard, getTowerLeaderboard, getWinsLeaderboard };