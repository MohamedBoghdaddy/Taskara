const mongoose = require('mongoose');
const crypto   = require('crypto');

const webhookSubscriptionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url:         { type: String, required: true },
  secret:      { type: String, default: () => crypto.randomBytes(24).toString('hex') },
  events: {
    type: [String],
    default: ['task.created', 'task.updated', 'task.completed'],
    validate: {
      validator: (arr) => arr.every(e => VALID_EVENTS.includes(e)),
      message:   'Invalid event type',
    },
  },
  active:      { type: Boolean, default: true },
  description: { type: String, default: '' },
  lastTriggeredAt: { type: Date, default: null },
  deliveryCount:   { type: Number, default: 0 },
  failureCount:    { type: Number, default: 0 },
}, { timestamps: true });

const VALID_EVENTS = [
  'task.created', 'task.updated', 'task.completed', 'task.deleted',
  'note.created', 'note.updated', 'note.deleted',
  'card.created', 'card.moved', 'card.updated',
  'sprint.started', 'sprint.completed',
  'project.created', 'project.updated',
  'member.invited', 'member.joined',
];

webhookSubscriptionSchema.index({ workspaceId: 1, active: 1 });

module.exports = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);
module.exports.VALID_EVENTS = VALID_EVENTS;
