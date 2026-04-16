const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  feature: {
    type: String,
    enum: [
      'task_extraction',
      'summary',
      'rewrite',
      'planning',
      'workspace_qa',
      'template_gen',
      'meeting_to_tasks',
      'prioritization',
      'voice_to_task',
      'daily_brief',
      'agency_content_ideas',
      'agency_content_calendar',
      'agency_report_summary',
      'realestate_listing_description',
      'realestate_lead_match',
      'realestate_conversation_summary',
      'realestate_owner_update',
    ],
    required: true,
  },
  inputRef: {
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
  },
  promptVersion: { type: String, default: 'v1' },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  response: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

aiLogSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model('AiLog', aiLogSchema);
