// ══════════════════════════════════════════
// useBattleEngine — Full battle logic
// v2: Smart AI + Speed-based turn ordering
// ══════════════════════════════════════════
import { useCallback } from 'react';
import { useBattleStore, emitBattleAnim } from '../store/battleStore.js';
import { useProgressStore } from '../store/progressStore.js';
import { BattleMember }     from '../engine/BattleMember.js';
import { BattleField }      from '../engine/BattleField.js';
import { Weather }          from '../engine/Weather.js';
import { DamageEngine }     from '../engine/DamageEngine.js';
import { StatusEngine }     from '../engine/StatusEngine.js';
import { AIEngine }         from '../engine/AIEngine.js';
import { MOVE_SECONDARY }   from '../data/moveSecondary.js';
import { MOVE_EFFECTS }     from '../data/moveEffects.js';
import { SFX, playTypeSound } from '../engine/audio.js';
import { UserAPI }           from '../services/api.js';
import { useAuthStore }      from '../store/authStore.js';

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

  // Track superEff hits per battle session
  const superEffRef   = { count: 0 };
  const pokeKillsRef  = {};  // { pokeId: count } kills this battle
  const typeKillsRef  = {};  // { type: count } type defeats this battle

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

    // ── Status / weather moves ────────────────────────────────────────────────
    if (MOVE_EFFECTS[mv.n]) {
      const eff = MOVE_EFFECTS[mv.n];
      let target = attacker;
      if (eff.weather) {
        // weather only
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
    const storedTargetPos = s.pendingTargets[fieldPos];
    let target = storedTargetPos !== null && storedTargetPos !== undefined
      ? eField.memberAt(storedTargetPos)
      : null;
    if (!target || !target.isAlive) {
      target = eField.activeMembers[0] ?? null;
    }
    if (!target || !target.isAlive) { callback?.(); return; }

    playTypeSound(mv.t);
    emitBattleAnim('attack', fieldPos, false);
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
    const hitFieldPos = s.eField.findIndex(ti => ti !== null && s.enTeam[ti]?.poke?.name === target.poke.name);
    if (hitFieldPos >= 0) emitBattleAnim(mult >= 2 ? 'superEff' : 'hit', hitFieldPos, true);

    const effTxt = mult === 0 ? ' مناعة!' : mult >= 4 ? ' فعّال جداً جداً! 🔥🔥' : mult >= 2 ? ' فعّال جداً! 🔥' : mult <= 0.25 ? ' غير فعّال أبداً...' : mult <= 0.5 ? ' غير فعّال...' : '';
    log('⚔ ' + attacker.poke.name + ' → ' + target.poke.name + ': ' + mv.n + ' (-' + dmg + ' HP)' + effTxt + (stab > 1 ? ' [STAB]' : '') + (mv.u ? ' [ULT!]' : ''), 'playerAtk');

    if (mult >= 2) { progress.recordSuperEff?.(); superEffRef.count++; }

    const sec = MOVE_SECONDARY[mv.n];
    if (sec && Math.random() < sec.chance && target.isAlive) StatusEngine.apply(target, sec.status, log);

    if (!target.isAlive) {
      log('💀 ' + target.poke.name + ' سقط!', 'death');
      (target.poke.types || []).forEach(t => { typeKillsRef[t] = (typeKillsRef[t] || 0) + 1; });
      pokeKillsRef[attacker.poke.id] = (pokeKillsRef[attacker.poke.id] || 0) + 1;
      progress.gainPokeXp?.(attacker.poke.id, 20);
      if (attacker._destinyBond) { attacker._destinyBond = false; attacker.forceKO(); }
      const evts = eField.processDeaths();
      evts.forEach(ev => log('🔄 ' + enTeam[ev.newIdx]?.poke?.name + ' يدخل!', 'sys'));
    }

    commitField(store, pField, eField, myTeam, enTeam);
    if (eField.allFainted) { callback?.('win');  return; }
    if (pField.allFainted) { callback?.('lose'); return; }
    callback?.();
  }, [store, progress, log]);

  // ── ENEMY HIT — Smart AI ────────────────────────────────────────────────────
  const executeEnemyHit = useCallback((fieldPos, callback) => {
    const s      = useBattleStore.getState();
    const myTeam = hydrateTeam(s.myTeam);
    const enTeam = hydrateTeam(s.enTeam);
    const pField = new BattleField(myTeam, s.pField);
    const eField = new BattleField(enTeam, s.eField);
    const weather = Weather.fromPlain(s.weather);

    const attacker = eField.memberAt(fieldPos);
    if (!attacker || !attacker.isAlive) { callback?.(); return; }

    // ── Smart AI decision ─────────────────────────────────────────────────────
    const alivePTargets = pField.activeMembers;
    if (!alivePTargets.length) { callback?.(); return; }

    const playerLevel = useAuthStore.getState().user?.level ?? progress.level ?? 1;
    const difficulty = AIEngine.getDifficulty(s.towerStreak || 0, playerLevel);
    const { moveIdx, targetFieldPos } = AIEngine.decide(
      attacker, alivePTargets, weather, difficulty
    );

    const moves = attacker.poke.moves || [];
    const mv    = moves[moveIdx];
    if (!mv) { callback?.(); return; }

    const blocked = StatusEngine.checkTurnBlock(attacker, log);
    if (blocked) { commitField(store, pField, eField, myTeam, enTeam); callback?.(); return; }

    // Resolve target: map from alivePTargets index to actual player team member
    const target = alivePTargets[targetFieldPos] ?? alivePTargets[0];
    if (!target || !target.isAlive) { callback?.(); return; }

    // ── Enemy status/weather moves ─────────────────────────────────────────────
    if (MOVE_EFFECTS[mv.n]) {
      const eff = MOVE_EFFECTS[mv.n];
      const effTarget = eff.target === 'foe' ? target : attacker;
      StatusEngine.applyMoveEffect(mv.n, attacker, effTarget, log, (type) => store.setWeather(type));
      if (mv.u) attacker.consumeUlt(); else attacker.chargeUlt(10);
      const moveLabel = mv.u ? ' [ULT!]' : '';
      log('🤖 ' + attacker.poke.name + ': ' + mv.n + moveLabel, 'enemyAtk');
      commitField(store, pField, eField, myTeam, enTeam);
      callback?.(); return;
    }

    playTypeSound(mv.t);
    emitBattleAnim('attack', fieldPos, true);
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
    const playerHitPos = s.pField.findIndex(ti => ti !== null && s.myTeam[ti]?.poke?.name === target.poke.name);
    if (playerHitPos >= 0) emitBattleAnim(mult >= 2 ? 'superEff' : 'hit', playerHitPos, false);

    const effTxt = mult === 0 ? ' مناعة!' : mult >= 4 ? ' فعّال جداً جداً! 🔥🔥' : mult >= 2 ? ' فعّال جداً! 🔥' : mult <= 0.25 ? ' غير فعّال أبداً...' : mult <= 0.5 ? ' غير فعّال...' : '';
    const ultTag = mv.u ? ' [ULT!]' : '';
    log('💥 ' + attacker.poke.name + ' → ' + target.poke.name + ': ' + mv.n + ' (-' + dmg + ' HP)' + effTxt + ultTag, 'enemyAtk');

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
    eDeaths.forEach(ev => {
      // Record type defeat for status-killed enemies
      const deadPoke = enTeam.find(m => !m.isAlive);
      if (deadPoke) {
        (deadPoke.poke.types || []).forEach(t => { typeKillsRef[t] = (typeKillsRef[t] || 0) + 1; });
      }
      if (ev.newIdx !== null) log('🔄 ' + enTeam[ev.newIdx]?.poke?.name + ' يدخل!', 'sys');
    });
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
    SFX.stopBGM();
    setTimeout(() => won ? SFX.victory?.() : SFX.defeat?.(), 200);
    const xpGained = won ? 30 : 0;
    const superEffThisBattle = superEffRef.count;
    superEffRef.count = 0;

    // Apply kills + XP to progressStore only on win
    if (won) {
      const winningTeam = useBattleStore.getState().selectedIds || [];
      // Win XP for all team members
      winningTeam.forEach(id => progress.gainPokeXp?.(id, 15));
      // Kill XP for attackers
      Object.entries(pokeKillsRef).forEach(([id, count]) => {
        progress.gainPokeXp?.(parseInt(id), count * 10);
        for (let i = 0; i < count; i++) progress.recordWinWithPoke?.(parseInt(id));
      });
      Object.entries(typeKillsRef).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) progress.recordDefeatType?.(type);
      });
    } else {
      // Even on loss, give small XP for participating pokes
      const teamIds = useBattleStore.getState().selectedIds || [];
      teamIds.forEach(id => progress.gainPokeXp?.(id, 5));
    }
    // Capture refs before reset
    const pokeKillsSnapshot = { ...pokeKillsRef };
    const typeKillsSnapshot = { ...typeKillsRef };
    // Reset refs for next battle
    Object.keys(pokeKillsRef).forEach(k => delete pokeKillsRef[k]);
    Object.keys(typeKillsRef).forEach(k => delete typeKillsRef[k]);

    if (won) {
      progress.gainXP(xpGained);
      progress.recordWin();
      const ids = useBattleStore.getState().selectedIds || [];
      progress.recordWinWithTeam?.(ids);
    } else {
      progress.recordLoss();
    }
    store.setActive(false);
    store.setResultData({ type: 'battle', won, xp: xpGained });
    store.showOverlay('Result');

    // ── Sync to server ──
    const token = useAuthStore.getState().token;
    if (token) {
      UserAPI.saveBattleResult({
        won,
        xpGained,
        superEffHits: superEffThisBattle,
        pokeKills: won ? pokeKillsSnapshot : {},
        typeKills:  won ? typeKillsSnapshot : {},
      })
        .then(() => useAuthStore.getState().refreshUser?.())
        .catch(() => {});
    }
  }

  // ── TOWER WIN ───────────────────────────────────────────────────────────────
  function handleTowerWin() {
    const snap = useBattleStore.getState();
    const fieldIdx = snap.pField[0];
    const activeMember = fieldIdx !== null ? snap.myTeam[fieldIdx] : null;
    let activeTeamIdx = snap.towerActiveTeamIdx;

    const updatedTT = snap.towerTeam.map(t => {
      const live = snap.myTeam.find(m => m?.poke?.id === t.poke?.id);
      if (!live) return t;
      return { ...t, hp: live.hp, ult: live.ult ?? t.ult, fainted: live.fainted };
    });

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
    const updatedTT = snap.towerTeam.map(t => {
      const live = snap.myTeam.find(m => m?.poke?.id === t.poke?.id);
      if (!live) return t;
      return { ...t, hp: live.hp, fainted: live.fainted, ult: live.ult ?? t.ult };
    });

    const nextIdx = updatedTT.findIndex(t => !t.fainted);
    if (nextIdx !== -1) {
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

    progress.setTowerResult?.(snap.towerStreak);
    const towerXp = snap.towerStreak * 5;
    progress.gainXP(towerXp);
    useBattleStore.setState({ towerTeam: updatedTT });
    store.endTowerRun();

    // ── Sync tower result to server ──
    const token = useAuthStore.getState().token;
    if (token) {
      UserAPI.saveBattleResult({ isTower: true, won: false, xpGained: towerXp, towerStreak: snap.towerStreak })
        .then(() => useAuthStore.getState().refreshUser?.())
        .catch(() => {});
    }
  }

  // ── PLAYER SWAP ─────────────────────────────────────────────────────────────
  const executePlayerSwap = useCallback((fieldPos, newTeamIdx, callback) => {
    const s      = useBattleStore.getState();
    const myTeam = hydrateTeam(s.myTeam);
    const oldIdx = s.pField[fieldPos];

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

    if (s.towerActive) store.setTowerActiveTeamIdx(newTeamIdx);

    log('🔄 ' + s.myTeam[newTeamIdx]?.poke?.name + ' دخل المعركة!', 'sys');
    callback?.();
  }, [store, log]);

  // ══════════════════════════════════════════
  // 2v2 DUAL TURN — Speed-based interleaved ordering
  //
  // All 4 combatants attack in descending speed order
  // (Replaces: player0→player1→enemy0→enemy1 fixed order)
  // ══════════════════════════════════════════
  const executeDualTurn = useCallback(() => {
    const s = useBattleStore.getState();
    if (!s.active) return;
    store.setPTurn(false);
    store.setTurnTimer(30);

    // ── Build speed-ordered action queue ─────────────────────────────────────
    const getSpd = (teamPlain, field, fi) => {
      const idx = field[fi];
      if (idx === null || idx === undefined) return -1;
      const m = teamPlain[idx];
      if (!m || m.fainted) return -1;
      return BattleMember.fromPlain(m).effStats.spd;
    };

    const actions = [];

    // Player slots
    for (let fi = 0; fi < 2; fi++) {
      const spd = getSpd(s.myTeam, s.pField, fi);
      if (spd < 0) continue;
      // Swap actions always go before attacks (priority mechanic)
      const isSwap = (s.pendingSwaps[fi] !== null && s.pendingSwaps[fi] !== undefined);
      actions.push({ side: 'player', fi, spd: isSwap ? spd + 9999 : spd });
    }

    // Enemy slots
    for (let fi = 0; fi < 2; fi++) {
      const spd = getSpd(s.enTeam, s.eField, fi);
      if (spd < 0) continue;
      actions.push({ side: 'enemy', fi, spd });
    }

    // Sort descending by speed (ties broken randomly for fairness)
    actions.sort((a, b) => {
      if (b.spd !== a.spd) return b.spd - a.spd;
      return Math.random() < 0.5 ? -1 : 1;
    });

    if (actions.length === 0) {
      doEndOfTurn((r) => {
        if (r === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
        if (r === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
        setTimeout(() => store.setPTurn(true), 200);
      });
      return;
    }

    // ── Execute each action in speed order ────────────────────────────────────
    function executeNext(idx) {
      if (idx >= actions.length) {
        // All attacks done — end of turn
        doEndOfTurn((r) => {
          if (r === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
          if (r === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
          setTimeout(() => store.setPTurn(true), 200);
        });
        return;
      }

      const action = actions[idx];
      const delay  = idx === 0 ? 0 : 500;

      setTimeout(() => {
        // Check if the actor is still alive before executing
        const cur = useBattleStore.getState();

        if (action.side === 'player') {
          const fi     = action.fi;
          const slotIdx = cur.pField[fi];
          if (slotIdx === null || cur.myTeam[slotIdx]?.fainted) {
            executeNext(idx + 1); return;
          }

          const isSwap = cur.pendingSwaps[fi] !== null && cur.pendingSwaps[fi] !== undefined;
          if (isSwap) {
            executePlayerSwap(fi, cur.pendingSwaps[fi], () => {
              store.clearPendingSlot(fi);
              executeNext(idx + 1);
            });
          } else {
            executePlayerHit(fi, (r) => {
              if (r === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
              if (r === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
              executeNext(idx + 1);
            });
          }

        } else {
          // enemy
          const fi      = action.fi;
          const slotIdx = cur.eField[fi];
          if (slotIdx === null || cur.enTeam[slotIdx]?.fainted) {
            executeNext(idx + 1); return;
          }

          executeEnemyHit(fi, (r) => {
            if (r === 'lose') { setTimeout(() => endBattleResult(false), 800); return; }
            if (r === 'win')  { setTimeout(() => endBattleResult(true),  800); return; }
            executeNext(idx + 1);
          });
        }
      }, delay);
    }

    log('⚡ ترتيب السرعة: ' + actions.map(a => {
      const cur = useBattleStore.getState();
      const idx = a.side === 'player' ? cur.pField[a.fi] : cur.eField[a.fi];
      const team = a.side === 'player' ? cur.myTeam : cur.enTeam;
      return (idx !== null ? team[idx]?.poke?.name : '?') + '(' + a.spd + ')';
    }).join(' → '), 'sys');

    executeNext(0);
  }, [executePlayerHit, executeEnemyHit, executePlayerSwap, store, log]);

  // ── TOWER TURN ───────────────────────────────────────────────────────────────
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

  // ── TOWER SWAP ───────────────────────────────────────────────────────────────
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