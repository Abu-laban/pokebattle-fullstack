// ══════════════════════════════════════════
// Progress / Achievements Store (Zustand + persist)
// ══════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEX }        from '../data/dex.js';
import { EVOLUTIONS } from '../data/evolutionData.js';
import { POKE_STATS } from '../data/pokeStats.js';

// ── Helper: get BST for a pokemon ─────────────────────────────────────────
function getBST(pokeId) {
  const s = POKE_STATS[pokeId];
  if (!s) return 250;
  return Object.values(s).reduce((a, b) => a + b, 0);
}

// ── Evolution stage helper ─────────────────────────────────────────────────
function getEvoStage(id) {
  const isChild = EVOLUTIONS[id];
  if (!isChild) return 0;                        // base form
  const isGrandchild = EVOLUTIONS[isChild.parent];
  return isGrandchild ? 2 : 1;
}

// ── Unlock rules (realistic progression) ──────────────────────────────────
// Base forms BST < 420   → always free
// Base forms BST 420–499 → player level 5
// Base forms BST 500+    → player level 15
// 1st evolution          → 2 wins with parent + parent poke level 5
// Final evolution        → 3 wins with parent + parent poke level 8
// Legendary BST 580+     → level 20 + 5 type defeats
// Mythical BST 620+      → level 30 + tower streak 5 + 5 type defeats
// Mega/Primal/Ultra      → event locked
export const UNLOCK_RULES = {};

DEX.forEach(poke => {
  const bst    = getBST(poke.id);   // 5-stat sum (no inflated battle HP)
  const stage  = getEvoStage(poke.id);
  const evo    = EVOLUTIONS[poke.id];
  const isMega = /mega|primal|ultra|zen/i.test(poke.name);

  if (isMega) { UNLOCK_RULES[poke.id] = { megaEvent: true }; return; }

  const hasChildren = DEX.some(p => EVOLUTIONS[p.id]?.parent === poke.id);
  // Legendary: no evolution chain, BST ≥ 500 (5-stat only)
  const isLegendary = bst >= 500 && !evo && !hasChildren;

  if (isLegendary) {
    const mainType = poke.types[0];
    UNLOCK_RULES[poke.id] = bst >= 570
      ? { minLevel: 30, towerBest: 5,  defeatType: { type: mainType, count: 5 } }
      : { minLevel: 20, defeatType: { type: mainType, count: 5 } };
    return;
  }

  if (evo) {
    const pid = evo.parent;
    // Rank gate calibrated to 5-stat BST thresholds
    const rankReq = bst >= 430 ? 'adept' : bst >= 360 ? 'novice' : null;
    const base = stage === 1
      ? { winWithPoke: { id: pid, count: 2 }, pokeLevel: { id: pid, level: 5 } }
      : { winWithPoke: { id: pid, count: 3 }, pokeLevel: { id: pid, level: 8 } };
    UNLOCK_RULES[poke.id] = rankReq ? { ...base, minRank: rankReq } : base;
    return;
  }

  // Base forms — calibrated to 5-stat BST (no HP)
  if (bst >= 420)      UNLOCK_RULES[poke.id] = { minLevel: 15, minRank: 'adept'  };
  else if (bst >= 320) UNLOCK_RULES[poke.id] = { minLevel: 5,  minRank: 'novice' };
  // BST < 320: free, no rule
});

export function xpForLevel(lvl) {
  return 100 + (lvl - 1) * 50;
}

// Trainer rank system: determines base Pokemon availability
// Stricter: only early pokemon available until specific rank achieved
export function getTrainerRank(level) {
  if (level >= 45) return { rank: 'legendary', tier: 5, label: '👑 أسطورة' };
  if (level >= 35) return { rank: 'master', tier: 4, label: '🏆 سيد' };
  if (level >= 25) return { rank: 'expert', tier: 3, label: '⚡ خبير' };
  if (level >= 15) return { rank: 'adept', tier: 2, label: '🔥 ماهر' };
  if (level >= 5)  return { rank: 'novice', tier: 1, label: '🌟 مبتدئ' };
  return { rank: 'beginner', tier: 0, label: '🎓 متدرب' };
}

// Strict unlock tiers: only allow pokemon in specified range per rank
export const RANK_POKE_TIERS = {
  'beginner': { min: 1, max: 10 },      // only first 10 pokemon
  'novice':   { min: 1, max: 25 },      // up to around 25
  'adept':    { min: 1, max: 50 },      // first generation
  'expert':   { min: 1, max: 100 },     // up to gen 2-3
  'master':   { min: 1, max: 200 },     // most of first 200
  'legendary':{ min: 1, max: 1025 },    // all available
};

export function getRankTitle(level) {
  if (level >= 50) return '👑 أسطورة البوكيمون';
  if (level >= 40) return '🏆 بطل البوكيمون';
  if (level >= 30) return '⚡ خبير البوكيمون';
  if (level >= 25) return '🔥 محترف البوكيمون';
  if (level >= 20) return '⭐ مدرب متقدم';
  if (level >= 15) return '🌟 مدرب محترف';
  if (level >= 10) return '🎯 مدرب ماهر';
  if (level >= 5)  return '🛡️ مدرب مبتدئ';
  return '🎓 متدرب بوكيمون';
}

export const ACHIEVEMENTS = [
  { id: 'first_win',    title: '🏆 أول انتصار!',     desc: 'فز بمعركتك الأولى',           check: p => p.wins >= 1          },
  { id: 'win_5',        title: '🔥 5 انتصارات',       desc: 'فز بـ 5 معارك',               check: p => p.wins >= 5          },
  { id: 'win_25',       title: '⚡ 25 انتصار',        desc: 'فز بـ 25 معركة',              check: p => p.wins >= 25         },
  { id: 'tower_5',      title: '🏰 بطل البرج',        desc: 'حقق 5 انتصارات في البرج',     check: p => p.towerBest >= 5     },
  { id: 'tower_10',     title: '👑 أسطورة البرج',     desc: 'حقق 10 انتصارات في البرج',    check: p => p.towerBest >= 10    },
  { id: 'super_eff_10', title: '✨ 10 ضربات فعّالة',  desc: 'أصب ضربة فعّالة جداً 10 مرات',check: p => p.superEffHits >= 10 },
  { id: 'lvl_5',        title: '⭐ مستوى 5',          desc: 'ابلغ المستوى 5',              check: p => p.level >= 5         },
  { id: 'lvl_10',       title: '🌟 مستوى 10',         desc: 'ابلغ المستوى 10',             check: p => p.level >= 10        },
];

export const useProgressStore = create(
  persist(
    (set, get) => ({
      level: 1, xp: 0, wins: 0, losses: 0,
      totalDmg: 0, superEffHits: 0,
      totalXp: 0,
      towerBest: 0, towerCurrent: 0,

      // new stats for unlocking
      winsByType: {},        // { [type]: count }
      winsWithPoke: {},      // { [pokeId]: count }
      winsWithTeam: {},      // { "1,2,3,4": count }
      pokeXp: {},            // { [pokeId]: xp }
      unlockedPokes: [],     // list of poke ids unlocked explicitly
      megaEventActive: false,

      unlockedAchievements: [],

      // ── Reset all progress (on logout) ────────────────────────────────────
      resetAll() {
        // Save local gameplay data keyed by user before reset
        const s = get();
        if (s._userId) {
          try {
            localStorage.setItem(
              `pb-local-${s._userId}`,
              JSON.stringify({ winsWithPoke: s.winsWithPoke, winsByType: s.winsByType, winsWithTeam: s.winsWithTeam, pokeXp: s.pokeXp, unlockedPokes: s.unlockedPokes })
            );
          } catch {}
        }
        set({
          _userId: null,
          level: 1, xp: 0, wins: 0, losses: 0,
          totalDmg: 0, superEffHits: 0, totalXp: 0,
          towerBest: 0, towerCurrent: 0,
          winsByType: {}, winsWithPoke: {}, winsWithTeam: {},
          pokeXp: {}, unlockedPokes: [],
          megaEventActive: false, unlockedAchievements: [],
        });
      },

      // ── Sync from server user object ──────────────────────────────────────
      syncFromServer(serverUser) {
        if (!serverUser) return;
        // Restore this user's saved local data if exists
        let localData = {};
        try {
          const saved = localStorage.getItem(`pb-local-${serverUser.id}`);
          if (saved) localData = JSON.parse(saved);
        } catch {}
        set({
          _userId:      serverUser.id,
          level:        serverUser.level      ?? 1,
          xp:           serverUser.xp         ?? 0,
          wins:         serverUser.stats?.wins      ?? 0,
          losses:       serverUser.stats?.losses     ?? 0,
          towerBest:    serverUser.stats?.towerBest  ?? 0,
          totalDmg:     serverUser.stats?.totalDamage ?? 0,
          superEffHits: serverUser.stats?.superEffHits ?? 0,
          // Server wins data takes priority over local
          winsWithPoke: Object.keys(serverUser.winsWithPoke || {}).length > 0
            ? serverUser.winsWithPoke
            : (localData.winsWithPoke ?? {}),
          winsByType:   Object.keys(serverUser.winsByType || {}).length > 0
            ? serverUser.winsByType
            : (localData.winsByType ?? {}),
          winsWithTeam: localData.winsWithTeam ?? {},
          pokeXp:       localData.pokeXp       ?? {},
          unlockedPokes: localData.unlockedPokes ?? [],
        });
        get().checkAchievements();
        get().checkUnlocks();
      },

      gainXP(amount) {
        set(s => {
          let xp  = s.xp + amount;
          let totalXp = s.totalXp + amount;
          let lvl = s.level;
          while (xp >= xpForLevel(lvl)) { xp -= xpForLevel(lvl); lvl++; }
          return { xp, level: lvl, totalXp };
        });
        get().checkAchievements();
        get().checkUnlocks();
      },

      recordWin()  {
        set(s => ({ wins: s.wins + 1 }));
        get().checkAchievements();
        get().checkUnlocks();
        // Persist local data for this user
        const s = get();
        if (s._userId) {
          try {
            localStorage.setItem(`pb-local-${s._userId}`, JSON.stringify({
              winsWithPoke: s.winsWithPoke, winsByType: s.winsByType,
              winsWithTeam: s.winsWithTeam, pokeXp: s.pokeXp, unlockedPokes: s.unlockedPokes,
            }));
          } catch {}
        }
      },
      recordLoss() { set(s => ({ losses:  s.losses  + 1 })); },
      recordSuperEff() { set(s => ({ superEffHits: s.superEffHits + 1 })); get().checkAchievements(); get().checkUnlocks(); },

      setTowerResult(streak) {
        set(s => ({
          towerCurrent: streak,
          towerBest: Math.max(s.towerBest, streak),
        }));
        get().checkAchievements();
        get().checkUnlocks();
      },

      xpPercent() {
        const s = get();
        return Math.min(100, Math.round(s.xp / xpForLevel(s.level) * 100));
      },

      getRankTitle() {
        return getRankTitle(get().level);
      },

      checkAchievements() {
        const p = get();
        ACHIEVEMENTS.forEach(ach => {
          if (!p.unlockedAchievements.includes(ach.id) && ach.check(p)) {
            set(s => ({ unlockedAchievements: [...s.unlockedAchievements, ach.id] }));
            window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: ach }));
          }
        });
      },

      // record a defeat of a Pokémon type (called when an enemy faints)
      recordDefeatType(type) {
        set(s => {
          const m = { ...s.winsByType };
          m[type] = (m[type] || 0) + 1;
          return { winsByType: m };
        });
        get().checkUnlocks();
      },

      // record a win with a specific Pokémon in your team
      recordWinWithPoke(id) {
        set(s => {
          const m = { ...s.winsWithPoke };
          m[id] = (m[id] || 0) + 1;
          return { winsWithPoke: m };
        });
        get().checkUnlocks();
      },

      // grant XP to a specific Pokémon (used for tracking its own level)
      gainPokeXp(id, amount) {
        set(s => {
          const m = { ...s.pokeXp };
          m[id] = (m[id] || 0) + amount;
          return { pokeXp: m };
        });
        get().checkUnlocks();
      },

      // compute level based on xp (same formula as player)
      pokeLevel(id) {
        let xp = get().pokeXp[id] || 0;
        let lvl = 1;
        while (xp >= xpForLevel(lvl)) {
          xp -= xpForLevel(lvl);
          lvl++;
        }
        return lvl;
      },

      // record a win using a particular team composition
      recordWinWithTeam(ids) {
        const key = ids.sort((a,b) => a - b).join(',');
        set(s => {
          const m = { ...s.winsWithTeam };
          m[key] = (m[key] || 0) + 1;
          return { winsWithTeam: m };
        });
        get().checkUnlocks();
      },

      unlockPoke(id) {
        set(s => ({ unlockedPokes: [...new Set([...s.unlockedPokes, id])] }));
      },

      activateMegaEvent() {
        set({ megaEventActive: true });
        get().checkUnlocks();
      },

      // evaluate unlock rules against current progress state
      checkUnlocks() {
        const s = get();
        const newly = [];

        DEX.forEach(p => {
          if (s.unlockedPokes.includes(p.id)) return;

          let can = true;
          const rule = UNLOCK_RULES[p.id];

          if (!rule) { newly.push(p.id); return; } // no rule = free

          if (rule.megaEvent && !s.megaEventActive) return; // event locked
          if (rule.minLevel   && s.level < rule.minLevel)   can = false;
          if (rule.minRank) {
            const curRank = getTrainerRank(s.level);
            const rankOrder = ['beginner','novice','adept','expert','master','legendary'];
            if (rankOrder.indexOf(curRank.rank) < rankOrder.indexOf(rule.minRank)) can = false;
          }
          if (rule.towerBest  && s.towerBest < rule.towerBest) can = false;
          if (rule.defeatType) {
            const { type, count } = rule.defeatType;
            if ((s.winsByType[type] || 0) < count) can = false;
          }
          if (rule.winWithPoke) {
            const { id, count } = rule.winWithPoke;
            if ((s.winsWithPoke[id] || 0) < count) can = false;
          }
          if (rule.winWithTeam) {
            const key = rule.winWithTeam.ids.sort((a,b)=>a-b).join(',');
            if ((s.winsWithTeam[key] || 0) < rule.winWithTeam.count) can = false;
          }
          if (rule.pokeLevel) {
            const { id, level } = rule.pokeLevel;
            const plvl = get().pokeLevel(id);
            if (plvl < level) can = false;
          }

          if (can) newly.push(p.id);
        });

        if (newly.length) {
          set(s => ({ unlockedPokes: [...new Set([...s.unlockedPokes, ...newly])] }));
          newly.forEach(id => {
            window.dispatchEvent(new CustomEvent('poke-unlocked', { detail: { id } }));
          });
        }
      },

      reset() {
        set({
          level:1, xp:0, totalXp:0, wins:0, losses:0, totalDmg:0,
          superEffHits:0, towerBest:0, towerCurrent:0,
          winsByType:{}, winsWithPoke:{}, winsWithTeam:{},
          unlockedPokes:[], megaEventActive:false,
          unlockedAchievements:[]
        });
        // recalc unlocks after clearing state
        setTimeout(() => get().checkUnlocks(), 0);
      },

      // utility to check unlocking of a specific poke given current state
      isPokeUnlocked(poke) {
        const s = get();
        if (s.unlockedPokes.includes(poke.id)) return true;

        const rule = UNLOCK_RULES[poke.id];
        if (!rule) return true; // no rule = free

        if (rule.megaEvent && !s.megaEventActive) return false;
        if (rule.minLevel   && s.level < rule.minLevel) return false;
        if (rule.minRank) {
          const curRank  = getTrainerRank(s.level);
          const rankOrder = ['beginner','novice','adept','expert','master','legendary'];
          if (rankOrder.indexOf(curRank.rank) < rankOrder.indexOf(rule.minRank)) return false;
        }
        if (rule.towerBest  && s.towerBest < rule.towerBest) return false;
        if (rule.defeatType) {
          const { type, count } = rule.defeatType;
          if ((s.winsByType[type] || 0) < count) return false;
        }
        if (rule.winWithPoke) {
          const { id, count } = rule.winWithPoke;
          if ((s.winsWithPoke[id] || 0) < count) return false;
        }
        if (rule.winWithTeam) {
          const key = rule.winWithTeam.ids.sort((a,b)=>a-b).join(',');
          if ((s.winsWithTeam[key] || 0) < rule.winWithTeam.count) return false;
        }
        if (rule.pokeLevel) {
          const { id, level } = rule.pokeLevel;
          const plvl = get().pokeLevel(id);
          if (plvl < level) return false;
        }
        return true;
      },
    }),
    {
      name: 'pokebattle-progress',
      // On rehydrate: re-validate all unlockedPokes against current rules
      // This strips stale unlocks if rules changed or player lost progress
      merge: (persisted, current) => {
        const merged = { ...current, ...persisted };
        if (merged.unlockedPokes?.length) {
          const RANK_ORDER = ['beginner','novice','adept','expert','master','legendary'];
          const curRankIdx = RANK_ORDER.indexOf(getTrainerRank(merged.level ?? 1).rank);
          merged.unlockedPokes = merged.unlockedPokes.filter(id => {
            const rule = UNLOCK_RULES[id];
            if (!rule) return true;
            if (rule.megaEvent) return !!(merged.megaEventActive);
            if (rule.minLevel  && (merged.level ?? 1) < rule.minLevel) return false;
            if (rule.minRank   && curRankIdx < RANK_ORDER.indexOf(rule.minRank)) return false;
            if (rule.towerBest && (merged.towerBest ?? 0) < rule.towerBest) return false;
            if (rule.defeatType) {
              const { type, count } = rule.defeatType;
              if (((merged.winsByType ?? {})[type] ?? 0) < count) return false;
            }
            if (rule.winWithPoke) {
              const { id: pid, count } = rule.winWithPoke;
              if (((merged.winsWithPoke ?? {})[pid] ?? 0) < count) return false;
            }
            return true;
          });
        }
        return merged;
      },
    }
  )
);

// Force re-validation: clear old unlock cache if store version changed
const STORE_VERSION = 'v3';
const storedVersion = localStorage.getItem('pb-rules-version');
if (storedVersion !== STORE_VERSION) {
  localStorage.removeItem('pokebattle-progress');
  localStorage.setItem('pb-rules-version', STORE_VERSION);
}

// ensure initial unlock evaluation when the module is loaded
useProgressStore.getState().checkUnlocks();