const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['private', 'shared'], default: 'private' },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
}, { timestamps: true });

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ memberIds: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
