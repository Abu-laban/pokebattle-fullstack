// ══════════════════════════════════════════
// Type Effectiveness Chart — Gen 6+ (with Fairy)
//
// FORMAT: TYPE_CHART[attackerType][defenderType] = multiplier
// Omitted entries default to 1x (neutral)
// ══════════════════════════════════════════
export const TYPE_CHART = {
  NORMAL: {
    ROCK: 0.5, STEEL: 0.5,
    GHOST: 0,
  },
  FIRE: {
    FIRE: 0.5, WATER: 0.5, ROCK: 0.5, DRAGON: 0.5,
    GRASS: 2, ICE: 2, BUG: 2, STEEL: 2,
  },
  WATER: {
    WATER: 0.5, GRASS: 0.5, DRAGON: 0.5,
    FIRE: 2, GROUND: 2, ROCK: 2,
  },
  ELECTRIC: {
    ELECTRIC: 0.5, GRASS: 0.5, DRAGON: 0.5,
    GROUND: 0,
    WATER: 2, FLYING: 2,
  },
  GRASS: {
    FIRE: 0.5, GRASS: 0.5, POISON: 0.5, FLYING: 0.5,
    BUG: 0.5, DRAGON: 0.5, STEEL: 0.5,
    WATER: 2, GROUND: 2, ROCK: 2,
  },
  ICE: {
    WATER: 0.5, ICE: 0.5, STEEL: 0.5, FIRE: 0.5,
    GRASS: 2, GROUND: 2, FLYING: 2, DRAGON: 2,
  },
  FIGHTING: {
    POISON: 0.5, BUG: 0.5, PSYCHIC: 0.5, FLYING: 0.5, FAIRY: 0.5,
    GHOST: 0,
    NORMAL: 2, ICE: 2, ROCK: 2, DARK: 2, STEEL: 2,
  },
  POISON: {
    POISON: 0.5, GROUND: 0.5, ROCK: 0.5, GHOST: 0.5,
    STEEL: 0,
    GRASS: 2, FAIRY: 2,
  },
  GROUND: {
    GRASS: 0.5, BUG: 0.5,
    FLYING: 0,
    FIRE: 2, ELECTRIC: 2, POISON: 2, ROCK: 2, STEEL: 2,
  },
  FLYING: {
    ELECTRIC: 0.5, ROCK: 0.5, STEEL: 0.5,
    GRASS: 2, FIGHTING: 2, BUG: 2,
  },
  PSYCHIC: {
    PSYCHIC: 0.5, STEEL: 0.5,
    DARK: 0,
    FIGHTING: 2, POISON: 2,
  },
  BUG: {
    FIRE: 0.5, FIGHTING: 0.5, FLYING: 0.5,
    GHOST: 0.5, STEEL: 0.5, FAIRY: 0.5,
    GRASS: 2, PSYCHIC: 2, DARK: 2,
  },
  ROCK: {
    FIGHTING: 0.5, GROUND: 0.5, STEEL: 0.5,
    FIRE: 2, ICE: 2, FLYING: 2, BUG: 2,
  },
  GHOST: {
    NORMAL: 0,
    DARK: 0.5,
    PSYCHIC: 2, GHOST: 2,
  },
  DRAGON: {
    STEEL: 0.5,
    FAIRY: 0,
    DRAGON: 2,
  },
  DARK: {
    FIGHTING: 0.5, DARK: 0.5, FAIRY: 0.5,
    PSYCHIC: 2, GHOST: 2,
  },
  STEEL: {
    FIRE: 0.5, WATER: 0.5, ELECTRIC: 0.5, STEEL: 0.5,
    ICE: 2, ROCK: 2, FAIRY: 2,
  },
  FAIRY: {
    FIRE: 0.5, POISON: 0.5, STEEL: 0.5,
    FIGHTING: 2, DRAGON: 2, DARK: 2,
  },
};

// Type display colors (for UI)
export const TYPE_COLORS = {
  FIRE:     '#FF6B35',  WATER:    '#4FC3F7',  GRASS:    '#66BB6A',
  POISON:   '#AB47BC',  PSYCHIC:  '#EC407A',  NORMAL:   '#BDBDBD',
  ELECTRIC: '#FFD600',  GHOST:    '#7E57C2',  DRAGON:   '#5C6BC0',
  ICE:      '#80DEEA',  FIGHTING: '#EF5350',  STEEL:    '#90A4AE',
  BUG:      '#8BC34A',  GROUND:   '#D4A843',  ROCK:     '#B5A04A',
  DARK:     '#5D4037',  FLYING:   '#82B1FF',  FAIRY:    '#F48FB1',
};

export default TYPE_CHART;
