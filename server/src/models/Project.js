const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'on_hold', 'completed', 'archived'], default: 'active' },
  startDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
}, { timestamps: true });

projectSchema.index({ workspaceId: 1, createdBy: 1 });
projectSchema.index({ name: 'text' });

module.exports = mongoose.model('Project', projectSchema);
