/**
 * Slack integration service.
 * Send notifications to Slack channels via Incoming Webhooks.
 * Also parses slash commands from Slack to create tasks.
 */

/**
 * Send a message to a Slack webhook URL.
 */
const sendSlackMessage = async (webhookUrl, message) => {
  const body = typeof message === 'string' ? { text: message } : message;
  const resp = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Slack webhook failed: ${resp.status}`);
  return true;
};

/**
 * Build a rich Slack Block Kit message for a task.
 */
const taskToSlackBlock = (task, workspaceUrl = '') => ({
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*New Task Created* — <${workspaceUrl}/tasks|${task.title}>`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Priority:*\n${task.priority}` },
        { type: 'mrkdwn', text: `*Status:*\n${task.status}` },
        { type: 'mrkdwn', text: `*Due:*\n${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}` },
      ],
    },
  ],
});

/**
 * Notify Slack when a sprint starts or completes.
 */
const notifySprintEvent = async (webhookUrl, sprint, event) => {
  const emoji = event === 'started' ? '🚀' : '✅';
  const text  = `${emoji} *Sprint ${event}*: ${sprint.name}\nGoal: ${sprint.goal || 'No goal set'}`;
  return sendSlackMessage(webhookUrl, {
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
  });
};

/**
 * Parse a Slack slash command text and return task data.
 * e.g. /task Fix login bug priority:high due:2026-04-15
 */
const parseSlashCommand = (text) => {
  const parts    = text.trim().split(/\s+/);
  const flags    = {};
  const titleParts = [];
  for (const p of parts) {
    if (p.includes(':')) {
      const [k, v] = p.split(':');
      flags[k.toLowerCase()] = v;
    } else {
      titleParts.push(p);
    }
  }
  return {
    title:    titleParts.join(' ') || 'Untitled task',
    priority: flags.priority || 'medium',
    dueDate:  flags.due ? new Date(flags.due) : null,
    tags:     flags.tag ? [flags.tag] : [],
  };
};

module.exports = { sendSlackMessage, taskToSlackBlock, notifySprintEvent, parseSlashCommand };
