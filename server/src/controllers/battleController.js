const User         = require('../models/User');
const BattleRecord = require('../models/BattleRecord');

// ── POST /api/battle/result ────────────────────────────────────────────────
//
// Accepts TWO payload shapes so both the old userController flow and the new
// battleController flow work without breaking existing clients:
//
// Shape A (canonical — new flow):
//   { mode, result:'win'|'loss'|'draw', myTeam, enemyTeam,
//     towerStreak, damageDealt, superEffHits, turnsPlayed, xpEarned }
//
// Shape B (client legacy — useBattleEngine sends this):
//   { won:bool, xpGained, superEffHits, isTower, towerStreak,
//     pokeKills, typeKills, totalDamage }
//
const saveBattleResult = async (req, res) => {
  try {
    // ── Normalise payload to canonical shape ──────────────────────────────
    const body = req.body;

    // Detect shape by checking for 'won' boolean vs 'result' string
    const isLegacyShape = typeof body.won === 'boolean' && body.result === undefined;

    const mode        = body.mode ?? (body.isTower ? 'tower' : 'normal');
    const result      = isLegacyShape
      ? (body.isTower ? 'loss' : body.won ? 'win' : 'loss')   // tower endings are always a loss for the record
      : (body.result ?? 'loss');
    const xpEarned    = body.xpEarned    ?? body.xpGained    ?? 0;
    const damageDealt = body.damageDealt ?? body.totalDamage  ?? 0;
    const superEffHits = Number(body.superEffHits) || 0;
    const turnsPlayed  = Number(body.turnsPlayed)  || 0;
    const towerStreak  = Number(body.towerStreak)  || 0;

    // Normalise team arrays — accept [{ pokeName }] or [{ pokeId, pokeName }]
    const normaliseTeam = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(m => ({
        pokeId:   m?.pokeId ?? m?.poke?.id ?? 0,
        pokeName: m?.pokeName ?? m?.poke?.name ?? m?.name ?? 'Unknown',
      }));
    };
    const myTeam    = normaliseTeam(body.myTeam);
    const enemyTeam = normaliseTeam(body.enemyTeam);

    // ── Save battle record ────────────────────────────────────────────────
    const record = await BattleRecord.create({
      userId:      req.user._id,
      username:    req.user.username,
      mode, result, myTeam, enemyTeam,
      towerStreak,
      damageDealt,
      superEffHits,
      turnsPlayed,
      xpEarned,
    });

    // ── Update user stats ─────────────────────────────────────────────────
    const user  = await User.findById(req.user._id);
    const stats = user.stats;

    if (!body.isTower) {
      if (result === 'win')  stats.wins   += 1;
      else if (result === 'loss') stats.losses += 1;
      else                        stats.draws  += 1;
    }

    stats.totalDamage  += damageDealt;
    stats.superEffHits += superEffHits;
    if (towerStreak > stats.towerBest) stats.towerBest = towerStreak;

    // ── favPoke: most-used Pokémon by win count ──────────────────────────
    const isWin = result === 'win' || (body.isTower && body.won);
    if (isWin && myTeam.length) {
      if (!user.winsWithPoke) user.winsWithPoke = new Map();
      myTeam.forEach(member => {
        if (member?.pokeName) {
          const key = String(member.pokeName);
          user.winsWithPoke.set(key, (user.winsWithPoke.get(key) || 0) + 1);
        }
      });
      user.markModified('winsWithPoke');
      let topName = null, topCount = 0;
      user.winsWithPoke.forEach((count, name) => {
        if (count > topCount) { topCount = count; topName = name; }
      });
      if (topName) stats.favPoke = topName;
    }

    // ── Merge pokeKills / typeKills maps ─────────────────────────────────
    if (isWin && body.pokeKills && Object.keys(body.pokeKills).length) {
      if (!user.winsWithPoke) user.winsWithPoke = new Map();
      Object.entries(body.pokeKills).forEach(([id, count]) => {
        user.winsWithPoke.set(String(id), (user.winsWithPoke.get(String(id)) || 0) + count);
      });
      user.markModified('winsWithPoke');
    }
    if (isWin && body.typeKills && Object.keys(body.typeKills).length) {
      if (!user.winsByType) user.winsByType = new Map();
      Object.entries(body.typeKills).forEach(([type, count]) => {
        user.winsByType.set(type, (user.winsByType.get(type) || 0) + count);
      });
      user.markModified('winsByType');
    }

    // ── Sync Pokémon XP totals (client sends authoritative totals) ──────────
    // Client tracks cumulative pokeXp in progressStore; we overwrite server values
    // with the latest totals so server stays in sync.
    if (body.pokeXpGains && Object.keys(body.pokeXpGains).length) {
      if (!user.pokeXp) user.pokeXp = new Map();
      Object.entries(body.pokeXpGains).forEach(([id, totalXp]) => {
        const key = String(id);
        const serverVal = user.pokeXp.get(key) || 0;
        // Only update if client value is higher (never decrease)
        const newVal = Math.max(serverVal, Number(totalXp) || 0);
        user.pokeXp.set(key, newVal);
      });
      user.markModified('pokeXp');
    }

    // ── XP + level up ────────────────────────────────────────────────────
    const oldLevel = user.level;
    const newLevel = user.addXP(xpEarned);
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