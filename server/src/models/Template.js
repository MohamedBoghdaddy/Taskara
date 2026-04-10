const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  type: { type: String, enum: ['note', 'daily_note', 'task', 'project', 'database'], required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  content: { type: mongoose.Schema.Types.Mixed, default: '' },
  defaultValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

templateSchema.index({ workspaceId: 1, type: 1 });

module.exports = mongoose.model('Template', templateSchema);
