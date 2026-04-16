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

const sendJson = (res, payload, status = 200) => res.status(status).json(payload);

const sendSerializedUser = async (res, user, status = 200) =>
  sendJson(res, { user: await serializeUserWithWorkspace(user) }, status);

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendJson(res, result, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendJson(res, result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendJson(res, { error: 'Refresh token required' }, 400);
  const result = await authService.refresh(refreshToken);
  return sendJson(res, result);
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.user._id, refreshToken);
  return sendJson(res, { success: true, message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  return sendSerializedUser(res, req.user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    pickProfileUpdates(req.body),
    { new: true, runValidators: true },
  ).select('-passwordHash -refreshTokens');
  return sendSerializedUser(res, user);
});

module.exports = { register, login, refresh, logout, getMe, updateProfile };
