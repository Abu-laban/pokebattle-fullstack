import { useState, useEffect } from 'react';
import { LeaderboardAPI }      from '../../services/api.js';
import { useAuthStore }        from '../../store/authStore.js';
import styles                  from './LeaderboardScreen.module.css';

const TABS = [
  { key: 'xp',    label: '⭐ المستوى',     fetch: () => LeaderboardAPI.getXP()    },
  { key: 'wins',  label: '⚔️ الانتصارات',  fetch: () => LeaderboardAPI.getWins()  },
  { key: 'tower', label: '🏰 برج المعارك', fetch: () => LeaderboardAPI.getTower() },
];

const MEDALS   = ['🥇', '🥈', '🥉'];
const TOP_GLOW = ['#FFD600', '#C0C0C0', '#CD7F32'];

export function LeaderboardScreen({ onBack }) {
  const [tab,     setTab]     = useState('xp');
  const [board,   setBoard]   = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const current = TABS.find(t => t.key === tab);
    setLoading(true);
    current.fetch()
      .then(r => setBoard(r.board || []))
      .catch(()  => setBoard([]))
      .finally(()=> setLoading(false));
  }, [tab]);

  return (
    <div className={styles.screen}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <h2 className={styles.title}>🏆 لوحة المتصدرين</h2>
        <button className={styles.back} onClick={onBack}>← رجوع</button>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Table header ── */}
      <div className={styles.tableHead}>
        <span className={styles.thRank}>#</span>
        <span className={styles.thName}>اللاعب</span>
        {tab === 'xp'    && <><span className={styles.thStat}>المستوى</span><span className={styles.thVal}>نقاط XP</span></>}
        {tab === 'wins'  && <><span className={styles.thStat}>انتصارات / خسائر</span><span className={styles.thVal}>نسبة الفوز</span></>}
        {tab === 'tower' && <><span className={styles.thStat}>أفضل سلسلة</span><span className={styles.thVal}>انتصارات</span></>}
      </div>

      {/* ── Board ── */}
      <div className={styles.board}>
        {loading ? (
          <div className={styles.empty}>⏳ جاري التحميل...</div>
        ) : board.length === 0 ? (
          <div className={styles.empty}>لا توجد بيانات بعد — كن أول المتسابقين!</div>
        ) : board.map((entry, i) => {
          const isTop3 = i < 3;
          const isMe   = entry.username === user?.username;
          const glow   = isTop3 ? TOP_GLOW[i] : null;

          return (
            <div
              key={entry.username}
              className={[
                styles.row,
                isTop3 ? styles['rank' + (i + 1)] : '',
                isMe   ? styles.mine : '',
              ].filter(Boolean).join(' ')}
              style={glow ? { '--glow': glow } : undefined}
            >
              {/* Rank */}
              <span className={styles.rank}>
                {isTop3
                  ? <span className={styles.medal}>{MEDALS[i]}</span>
                  : <span className={styles.rankNum}>{entry.rank}</span>
                }
              </span>

              {/* Avatar placeholder + name */}
              <span className={styles.nameCell}>
                <span className={styles.avatar}>
                  {entry.username?.charAt(0).toUpperCase()}
                </span>
                <span className={styles.username}>
                  {entry.username}
                  {isMe && <span className={styles.meBadge}>أنت</span>}
                </span>
              </span>

              {/* Stats */}
              {tab === 'xp' && <>
                <span className={styles.stat}>
                  <span className={styles.statIcon}>⭐</span> Lv.{entry.level}
                </span>
                <span className={styles.val}>{(entry.xp ?? 0).toLocaleString()} XP</span>
              </>}

              {tab === 'wins' && <>
                <span className={styles.stat}>
                  <span style={{ color:'#66BB6A' }}>{entry.wins ?? 0}W</span>
                  <span style={{ color:'rgba(255,255,255,.3)' }}> / </span>
                  <span style={{ color:'#EF5350' }}>{entry.losses ?? 0}L</span>
                </span>
                <span className={styles.val}>{entry.winRate ?? 0}%</span>
              </>}

              {tab === 'tower' && <>
                <span className={styles.stat}>
                  🏰 {entry.towerBest ?? 0} سلسلة
                </span>
                <span className={styles.val}>{entry.totalWins ?? 0} انتصار</span>
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}