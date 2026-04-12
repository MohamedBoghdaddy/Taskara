/**
 * Job schedulers — repeating BullMQ jobs + fallback node intervals.
 * Called once after server starts.
 */
let Queue;
try { ({ Queue } = require('bullmq')); } catch (_) {}

const { getQueues }             = require('./queues');
const { startReminderWorker }   = require('./workers/reminderWorker');
const { startRecurrenceWorker } = require('./workers/recurrenceWorker');
const { startWebhookWorker }    = require('./workers/webhookWorker');
const { startAnalyticsWorker }  = require('./workers/analyticsWorker');

let workers = [];

const startSchedulers = async (redisConnection) => {
  console.log('[Schedulers] Starting job workers...');

  const { remindersQueue, recurrenceQueue, analyticsQueue } = getQueues();

  // ── Repeating jobs (BullMQ) ──────────────────────────────────────────────
  if (remindersQueue) {
    await remindersQueue.add('check-reminders', {}, {
      repeat:  { every: 60 * 1000 },    // every 1 minute
      jobId:   'reminder-repeat',
      removeOnComplete: 10,
      removeOnFail:     5,
    }).catch(() => {});
  }

  if (recurrenceQueue) {
    await recurrenceQueue.add('process-recurrence', {}, {
      repeat:  { every: 5 * 60 * 1000 }, // every 5 minutes
      jobId:   'recurrence-repeat',
      removeOnComplete: 5,
      removeOnFail:     3,
    }).catch(() => {});
  }

  if (analyticsQueue) {
    // Daily at 00:01 via cron pattern
    await analyticsQueue.add('daily-snapshot', {}, {
      repeat:  { pattern: '1 0 * * *' },
      jobId:   'analytics-daily',
      removeOnComplete: 3,
      removeOnFail:     2,
    }).catch(() => {});
  }

  // ── Workers ──────────────────────────────────────────────────────────────
  workers = [
    startReminderWorker(redisConnection),
    startRecurrenceWorker(redisConnection),
    startWebhookWorker(redisConnection),
    startAnalyticsWorker(redisConnection),
  ].filter(Boolean);

  console.log(`[Schedulers] ${workers.length} worker(s) active`);
};

const stopSchedulers = async () => {
  for (const w of workers) {
    try { await w.close?.(); } catch (_) {}
  }
};

module.exports = { startSchedulers, stopSchedulers };
