const aiService = require('../services/ai/aiService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;
const getRequestBody = (req) => (req.body && typeof req.body === 'object' ? req.body : {});
const readTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

const requireWorkspaceId = (req) => {
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) throw { status: 400, message: 'workspaceId is required' };
  return workspaceId;
};

const requireTrimmedField = (body, key) => {
  const value = readTrimmedString(body?.[key]);
  if (!value) throw { status: 400, message: `${key} is required` };
  return value;
};

const sendAiResponse = (res, payload) => res.json(payload && typeof payload === 'object' ? payload : {});

// New advanced AI endpoints
const meetingToTasks = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const text = requireTrimmedField(body, 'text');
  const result = await aiService.meetingNotesToTasks(requireWorkspaceId(req), req.user._id, text);
  sendAiResponse(res, result);
});

const prioritizeTasks = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const tasks = Array.isArray(body.tasks) ? body.tasks.filter(Boolean) : [];
  if (!tasks.length) return res.status(400).json({ error: 'tasks array required' });
  const result = await aiService.prioritizeTasks(requireWorkspaceId(req), req.user._id, tasks);
  sendAiResponse(res, result);
});

const voiceToTask = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const transcript = requireTrimmedField(body, 'transcript');
  const result = await aiService.voiceToTask(requireWorkspaceId(req), req.user._id, transcript);
  sendAiResponse(res, result);
});

const dailyBrief = asyncHandler(async (req, res) => {
  const result = await aiService.dailyBrief(requireWorkspaceId(req), req.user._id, getRequestBody(req));
  sendAiResponse(res, result);
});

const workspaceSummary = asyncHandler(async (req, res) => {
  const result = await aiService.summarizeWorkspaceState(requireWorkspaceId(req), req.user._id, getRequestBody(req));
  sendAiResponse(res, result);
});

const commandCenter = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const command = requireTrimmedField(body, 'command');
  const result = await aiService.interpretWorkspaceCommand(requireWorkspaceId(req), req.user._id, { ...body, command });
  sendAiResponse(res, result);
});

const summarizeNote = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const noteId = requireTrimmedField(body, 'noteId');
  const result = await aiService.summarizeNote(requireWorkspaceId(req), req.user._id, noteId);
  sendAiResponse(res, result);
});

const extractTasks = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const noteId = requireTrimmedField(body, 'noteId');
  const result = await aiService.extractTasks(requireWorkspaceId(req), req.user._id, noteId);
  sendAiResponse(res, result);
});

const rewrite = asyncHandler(async (req, res) => {
  const result = await aiService.rewriteNote(requireWorkspaceId(req), req.user._id, getRequestBody(req));
  sendAiResponse(res, result);
});

const planToday = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const result = await aiService.planToday(
    requireWorkspaceId(req),
    req.user._id,
    Array.isArray(body.tasks) ? body.tasks.filter(Boolean) : [],
  );
  sendAiResponse(res, result);
});

const answerFromWorkspace = asyncHandler(async (req, res) => {
  const body = getRequestBody(req);
  const question = requireTrimmedField(body, 'question');
  const result = await aiService.answerFromWorkspace(requireWorkspaceId(req), req.user._id, question);
  sendAiResponse(res, result);
});

module.exports = {
  summarizeNote,
  extractTasks,
  rewrite,
  planToday,
  answerFromWorkspace,
  meetingToTasks,
  prioritizeTasks,
  voiceToTask,
  dailyBrief,
  workspaceSummary,
  commandCenter,
};
