const mongoose = require('mongoose');

const databaseRecordSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  databaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'DatabaseDefinition', required: true },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

databaseRecordSchema.index({ workspaceId: 1, databaseId: 1 });

module.exports = mongoose.model('DatabaseRecord', databaseRecordSchema);
