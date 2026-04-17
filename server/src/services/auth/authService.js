const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Workspace = require('../../models/Workspace');
const WorkspaceMember = require('../../models/WorkspaceMember');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { serializeUserWithWorkspace } = require('../../utils/serializeUser');
const { DEFAULT_WORKSPACE_CONTEXT } = require('../workspaces/workspaceProfileService');

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const validateRegisterInput = ({ name, email, password } = {}) => {
  const trimmedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '');

  if (!trimmedName) {
    throw { status: 400, message: 'name is required' };
  }
  if (!normalizedEmail) {
    throw { status: 400, message: 'email is required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw { status: 400, message: 'email must be valid' };
  }
  if (!normalizedPassword) {
    throw { status: 400, message: 'password is required' };
  }
  if (normalizedPassword.length < 8) {
    throw { status: 400, message: 'password must be at least 8 characters' };
  }

  return {
    name: trimmedName,
    email: normalizedEmail,
    password: normalizedPassword,
  };
};

const validateLoginInput = ({ email, password } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '');

  if (!normalizedEmail) {
    throw { status: 400, message: 'email is required' };
  }
  if (!normalizedPassword) {
    throw { status: 400, message: 'password is required' };
  }

  return {
    email: normalizedEmail,
    password: normalizedPassword,
  };
};

const register = async ({ name, email, password }) => {
  const input = validateRegisterInput({ name, email, password });
  const existing = await User.findOne({ email: input.email });
  if (existing) throw { status: 409, message: 'Email already registered' };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });

  // Create default workspace
  const workspace = await Workspace.create({
    name: `${input.name}'s Workspace`,
    ownerId: user._id,
    memberIds: [user._id],
    ...DEFAULT_WORKSPACE_CONTEXT,
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
    user: await serializeUserWithWorkspace(user),
    accessToken,
    refreshToken,
    workspace,
  };
};

const login = async ({ email, password }) => {
  const input = validateLoginInput({ email, password });
  const user = await User.findOne({ email: input.email });
  if (!user) throw { status: 401, message: 'Invalid credentials' };

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) user.refreshTokens = user.refreshTokens.slice(-5);
  await user.save();

  return {
    user: await serializeUserWithWorkspace(user),
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
