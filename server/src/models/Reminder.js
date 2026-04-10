const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entityType: { type: String, enum: ['task', 'note', 'project', 'custom'], default: 'custom' },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  remindAt: { type: Date, required: true },
  channel: { type: String, enum: ['in_app', 'email'], default: 'in_app' },
  status: { type: String, enum: ['scheduled', 'sent', 'dismissed', 'cancelled'], default: 'scheduled' },
}, { timestamps: true });

reminderSchema.index({ userId: 1, remindAt: 1, status: 1 });
reminderSchema.index({ workspaceId: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
