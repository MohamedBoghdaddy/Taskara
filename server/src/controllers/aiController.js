const aiService = require('../services/ai/aiService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

// New advanced AI endpoints
const meetingToTasks = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const result = await aiService.meetingNotesToTasks(getWorkspaceId(req), req.user._id, text);
  res.json(result);
});

const prioritizeTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  if (!tasks?.length) return res.status(400).json({ error: 'tasks array required' });
  const result = await aiService.prioritizeTasks(getWorkspaceId(req), req.user._id, tasks);
  res.json(result);
});

const voiceToTask = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  const result = await aiService.voiceToTask(getWorkspaceId(req), req.user._id, transcript);
  res.json(result);
});

const dailyBrief = asyncHandler(async (req, res) => {
  const result = await aiService.dailyBrief(getWorkspaceId(req), req.user._id, req.body);
  res.json(result);
});

const workspaceSummary = asyncHandler(async (req, res) => {
  const result = await aiService.summarizeWorkspaceState(getWorkspaceId(req), req.user._id, req.body);
  res.json(result);
});

const commandCenter = asyncHandler(async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'command is required' });
  const result = await aiService.interpretWorkspaceCommand(getWorkspaceId(req), req.user._id, req.body);
  res.json(result);
});

const summarizeNote = asyncHandler(async (req, res) => {
  const result = await aiService.summarizeNote(getWorkspaceId(req), req.user._id, req.body.noteId);
  res.json(result);
});

const extractTasks = asyncHandler(async (req, res) => {
  const result = await aiService.extractTasks(getWorkspaceId(req), req.user._id, req.body.noteId);
  res.json(result);
});

const rewrite = asyncHandler(async (req, res) => {
  const result = await aiService.rewriteNote(getWorkspaceId(req), req.user._id, req.body);
  res.json(result);
});

const planToday = asyncHandler(async (req, res) => {
  const result = await aiService.planToday(getWorkspaceId(req), req.user._id, req.body.tasks || []);
  res.json(result);
});

const answerFromWorkspace = asyncHandler(async (req, res) => {
  const result = await aiService.answerFromWorkspace(getWorkspaceId(req), req.user._id, req.body.question);
  res.json(result);
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
