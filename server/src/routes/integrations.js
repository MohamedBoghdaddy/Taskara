/**
 * Integrations routes — Todoist, Slack.
 */
const express  = require('express');
const router   = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { importFromTodoist, pushTaskToTodoist } = require('../services/integrations/todoistService');
const { sendSlackMessage, parseSlashCommand }  = require('../services/integrations/slackService');
const Task = require('../models/Task');

router.use(authenticate);

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// ── Todoist ───────────────────────────────────────────────────────────────────

// POST /api/integrations/todoist/import — import tasks from Todoist
router.post('/todoist/import', asyncHandler(async (req, res) => {
  const { apiToken } = req.body;
  if (!apiToken) return res.status(400).json({ error: 'apiToken required' });
  const result = await importFromTodoist(getWorkspaceId(req), req.user._id, apiToken);
  res.json(result);
}));

// POST /api/integrations/todoist/push/:taskId — push a task to Todoist
router.post('/todoist/push/:taskId', asyncHandler(async (req, res) => {
  const { apiToken } = req.body;
  if (!apiToken) return res.status(400).json({ error: 'apiToken required' });
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const result = await pushTaskToTodoist(apiToken, task);
  res.json({ success: true, todoistTask: result });
}));

// ── Slack ─────────────────────────────────────────────────────────────────────

// POST /api/integrations/slack/notify — send custom message
router.post('/slack/notify', asyncHandler(async (req, res) => {
  const { webhookUrl, message } = req.body;
  if (!webhookUrl || !message) return res.status(400).json({ error: 'webhookUrl and message required' });
  await sendSlackMessage(webhookUrl, message);
  res.json({ success: true });
}));

// POST /api/integrations/slack/slash-command — handle /task slash command
// (Slack sends POST to this URL)
router.post('/slack/slash-command', asyncHandler(async (req, res) => {
  const { text, user_name } = req.body;
  if (!text) return res.json({ text: 'Please provide a task: /task <title> [priority:high] [due:2026-04-15]' });

  // Note: In production, verify Slack signing secret here
  const taskData = parseSlashCommand(text);
  const task = await Task.create({
    workspaceId: getWorkspaceId(req),
    createdBy:   req.user._id,
    title:       taskData.title,
    priority:    taskData.priority,
    dueDate:     taskData.dueDate,
    status:      'todo',
  });

  res.json({
    response_type: 'in_channel',
    text: `✅ Task created: *${task.title}* (${task.priority} priority) by @${user_name || 'user'}`,
  });
}));

// POST /api/integrations/slack/test — test Slack webhook
router.post('/slack/test', asyncHandler(async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });
  await sendSlackMessage(webhookUrl, '👋 Hello from Taskara! Your Slack integration is working.');
  res.json({ success: true });
}));

module.exports = router;
