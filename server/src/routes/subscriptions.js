const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Subscription = require('../models/Subscription');
const { PLANS }    = require('../models/Subscription');
const { ADMIN_PLAN_DEF, buildAdminSubscription, isPlatformAdminUser } = require('../utils/platformAdmin');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// GET /api/subscriptions/current — get workspace plan
router.get('/current', authenticate, asyncHandler(async (req, res) => {
  if (isPlatformAdminUser(req.user)) {
    return res.json({
      subscription: buildAdminSubscription(req.user, getWorkspaceId(req)),
      planDef: ADMIN_PLAN_DEF,
      isPlatformAdmin: true,
    });
  }

  let sub = await Subscription.findOne({ workspaceId: getWorkspaceId(req) });
  if (!sub) {
    // Auto-create free plan
    sub = await Subscription.create({
      workspaceId: getWorkspaceId(req),
      userId:      req.user._id,
      plan:        'free',
      status:      'active',
    });
  }
  res.json({ subscription: sub, planDef: PLANS[sub.plan], isPlatformAdmin: false });
}));

// GET /api/subscriptions/plans — list all plans
router.get('/plans', asyncHandler(async (req, res) => {
  res.json({ plans: PLANS });
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

  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  const sub = await Subscription.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req) },
    { plan, status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  );
  res.json({ subscription: sub, planDef: PLANS[plan] });
}));

// GET /api/subscriptions/check/:feature — check if workspace has feature
router.get('/check/:feature', authenticate, asyncHandler(async (req, res) => {
  if (isPlatformAdminUser(req.user)) {
    return res.json({ allowed: true, plan: 'admin', isPlatformAdmin: true });
  }

  const sub = await Subscription.findOne({ workspaceId: getWorkspaceId(req) });
  if (!sub) return res.json({ allowed: req.params.feature === 'free' });
  res.json({ allowed: sub.hasFeature(req.params.feature), plan: sub.plan, isPlatformAdmin: false });
}));

module.exports = router;
