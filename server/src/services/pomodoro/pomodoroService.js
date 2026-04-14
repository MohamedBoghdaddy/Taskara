const PomodoroSession = require('../../models/PomodoroSession');
const Task = require('../../models/Task');
const { logActivity } = require('../../utils/activityLogger');

const getPlannedSeconds = (session) => Math.max(0, Math.round((session.plannedMinutes || 0) * 60));
const getActiveRunSeconds = (session, now = new Date()) => {
  if (!session?.startedAt || session.status !== 'active') return 0;
  return Math.max(0, Math.floor((now - new Date(session.startedAt)) / 1000));
};
const getElapsedSeconds = (session, now = new Date()) => {
  return Math.max(0, (session?.elapsedSeconds || 0) + getActiveRunSeconds(session, now));
};

const startSession = async (workspaceId, userId, { taskId, projectId, type, plannedMinutes }) => {
  const durationMinutes = Math.max(1, Number(plannedMinutes) || 25);

  // Cancel any active or paused session before starting a new one
  await PomodoroSession.updateMany(
    { workspaceId, userId, status: { $in: ['active', 'paused'] } },
    { status: 'interrupted', endedAt: new Date() }
  );

  const session = await PomodoroSession.create({
    workspaceId,
    userId,
    taskId: taskId || null,
    projectId: projectId || null,
    type: type || 'focus',
    plannedMinutes: durationMinutes,
    elapsedSeconds: 0,
    remainingSeconds: durationMinutes * 60,
    status: 'active',
    startedAt: new Date(),
    pausedAt: null,
  });

  await logActivity({ workspaceId, userId, action: 'pomodoro_started', entityType: 'pomodoro_session', entityId: session._id, metadata: { taskId, type } });
  return session;
};

const pauseSession = async (workspaceId, userId, sessionId) => {
  const session = await PomodoroSession.findOne({ _id: sessionId, workspaceId, userId, status: 'active' });
  if (!session) throw { status: 404, message: 'Active session not found' };

  const now = new Date();
  const elapsedSeconds = getElapsedSeconds(session, now);
  const remainingSeconds = Math.max(0, getPlannedSeconds(session) - elapsedSeconds);

  session.status = 'paused';
  session.elapsedSeconds = elapsedSeconds;
  session.remainingSeconds = remainingSeconds;
  session.pausedAt = now;
  await session.save();

  await logActivity({ workspaceId, userId, action: 'pomodoro_paused', entityType: 'pomodoro_session', entityId: session._id, metadata: { remainingSeconds } });
  return session;
};

const resumeSession = async (workspaceId, userId, sessionId) => {
  const session = await PomodoroSession.findOne({ _id: sessionId, workspaceId, userId, status: 'paused' });
  if (!session) throw { status: 404, message: 'Paused session not found' };

  session.status = 'active';
  session.startedAt = new Date();
  session.pausedAt = null;
  await session.save();

  await logActivity({ workspaceId, userId, action: 'pomodoro_resumed', entityType: 'pomodoro_session', entityId: session._id, metadata: { remainingSeconds: session.remainingSeconds } });
  return session;
};

const stopSession = async (workspaceId, userId, sessionId, { status, notes }) => {
  const session = await PomodoroSession.findOne({ _id: sessionId, workspaceId, userId });
  if (!session) throw { status: 404, message: 'Session not found' };

  const endedAt = new Date();
  const elapsedSeconds = getElapsedSeconds(session, endedAt);
  const actualMinutes = Math.round(elapsedSeconds / 60);

  session.status = status || 'completed';
  session.endedAt = endedAt;
  session.actualMinutes = actualMinutes;
  session.elapsedSeconds = elapsedSeconds;
  session.remainingSeconds = Math.max(0, getPlannedSeconds(session) - elapsedSeconds);
  session.pausedAt = null;
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
    if (from) {
      const fromDate = new Date(from);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(from))) fromDate.setHours(0, 0, 0, 0);
      filter.startedAt.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) toDate.setHours(23, 59, 59, 999);
      filter.startedAt.$lte = toDate;
    }
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
  return PomodoroSession.findOne({ workspaceId, userId, status: { $in: ['active', 'paused'] } })
    .sort({ updatedAt: -1 })
    .populate('taskId', 'title')
    .populate('projectId', 'name');
};

module.exports = { startSession, pauseSession, resumeSession, stopSession, getHistory, getActiveSession };
