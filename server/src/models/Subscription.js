/**
 * Subscription — tracks each workspace's current plan.
 * Plans: free | pro | team | ai
 */
const mongoose = require('mongoose');

const PLANS = {
  free: {
    name:           'Personal Starter',
    price:          0,
    projectLimit:   1,
    workspaceLimit: 1,
    storageGB:      0.1,
    features: ['inbox','notes_basic','tasks_basic','today','pomodoro_basic','tags','search_basic','daily_notes','templates_limited','reminders_basic'],
    blocked:  ['backlinks','graph','databases','collaboration','ai','advanced_analytics','boards','sprints','timeline','canvas','webhooks','automations','version_history','csv_export'],
  },
  pro: {
    name:           'Power User',
    price:          10,
    projectLimit:   -1, // unlimited
    workspaceLimit: 3,
    storageGB:      5,
    features: ['inbox','notes','tasks','today','pomodoro','tags','search','daily_notes','templates','reminders','backlinks','graph','calendar','databases_limited','custom_views','analytics','focus_reports'],
    blocked:  ['collaboration','ai','sprints','timeline','canvas','webhooks','automations','teamspaces'],
  },
  team: {
    name:           'Collaboration',
    price:          18,
    projectLimit:   -1,
    workspaceLimit: -1,
    storageGB:      20,
    features: ['inbox','notes','tasks','today','pomodoro','tags','search','daily_notes','templates','reminders','backlinks','graph','calendar','databases','custom_views','analytics','focus_reports','collaboration','boards','sprints','automations','teamspaces','timeline','csv_export','webhooks'],
    blocked:  ['ai'],
  },
  ai: {
    name:           'Intelligence Layer',
    price:          25,
    projectLimit:   -1,
    workspaceLimit: -1,
    storageGB:      50,
    features: ['*'], // all features
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

subscriptionSchema.index({ workspaceId: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
module.exports.PLANS = PLANS;
