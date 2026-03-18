const jwt  = require('jsonwebtoken');
const User = require('../models/User');

function normalizeUsername(raw) {
  const base = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base.length >= 3 ? base : `trainer_${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function ensureUserFromSupabaseClaims(decoded) {
  const supabaseId = decoded?.sub;
  const email = decoded?.email;
  if (!supabaseId || !email) return null;

  let user = await User.findOne({ $or: [{ supabaseId }, { email }] }).select('-password');
  if (user) {
    if (!user.supabaseId) {
      user.supabaseId = supabaseId;
      user.provider = 'supabase';
      await user.save({ validateModifiedOnly: true });
    }
    return user;
  }

  const desiredUsername =
    decoded?.user_metadata?.username ||
    (email.includes('@') ? email.split('@')[0] : email);

  let username = normalizeUsername(desiredUsername);
  // Ensure uniqueness
  for (let i = 0; i < 5; i++) {
    const exists = await User.findOne({ username }).select('_id');
    if (!exists) break;
    username = normalizeUsername(`${desiredUsername}_${Math.floor(Math.random() * 9000 + 1000)}`);
  }

  user = await User.create({
    supabaseId,
    username,
    email,
    provider: 'supabase',
    isVerified: true,
  });
  return user.toPublic ? user : await User.findById(user._id).select('-password');
}

// ── Verify JWT token ───────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح — يجب تسجيل الدخول' });
    }

    const token   = header.split(' ')[1];
    const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    // Supabase: decoded.sub is the user id; server JWT: decoded.id
    if (decoded?.sub && decoded?.email) {
      req.user = await ensureUserFromSupabaseClaims(decoded);
      if (!req.user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    } else {
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

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
      const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      if (decoded?.sub && decoded?.email) {
        req.user = await ensureUserFromSupabaseClaims(decoded);
      } else {
        req.user = await User.findById(decoded.id).select('-password');
      }
    }
  } catch {}
  next();
};

module.exports = { protect, optionalAuth };
