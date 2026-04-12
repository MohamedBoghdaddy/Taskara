const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const habitService     = require('../services/habits/habitService');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

// GET /api/habits — habit history (days=30)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const days    = parseInt(req.query.days) || 30;
  const entries = await habitService.getHabitHistory(req.user._id, getWorkspaceId(req), days);
  res.json({ entries });
}));

// GET /api/habits/streak — current + best streak
router.get('/streak', authenticate, asyncHandler(async (req, res) => {
  const summary = await habitService.getStreakSummary(req.user._id, getWorkspaceId(req));
  res.json(summary);
}));

// POST /api/habits/record — manually trigger today's recording
router.post('/record', authenticate, asyncHandler(async (req, res) => {
  const entry = await habitService.recordDailyHabit(req.user._id, getWorkspaceId(req));
  res.json(entry);
}));

module.exports = router;
