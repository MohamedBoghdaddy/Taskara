/**
 * BullMQ queues — all job types share one Redis connection.
 * Gracefully disabled if REDIS_URL is not set.
 */
let Queue;
try { ({ Queue } = require('bullmq')); } catch (_) {}

let remindersQueue   = null;
let recurrenceQueue  = null;
let webhooksQueue    = null;
let analyticsQueue   = null;
let notificationsQueue = null;
let workflowsQueue = null;

const makeQueue = (name, connection) => {
  if (!Queue || !connection) return null;
  try {
    return new Queue(name, { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
  } catch (e) {
    console.warn(`[Queue] Could not create ${name}:`, e.message);
    return null;
  }
};

const initQueues = (redisConnection) => {
  remindersQueue    = makeQueue('reminders',    redisConnection);
  recurrenceQueue   = makeQueue('recurrence',   redisConnection);
  webhooksQueue     = makeQueue('webhooks',     redisConnection);
  analyticsQueue    = makeQueue('analytics',    redisConnection);
  notificationsQueue = makeQueue('notifications', redisConnection);
  workflowsQueue = makeQueue('workflows', redisConnection);
  console.log('[Jobs] Queues initialized');
};

const addReminderJob     = (data) => remindersQueue?.add('check-reminders', data, { jobId: `reminder-${Date.now()}` });
const addRecurrenceJob   = (data) => recurrenceQueue?.add('process-recurrence', data, { jobId: `recur-${Date.now()}` });
const addWebhookJob      = (data, opts = {}) => webhooksQueue?.add('deliver-webhook', data, opts);
const addAnalyticsJob    = (data) => analyticsQueue?.add('daily-snapshot', data, { jobId: `analytics-${data.date || Date.now()}` });
const addNotificationJob = (data) => notificationsQueue?.add('send-notification', data);
const addWorkflowJob     = (data, opts = {}) => workflowsQueue?.add('process-workflows', data, opts);

module.exports = {
  initQueues,
  getQueues: () => ({ remindersQueue, recurrenceQueue, webhooksQueue, analyticsQueue, notificationsQueue, workflowsQueue }),
  addReminderJob, addRecurrenceJob, addWebhookJob, addAnalyticsJob, addNotificationJob, addWorkflowJob,
};
