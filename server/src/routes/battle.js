const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { saveBattleResult, getBattleHistory } =
  require('../controllers/battleController');
const { protect } = require('../middleware/auth');

// SEC-05 FIX: Prevent stat-inflation via repeated battle-result submissions.
// A real match takes at minimum ~1 minute, so 20/min is already generous.
const battleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'محاولات كثيرة جداً، انتظر قليلاً' },
});

router.post('/result',  protect, battleLimiter, saveBattleResult);
router.get ('/history', protect,                getBattleHistory);

module.exports = router;