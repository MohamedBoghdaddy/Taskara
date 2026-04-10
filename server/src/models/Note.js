const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  dailyNoteDate: { type: Date, default: null },
  title: { type: String, required: true, trim: true },
  content: { type: mongoose.Schema.Types.Mixed, default: '' },
  contentText: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isTemplate: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  folderId: { type: String, default: null },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  linkedNoteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
}, { timestamps: true });

noteSchema.index({ workspaceId: 1, createdBy: 1 });
noteSchema.index({ workspaceId: 1, dailyNoteDate: 1 });
noteSchema.index({ workspaceId: 1, tags: 1 });
noteSchema.index({ contentText: 'text', title: 'text' });

module.exports = mongoose.model('Note', noteSchema);
