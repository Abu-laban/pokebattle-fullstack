// ══════════════════════════════════════════
// BattleScreen — Complete battle UI
// Features: swap panel, target select, weather above arena
// ══════════════════════════════════════════
import { useCallback, useState } from 'react';
import { useBattleStore }   from '../../store/battleStore.js';
import { useBattleEngine }  from '../../hooks/useBattleEngine.js';
import { FighterCard }      from './FighterCard.jsx';
import { WeatherBar }       from './WeatherBar.jsx';
import { BattleLog }        from './BattleLog.jsx';
import { MoveGrid }         from './MoveGrid.jsx';
import { DualMovePanel }    from './DualMovePanel.jsx';
import { ResultOverlay }    from '../Overlays/ResultOverlay.jsx';
import { loadSpriteWithFallback } from '../../engine/sprites.js';
import { useRef, useEffect } from 'react';
import styles from './BattleScreen.module.css';

export function BattleScreen() {
  const screen = useBattleStore(s => s.screen);
  if (screen !== 'battle') return null;
  return (<><BattleMain /><ResultOverlay /></>);
}

function BattleMain() {
  const myTeam      = useBattleStore(s => s.myTeam);
  const enTeam      = useBattleStore(s => s.enTeam);
  const pField      = useBattleStore(s => s.pField);
  const eField      = useBattleStore(s => s.eField);
  const pTurn       = useBattleStore(s => s.pTurn);
  const active      = useBattleStore(s => s.active);
  const towerActive = useBattleStore(s => s.towerActive);
  const towerStreak = useBattleStore(s => s.towerStreak);
  const pendingMoves = useBattleStore(s => s.pendingMoves);
  const resetGame   = useBattleStore(s => s.resetGame);
  const setMyTeam   = useBattleStore(s => s.setMyTeam);
  const setPField   = useBattleStore(s => s.setPField);

  const { executeDualTurn, executeTowerTurn } = useBattleEngine();
  const [swapFor, setSwapFor]       = useState(null); // fieldPos being swapped
  const [targetFor, setTargetFor]   = useState(null); // {fieldPos, moveIdx}

  // Bench: alive team members NOT on field
  const fieldSet    = new Set(pField.filter(i => i !== null));
  const benchMembers = myTeam
    .map((m, i) => ({ ...m, teamIdx: i }))
    .filter(m => !m.fainted && !fieldSet.has(m.teamIdx));

  // 2v2: both slots chose a move
  const allReady = !towerActive && (
    (pField[0] === null || myTeam[pField[0]]?.fainted || pendingMoves[0] !== null) &&
    (pField[1] === null || myTeam[pField[1]]?.fainted || pendingMoves[1] !== null) &&
    pendingMoves.some(m => m !== null)
  );

  // ── Swap handler ─────────────────────────────────────────────────────────
  const doSwap = useCallback((fieldPos, benchTeamIdx) => {
    const newField = [...pField];
    newField[fieldPos] = benchTeamIdx;
    setPField(newField);
    setSwapFor(null);
  }, [pField, setPField]);

  // ── Tower move (with target auto = 0) ─────────────────────────────────────
  const handleTowerMove = useCallback((moveIdx) => {
    if (!pTurn || !active) return;
    executeTowerTurn(moveIdx);
  }, [pTurn, active, executeTowerTurn]);

  // ── 2v2 target selection ──────────────────────────────────────────────────
  const handleMoveChosen = useCallback((fieldPos, moveIdx) => {
    // Check if there are 2 live enemies
    const aliveEnemies = eField.filter(i => i !== null && !enTeam[i]?.fainted);
    if (aliveEnemies.length > 1) {
      setTargetFor({ fieldPos, moveIdx });
    } else {
      // Auto-target the only alive enemy
      const targetIdx = aliveEnemies[0] ?? 0;
      useBattleStore.getState().setPendingMove(fieldPos, moveIdx);
      useBattleStore.getState().setPendingTarget(fieldPos, targetIdx);
    }
  }, [eField, enTeam]);

  const handleTargetChosen = useCallback((enemyFieldPos) => {
    if (!targetFor) return;
    useBattleStore.getState().setPendingMove(targetFor.fieldPos, targetFor.moveIdx);
    useBattleStore.getState().setPendingTarget(targetFor.fieldPos, enemyFieldPos);
    setTargetFor(null);
  }, [targetFor]);

  const activeMember = towerActive ? myTeam[pField[0] ?? 0] : null;

  return (
    <div className={styles.screen}>
      {/* Tower streak */}
      {towerActive && (
        <div className={styles.towerBar}>
          <span>🏰 برج المعارك</span>
          <div className={styles.towerTeamDots}>
            {myTeam.filter(m => m.poke).map((m, i) => (
              <span key={i} className={`${styles.teamDot} ${m.fainted ? styles.dotFainted : styles.dotAlive}`} title={m.poke?.name} />
            ))}
          </div>
          <span className={styles.streak}>سلسلة: <strong>{towerStreak}</strong></span>
        </div>
      )}

      {/* ─ Weather ABOVE arena ─ */}
      <WeatherBar position="top" />

      {/* Arena */}
      <div className={`${styles.arena} arena`}>
        <div className={styles.arenaGlow} />
        <div className={styles.fighters}>
          {/* Player side */}
          <div className={styles.side}>
            <div className={styles.sideLabel}>🎮 فريقك</div>
            <FighterCard
              member={pField[0] !== null ? myTeam[pField[0]] : null}
              isPlayer fieldPos={0}
              isActive={pTurn}
              onSwap={!towerActive && pTurn && active ? () => setSwapFor(0) : null}
            />
            {!towerActive && (
              <FighterCard
                member={pField[1] !== null ? myTeam[pField[1]] : null}
                isPlayer fieldPos={1}
                isActive={pTurn}
                onSwap={pTurn && active ? () => setSwapFor(1) : null}
              />
            )}
          </div>

          <div className={styles.vs}>VS</div>

          {/* Enemy side */}
          <div className={styles.side}>
            <div className={`${styles.sideLabel} ${styles.enemyLabel}`}>💀 العدو</div>
            {/* Target selection overlay */}
            {targetFor && (
              <div className={styles.targetHint}>⬇ اختر هدفك</div>
            )}
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
        {pTurn
          ? targetFor ? `🎯 اختر الهدف لـ ${myTeam[pField[targetFor.fieldPos]]?.poke?.name}`
          : '🗡️ دورك للهجوم!'
          : '💀 دور العدو...'
        }
        <span className={styles.dot} />
      </div>

      {/* ── SWAP PANEL ── */}
      {swapFor !== null && (
        <div className={styles.swapPanel}>
          <div className={styles.swapHeader}>
            🔄 اختر البديل لـ {myTeam[pField[swapFor]]?.poke?.name}
            <button className={styles.swapClose} onClick={() => setSwapFor(null)}>✕</button>
          </div>
          <div className={styles.benchRow}>
            {benchMembers.length === 0
              ? <span className={styles.noBench}>لا يوجد بوكيمون احتياطي</span>
              : benchMembers.map(m => (
                <BenchCard key={m.teamIdx} member={m}
                  onClick={() => doSwap(swapFor, m.teamIdx)} />
              ))
            }
          </div>
        </div>
      )}

      {/* ── TOWER: move grid ── */}
      {towerActive && activeMember && !swapFor && (
        <div className={styles.towerMoves}>
          <div className={styles.movesHead}>⚔ اختر هجومك</div>
          <MoveGrid
            moves={activeMember.poke.moves}
            ult={activeMember.ult}
            onSelect={handleTowerMove}
            disabled={!pTurn || !active}
          />
          {/* Tower bench swap */}
          {benchMembers.length > 0 && pTurn && active && (
            <button className={styles.towerSwapBtn}
              onClick={() => setSwapFor(0)}>
              🔄 تبديل البوكيمون ({benchMembers.length} متاح)
            </button>
          )}
        </div>
      )}

      {/* ── 2v2: dual panels + commit ── */}
      {!towerActive && !swapFor && !targetFor && (
        <>
          <div className={styles.dualPanels}>
            <DualMovePanel fieldPos={0} onMoveChosen={handleMoveChosen} />
            <DualMovePanel fieldPos={1} onMoveChosen={handleMoveChosen} />
          </div>
          <button
            className={`${styles.endTurnBtn} ${allReady ? styles.ready : ''}`}
            disabled={!allReady || !pTurn || !active}
            onClick={executeDualTurn}
          >⚔ انهاء الدور</button>
        </>
      )}

      <button className={styles.retreatBtn} disabled={!active} onClick={resetGame}>
        🏳️ انسحاب
      </button>

      <BattleLog />
    </div>
  );
}

// ── Bench mini-card ───────────────────────────────────────────────────────────
function BenchCard({ member, onClick }) {
  const imgRef = useRef(null);
  useEffect(() => {
    if (imgRef.current && member?.poke) {
      loadSpriteWithFallback(imgRef.current, member.poke.id, member.poke.name);
    }
  }, [member?.poke?.id]);

  const hpPct = member.poke ? Math.round(member.hp / member.poke.hp * 100) : 0;
  const hpColor = hpPct > 50 ? '#66BB6A' : hpPct > 25 ? '#FFD600' : '#EF5350';

  return (
    <button className={styles.benchCard} onClick={onClick}>
      <img ref={imgRef} alt={member.poke?.name}
        style={{ width:48, height:48, objectFit:'contain', imageRendering:'pixelated' }} />
      <span className={styles.benchName}>{member.poke?.name}</span>
      <div className={styles.benchHpBar}>
        <div style={{ width:`${hpPct}%`, background: hpColor, height:'100%', borderRadius:3, transition:'width .3s' }} />
      </div>
      <span className={styles.benchHpTxt}>{member.hp}/{member.poke?.hp}</span>
      {member.ult >= 100 && <span className={styles.benchUlt}>✦ ULT</span>}
    </button>
  );
}
