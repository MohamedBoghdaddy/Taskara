const Task = require('../../models/Task');
const PomodoroSession = require('../../models/PomodoroSession');
const Note = require('../../models/Note');

const getTaskAnalytics = async (workspaceId, userId, { from, to }) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const [total, completed, overdue, byStatus, byPriority, recentCompletions] = await Promise.all([
    Task.countDocuments({ workspaceId }),
    Task.countDocuments({ workspaceId, status: 'done', ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}) }),
    Task.countDocuments({ workspaceId, status: { $ne: 'done' }, dueDate: { $lt: new Date() } }),
    Task.aggregate([
      { $match: { workspaceId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { workspaceId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.find({ workspaceId, status: 'done', completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
      .sort({ completedAt: -1 })
      .limit(10)
      .select('title completedAt priority'),
  ]);

  return { total, completed, overdue, byStatus, byPriority, recentCompletions };
};

const getFocusAnalytics = async (workspaceId, userId, { from, to }) => {
  const dateFilter = { workspaceId, userId, type: 'focus', status: 'completed' };
  if (from || to) {
    dateFilter.startedAt = {};
    if (from) dateFilter.startedAt.$gte = new Date(from);
    if (to) dateFilter.startedAt.$lte = new Date(to);
  }

  const sessions = await PomodoroSession.find(dateFilter);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
  const totalSessions = sessions.length;

  // Daily breakdown for chart
  const dailyMap = {};
  sessions.forEach(s => {
    const day = s.startedAt.toISOString().split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { sessions: 0, minutes: 0 };
    dailyMap[day].sessions++;
    dailyMap[day].minutes += s.actualMinutes || 0;
  });

  return {
    totalMinutes,
    totalSessions,
    averageSessionMinutes: totalSessions ? Math.round(totalMinutes / totalSessions) : 0,
    daily: dailyMap,
  };
};

const getDashboardStats = async (workspaceId, userId) => {
  const [taskStats, focusStats, noteCount, overdueCount] = await Promise.all([
    getTaskAnalytics(workspaceId, userId, {}),
    getFocusAnalytics(workspaceId, userId, { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }),
    Note.countDocuments({ workspaceId, isArchived: false }),
    Task.countDocuments({ workspaceId, status: { $ne: 'done' }, dueDate: { $lt: new Date() } }),
  ]);

  return { taskStats, focusStats, noteCount, overdueCount };
};

module.exports = { getTaskAnalytics, getFocusAnalytics, getDashboardStats };
