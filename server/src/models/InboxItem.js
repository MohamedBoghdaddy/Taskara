const mongoose = require('mongoose');

const inboxItemSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['note', 'task', 'idea', 'link', 'reminder'], default: 'idea' },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  status: { type: String, enum: ['unprocessed', 'processed', 'archived'], default: 'unprocessed' },
  convertedEntityType: { type: String, enum: ['note', 'task', 'project', null], default: null },
  convertedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
}, { timestamps: true });

inboxItemSchema.index({ workspaceId: 1, createdBy: 1, status: 1 });

module.exports = mongoose.model('InboxItem', inboxItemSchema);
