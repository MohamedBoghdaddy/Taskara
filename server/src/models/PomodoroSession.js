const mongoose = require('mongoose');

const pomodoroSessionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  type: { type: String, enum: ['focus', 'short_break', 'long_break'], default: 'focus' },
  plannedMinutes: { type: Number, required: true },
  actualMinutes: { type: Number, default: 0 },
  elapsedSeconds: { type: Number, default: 0 },
  remainingSeconds: { type: Number, default: null },
  status: { type: String, enum: ['active', 'paused', 'completed', 'interrupted', 'cancelled'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  pausedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  notes: { type: String, default: null },
}, { timestamps: true });

pomodoroSessionSchema.index({ workspaceId: 1, userId: 1, startedAt: -1 });
pomodoroSessionSchema.index({ userId: 1, taskId: 1 });

module.exports = mongoose.model('PomodoroSession', pomodoroSessionSchema);
