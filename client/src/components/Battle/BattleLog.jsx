// BattleLog — Live battle message feed with colored entries
import { useEffect, useRef } from 'react';
import { useBattleStore } from '../../store/battleStore.js';
import styles from './BattleLog.module.css';

// Map cls → icon prefix for visual clarity
const CLS_ICON = {
  playerAtk: '⚔',
  enemyAtk:  '💢',
  death:     '💀',
  heal:      '💚',
  sys:       '·',
};

export function BattleLog() {
  const log       = useBattleStore(s => s.log);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className={styles.log}>
      <div className={styles.logHeader}>
        <span className={styles.logTitle}>📜 سجل المعركة</span>
        <span className={styles.logCount}>{log.length}</span>
      </div>
      <div className={styles.entries}>
        {log.length === 0 && (
          <div className={`${styles.entry} ${styles.sys}`}>جاهز للمعركة...</div>
        )}
        {log.map(entry => (
          <div
            key={entry.id}
            className={`${styles.entry} ${styles[entry.cls] || styles.sys}`}
          >
            <span className={styles.entryIcon}>{CLS_ICON[entry.cls] || '·'}</span>
            <span className={styles.entryText}>{entry.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
