const mongoose = require('mongoose');

const databaseDefinitionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: null },
  description: { type: String, default: '' },
  fields: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'checkbox', 'select', 'multi_select', 'relation', 'status', 'url', 'email', 'phone'], required: true },
    required: { type: Boolean, default: false },
    options: [{ label: String, value: String, color: String }],
    relationTarget: { type: String, default: null },
  }],
  views: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['table', 'board', 'calendar', 'list', 'gallery'], default: 'table' },
    filters: [{ field: String, operator: String, value: mongoose.Schema.Types.Mixed }],
    sorts: [{ field: String, direction: String }],
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

databaseDefinitionSchema.index({ workspaceId: 1 });

module.exports = mongoose.model('DatabaseDefinition', databaseDefinitionSchema);
