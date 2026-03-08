const mongoose = require('mongoose');

const battleRecordSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:   { type: String, required: true },

  mode:       { type: String, enum: ['normal', 'tower'], default: 'normal' },
  result:     { type: String, enum: ['win', 'loss', 'draw'], required: true },

  // Team used
  myTeam:     [{ pokeId: Number, pokeName: String }],
  enemyTeam:  [{ pokeId: Number, pokeName: String }],

  // Tower specific
  towerStreak: { type: Number, default: 0 },

  // Stats for this battle
  damageDealt:  { type: Number, default: 0 },
  superEffHits: { type: Number, default: 0 },
  turnsPlayed:  { type: Number, default: 0 },

  xpEarned: { type: Number, default: 0 },

  playedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for fast leaderboard queries
battleRecordSchema.index({ userId: 1, playedAt: -1 });
battleRecordSchema.index({ towerStreak: -1 });

module.exports = mongoose.model('BattleRecord', battleRecordSchema);
