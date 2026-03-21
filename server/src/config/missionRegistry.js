/**
 * SEC-03 FIX — Server-side Mission Registry
 *
 * This is the SINGLE SOURCE OF TRUTH for mission reward values.
 * The missionController reads XP rewards from here and IGNORES any
 * rewardXp value sent by the client.
 *
 * IDs must match the `id` field in client/src/data/missionData.js exactly.
 */

const MISSION_REGISTRY = {
  // ── Chapter 1: البداية ─────────────────────────────────────────────────
  starter_trials:    { rewardXp: 200  },
  grass_champion:    { rewardXp: 800  },
  fire_lord:         { rewardXp: 800  },
  water_master:      { rewardXp: 800  },

  // ── Chapter 2: الكهوف المظلمة ──────────────────────────────────────────
  ghost_hunter:      { rewardXp: 1200 },
  electric_storm:    { rewardXp: 1200 },

  // ── Chapter 3: صحوة التنين ─────────────────────────────────────────────
  dragon_awakening:  { rewardXp: 2000 },
  sea_terror:        { rewardXp: 2000 },

  // ── Chapter 4: الأساطير ────────────────────────────────────────────────
  suicune_guardian:  { rewardXp: 3000 },
  dark_mountain:     { rewardXp: 3000 },
  iron_will:         { rewardXp: 3000 },

  // ── Chapter 5: حارس السماء ─────────────────────────────────────────────
  sky_guardian:      { rewardXp: 5000 },
  rainbow_wings:     { rewardXp: 5000 },

  // ── Chapter 6: تنين السماء ─────────────────────────────────────────────
  sky_dragon:        { rewardXp: 6000 },
  land_shark_legend: { rewardXp: 6000 },

  // ── Chapter 7: عالم الظلام ─────────────────────────────────────────────
  shadow_world:      { rewardXp: 8000 },
  unova_legend:      { rewardXp: 8000 },
};

/**
 * Returns the authorized reward for a mission, or null if unknown.
 * @param {string} missionId
 * @returns {{ rewardXp: number } | null}
 */
function getMissionReward(missionId) {
  return MISSION_REGISTRY[missionId] ?? null;
}

module.exports = { getMissionReward };
