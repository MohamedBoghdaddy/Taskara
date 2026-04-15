/**
 * Subscription — tracks each workspace's current plan.
 * Plans are workflow-volume based rather than seat-only.
 */
const mongoose = require('mongoose');

const PLANS = {
  free: {
    name:           'Workflow Free',
    price:          0,
    priceLabel:     '$0',
    billingPeriod:  'month',
    workflowLimit:  15,
    actionLimit:    60,
    integrationLimit: 1,
    seatGuidance:   '1 operator',
    autoExecution:  false,
    manualApprovalsRequired: true,
    projectLimit:   1,
    workspaceLimit: 1,
    storageGB:      0.1,
    features: [
      'inbox','notes_basic','tasks_basic','today','pomodoro_basic','tags','search_basic','daily_notes',
      'templates_limited','reminders_basic','workflow_core','workflow_demo_mode','workflow_manual_approvals',
      'workflow_usage_meter'
    ],
    blocked:  [
      'backlinks','graph','databases','collaboration','ai','advanced_analytics','boards','sprints','timeline',
      'canvas','webhooks','automations','version_history','csv_export','workflow_auto_execution',
      'workflow_advanced_analytics','workflow_priority_execution'
    ],
  },
  pro: {
    name:           'Workflow Pro',
    price:          79,
    priceLabel:     '$79',
    billingPeriod:  'month',
    workflowLimit:  250,
    actionLimit:    1200,
    integrationLimit: 3,
    seatGuidance:   'up to 3 operators',
    autoExecution:  true,
    manualApprovalsRequired: false,
    projectLimit:   -1, // unlimited
    workspaceLimit: 3,
    storageGB:      5,
    features: [
      'inbox','notes','tasks','today','pomodoro','tags','search','daily_notes','templates','reminders','backlinks',
      'graph','calendar','databases_limited','custom_views','analytics','focus_reports','workflow_core',
      'workflow_auto_execution','workflow_usage_meter','workflow_analytics','workflow_priority_execution'
    ],
    blocked:  ['collaboration','ai','sprints','timeline','canvas','webhooks','automations','teamspaces'],
  },
  team: {
    name:           'Workflow Team',
    price:          249,
    priceLabel:     '$249',
    billingPeriod:  'month',
    workflowLimit:  1500,
    actionLimit:    8000,
    integrationLimit: 8,
    seatGuidance:   'multi-user team',
    autoExecution:  true,
    manualApprovalsRequired: false,
    projectLimit:   -1,
    workspaceLimit: -1,
    storageGB:      20,
    features: [
      'inbox','notes','tasks','today','pomodoro','tags','search','daily_notes','templates','reminders','backlinks',
      'graph','calendar','databases','custom_views','analytics','focus_reports','collaboration','boards','sprints',
      'automations','teamspaces','timeline','csv_export','webhooks','workflow_core','workflow_auto_execution',
      'workflow_usage_meter','workflow_analytics','workflow_priority_execution','workflow_team_routing'
    ],
    blocked:  ['ai'],
  },
  enterprise: {
    name:           'Workflow Enterprise',
    price:          999,
    priceLabel:     'Custom',
    billingPeriod:  'month',
    workflowLimit:  -1,
    actionLimit:    -1,
    integrationLimit: -1,
    seatGuidance:   'custom',
    autoExecution:  true,
    manualApprovalsRequired: false,
    projectLimit:   -1,
    workspaceLimit: -1,
    storageGB:      50,
    features: ['*'], // all features
    blocked:  [],
  },
  ai: {
    name:           'Workflow Enterprise',
    price:          999,
    priceLabel:     'Custom',
    billingPeriod:  'month',
    workflowLimit:  -1,
    actionLimit:    -1,
    integrationLimit: -1,
    seatGuidance:   'custom',
    autoExecution:  true,
    manualApprovalsRequired: false,
    projectLimit:   -1,
    workspaceLimit: -1,
    storageGB:      50,
    features: ['*'],
    blocked:  [],
  },
};

const subscriptionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:        { type: String, enum: Object.keys(PLANS), default: 'free' },
  status:      { type: String, enum: ['active','trialing','past_due','cancelled'], default: 'active' },
  trialEndsAt: { type: Date, default: null },
  currentPeriodEnd: { type: Date, default: null },
  stripeCustomerId:     { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  cancelAtPeriodEnd:    { type: Boolean, default: false },
}, { timestamps: true });

subscriptionSchema.methods.hasFeature = function (feature) {
  const planDef = PLANS[this.plan];
  if (!planDef) return false;
  if (planDef.features.includes('*')) return true;
  if (planDef.blocked.includes(feature)) return false;
  return planDef.features.includes(feature);
};

subscriptionSchema.methods.getPlanDef = function () {
  return PLANS[this.plan];
};

// workspaceId is already indexed by unique:true in the field definition above — no duplicate needed

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
module.exports.PLANS = PLANS;
