const Project = require('../models/Project');
const Task = require('../models/Task');
const Note = require('../models/Note');
const PomodoroSession = require('../models/PomodoroSession');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getProjects = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { workspaceId: getWorkspaceId(req) };
  if (status) filter.status = status;

  const projects = await Project.find(filter).sort({ createdAt: -1 }).populate('tagIds', 'name color');
  res.json(projects);
});

const createProject = asyncHandler(async (req, res) => {
  const project = await Project.create({
    workspaceId: getWorkspaceId(req),
    createdBy: req.user._id,
    memberIds: [req.user._id],
    ...req.body,
  });
  await logActivity({ workspaceId: getWorkspaceId(req), userId: req.user._id, action: 'project_created', entityType: 'project', entityId: project._id });
  res.status(201).json(project);
});

const getProject = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const [project, tasks, notes, focusSessions] = await Promise.all([
    Project.findOne({ _id: req.params.id, workspaceId }).populate('tagIds', 'name color'),
    Task.find({ workspaceId, projectId: req.params.id }).select('title status priority dueDate').limit(50),
    Note.find({ workspaceId, projectId: req.params.id }).select('title updatedAt').limit(20),
    PomodoroSession.find({ workspaceId, projectId: req.params.id, status: 'completed' }).select('actualMinutes startedAt'),
  ]);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
  };

  res.json({ project, tasks, notes, focusStats: { totalMinutes: totalFocusMinutes, sessions: focusSessions.length }, taskStats });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, workspaceId: getWorkspaceId(req) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

module.exports = { getProjects, createProject, getProject, updateProject };
