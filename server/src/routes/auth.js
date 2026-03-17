const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  register, login, getMe, logout,
  verifyEmail, resendVerification,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'محاولات كثيرة جداً، انتظر 15 دقيقة' },
});

router.post('/register',       authLimiter, register);
router.post('/login',          authLimiter, login);
router.post('/logout',         logout);
router.get ('/me',             protect,     getMe);
router.get ('/verify/:token',  verifyEmail);
router.post('/resend-verify',  authLimiter, resendVerification);

module.exports = router;