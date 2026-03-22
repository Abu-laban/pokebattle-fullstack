const UserMission = require('../models/UserMission');
const User        = require('../models/User');
const { getMissionReward } = require('../config/missionRegistry');

// ── GET /api/missions ──────────────────────────────────────────────────────
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
    console.error('getMissions error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── POST /api/missions/complete ────────────────────────────────────────────
// SEC-03 FIX: rewardXp is read from the server-side MISSION_REGISTRY.
//             Any rewardXp value sent by the client is ignored entirely.
//
// BUG-03 FIX: Level-up logic uses user.addXP() (canonical method) instead
//             of the duplicated inline while-loop.
//
// PERF-01 FIX: UserMission upsert and User fetch run concurrently via
//              Promise.all, then the User save is awaited once.
const completeMission = async (req, res) => {
  try {
    const { missionId } = req.body;
    if (!missionId) return res.status(400).json({ error: 'missionId مطلوب' });

    // Look up the authorized reward — reject unknown mission IDs
    const reward = getMissionReward(missionId);
    if (!reward) {
      return res.status(400).json({ error: `مهمة غير معروفة: ${missionId}` });
    }

    // Run both DB reads in parallel (PERF-01)
    const [, user] = await Promise.all([
      UserMission.findOneAndUpdate(
        { userId: req.user._id, missionId },
        { $set: { completed: true, completedAt: new Date() } },
        { upsert: true, new: true }
      ),
      User.findById(req.user._id),
    ]);

    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    // Guard: don't grant reward twice for the same mission
    if (!user.completedMissions) user.completedMissions = [];
    const alreadyCompleted = user.completedMissions.includes(missionId);

    if (!alreadyCompleted) {
      // BUG-03 FIX: delegate to the canonical addXP model method
      if (reward.rewardXp > 0) user.addXP(reward.rewardXp);
      user.completedMissions.push(missionId);
      await user.save({ validateModifiedOnly: true });
    }

    res.json({ ok: true, xpGranted: alreadyCompleted ? 0 : reward.rewardXp });
  } catch (err) {
    console.error('completeMission error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── PATCH /api/missions/progress ──────────────────────────────────────────
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
    console.error('updateProgress error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

module.exports = { getMissions, completeMission, updateProgress };