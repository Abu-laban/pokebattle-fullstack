const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

// ── Battle Stats sub-schema ────────────────────────────────────────────────
const battleStatsSchema = new mongoose.Schema({
  wins:          { type: Number, default: 0 },
  losses:        { type: Number, default: 0 },
  draws:         { type: Number, default: 0 },
  totalDamage:   { type: Number, default: 0 },
  superEffHits:  { type: Number, default: 0 },
  towerBest:     { type: Number, default: 0 },
  favPoke:       { type: String, default: null },
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
  password: { type: String, minlength: 6, select: false },

  // ── Email verification ────────────────────────────────────────────────
  isVerified:         { type: Boolean, default: false },
  verifyToken:        { type: String, select: false },
  verifyTokenExpires: { type: Date,   select: false },

  // ── OAuth providers ───────────────────────────────────────────────────
  googleId:   { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },
  auth0Id:    { type: String, unique: true, sparse: true },
  avatar:     { type: String, default: null },
  provider:   { type: String, default: 'local' },
  facebookId: { type: String, unique: true, sparse: true },
  avatar:     { type: String, default: null },
  provider:   { type: String, default: 'local' },

  // ── Progress ──────────────────────────────────────────────────────────
  xp:    { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  // ── Battle statistics ─────────────────────────────────────────────────
  stats: { type: battleStatsSchema, default: () => ({}) },

  // ── Achievements ──────────────────────────────────────────────────────
  achievements: [{ type: String }],

  // ── Local gameplay stats (poke usage & type wins) ────────────────────────
  winsWithPoke: { type: Map, of: Number, default: {} },
  winsByType:   { type: Map, of: Number, default: {} },

  lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

// ── Hash password before save ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Generate email verification token ─────────────────────────────────────
userSchema.methods.createVerifyToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verifyToken        = crypto.createHash('sha256').update(token).digest('hex');
  this.verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return token; // raw token sent in email
};

// ── Level up logic ─────────────────────────────────────────────────────────
userSchema.methods.addXP = function (amount) {
  this.xp += amount;
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

// ── Public profile ─────────────────────────────────────────────────────────
userSchema.methods.toPublic = function () {
  return {
    id:           this._id,
    username:     this.username,
    email:        this.email,
    avatar:       this.avatar,
    provider:     this.provider,
    isVerified:   this.isVerified,
    xp:           this.xp,
    level:        this.level,
    stats:        this.stats,
    achievements: this.achievements,
    winsWithPoke: this.winsWithPoke ? Object.fromEntries(this.winsWithPoke) : {},
    winsByType:   this.winsByType   ? Object.fromEntries(this.winsByType)   : {},
    createdAt:    this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);