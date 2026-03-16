import { useEffect, useRef }  from 'react';
import { useAuthStore }       from '../../store/authStore.js';
import { useProgressStore }   from '../../store/progressStore.js';
import styles                 from './ProfileScreen.module.css';

function StatBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statTrack}>
        <div className={styles.statFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.statVal}>{value}</span>
    </div>
  );
}

export function ProfileScreen({ onClose }) {
  const overlayRef = useRef(null);
  const { user, refreshUser, logout } = useAuthStore();
  const progress = useProgressStore();

  useEffect(() => { refreshUser?.(); }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    // Don't call onClose - App will show landing page automatically when user becomes null
  };

  if (!user) return null;

  const wins      = user.stats?.wins      ?? progress.wins;
  const losses    = user.stats?.losses    ?? progress.losses;
  const towerBest = user.stats?.towerBest ?? progress.towerBest;
  const totalGames = wins + losses;
  const winRate    = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const RANKS = [
    { min: 0,  label: '🎮 مبتدئ',    color: '#78909C' },
    { min: 5,  label: '🌟 مدرب مبتدئ', color: '#4FC3F7' },
    { min: 10, label: '🎯 مدرب ماهر', color: '#66BB6A' },
    { min: 15, label: '🔥 ماهر',     color: '#FF9800' },
    { min: 25, label: '⚡ خبير',     color: '#AB47BC' },
    { min: 35, label: '🏆 سيد',     color: '#FFD600' },
    { min: 45, label: '👑 أسطورة',   color: '#FF5252' },
  ];
  const serverLevel = user.level ?? 1;
  const rank = [...RANKS].reverse().find(r => serverLevel >= r.min) || RANKS[0];

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const providerIcon = { google: '🔵 Google', facebook: '🔷 Facebook', local: '✉️ بريد' }[user.provider] || '✉️';

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.card}>

        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* ── Avatar & Name ── */}
        <div className={styles.hero}>
          <div className={styles.avatar}>
            {user.avatar
              ? <img src={user.avatar} alt={user.username} className={styles.avatarImg} />
              : <span className={styles.avatarLetter}>{user.username[0].toUpperCase()}</span>
            }
            <div className={styles.levelBadge}>Lv.{serverLevel}</div>
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.username}>{user.username}</h2>
            <div className={styles.rankTag} style={{ color: rank.color, borderColor: rank.color + '44', background: rank.color + '18' }}>
              {rank.label}
            </div>
            <div className={styles.metaRow}>
              <span className={styles.meta}>{providerIcon}</span>
              <span className={styles.meta}>📅 {joinDate}</span>
            </div>
          </div>
        </div>

        {/* ── XP Bar ── */}
        <div className={styles.xpSection}>
          <div className={styles.xpRow}>
            <span className={styles.xpLabel}>المستوى {serverLevel}</span>
            <span className={styles.xpVal}>{user.xp ?? 0} XP</span>
          </div>
          <div className={styles.xpTrack}>
            <div className={styles.xpFill} style={{ width: `${Math.min(100, ((user.xp ?? 0) / (serverLevel * 100)) * 100)}%` }} />
          </div>
          <span className={styles.xpNext}>المستوى {serverLevel + 1} يتطلب {serverLevel * 100} XP</span>
        </div>

        {/* ── Battle Stats ── */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNum} style={{ color: '#66BB6A' }}>{wins}</div>
            <div className={styles.statName}>انتصارات</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNum} style={{ color: '#EF5350' }}>{losses}</div>
            <div className={styles.statName}>خسائر</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNum} style={{ color: '#FFD600' }}>{winRate}%</div>
            <div className={styles.statName}>نسبة فوز</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNum} style={{ color: '#AB47BC' }}>{towerBest}</div>
            <div className={styles.statName}>أفضل برج</div>
          </div>
        </div>

        {/* ── Achievements ── */}
        {user.achievements?.length > 0 && (
          <div className={styles.achSection}>
            <div className={styles.sectionTitle}>الإنجازات</div>
            <div className={styles.achList}>
              {user.achievements.map(a => (
                <div key={a} className={styles.achBadge}>{a}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── Logout ── */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          🚪 تسجيل الخروج
        </button>

      </div>
    </div>
  );
}