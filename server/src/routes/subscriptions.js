const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Subscription = require('../models/Subscription');
const { ADMIN_PLAN_DEF, buildAdminSubscription, isPlatformAdminUser } = require('../utils/platformAdmin');
const {
  getOrCreateSubscription,
  getUsageSummary,
  getVisiblePlans,
  normalizePlanKey,
} = require('../services/subscriptions/subscriptionUsageService');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// GET /api/subscriptions/current — get workspace plan
router.get('/current', authenticate, asyncHandler(async (req, res) => {
  if (isPlatformAdminUser(req.user)) {
    return res.json({
      subscription: buildAdminSubscription(req.user, getWorkspaceId(req)),
      planDef: ADMIN_PLAN_DEF,
      usage: {
        workflowsExecuted: { used: 0, limit: -1, remaining: -1, unlimited: true, percent: 0 },
        actionsExecuted: { used: 0, limit: -1, remaining: -1, unlimited: true, percent: 0 },
        integrationsConnected: { used: 0, limit: -1, remaining: -1, unlimited: true, percent: 0 },
      },
      isPlatformAdmin: true,
    });
  }

  const summary = await getUsageSummary(getWorkspaceId(req), req.user._id);
  res.json({
    subscription: summary.subscription,
    effectivePlan: summary.planKey,
    planDef: summary.planDef,
    usage: summary.limits,
    usageCounters: summary.usage,
    recommendations: summary.recommendations,
    isPlatformAdmin: false,
  });
}));

// GET /api/subscriptions/plans — list all plans
router.get('/plans', asyncHandler(async (req, res) => {
  res.json({ plans: getVisiblePlans() });
}));

// POST /api/subscriptions/upgrade — upgrade plan (mock for now)
router.post('/upgrade', authenticate, asyncHandler(async (req, res) => {
  if (isPlatformAdminUser(req.user)) {
    return res.json({
      subscription: buildAdminSubscription(req.user, getWorkspaceId(req)),
      planDef: ADMIN_PLAN_DEF,
      isPlatformAdmin: true,
    });
  }

  const requestedPlan = normalizePlanKey(req.body?.plan);
  const availablePlans = new Set(getVisiblePlans().map((plan) => plan.key));
  if (!availablePlans.has(requestedPlan)) return res.status(400).json({ error: 'Invalid plan' });

  const sub = await Subscription.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req) },
    { plan: requestedPlan, status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  );
  const summary = await getUsageSummary(getWorkspaceId(req), req.user._id);
  res.json({ subscription: sub, effectivePlan: summary.planKey, planDef: summary.planDef, usage: summary.limits });
}));

// GET /api/subscriptions/check/:feature — check if workspace has feature
router.get('/check/:feature', authenticate, asyncHandler(async (req, res) => {
  if (isPlatformAdminUser(req.user)) {
    return res.json({ allowed: true, plan: 'admin', isPlatformAdmin: true });
  }

  const sub = await getOrCreateSubscription(getWorkspaceId(req), req.user._id);
  if (!sub) return res.json({ allowed: req.params.feature === 'free' });
  res.json({ allowed: sub.hasFeature(req.params.feature), plan: normalizePlanKey(sub.plan), isPlatformAdmin: false });
}));

module.exports = router;
