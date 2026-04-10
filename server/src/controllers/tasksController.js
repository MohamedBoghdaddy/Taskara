const tasksService = require('../services/tasks/tasksService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getTasks = asyncHandler(async (req, res) => {
  const result = await tasksService.getTasks(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

const createTask = asyncHandler(async (req, res) => {
  const task = await tasksService.createTask(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(task);
});

const getTask = asyncHandler(async (req, res) => {
  const task = await tasksService.getTask(getWorkspaceId(req), req.params.id);
  res.json(task);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await tasksService.updateTask(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(task);
});

const deleteTask = asyncHandler(async (req, res) => {
  await tasksService.deleteTask(getWorkspaceId(req), req.user._id, req.params.id);
  res.json({ message: 'Task deleted' });
});

const getTodayTasks = asyncHandler(async (req, res) => {
  const tasks = await tasksService.getTodayTasks(getWorkspaceId(req), req.user._id);
  res.json(tasks);
});

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, getTodayTasks };
