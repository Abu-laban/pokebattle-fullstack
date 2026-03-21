const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Reads the JWT from:
 *   1. Authorization: Bearer <token>   (API clients / frontend XHR)
 *   2. pb_token HttpOnly cookie        (email-verification redirect flow)
 *
 * Priority: Bearer header wins if both are present.
 */
function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.split(' ')[1];
  if (req.cookies?.pb_token)         return req.cookies.pb_token;
  return null;
}

// ── protect ───────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح — يجب تسجيل الدخول' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'خطأ في إعدادات الخادم' });
    }

    const decoded = jwt.verify(token, secret);
    const user    = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة — سجل دخولك مجدداً' });
    }
    res.status(401).json({ error: 'جلسة غير صالحة' });
  }
};

// ── optionalAuth ──────────────────────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const token  = extractToken(req);
    const secret = process.env.JWT_SECRET;
    if (token && secret) {
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {
    // Optional auth fails silently
  }
  next();
};

module.exports = { protect, optionalAuth };
