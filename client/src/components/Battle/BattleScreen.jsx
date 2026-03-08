// ══════════════════════════════════════════
// BattleScreen — Complete battle UI
// Fixes: swap costs turn, smart target, timer, no class badges
// ══════════════════════════════════════════
import { useCallback, useState, useEffect, useRef } from 'react';
import { useBattleStore }   from '../../store/battleStore.js';
import { useBattleEngine }  from '../../hooks/useBattleEngine.js';
import { MOVE_EFFECTS }     from '../../data/moveEffects.js';
import { FighterCard }      from './FighterCard.jsx';
import { WeatherBar }       from './WeatherBar.jsx';
import { BattleLog }        from './BattleLog.jsx';
import { MoveGrid }         from './MoveGrid.jsx';
import { DualMovePanel }    from './DualMovePanel.jsx';
import { ResultOverlay }    from '../Overlays/ResultOverlay.jsx';
import { loadSpriteWithFallback } from '../../engine/sprites.js';
import styles from './BattleScreen.module.css';

export function BattleScreen() {
  const screen = useBattleStore(s => s.screen);
  if (screen !== 'battle') return null;
  return <><BattleMain /><ResultOverlay /></>;
}

// ── Determine if a move needs target selection ────────────────────────────────
function moveNeedsTarget(mv, aliveEnemyCount) {
  if (!mv) return false;
  // Self / weather moves: never need target picker
  const eff = MOVE_EFFECTS[mv.n];
  if (eff && (eff.target === 'self' || eff.weather)) return false;
  // Foe status moves: only need picker if 2 enemies
  if (eff && eff.target === 'foe') return aliveEnemyCount > 1;
  // Normal offensive: need picker only if 2 enemies
  return aliveEnemyCount > 1;
}

function BattleMain() {
  const myTeam       = useBattleStore(s => s.myTeam);
  const enTeam       = useBattleStore(s => s.enTeam);
  const pField       = useBattleStore(s => s.pField);
  const eField       = useBattleStore(s => s.eField);
  const pTurn        = useBattleStore(s => s.pTurn);
  const active       = useBattleStore(s => s.active);
  const towerActive  = useBattleStore(s => s.towerActive);
  const towerStreak  = useBattleStore(s => s.towerStreak);
  const pendingMoves = useBattleStore(s => s.pendingMoves);
  const pendingSwaps = useBattleStore(s => s.pendingSwaps);
  const turnTimer    = useBattleStore(s => s.turnTimer);
  const resetGame    = useBattleStore(s => s.resetGame);

  const { executeDualTurn, executeTowerTurn, executeTowerSwap } = useBattleEngine();
  const [swapFor, setSwapFor]     = useState(null);  // fieldPos | null
  const [targetFor, setTargetFor] = useState(null);  // {fieldPos, moveIdx} | null
  const timerRef = useRef(null);

  // ── Turn timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!active || !pTurn) return;

    useBattleStore.getState().setTurnTimer(30);
    timerRef.current = setInterval(() => {
      const cur = useBattleStore.getState().turnTimer;
      if (cur <= 1) {
        clearInterval(timerRef.current);
        // Time out: auto-execute with random moves
        const st = useBattleStore.getState();
        if (st.towerActive) {
          const m = st.myTeam[st.pField[0] ?? 0];
          if (m && m.poke?.moves?.length) {
            const rnd = Math.floor(Math.random() * m.poke.moves.length);
            executeTowerTurn(rnd);
          }
        } else {
          // Fill any un-chosen slots with random moves
          [0,1].forEach(fi => {
            const idx = st.pField[fi];
            if (idx === null) return;
            const mem = st.myTeam[idx];
            if (!mem || mem.fainted) return;
            if (st.pendingMoves[fi] === null && st.pendingSwaps[fi] === null) {
              const rnd = Math.floor(Math.random() * mem.poke.moves.length);
              useBattleStore.getState().setPendingMove(fi, rnd);
              useBattleStore.getState().setPendingTarget(fi, 0);
            }
          });
          executeDualTurn();
        }
      } else {
        useBattleStore.getState().setTurnTimer(cur - 1);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [pTurn, active]);

  // ── Bench: alive members NOT on field ─────────────────────────────────────
  const fieldSet     = new Set(pField.filter(i => i !== null));
  const benchMembers = myTeam
    .map((m, i) => ({ ...m, teamIdx: i }))
    .filter(m => !m.fainted && !fieldSet.has(m.teamIdx));

  // ── 2v2 ready: each slot must have EITHER a move OR a swap pending ─────────
  const slotReady = (fi) => {
    const idx = pField[fi];
    if (idx === null) return true;
    const m = myTeam[idx];
    if (!m || m.fainted) return true;
    return pendingMoves[fi] !== null || pendingSwaps[fi] !== null;
  };
  const allReady = !towerActive &&
    slotReady(0) && slotReady(1) &&
    (pendingMoves.some(m => m !== null) || pendingSwaps.some(s => s !== null));

  // ── Swap from BattleScreen (for 2v2: registers pending swap, not immediate) ─
  const handleSwapCommit = useCallback((fieldPos, benchTeamIdx) => {
    // Clear any move chosen for this slot; register swap action
    useBattleStore.getState().setPendingMove(fieldPos, null);
    useBattleStore.getState().setPendingTarget(fieldPos, null);
    useBattleStore.getState().setPendingSwap(fieldPos, benchTeamIdx);
    setSwapFor(null);
  }, []);

  // ── Tower swap ──────────────────────────────────────────────────────────────
  const handleTowerSwapCommit = useCallback((benchTeamIdx) => {
    setSwapFor(null);
    executeTowerSwap(benchTeamIdx);
  }, [executeTowerSwap]);

  // ── Tower move ──────────────────────────────────────────────────────────────
  const handleTowerMove = useCallback((moveIdx) => {
    if (!pTurn || !active) return;
    executeTowerTurn(moveIdx);
  }, [pTurn, active, executeTowerTurn]);

  // ── 2v2 move chosen: check if target needed ─────────────────────────────────
  const handleMoveChosen = useCallback((fieldPos, moveIdx) => {
    const st = useBattleStore.getState();
    const mem = st.myTeam[st.pField[fieldPos]];
    const mv  = mem?.poke?.moves?.[moveIdx];
    const aliveEnemies = eField.filter(i => i !== null && !enTeam[i]?.fainted);

    if (moveNeedsTarget(mv, aliveEnemies.length)) {
      setTargetFor({ fieldPos, moveIdx });
    } else {
      // Auto-target first alive enemy (or self doesn't matter)
      const autoTarget = aliveEnemies[0] ?? 0;
      useBattleStore.getState().setPendingMove(fieldPos, moveIdx);
      useBattleStore.getState().setPendingTarget(fieldPos, autoTarget);
      // Clear any pending swap for this slot
      useBattleStore.getState().setPendingSwap(fieldPos, null);
    }
  }, [eField, enTeam]);

  const handleTargetChosen = useCallback((enemyFieldPos) => {
    if (!targetFor) return;
    useBattleStore.getState().setPendingMove(targetFor.fieldPos, targetFor.moveIdx);
    useBattleStore.getState().setPendingTarget(targetFor.fieldPos, enemyFieldPos);
    useBattleStore.getState().setPendingSwap(targetFor.fieldPos, null);
    setTargetFor(null);
  }, [targetFor]);

  // ── Pending swap cancel (if player clicks swap again) ──────────────────────
  const handleCancelSwap = useCallback((fieldPos) => {
    useBattleStore.getState().clearPendingSlot(fieldPos);
  }, []);

  const activeMember = towerActive ? myTeam[pField[0] ?? 0] : null;
  const timerPct     = (turnTimer / 30) * 100;
  const timerColor   = turnTimer > 10 ? '#66BB6A' : turnTimer > 5 ? '#FFD600' : '#EF5350';

  return (
    <div className={styles.screen}>

      {/* Tower header */}
      {towerActive && (
        <div className={styles.towerBar}>
          <span className={styles.towerTitle}>🏰 برج المعارك</span>
          <div className={styles.towerTeamDots}>
            {myTeam.filter(m => m.poke).slice(0, 6).map((m, i) => (
              <span key={i}
                className={`${styles.teamDot} ${m.fainted ? styles.dotFainted : styles.dotAlive}`}
                title={m.poke?.name}
              />
            ))}
          </div>
          <span className={styles.streak}>سلسلة: <strong>{towerStreak}</strong></span>
        </div>
      )}

      {/* Turn timer bar */}
      {active && (
        <div className={styles.timerWrap}>
          <div className={styles.timerBar}>
            <div className={styles.timerFill}
              style={{ width: timerPct + '%', background: timerColor, transition: 'width 1s linear, background .3s' }} />
          </div>
          <span className={styles.timerNum} style={{ color: timerColor }}>{turnTimer}</span>
        </div>
      )}

      {/* Weather */}
      <WeatherBar />

      {/* Arena */}
      <div className={styles.arena}>
        <div className={styles.arenaGlow} />
        <div className={styles.fighters}>

          {/* Player side */}
          <div className={styles.side}>
            <div className={styles.sideLabel}>🎮 فريقك</div>
            <FighterCard
              member={pField[0] !== null ? myTeam[pField[0]] : null}
              isPlayer fieldPos={0} isActive={pTurn}
              pendingSwap={pendingSwaps[0] !== null ? myTeam[pendingSwaps[0]]?.poke?.name : null}
              onSwap={pTurn && active && !towerActive ? () => setSwapFor(0) : null}
              onCancelSwap={pendingSwaps[0] !== null ? () => handleCancelSwap(0) : null}
            />
            {!towerActive && (
              <FighterCard
                member={pField[1] !== null ? myTeam[pField[1]] : null}
                isPlayer fieldPos={1} isActive={pTurn}
                pendingSwap={pendingSwaps[1] !== null ? myTeam[pendingSwaps[1]]?.poke?.name : null}
                onSwap={pTurn && active ? () => setSwapFor(1) : null}
                onCancelSwap={pendingSwaps[1] !== null ? () => handleCancelSwap(1) : null}
              />
            )}
          </div>

          <div className={styles.vs}>VS</div>

          {/* Enemy side */}
          <div className={styles.side}>
            <div className={`${styles.sideLabel} ${styles.enemyLabel}`}>👾 العدو</div>
            {targetFor && <div className={styles.targetHint}>🎯 اختر الهدف</div>}
            <FighterCard
              member={eField[0] !== null ? enTeam[eField[0]] : null}
              isPlayer={false} fieldPos={0}
              isTarget={!!targetFor && eField[0] !== null && !enTeam[eField[0]]?.fainted}
              onTarget={targetFor ? () => handleTargetChosen(0) : null}
            />
            {!towerActive && (
              <FighterCard
                member={eField[1] !== null ? enTeam[eField[1]] : null}
                isPlayer={false} fieldPos={1}
                isTarget={!!targetFor && eField[1] !== null && !enTeam[eField[1]]?.fainted}
                onTarget={targetFor ? () => handleTargetChosen(1) : null}
              />
            )}
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className={`${styles.turnBar} ${pTurn ? styles.playerTurn : styles.enemyTurn}`}>
        <span className={styles.dot} />
        <span>
          {!pTurn ? '⌛ دور العدو...' :
           targetFor ? `🎯 اختر هدف ${myTeam[pField[targetFor?.fieldPos]]?.poke?.name}` :
           swapFor !== null ? `🔄 اختر بديل ${myTeam[pField[swapFor]]?.poke?.name}` :
           '⚔ دورك!'}
        </span>
        <span className={styles.dot} />
      </div>

      {/* ── SWAP PANEL ── */}
      {swapFor !== null && (
        <div className={styles.swapPanel}>
          <div className={styles.swapHeader}>
            <span>🔄 اختر البوكيمون البديل</span>
            <button className={styles.swapClose} onClick={() => setSwapFor(null)}>✕</button>
          </div>
          <div className={styles.benchRow}>
            {benchMembers.length === 0
              ? <span className={styles.noBench}>لا يوجد بوكيمون احتياطي حي</span>
              : benchMembers.map(m => (
                <BenchCard key={m.teamIdx} member={m}
                  onClick={() => towerActive
                    ? handleTowerSwapCommit(m.teamIdx)
                    : handleSwapCommit(swapFor, m.teamIdx)
                  }
                />
              ))
            }
          </div>
        </div>
      )}

      {/* ── TOWER: move grid ── */}
      {towerActive && activeMember && !swapFor && (
        <div className={styles.towerMoves}>
          <div className={styles.movesHead}>⚔ اختر حركتك</div>
          <MoveGrid
            moves={activeMember.poke.moves}
            ult={activeMember.ult}
            onSelect={handleTowerMove}
            disabled={!pTurn || !active}
          />
          {benchMembers.length > 0 && pTurn && active && (
            <button className={styles.towerSwapBtn} onClick={() => setSwapFor(0)}>
              🔄 تبديل البوكيمون
              <span className={styles.benchCount}>{benchMembers.length} متاح</span>
            </button>
          )}
        </div>
      )}

      {/* ── 2v2: dual panels ── */}
      {!towerActive && !swapFor && !targetFor && (
        <>
          <div className={styles.dualPanels}>
            <DualMovePanel fieldPos={0} onMoveChosen={handleMoveChosen} onSwapRequest={() => setSwapFor(0)} />
            <DualMovePanel fieldPos={1} onMoveChosen={handleMoveChosen} onSwapRequest={() => setSwapFor(1)} />
          </div>
          <button
            className={`${styles.endTurnBtn} ${allReady ? styles.ready : ''}`}
            disabled={!allReady || !pTurn || !active}
            onClick={executeDualTurn}
          >
            ⚔ تنفيذ الدور
          </button>
        </>
      )}

      <button className={styles.retreatBtn} onClick={resetGame} disabled={!active}>
        🏳 انسحاب
      </button>

      <BattleLog />
    </div>
  );
}

// ── Bench card ────────────────────────────────────────────────────────────────
function BenchCard({ member, onClick }) {
  const imgRef = useRef(null);
  useEffect(() => {
    if (imgRef.current && member?.poke)
      loadSpriteWithFallback(imgRef.current, member.poke.id, member.poke.name);
  }, [member?.poke?.id]);

  const hpPct  = member.poke ? Math.round(member.hp / member.poke.hp * 100) : 0;
  const hpClr  = hpPct > 50 ? '#66BB6A' : hpPct > 25 ? '#FFD600' : '#EF5350';

  return (
    <button className={styles.benchCard} onClick={onClick}>
      <img ref={imgRef} alt={member.poke?.name}
        className={styles.benchImg} />
      <span className={styles.benchName}>{member.poke?.name}</span>
      <div className={styles.benchHpBar}>
        <div style={{ width: hpPct + '%', background: hpClr, height: '100%', borderRadius: 3 }} />
      </div>
      <span className={styles.benchHpTxt}>{member.hp}/{member.poke?.hp}</span>
      {member.ult >= 100 && <span className={styles.benchUlt}>✦ ULT</span>}
    </button>
  );
}
