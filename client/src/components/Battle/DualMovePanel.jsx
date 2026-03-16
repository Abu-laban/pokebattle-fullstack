// DualMovePanel — 2v2 move selection per pokemon slot
// Swap is handled by parent via onSwapRequest
import { useBattleStore }  from '../../store/battleStore.js';
import { MOVE_EFFECTS }    from '../../data/moveEffects.js';
import { MOVE_SECONDARY }  from '../../data/moveSecondary.js';
import { SPECIAL_TYPES }   from '../../data/moves.js';
import styles              from './DualMovePanel.module.css';

const STATUS_META = {
  BRN: { label: '🔥 حرق',    bg: '#FF6B35' },
  PSN: { label: '☠ سُم',     bg: '#AB47BC' },
  PAR: { label: '⚡ شلل',    bg: '#FFD600' },
  FRZ: { label: '❄ تجميد',  bg: '#80DEEA' },
  SLP: { label: '😴 نوم',    bg: '#90A4AE' },
  CNF: { label: '😵 ارتباك', bg: '#EC407A' },
};

const WEATHER_LABELS = {
  SUN: '☀️ شمس', RAIN: '🌧 مطر', SAND: '🌪 رمال', HAIL: '❄ برد',
};

const TYPE_COLORS = {
  FIRE:'#FF6B35',WATER:'#4FC3F7',GRASS:'#66BB6A',ELECTRIC:'#FFD600',
  PSYCHIC:'#EC407A',ICE:'#80DEEA',DRAGON:'#5C6BC0',DARK:'#546E7A',
  GHOST:'#7E57C2',ROCK:'#8D6E63',GROUND:'#BCAAA4',STEEL:'#90A4AE',
  FIGHTING:'#EF5350',POISON:'#AB47BC',BUG:'#8BC34A',FLYING:'#29B6F6',
  FAIRY:'#F48FB1',NORMAL:'#BDBDBD',
};

function getMoveCategory(mv) {
  const eff = MOVE_EFFECTS[mv.n];
  if (eff?.weather)               return { icon: '🌤', label: 'طقس: ' + (WEATHER_LABELS[eff.weather] || eff.weather), cat: 'weather' };
  if (eff?.target === 'self')     return { icon: '🛡', label: 'داعم', cat: 'buff' };
  if (eff?.target === 'foe' && !mv.p) return { icon: '⚡', label: 'حالة', cat: 'status' };
  if (mv.p === 0)                 return { icon: '✨', label: 'داعم', cat: 'buff' };
  const isSpecial = SPECIAL_TYPES.has(mv.t);
  if (mv.p > 100) return { icon: isSpecial ? '💥✨' : '💥⚔', label: isSpecial ? 'خاص قوي' : 'جسدي قوي', cat: isSpecial ? 'special' : 'physical' };
  return isSpecial
    ? { icon: '✨', label: 'خاص', cat: 'special' }
    : { icon: '⚔', label: 'جسدي', cat: 'physical' };
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
              const sec     = MOVE_SECONDARY[mv.n];
              const statusMeta = sec ? STATUS_META[sec.status] : null;
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
                  <div className={styles.mvBottom}>
                    <span className={styles.mvPwr}>
                      {mv.p > 0 ? `قوة ${mv.p}` : cat.label}
                    </span>
                    {statusMeta && (
                      <span
                        className={styles.mvEffect}
                        style={{ background: statusMeta.bg + '30', color: statusMeta.bg, border: `1px solid ${statusMeta.bg}55` }}
                        title={`${Math.round(sec.chance * 100)}% احتمال`}
                      >
                        {statusMeta.label} {Math.round(sec.chance * 100)}%
                      </span>
                    )}
                  </div>
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