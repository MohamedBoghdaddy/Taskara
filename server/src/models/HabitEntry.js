const mongoose = require('mongoose');

const habitEntrySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  date:           { type: String, required: true }, // 'YYYY-MM-DD'
  pomodoroCount:  { type: Number, default: 0 },
  focusMinutes:   { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  streak:         { type: Number, default: 0 },     // consecutive days with ≥1 session
}, { timestamps: true });

habitEntrySchema.index({ userId: 1, date: 1 }, { unique: true });
habitEntrySchema.index({ workspaceId: 1, userId: 1 });

module.exports = mongoose.model('HabitEntry', habitEntrySchema);
