const PomodoroSession = require('../../models/PomodoroSession');
const Task            = require('../../models/Task');
const HabitEntry      = require('../../models/HabitEntry');

/**
 * Compute focus score (0-100) for today.
 * Formula:
 *   sessions/8 * 40   (sessions component, capped)
 *   completionRate * 40
 *   avgSessionMin/25 * 20
 */
const computeFocusScore = async (userId, workspaceId) => {
  const today    = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${today}T00:00:00.000Z`);
  const dayEnd   = new Date(`${today}T23:59:59.999Z`);

  const sessions = await PomodoroSession.find({
    userId, workspaceId, status: 'completed',
    startedAt: { $gte: dayStart, $lte: dayEnd },
  });

  const sessionCount   = sessions.length;
  const totalMinutes   = sessions.reduce((s, p) => s + (p.actualMinutes || 0), 0);
  const avgSessionMin  = sessionCount > 0 ? totalMinutes / sessionCount : 0;

  const totalTasks = await Task.countDocuments({
    workspaceId, createdBy: userId,
    status: { $in: ['todo','in_progress','done'] },
    dueDate: { $gte: dayStart, $lte: dayEnd },
  });

  const doneTasks = await Task.countDocuments({
    workspaceId, createdBy: userId, status: 'done',
    completedAt: { $gte: dayStart, $lte: dayEnd },
  });

  const completionRate = totalTasks > 0 ? doneTasks / totalTasks : (doneTasks > 0 ? 1 : 0);

  const sessionScore    = Math.min(sessionCount / 8, 1) * 40;
  const completionScore = completionRate * 40;
  const qualityScore    = Math.min(avgSessionMin / 25, 1) * 20;
  const score           = Math.round(sessionScore + completionScore + qualityScore);

  return {
    score: Math.min(score, 100),
    sessionCount,
    totalMinutes,
    avgSessionMin: Math.round(avgSessionMin),
    completionRate: Math.round(completionRate * 100),
    doneTasks,
    totalTasks,
    breakdown: { sessionScore: Math.round(sessionScore), completionScore: Math.round(completionScore), qualityScore: Math.round(qualityScore) },
  };
};

/**
 * Burnout risk assessment based on last 14 days.
 */
const detectBurnout = async (userId, workspaceId) => {
  const entries14 = await getLastNDays(userId, workspaceId, 14);
  const entries7  = entries14.slice(-7);
  const entries7prev = entries14.slice(0, 7);

  const avg = (arr) => arr.length ? arr.reduce((s, e) => s + (e.pomodoroCount || 0), 0) / arr.length : 0;

  const avgCurrent  = avg(entries7);
  const avgPrevious = avg(entries7prev);

  const zeroStreakDays = entries7.filter(e => e.pomodoroCount === 0).length;
  const declining      = checkDecline(entries7.map(e => e.pomodoroCount || 0));
  const loadDrop       = avgPrevious > 2 && avgCurrent < avgPrevious * 0.5;

  let risk = 'none';
  let message = 'You\'re maintaining a healthy pace.';
  let recommendation = 'Keep up your consistent work!';

  if (zeroStreakDays >= 5 || (declining && loadDrop)) {
    risk = 'high';
    message = 'Significant drop in focus activity detected over the past week.';
    recommendation = 'Consider taking a proper break and reviewing your workload. Burnout recovery requires rest.';
  } else if (zeroStreakDays >= 3 || declining) {
    risk = 'medium';
    message = 'Your focus sessions have been decreasing recently.';
    recommendation = 'Try shorter 15-minute sessions to rebuild momentum. Make sure to take regular breaks.';
  } else if (avgCurrent < 2 && avgPrevious >= 3) {
    risk = 'low';
    message = 'Slight dip in productivity compared to your recent average.';
    recommendation = 'A brief reset day might help — try a light task list and a few short Pomodoros.';
  }

  return { risk, message, recommendation, avgCurrent: Math.round(avgCurrent * 10) / 10, avgPrevious: Math.round(avgPrevious * 10) / 10, zeroStreakDays };
};

/**
 * Week-over-week trend comparison.
 */
const getWeeklyTrend = async (userId, workspaceId) => {
  const entries14  = await getLastNDays(userId, workspaceId, 14);
  const thisWeek   = entries14.slice(-7);
  const lastWeek   = entries14.slice(0, 7);

  const sum     = (arr, key) => arr.reduce((s, e) => s + (e[key] || 0), 0);
  const pct     = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

  const sessions = { thisWeek: sum(thisWeek,'pomodoroCount'), lastWeek: sum(lastWeek,'pomodoroCount') };
  const minutes  = { thisWeek: sum(thisWeek,'focusMinutes'),  lastWeek: sum(lastWeek,'focusMinutes') };
  const tasks    = { thisWeek: sum(thisWeek,'tasksCompleted'),lastWeek: sum(lastWeek,'tasksCompleted') };

  return {
    sessions:  { ...sessions,  change: pct(sessions.thisWeek, sessions.lastWeek) },
    minutes:   { ...minutes,   change: pct(minutes.thisWeek,  minutes.lastWeek) },
    tasks:     { ...tasks,     change: pct(tasks.thisWeek,    tasks.lastWeek) },
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const getLastNDays = async (userId, workspaceId, n) => {
  const entries = [];
  const today   = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry   = await HabitEntry.findOne({ userId, workspaceId, date: dateStr });
    entries.push(entry || { date: dateStr, pomodoroCount: 0, focusMinutes: 0, tasksCompleted: 0 });
  }
  return entries;
};

const checkDecline = (arr) => {
  if (arr.length < 3) return false;
  let declines = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) declines++;
  }
  return declines >= arr.length - 2;
};

module.exports = { computeFocusScore, detectBurnout, getWeeklyTrend };
