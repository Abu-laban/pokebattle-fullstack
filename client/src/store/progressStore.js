// ══════════════════════════════════════════
// Progress / Achievements Store (Zustand + persist)
// ══════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEX } from '../data/dex.js';
import { EVOLUTIONS } from '../data/evolutionData.js';

// ── Unlock rules configuration ─────────────────────────────────────────────
// You can expand this object with explicit conditions for specific pokémon.
// Each entry may contain any of these keys:
//   minLevel: number            // require player level
//   defeatType: {type,count}     // defeat N pokémon of given type
//   winWithPoke: {id,count}      // win N battles while using a specific poke
//   winWithTeam: {ids,count}     // win N battles with exact team composition
//   towerBest: number            // achieve tower streak
//   megaEvent: true              // available only when special event activated
// only the rules defined here override the default level blocks.
export const UNLOCK_RULES = {
  // demonstration examples
  150: { defeatType: { type: 'PSYCHIC', count: 10 } }, // Mewtwo unlocks after 10 Psychic defeats
  25: { winWithPoke: { id: 150, count: 5 } }, // Pikachu unlocks by winning 5 times with Mewtwo
  813: { megaEvent: true },                  // Charizard‑Mega‑X locked until event
  814: { megaEvent: true },                  // Charizard‑Mega‑Y locked until event
  // ...you can add more rules here manually
};

// merge evolution requirements into unlock rules automatically
Object.entries(EVOLUTIONS).forEach(([childId, info]) => {
  const id = parseInt(childId, 10);
  if (!UNLOCK_RULES[id]) UNLOCK_RULES[id] = {};
  // require parent pokemon to reach specific level (or default to half of evolution level)
  const reqLevel = info.level > 0 ? Math.ceil(info.level / 2) : 5;
  UNLOCK_RULES[id].pokeLevel = { id: info.parent, level: reqLevel };
  // also require at least one win with parent for confirmation
  UNLOCK_RULES[id].winWithPoke = { id: info.parent, count: 1 };
});

// automatically lock all mega/primal/ultra forms as event content
DEX.forEach(p => {
  if (/mega|primal|ultra|zen/i.test(p.name)) {
    if (!UNLOCK_RULES[p.id]) UNLOCK_RULES[p.id] = {};
    UNLOCK_RULES[p.id].megaEvent = true;
  }
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
const RANK_POKE_TIERS = {
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

      recordWin()  { set(s => ({ wins:    s.wins    + 1 })); get().checkAchievements(); get().checkUnlocks(); },
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
        const xp = get().pokeXp[id] || 0;
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
        const trainerRank = getTrainerRank(s.level);
        const tierLimit = RANK_POKE_TIERS[trainerRank.rank];

        DEX.forEach(p => {
          if (s.unlockedPokes.includes(p.id)) return;

          // Tier gate: strict by rank
          if (p.id < tierLimit.min || p.id > tierLimit.max) return;

          // Check custom rules
          let can = true;
          const rule = UNLOCK_RULES[p.id];
          if (rule) {
            if (rule.minLevel && s.level < rule.minLevel) can = false;
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
            if (rule.towerBest && s.towerBest < rule.towerBest) can = false;
            if (rule.megaEvent && !s.megaEventActive) can = false;
          }

          if (can) newly.push(p.id);
        });

        if (newly.length) {
          set(s => ({ unlockedPokes: [...new Set([...s.unlockedPokes, ...newly])] }));
          // dispatch event for UI/notifications
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

        // Check trainer rank tier first (strict gating by rank)
        const trainerRank = getTrainerRank(s.level);
        const tierLimit = RANK_POKE_TIERS[trainerRank.rank];
        if (poke.id < tierLimit.min || poke.id > tierLimit.max) return false;

        // Check custom unlock rules
        const rule = UNLOCK_RULES[poke.id];
        if (rule) {
          if (rule.minLevel && s.level < rule.minLevel) return false;
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
          if (rule.towerBest && s.towerBest < rule.towerBest) return false;
          if (rule.megaEvent && !s.megaEventActive) return false;
        }
        return true;
      },
    }),
    { name: 'pokebattle-progress' }
  )
);

// ensure initial unlock evaluation when the module is loaded
useProgressStore.getState().checkUnlocks();
