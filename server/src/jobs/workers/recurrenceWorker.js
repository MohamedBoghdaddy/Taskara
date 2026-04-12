/**
 * Recurrence worker — creates next instance of recurring tasks.
 */
let Worker;
try { ({ Worker } = require('bullmq')); } catch (_) {}

const Task = require('../../models/Task');

const addDays   = (d, n) => new Date(d.getTime() + n * 86400000);
const addMonths = (d, n) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
const addWeeks  = (d, n) => addDays(d, n * 7);

const getNextOccurrence = (rule, base) => {
  const r = rule?.toLowerCase() || 'daily';
  if (r === 'daily')   return addDays(base, 1);
  if (r === 'weekly')  return addWeeks(base, 1);
  if (r === 'monthly') return addMonths(base, 1);
  if (r === 'weekdays') {
    const next = addDays(base, 1);
    if (next.getDay() === 0) return addDays(next, 1); // skip Sunday
    if (next.getDay() === 6) return addDays(next, 2); // skip Saturday
    return next;
  }
  return addDays(base, 1);
};

const processRecurringTasks = async () => {
  const now = new Date();
  const tasks = await Task.find({
    'recurrence.enabled': true,
    'recurrence.nextOccurrence': { $lte: now },
  });

  let created = 0;
  for (const task of tasks) {
    try {
      // Create new task instance
      const { _id, createdAt, updatedAt, completedAt, actualMinutes, status, ...rest } = task.toObject();
      const newTask = await Task.create({
        ...rest,
        status: 'todo',
        actualMinutes: 0,
        completedAt: null,
        dueDate: task.recurrence.nextOccurrence || now,
        startDate: task.recurrence.nextOccurrence || now,
      });

      // Update nextOccurrence on the template task
      const nextOcc = getNextOccurrence(task.recurrence.rule, task.recurrence.nextOccurrence || now);
      await Task.findByIdAndUpdate(task._id, {
        'recurrence.nextOccurrence': nextOcc,
        'recurrence.lastCreated': now,
      });

      created++;
    } catch (err) {
      console.error(`[RecurrenceWorker] Failed for task ${task._id}:`, err.message);
    }
  }
  return created;
};

let workerInstance = null;

const startRecurrenceWorker = (redisConnection) => {
  if (!Worker || !redisConnection) {
    console.log('[RecurrenceWorker] No Redis — using fallback polling');
    const interval = setInterval(async () => {
      try { await processRecurringTasks(); } catch (e) { console.error('[RecurrencePoller]', e.message); }
    }, 5 * 60 * 1000); // every 5 min
    return { close: () => clearInterval(interval) };
  }

  workerInstance = new Worker('recurrence', async (job) => {
    const count = await processRecurringTasks();
    return { created: count };
  }, { connection: redisConnection, concurrency: 1 });

  console.log('[RecurrenceWorker] Worker started');
  return workerInstance;
};

module.exports = { startRecurrenceWorker, processRecurringTasks };
