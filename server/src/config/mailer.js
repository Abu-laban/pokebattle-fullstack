// ── Nodemailer Setup ──────────────────────────────────────────────────────
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Send verification email ────────────────────────────────────────────────
async function sendVerificationEmail(email, username, token) {
  const base   = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const link   = `${base}/api/auth/verify/${token}`;
  const client = process.env.CLIENT_URL || 'http://localhost:3000';

  await transporter.sendMail({
    from:    `"PokéBattle ⚡" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: '✅ تحقق من بريدك — PokéBattle',
    html: `
      <div style="background:#0d1525;color:#fff;font-family:Arial,sans-serif;padding:40px;border-radius:16px;max-width:480px;margin:auto">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:40px">⚡</span>
          <h1 style="color:#FFD600;font-size:22px;letter-spacing:2px;margin:8px 0">POKÉBATTLE</h1>
        </div>
        <h2 style="color:#4FC3F7;text-align:center">أهلاً ${username}! 👋</h2>
        <p style="color:rgba(255,255,255,.7);text-align:center;line-height:1.6">
          شكراً لتسجيلك في PokéBattle. اضغط الزر أدناه لتفعيل حسابك والبدء باللعب.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="
            background:linear-gradient(135deg,#4FC3F7,#7C4DFF);
            color:#fff;padding:14px 32px;border-radius:12px;
            text-decoration:none;font-weight:700;font-size:16px;
            display:inline-block;
          ">✅ تفعيل الحساب</a>
        </div>
        <p style="color:rgba(255,255,255,.35);font-size:12px;text-align:center">
          هذا الرابط صالح لمدة 24 ساعة فقط.<br>
          إذا لم تقم بإنشاء حساب، تجاهل هذا البريد.
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };