/**
 * Reminder worker — processes due reminders and sends emails / in-app notifications.
 */
let Worker;
try { ({ Worker } = require('bullmq')); } catch (_) {}

const Reminder = require('../../models/Reminder');
const User     = require('../../models/User');
const { sendReminderEmail } = require('../../utils/email');
const { notifyUser } = require('../../config/socket');

const processDueReminders = async () => {
  const now = new Date();
  const due = await Reminder.find({
    status: 'scheduled',
    remindAt: { $lte: now },
  }).populate('userId', 'email name');

  for (const reminder of due) {
    try {
      // Mark sent immediately to avoid double-send
      await Reminder.findByIdAndUpdate(reminder._id, { status: 'sent' });

      const user = reminder.userId;
      if (!user) continue;

      // In-app socket notification
      notifyUser(user._id?.toString(), 'reminder:due', {
        id:      reminder._id,
        title:   reminder.title,
        message: reminder.message,
        entityType: reminder.entityType,
        entityId:   reminder.entityId,
      });

      // Email
      if (reminder.channel === 'email') {
        await sendReminderEmail(user, reminder);
      }
    } catch (err) {
      console.error(`[ReminderWorker] Failed for reminder ${reminder._id}:`, err.message);
      await Reminder.findByIdAndUpdate(reminder._id, { status: 'scheduled' }); // rollback
    }
  }

  return due.length;
};

let workerInstance = null;

const startReminderWorker = (redisConnection) => {
  if (!Worker || !redisConnection) {
    console.log('[ReminderWorker] No Redis — using fallback polling');
    return startFallbackPoller();
  }

  workerInstance = new Worker('reminders', async (job) => {
    const count = await processDueReminders();
    return { processed: count };
  }, { connection: redisConnection, concurrency: 1 });

  workerInstance.on('failed', (job, err) => {
    console.error('[ReminderWorker] Job failed:', err.message);
  });

  console.log('[ReminderWorker] Worker started');
  return workerInstance;
};

// Fallback: poll every 60 seconds if Redis is unavailable
const startFallbackPoller = () => {
  const interval = setInterval(async () => {
    try { await processDueReminders(); } catch (e) { console.error('[ReminderPoller]', e.message); }
  }, 60 * 1000);
  return { close: () => clearInterval(interval) };
};

module.exports = { startReminderWorker, processDueReminders };
