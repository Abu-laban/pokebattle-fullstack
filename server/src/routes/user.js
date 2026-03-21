const router = require('express').Router();
const { getProfile, getPublicProfile, syncProgress } =
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

router.get  ('/',          protect,               getProfile);
router.patch('/progress',  protect, writeLimiter, syncProgress);
// BUG-02 FIX: /battle-result removed — use POST /api/battle/result instead.
router.get  ('/:username',                         getPublicProfile);

module.exports = router;
