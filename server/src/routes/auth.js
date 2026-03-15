const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  register, login, getMe, logout,
  verifyEmail, resendVerification,
  googleCallback, facebookCallback,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'محاولات كثيرة جداً، انتظر 15 دقيقة' },
});

// ── Local auth ────────────────────────────────────────────────────────────
router.post('/register',       authLimiter, register);
router.post('/login',          authLimiter, login);
router.post('/logout',         logout);
router.get ('/me',             protect,     getMe);
router.get ('/verify/:token',  verifyEmail);
router.post('/resend-verify',  authLimiter, resendVerification);

// ── Google OAuth ──────────────────────────────────────────────────────────
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.CLIENT_URL}/auth/callback?error=no_code`);
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    req.googleProfile = {
      id: profile.id,
      displayName: profile.name,
      emails: profile.email ? [{ value: profile.email }] : [],
      photos: profile.picture ? [{ value: profile.picture }] : [],
    };
    await googleCallback(req, res);
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?error=${encodeURIComponent(err.message)}`);
  }
});

// ── Facebook OAuth ────────────────────────────────────────────────────────
router.get('/facebook', (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID,
    redirect_uri:  `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`,
    scope:         'email,public_profile',
    response_type: 'code',
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

router.get('/facebook/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.CLIENT_URL}/auth/callback?error=no_code`);
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id:     process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri:  `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`,
        code,
      })
    );
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error.message);

    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokens.access_token}`
    );
    const fb = await profileRes.json();
    req.facebookProfile = {
      id: fb.id,
      displayName: fb.name,
      emails:  fb.email ? [{ value: fb.email }] : [],
      photos:  fb.picture?.data?.url ? [{ value: fb.picture.data.url }] : [],
    };
    await facebookCallback(req, res);
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;