const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  fromType: { type: String, enum: ['note', 'task', 'project', 'database_record'], required: true },
  fromId: { type: mongoose.Schema.Types.ObjectId, required: true },
  toType: { type: String, enum: ['note', 'task', 'project', 'database_record'], required: true },
  toId: { type: mongoose.Schema.Types.ObjectId, required: true },
  relationType: { type: String, enum: ['reference', 'derived_from', 'related_to', 'blocks', 'supports'], default: 'reference' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

linkSchema.index({ workspaceId: 1, fromId: 1 });
linkSchema.index({ workspaceId: 1, toId: 1 });

module.exports = mongoose.model('Link', linkSchema);
