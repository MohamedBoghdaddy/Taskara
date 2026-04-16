const mongoose = require('mongoose');
const { normalizeVerticalKey } = require('../config/verticals');

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['private', 'shared'], default: 'private' },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  vertical: {
    type: String,
    // Keep the legacy "students" value readable during the stabilization window,
    // but all new writes should use the canonical "student" value.
    enum: ['core', 'recruiters', 'agencies', 'realestate', 'startups', 'insurance', 'student', 'students'],
    default: 'core',
    set: (value) => normalizeVerticalKey(value, value),
  },
  surfaceMode: {
    type: String,
    enum: ['operator', 'student'],
    default: 'operator',
  },
  featureProfile: {
    type: String,
    enum: [
      'core',
      'recruiter_execution',
      'agency_operations',
      'realestate_operations',
      'startup_execution',
      'insurance_pilot',
      'student_survival',
    ],
    default: 'core',
  },
  trustProfile: {
    type: String,
    enum: ['operator', 'compliance', 'student'],
    default: 'operator',
  },
}, { timestamps: true });

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ memberIds: 1 });
workspaceSchema.index({ vertical: 1, surfaceMode: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
