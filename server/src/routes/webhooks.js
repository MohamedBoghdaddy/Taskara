const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const WebhookSubscription = require('../models/WebhookSubscription');
const { dispatchEvent }   = require('../services/webhooks/webhookService');
const { VALID_EVENTS }    = require('../models/WebhookSubscription');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// GET /api/webhooks
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const subs = await WebhookSubscription.find({ workspaceId: getWorkspaceId(req) }).sort('-createdAt');
  res.json({ webhooks: subs });
}));

// POST /api/webhooks — create subscription
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { url, events, description } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  const sub = await WebhookSubscription.create({
    workspaceId: getWorkspaceId(req),
    createdBy:   req.user._id,
    url,
    events:      events || ['task.created'],
    description: description || '',
  });
  res.status(201).json(sub);
}));

// PATCH /api/webhooks/:id — update
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const sub = await WebhookSubscription.findOneAndUpdate(
    { _id: req.params.id, workspaceId: getWorkspaceId(req) },
    req.body,
    { new: true }
  );
  if (!sub) return res.status(404).json({ error: 'Webhook not found' });
  res.json(sub);
}));

// DELETE /api/webhooks/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await WebhookSubscription.findOneAndDelete({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  res.json({ success: true });
}));

// POST /api/webhooks/:id/test — send a test event
router.post('/:id/test', authenticate, asyncHandler(async (req, res) => {
  const sub = await WebhookSubscription.findOne({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  if (!sub) return res.status(404).json({ error: 'Webhook not found' });

  await dispatchEvent(getWorkspaceId(req), 'ping', {
    message: 'Test event from Taskara',
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, message: 'Test event dispatched' });
}));

// GET /api/webhooks/events — list valid event types
router.get('/events', authenticate, asyncHandler(async (req, res) => {
  res.json({ events: VALID_EVENTS });
}));

module.exports = router;
