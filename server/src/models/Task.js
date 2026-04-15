const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['inbox', 'todo', 'in_progress', 'blocked', 'done', 'archived'],
    default: 'inbox',
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  startDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  estimateMinutes: { type: Number, default: 0 },
  actualMinutes: { type: Number, default: 0 },
  assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  subtaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  linkedNoteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  recurrence: {
    enabled:         { type: Boolean, default: false },
    rule:            { type: String, default: '' },       // 'daily'|'weekly'|'monthly'|'weekdays'
    nextOccurrence:  { type: Date,    default: null },
    lastCreated:     { type: Date,    default: null },
  },
  // Sprint / Scrum
  sprintId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
  estimatedPoints:  { type: Number, default: 0 },         // story points
  // Pomodoro
  estimatedPomodoros: { type: Number, default: 0 },
  completedPomodoros: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

taskSchema.index({ workspaceId: 1, createdBy: 1, status: 1 });
taskSchema.index({ workspaceId: 1, dueDate: 1 });
taskSchema.index({ workspaceId: 1, projectId: 1 });
taskSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Task', taskSchema);
