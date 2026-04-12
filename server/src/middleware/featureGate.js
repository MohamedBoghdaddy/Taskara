/**
 * Feature gate middleware.
 * Usage: router.get('/advanced', authenticate, requireFeature('backlinks'), handler)
 */
const Subscription = require('../models/Subscription');

const requireFeature = (feature) => async (req, res, next) => {
  try {
    const workspaceId = req.user?.defaultWorkspaceId?.toString();
    if (!workspaceId) return next();

    const sub = await Subscription.findOne({ workspaceId });
    if (!sub) {
      // Default free plan — only basic features
      const freeFeatures = ['inbox','notes_basic','tasks_basic','today','pomodoro_basic','tags','search_basic','daily_notes','templates_limited','reminders_basic'];
      if (!freeFeatures.includes(feature)) {
        return res.status(402).json({
          error:    `Feature '${feature}' requires a paid plan`,
          code:     'FEATURE_GATED',
          feature,
          upgrade:  true,
        });
      }
      return next();
    }

    if (!sub.hasFeature(feature)) {
      return res.status(402).json({
        error:    `Feature '${feature}' requires a higher plan`,
        code:     'FEATURE_GATED',
        feature,
        currentPlan: sub.plan,
        upgrade:  true,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireFeature };
