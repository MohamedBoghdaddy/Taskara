const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const AutomationRule   = require('../models/AutomationRule');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// GET /api/automations
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const rules = await AutomationRule.find({ workspaceId: getWorkspaceId(req) }).sort('-createdAt');
  res.json({ rules });
}));

// POST /api/automations
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, description, trigger, actions } = req.body;
  if (!name || !trigger?.event || !actions?.length) {
    return res.status(400).json({ error: 'name, trigger.event, and actions are required' });
  }
  const rule = await AutomationRule.create({
    workspaceId: getWorkspaceId(req),
    createdBy:   req.user._id,
    name, description, trigger, actions,
  });
  res.status(201).json(rule);
}));

// GET /api/automations/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const rule = await AutomationRule.findOne({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  if (!rule) return res.status(404).json({ error: 'Automation not found' });
  res.json(rule);
}));

// PATCH /api/automations/:id
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const rule = await AutomationRule.findOneAndUpdate(
    { _id: req.params.id, workspaceId: getWorkspaceId(req) },
    req.body,
    { new: true }
  );
  if (!rule) return res.status(404).json({ error: 'Automation not found' });
  res.json(rule);
}));

// DELETE /api/automations/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await AutomationRule.findOneAndDelete({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  res.json({ success: true });
}));

// POST /api/automations/:id/toggle
router.post('/:id/toggle', authenticate, asyncHandler(async (req, res) => {
  const rule = await AutomationRule.findOne({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  if (!rule) return res.status(404).json({ error: 'Automation not found' });
  rule.active = !rule.active;
  await rule.save();
  res.json(rule);
}));

// GET /api/automations/templates — preset automation templates
router.get('/meta/templates', authenticate, asyncHandler(async (req, res) => {
  res.json({ templates: AUTOMATION_TEMPLATES });
}));

const AUTOMATION_TEMPLATES = [
  {
    name: 'Auto-complete task when card moved to Done',
    trigger: { event: 'card.moved', filter: { toColumn: 'Done' } },
    actions: [{ type: 'set_task_field', params: { field: 'status', value: 'done' } }],
  },
  {
    name: 'Notify team when high-priority task created',
    trigger: { event: 'task.created', filter: { priority: 'urgent' } },
    actions: [{ type: 'send_notification', params: { message: 'Urgent task created: {{task.title}}' } }],
  },
  {
    name: 'Send webhook on sprint start',
    trigger: { event: 'sprint.started', filter: {} },
    actions: [{ type: 'webhook', params: { event: 'sprint_started' } }],
  },
  {
    name: 'Create follow-up task when task completed',
    trigger: { event: 'task.status_changed', filter: { status: 'done' } },
    actions: [{ type: 'create_task', params: { title: 'Follow up: {{task.title}}', status: 'todo', priority: 'low' } }],
  },
];

module.exports = router;
