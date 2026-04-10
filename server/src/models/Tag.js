const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#9CA3AF' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

tagSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
