const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Mailer Configuration
 * Exclusively supports Brevo via HTTPS API (Port 443)
 * Updated to support @getbrevo/brevo v2.x.x syntax
 */

let brevoClient = null;

// Initialize Brevo API client
if (process.env.BREVO_API_KEY && !process.env.BREVO_API_KEY.includes('your_')) {
  try {
    // In v2.x.x, we use the BrevoClient class
    brevoClient = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY,
    });
    console.log('✅ Mailer ready (Brevo HTTPS API v2)');
  } catch (err) {
    console.error('❌ Failed to initialize Brevo client:', err.message);
  }
} else {
  console.warn('⚠️ Brevo API Key not configured — emails will be skipped. Please set BREVO_API_KEY in .env');
}

/**
 * Get the sender info from environment variables
 */
function getSenderInfo() {
  const mailFrom = process.env.MAIL_FROM || 'PokéBattle ⚡ <no-reply@pokebattle.com>';
  
  // Extract name and email from "Name <email@example.com>" format
  const match = mailFrom.match(/^(.*?) <(.*?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: 'PokéBattle ⚡', email: mailFrom };
}

/**
 * Send verification email to user via Brevo API
 * @param {string} email - Recipient email
 * @param {string} username - Recipient username
 * @param {string} token - Verification token
 */
async function sendVerificationEmail(email, username, token) {
  // Use SERVER_URL for verification link to process in backend first
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const verifyUrl = `${serverUrl}/api/auth/verify/${token}`;
  const sender = getSenderInfo();
  const subject = '✅ تحقق من بريدك — PokéBattle';
  
  const htmlContent = `
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

  if (brevoClient) {
    try {
      // In v2.x.x, the method is transactionalEmails.sendTransacEmail
      await brevoClient.transactionalEmails.sendTransacEmail({
        subject: subject,
        htmlContent: htmlContent,
        sender: sender,
        to: [{ email: email, name: username }],
      });
      console.log(`📧 Verification email sent to ${email} via Brevo API (HTTPS)`);
    } catch (error) {
      console.error('❌ Error sending email via Brevo API:', error.message);
      throw new Error(`فشل إرسال البريد عبر Brevo API: ${error.message}`);
    }
    return;
  }

  // Fallback for development if API Key is not configured
  console.log(`\n📧 [DEV] Brevo API not configured. Verify link for ${email}:\n${verifyUrl}\n`);
}

module.exports = { sendVerificationEmail };
