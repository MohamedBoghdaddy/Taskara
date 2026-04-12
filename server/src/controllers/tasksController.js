const tasksService = require('../services/tasks/tasksService');
const { asyncHandler } = require('../middleware/errorHandler');
const { dispatchEvent } = require('../services/webhooks/webhookService');
const { runAutomations } = require('../services/automations/automationService');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const emitTaskEvent = (req, event, task) => {
  try {
    const io = req.app.get('io');
    if (io) io.to(`workspace:${getWorkspaceId(req)}`).emit(event, task);
  } catch (_) {}
  // Async: webhooks + automations (fire and forget)
  dispatchEvent(getWorkspaceId(req), event.replace(':', '.'), task).catch(() => {});
  runAutomations(getWorkspaceId(req), event.replace(':', '.'), { ...task, userId: req.user._id }).catch(() => {});
};

const getTasks = asyncHandler(async (req, res) => {
  const result = await tasksService.getTasks(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

const createTask = asyncHandler(async (req, res) => {
  const task = await tasksService.createTask(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(task);
  emitTaskEvent(req, 'task:created', task);
});

const getTask = asyncHandler(async (req, res) => {
  const task = await tasksService.getTask(getWorkspaceId(req), req.params.id);
  res.json(task);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await tasksService.updateTask(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(task);

  emitTaskEvent(req, 'task:updated', task);

  // Emit status_changed automation event
  if (req.body.status) {
    runAutomations(getWorkspaceId(req), 'task.status_changed', {
      taskId: task._id, status: req.body.status, userId: req.user._id, task,
    }).catch(() => {});
  }
});

const deleteTask = asyncHandler(async (req, res) => {
  await tasksService.deleteTask(getWorkspaceId(req), req.user._id, req.params.id);
  res.json({ message: 'Task deleted' });
  emitTaskEvent(req, 'task:deleted', { _id: req.params.id });
});

const getTodayTasks = asyncHandler(async (req, res) => {
  const tasks = await tasksService.getTodayTasks(getWorkspaceId(req), req.user._id);
  res.json(tasks);
});

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, getTodayTasks };
