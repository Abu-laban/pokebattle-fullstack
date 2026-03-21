const User         = require('../models/User');
const BattleRecord = require('../models/BattleRecord');

// ── POST /api/battle/result ────────────────────────────────────────────────
// Canonical battle-result endpoint (BUG-02 FIX: single endpoint for results).
// Creates a BattleRecord for history and updates user stats atomically.
const saveBattleResult = async (req, res) => {
  try {
    const {
      mode, result, myTeam, enemyTeam, towerStreak,
      damageDealt, superEffHits, turnsPlayed, xpEarned,
    } = req.body;

    // ── Save battle record ────────────────────────────────────────────────
    const record = await BattleRecord.create({
      userId:      req.user._id,
      username:    req.user.username,
      mode, result, myTeam, enemyTeam,
      towerStreak:  towerStreak  ?? 0,
      damageDealt:  damageDealt  ?? 0,
      superEffHits: superEffHits ?? 0,
      turnsPlayed:  turnsPlayed  ?? 0,
      xpEarned:     xpEarned     ?? 0,
    });

    // ── Update user stats ─────────────────────────────────────────────────
    const user  = await User.findById(req.user._id);
    const stats = user.stats;

    if (result === 'win')       stats.wins   += 1;
    else if (result === 'loss') stats.losses += 1;
    else                        stats.draws  += 1;

    stats.totalDamage  += damageDealt  ?? 0;
    stats.superEffHits += superEffHits ?? 0;
    if ((towerStreak ?? 0) > stats.towerBest) stats.towerBest = towerStreak;

    // BUG-01 FIX: favPoke is now derived from the winsWithPoke frequency map
    // (most wins with a single Pokémon) rather than the lead slot of the most
    // recent battle.
    if (result === 'win' && myTeam?.length) {
      // Increment win count for every team member that participated
      if (!user.winsWithPoke) user.winsWithPoke = new Map();
      myTeam.forEach(member => {
        if (member?.pokeName) {
          const key = String(member.pokeName);
          user.winsWithPoke.set(key, (user.winsWithPoke.get(key) || 0) + 1);
        }
      });
      user.markModified('winsWithPoke');

      // Recompute favPoke from the updated map
      let topName  = null;
      let topCount = 0;
      user.winsWithPoke.forEach((count, name) => {
        if (count > topCount) { topCount = count; topName = name; }
      });
      if (topName) stats.favPoke = topName;
    }

    // XP + level up
    const oldLevel = user.level;
    const newLevel = user.addXP(xpEarned ?? 0);
    user.markModified('stats');
    await user.save();

    res.json({
      record,
      user:    user.toPublic(),
      levelUp: newLevel > oldLevel ? newLevel : null,
    });
  } catch (err) {
    console.error('saveBattleResult error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
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
    console.error('getBattleHistory error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

module.exports = { saveBattleResult, getBattleHistory };
