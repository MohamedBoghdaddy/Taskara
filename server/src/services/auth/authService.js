const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Workspace = require('../../models/Workspace');
const WorkspaceMember = require('../../models/WorkspaceMember');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { serializeUser } = require('../../utils/serializeUser');

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw { status: 409, message: 'Email already registered' };

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });

  // Create default workspace
  const workspace = await Workspace.create({
    name: `${name}'s Workspace`,
    ownerId: user._id,
    memberIds: [user._id],
  });

  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId: user._id,
    role: 'owner',
  });

  user.defaultWorkspaceId = workspace._id;
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push(refreshToken);
  await user.save();

  return {
    user: serializeUser(user),
    accessToken,
    refreshToken,
    workspace,
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw { status: 401, message: 'Invalid credentials' };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
  await user.save();

  return {
    user: serializeUser(user),
    accessToken,
    refreshToken,
  };
};

const refresh = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.userId);
  if (!user || !user.refreshTokens.includes(token)) {
    throw { status: 401, message: 'Invalid refresh token' };
  }

  const accessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshTokens = user.refreshTokens.filter(t => t !== token);
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (userId, refreshToken) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    await user.save();
  }
};

module.exports = { register, login, refresh, logout };
