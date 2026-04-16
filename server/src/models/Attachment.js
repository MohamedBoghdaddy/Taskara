const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  entityType:   {
    type: String,
    enum: [
      'Task',
      'Card',
      'Note',
      'User',
      'Audio',
      'Campaign',
      'ContentItem',
      'ClientReport',
      'Property',
      'Deal',
      'Settlement',
    ],
    default: 'Task',
  },
  entityId:     { type: mongoose.Schema.Types.ObjectId, default: null },
  filename:     { type: String, required: true },   // stored filename on disk
  originalName: { type: String, required: true },   // original upload name
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },   // bytes
  path:         { type: String, required: true },   // absolute disk path
  url:          { type: String, required: true },   // public URL
}, { timestamps: true });

attachmentSchema.index({ entityId: 1, entityType: 1 });
attachmentSchema.index({ workspaceId: 1 });
attachmentSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Attachment', attachmentSchema);
