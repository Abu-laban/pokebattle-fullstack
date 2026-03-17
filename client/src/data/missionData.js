// ══════════════════════════════════════════
// Mission Data — Story/Chain Missions
// Goal types:
//   WIN_STREAK   — انتصر X متتالي مع بوكيمون محدد
//   WIN_WITH     — انتصر X مرة مع بوكيمون محدد (غير متتالي)
//   WIN_TYPE     — اهزم X بوكيمون من نوع معين
//   USE_MOVE     — استخدم حركة معينة X مرات
//   WIN_ANY      — انتصر X مرة بأي فريق
// ══════════════════════════════════════════

export const MISSIONS = [

  // ── فصل 1: البداية ────────────────────────────────────────────────────────
  {
    id: 'starter_trials',
    name: 'تجارب المبتدئ',
    type: 'story',
    chapter: 1,
    reqRank: 'beginner',
    image: null,
    reward: { xp: 200, pokeId: null, label: '200 XP' },
    goals: [
      { type: 'WIN_ANY',  count: 5,  label: 'انتصر في 5 معارك' },
      { type: 'WIN_TYPE', typeTarget: 'NORMAL', count: 3, label: 'اهزم 3 بوكيمون من نوع عادي' },
    ],
  },

  {
    id: 'grass_champion',
    name: 'بطل العشب',
    type: 'story',
    chapter: 1,
    reqRank: 'beginner',
    image: null,
    reward: { xp: 800,  pokeId: null, label: '800 XP' },
    goals: [
      { type: 'WIN_WITH', pokeId: 1,  count: 3, label: 'انتصر 3 مرات مع BULBASAUR' },
      { type: 'USE_MOVE', moveId: 'VINE WHIP', count: 5, label: 'استخدم VINE WHIP 5 مرات' },
      { type: 'WIN_TYPE', typeTarget: 'WATER',  count: 5, label: 'اهزم 5 بوكيمون من نوع ماء' },
    ],
  },

  {
    id: 'fire_lord',
    name: 'سيد النار',
    type: 'story',
    chapter: 1,
    reqRank: 'beginner',
    image: null,
    reward: { xp: 800,  pokeId: null, label: '800 XP' },
    goals: [
      { type: 'WIN_WITH', pokeId: 4,  count: 3, label: 'انتصر 3 مرات مع CHARMANDER' },
      { type: 'USE_MOVE', moveId: 'EMBER', count: 8, label: 'استخدم EMBER 8 مرات' },
      { type: 'WIN_TYPE', typeTarget: 'GRASS', count: 5, label: 'اهزم 5 بوكيمون من نوع عشب' },
    ],
  },

  {
    id: 'water_master',
    name: 'سيد الماء',
    type: 'story',
    chapter: 1,
    reqRank: 'beginner',
    image: null,
    reward: { xp: 800,  pokeId: null, label: '800 XP' },
    goals: [
      { type: 'WIN_WITH', pokeId: 7,  count: 3, label: 'انتصر 3 مرات مع SQUIRTLE' },
      { type: 'USE_MOVE', moveId: 'SURF', count: 5, label: 'استخدم SURF 5 مرات' },
      { type: 'WIN_TYPE', typeTarget: 'FIRE', count: 5, label: 'اهزم 5 بوكيمون من نوع نار' },
    ],
  },

  // ── فصل 2: الكهوف المظلمة ─────────────────────────────────────────────────
  {
    id: 'ghost_hunter',
    name: 'صياد الأشباح',
    type: 'story',
    chapter: 2,
    reqRank: 'novice',
    image: null,
    reward: { xp: 1200, pokeId: null, label: '1200 XP' },
    goals: [
      { type: 'WIN_TYPE', typeTarget: 'GHOST',   count: 10, label: 'اهزم 10 بوكيمون من نوع روح' },
      { type: 'USE_MOVE', moveId: 'SHADOW BALL', count: 10, label: 'استخدم SHADOW BALL 10 مرات' },
      { type: 'WIN_STREAK', pokeId: 94, count: 3, label: 'انتصر 3 متتالي مع GENGAR' },
    ],
  },

  {
    id: 'electric_storm',
    name: 'العاصفة الكهربائية',
    type: 'story',
    chapter: 2,
    reqRank: 'novice',
    image: null,
    reward: { xp: 1200, pokeId: null, label: '1200 XP' },
    goals: [
      { type: 'WIN_WITH',  pokeId: 25,  count: 5,  label: 'انتصر 5 مرات مع PIKACHU' },
      { type: 'USE_MOVE',  moveId: 'THUNDER', count: 8, label: 'استخدم THUNDER 8 مرات' },
      { type: 'WIN_TYPE',  typeTarget: 'WATER', count: 8, label: 'اهزم 8 بوكيمون من نوع ماء' },
    ],
  },

  // ── فصل 3: عودة التنين ────────────────────────────────────────────────────
  {
    id: 'dragon_awakening',
    name: 'صحوة التنين',
    type: 'story',
    chapter: 3,
    reqRank: 'adept',
    image: null,
    reward: { xp: 2000, pokeId: null, label: '2000 XP' },
    goals: [
      { type: 'WIN_TYPE',  typeTarget: 'DRAGON', count: 10, label: 'اهزم 10 بوكيمون من نوع تنين' },
      { type: 'WIN_WITH',  pokeId: 149, count: 5, label: 'انتصر 5 مرات مع DRAGONITE' },
      { type: 'USE_MOVE',  moveId: 'DRAGON CLAW', count: 10, label: 'استخدم DRAGON CLAW 10 مرات' },
      { type: 'WIN_STREAK',pokeId: 149, count: 5, label: 'انتصر 5 متتالي مع DRAGONITE' },
    ],
  },

  {
    id: 'sea_terror',
    name: 'رعب البحر',
    type: 'story',
    chapter: 3,
    reqRank: 'adept',
    image: null,
    reward: { xp: 2000, pokeId: null, label: '2000 XP' },
    goals: [
      { type: 'WIN_WITH',  pokeId: 130, count: 5,  label: 'انتصر 5 مرات مع GYARADOS' },
      { type: 'USE_MOVE',  moveId: 'DRAGON DANCE', count: 8, label: 'استخدم DRAGON DANCE 8 مرات' },
      { type: 'WIN_TYPE',  typeTarget: 'FLYING',   count: 10, label: 'اهزم 10 بوكيمون من نوع طائر' },
      { type: 'WIN_STREAK',pokeId: 130, count: 5,  label: 'انتصر 5 متتالي مع GYARADOS' },
    ],
  },

  // ── فصل 4: قمة الخمسة (Five Kage Summit) ──────────────────────────────────
  {
    id: 'suicune_guardian',
    name: 'حارس السيوكون',
    type: 'story',
    chapter: 4,
    reqRank: 'expert',
    image: null,
    reward: { xp: 3000, pokeId: null, label: '3000 XP' },
    goals: [
      { type: 'WIN_STREAK', pokeId: 245, count: 5,  label: 'انتصر 5 متتالي مع SUICUNE' },
      { type: 'USE_MOVE',   moveId: 'BLIZZARD', count: 10, label: 'استخدم BLIZZARD 10 مرات' },
      { type: 'WIN_TYPE',   typeTarget: 'WATER', count: 20, label: 'اهزم 20 بوكيمون من نوع ماء' },
    ],
  },

  {
    id: 'dark_mountain',
    name: 'الجبل المظلم',
    type: 'story',
    chapter: 4,
    reqRank: 'expert',
    image: null,
    reward: { xp: 3000, pokeId: null, label: '3000 XP' },
    goals: [
      { type: 'WIN_STREAK', pokeId: 248, count: 5,  label: 'انتصر 5 متتالي مع TYRANITAR' },
      { type: 'USE_MOVE',   moveId: 'SANDSTORM', count: 8, label: 'استخدم SANDSTORM 8 مرات' },
      { type: 'WIN_TYPE',   typeTarget: 'DARK',  count: 15, label: 'اهزم 15 بوكيمون من نوع مظلم' },
      { type: 'USE_MOVE',   moveId: 'CRUNCH',    count: 15, label: 'استخدم CRUNCH 15 مرات' },
    ],
  },

  {
    id: 'iron_will',
    name: 'الإرادة الفولاذية',
    type: 'story',
    chapter: 4,
    reqRank: 'expert',
    image: null,
    reward: { xp: 3000, pokeId: null, label: '3000 XP' },
    goals: [
      { type: 'WIN_WITH',  pokeId: 376, count: 5,  label: 'انتصر 5 مرات مع METAGROSS' },
      { type: 'USE_MOVE',  moveId: 'METEOR MASH', count: 10, label: 'استخدم METEOR MASH 10 مرات' },
      { type: 'WIN_TYPE',  typeTarget: 'PSYCHIC',  count: 15, label: 'اهزم 15 بوكيمون من نوع نفسي' },
      { type: 'WIN_STREAK',pokeId: 376, count: 5,  label: 'انتصر 5 متتالي مع METAGROSS' },
    ],
  },

  // ── فصل 5: الأسطوريون ─────────────────────────────────────────────────────
  {
    id: 'sky_guardian',
    name: 'حارس السماء',
    type: 'legendary',
    chapter: 5,
    reqRank: 'master',
    image: null,
    reward: { xp: 5000, pokeId: null, label: '5000 XP' },
    goals: [
      { type: 'WIN_WITH',  pokeId: 249, count: 5,  label: 'انتصر 5 مرات مع LUGIA' },
      { type: 'USE_MOVE',  moveId: 'AEROBLAST',    count: 10, label: 'استخدم AEROBLAST 10 مرات' },
      { type: 'WIN_STREAK',pokeId: 249, count: 5,  label: 'انتصر 5 متتالي مع LUGIA' },
      { type: 'WIN_TYPE',  typeTarget: 'FLYING',   count: 20, label: 'اهزم 20 بوكيمون من نوع طائر' },
    ],
  },

  {
    id: 'rainbow_wings',
    name: 'أجنحة قوس قزح',
    type: 'legendary',
    chapter: 5,
    reqRank: 'master',
    image: null,
    reward: { xp: 5000, pokeId: null, label: '5000 XP' },
    goals: [
      { type: 'WIN_WITH',  pokeId: 250, count: 5,  label: 'انتصر 5 مرات مع HO-OH' },
      { type: 'USE_MOVE',  moveId: 'SACRED FIRE',  count: 10, label: 'استخدم SACRED FIRE 10 مرات' },
      { type: 'WIN_STREAK',pokeId: 250, count: 5,  label: 'انتصر 5 متتالي مع HO-OH' },
      { type: 'WIN_TYPE',  typeTarget: 'FIRE',     count: 20, label: 'اهزم 20 بوكيمون من نوع نار' },
    ],
  },

  {
    id: 'sky_dragon',
    name: 'تنين السماء',
    type: 'legendary',
    chapter: 5,
    reqRank: 'master',
    image: null,
    reward: { xp: 6000, pokeId: null, label: '6000 XP' },
    goals: [
      { type: 'WIN_STREAK', pokeId: 384, count: 5,  label: 'انتصر 5 متتالي مع RAYQUAZA' },
      { type: 'USE_MOVE',   moveId: 'OUTRAGE',      count: 10, label: 'استخدم OUTRAGE 10 مرات' },
      { type: 'WIN_TYPE',   typeTarget: 'DRAGON',   count: 20, label: 'اهزم 20 بوكيمون من نوع تنين' },
      { type: 'WIN_ANY',    count: 50, label: 'انتصر في 50 معركة إجمالي' },
    ],
  },

  {
    id: 'land_shark_legend',
    name: 'أسطورة القرش البري',
    type: 'legendary',
    chapter: 5,
    reqRank: 'master',
    image: null,
    reward: { xp: 6000, pokeId: null, label: '6000 XP' },
    goals: [
      { type: 'WIN_STREAK', pokeId: 445, count: 5,   label: 'انتصر 5 متتالي مع GARCHOMP' },
      { type: 'USE_MOVE',   moveId: 'DRACO METEOR',  count: 10, label: 'استخدم DRACO METEOR 10 مرات' },
      { type: 'USE_MOVE',   moveId: 'EARTHQUAKE',    count: 15, label: 'استخدم EARTHQUAKE 15 مرات' },
      { type: 'WIN_TYPE',   typeTarget: 'GROUND',    count: 15, label: 'اهزم 15 بوكيمون من نوع أرض' },
    ],
  },

  // ── فصل 6: نهاية العالم ───────────────────────────────────────────────────
  {
    id: 'shadow_world',
    name: 'العالم الظلي',
    type: 'legendary',
    chapter: 6,
    reqRank: 'legendary',
    image: null,
    reward: { xp: 8000, pokeId: null, label: '8000 XP' },
    goals: [
      { type: 'WIN_STREAK', pokeId: 487, count: 5,  label: 'انتصر 5 متتالي مع GIRATINA' },
      { type: 'USE_MOVE',   moveId: 'SHADOW FORCE', count: 15, label: 'استخدم SHADOW FORCE 15 مرات' },
      { type: 'WIN_TYPE',   typeTarget: 'GHOST',    count: 20, label: 'اهزم 20 بوكيمون من نوع روح' },
      { type: 'WIN_TYPE',   typeTarget: 'DRAGON',   count: 20, label: 'اهزم 20 بوكيمون من نوع تنين' },
    ],
  },

  {
    id: 'unova_legend',
    name: 'أسطورة يونوفا',
    type: 'legendary',
    chapter: 6,
    reqRank: 'legendary',
    image: null,
    reward: { xp: 8000, pokeId: null, label: '8000 XP' },
    goals: [
      { type: 'WIN_STREAK', pokeId: 643, count: 5, label: 'انتصر 5 متتالي مع RESHIRAM' },
      { type: 'WIN_STREAK', pokeId: 644, count: 5, label: 'انتصر 5 متتالي مع ZEKROM' },
      { type: 'USE_MOVE',   moveId: 'FUSION BOLT',  count: 10, label: 'استخدم FUSION BOLT 10 مرات' },
      { type: 'USE_MOVE',   moveId: 'FUSION FLARE', count: 10, label: 'استخدم FUSION FLARE 10 مرات' },
      { type: 'WIN_ANY',    count: 100, label: 'انتصر في 100 معركة إجمالي' },
    ],
  },
];

export const CHAPTER_LABELS = {
  1: '🌱 البداية',
  2: '🌑 الكهوف المظلمة',
  3: '🐉 عودة التنين',
  4: '⚔️ قمة الخمسة',
  5: '👑 الأسطوريون',
  6: '🌌 نهاية العالم',
};

export const MISSION_TYPE_COLORS = {
  story:     '#4FC3F7',
  legendary: '#FFD600',
};