import { useMemo, useRef } from 'react';
import { createPortal }    from 'react-dom';
import { useProgressStore, getTrainerRank, xpForLevel } from '../../store/progressStore';
import { useAuthStore }    from '../../store/authStore';
import { DEX }             from '../../data/dex';
import styles              from './StatsOverlay.module.css';

export function StatsOverlay({ isOpen, onClose }) {
  const progress = useProgressStore();
  const { user } = useAuthStore();

  // ── All stats from server when logged in, zeros when not ──────────────────
  const level     = user?.level            ?? 1;
  const xp        = user?.xp               ?? 0;
  const wins      = user?.stats?.wins      ?? 0;
  const losses    = user?.stats?.losses    ?? 0;
  const towerBest = user?.stats?.towerBest ?? 0;
  const superEff  = user?.stats?.superEffHits ?? 0;

  const trainerRank = getTrainerRank(level);
  const totalGames  = wins + losses;
  const winRate     = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const xpNeeded    = xpForLevel(level);
  const xpPct       = xpNeeded > 0 ? Math.min(100, Math.round((xp / xpNeeded) * 100)) : 0;

  // ── Local stats (only valid when logged in and played) ────────────────────
  const topPokes = useMemo(() => {
    if (!user) return [];
    return Object.entries(progress.winsWithPoke || {})
      .map(([id, count]) => ({ poke: DEX.find(p => p.id === parseInt(id)), count }))
      .filter(x => x.poke && x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [progress.winsWithPoke, user]);

  const typeWins = useMemo(() => {
    if (!user) return [];
    return Object.entries(progress.winsByType || {})
      .filter(([, c]) => c > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [progress.winsByType, user]);

  const unlockedCount = user ? (progress.unlockedPokes?.length ?? 0) : 0;
  const totalPokemon  = DEX.length;
  const collectionPct = Math.round((unlockedCount / totalPokemon) * 100);

  if (!isOpen) return null;

  return createPortal((
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <h2>📊 إحصائياتك</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Not logged in notice ── */}
        {!user && (
          <div style={{
            textAlign: 'center', padding: '32px 16px',
            fontFamily: "'Cairo',sans-serif", color: 'rgba(255,255,255,.5)',
            fontSize: 15, lineHeight: 1.7,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ color: '#4FC3F7', fontWeight: 700, marginBottom: 8 }}>
              سجّل دخولك لرؤية إحصائياتك
            </div>
            <div style={{ fontSize: 13 }}>
              الإحصائيات تُحفظ على الخادم وتظهر فقط عند تسجيل الدخول.
            </div>
          </div>
        )}

        {/* ── Logged in content ── */}
        {user && (<>

          {/* Trainer */}
          <div className={styles.section}>
            <h3>🎖️ المدرب — {user.username}</h3>
            <div className={styles.profileGrid}>
              <div className={styles.stat}>
                <span className={styles.label}>الرتبة</span>
                <span className={styles.value}>{trainerRank.label}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>المستوى</span>
                <span className={styles.value}>Lv.{level}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>XP</span>
                <span className={styles.value}>{xp} / {xpNeeded}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>أفضل برج</span>
                <span className={styles.value}>🏰 {towerBest}</span>
              </div>
            </div>
            <div className={styles.progressBar} style={{ marginTop: 10 }}>
              <div className={styles.progress} style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          {/* Battle Stats */}
          <div className={styles.section}>
            <h3>⚔️ المعارك</h3>
            <div className={styles.profileGrid}>
              <div className={styles.stat}>
                <span className={styles.label}>انتصارات</span>
                <span className={styles.value} style={{ color: '#66BB6A' }}>{wins}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>خسائر</span>
                <span className={styles.value} style={{ color: '#EF5350' }}>{losses}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>نسبة الفوز</span>
                <span className={styles.value} style={{ color: '#FFD600' }}>{winRate}%</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>ضربات فعّالة</span>
                <span className={styles.value} style={{ color: '#AB47BC' }}>{superEff}</span>
              </div>
            </div>
          </div>

          {/* Collection */}
          <div className={styles.section}>
            <h3>📦 المجموعة</h3>
            <div className={styles.profileGrid}>
              <div className={styles.stat}>
                <span className={styles.label}>مفتوحة</span>
                <span className={styles.value} style={{ color: '#4FC3F7' }}>{unlockedCount}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>الإجمالي</span>
                <span className={styles.value}>{totalPokemon}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>الاكتمال</span>
                <span className={styles.value}>{collectionPct}%</span>
              </div>
            </div>
            <div className={styles.progressBar} style={{ marginTop: 8 }}>
              <div className={styles.progress} style={{ width: `${collectionPct}%`, background: '#4FC3F7' }} />
            </div>
          </div>

          {/* Top Pokémon */}
          {topPokes.length > 0 && (
            <div className={styles.section}>
              <h3>⭐ أكثر بوكيمون استخداماً</h3>
              <div className={styles.pokesList}>
                {topPokes.map(({ poke, count }) => (
                  <div key={poke.id} className={styles.pokeItem}>
                    <span className={styles.pokeName}>{poke.name}</span>
                    <span className={styles.pokeWins}>{count} انتصار</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type wins */}
          {typeWins.length > 0 && (
            <div className={styles.section}>
              <h3>🔥 انتصارات حسب النوع</h3>
              <div className={styles.typesList}>
                {typeWins.map(([type, count]) => (
                  <div key={type} className={styles.typeItem}>
                    <span className={styles.typeName}>{type}</span>
                    <span className={styles.count}>×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty local stats hint */}
          {topPokes.length === 0 && typeWins.length === 0 && wins === 0 && (
            <div style={{
              textAlign: 'center', color: 'rgba(255,255,255,.35)',
              fontFamily: "'Cairo',sans-serif", fontSize: 13, padding: '12px 0 4px',
            }}>
              العب بعض المعارك لترى تفاصيل أكثر هنا!
            </div>
          )}

        </>)}

      </div>
    </div>
  ), document.body);
}