const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  columnId:    { type: String, required: true },
  order:       { type: Number, default: 0 },
  priority:    { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  dueDate:     { type: Date },
  assignees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  labels:      [{ type: String }],
  checklist:   [{
    text:      { type: String },
    done:      { type: Boolean, default: false },
  }],
  attachments: [{
    name: String, url: String, type: String,
  }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const ColumnSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  color: { type: String, default: null },
  limit: { type: Number, default: null }, // WIP limit
});

const BoardSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  color:       { type: String, default: '#6366F1' },
  icon:        { type: String, default: null },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  columns:     { type: [ColumnSchema], default: [
    { id: 'todo',        title: 'To Do',       order: 0 },
    { id: 'inprogress',  title: 'In Progress',  order: 1 },
    { id: 'review',      title: 'In Review',    order: 2 },
    { id: 'done',        title: 'Done',         order: 3 },
  ]},
  cards:       [CardSchema],
  isArchived:  { type: Boolean, default: false },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
}, { timestamps: true });

BoardSchema.index({ workspaceId: 1, isArchived: 1 });
BoardSchema.index({ workspaceId: 1, 'cards.assignees': 1 });

module.exports = mongoose.model('Board', BoardSchema);
