/**
 * Analytics worker — computes daily snapshots for habit + streak tracking.
 */
let Worker;
try { ({ Worker } = require('bullmq')); } catch (_) {}

const PomodoroSession = require('../../models/PomodoroSession');
const Task            = require('../../models/Task');
const HabitEntry      = require('../../models/HabitEntry');
const User            = require('../../models/User');

const computeDailySnapshot = async (userId, workspaceId, date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sessions = await PomodoroSession.find({
    userId,
    workspaceId,
    status: 'completed',
    startedAt: { $gte: dayStart, $lte: dayEnd },
  });

  const focusMinutes    = sessions.reduce((s, p) => s + (p.actualMinutes || 0), 0);
  const pomodoroCount   = sessions.length;

  const tasksCompleted  = await Task.countDocuments({
    workspaceId,
    createdBy: userId,
    status: 'done',
    completedAt: { $gte: dayStart, $lte: dayEnd },
  });

  // Calculate streak
  let streak = 0;
  let checkDate = new Date(dayStart);
  while (true) {
    checkDate.setDate(checkDate.getDate() - 1);
    const prev = await HabitEntry.findOne({
      userId,
      date: checkDate.toISOString().slice(0, 10),
      pomodoroCount: { $gt: 0 },
    });
    if (!prev) break;
    streak++;
    if (streak > 365) break;
  }
  if (pomodoroCount > 0) streak += 1;

  // Upsert
  await HabitEntry.findOneAndUpdate(
    { userId, workspaceId, date: dayStart.toISOString().slice(0, 10) },
    { pomodoroCount, focusMinutes, tasksCompleted, streak },
    { upsert: true, new: true }
  );

  return { pomodoroCount, focusMinutes, tasksCompleted, streak };
};

const runDailyAnalytics = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const users = await User.find({}).select('_id defaultWorkspaceId').limit(500);
  let processed = 0;
  for (const u of users) {
    if (!u.defaultWorkspaceId) continue;
    try {
      await computeDailySnapshot(u._id, u.defaultWorkspaceId, today);
      processed++;
    } catch (err) {
      console.error(`[AnalyticsWorker] Failed for user ${u._id}:`, err.message);
    }
  }
  return processed;
};

let workerInstance = null;

const startAnalyticsWorker = (redisConnection) => {
  if (!Worker || !redisConnection) {
    // Fallback: run at midnight using setInterval approximation
    const scheduleNext = () => {
      const now   = new Date();
      const next  = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 1, 0, 0);
      const ms = next - now;
      setTimeout(async () => {
        try { await runDailyAnalytics(); } catch (e) { console.error('[AnalyticsPoller]', e.message); }
        scheduleNext();
      }, ms);
    };
    scheduleNext();
    return null;
  }

  workerInstance = new Worker('analytics', async (job) => {
    const count = await runDailyAnalytics();
    return { users: count };
  }, { connection: redisConnection, concurrency: 1 });

  console.log('[AnalyticsWorker] Worker started');
  return workerInstance;
};

module.exports = { startAnalyticsWorker, computeDailySnapshot, runDailyAnalytics };
