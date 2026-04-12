/**
 * AutomationRule — defines trigger → action workflows.
 * Example: when card.status == "done" → task.status = "done"
 */
const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  active:      { type: Boolean, default: true },
  trigger: {
    event:  { type: String, required: true }, // e.g. 'card.moved', 'task.status_changed', 'due_date.reached'
    filter: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { toColumn: 'Done' }
  },
  actions: [{
    type:   { type: String, required: true }, // 'set_field', 'move_card', 'assign_user', 'create_task', 'send_notification', 'webhook'
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  runCount:    { type: Number, default: 0 },
  lastRunAt:   { type: Date, default: null },
  errorCount:  { type: Number, default: 0 },
  lastError:   { type: String, default: null },
}, { timestamps: true });

automationRuleSchema.index({ workspaceId: 1, active: 1 });
automationRuleSchema.index({ 'trigger.event': 1, workspaceId: 1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
