const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { getXPLeaderboard, getTowerLeaderboard, getWinsLeaderboard } =
  require('../controllers/leaderboardController');

// SEC-04 FIX: Rate-limit leaderboard endpoints to prevent scraping / DoS.
// 60 requests per 10 minutes per IP is generous for legitimate UI usage.
const leaderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'محاولات كثيرة جداً، انتظر قليلاً' },
});

router.get('/xp',    leaderLimiter, getXPLeaderboard);
router.get('/tower', leaderLimiter, getTowerLeaderboard);
router.get('/wins',  leaderLimiter, getWinsLeaderboard);

module.exports = router;
