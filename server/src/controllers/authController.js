const authService = require('../services/auth/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const { serializeUser } = require('../utils/serializeUser');

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
  res.json({ user: serializeUser(req.user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const updates = {};
  const allowed = ['name', 'avatarUrl', 'timezone', 'preferences'];
  allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-passwordHash -refreshTokens');
  res.json({ user: serializeUser(user) });
});

module.exports = { register, login, refresh, logout, getMe, updateProfile };
