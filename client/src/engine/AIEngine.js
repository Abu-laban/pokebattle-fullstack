// ══════════════════════════════════════════
// AIEngine — Strategic Battle AI
//
// Replaces random enemy move selection with
// type-aware, damage-optimized decision making
//
// Difficulty levels:
//   'easy'   — occasional random choices, avoids ultimates
//   'normal' — picks best damage move, uses status occasionally
//   'hard'   — full optimization, KO priority, strategic status
// ══════════════════════════════════════════
import { DamageEngine }   from './DamageEngine.js';
import { MOVE_EFFECTS }   from '../data/moveEffects.js';
import { STATUS_MOVE_NAMES } from '../data/moves.js';

const STATUS_PRIORITY = {
  SLP: 130, // Most powerful — full incapacitation
  FRZ: 120, // Very powerful — full incapacitation
  PAR:  85, // Good — cuts speed + 25% skip
  BRN:  80, // Halves attack + DoT
  PSN:  75, // DoT only
  CNF:  55, // Mild disruption
};

export class AIEngine {
  /**
   * Pick the best move + target for an AI-controlled attacker.
   *
   * @param {BattleMember}   attacker    - The attacking AI pokemon
   * @param {BattleMember[]} targets     - Array of live enemy members
   * @param {Weather|null}   weather
   * @param {'easy'|'normal'|'hard'} difficulty
   *
   * @returns {{ moveIdx: number, targetFieldPos: number }}
   */
  static decide(attacker, targets, weather, difficulty = 'normal') {
    const moves    = attacker.poke.moves || [];
    const liveTgts = targets.filter(t => t?.isAlive);
    if (!liveTgts.length || !moves.length) return { moveIdx: 0, targetFieldPos: 0 };

    // Easy mode: 40% chance to pick randomly (makes early fights forgiving)
    if (difficulty === 'easy' && Math.random() < 0.40) {
      const safeMoves = moves.filter(m => !m.u);
      const randMove  = safeMoves[Math.floor(Math.random() * safeMoves.length)] || moves[0];
      return {
        moveIdx: moves.indexOf(randMove),
        targetFieldPos: 0,
      };
    }

    let bestScore   = -Infinity;
    let bestMoveIdx = 0;
    let bestTgtIdx  = 0;

    for (let mi = 0; mi < moves.length; mi++) {
      const mv = moves[mi];

      // Skip ultimate if not charged
      if (mv.u && !attacker.ultReady) continue;

      // Evaluate against each target
      for (let ti = 0; ti < liveTgts.length; ti++) {
        const target = liveTgts[ti];
        const score  = AIEngine._score(mv, attacker, target, weather, difficulty);

        if (score > bestScore) {
          bestScore   = score;
          bestMoveIdx = mi;
          bestTgtIdx  = ti;
        }
      }
    }

    // Resolve back to field position (ti is index into liveTgts, not field pos)
    // We return targetFieldPos as the index into the original targets array
    const targetOrigIdx = targets.findIndex(t => t === liveTgts[bestTgtIdx]);

    return {
      moveIdx: bestMoveIdx,
      targetFieldPos: Math.max(0, targetOrigIdx),
    };
  }

  // ── Score a single move against a single target ───────────────────────────
  static _score(mv, attacker, target, weather, difficulty) {
    const eff = MOVE_EFFECTS[mv.n];

    // ── Status / stat moves ───────────────────────────────────────────────
    if (eff) {
      return AIEngine._scoreEffect(eff, mv, attacker, target, difficulty);
    }

    // ── Offensive moves ───────────────────────────────────────────────────
    const { dmg, mult, absorbed } = DamageEngine.calc(mv, attacker, target, weather);

    // Ability absorbed — useless move
    if (absorbed) return -200;

    // Immune — never pick immune moves (unless nothing else)
    if (mult === 0) return -500;

    let score = dmg;

    // ★ KO bonus — huge priority
    if (dmg >= target.hp) {
      score += 2000;
    }

    // ★ Almost KO (80%+ of target HP) — high priority
    if (dmg >= target.hp * 0.80) {
      score += 500;
    }

    // Super-effective bonus
    if (mult >= 4)   score += 400;
    else if (mult >= 2) score += 150;

    // Not-very-effective penalty
    if (mult <= 0.25) score -= 200;
    else if (mult <= 0.5) score -= 80;

    // STAB bonus
    if (attacker.poke.types.includes(mv.t)) score += 30;

    // Ultimate bonus (hard mode uses ultimates more aggressively)
    if (mv.u) {
      score += difficulty === 'hard' ? 200 : 100;
    }

    // Hard mode: target the weakest enemy (focus fire)
    if (difficulty === 'hard') {
      score += (1 - target.hpPercent) * 60;
    }

    // Normal/hard: prefer low-HP targets (easier KO)
    if (difficulty !== 'easy') {
      score += (1 - target.hpPercent) * 30;
    }

    return score;
  }

  // ── Score a status/stat move ──────────────────────────────────────────────
  static _scoreEffect(eff, mv, attacker, target, difficulty) {
    // Easy mode rarely uses status moves strategically
    if (difficulty === 'easy') return Math.random() * 15 - 5;

    // Weather moves: normal/hard use situationally
    if (eff.weather) {
      // Don't repeat same weather
      return difficulty === 'hard' ? 40 : 20;
    }

    // ── Self-buff moves ───────────────────────────────────────────────────
    if (eff.target === 'self') {
      const stat    = eff.stat;
      const stage   = stat ? (attacker.stages[stat] || 0) : 0;

      // Already maxed — don't buff
      if (stage >= 5) return -100;

      // Buff more valuable when HP is high (time to use it)
      const hpFactor   = attacker.hpPercent > 0.65 ? 1.3 : 0.6;
      const baseValue  = stat === 'spatk' ? 75 : stat === 'atk' ? 70 : 55;
      const buffAmount = Math.abs(eff.st || 1);
      return baseValue * buffAmount * hpFactor;
    }

    // ── Foe-targeting effects ─────────────────────────────────────────────
    if (eff.status) {
      const s = eff.status;

      // Already has any status — skip (can't stack primary statuses)
      if (target.hasStatus('SLP') || target.hasStatus('FRZ') ||
          target.hasStatus('PAR') || target.hasStatus('PSN') ||
          target.hasStatus('BRN')) {
        return -200;
      }

      const priority  = STATUS_PRIORITY[s] || 40;
      // More useful on healthy targets (will suffer more turns)
      const hpBonus   = target.hpPercent * 50;
      // Hard mode values status more
      const diffMult  = difficulty === 'hard' ? 1.3 : 1.0;

      return priority * diffMult + hpBonus;
    }

    // ── Stat debuffs on foe ───────────────────────────────────────────────
    if (eff.stat && eff.st < 0) {
      const stat  = eff.stat;
      const stage = target.stages?.[stat] || 0;
      if (stage <= -4) return -100; // already debuffed enough
      return 45 * Math.abs(eff.st);
    }

    return 10; // fallback: small positive score
  }

  // ── Determine difficulty based on tower streak / game context ────────────
  // level: trainer level (1-50+), towerStreak: for tower mode
  static getDifficulty(towerStreak = 0, playerLevel = 1) {
    // Tower: streak-based scaling
    if (towerStreak > 0) {
      if (towerStreak >= 15) return 'hard';
      if (towerStreak >= 5)  return 'normal';
      return 'easy';
    }
    // Normal battle: scale with player level
    if (playerLevel >= 25) return 'hard';
    if (playerLevel >= 10) return 'normal';
    return 'easy';
  }
}