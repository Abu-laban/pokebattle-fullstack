const User = require('../models/User');

// ── GET /api/user/profile ─────────────────────────────────────────────────
const getProfile = async (req, res) => {
  res.json({ user: req.user.toPublic() });
};

// ── GET /api/user/:username (public profile) ──────────────────────────────
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username level xp stats achievements createdAt');
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/user/progress ──────────────────────────────────────────────
// Sync progress from client (called periodically)
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
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProfile, getPublicProfile, syncProgress };
