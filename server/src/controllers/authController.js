const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User');
const { sendVerificationEmail } = require('../config/mailer');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── POST /api/auth/register ────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({
        error: exists.email === email
          ? 'البريد الإلكتروني مستخدم بالفعل'
          : 'اسم المستخدم محجوز',
      });

    const user  = new User({ username, email, password, provider: 'local' });
    const isDev = process.env.NODE_ENV !== 'production';
    const hasSmtp = process.env.SMTP_USER && !process.env.SMTP_USER.includes('your_');

    const bypassVerify = process.env.BYPASS_VERIFICATION === 'true';

    if ((isDev && !hasSmtp) || bypassVerify) {
      // Dev mode or bypass enabled: auto-verify so users can login immediately
      user.isVerified = true;
      await user.save();
      res.status(201).json({
        message: bypassVerify 
          ? 'تم إنشاء الحساب (تجاوز التفعيل مُفعَّل).' 
          : 'تم إنشاء الحساب (وضع التطوير — مُفعَّل تلقائياً).',
        devAutoVerified: true,
      });
    } else {
      const token = user.createVerifyToken();
      await user.save();
      try {
        await sendVerificationEmail(email, username, token);
      } catch (mailErr) {
        console.warn('⚠️ Email send failed:', mailErr.message);
      }
      res.status(201).json({
        message: 'تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيل الحساب.',
        needsVerification: true,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── GET /api/auth/verify/:token ────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      verifyToken:        hashed,
      verifyTokenExpires: { $gt: Date.now() },
    }).select('+verifyToken +verifyTokenExpires');

    if (!user)
      return res.status(400).send(`
        <html><body style="background:#0d1525;color:#fff;font-family:Arial;text-align:center;padding:60px">
          <h1>⚠️ الرابط منتهي الصلاحية أو غير صالح</h1>
          <a href="${process.env.CLIENT_URL}" style="color:#4FC3F7">العودة للعبة</a>
        </body></html>
      `);

    user.isVerified         = true;
    user.verifyToken        = undefined;
    user.verifyTokenExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    const jwtToken = signToken(user._id);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/auth/callback?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify(user.toPublic()))}&verified=true`);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── POST /api/auth/resend-verify ───────────────────────────────────────────
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+verifyToken +verifyTokenExpires');
    if (!user)        return res.status(404).json({ error: 'البريد غير مسجل' });
    if (user.isVerified) return res.status(400).json({ error: 'الحساب مفعّل بالفعل' });

    const token = user.createVerifyToken();
    await user.save({ validateModifiedOnly: true });
    try {
      await sendVerificationEmail(email, user.username, token);
      res.json({ message: 'تم إرسال رابط التحقق مجدداً' });
    } catch (mailErr) {
      console.warn('⚠️ Email sending failed:', mailErr.message);
      res.status(500).json({
        error: 'حدث خطأ أثناء إرسال الإيميل. تحقق من إعدادات SMTP في السيرفر.',
        details: process.env.NODE_ENV !== 'production' ? mailErr.message : undefined,
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });

    if (!user.isVerified)
      return res.status(403).json({
        error: 'يجب تفعيل حسابك أولاً — تحقق من بريدك الإلكتروني',
        needsVerification: true,
        email: user.email,
      });

    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

    const token = signToken(user._id);

    // Set httpOnly cookie + return user data
    res.cookie('pb_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم' });
  }
};

// ── GET /api/auth/me ───────────────────────────────────────────────────────
const getMe = async (req, res) => {
  // Fetch fresh user data from DB
  const user = await User.findById(req.user._id);
  res.json({ user: user.toPublic() });
};

// ── POST /api/auth/logout ──────────────────────────────────────────────────
const logout = (req, res) => {
  res.clearCookie('pb_token');
  res.json({ message: 'تم تسجيل الخروج' });
};

// ── Google OAuth callback ──────────────────────────────────────────────────

module.exports = { register, login, getMe, logout, verifyEmail, resendVerification };