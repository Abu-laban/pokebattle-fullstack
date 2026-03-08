// DualMovePanel — 2v2 move selection per pokemon slot
// Swap is handled by parent via onSwapRequest
import { useBattleStore }  from '../../store/battleStore.js';
import { MOVE_EFFECTS }    from '../../data/moveEffects.js';
import styles              from './DualMovePanel.module.css';

const TYPE_COLORS = {
  FIRE:'#FF6B35',WATER:'#4FC3F7',GRASS:'#66BB6A',ELECTRIC:'#FFD600',
  PSYCHIC:'#EC407A',ICE:'#80DEEA',DRAGON:'#5C6BC0',DARK:'#546E7A',
  GHOST:'#7E57C2',ROCK:'#8D6E63',GROUND:'#BCAAA4',STEEL:'#90A4AE',
  FIGHTING:'#EF5350',POISON:'#AB47BC',BUG:'#8BC34A',FLYING:'#29B6F6',
  FAIRY:'#F48FB1',NORMAL:'#BDBDBD',
};

function getMoveCategory(mv) {
  const eff = MOVE_EFFECTS[mv.n];
  if (eff?.weather) return { icon: '🌤', label: 'طقس' };
  if (eff?.target === 'self') return { icon: '🛡', label: 'داعم' };
  if (eff?.target === 'foe' && !mv.p) return { icon: '⚡', label: 'حالة' };
  if (mv.p === 0) return { icon: '✨', label: 'داعم' };
  if (mv.p > 100) return { icon: '💥', label: 'قوة عالية' };
  return { icon: '⚔', label: 'هجوم' };
}

export function DualMovePanel({ fieldPos, onMoveChosen, onSwapRequest }) {
  const myTeam       = useBattleStore(s => s.myTeam);
  const pField       = useBattleStore(s => s.pField);
  const pendingMoves = useBattleStore(s => s.pendingMoves);
  const pendingSwaps = useBattleStore(s => s.pendingSwaps);
  const pTurn        = useBattleStore(s => s.pTurn);
  const setPendingMove = useBattleStore(s => s.setPendingMove);

  const idx    = pField[fieldPos];
  const member = idx !== null ? myTeam[idx] : null;

  if (!member || member.fainted) {
    return (
      <div className={`${styles.panel} ${styles.empty}`}>
        <span>—</span>
      </div>
    );
  }

  const hasPendingMove = pendingMoves[fieldPos] !== null;
  const hasPendingSwap = pendingSwaps[fieldPos] !== null;
  const isCommitted    = hasPendingMove || hasPendingSwap;
  const borderColors   = ['#4FC3F7', '#FF6B35'];

  const handleMove = (mi) => {
    if (!pTurn || hasPendingMove) return;
    onMoveChosen?.(fieldPos, mi);
  };

  return (
    <div className={`${styles.panel} ${isCommitted ? styles.committed : ''}`}
      style={{ borderTop: `3px solid ${borderColors[fieldPos]}` }}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.slot} style={{ background: borderColors[fieldPos] + '22', color: borderColors[fieldPos] }}>
          {fieldPos + 1}
        </span>
        <span className={styles.pokeName}>{member.poke.name}</span>
        {hasPendingMove && <span className={styles.readyBadge}>✔ هجوم</span>}
        {hasPendingSwap && <span className={styles.swapBadge}>🔄 تبديل</span>}
        {!isCommitted && <span className={styles.chooseTxt}>اختر</span>}
      </div>

      {/* Committed: show what's chosen */}
      {isCommitted ? (
        <div className={styles.committed_view}>
          {hasPendingMove && (
            <div className={styles.committedInfo}>
              <span className={styles.committedIcon}>⚔</span>
              <span className={styles.committedName}>
                {member.poke.moves[pendingMoves[fieldPos]]?.n}
              </span>
              <button className={styles.cancelBtn}
                onClick={() => setPendingMove(fieldPos, null)}>✕</button>
            </div>
          )}
          {hasPendingSwap && (
            <div className={styles.committedInfo}>
              <span className={styles.committedIcon}>🔄</span>
              <span className={styles.committedName}>
                {myTeam[pendingSwaps[fieldPos]]?.poke?.name}
              </span>
              <button className={styles.cancelBtn}
                onClick={() => useBattleStore.getState().clearPendingSlot(fieldPos)}>✕</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Move grid */}
          <div className={styles.moves}>
            {member.poke.moves.map((mv, i) => {
              const color   = TYPE_COLORS[mv.t] || '#888';
              const blocked = mv.u && member.ult < 100;
              const cat     = getMoveCategory(mv);
              return (
                <button key={i}
                  className={`${styles.mv} ${mv.u ? styles.ultMv : ''} ${blocked ? styles.blocked : ''}`}
                  style={{ '--c': color }}
                  disabled={!pTurn || blocked}
                  onClick={() => handleMove(i)}
                >
                  {mv.u && <span className={styles.ultTag}>✦ ULT</span>}
                  <div className={styles.mvTop}>
                    <span className={styles.mvCatIcon}>{cat.icon}</span>
                    <span className={styles.mvType} style={{ background: color }}>{mv.t}</span>
                  </div>
                  <span className={styles.mvName}>{mv.n}</span>
                  <span className={styles.mvPwr}>
                    {mv.p > 0 ? `قوة ${mv.p}` : cat.label}
                  </span>
                  {mv.u && (
                    <div className={styles.ultProg}>
                      <div style={{ width: member.ult + '%', height: '100%',
                        background:'linear-gradient(90deg,#7C4DFF,#E040FB)', borderRadius:3 }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Swap button inside panel */}
          {onSwapRequest && (
            <button className={styles.swapInPanel} onClick={onSwapRequest}>
              🔄 تبديل البوكيمون
            </button>
          )}
        </>
      )}
    </div>
  );
}
