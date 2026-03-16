import { useState, useRef }  from 'react';
import { useAuthStore }      from '../../store/authStore.js';
import styles                from './AuthScreen.module.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

        {/* ── OAuth ── */}
        <div className={styles.oauthRow}>
          <a href={`${API}/auth/google`} className={`${styles.oauthBtn} ${styles.google}`}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>متابعة مع Google</span>
          </a>
          <a href={`${API}/auth/facebook`} className={`${styles.oauthBtn} ${styles.facebook}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.883v2.258h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            <span>متابعة مع Facebook</span>
          </a>
        </div>

        <div className={styles.divider}><span>أو بالبريد الإلكتروني</span></div>

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