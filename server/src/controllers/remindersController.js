const remindersService = require('../services/reminders/remindersService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getReminders = asyncHandler(async (req, res) => {
  const reminders = await remindersService.getReminders(getWorkspaceId(req), req.user._id, req.query);
  res.json(reminders);
});

const createReminder = asyncHandler(async (req, res) => {
  const reminder = await remindersService.createReminder(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(reminder);
});

const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await remindersService.updateReminder(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(reminder);
});

module.exports = { getReminders, createReminder, updateReminder };
