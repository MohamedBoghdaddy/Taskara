const pomodoroService = require('../services/pomodoro/pomodoroService');
const habitService    = require('../services/habits/habitService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const startSession = asyncHandler(async (req, res) => {
  const session = await pomodoroService.startSession(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(session);
});

const stopSession = asyncHandler(async (req, res) => {
  const session = await pomodoroService.stopSession(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(session);

  // After completing a focus session, update habit data (fire and forget)
  if (req.body.status === 'completed') {
    habitService.recordDailyHabit(req.user._id, getWorkspaceId(req)).catch(() => {});
  }
});

const getHistory = asyncHandler(async (req, res) => {
  const result = await pomodoroService.getHistory(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

const getActive = asyncHandler(async (req, res) => {
  const session = await pomodoroService.getActiveSession(getWorkspaceId(req), req.user._id);
  res.json(session);
});

module.exports = { startSession, stopSession, getHistory, getActive };
