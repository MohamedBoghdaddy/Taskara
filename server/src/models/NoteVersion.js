const mongoose = require('mongoose');

const noteVersionSchema = new mongoose.Schema({
  noteId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  savedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, default: '' },
  content:     { type: mongoose.Schema.Types.Mixed }, // TipTap JSON
  versionNum:  { type: Number, default: 1 },
  label:       { type: String, default: '' }, // optional manual label e.g. "Before rewrite"
}, { timestamps: true });

noteVersionSchema.index({ noteId: 1, versionNum: -1 });
noteVersionSchema.index({ workspaceId: 1 });

module.exports = mongoose.model('NoteVersion', noteVersionSchema);
