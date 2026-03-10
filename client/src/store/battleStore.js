// ══════════════════════════════════════════
// Battle State Store (Zustand)
// ══════════════════════════════════════════
import { create } from 'zustand';
import { DEX } from '../data/dex.js';
import { useProgressStore } from './progressStore.js';
import { Weather } from '../engine/Weather.js';
import { BattleMember } from '../engine/BattleMember.js';
import { SFX } from '../engine/audio.js';

function addEntry(log, counter, text, cls) {
  const entry = { text, cls: cls || '', id: counter + 1 };
  const next  = log.length >= 120 ? [...log.slice(1), entry] : [...log, entry];
  return { log: next, logCounter: counter + 1 };
}

export const useBattleStore = create((set, get) => ({
  screen: 'selection',
  selectedIds: [],
  currentGen: 'all',

  // ── Battle core ──────────────────────────────────────────────────────────
  myTeam: [], enTeam: [],
  pField: [null, null], eField: [null, null],
  activeAtk: 0, active: false, pTurn: true,
  gameMode: 'normal', towerActive: false,

  // ── Tower ──────────────────────────────────────────────────────────────
  towerTeam: [], towerIdx: 0, towerStreak: 0,
  towerActiveTeamIdx: 0,   // ← which towerTeam member is currently active on field

  // ── Pending actions ──────────────────────────────────────────────────────
  // Each slot: pendingMoves = moveIdx | null, pendingSwaps = newTeamIdx | null
  pendingMoves:   [null, null],
  pendingTargets: [null, null],
  pendingSwaps:   [null, null],

  // ── Timer ────────────────────────────────────────────────────────────────
  turnTimer: 30,

  // ── Weather ──────────────────────────────────────────────────────────────
  weather: new Weather().toPlain(),

  // ── Log ──────────────────────────────────────────────────────────────────
  log: [], logCounter: 0,

  // ── Overlays ─────────────────────────────────────────────────────────────
  overlayResult: false,
  overlayEvolution: false,
  resultData: null,

  // ════ ACTIONS ════════════════════════════════════════════════════════════

  addLog(text, cls) { set(s => addEntry(s.log, s.logCounter, text, cls)); },
  clearLog()        { set({ log: [], logCounter: 0 }); },

  setScreen(screen)             { set({ screen }); },
  setGen(currentGen)            { set({ currentGen }); },
  setPTurn(pTurn)               { set({ pTurn }); },
  setActive(active)             { set({ active }); },
  setMyTeam(myTeam)             { set({ myTeam }); },
  setEnTeam(enTeam)             { set({ enTeam }); },
  setPField(pField)             { set({ pField }); },
  setEField(eField)             { set({ eField }); },
  setTurnTimer(v)               { set({ turnTimer: v }); },
  setTowerActiveTeamIdx(i)      { set({ towerActiveTeamIdx: i }); },

  setPendingMove(fi, mi) {
    set(s => { const a = [...s.pendingMoves]; a[fi] = mi; return { pendingMoves: a }; });
  },
  setPendingTarget(fi, ti) {
    set(s => { const a = [...s.pendingTargets]; a[fi] = ti; return { pendingTargets: a }; });
  },
  setPendingSwap(fi, teamIdx) {
    set(s => { const a = [...s.pendingSwaps]; a[fi] = teamIdx; return { pendingSwaps: a }; });
  },
  clearPendingSlot(fi) {
    set(s => {
      const pm = [...s.pendingMoves];   pm[fi] = null;
      const pt = [...s.pendingTargets]; pt[fi] = null;
      const ps = [...s.pendingSwaps];   ps[fi] = null;
      return { pendingMoves: pm, pendingTargets: pt, pendingSwaps: ps };
    });
  },
  clearAllPending() {
    set({ pendingMoves: [null,null], pendingTargets: [null,null], pendingSwaps: [null,null] });
  },

  setWeather(type) {
    set(s => {
      const w   = new Weather(s.weather.type, s.weather.turns);
      const msg = w.set(type);
      return { weather: w.toPlain(), ...(msg ? addEntry(s.log, s.logCounter, msg, 'sys') : {}) };
    });
  },

  showOverlay(name)  { set({ [`overlay${name}`]: true  }); },
  closeOverlay(name) { set({ [`overlay${name}`]: false }); },
  showEvolution() { set({ overlayEvolution: true }); },
  closeEvolution() { set({ overlayEvolution: false }); },
  setResultData(d)   { set({ resultData: d }); },

  toggleSelectPoke(id) {
    set(s => {
      const idx = s.selectedIds.indexOf(id);
      if (idx >= 0) return { selectedIds: s.selectedIds.filter(x => x !== id) };
      if (s.selectedIds.length >= 6) return {};
      return { selectedIds: [...s.selectedIds, id] };
    });
  },
  removeFromTeam(id) { set(s => ({ selectedIds: s.selectedIds.filter(x => x !== id) })); },

  // ── Random team selection ─────────────────────────────────────────────
  selectRandomTeam() {
    const progress = useProgressStore.getState();
    const available = DEX.filter(p => !get().selectedIds.includes(p.id) && progress.isPokeUnlocked(p));
    const shuffled = available.sort(() => 0.5 - Math.random());
    const randomIds = shuffled.slice(0, 4).map(p => p.id);
    set({ selectedIds: randomIds });
  },

  selectRandomTowerTeam() {
    const progress = useProgressStore.getState();
    const available = DEX.filter(p => !get().towerTeam.some(t => t.poke.id === p.id) && progress.isPokeUnlocked(p));
    const shuffled = available.sort(() => 0.5 - Math.random());
    const randomPokes = shuffled.slice(0, 6).map(p => ({ 
      poke: p, 
      hp: p.hp, 
      maxHp: p.hp, 
      fainted: false, 
      ult: 0 
    }));
    set({ towerTeam: randomPokes });
  },

  // ── Start normal 2v2 battle ──────────────────────────────────────────────
  startBattle() {
    SFX.playBattleBGM();
    let ids = [...get().selectedIds];
    while (ids.length < 4) {
      const pool = DEX.filter(x => !ids.includes(x.id));
      ids.push(pool[Math.floor(Math.random() * pool.length)].id);
    }
    const myTeam = ids.map(id => BattleMember.fresh(DEX.find(x => x.id === id)).toPlain());
    const ePool  = DEX.filter(x => !myTeam.find(t => t.poke.id === x.id));
    const pool   = [...ePool];
    const enTeam = Array.from({ length: 4 }, () => {
      const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      return BattleMember.fresh(pick).toPlain();
    });
    const names  = myTeam.slice(0,2).map(t => t.poke.name).join(' & ');
    const enames = enTeam.slice(0,2).map(t => t.poke.name).join(' & ');
    set({
      myTeam, enTeam,
      pField: [0,1], eField: [0,1],
      active: true, pTurn: true, screen: 'battle',
      gameMode: 'normal', towerActive: false,
      weather: new Weather().toPlain(),
      pendingMoves: [null,null], pendingTargets: [null,null], pendingSwaps: [null,null],
      turnTimer: 30,
      overlayResult: false,
      log: [{ text: `⚔ ${names} vs ${enames}! المعركة 2v2 بدأت!`, cls:'sys', id:1 }],
      logCounter: 1,
    });
  },

  // ── Tower ────────────────────────────────────────────────────────────────
  addTowerPoke(poke) {
    set(s => {
      if (s.towerTeam.length >= 6 || s.towerTeam.some(t => t.poke.id === poke.id)) return {};
      return { towerTeam: [...s.towerTeam, { poke, hp: poke.hp, maxHp: poke.hp, fainted: false, ult: 0 }] };
    });
  },
  removeTowerPoke(idx) {
    set(s => ({ towerTeam: s.towerTeam.filter((_,i) => i !== idx) }));
  },

  startTower() {
    set(s => ({
      towerStreak: 0, towerIdx: 0, towerActiveTeamIdx: 0,
      towerTeam: s.towerTeam.map(t => ({ ...t, hp: t.maxHp, fainted: false, ult: 0 })),
      gameMode: 'tower', towerActive: true,
    }));
    get().startNextTowerBattle();
  },

  startNextTowerBattle() {
    const s = get();
    // Use towerActiveTeamIdx if that member is still alive, else find next alive
    let activeIdx = s.towerActiveTeamIdx;
    if (!s.towerTeam[activeIdx] || s.towerTeam[activeIdx].fainted) {
      activeIdx = s.towerTeam.findIndex(t => !t.fainted);
    }
    if (activeIdx === -1) { get().endTowerRun(); return; }

    const player = s.towerTeam[activeIdx].poke;
    const pool   = DEX.filter(x => !s.towerTeam.some(t => t.poke.id === x.id));
    const scaled = pool.filter(p => p.hp >= Math.min(80 + s.towerStreak * 8, 300));
    const src    = scaled.length ? scaled : pool;
    const enemy  = src[Math.floor(Math.random() * src.length)];

    SFX.playBattleBGM();

    // Build myTeam from full towerTeam (preserving HP/fainted/ult)
    const myT = s.towerTeam.map(t =>
      BattleMember.fresh(t.poke, { hp: t.hp, ult: t.ult ?? 0 }).toPlain()
    );
    while (myT.length < 4) myT.push(BattleMember.faintedPlaceholder(myT[0]?.poke || enemy).toPlain());

    const em  = BattleMember.fresh(enemy).toPlain();
    const enT = [
      em,
      BattleMember.faintedPlaceholder(enemy).toPlain(),
      BattleMember.faintedPlaceholder(enemy).toPlain(),
      BattleMember.faintedPlaceholder(enemy).toPlain(),
    ];

    const msg = `🏰 معركة ${s.towerStreak + 1} | ${player.name} vs ${enemy.name}!`;
    set(s2 => ({
      towerIdx: activeIdx, towerActiveTeamIdx: activeIdx,
      myTeam: myT, enTeam: enT,
      pField: [activeIdx, null], eField: [0, null],
      active: true, pTurn: true, screen: 'battle',
      weather: new Weather().toPlain(),
      pendingMoves: [null,null], pendingTargets: [null,null], pendingSwaps: [null,null],
      turnTimer: 30,
      overlayResult: false,
      ...addEntry(s2.log, s2.logCounter, msg, 'sys'),
    }));
  },

  endTowerRun() {
    SFX.stopBGM();
    setTimeout(() => SFX.defeat?.(), 300);
    set(s => ({
      towerActive: false, gameMode: 'normal', active: false,
      overlayResult: true,
      resultData: { type: 'tower', streak: s.towerStreak },
    }));
  },

  syncMember(team, idx, patch) {
    set(s => {
      const arr = [...s[team]];
      arr[idx]  = { ...arr[idx], ...patch };
      return { [team]: arr };
    });
  },

  resetGame() {
    SFX.stopBGM();
    setTimeout(() => SFX.playSelectBGM(), 300);
    set({
      screen: 'selection', active: false, pTurn: true,
      selectedIds: [], // إزالة جميع اختيارات البوكيمون
      towerTeam: [], // إزالة فريق البرج أيضاً
      myTeam: [], enTeam: [],
      pField: [null,null], eField: [null,null],
      weather: new Weather().toPlain(), log: [], logCounter: 0,
      overlayResult: false, resultData: null,
      towerActive: false, gameMode: 'normal',
      pendingMoves: [null,null], pendingTargets: [null,null], pendingSwaps: [null,null],
      turnTimer: 30,
    });
  },
}));

// ── Battle animation events (ephemeral, no persistence needed) ──
// External subscribers
const _animListeners = new Set();
export function subscribeBattleAnim(fn) { _animListeners.add(fn); return () => _animListeners.delete(fn); }
export function emitBattleAnim(type, fieldPos, isEnemy) {
  _animListeners.forEach(fn => fn({ type, fieldPos, isEnemy }));
}
