const mongoose = require('mongoose');

const goalProgressSchema = new mongoose.Schema({
  goalIndex: { type: Number, required: true },
  current:   { type: Number, default: 0 },
}, { _id: false });

const userMissionSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  missionId:    { type: String, required: true },
  goalProgress: { type: [Number], default: [] },
  completed:    { type: Boolean, default: false },
  completedAt:  { type: Date,    default: null },
}, {
  timestamps: true,
});

userMissionSchema.index({ userId: 1, missionId: 1 }, { unique: true });

module.exports = mongoose.model('UserMission', userMissionSchema);