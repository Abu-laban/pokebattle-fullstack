import { useEffect, useRef, useState } from 'react';
import { useAuthStore }       from '../../store/authStore.js';
import { useProgressStore, xpForLevel } from '../../store/progressStore.js';
import { UserAPI }            from '../../services/api.js';
import styles                 from './ProfileScreen.module.css';

// ── All milestone levels with rank labels ─────────────────────────────────────
const MILESTONES = [
  { level: 1,  label: '🎓 متدرب',        color: '#78909C', unlock: 'بوكيمون BST < 320 مجانية'           },
  { level: 5,  label: '🌟 مبتدئ',         color: '#4FC3F7', unlock: 'بوكيمون BST 320–419 متاحة'          },
  { level: 10, label: '🎯 مدرب ماهر',     color: '#66BB6A', unlock: 'التطورات تصبح أسهل فتحاً'            },
  { level: 15, label: '🔥 ماهر',          color: '#FF9800', unlock: 'بوكيمون BST 420+ متاحة (مع الرتبة)'  },
  { level: 20, label: '⭐ متقدم',          color: '#7C4DFF', unlock: 'أسطوريات BST 500–569 (+ هزائم نوعية)' },
  { level: 30, label: '⚡ خبير',          color: '#AB47BC', unlock: 'أسطوريات BST 570+ (+ برج 5 + نوع)'  },
  { level: 45, label: '👑 أسطورة',        color: '#FF5252', unlock: 'شرط المستوى لكل البوكيمون مكتمل'      },
];

// Compute cumulative XP required to REACH a given level from level 1
function xpToReachLevel(targetLevel) {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl++) total += xpForLevel(lvl);
  return total;
}

// ── Level Roadmap Tooltip ─────────────────────────────────────────────────────
function LevelRoadmap({ currentLevel, currentXP }) {
  // Cumulative XP the player has earned so far (sum of all past levels + current partial)
  const cumulativeXP = xpToReachLevel(currentLevel) + currentXP;

  return (
    <div className={styles.roadmapInner}>
      <div className={styles.roadmapTitle}>المستويات والرتب</div>
      <div className={styles.roadmapList}>
        {MILESTONES.map((ms, i) => {
          const isReached   = currentLevel >= ms.level;
          const isCurrent   = currentLevel >= ms.level &&
                              (i === MILESTONES.length - 1 || currentLevel < MILESTONES[i + 1].level);
          const xpNeeded    = xpToReachLevel(ms.level);
          const xpRemaining = Math.max(0, xpNeeded - cumulativeXP);

          return (
            <div
              key={ms.level}
              className={`${styles.roadmapRow} ${isReached ? styles.reached : styles.locked} ${isCurrent ? styles.current : ''}`}
            >
              {/* Left: milestone icon + level */}
              <div className={styles.roadmapLeft}>
                <div
                  className={styles.roadmapDot}
                  style={{
                    background:   isReached ? ms.color : 'rgba(255,255,255,.1)',
                    boxShadow:    isReached ? `0 0 8px ${ms.color}66` : 'none',
                    border:       isCurrent ? `2px solid ${ms.color}` : '2px solid transparent',
                  }}
                >
                  {isReached ? '✓' : ms.level}
                </div>
                {i < MILESTONES.length - 1 && (
                  <div
                    className={styles.roadmapLine}
                    style={{ background: isReached ? ms.color + '55' : 'rgba(255,255,255,.06)' }}
                  />
                )}
              </div>

              {/* Right: info */}
              <div className={styles.roadmapInfo}>
                <div className={styles.roadmapRank} style={{ color: isReached ? ms.color : 'rgba(255,255,255,.3)' }}>
                  {ms.label}
                  {isCurrent && <span className={styles.currentBadge}>الحالي</span>}
                </div>
                <div className={styles.roadmapUnlock} style={{ color: isReached ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.22)' }}>
                  {ms.unlock}
                </div>
                {!isReached && (
                  <div className={styles.roadmapXpLeft}>
                    {xpRemaining.toLocaleString()} XP للوصول
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ProfileScreen({ onClose }) {
  const overlayRef   = useRef(null);
  const { user, refreshUser, logout } = useAuthStore();
  const progress     = useProgressStore();
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { refreshUser?.(); }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  const handleLogout = async () => { await logout(); };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await UserAPI.resetStats();
      // Apply soft reset locally — keeps unlocks, missions, pokeXp
      progress.softReset();
      if (res?.user) {
        // Sync the authoritative server state back
        progress.syncFromServer(res.user);
      }
      await refreshUser?.();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  if (!user) return null;

  const wins       = user.stats?.wins      ?? progress.wins;
  const losses     = user.stats?.losses    ?? progress.losses;
  const towerBest  = user.stats?.towerBest ?? progress.towerBest;
  const totalGames = wins + losses;
  const winRate    = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const RANKS = [
    { min: 0,  label: '🎓 متدرب',       color: '#78909C' },
    { min: 5,  label: '🌟 مدرب مبتدئ',  color: '#4FC3F7' },
    { min: 10, label: '🎯 مدرب ماهر',   color: '#66BB6A' },
    { min: 15, label: '🔥 ماهر',        color: '#FF9800' },
    { min: 25, label: '⚡ خبير',        color: '#AB47BC' },
    { min: 35, label: '🏆 سيد',        color: '#FFD600' },
    { min: 45, label: '👑 أسطورة',      color: '#FF5252' },
  ];
  const serverLevel = user.level ?? 1;
  const rank        = [...RANKS].reverse().find(r => serverLevel >= r.min) || RANKS[0];

  // XP progress for current level
  const currentXP  = user.xp ?? 0;
  const xpRequired = xpForLevel(serverLevel);
  const xpPct      = Math.min(100, Math.round((currentXP / xpRequired) * 100));

  // Next rank info
  const nextRank = MILESTONES.find(ms => ms.level > serverLevel);

  const joinDate     = user.createdAt
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
            <div
              className={styles.levelBadge}
              onMouseEnter={() => setShowRoadmap(true)}
              onMouseLeave={() => setShowRoadmap(false)}
              onClick={() => setShowRoadmap(v => !v)}
              title="عرض خريطة المستويات"
            >
              Lv.{serverLevel}
            </div>
          </div>
          <div className={styles.heroInfo}>
            <h2 className={styles.username}>{user.username}</h2>
            <div className={styles.rankTag}
              style={{ color: rank.color, borderColor: rank.color + '44', background: rank.color + '18' }}>
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
            <span className={styles.xpVal}>{currentXP.toLocaleString()} XP</span>
          </div>
          <div className={styles.xpTrack}>
            <div className={styles.xpFill} style={{ width: `${xpPct}%` }} />
          </div>
          <div className={styles.xpFooter}>
            <span className={styles.xpNext}>
              المستوى {serverLevel + 1} يتطلب {xpRequired} XP
            </span>
            {nextRank && serverLevel < nextRank.level && (
              <span className={styles.xpNextRank} style={{ color: nextRank.color }}>
                {nextRank.label} عند Lv.{nextRank.level}
              </span>
            )}
          </div>
        </div>

        {/* ── Level Roadmap toggle button ── */}
        <button
          className={styles.roadmapToggle}
          onClick={() => setShowRoadmap(v => !v)}
        >
          <span>🗺️ خريطة المستويات</span>
          <span className={`${styles.roadmapArrow} ${showRoadmap ? styles.roadmapArrowUp : ''}`}>▾</span>
        </button>

        {/* ── Level Roadmap panel (inline, inside card) ── */}
        {showRoadmap && (
          <div className={styles.roadmapPanel}>
            <LevelRoadmap currentLevel={serverLevel} currentXP={currentXP} />
          </div>
        )}

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

        {/* ── Reset Stats Button ── */}
        <button className={styles.resetBtn} onClick={() => setShowResetConfirm(true)}>
          🔄 إعادة الضبط إلى المستوى 1
        </button>

        {/* ── Reset Confirmation Dialog ── */}
        {showResetConfirm && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmDialog}>
              <div className={styles.confirmIcon}>⚠️</div>
              <div className={styles.confirmTitle}>إعادة الضبط؟</div>
              <div className={styles.confirmDesc}>
                سيتم تصفير:
              </div>
              <ul className={styles.confirmList}>
                <li>المستوى والـ XP → Level 1</li>
                <li>سجل الانتصارات والهزائم</li>
                <li>أفضل سلسلة برج</li>
              </ul>
              <div className={styles.confirmKeep}>
                ✅ يبقى محفوظاً: البوكيمونات المفتوحة، المهام، تطور البوكيمون
              </div>
              <div className={styles.confirmBtns}>
                <button
                  className={styles.confirmYes}
                  onClick={handleReset}
                  disabled={resetting}
                >
                  {resetting ? '⏳ جاري الإعادة...' : '✅ نعم، إعادة الضبط'}
                </button>
                <button className={styles.confirmNo} onClick={() => setShowResetConfirm(false)}>
                  إلغاء
                </button>
              </div>
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