const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes and ensure user is authenticated
 * Uses server-side JWT only (Supabase removed)
 */

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح — يجب تسجيل الدخول' });
    }

    const token = header.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'خطأ في إعدادات الخادم' });
    }

    const decoded = jwt.verify(token, secret);
    
    // Server JWT uses decoded.id
    const user = await User.findById(decoded.id).select('-password');
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

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(token, secret);
        req.user = await User.findById(decoded.id).select('-password');
      }
    }
  } catch (err) {
    // Optional auth fails silently
  }
  next();
};

module.exports = { protect, optionalAuth };
