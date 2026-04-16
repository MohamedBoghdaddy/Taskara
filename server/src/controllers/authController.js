const authService = require('../services/auth/authService');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { serializeUserWithWorkspace } = require('../utils/serializeUser');

const PROFILE_UPDATE_FIELDS = ['name', 'avatarUrl', 'timezone', 'preferences'];

const pickProfileUpdates = (body = {}) =>
  PROFILE_UPDATE_FIELDS.reduce((updates, key) => {
    if (body[key] !== undefined) updates[key] = body[key];
    return updates;
  }, {});

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  const result = await authService.refresh(refreshToken);
  res.json(result);
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.user._id, refreshToken);
  res.json({ message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ user: await serializeUserWithWorkspace(req.user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    pickProfileUpdates(req.body),
    { new: true, runValidators: true },
  ).select('-passwordHash -refreshTokens');
  res.json({ user: await serializeUserWithWorkspace(user) });
});

module.exports = { register, login, refresh, logout, getMe, updateProfile };
