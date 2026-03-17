const UserMission = require('../models/UserMission');
const User        = require('../models/User');

// ── GET /api/missions — get all mission progress for current user ────────────
const getMissions = async (req, res) => {
  try {
    const records = await UserMission.find({ userId: req.user._id }).lean();
    const map = {};
    records.forEach(r => {
      map[r.missionId] = {
        goalProgress: r.goalProgress,
        completed:    r.completed,
        completedAt:  r.completedAt,
      };
    });
    res.json({ missions: map });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/missions/complete — mark a mission complete + grant reward ─────
const completeMission = async (req, res) => {
  try {
    const { missionId, rewardXp, rewardPokeId } = req.body;
    if (!missionId) return res.status(400).json({ error: 'missionId مطلوب' });

    // Upsert the mission record
    await UserMission.findOneAndUpdate(
      { userId: req.user._id, missionId },
      { $set: { completed: true, completedAt: new Date() } },
      { upsert: true, new: true }
    );

    // Update user stats
    const update = {};
    if (rewardXp) {
      const user  = await User.findById(req.user._id);
      user.xp    += rewardXp;
      // level up logic
      const { xpForLevel } = require('../utils/xpUtils');
      while (user.xp >= xpForLevel(user.level)) {
        user.xp   -= xpForLevel(user.level);
        user.level += 1;
      }
      if (!user.completedMissions) user.completedMissions = [];
      if (!user.completedMissions.includes(missionId)) {
        user.completedMissions.push(missionId);
      }
      await user.save({ validateModifiedOnly: true });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/missions/progress — sync goal progress ────────────────────────
const updateProgress = async (req, res) => {
  try {
    const { missionId, goalProgress } = req.body;
    if (!missionId || !Array.isArray(goalProgress)) {
      return res.status(400).json({ error: 'بيانات غير صالحة' });
    }

    await UserMission.findOneAndUpdate(
      { userId: req.user._id, missionId },
      { $set: { goalProgress } },
      { upsert: true, new: true }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMissions, completeMission, updateProgress };