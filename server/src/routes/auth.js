const router     = require('express').Router();
const rateLimit  = require('express-rate-limit');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Rate limit: max 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'محاولات كثيرة جداً، انتظر 15 دقيقة' },
});

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.get ('/me',       protect,     getMe);

module.exports = router;
