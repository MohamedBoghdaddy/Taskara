const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  entityType: { type: String, enum: ['note', 'task', 'project', 'database_record'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
}, { timestamps: true });

commentSchema.index({ entityId: 1, entityType: 1 });
commentSchema.index({ workspaceId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
