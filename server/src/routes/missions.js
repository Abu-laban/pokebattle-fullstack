const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { getMissions, completeMission, updateProgress } =
  require('../controllers/missionController');
const { protect } = require('../middleware/auth');

// SEC-05 FIX: Prevent mission-reward farming via rapid API calls.
const missionWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'محاولات كثيرة جداً، انتظر قليلاً' },
});

router.get  ('/',          protect,                      getMissions);
router.post ('/complete',  protect, missionWriteLimiter, completeMission);
router.patch('/progress',  protect, missionWriteLimiter, updateProgress);

module.exports = router;
