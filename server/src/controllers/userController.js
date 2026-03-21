const User = require('../models/User');

// Maximum XP that syncProgress may grant in a single call.
// Legitimate uses (achievement unlocks, misc bonuses) never exceed this.
// SEC-02 FIX: Prevents authenticated users from granting themselves
// arbitrary XP amounts via PATCH /api/user/progress.
const MAX_XP_PER_SYNC = 500;

// ── GET /api/user/profile ─────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ user: user.toPublic() });
  } catch (err) {
    console.error('getProfile error:', err);
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
    console.error('getPublicProfile error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── PATCH /api/user/progress ──────────────────────────────────────────────
// SEC-02 FIX: xpToAdd is capped at MAX_XP_PER_SYNC.
// Battle and mission XP is handled by their own server-authoritative endpoints.
const syncProgress = async (req, res) => {
  try {
    const rawXp       = Number(req.body.xpToAdd) || 0;
    const xpToAdd     = Math.min(Math.max(0, rawXp), MAX_XP_PER_SYNC);
    const achievements = req.body.achievements;

    const user = await User.findById(req.user._id);
    if (xpToAdd > 0) user.addXP(xpToAdd);
    if (Array.isArray(achievements) && achievements.length) {
      const newAch = achievements.filter(a => typeof a === 'string' && !user.achievements.includes(a));
      user.achievements.push(...newAch);
    }
    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    console.error('syncProgress error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// NOTE: POST /api/user/battle-result has been REMOVED (BUG-02 FIX).
// All battle results are now handled by POST /api/battle/result
// (battleController.saveBattleResult) which is the canonical endpoint and
// also creates a BattleRecord document for history tracking.

module.exports = { getProfile, getPublicProfile, syncProgress };
