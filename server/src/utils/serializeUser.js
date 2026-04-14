const { isPlatformAdminUser } = require('./platformAdmin');

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  timezone: user.timezone,
  preferences: user.preferences,
  defaultWorkspaceId: user.defaultWorkspaceId,
  isPlatformAdmin: isPlatformAdminUser(user),
});

module.exports = { serializeUser };
