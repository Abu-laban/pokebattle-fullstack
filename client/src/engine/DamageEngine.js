// ══════════════════════════════════════════
// DamageEngine — class-based damage calculator
// Verified against Gen 6+ type chart.
// Enhancements: critical hits, richer return data.
// ══════════════════════════════════════════
import { TYPE_CHART }  from '../data/typeChart.js';
import { SPECIAL_TYPES, STATUS_MOVE_NAMES } from '../data/moves.js';

export class DamageEngine {

  // ── Move category ──────────────────────────────────────────────────────────
  static category(moveName, moveType) {
    if (STATUS_MOVE_NAMES.has(moveName)) return 'status';
    if (SPECIAL_TYPES.has(moveType))     return 'special';
    return 'physical';
  }

  // ── Type effectiveness (Gen 6+) ────────────────────────────────────────────
  // Returns the combined multiplier for moveType vs an array of defender types.
  // Dual-type defenders multiply both interactions together (e.g. 4x, 0x).
  static effectiveness(moveType, defenderTypes) {
    let mult = 1;
    defenderTypes.forEach(dt => {
      const row = TYPE_CHART[moveType];
      if (row && row[dt] !== undefined) mult *= row[dt];
    });
    return mult;
  }

  // ── Effectiveness badge ────────────────────────────────────────────────────
  static effBadge(mult) {
    if (mult === 0)   return { text: 'مناعة تامة! 🛡️',        cls: 'eff-immune', color: '#90A4AE' };
    if (mult >= 4)    return { text: 'فعّال جداً جداً! ✨✨',  cls: 'eff-super2', color: '#FF1744' };
    if (mult >= 2)    return { text: 'فعّال جداً! ✨',         cls: 'eff-super',  color: '#FF6B35' };
    if (mult <= 0.25) return { text: 'غير فعّال أبداً... 💤', cls: 'eff-weak2',  color: '#78909C' };
    if (mult <= 0.5)  return { text: 'غير فعّال... 💤',       cls: 'eff-weak',   color: '#9E9E9E' };
    return null;
  }

  // ── Effectiveness label for UI badges ──────────────────────────────────────
  static effLabel(mult) {
    if (mult === 0)   return { text: '0×',   color: '#90A4AE', bg: 'rgba(144,164,174,.25)' };
    if (mult >= 4)    return { text: '4×',   color: '#FF1744', bg: 'rgba(255,23,68,.2)'    };
    if (mult >= 2)    return { text: '2×',   color: '#FF6B35', bg: 'rgba(255,107,53,.2)'   };
    if (mult <= 0.25) return { text: '¼×',   color: '#78909C', bg: 'rgba(120,144,156,.2)'  };
    if (mult <= 0.5)  return { text: '½×',   color: '#9E9E9E', bg: 'rgba(158,158,158,.2)'  };
    return null; // neutral — no badge
  }

  /**
   * Calculate damage for a move.
   *
   * Formula (simplified Gen-style):
   *   base  = power / 4.5
   *   ratio = clamp(atkStat / defStat, 0.25, 4)
   *   dmg   = base × ratio × typeEff × STAB × weather × ability × defAbility
   *           × levelBonus × random × critMult
   *
   * @param {object}       mv        - Move { n, t, p, u }
   * @param {BattleMember} attacker
   * @param {BattleMember} defender
   * @param {Weather|null} weather
   * @param {number}       level     - Player level (1–50+, scales lvlBonus)
   *
   * @returns {{ dmg, mult, stab, weatherMult, abilityMult, absorbed, crit, category }}
   */
  static calc(mv, attacker, defender, weather = null, level = 1) {
    const cat      = DamageEngine.category(mv.n, mv.t);
    const aStats   = attacker.effStats;
    const dStats   = defender.effStats;

    const atkStat  = cat === 'special' ? aStats.spatk : aStats.atk;
    const defStat  = cat === 'special' ? dStats.spdef : dStats.def;

    // Ratio capped [0.25, 4] to prevent extreme one-shots
    const ratio    = Math.min(4, Math.max(0.25, atkStat / Math.max(defStat, 20)));

    let   mult     = DamageEngine.effectiveness(mv.t, defender.poke.types);
    const stab     = attacker.poke.types.includes(mv.t) ? 1.5 : 1;

    // Level bonus: +2% per level above 1 (level 1 = ×1.00, level 50 = ×1.98)
    const lvlBonus = 1 + (level - 1) * 0.02;

    // Random roll: [0.85, 1.00] matches official Gen formula variance
    const random   = 0.85 + Math.random() * 0.15;

    // ── Critical hit (1/16 chance, ×1.5) ────────────────────────────────────
    // Status moves and already-immune targets cannot crit
    const crit     = mult > 0 && cat !== 'status' && Math.random() < (1 / 16);
    const critMult = crit ? 1.5 : 1;

    // ── Attacker ability boosts ──────────────────────────────────────────────
    const aAb     = attacker.ability;
    let   abilityMult = 1;

    if (aAb) {
      const hpPct = attacker.hpPercent;
      if (aAb.id === 'BLAZE'       && hpPct <= 0.33 && mv.t === 'FIRE')    abilityMult = 1.5;
      if (aAb.id === 'TORRENT'     && hpPct <= 0.33 && mv.t === 'WATER')   abilityMult = 1.5;
      if (aAb.id === 'OVERGROW'    && hpPct <= 0.33 && mv.t === 'GRASS')   abilityMult = 1.5;
      if (aAb.id === 'SWARM'       && hpPct <= 0.33 && mv.t === 'BUG')     abilityMult = 1.5;
      if (aAb.id === 'TECHNICIAN'  && mv.p <= 60 && mv.p > 0)              abilityMult = 1.5;
    }

    // ── Defender ability modifications ───────────────────────────────────────
    const dAb         = defender.ability;
    let   defAbilMult = 1;
    let   absorbed    = false;

    if (dAb) {
      // Full immunity / absorb
      if (dAb.id === 'LEVITATE'      && mv.t === 'GROUND')   { mult = 0; absorbed = true; }
      if (dAb.id === 'FLASH_FIRE'    && mv.t === 'FIRE')     { mult = 0; absorbed = true; }
      if (dAb.id === 'WATER_ABSORB'  && mv.t === 'WATER')    { mult = 0; absorbed = true; }
      if (dAb.id === 'VOLT_ABSORB'   && mv.t === 'ELECTRIC') { mult = 0; absorbed = true; }
      if (dAb.id === 'SAP_SIPPER'    && mv.t === 'GRASS')    { mult = 0; absorbed = true; }

      // Partial reductions
      if (dAb.id === 'THICK_FAT'
          && (mv.t === 'FIRE' || mv.t === 'ICE'))             defAbilMult = 0.5;
      if ((dAb.id === 'FILTER' || dAb.id === 'SOLID_ROCK')
          && mult >= 2)                                        defAbilMult = 0.75;
    }

    // ── Weather multiplier ───────────────────────────────────────────────────
    const weatherMult = weather?.moveMult(mv.t) ?? 1;

    // ── Final damage ─────────────────────────────────────────────────────────
    const dmg = mult === 0 ? 0 : Math.max(1, Math.round(
      mv.p / 4.5
        * ratio
        * mult
        * stab
        * weatherMult
        * abilityMult
        * defAbilMult
        * lvlBonus
        * random
        * critMult
    ));

    return { dmg, mult, stab, weatherMult, abilityMult, absorbed, crit, category: cat };
  }
}