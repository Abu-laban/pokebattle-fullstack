const User = require('../models/User');

// ── GET /api/user/profile ─────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الملف الشخصي' });
  }
};

// ── GET /api/user/:username (public) ─────────────────────────────────────
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username level xp stats achievements createdAt avatar');
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── PATCH /api/user/progress ──────────────────────────────────────────────
const syncProgress = async (req, res) => {
  try {
    const { xpToAdd, achievements } = req.body;
    const user = await User.findById(req.user._id);
    if (xpToAdd > 0) user.addXP(xpToAdd);
    if (achievements?.length) {
      const newAch = achievements.filter(a => !user.achievements.includes(a));
      user.achievements.push(...newAch);
    }
    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── POST /api/user/battle-result ──────────────────────────────────────────
// Called after every battle/tower match to sync stats
const saveBattleResult = async (req, res) => {
  try {
    const {
      won, xpGained = 0, towerStreak = 0, isTower = false,
      totalDamage = 0, superEffHits = 0,
      pokeKills = {}, typeKills = {},
    } = req.body;
    const user = await User.findById(req.user._id);

    if (isTower) {
      if (towerStreak > (user.stats.towerBest || 0)) user.stats.towerBest = towerStreak;
    } else {
      if (won) user.stats.wins += 1;
      else     user.stats.losses += 1;
    }

    user.stats.totalDamage  = (user.stats.totalDamage  || 0) + totalDamage;
    user.stats.superEffHits = (user.stats.superEffHits || 0) + superEffHits;

    // Merge poke kills into winsWithPoke map
    if (won && Object.keys(pokeKills).length > 0) {
      if (!user.winsWithPoke) user.winsWithPoke = new Map();
      Object.entries(pokeKills).forEach(([id, count]) => {
        user.winsWithPoke.set(String(id), (user.winsWithPoke.get(String(id)) || 0) + count);
      });
      user.markModified('winsWithPoke');
    }

    // Merge type kills into winsByType map
    if (won && Object.keys(typeKills).length > 0) {
      if (!user.winsByType) user.winsByType = new Map();
      Object.entries(typeKills).forEach(([type, count]) => {
        user.winsByType.set(type, (user.winsByType.get(type) || 0) + count);
      });
      user.markModified('winsByType');
    }

    if (xpGained > 0) user.addXP(xpGained);

    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

module.exports = { getProfile, getPublicProfile, syncProgress, saveBattleResult };