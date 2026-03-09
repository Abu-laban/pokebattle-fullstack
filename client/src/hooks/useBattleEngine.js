// ══════════════════════════════════════════
// useBattleEngine — Full battle logic
// ══════════════════════════════════════════
import { useCallback } from 'react';
import { useBattleStore }   from '../store/battleStore.js';
import { useProgressStore } from '../store/progressStore.js';
import { BattleMember }     from '../engine/BattleMember.js';
import { BattleField }      from '../engine/BattleField.js';
import { Weather }          from '../engine/Weather.js';
import { DamageEngine }     from '../engine/DamageEngine.js';
import { StatusEngine }     from '../engine/StatusEngine.js';
import { MOVE_SECONDARY }   from '../data/moveSecondary.js';
import { MOVE_EFFECTS }     from '../data/moveEffects.js';
import { SFX, playTypeSound } from '../engine/audio.js';

function hydrateTeam(plains) {
  return (plains || []).map(p => BattleMember.fromPlain(p));
}

function commitField(store, pField, eField, myTeam, enTeam) {
  store.setMyTeam(myTeam.map(m => m.toPlain()));
  store.setEnTeam(enTeam.map(m => m.toPlain()));
  store.setPField([...pField.toSlots()]);
  store.setEField([...eField.toSlots()]);
}

export function useBattleEngine() {
  const store    = useBattleStore();
  const progress = useProgressStore();
  const log = useCallback((text, cls) => store.addLog(text, cls), [store]);

  // ── PLAYER HIT ─────────────────────────────────────────────────────────────
  const executePlayerHit = useCallback((fieldPos, callback) => {
    const s      = useBattleStore.getState();
    const myTeam = hydrateTeam(s.myTeam);
    const enTeam = hydrateTeam(s.enTeam);
    const pField = new BattleField(myTeam, s.pField);
    const eField = new BattleField(enTeam, s.eField);
    const weather = Weather.fromPlain(s.weather);

    const attacker = pField.memberAt(fieldPos);
    if (!attacker || !attacker.isAlive) { callback?.(); return; }

    const moveIdx = s.pendingMoves[fieldPos];
    if (moveIdx === null || moveIdx === undefined) { callback?.(); return; }
    const mv = attacker.poke.moves[moveIdx];
    if (!mv) { callback?.(); return; }

    const blocked = StatusEngine.checkTurnBlock(attacker, log);
    if (blocked) { commitField(store, pField, eField, myTeam, enTeam); callback?.(); return; }

    if (mv.u && !attacker.ultReady) {
      log(attacker.poke.name + ': ULT غير جاهز! (' + attacker.ult + '%)', 'sys');
      callback?.(); return;
    }

    // ── Status / weather moves: apply to correct target ──────────────────────
    if (MOVE_EFFECTS[mv.n]) {
      const eff = MOVE_EFFECTS[mv.n];
      let target = attacker; // default: self
      if (eff.weather) {
        // Weather moves: just apply weather, no target needed
      } else if (eff.target === 'foe') {
        const storedPos = s.pendingTargets[fieldPos];
        target = (storedPos !== null && storedPos !== undefined)
          ? (eField.memberAt(storedPos) || eField.activeMembers[0])
          : eField.activeMembers[0];
        if (!target || !target.isAlive) { callback?.(); return; }
      }
      StatusEngine.applyMoveEffect(mv.n, attacker, target, log, (type) => store.setWeather(type));
      if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(10);
      commitField(store, pField, eField, myTeam, enTeam);
      callback?.(); return;
    }

    // ── Offensive attack ──────────────────────────────────────────────────────
    // Smart target resolution: use stored target, but if null/dead → first alive enemy
    const storedTargetPos = s.pendingTargets[fieldPos];
    let target = storedTargetPos !== null && storedTargetPos !== undefined
      ? eField.memberAt(storedTargetPos)
      : null;
    // If target is dead or not set, auto-target first alive enemy
    if (!target || !target.isAlive) {
      target = eField.activeMembers[0] ?? null;
    }
    if (!target || !target.isAlive) { callback?.(); return; }

    playTypeSound(mv.t);
    if (mv.t === 'FIRE' && target.hasStatus('FRZ')) {
      target.removeStatus('FRZ');
      log('🔥 الهجوم الناري أذاب تجميد ' + target.poke.name + '!', 'sys');
    }

    const { dmg, mult, stab, absorbed } = DamageEngine.calc(mv, attacker, target, weather);

    if (absorbed) {
      const dAb = target.ability;
      const healTypes = ['WATER_ABSORB','VOLT_ABSORB','SAP_SIPPER'];
      if (dAb && healTypes.includes(dAb.id)) {
        const healed = Math.min(Math.floor(target.maxHp * 0.25), target.maxHp - target.hp);
        if (healed > 0) target.healHp(healed);
        log((dAb.icon||'✨') + ' ' + target.poke.name + ': ' + dAb.name + ' امتصت! (+' + healed + 'HP)', 'heal');
      } else {
        log('🛡 ' + target.poke.name + ': مناعة!', 'sys');
      }
      if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(10);
      commitField(store, pField, eField, myTeam, enTeam);
      callback?.(); return;
    }

    const cat = DamageEngine.category(mv.n, mv.t);
    if (cat === 'physical') target._lastPhysDmgReceived = dmg;
    else if (cat === 'special') target._lastSpecDmgReceived = dmg;
    target.dealDamage(dmg);
    if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(20);

    const effTxt = mult === 0 ? ' مناعة!' : mult >= 2 ? ' فعّال جداً! 🔥' : mult <= 0.5 ? ' غير فعّال...' : '';
    log('⚔ ' + attacker.poke.name + ' → ' + target.poke.name + ': ' + mv.n + ' (-' + dmg + ' HP)' + effTxt + (stab > 1 ? ' [STAB]' : ''), 'playerAtk');

    if (mult >= 2) progress.recordSuperEff?.();

    const sec = MOVE_SECONDARY[mv.n];
    if (sec && Math.random() < sec.chance && target.isAlive) StatusEngine.apply(target, sec.status, log);

    if (!target.isAlive) {
      log('💀 ' + target.poke.name + ' سقط!', 'death');
      if (attacker._destinyBond) { attacker._destinyBond = false; attacker.forceKO(); }
      const evts = eField.processDeaths();
      evts.forEach(ev => log('🔄 ' + enTeam[ev.newIdx]?.poke?.name + ' يدخل!', 'sys'));
    }

    commitField(store, pField, eField, myTeam, enTeam);
    if (eField.allFainted) { callback?.('win');  return; }
    if (pField.allFainted) { callback?.('lose'); return; }
    callback?.();
  }, [store, progress, log]);

  // ── ENEMY HIT ──────────────────────────────────────────────────────────────
  const executeEnemyHit = useCallback((fieldPos, callback) => {
    const s      = useBattleStore.getState();
    const myTeam = hydrateTeam(s.myTeam);
    const enTeam = hydrateTeam(s.enTeam);
    const pField = new BattleField(myTeam, s.pField);
    const eField = new BattleField(enTeam, s.eField);
    const weather = Weather.fromPlain(s.weather);

    const attacker = eField.memberAt(fieldPos);
    if (!attacker || !attacker.isAlive) { callback?.(); return; }

    // Enemy picks a random move — prefer offensive
    const moves   = attacker.poke.moves || [];
    const offMoves = moves.filter(m => m.p > 0 && !m.u);
    const mv       = (offMoves.length ? offMoves : moves)[Math.floor(Math.random() * (offMoves.length || moves.length))];
    if (!mv) { callback?.(); return; }

    const blocked = StatusEngine.checkTurnBlock(attacker, log);
    if (blocked) { commitField(store, pField, eField, myTeam, enTeam); callback?.(); return; }

    const alivePSlots = pField.toSlots().filter(i => i !== null && myTeam[i]?.isAlive);
    if (!alivePSlots.length) { callback?.(); return; }
    const targetIdx = alivePSlots[Math.floor(Math.random() * alivePSlots.length)];
    const target    = myTeam[targetIdx];
    if (!target || !target.isAlive) { callback?.(); return; }

    // Enemy status/weather moves
    if (MOVE_EFFECTS[mv.n]) {
      const eff = MOVE_EFFECTS[mv.n];
      const effTarget = eff.target === 'foe' ? target : attacker;
      StatusEngine.applyMoveEffect(mv.n, attacker, effTarget, log, (type) => store.setWeather(type));
      if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(10);
      commitField(store, pField, eField, myTeam, enTeam);
      callback?.(); return;
    }

    playTypeSound(mv.t);
    if (mv.t === 'FIRE' && target.hasStatus('FRZ')) target.removeStatus('FRZ');

    const { dmg, mult, absorbed } = DamageEngine.calc(mv, attacker, target, weather);
    if (absorbed) {
      log('🛡 ' + target.poke.name + ': مناعة!', 'sys');
      if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(10);
      commitField(store, pField, eField, myTeam, enTeam); callback?.(); return;
    }

    const cat = DamageEngine.category(mv.n, mv.t);
    if (cat === 'physical') target._lastPhysDmgReceived = dmg;
    else if (cat === 'special') target._lastSpecDmgReceived = dmg;
    target.dealDamage(dmg);
    if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(20);

    const effTxt = mult >= 2 ? ' فعّال جداً! 🔥' : mult <= 0.5 ? ' غير فعّال...' : '';
    log('💥 ' + attacker.poke.name + ' → ' + target.poke.name + ': ' + mv.n + ' (-' + dmg + ' HP)' + effTxt, 'enemyAtk');

    const sec = MOVE_SECONDARY[mv.n];
    if (sec && Math.random() < sec.chance && target.isAlive) StatusEngine.apply(target, sec.status, log);

    if (!target.isAlive) {
      log('💀 ' + target.poke.name + ' سقط!', 'death');
      if (target._destinyBond) { target._destinyBond = false; attacker.forceKO(); eField.processDeaths(); }
      const evts = pField.processDeaths();
      evts.forEach(ev => log('🔄 ' + myTeam[ev.newIdx]?.poke?.name + ' يدخل!', 'sys'));
    }

    commitField(store, pField, eField, myTeam, enTeam);
    if (pField.allFainted) { callback?.('lose'); return; }
    if (eField.allFainted) { callback?.('win');  return; }
    callback?.();
  }, [store, log]);

  // ── END OF TURN ─────────────────────────────────────────────────────────────
  function doEndOfTurn(onDone) {
    const s      = useBattleStore.getState();
    const myTeam = hydrateTeam(s.myTeam);
    const enTeam = hydrateTeam(s.enTeam);
    const pField = new BattleField(myTeam, s.pField);
    const eField = new BattleField(enTeam, s.eField);
    const weather = Weather.fromPlain(s.weather);

    [...myTeam, ...enTeam].forEach(m => StatusEngine.applyEndOfTurn(m, weather, log));

    const eDeaths = eField.processDeaths();
    eDeaths.forEach(ev => { if (ev.newIdx !== null) log('🔄 ' + enTeam[ev.newIdx]?.poke?.name + ' يدخل!', 'sys'); });
    const pDeaths = pField.processDeaths();
    pDeaths.forEach(ev => { if (ev.newIdx !== null) log('🔄 ' + myTeam[ev.newIdx]?.poke?.name + ' يدخل!', 'sys'); });

    const expMsg = weather.tick();
    if (expMsg) log(expMsg, 'sys');

    store.setMyTeam(myTeam.map(m => m.toPlain()));
    store.setEnTeam(enTeam.map(m => m.toPlain()));
    store.setPField(pField.toSlots());
    store.setEField(eField.toSlots());
    useBattleStore.setState({ weather: weather.toPlain() });
    store.clearAllPending();

    if (eField.allFainted) { onDone?.('win');  return; }
    if (pField.allFainted) { onDone?.('lose'); return; }
    onDone?.(null);
  }

  // ── WIN / LOSS ──────────────────────────────────────────────────────────────
  function endBattleResult(won) {
    const s = useBattleStore.getState();
    SFX.stopBGM();
    setTimeout(() => won ? SFX.victory?.() : SFX.defeat?.(), 200);
    if (won) { progress.gainXP(30); progress.recordWin(); }
    else       progress.recordLoss();
    store.setActive(false);
    store.setResultData({ type: 'battle', won, xp: won ? 30 : 0 });
    store.showOverlay('Result');
  }

  // ── TOWER WIN ───────────────────────────────────────────────────────────────
  function handleTowerWin() {
    const snap = useBattleStore.getState();

    // Find which towerTeam member is currently on field
    const fieldIdx = snap.pField[0];
    const activeMember = fieldIdx !== null ? snap.myTeam[fieldIdx] : null;
    let activeTeamIdx = snap.towerActiveTeamIdx;

    // Sync ALL team members HP/fainted/ult back to towerTeam
    const updatedTT = snap.towerTeam.map(t => {
      const live = snap.myTeam.find(m => m?.poke?.id === t.poke?.id);
      if (!live) return t;
      return { ...t, hp: live.hp, ult: live.ult ?? t.ult, fainted: live.fainted };
    });

    // Remember which member was active (for next battle)
    if (activeMember) {
      const idx = updatedTT.findIndex(t => t.poke?.id === activeMember.poke?.id);
      if (idx !== -1) activeTeamIdx = idx;
    }

    const newStreak = snap.towerStreak + 1;
    progress.gainXP(20 + newStreak * 3);
    log('🏆 انتصرت! سلسلة: ' + newStreak, 'sys');
    SFX.stopBGM(); SFX.victory?.();

    useBattleStore.setState({
      towerStreak: newStreak,
      active: false,
      towerTeam: updatedTT,
      towerActiveTeamIdx: activeTeamIdx,
    });

    setTimeout(() => useBattleStore.getState().startNextTowerBattle(), 1800);
  }

  // ── TOWER LOSE ──────────────────────────────────────────────────────────────
  function handleTowerLose() {
    const snap = useBattleStore.getState();

    // Sync all members back
    const updatedTT = snap.towerTeam.map(t => {
      const live = snap.myTeam.find(m => m?.poke?.id === t.poke?.id);
      if (!live) return t;
      return { ...t, hp: live.hp, fainted: live.fainted, ult: live.ult ?? t.ult };
    });

    // Check if any alive team member remains
    const nextIdx = updatedTT.findIndex(t => !t.fainted);
    if (nextIdx !== -1) {
      // Still have alive members — auto-send next one
      const nextMember = updatedTT[nextIdx];
      useBattleStore.setState(s => ({
        towerTeam: updatedTT,
        towerActiveTeamIdx: nextIdx,
        myTeam: s.myTeam.map((m, i) =>
          snap.towerTeam[nextIdx] && m.poke?.id === snap.towerTeam[nextIdx].poke?.id
            ? { ...m, hp: nextMember.hp, fainted: false }
            : m
        ),
        pField: [nextIdx, null],
      }));
      store.addLog('♻ ' + nextMember.poke?.name + ' يدخل المعركة!', 'sys');
      useBattleStore.getState().setPTurn(true);
      return;
    }

    // Full team wipe — real loss
    progress.setTowerResult?.(snap.towerStreak);
    progress.gainXP(snap.towerStreak * 5);
    useBattleStore.setState({ towerTeam: updatedTT });
    store.endTowerRun();
  }

  // ── PLAYER SWAP (engine action) ─────────────────────────────────────────────
  const executePlayerSwap = useCallback((fieldPos, newTeamIdx, callback) => {
    const s      = useBattleStore.getState();
    const myTeam = hydrateTeam(s.myTeam);
    const oldIdx = s.pField[fieldPos];

    // REGENERATOR: heal leaving member
    if (oldIdx !== null && myTeam[oldIdx] && !myTeam[oldIdx].fainted) {
      const leaving = myTeam[oldIdx];
      if (leaving.ability?.id === 'REGENERATOR') {
        const heal = Math.floor(leaving.maxHp * 0.33);
        leaving.healHp(heal);
        log('💚 ' + leaving.poke.name + ': Regenerator +' + heal + ' HP', 'heal');
      }
    }

    store.setMyTeam(myTeam.map(m => m.toPlain()));
    const newField = [...s.pField];
    newField[fieldPos] = newTeamIdx;
    store.setPField(newField);

    // Track for tower
    if (s.towerActive) {
      store.setTowerActiveTeamIdx(newTeamIdx);
    }

    log('🔄 ' + s.myTeam[newTeamIdx]?.poke?.name + ' دخل المعركة!', 'sys');
    callback?.();
  }, [store, log]);

  // ── 2v2 DUAL TURN ───────────────────────────────────────────────────────────
  const executeDualTurn = useCallback(() => {
    const s = useBattleStore.getState();
    if (!s.active) return;
    store.setPTurn(false);
    store.setTurnTimer(30);

    const spd = (teamPlain, field, fi) => {
      const idx = field[fi];
      if (idx === null) return 0;
      const m = teamPlain[idx];
      return m && !m.fainted ? BattleMember.fromPlain(m).effStats.spd : 0;
    };
    const [first, second] = spd(s.myTeam, s.pField, 0) >= spd(s.myTeam, s.pField, 1) ? [0,1] : [1,0];

    // Each slot is either: SWAP | ATTACK | skip (fainted/null)
    function resolveSlot(fi, cb) {
      const st      = useBattleStore.getState();
      const swapIdx = st.pendingSwaps[fi];
      if (swapIdx !== null && swapIdx !== undefined) {
        executePlayerSwap(fi, swapIdx, () => { store.clearPendingSlot(fi); cb(null); });
      } else {
        executePlayerHit(fi, cb);
      }
    }

    resolveSlot(first, (r0) => {
      if (r0 === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
      if (r0 === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
      setTimeout(() => {
        resolveSlot(second, (r1) => {
          if (r1 === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
          if (r1 === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
          log('🔄 دور العدو...', 'sys');
          setTimeout(() => {
            executeEnemyHit(0, (re0) => {
              if (re0 === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
              if (re0 === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
              setTimeout(() => {
                executeEnemyHit(1, (re1) => {
                  if (re1 === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
                  if (re1 === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
                  doEndOfTurn((r) => {
                    if (r === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
                    if (r === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
                    setTimeout(() => store.setPTurn(true), 200);
                  });
                });
              }, 500);
            });
          }, 600);
        });
      }, 500);
    });
  }, [executePlayerHit, executeEnemyHit, executePlayerSwap, store, log]);

  // ── TOWER TURN (attack) ─────────────────────────────────────────────────────
  const executeTowerTurn = useCallback((moveIdx) => {
    const s = useBattleStore.getState();
    if (!s.active) return;
    store.setPendingMove(0, moveIdx);
    store.setPendingTarget(0, 0);
    store.setPTurn(false);
    store.setTurnTimer(30);

    executePlayerHit(0, (r) => {
      if (r === 'win')  { handleTowerWin();  return; }
      if (r === 'lose') { handleTowerLose(); return; }
      setTimeout(() => {
        executeEnemyHit(0, (re) => {
          if (re === 'lose') { handleTowerLose(); return; }
          if (re === 'win')  { handleTowerWin();  return; }
          doEndOfTurn((r2) => {
            if (r2 === 'win')  { handleTowerWin();  return; }
            if (r2 === 'lose') { handleTowerLose(); return; }
            setTimeout(() => store.setPTurn(true), 200);
          });
        });
      }, 500);
    });
  }, [executePlayerHit, executeEnemyHit, store]);

  // ── TOWER SWAP (costs turn — enemy attacks after) ───────────────────────────
  const executeTowerSwap = useCallback((newTeamIdx) => {
    const s = useBattleStore.getState();
    if (!s.active || !s.pTurn) return;
    store.setPTurn(false);
    store.setTurnTimer(30);

    executePlayerSwap(0, newTeamIdx, () => {
      setTimeout(() => {
        executeEnemyHit(0, (re) => {
          if (re === 'lose') { handleTowerLose(); return; }
          if (re === 'win')  { handleTowerWin();  return; }
          doEndOfTurn((r2) => {
            if (r2 === 'win')  { handleTowerWin();  return; }
            if (r2 === 'lose') { handleTowerLose(); return; }
            setTimeout(() => store.setPTurn(true), 200);
          });
        });
      }, 500);
    });
  }, [executePlayerSwap, executeEnemyHit, store]);

  return { executeDualTurn, executeTowerTurn, executeTowerSwap };
}
