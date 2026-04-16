const { isPlatformAdminUser } = require('./platformAdmin');
const { DEFAULT_WORKSPACE_CONTEXT, getWorkspaceContextById } = require('../services/workspaces/workspaceProfileService');

const serializeUser = (user, workspaceContext = DEFAULT_WORKSPACE_CONTEXT) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  timezone: user.timezone,
  preferences: user.preferences,
  defaultWorkspaceId: user.defaultWorkspaceId,
  workspaceContext,
  isPlatformAdmin: isPlatformAdminUser(user),
});

const serializeUserWithWorkspace = async (user) => {
  const workspaceContext = await getWorkspaceContextById(user?.defaultWorkspaceId);
  return serializeUser(user, workspaceContext);
};

module.exports = { serializeUser, serializeUserWithWorkspace };
