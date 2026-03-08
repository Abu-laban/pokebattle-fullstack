const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT token ───────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح — يجب تسجيل الدخول' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ error: 'المستخدم غير موجود' });

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة — سجل دخولك مجدداً' });
    res.status(401).json({ error: 'Token غير صالح' });
  }
};

// ── Optional auth (for public routes that benefit from user data) ─────────
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token   = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {}
  next();
};

module.exports = { protect, optionalAuth };
