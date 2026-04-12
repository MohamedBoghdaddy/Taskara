const HabitEntry      = require('../../models/HabitEntry');
const PomodoroSession = require('../../models/PomodoroSession');
const Task            = require('../../models/Task');

/**
 * Upsert today's habit entry from live session/task data.
 */
const recordDailyHabit = async (userId, workspaceId) => {
  const today    = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${today}T00:00:00.000Z`);
  const dayEnd   = new Date(`${today}T23:59:59.999Z`);

  const sessions = await PomodoroSession.find({
    userId, workspaceId, status: 'completed',
    startedAt: { $gte: dayStart, $lte: dayEnd },
  });

  const pomodoroCount   = sessions.length;
  const focusMinutes    = sessions.reduce((s, p) => s + (p.actualMinutes || 0), 0);
  const tasksCompleted  = await Task.countDocuments({
    workspaceId, createdBy: userId, status: 'done',
    completedAt: { $gte: dayStart, $lte: dayEnd },
  });

  const streak = await calculateStreak(userId, today, pomodoroCount > 0);

  return HabitEntry.findOneAndUpdate(
    { userId, workspaceId, date: today },
    { pomodoroCount, focusMinutes, tasksCompleted, streak },
    { upsert: true, new: true }
  );
};

/**
 * Count current consecutive streak ending on `date`.
 */
const calculateStreak = async (userId, todayStr, hasActivityToday = false) => {
  let streak = hasActivityToday ? 1 : 0;
  const d = new Date(todayStr);

  for (let i = 1; i <= 365; i++) {
    d.setDate(d.getDate() - 1);
    const dateStr = d.toISOString().slice(0, 10);
    const entry   = await HabitEntry.findOne({ userId, date: dateStr, pomodoroCount: { $gt: 0 } });
    if (!entry) break;
    streak++;
  }
  return streak;
};

/**
 * Return last N days of habit entries.
 */
const getHabitHistory = async (userId, workspaceId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const dateStr = cutoff.toISOString().slice(0, 10);

  return HabitEntry.find({
    userId,
    workspaceId,
    date: { $gte: dateStr },
  }).sort({ date: 1 });
};

/**
 * Current streak + best ever streak.
 */
const getStreakSummary = async (userId, workspaceId) => {
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = await HabitEntry.findOne({ userId, workspaceId, date: today });
  const current    = await calculateStreak(userId, today, todayEntry?.pomodoroCount > 0);

  // Best streak: scan all history
  const all     = await HabitEntry.find({ userId }).sort({ date: 1 });
  let best = 0, run = 0;
  for (const e of all) {
    if (e.pomodoroCount > 0) { run++; best = Math.max(best, run); }
    else run = 0;
  }

  return { current, best, todayPomodoros: todayEntry?.pomodoroCount || 0, todayMinutes: todayEntry?.focusMinutes || 0 };
};

module.exports = { recordDailyHabit, getHabitHistory, getStreakSummary, calculateStreak };
