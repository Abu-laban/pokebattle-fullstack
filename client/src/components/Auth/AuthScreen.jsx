import { useState }      from 'react';
import { useAuthStore }  from '../../store/authStore.js';
import styles            from './AuthScreen.module.css';

export function AuthScreen({ onClose }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [form, setForm]       = useState({ username:'', email:'', password:'' });
  const { login, register, loading, error, clearError } = useAuthStore();

  const set = (k, v) => { clearError(); setForm(f => ({ ...f, [k]: v })); };

  const handleSubmit = async () => { let ok = false;
    if (mode === 'login') {
      ok = await login(form.email, form.password); if (ok) onClose?.();
    } else {
      ok = await register(form.username, form.email, form.password); if (ok) onClose?.();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>

        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <h1 className={styles.logoText}>POKÉBATTLE</h1>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => { setMode('login'); clearError(); }}
          >تسجيل الدخول</button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => { setMode('register'); clearError(); }}
          >حساب جديد</button>
        </div>

        <div className={styles.form}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label>اسم المستخدم</label>
              <input
                type="text" placeholder="AshKetchum"
                value={form.username}
                onChange={e => set('username', e.target.value)}
              />
            </div>
          )}

          <div className={styles.field}>
            <label>البريد الإلكتروني</label>
            <input
              type="email" placeholder="trainer@pokemon.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>كلمة المرور</label>
            <input
              type="password" placeholder="••••••••"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <div className={styles.error}>⚠️ {error}</div>}

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '⏳ جاري التحميل...' : mode === 'login' ? '🎮 ادخل إلى الملعب' : '✨ إنشاء حساب'}
          </button>
        </div>

        <p className={styles.guestNote}>
          <button onClick={onClose} style={{
            background:'none',border:'none',color:'rgba(255,255,255,.3)',
            cursor:'pointer',fontSize:11,textDecoration:'underline'
          }}>
            🎮 العب بدون حساب
          </button>
        </p>
      </div>
    </div>
  );
}
