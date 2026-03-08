// DualMovePanel — 2v2 move selection per pokemon
import { useBattleStore } from '../../store/battleStore.js';
import styles from './DualMovePanel.module.css';

const TYPE_COLORS = {
  FIRE:'#FF6B35',WATER:'#4FC3F7',GRASS:'#66BB6A',ELECTRIC:'#FFD600',
  PSYCHIC:'#EC407A',ICE:'#80DEEA',DRAGON:'#5C6BC0',DARK:'#37474F',
  GHOST:'#7E57C2',ROCK:'#8D6E63',GROUND:'#BCAAA4',STEEL:'#90A4AE',
  FIGHTING:'#EF5350',POISON:'#AB47BC',BUG:'#8BC34A',FLYING:'#29B6F6',
  FAIRY:'#F48FB1',NORMAL:'#BDBDBD',
};

const CAT_ICON = { physical:'⚔', special:'✨', status:'🛡' };

export function DualMovePanel({ fieldPos, onMoveChosen }) {
  const myTeam       = useBattleStore(s => s.myTeam);
  const pField       = useBattleStore(s => s.pField);
  const pendingMoves = useBattleStore(s => s.pendingMoves);
  const pTurn        = useBattleStore(s => s.pTurn);
  const setPendingMove = useBattleStore(s => s.setPendingMove);

  const idx    = pField[fieldPos];
  const member = idx !== null ? myTeam[idx] : null;

  if (!member || member.fainted) {
    return (
      <div className={`${styles.panel} ${styles.empty}`}>
        <span>— لا يوجد بوكيمون —</span>
      </div>
    );
  }

  const queued  = pendingMoves[fieldPos] !== null;
  const colors  = ['#4FC3F7','#FF6B35'];
  const borderColor = colors[fieldPos];

  const handleMove = (mi) => {
    if (!pTurn || queued) return;
    if (onMoveChosen) {
      onMoveChosen(fieldPos, mi);
    } else {
      setPendingMove(fieldPos, mi);
    }
  };

  return (
    <div className={`${styles.panel} ${queued ? styles.queued : ''}`}
      style={{ borderTop:`3px solid ${borderColor}` }}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.slot} style={{ background: borderColor+'22', color: borderColor }}>
          {fieldPos + 1}
        </span>
        <span className={styles.pokeName}>{member.poke.name}</span>
        {queued
          ? <span className={styles.readyBadge}>✔ جاهز</span>
          : <span className={styles.chooseTxt}>اختر هجوماً</span>
        }
      </div>

      {/* Moves grid */}
      {!queued ? (
        <div className={styles.moves}>
          {member.poke.moves.map((mv, i) => {
            const color   = TYPE_COLORS[mv.t] || '#888';
            const blocked = mv.u && member.ult < 100;
            const catIcon = mv.u ? '⚡' : (mv.p > 0 ? (mv.p > 80 ? '⚔' : '✨') : '🛡');
            return (
              <button
                key={i}
                className={`${styles.mv} ${mv.u ? styles.ultMv : ''} ${blocked ? styles.blocked : ''}`}
                style={{ '--c': color }}
                disabled={!pTurn || blocked}
                onClick={() => handleMove(i)}
              >
                {mv.u && <span className={styles.ultTag}>✦ ULT</span>}
                <div className={styles.mvTop}>
                  <span className={styles.catIcon}>{catIcon}</span>
                  <span className={styles.mvType} style={{ background: color }}>{mv.t}</span>
                </div>
                <span className={styles.mvName}>{mv.n}</span>
                <span className={styles.mvPwr}>
                  {mv.p > 0 ? `قوة: ${mv.p}` : '— داعم'}
                </span>
                {mv.u && (
                  <div className={styles.ultProg}>
                    <div style={{ width:`${member.ult}%`, height:'100%',
                      background:'linear-gradient(90deg,#7C4DFF,#E040FB)', borderRadius:3 }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.queuedView}>
          <div className={styles.queuedInfo}>
            <span className={styles.queuedIcon}>⚔</span>
            <span className={styles.queuedName}>{member.poke.moves[pendingMoves[fieldPos]]?.n}</span>
          </div>
          <button className={styles.cancelBtn}
            onClick={() => setPendingMove(fieldPos, null)}>
            ✕ تغيير
          </button>
        </div>
      )}
    </div>
  );
}
