const mongoose = require('mongoose');

const SprintSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  goal:        { type: String, default: '' },
  status:      { type: String, enum: ['pending','active','completed'], default: 'pending' },
  startDate:   { type: Date },
  endDate:     { type: Date },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date },
  velocity:    { type: Number, default: 0 }, // story points completed
}, { timestamps: true, toJSON: { virtuals: true } });

// Virtual: tasks in this sprint
SprintSchema.virtual('tasks', {
  ref:          'Task',
  localField:   '_id',
  foreignField: 'sprintId',
});

SprintSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('Sprint', SprintSchema);
