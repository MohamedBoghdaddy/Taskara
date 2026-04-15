const mongoose = require('mongoose');

const workspaceMemberSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now },
  routingProfile: {
    title: { type: String, default: '' },
    routingTags: { type: [String], default: [] },
    audienceTypes: { type: [String], default: [] },
    capacityWeight: { type: Number, default: 1 },
  },
});

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceMember', workspaceMemberSchema);
