const { PLANS } = require('../models/Subscription');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getPlatformAdminEmails = () => (
  String(process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)
);

const isPlatformAdminUser = (user) => (
  Boolean(user?.isPlatformAdmin) || getPlatformAdminEmails().includes(normalizeEmail(user?.email))
);

const ADMIN_PLAN_DEF = {
  ...PLANS.ai,
  name: 'Platform Admin',
  projectLimit: -1,
  workspaceLimit: -1,
  storageGB: -1,
};

const buildAdminSubscription = (user, workspaceId) => ({
  _id: 'platform-admin',
  workspaceId,
  userId: user?._id,
  plan: 'ai',
  effectivePlan: 'admin',
  status: 'active',
  isPlatformAdmin: true,
});

module.exports = {
  ADMIN_PLAN_DEF,
  buildAdminSubscription,
  getPlatformAdminEmails,
  isPlatformAdminUser,
  normalizeEmail,
};
