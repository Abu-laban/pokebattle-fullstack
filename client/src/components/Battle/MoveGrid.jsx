// MoveGrid — Tower single-pokemon move selection
import { MOVE_EFFECTS } from '../../data/moveEffects.js';
import styles from './MoveGrid.module.css';

const TYPE_COLORS = {
  FIRE:'#FF6B35', WATER:'#4FC3F7', GRASS:'#66BB6A', ELECTRIC:'#FFD600',
  PSYCHIC:'#EC407A', ICE:'#80DEEA', DRAGON:'#5C6BC0', DARK:'#546E7A',
  GHOST:'#7E57C2', ROCK:'#8D6E63', GROUND:'#BCAAA4', STEEL:'#90A4AE',
  FIGHTING:'#EF5350', POISON:'#AB47BC', BUG:'#8BC34A', FLYING:'#29B6F6',
  FAIRY:'#F48FB1', NORMAL:'#BDBDBD',
};

function getMoveCat(mv) {
  const eff = MOVE_EFFECTS[mv.n];
  if (eff?.weather) return { icon:'🌤', ar:'طقس' };
  if (eff?.target === 'self') return { icon:'🛡', ar:'داعم' };
  if (eff?.target === 'foe' && !mv.p) return { icon:'⚡', ar:'حالة' };
  if (mv.p === 0) return { icon:'✨', ar:'داعم' };
  if (mv.p > 100) return { icon:'💥', ar:'قوي' };
  return { icon:'⚔', ar:'هجوم' };
}

export function MoveGrid({ moves, ult, onSelect, disabled }) {
  return (
    <div className={styles.grid}>
      {(moves || []).map((mv, i) => {
        const color      = TYPE_COLORS[mv.t] || '#888';
        const isUlt      = mv.u;
        const ultBlocked = isUlt && ult < 100;
        const cat        = getMoveCat(mv);
        return (
          <button key={i}
            className={`${styles.btn} ${isUlt ? styles.ult : ''} ${ultBlocked ? styles.blocked : ''}`}
            style={{ '--c': color }}
            disabled={disabled || ultBlocked}
            onClick={() => onSelect(i)}
          >
            {isUlt && <span className={styles.ultTag}>✦ ULT</span>}
            <div className={styles.btnTop}>
              <span className={styles.catIcon}>{cat.icon}</span>
              <span className={styles.typeTag} style={{ background: color }}>{mv.t}</span>
            </div>
            <span className={styles.moveName}>{mv.n}</span>
            <span className={styles.movePwr}>
              {mv.p > 0 ? `قوة ${mv.p}` : cat.ar}
            </span>
            {isUlt && (
              <div className={styles.ultProg}>
                <div style={{ width: ult + '%', height: '100%',
                  background: 'linear-gradient(90deg,#7C4DFF,#E040FB)', borderRadius: 3 }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
