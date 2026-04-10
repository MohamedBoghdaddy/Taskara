const PomodoroSession = require('../../models/PomodoroSession');
const Task = require('../../models/Task');
const { logActivity } = require('../../utils/activityLogger');

const startSession = async (workspaceId, userId, { taskId, projectId, type, plannedMinutes }) => {
  // Cancel any active session
  await PomodoroSession.updateMany(
    { workspaceId, userId, status: 'active' },
    { status: 'interrupted', endedAt: new Date() }
  );

  const session = await PomodoroSession.create({
    workspaceId,
    userId,
    taskId: taskId || null,
    projectId: projectId || null,
    type: type || 'focus',
    plannedMinutes,
    status: 'active',
    startedAt: new Date(),
  });

  await logActivity({ workspaceId, userId, action: 'pomodoro_started', entityType: 'pomodoro_session', entityId: session._id, metadata: { taskId, type } });
  return session;
};

const stopSession = async (workspaceId, userId, sessionId, { status, notes }) => {
  const session = await PomodoroSession.findOne({ _id: sessionId, workspaceId, userId });
  if (!session) throw { status: 404, message: 'Session not found' };

  const endedAt = new Date();
  const actualMinutes = Math.round((endedAt - session.startedAt) / 60000);

  session.status = status || 'completed';
  session.endedAt = endedAt;
  session.actualMinutes = actualMinutes;
  session.notes = notes || null;
  await session.save();

  // Update task actualMinutes if linked
  if (session.taskId && status === 'completed') {
    await Task.findByIdAndUpdate(session.taskId, { $inc: { actualMinutes } });
  }

  await logActivity({ workspaceId, userId, action: 'pomodoro_completed', entityType: 'pomodoro_session', entityId: session._id, metadata: { actualMinutes, status } });
  return session;
};

const getHistory = async (workspaceId, userId, { taskId, projectId, from, to, page = 1, limit = 50 }) => {
  const filter = { workspaceId, userId };
  if (taskId) filter.taskId = taskId;
  if (projectId) filter.projectId = projectId;
  if (from || to) {
    filter.startedAt = {};
    if (from) filter.startedAt.$gte = new Date(from);
    if (to) filter.startedAt.$lte = new Date(to);
  }

  const sessions = await PomodoroSession.find(filter)
    .sort({ startedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('taskId', 'title')
    .populate('projectId', 'name');

  const total = await PomodoroSession.countDocuments(filter);
  return { sessions, total };
};

const getActiveSession = async (workspaceId, userId) => {
  return PomodoroSession.findOne({ workspaceId, userId, status: 'active' })
    .populate('taskId', 'title')
    .populate('projectId', 'name');
};

module.exports = { startSession, stopSession, getHistory, getActiveSession };
