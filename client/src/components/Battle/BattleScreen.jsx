// ══════════════════════════════════════════
// BattleScreen — Full 2v2 + Tower UI
// All buttons always visible and functional
// ══════════════════════════════════════════
import { useCallback, useState, useEffect, useRef } from 'react';
import { useBattleStore, subscribeBattleAnim } from '../../store/battleStore.js';
import { useBattleEngine }  from '../../hooks/useBattleEngine.js';
import { usePvPEngine }     from '../../hooks/usePvPEngine.js';
import { MOVE_EFFECTS }     from '../../data/moveEffects.js';
import { DamageEngine }     from '../../engine/DamageEngine.js';
import { FighterCard, AttackBadgesOverlay } from './FighterCard.jsx';
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

// ── Auto-target: move needs picker only when 2 live enemies
function moveNeedsTarget(mv, aliveCount) {
  if (!mv) return false;
  const eff = MOVE_EFFECTS[mv.n];
  if (eff && (eff.target === 'self' || eff.weather)) return false;
  return aliveCount > 1;
}

function getAliveEnemyFieldPositions(eField, enTeam) {
  return eField
    .map((teamIdx, fieldPos) => ({ teamIdx, fieldPos }))
    .filter(({ teamIdx }) => teamIdx !== null && teamIdx !== undefined && !enTeam[teamIdx]?.fainted)
    .map(({ fieldPos }) => fieldPos);
}

/**
 * Compute attack indicators for enemy cards.
 * Returns a map: enemyFieldPos → [{ slotLabel, slotColor, moveName, moveType, mult }]
 * Used to show player-selected moves on the enemy's card before execution.
 */
const SLOT_COLORS = ['#4FC3F7', '#FF6B35'];

/**
 * Compute attack indicators for all enemy field positions.
 *
 * For each enemy slot returns an array of attacker descriptors IF that slot
 * is being targeted, OR a single "not targeted" entry if a player is attacking
 * the OTHER slot — so the player can see at a glance what hits what.
 *
 * Each descriptor: { slotLabel, slotColor, moveName, moveType, mult, targeted }
 *   targeted = false  →  grayed-out "not aimed here" indicator
 */
function computeAttackIndicators(myTeam, enTeam, pField, eField, pendingMoves, pendingTargets) {
  // Collect what each player slot is doing
  const playerActions = []; // { fi, mv, tPos, mult }

  for (let fi = 0; fi < 2; fi++) {
    const mi = pendingMoves[fi];
    if (mi === null || mi === undefined) continue;
    const myIdx = pField[fi];
    if (myIdx === null) continue;
    const member = myTeam[myIdx];
    if (!member || member.fainted) continue;
    const mv = member.poke?.moves?.[mi];
    if (!mv || mv.p === 0) continue; // status moves skipped

    const tPos   = pendingTargets[fi] ?? 0;
    const enIdx  = eField[tPos];
    if (enIdx === null || enIdx === undefined) continue;
    const defMember = enTeam[enIdx];
    if (!defMember || defMember.fainted) continue;

    playerActions.push({
      fi,
      mv,
      tPos,
      mult: DamageEngine.effectiveness(mv.t, defMember.poke?.types ?? []),
    });
  }

  // Build map keyed by enemy field position
  const map = {};
  const aliveEnemySlots = eField
    .map((idx, pos) => ({ idx, pos }))
    .filter(({ idx }) => idx !== null && idx !== undefined && !enTeam[idx]?.fainted)
    .map(({ pos }) => pos);

  playerActions.forEach(({ fi, mv, tPos, mult }) => {
    // For the TARGETED enemy slot
    if (!map[tPos]) map[tPos] = [];
    map[tPos].push({
      slotLabel:  `P${fi + 1}`,
      slotColor:  SLOT_COLORS[fi],
      moveName:   mv.n,
      moveType:   mv.t,
      mult,
      targeted:   true,
    });

    // For the OTHER alive enemy slot (if any) — show "not targeting here" hint
    aliveEnemySlots.forEach(otherPos => {
      if (otherPos === tPos) return;
      // Compute effectiveness against the OTHER enemy too (for info)
      const otherEnIdx = eField[otherPos];
      const otherMember = enTeam[otherEnIdx];
      const otherMult = otherMember
        ? DamageEngine.effectiveness(mv.t, otherMember.poke?.types ?? [])
        : 1;
      if (!map[otherPos]) map[otherPos] = [];
      map[otherPos].push({
        slotLabel:  `P${fi + 1}`,
        slotColor:  SLOT_COLORS[fi],
        moveName:   mv.n,
        moveType:   mv.t,
        mult:       otherMult,
        targeted:   false, // not aimed here
      });
    });
  });

  return map;
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
  const pendingMoves   = useBattleStore(s => s.pendingMoves);
  const pendingSwaps   = useBattleStore(s => s.pendingSwaps);
  const pendingTargets = useBattleStore(s => s.pendingTargets);
  const weather        = useBattleStore(s => s.weather);
  const resetGame          = useBattleStore(s => s.resetGame);
  const gameMode           = useBattleStore(s => s.gameMode);
  const pvpOpponentName    = useBattleStore(s => s.pvpOpponentName);
  const pvpWaiting         = useBattleStore(s => s.pvpWaitingForOpponent);
  const isPvP              = gameMode === 'pvp';

  const battleEngine = useBattleEngine();
  const { executeDualTurn, executeTowerTurn, executeTowerSwap } = battleEngine;
  const { submitPvPTurn, endPvPBattle } = usePvPEngine(battleEngine);

  const [swapFor, setSwapFor]         = useState(null);
  const [targetFor, setTargetFor]     = useState(null);
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  const [arenaFlash, setArenaFlash] = useState(null);
  const [timer, setTimer]             = useState(30);
  const timerRef = useRef(null);

  // ── Arena flash on hit ──────────────────────────────────────────────────────
  useEffect(() => {
    return subscribeBattleAnim(({ type, isEnemy }) => {
      const color = isEnemy
        ? 'rgba(255,107,53,.6)' // enemy attack: orange
        : 'rgba(79,195,247,.6)'; // player attack: blue
      setArenaFlash({ color, key: Date.now() });
      setTimeout(() => setArenaFlash(null), 520);
    });
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!active || !pTurn) { setTimer(30); return; }
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          const st = useBattleStore.getState();
          if (st.towerActive) {
            const m = st.myTeam[st.pField[0] ?? 0];
            if (m?.poke?.moves?.length) executeTowerTurn(0);
          } else {
            [0, 1].forEach(fi => {
              const idx = st.pField[fi];
              if (idx === null) return;
              const mem = st.myTeam[idx];
              if (!mem || mem.fainted) return;
              if (st.pendingMoves[fi] === null && st.pendingSwaps[fi] === null) {
                const alive = getAliveEnemyFieldPositions(st.eField, st.enTeam);
                st.setPendingMove(fi, 0);
                st.setPendingTarget(fi, alive[0] ?? 0);
              }
            });
            executeDualTurn();
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [pTurn, active]);

  // ── Bench members ──────────────────────────────────────────────────────────
  const fieldSet     = new Set(pField.filter(i => i !== null));
  const swapsSet     = new Set(pendingSwaps.filter(s => s !== null));
  const benchMembers = myTeam
    .map((m, i) => ({ ...m, teamIdx: i }))
    .filter(m => !m.fainted && !fieldSet.has(m.teamIdx) && !swapsSet.has(m.teamIdx));

  // ── Attack indicators: compute what each player slot is targeting ──────────
  const atkIndicators = computeAttackIndicators(
    myTeam, enTeam, pField, eField,
    pendingMoves, pendingTargets
  );

  // ── 2v2 readiness ──────────────────────────────────────────────────────────
  const slotReady = (fi) => {
    const idx = pField[fi];
    if (idx === null) return true;
    if (!myTeam[idx] || myTeam[idx].fainted) return true;
    return pendingMoves[fi] !== null || pendingSwaps[fi] !== null;
  };
  const allReady = !towerActive && pTurn && active
    && slotReady(0) && slotReady(1)
    && (pendingMoves.some(m => m !== null) || pendingSwaps.some(s => s !== null));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMoveChosen = useCallback((fieldPos, moveIdx) => {
    const st = useBattleStore.getState();
    const mem = st.myTeam[st.pField[fieldPos]];
    const mv  = mem?.poke?.moves?.[moveIdx];
    const alivePos = getAliveEnemyFieldPositions(st.eField, st.enTeam);
    if (moveNeedsTarget(mv, alivePos.length)) {
      setTargetFor({ fieldPos, moveIdx });
    } else {
      st.setPendingMove(fieldPos, moveIdx);
      st.setPendingTarget(fieldPos, alivePos[0] ?? 0);
      st.setPendingSwap(fieldPos, null);
    }
  }, []);

  const handleTargetChosen = useCallback((enemyFieldPos) => {
    if (!targetFor) return;
    const st = useBattleStore.getState();
    st.setPendingMove(targetFor.fieldPos, targetFor.moveIdx);
    st.setPendingTarget(targetFor.fieldPos, enemyFieldPos);
    st.setPendingSwap(targetFor.fieldPos, null);
    setTargetFor(null);
  }, [targetFor]);

  const handleSwapCommit = useCallback((fieldPos, benchIdx) => {
    const st = useBattleStore.getState();
    st.setPendingMove(fieldPos, null);
    st.setPendingTarget(fieldPos, null);
    st.setPendingSwap(fieldPos, benchIdx);
    setSwapFor(null);
  }, []);

  const handleTowerSwapCommit = useCallback((benchIdx) => {
    setSwapFor(null);
    executeTowerSwap(benchIdx);
  }, [executeTowerSwap]);

  const handleCancelSlot = useCallback((fi) => {
    useBattleStore.getState().clearPendingSlot(fi);
  }, []);

  const activeMember = towerActive ? myTeam[pField[0] ?? 0] : null;
  const timerPct     = (timer / 30) * 100;
  const timerColor   = timer > 15 ? '#66BB6A' : timer > 7 ? '#FFD600' : '#EF5350';
  const timerUrgent  = timer <= 7;

  let turnText = pTurn ? '⚔ دورك — اختر حركاتك!' : '⌛ دور العدو...';
  if (targetFor) turnText = `🎯 اختر هدفاً`;
  else if (swapFor !== null) turnText = `🔄 اختر البديل`;
  else if (allReady) turnText = '✅ جاهز! اضغط تنفيذ الدور';

  return (
    <div className={styles.screen}>

      {/* ── TOWER BAR ── */}
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

      {/* ── TIMER ── */}
      {pTurn && active && (
        <div className={`${styles.timerWrap} ${timerUrgent ? styles.timerUrgent : ''}`}>
          <span className={styles.timerLabel}>⏱</span>
          <div className={styles.timerTrack}>
            <div className={styles.timerFill}
              style={{ width: timerPct + '%', background: timerColor }} />
          </div>
          <span className={styles.timerNum} style={{ color: timerColor }}>{timer}</span>
        </div>
      )}

      {/* ── WEATHER ── */}
      <WeatherBar />

      {/* ── ARENA ── */}
      <div className={styles.arena}>
        <div className={styles.arenaGlow} />
        {arenaFlash && (
          <div key={arenaFlash.key} className={styles.arenaFlash}
            style={{ background: arenaFlash.color }} />
        )}
        <div className={styles.fighters}>

          {/* Player side */}
          <div className={styles.side}>
            <div className={styles.sideLabel}>🎮 فريقك</div>
            <FighterCard
              member={pField[0] !== null ? myTeam[pField[0]] : null}
              isPlayer fieldPos={0}
              isActive={pTurn && !towerActive}
              pendingSwap={pendingSwaps[0] !== null ? myTeam[pendingSwaps[0]]?.poke?.name : null}
              onSwap={pTurn && active && !towerActive ? () => setSwapFor(0) : null}
              onCancelSwap={pendingSwaps[0] !== null ? () => handleCancelSlot(0) : null}
            />
            {!towerActive && (
              <FighterCard
                member={pField[1] !== null ? myTeam[pField[1]] : null}
                isPlayer fieldPos={1}
                isActive={pTurn}
                pendingSwap={pendingSwaps[1] !== null ? myTeam[pendingSwaps[1]]?.poke?.name : null}
                onSwap={pTurn && active ? () => setSwapFor(1) : null}
                onCancelSwap={pendingSwaps[1] !== null ? () => handleCancelSlot(1) : null}
              />
            )}
          </div>

          <div className={styles.vs}>VS</div>

          {/* Enemy side */}
          <div className={styles.side}>
            <div className={`${styles.sideLabel} ${styles.enemyLabel}`}>👾 العدو</div>
            {targetFor && <div className={styles.targetHint}>🎯 اختر الهدف</div>}
            <div className={styles.cardWrapper}>
              <AttackBadgesOverlay attackers={atkIndicators[0] ?? null} />
              <FighterCard
                member={eField[0] !== null ? enTeam[eField[0]] : null}
                isPlayer={false} fieldPos={0}
                isTarget={!!targetFor && eField[0] !== null && !enTeam[eField[0]]?.fainted}
                onTarget={targetFor ? () => handleTargetChosen(0) : null}
              />
            </div>
            {!towerActive && (
              <div className={styles.cardWrapper}>
                <AttackBadgesOverlay attackers={atkIndicators[1] ?? null} />
                <FighterCard
                  member={eField[1] !== null ? enTeam[eField[1]] : null}
                  isPlayer={false} fieldPos={1}
                  isTarget={!!targetFor && eField[1] !== null && !enTeam[eField[1]]?.fainted}
                  onTarget={targetFor ? () => handleTargetChosen(1) : null}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PvP status bar ── */}
      {isPvP && (
        <div className={styles.pvpBar}>
          <span className={styles.pvpIcon}>🌐</span>
          <span className={styles.pvpOpponent}>
            {pvpWaiting ? '⌛ في انتظار حركة الخصم...' : `⚔ ${pvpOpponentName || 'خصمك'}`}
          </span>
        </div>
      )}

      {/* ── TURN STATUS BAR ── */}
      <div className={`${styles.turnBar} ${pTurn ? styles.playerTurn : styles.enemyTurn}`}>
        <span className={styles.turnDot} />
        <span className={styles.turnText}>{turnText}</span>
        <span className={styles.turnDot} />
      </div>

      {/* ── SWAP PANEL ── */}
      {swapFor !== null && (
        <div className={styles.swapPanel}>
          <div className={styles.swapHeader}>
            <span>🔄 اختر البوكيمون البديل للموضع {swapFor + 1}</span>
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
            onSelect={(mi) => { if (pTurn && active) executeTowerTurn(mi); }}
            disabled={!pTurn || !active}
          />
          {benchMembers.length > 0 && pTurn && active && (
            <button className={styles.towerSwapBtn} onClick={() => setSwapFor(0)}>
              <span>🔄 تبديل البوكيمون</span>
              <span className={styles.benchCount}>{benchMembers.length} متاح</span>
            </button>
          )}
        </div>
      )}

      {/* ── 2v2: dual panels + end-turn ── */}
      {!towerActive && !swapFor && !targetFor && (
        <div className={styles.dualSection}>
          <div className={styles.dualPanels}>
            <DualMovePanel fieldPos={0} onMoveChosen={handleMoveChosen}
              onSwapRequest={pTurn && active ? () => setSwapFor(0) : null} />
            <DualMovePanel fieldPos={1} onMoveChosen={handleMoveChosen}
              onSwapRequest={pTurn && active ? () => setSwapFor(1) : null} />
          </div>

          <button
            className={`${styles.endTurnBtn}${allReady ? ' ' + styles.endReady : ''}${!pTurn ? ' ' + styles.endEnemyTurn : ''}`}
            disabled={!allReady}
            onClick={allReady ? (isPvP ? submitPvPTurn : executeDualTurn) : undefined}
          >
            {!pTurn ? '⌛ دور العدو...' : allReady ? '⚔ تنفيذ الدور!' : '⚔ اختر حركاتك أولاً'}
          </button>
        </div>
      )}

      {/* ── BOTTOM ROW: log + retreat ── */}
      <div className={styles.bottomRow}>
        <BattleLog />
        <button className={styles.retreatBtn} onClick={() => setConfirmRetreat(true)} title="انسحاب من المعركة">
          <span className={styles.retreatIcon}>🏳</span>
          <span className={styles.retreatTxt}>انسحاب</span>
        </button>
      </div>

      {/* ── RETREAT CONFIRM DIALOG ── */}
      {confirmRetreat && (
        <div className={styles.retreatOverlay}>
          <div className={styles.retreatDialog}>
            <div className={styles.retreatDialogIcon}>🏳</div>
            <div className={styles.retreatDialogTitle}>الانسحاب من المعركة؟</div>
            <div className={styles.retreatDialogSub}>سيتم إنهاء المعركة الحالية وخسارة الجولة</div>
            <div className={styles.retreatDialogBtns}>
              <button className={styles.retreatConfirmBtn} onClick={() => { setConfirmRetreat(false); resetGame(); }}>
                🏳 نعم، انسحاب
              </button>
              <button className={styles.retreatCancelBtn} onClick={() => setConfirmRetreat(false)}>
                ⚔ متابعة المعركة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Bench card ──────────────────────────────────────────────────────────────
function BenchCard({ member, onClick }) {
  const imgRef = useRef(null);
  useEffect(() => {
    if (imgRef.current && member?.poke)
      loadSpriteWithFallback(imgRef.current, member.poke.id, member.poke.name);
  }, [member?.poke?.id]);

  const hpPct = member.poke ? Math.round(member.hp / member.poke.hp * 100) : 0;
  const hpClr = hpPct > 50 ? '#66BB6A' : hpPct > 25 ? '#FFD600' : '#EF5350';

  return (
    <button className={styles.benchCard} onClick={onClick}>
      <img ref={imgRef} alt={member.poke?.name} className={styles.benchImg} />
      <span className={styles.benchName}>{member.poke?.name}</span>
      <div className={styles.benchHpBar}>
        <div style={{ width: hpPct + '%', background: hpClr, height: '100%', borderRadius: 3 }} />
      </div>
      <span className={styles.benchHpTxt}>{member.hp}/{member.poke?.hp}</span>
      {member.ult >= 100 && <span className={styles.benchUlt}>✦ ULT</span>}
    </button>
  );
}