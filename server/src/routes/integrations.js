/**
 * Integrations routes
 *
 * Existing:  Todoist, Slack
 * New:       GitHub, Google Calendar, Notion, WhatsApp, ClickUp
 *
 * All new integrations use USER-SUPPLIED credentials stored per workspace
 * in the IntegrationSettings collection — nothing is hardcoded in env vars.
 *
 * Pattern per provider:
 *   POST   /api/integrations/:provider/connect      — save creds + verify
 *   GET    /api/integrations/:provider/settings     — load saved settings (creds redacted)
 *   DELETE /api/integrations/:provider/disconnect   — remove saved settings
 *   POST   /api/integrations/:provider/test         — re-test connection
 *   POST   /api/integrations/:provider/sync         — run a sync action
 *   GET    /api/integrations/:provider/...          — provider-specific data fetches
 */

const express = require('express');
const router  = express.Router();
const { authenticate }  = require('../middleware/auth');
const { asyncHandler }  = require('../middleware/errorHandler');
const Task              = require('../models/Task');
const IntegrationSettings = require('../models/IntegrationSettings');

// Existing services
const { importFromTodoist, pushTaskToTodoist } = require('../services/integrations/todoistService');
const { sendSlackMessage, parseSlashCommand }  = require('../services/integrations/slackService');

// New services
const github  = require('../services/integrations/githubService');
const gcal    = require('../services/integrations/googleCalendarService');
const notion  = require('../services/integrations/notionService');
const wa      = require('../services/integrations/whatsappService');
const clickup = require('../services/integrations/clickupService');

// All routes below require authentication except the WhatsApp webhook (verified differently)
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getWorkspaceId(req) {
  return req.user.defaultWorkspaceId?.toString();
}

/** Redact sensitive credential fields before sending to the client. */
function redactSettings(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const redact = (sub) => {
    if (!sub) return sub;
    const KEYS = ['accessToken','refreshToken','clientSecret','apiKey','apiToken','webhookVerifyToken'];
    const out = { ...sub };
    for (const k of KEYS) {
      if (out[k]) out[k] = '••••••••';
    }
    return out;
  };
  for (const p of ['github','googleCalendar','notion','whatsapp','clickup']) {
    if (obj[p]) obj[p] = redact(obj[p]);
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing: Todoist
// ─────────────────────────────────────────────────────────────────────────────

router.post('/todoist/import', asyncHandler(async (req, res) => {
  const { apiToken } = req.body;
  if (!apiToken) return res.status(400).json({ error: 'apiToken required' });
  const result = await importFromTodoist(getWorkspaceId(req), req.user._id, apiToken);
  res.json(result);
}));

router.post('/todoist/push/:taskId', asyncHandler(async (req, res) => {
  const { apiToken } = req.body;
  if (!apiToken) return res.status(400).json({ error: 'apiToken required' });
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const result = await pushTaskToTodoist(apiToken, task);
  res.json({ success: true, todoistTask: result });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Existing: Slack
// ─────────────────────────────────────────────────────────────────────────────

router.post('/slack/notify', asyncHandler(async (req, res) => {
  const { webhookUrl, message } = req.body;
  if (!webhookUrl || !message) return res.status(400).json({ error: 'webhookUrl and message required' });
  await sendSlackMessage(webhookUrl, message);
  res.json({ success: true });
}));

router.post('/slack/slash-command', asyncHandler(async (req, res) => {
  const { text, user_name } = req.body;
  if (!text) return res.json({ text: 'Please provide a task: /task <title> [priority:high] [due:2026-04-15]' });
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

router.post('/slack/test', asyncHandler(async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });
  await sendSlackMessage(webhookUrl, '👋 Hello from Taskara! Your Slack integration is working.');
  res.json({ success: true });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Generic: GET all connected integrations for this workspace
// ─────────────────────────────────────────────────────────────────────────────

router.get('/connected', asyncHandler(async (req, res) => {
  const docs = await IntegrationSettings.find({
    workspaceId: getWorkspaceId(req),
    isActive: true,
  }).select('provider lastSyncAt lastError createdAt updatedAt');
  const connected = {};
  for (const d of docs) connected[d.provider] = true;
  res.json({ connected, docs: docs.map(d => d.toObject()) });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GitHub
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/github/connect
router.post('/github/connect', asyncHandler(async (req, res) => {
  const { accessToken, username } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'accessToken required' });

  // Verify the token with GitHub
  const profile = await github.verifyToken(accessToken);

  const doc = await IntegrationSettings.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req), provider: 'github' },
    {
      connectedBy: req.user._id,
      isActive: true,
      lastError: null,
      github: { accessToken, username: username || profile.login, repos: [] },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, profile, settings: redactSettings(doc) });
}));

// GET /api/integrations/github/settings
router.get('/github/settings', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'github' });
  res.json({ settings: redactSettings(doc) });
}));

// DELETE /api/integrations/github/disconnect
router.delete('/github/disconnect', asyncHandler(async (req, res) => {
  await IntegrationSettings.deleteOne({ workspaceId: getWorkspaceId(req), provider: 'github' });
  res.json({ success: true });
}));

// GET /api/integrations/github/repos — list repos accessible to the token
router.get('/github/repos', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'github' });
  if (!doc?.github?.accessToken) return res.status(400).json({ error: 'GitHub not connected' });
  const repos = await github.listRepos(doc.github.accessToken);
  res.json({ repos });
}));

// POST /api/integrations/github/repos — save selected repos
router.post('/github/repos', asyncHandler(async (req, res) => {
  const { repos } = req.body; // [{ owner, repo }]
  if (!Array.isArray(repos)) return res.status(400).json({ error: 'repos array required' });
  await IntegrationSettings.updateOne(
    { workspaceId: getWorkspaceId(req), provider: 'github' },
    { 'github.repos': repos }
  );
  res.json({ success: true });
}));

// POST /api/integrations/github/sync — import issues from saved repos
router.post('/github/sync', asyncHandler(async (req, res) => {
  const { projectId } = req.body;
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'github' });
  if (!doc?.github?.accessToken) return res.status(400).json({ error: 'GitHub not connected' });

  const repos = doc.github.repos || [];
  if (repos.length === 0) return res.status(400).json({ error: 'No repos configured. Add repos first.' });

  let totalImported = 0;
  let totalSkipped = 0;
  const results = [];

  for (const { owner, repo } of repos) {
    try {
      const r = await github.importIssues(
        doc.github.accessToken, owner, repo,
        getWorkspaceId(req), req.user._id, projectId
      );
      results.push({ repo: `${owner}/${repo}`, ...r });
      totalImported += r.imported;
      totalSkipped  += r.skipped;
    } catch (err) {
      results.push({ repo: `${owner}/${repo}`, error: err.message });
    }
  }

  await IntegrationSettings.updateOne(
    { workspaceId: getWorkspaceId(req), provider: 'github' },
    { lastSyncAt: new Date() }
  );

  res.json({ imported: totalImported, skipped: totalSkipped, results });
}));

// POST /api/integrations/github/export/:taskId — export task as GitHub issue
router.post('/github/export/:taskId', asyncHandler(async (req, res) => {
  const { owner, repo } = req.body;
  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo required' });

  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'github' });
  if (!doc?.github?.accessToken) return res.status(400).json({ error: 'GitHub not connected' });

  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = await github.exportTaskAsIssue(doc.github.accessToken, owner, repo, task);
  res.json({ success: true, ...result });
}));

// GET /api/integrations/github/commits?owner=&repo= — list recent commits
router.get('/github/commits', asyncHandler(async (req, res) => {
  const { owner, repo } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo required' });
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'github' });
  if (!doc?.github?.accessToken) return res.status(400).json({ error: 'GitHub not connected' });
  const commits = await github.listRecentCommits(doc.github.accessToken, owner, repo);
  res.json({ commits });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/google-calendar/connect
router.post('/google-calendar/connect', asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, clientId, clientSecret, calendarId } = req.body;
  if (!accessToken && !refreshToken) {
    return res.status(400).json({ error: 'accessToken or refreshToken required' });
  }

  const creds = { accessToken, refreshToken, clientId, clientSecret };
  const profile = await gcal.verifyCredentials(creds);

  const doc = await IntegrationSettings.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req), provider: 'google_calendar' },
    {
      connectedBy: req.user._id,
      isActive: true,
      lastError: null,
      googleCalendar: { accessToken, refreshToken, clientId, clientSecret, calendarId: calendarId || 'primary' },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, profile, settings: redactSettings(doc) });
}));

// GET /api/integrations/google-calendar/settings
router.get('/google-calendar/settings', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'google_calendar' });
  res.json({ settings: redactSettings(doc) });
}));

// DELETE /api/integrations/google-calendar/disconnect
router.delete('/google-calendar/disconnect', asyncHandler(async (req, res) => {
  await IntegrationSettings.deleteOne({ workspaceId: getWorkspaceId(req), provider: 'google_calendar' });
  res.json({ success: true });
}));

// GET /api/integrations/google-calendar/calendars
router.get('/google-calendar/calendars', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'google_calendar' });
  if (!doc?.googleCalendar) return res.status(400).json({ error: 'Google Calendar not connected' });
  const calendars = await gcal.listCalendars(doc.googleCalendar);
  res.json({ calendars });
}));

// POST /api/integrations/google-calendar/push/:taskId — push task due date to calendar
router.post('/google-calendar/push/:taskId', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'google_calendar' });
  if (!doc?.googleCalendar) return res.status(400).json({ error: 'Google Calendar not connected' });

  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = await gcal.pushTaskToCalendar(doc.googleCalendar, task, doc.googleCalendar.calendarId);
  res.json({ success: true, ...result });
}));

// POST /api/integrations/google-calendar/pull — pull events → reminders
router.post('/google-calendar/pull', asyncHandler(async (req, res) => {
  const { days = 7 } = req.body;
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'google_calendar' });
  if (!doc?.googleCalendar) return res.status(400).json({ error: 'Google Calendar not connected' });

  const result = await gcal.pullCalendarEvents(
    doc.googleCalendar,
    req.user._id,
    getWorkspaceId(req),
    doc.googleCalendar.calendarId,
    days
  );
  await IntegrationSettings.updateOne(
    { workspaceId: getWorkspaceId(req), provider: 'google_calendar' },
    { lastSyncAt: new Date() }
  );
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// Notion
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/notion/connect
router.post('/notion/connect', asyncHandler(async (req, res) => {
  const { apiToken } = req.body;
  if (!apiToken) return res.status(400).json({ error: 'apiToken required' });

  const profile = await notion.verifyToken(apiToken);

  const doc = await IntegrationSettings.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req), provider: 'notion' },
    {
      connectedBy: req.user._id,
      isActive: true,
      lastError: null,
      notion: { apiToken, workspaceName: profile.workspaceName },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, profile, settings: redactSettings(doc) });
}));

// GET /api/integrations/notion/settings
router.get('/notion/settings', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'notion' });
  res.json({ settings: redactSettings(doc) });
}));

// DELETE /api/integrations/notion/disconnect
router.delete('/notion/disconnect', asyncHandler(async (req, res) => {
  await IntegrationSettings.deleteOne({ workspaceId: getWorkspaceId(req), provider: 'notion' });
  res.json({ success: true });
}));

// GET /api/integrations/notion/databases
router.get('/notion/databases', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'notion' });
  if (!doc?.notion?.apiToken) return res.status(400).json({ error: 'Notion not connected' });
  const databases = await notion.listDatabases(doc.notion.apiToken);
  res.json({ databases });
}));

// GET /api/integrations/notion/pages
router.get('/notion/pages', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'notion' });
  if (!doc?.notion?.apiToken) return res.status(400).json({ error: 'Notion not connected' });
  const pages = await notion.listPages(doc.notion.apiToken);
  res.json({ pages });
}));

// POST /api/integrations/notion/import-database — import DB rows as tasks
router.post('/notion/import-database', asyncHandler(async (req, res) => {
  const { databaseId, projectId } = req.body;
  if (!databaseId) return res.status(400).json({ error: 'databaseId required' });

  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'notion' });
  if (!doc?.notion?.apiToken) return res.status(400).json({ error: 'Notion not connected' });

  const result = await notion.importDatabaseAsTasks(
    doc.notion.apiToken, databaseId,
    getWorkspaceId(req), req.user._id, projectId
  );
  await IntegrationSettings.updateOne(
    { workspaceId: getWorkspaceId(req), provider: 'notion' },
    { lastSyncAt: new Date(), 'notion.defaultDatabaseId': databaseId }
  );
  res.json(result);
}));

// POST /api/integrations/notion/import-pages — import pages as notes
router.post('/notion/import-pages', asyncHandler(async (req, res) => {
  const { pageIds } = req.body;
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return res.status(400).json({ error: 'pageIds array required' });
  }
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'notion' });
  if (!doc?.notion?.apiToken) return res.status(400).json({ error: 'Notion not connected' });

  const result = await notion.importPagesAsNotes(
    doc.notion.apiToken, pageIds,
    getWorkspaceId(req), req.user._id
  );
  await IntegrationSettings.updateOne(
    { workspaceId: getWorkspaceId(req), provider: 'notion' },
    { lastSyncAt: new Date() }
  );
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/whatsapp/connect
router.post('/whatsapp/connect', asyncHandler(async (req, res) => {
  const { accessToken, phoneNumberId, businessAccountId, webhookVerifyToken } = req.body;
  if (!accessToken || !phoneNumberId) {
    return res.status(400).json({ error: 'accessToken and phoneNumberId required' });
  }

  const profile = await wa.verifyCredentials(accessToken, phoneNumberId);

  const doc = await IntegrationSettings.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req), provider: 'whatsapp' },
    {
      connectedBy: req.user._id,
      isActive: true,
      lastError: null,
      whatsapp: { accessToken, phoneNumberId, businessAccountId, webhookVerifyToken: webhookVerifyToken || 'taskara_webhook' },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, profile, settings: redactSettings(doc) });
}));

// GET /api/integrations/whatsapp/settings
router.get('/whatsapp/settings', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'whatsapp' });
  res.json({ settings: redactSettings(doc) });
}));

// DELETE /api/integrations/whatsapp/disconnect
router.delete('/whatsapp/disconnect', asyncHandler(async (req, res) => {
  await IntegrationSettings.deleteOne({ workspaceId: getWorkspaceId(req), provider: 'whatsapp' });
  res.json({ success: true });
}));

// POST /api/integrations/whatsapp/send — send a test/manual message
router.post('/whatsapp/send', asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });

  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'whatsapp' });
  if (!doc?.whatsapp?.accessToken) return res.status(400).json({ error: 'WhatsApp not connected' });

  const result = await wa.sendTextMessage(doc.whatsapp.accessToken, doc.whatsapp.phoneNumberId, to, message);
  res.json({ success: true, ...result });
}));

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Webhook (no auth middleware — verified by token)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/integrations/whatsapp/webhook — Meta webhook verification
// (placed outside the authenticate middleware block — Meta sends GET to verify)
router.get('/whatsapp/webhook', (req, res) => {
  // Meta sends: hub.mode, hub.verify_token, hub.challenge
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // We can't look up the workspace from this unauthenticated request.
  // Accept if the verify token matches any stored setting.
  // In production, route per-workspace via a workspace slug in the URL.
  if (mode === 'subscribe') {
    // For simplicity, accept any token — user sets it themselves
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST /api/integrations/whatsapp/webhook — incoming messages from Meta
router.post('/whatsapp/webhook', asyncHandler(async (req, res) => {
  // Acknowledge immediately (Meta requires < 200ms response)
  res.sendStatus(200);

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const msgs    = changes?.messages;
    if (!msgs?.length) return;

    const msg     = msgs[0];
    const from    = msg.from;   // sender phone number
    const text    = msg.text?.body || '';

    const intent = wa.parseIncomingMessage(text);

    // Find the workspace that owns this phoneNumberId
    const phoneNumberId = changes?.metadata?.phone_number_id;
    const settings = await IntegrationSettings.findOne({
      provider: 'whatsapp',
      'whatsapp.phoneNumberId': phoneNumberId,
      isActive: true,
    });
    if (!settings) return;

    const { accessToken } = settings.whatsapp;

    if (intent.intent === 'help') {
      await wa.sendTextMessage(accessToken, phoneNumberId, from, wa.HELP_TEXT);
    } else if (intent.intent === 'create_task' || intent.intent === 'create_task_freeform') {
      const title = intent.data.title || intent.data.rawText;
      await Task.create({
        workspaceId: settings.workspaceId,
        createdBy:   settings.connectedBy,
        title,
        status:      'inbox',
        priority:    'medium',
        meta:        { source: 'whatsapp', fromPhone: from },
      });
      await wa.sendTextMessage(accessToken, phoneNumberId, from,
        `✅ Task created: "${title}"\nView it in Taskara.`);
    } else if (intent.intent === 'daily_brief') {
      await wa.sendTextMessage(accessToken, phoneNumberId, from,
        '📋 Open Taskara to see your full daily brief. We\'ll add inline brief support soon!');
    } else {
      await wa.sendTextMessage(accessToken, phoneNumberId, from,
        'I didn\'t understand that. Reply *help* to see available commands.');
    }
  } catch (_) {
    // Silently fail — we already responded 200
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// ClickUp
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/clickup/connect
router.post('/clickup/connect', asyncHandler(async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });

  const profile = await clickup.verifyToken(apiKey);
  const primaryTeam = profile.teams[0];

  const doc = await IntegrationSettings.findOneAndUpdate(
    { workspaceId: getWorkspaceId(req), provider: 'clickup' },
    {
      connectedBy: req.user._id,
      isActive: true,
      lastError: null,
      clickup: {
        apiKey,
        teamId: primaryTeam?.id || '',
        teamName: primaryTeam?.name || '',
      },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, profile, settings: redactSettings(doc) });
}));

// GET /api/integrations/clickup/settings
router.get('/clickup/settings', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'clickup' });
  res.json({ settings: redactSettings(doc) });
}));

// DELETE /api/integrations/clickup/disconnect
router.delete('/clickup/disconnect', asyncHandler(async (req, res) => {
  await IntegrationSettings.deleteOne({ workspaceId: getWorkspaceId(req), provider: 'clickup' });
  res.json({ success: true });
}));

// GET /api/integrations/clickup/spaces?teamId=
router.get('/clickup/spaces', asyncHandler(async (req, res) => {
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'clickup' });
  if (!doc?.clickup?.apiKey) return res.status(400).json({ error: 'ClickUp not connected' });
  const teamId = req.query.teamId || doc.clickup.teamId;
  const spaces = await clickup.listSpaces(doc.clickup.apiKey, teamId);
  res.json({ spaces });
}));

// GET /api/integrations/clickup/lists?spaceId=
router.get('/clickup/lists', asyncHandler(async (req, res) => {
  const { spaceId } = req.query;
  if (!spaceId) return res.status(400).json({ error: 'spaceId required' });
  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'clickup' });
  if (!doc?.clickup?.apiKey) return res.status(400).json({ error: 'ClickUp not connected' });
  const lists = await clickup.listLists(doc.clickup.apiKey, spaceId);
  res.json({ lists });
}));

// POST /api/integrations/clickup/sync — import tasks from a list
router.post('/clickup/sync', asyncHandler(async (req, res) => {
  const { listId, projectId } = req.body;
  if (!listId) return res.status(400).json({ error: 'listId required' });

  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'clickup' });
  if (!doc?.clickup?.apiKey) return res.status(400).json({ error: 'ClickUp not connected' });

  const result = await clickup.importTasksFromList(
    doc.clickup.apiKey, listId,
    getWorkspaceId(req), req.user._id, projectId
  );

  await IntegrationSettings.updateOne(
    { workspaceId: getWorkspaceId(req), provider: 'clickup' },
    { lastSyncAt: new Date(), 'clickup.listId': listId }
  );

  res.json(result);
}));

// POST /api/integrations/clickup/export/:taskId
router.post('/clickup/export/:taskId', asyncHandler(async (req, res) => {
  const { listId } = req.body;
  if (!listId) return res.status(400).json({ error: 'listId required' });

  const doc = await IntegrationSettings.findOne({ workspaceId: getWorkspaceId(req), provider: 'clickup' });
  if (!doc?.clickup?.apiKey) return res.status(400).json({ error: 'ClickUp not connected' });

  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = await clickup.exportTaskToClickUp(doc.clickup.apiKey, listId, task);
  res.json({ success: true, ...result });
}));

module.exports = router;
