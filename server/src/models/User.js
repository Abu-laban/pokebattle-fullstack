const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Battle Stats sub-schema ────────────────────────────────────────────────
const battleStatsSchema = new mongoose.Schema({
  wins:          { type: Number, default: 0 },
  losses:        { type: Number, default: 0 },
  draws:         { type: Number, default: 0 },
  totalDamage:   { type: Number, default: 0 },
  superEffHits:  { type: Number, default: 0 },
  towerBest:     { type: Number, default: 0 },   // highest tower streak
  favPoke:       { type: String, default: null }, // most used pokémon name
}, { _id: false });

// ── Main User schema ───────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, minlength: 3, maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/,
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
  },
  password: {
    type: String, required: true, minlength: 6, select: false,
  },

  // ── Progress ──────────────────────────────────────────────────────────
  xp:    { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  // ── Battle statistics ─────────────────────────────────────────────────
  stats: { type: battleStatsSchema, default: () => ({}) },

  // ── Achievements (array of id strings) ───────────────────────────────
  achievements: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

// ── Hash password before save ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Level up logic ─────────────────────────────────────────────────────────
userSchema.methods.addXP = function (amount) {
  this.xp += amount;
  // Level formula: each level needs level * 100 XP
  while (this.xp >= this.level * 100) {
    this.xp    -= this.level * 100;
    this.level += 1;
  }
  return this.level;
};

// ── Compare password ───────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Public profile (no password) ──────────────────────────────────────────
userSchema.methods.toPublic = function () {
  return {
    id:           this._id,
    username:     this.username,
    xp:           this.xp,
    level:        this.level,
    stats:        this.stats,
    achievements: this.achievements,
    createdAt:    this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
