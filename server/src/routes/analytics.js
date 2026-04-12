const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const focusService  = require('../services/focus/focusService');
const habitService  = require('../services/habits/habitService');
const { getTaskAnalytics, getFocusAnalytics, getDashboardStats } = require('../services/analytics/analyticsService');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

// GET /api/analytics/focus-score — today's focus score
router.get('/focus-score', authenticate, asyncHandler(async (req, res) => {
  const data = await focusService.computeFocusScore(req.user._id, getWorkspaceId(req));
  res.json(data);
}));

// GET /api/analytics/burnout — burnout risk
router.get('/burnout', authenticate, asyncHandler(async (req, res) => {
  const data = await focusService.detectBurnout(req.user._id, getWorkspaceId(req));
  res.json(data);
}));

// GET /api/analytics/weekly-trend — week-over-week
router.get('/weekly-trend', authenticate, asyncHandler(async (req, res) => {
  const data = await focusService.getWeeklyTrend(req.user._id, getWorkspaceId(req));
  res.json(data);
}));

// GET /api/analytics/habits — habit history
router.get('/habits', authenticate, asyncHandler(async (req, res) => {
  const days    = parseInt(req.query.days) || 30;
  const entries = await habitService.getHabitHistory(req.user._id, getWorkspaceId(req), days);
  const streak  = await habitService.getStreakSummary(req.user._id, getWorkspaceId(req));
  res.json({ entries, streak });
}));

// GET /api/analytics/tasks — task analytics
router.get('/tasks', authenticate, asyncHandler(async (req, res) => {
  const data = await getTaskAnalytics(getWorkspaceId(req), req.user._id, req.query);
  res.json(data);
}));

// GET /api/analytics/focus — focus/pomodoro analytics
router.get('/focus', authenticate, asyncHandler(async (req, res) => {
  const data = await getFocusAnalytics(getWorkspaceId(req), req.user._id, req.query);
  res.json(data);
}));

// GET /api/analytics/dashboard — dashboard stats
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
  const data = await getDashboardStats(getWorkspaceId(req), req.user._id);
  res.json(data);
}));

module.exports = router;
