const aiService = require('../services/ai/aiService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

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

module.exports = { summarizeNote, extractTasks, rewrite, planToday, answerFromWorkspace };
