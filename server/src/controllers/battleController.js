const User         = require('../models/User');
const BattleRecord = require('../models/BattleRecord');

// ── POST /api/battle/result ────────────────────────────────────────────────
// Called at the end of every battle to save results
const saveBattleResult = async (req, res) => {
  try {
    const { mode, result, myTeam, enemyTeam, towerStreak,
            damageDealt, superEffHits, turnsPlayed, xpEarned } = req.body;

    // ── Save battle record ──────────────────────────────────────────────
    const record = await BattleRecord.create({
      userId:      req.user._id,
      username:    req.user.username,
      mode, result, myTeam, enemyTeam,
      towerStreak: towerStreak ?? 0,
      damageDealt: damageDealt ?? 0,
      superEffHits: superEffHits ?? 0,
      turnsPlayed:  turnsPlayed ?? 0,
      xpEarned:     xpEarned   ?? 0,
    });

    // ── Update user stats ───────────────────────────────────────────────
    const user   = await User.findById(req.user._id);
    const stats  = user.stats;

    if (result === 'win')       stats.wins   += 1;
    else if (result === 'loss') stats.losses += 1;
    else                        stats.draws  += 1;

    stats.totalDamage  += damageDealt  ?? 0;
    stats.superEffHits += superEffHits ?? 0;
    if ((towerStreak ?? 0) > stats.towerBest) stats.towerBest = towerStreak;

    // Track favourite Pokémon (most used)
    if (myTeam?.length) {
      const lead = myTeam[0].pokeName;
      if (lead) stats.favPoke = lead;
    }

    // XP + level up
    const oldLevel = user.level;
    const newLevel = user.addXP(xpEarned ?? 0);
    user.markModified('stats');
    await user.save();

    res.json({
      record,
      user: user.toPublic(),
      levelUp: newLevel > oldLevel ? newLevel : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/battle/history ────────────────────────────────────────────────
const getBattleHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      BattleRecord.find({ userId: req.user._id })
        .sort({ playedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BattleRecord.countDocuments({ userId: req.user._id }),
    ]);

    res.json({ records, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { saveBattleResult, getBattleHistory };