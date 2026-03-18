const nodemailer = require('nodemailer');

/**
 * Mailer Configuration
 * Exclusively supports Brevo (formerly Sendinblue) via SMTP
 */

let transporter = null;

// Initialize SMTP transporter using Brevo settings
if (process.env.SMTP_USER && process.env.SMTP_PASS && !process.env.SMTP_USER.includes('your_')) {
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = port === 465; // Use SSL for port 465

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add timeouts to avoid long waits on network issues
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  
  console.log(`✅ Mailer initialized (Brevo SMTP on port ${port}, secure: ${isSecure})`);
} else {
  console.warn('⚠️ SMTP not configured — emails will be skipped. Please set SMTP_USER and SMTP_PASS in .env');
}

/**
 * Get the sender address from environment variables
 */
function getFromAddress() {
  return (
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `"PokéBattle ⚡" <${process.env.SMTP_USER}>` : '"PokéBattle ⚡" <no-reply@pokebattle.com>')
  );
}

/**
 * Send verification email to user
 * @param {string} email - Recipient email
 * @param {string} username - Recipient username
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(email, username, token) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const verifyUrl = `${clientUrl}/verify/${token}`;
  const from = getFromAddress();
  const subject = '✅ تحقق من بريدك — PokéBattle';
  
  const html = `
    <div style="background:#0d1525;color:#fff;font-family:Arial,sans-serif;padding:40px;border-radius:16px;max-width:480px;margin:auto;direction:rtl;text-align:right;">
      <div style="text-align:center;margin-bottom:24px">
        <span style="font-size:40px">⚡</span>
        <h1 style="color:#FFD600;font-size:22px;letter-spacing:2px;margin:8px 0">POKÉBATTLE</h1>
      </div>
      <h2 style="color:#4FC3F7;text-align:center">أهلاً ${username}! 👋</h2>
      <p style="color:rgba(255,255,255,.7);text-align:center;line-height:1.6">
        شكراً لتسجيلك في PokéBattle. اضغط الزر أدناه لتفعيل حسابك والبدء باللعب.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${verifyUrl}" style="
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
  `;

  if (transporter) {
    try {
      await transporter.sendMail({ from, to: email, subject, html });
      console.log(`📧 Verification email sent to ${email} via Brevo`);
    } catch (error) {
      console.error('❌ Error sending email via Brevo:', error.message);
      // Re-throw with a more descriptive message
      const customError = new Error(`فشل إرسال البريد عبر Brevo: ${error.message}`);
      customError.code = error.code;
      throw customError;
    }
    return;
  }

  // Fallback for development if SMTP is not configured
  console.log(`\n📧 [DEV] SMTP not configured. Verify link for ${email}:\n${verifyUrl}\n`);
}

module.exports = { sendVerificationEmail };
