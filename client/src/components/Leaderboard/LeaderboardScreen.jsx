import { useState, useEffect } from 'react';
import { LeaderboardAPI }      from '../../services/api.js';
import { useAuthStore }        from '../../store/authStore.js';
import styles                  from './LeaderboardScreen.module.css';

const TABS = [
  { key: 'xp',    label: '⭐ المستوى',     fetch: () => LeaderboardAPI.getXP()    },
  { key: 'wins',  label: '⚔️ الانتصارات',  fetch: () => LeaderboardAPI.getWins()  },
  { key: 'tower', label: '🏰 برج المعارك', fetch: () => LeaderboardAPI.getTower() },
];

export function LeaderboardScreen({ onBack }) {
  const [tab,   setTab]   = useState('xp');
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const current = TABS.find(t => t.key === tab);
    setLoading(true);
    current.fetch()
      .then(r => setBoard(r.board || []))
      .catch(() => setBoard([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>← رجوع</button>
        <h2 className={styles.title}>🏆 لوحة المتصدرين</h2>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.active : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      <div className={styles.board}>
        {loading ? (
          <div className={styles.loading}>⏳ جاري التحميل...</div>
        ) : board.length === 0 ? (
          <div className={styles.empty}>لا توجد بيانات بعد — كن أول المتسابقين!</div>
        ) : board.map((entry, i) => (
          <div
            key={entry.username}
            className={`${styles.row} ${entry.username === user?.username ? styles.mine : ''} ${i < 3 ? styles['top' + (i+1)] : ''}`}
          >
            <span className={styles.rank}>{medals[i] ?? entry.rank}</span>
            <span className={styles.name}>{entry.username}</span>

            {tab === 'xp' && <>
              <span className={styles.lv}>Lv.{entry.level}</span>
              <span className={styles.val}>⭐ {entry.xp} XP</span>
            </>}
            {tab === 'wins' && <>
              <span className={styles.lv}>{entry.wins}W / {entry.losses}L</span>
              <span className={styles.val}>{entry.winRate}%</span>
            </>}
            {tab === 'tower' && <>
              <span className={styles.lv}>{entry.totalWins} wins</span>
              <span className={styles.val}>🏰 {entry.towerBest}</span>
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}
