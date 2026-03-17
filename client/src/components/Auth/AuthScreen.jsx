import { useState, useRef }  from 'react';
import { useAuthStore }      from '../../store/authStore.js';
import styles                from './AuthScreen.module.css';



export function AuthScreen({ onClose }) {
  const [mode, setMode]         = useState('login');
  const [form, setForm]         = useState({ username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const overlayRef              = useRef(null);

  const {
    login, register, resendVerification,
    loading, error, needsVerification, verificationEmail,
    clearError,
  } = useAuthStore();

  const update = (k, v) => { clearError(); setForm(f => ({ ...f, [k]: v })); };

  const handleSubmit = async () => {
    if (mode === 'login') {
      const res = await login(form.email, form.password);
      if (res.success) onClose?.();
    } else {
      const res = await register(form.username, form.email, form.password);
      if (res.devAutoVerified) {
        // Dev mode: auto-verified, go to login
        switchMode('login');
      }
      // otherwise stays showing verification notice
    }
  };

  const switchMode = (m) => {
    setMode(m); clearError();
    setForm({ username: '', email: '', password: '' });
  };

  // Click outside overlay to close
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  // ── Verification pending screen ──────────────────────────────────────────
  if (needsVerification) {
    return (
      <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
        <div className={styles.card}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
          <div className={styles.verifyBox}>
            <div className={styles.verifyIcon}>📧</div>
            <h2 className={styles.verifyTitle}>تحقق من بريدك!</h2>
            <p className={styles.verifySub}>
              أرسلنا رابط التفعيل إلى
            </p>
            <div className={styles.verifyEmail}>{verificationEmail}</div>
            <p className={styles.verifySub} style={{ fontSize: 12 }}>
              افتح البريد واضغط على الرابط لتفعيل حسابك، ثم سجل دخولك.
            </p>
            <button
              className={styles.resendBtn}
              onClick={() => resendVerification(verificationEmail)}
            >
              🔄 إعادة إرسال الرابط
            </button>
            <button className={styles.guestBtn} onClick={() => { clearError(); setMode('login'); }}>
              ← العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.card}>

        {/* ── X Close ── */}
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* ── Logo ── */}
        <div className={styles.logo}>
          <span className={styles.bolt}>⚡</span>
          <div className={styles.logoText}>POKÉBATTLE</div>
          <div className={styles.logoSub}>
            {mode === 'login' ? 'سجل دخولك وابدأ المعركة' : 'أنشئ حسابك وابدأ رحلتك'}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login'    ? styles.active : ''}`}
            onClick={() => switchMode('login')}
          >تسجيل الدخول</button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => switchMode('register')}
          >حساب جديد</button>
        </div>

        {/* ── Form ── */}
        <div className={styles.form}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>اسم المستخدم</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}>👤</span>
                <input
                  className={styles.input} type="text" placeholder="AshKetchum"
                  value={form.username} onChange={e => update('username', e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>البريد الإلكتروني</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>✉️</span>
              <input
                className={styles.input} type="email" placeholder="trainer@pokemon.com"
                value={form.email} onChange={e => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>كلمة المرور</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>🔒</span>
              <input
                className={styles.input}
                type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => update('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button className={styles.eyeBtn} onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading
              ? '⏳ جاري التحميل...'
              : mode === 'login' ? '🎮 ادخل إلى الملعب' : '✨ إنشاء حساب'}
          </button>
        </div>

      </div>
    </div>
  );
}