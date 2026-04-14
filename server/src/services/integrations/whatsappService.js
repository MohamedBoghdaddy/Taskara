/**
 * WhatsApp Business Integration Service (Meta Business API)
 * Credentials come from the user's saved IntegrationSettings — not env vars.
 *
 * Auth model: User provides:
 *  - Access Token (System User Token from Meta Business Suite)
 *  - Phone Number ID (from WhatsApp Business → API Setup)
 *  - Webhook Verify Token (any string the user chooses, used to verify webhook)
 *
 * Capabilities:
 *  - Verify credentials
 *  - Send text messages
 *  - Send task reminders as formatted messages
 *  - Handle incoming webhook messages (parse commands → create tasks)
 */

const WA_API_VERSION = 'v19.0';
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

function waHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/** Verify credentials by fetching phone number info. */
async function verifyCredentials(accessToken, phoneNumberId) {
  const res = await fetch(`${WA_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`, {
    headers: waHeaders(accessToken),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `WhatsApp verification failed (${res.status}). Check your Access Token and Phone Number ID.`
    );
  }
  return {
    phoneNumber: data.display_phone_number,
    businessName: data.verified_name,
  };
}

/** Send a plain text message. */
async function sendTextMessage(accessToken, phoneNumberId, to, text) {
  // Normalize phone number (remove spaces, dashes; ensure country code prefix)
  const normalizedTo = to.replace(/[\s\-\(\)]/g, '');

  const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: waHeaders(accessToken),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Failed to send WhatsApp message (${res.status})`);
  }
  return { messageId: data.messages?.[0]?.id };
}

/** Send a task reminder as a formatted WhatsApp message. */
async function sendTaskReminder(accessToken, phoneNumberId, to, task) {
  const priorityEmoji = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  const emoji = priorityEmoji[task.priority] || '⚪';

  const dueText = task.dueDate
    ? `📅 Due: ${new Date(task.dueDate).toLocaleDateString()}`
    : '';

  const text = [
    `${emoji} *Task Reminder — Taskara*`,
    ``,
    `*${task.title}*`,
    task.description ? `${task.description.slice(0, 200)}` : '',
    dueText,
    `Priority: ${task.priority}`,
    ``,
    `Reply *DONE* to mark complete, *SNOOZE* to remind tomorrow.`,
  ]
    .filter(Boolean)
    .join('\n');

  return sendTextMessage(accessToken, phoneNumberId, to, text);
}

/**
 * Parse an incoming WhatsApp message and determine the intent.
 * Returns { intent, data } for the route handler to act on.
 *
 * Supported commands:
 *  - "create task: <title>" → create a task
 *  - "DONE" / "done" → mark last reminder task done (needs context)
 *  - "status" / "brief" → trigger daily brief
 *  - "help" → return help text
 */
function parseIncomingMessage(messageText = '') {
  const text = messageText.trim();
  const lower = text.toLowerCase();

  if (lower.startsWith('create task:') || lower.startsWith('task:')) {
    const title = text.replace(/^(create task:|task:)\s*/i, '').trim();
    return { intent: 'create_task', data: { title } };
  }
  if (lower === 'done' || lower === 'complete') {
    return { intent: 'complete_last_task', data: {} };
  }
  if (lower === 'status' || lower === 'brief' || lower === 'today') {
    return { intent: 'daily_brief', data: {} };
  }
  if (lower === 'help' || lower === 'commands') {
    return { intent: 'help', data: {} };
  }
  // Free-form text: treat as task creation
  if (text.length > 3) {
    return { intent: 'create_task_freeform', data: { rawText: text } };
  }
  return { intent: 'unknown', data: { text } };
}

const HELP_TEXT = [
  '🤖 *Taskara Bot Commands*',
  '',
  '*create task: <title>* — Create a task',
  '*status* — See your daily brief',
  '*done* — Mark your last task complete',
  '*help* — Show this menu',
].join('\n');

module.exports = {
  verifyCredentials,
  sendTextMessage,
  sendTaskReminder,
  parseIncomingMessage,
  HELP_TEXT,
};
