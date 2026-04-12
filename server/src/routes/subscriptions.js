const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Subscription = require('../models/Subscription');
const { PLANS }    = require('../models/Subscription');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// GET /api/subscriptions/current — get workspace plan
router.get('/current', authenticate, asyncHandler(async (req, res) => {
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
  res.json({ subscription: sub, planDef: PLANS[sub.plan] });
}));

// GET /api/subscriptions/plans — list all plans
router.get('/plans', asyncHandler(async (req, res) => {
  res.json({ plans: PLANS });
}));

// POST /api/subscriptions/upgrade — upgrade plan (mock for now)
router.post('/upgrade', authenticate, asyncHandler(async (req, res) => {
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
  const sub = await Subscription.findOne({ workspaceId: getWorkspaceId(req) });
  if (!sub) return res.json({ allowed: req.params.feature === 'free' });
  res.json({ allowed: sub.hasFeature(req.params.feature), plan: sub.plan });
}));

module.exports = router;
