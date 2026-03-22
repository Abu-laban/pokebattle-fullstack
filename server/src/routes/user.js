const router = require('express').Router();
const { getProfile, getPublicProfile, syncProgress, resetStats } =
  require('../controllers/userController');
const { protect }   = require('../middleware/auth');
const rateLimit     = require('express-rate-limit');

// SEC-05 FIX: Limit write operations on user data endpoints.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'محاولات كثيرة جداً، انتظر قليلاً' },
});

router.get  ('/',           protect,               getProfile);
router.patch('/progress',   protect, writeLimiter, syncProgress);
// Rate-limit reset to 3 per hour — intentional soft guard against abuse
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: { error: 'يمكن إعادة الضبط 3 مرات فقط في الساعة' } });
router.post ('/reset-stats', protect, resetLimiter, resetStats);
// BUG-02 FIX: /battle-result removed — use POST /api/battle/result instead.
router.get  ('/:username',                          getPublicProfile);

module.exports = router;