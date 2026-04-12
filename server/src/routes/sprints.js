const express = require('express');
const router  = express.Router();
const Sprint  = require('../models/Sprint');
const Task    = require('../models/Task');
const { authenticate } = require('../middleware/auth');

const guard = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); } catch (e) { next(e); }
};

// GET /sprints — list sprints for workspace
router.get('/', authenticate, guard(async (req, res) => {
  const filter = { workspaceId: req.user.defaultWorkspaceId };
  if (req.query.active === 'true') filter.status = 'active';
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const sprints = await Sprint.find(filter)
    .populate({ path: 'tasks', select: 'title status priority estimatedPoints sprintId' })
    .sort('-createdAt')
    .limit(Number(req.query.limit) || 20);
  res.json({ sprints });
}));

// POST /sprints — create sprint
router.post('/', authenticate, guard(async (req, res) => {
  const { name, goal, startDate, endDate, projectId } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  // Only one active sprint per workspace
  const existing = await Sprint.findOne({ workspaceId: req.user.defaultWorkspaceId, status: 'active' });
  if (existing && req.body.status === 'active') {
    return res.status(400).json({ error: 'An active sprint already exists. Complete it first.' });
  }

  const sprint = await Sprint.create({
    name, goal, startDate, endDate, projectId,
    workspaceId: req.user.defaultWorkspaceId,
    createdBy: req.user._id,
  });
  res.status(201).json(sprint);
}));

// GET /sprints/:id
router.get('/:id', authenticate, guard(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id)
    .populate({ path: 'tasks', select: 'title status priority estimatedPoints dueDate assignees' });
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  res.json(sprint);
}));

// PATCH /sprints/:id — update sprint (start, complete, edit)
router.patch('/:id', authenticate, guard(async (req, res) => {
  const { status, ...rest } = req.body;
  const update = { ...rest };

  if (status === 'active') {
    const existing = await Sprint.findOne({
      workspaceId: req.user.defaultWorkspaceId, status: 'active', _id: { $ne: req.params.id },
    });
    if (existing) return res.status(400).json({ error: 'Another sprint is already active.' });
    update.status = 'active';
  } else if (status === 'completed') {
    update.status = 'completed';
    update.completedAt = new Date();
    // Calculate velocity (sum of estimated points of done tasks)
    const tasks = await Task.find({ sprintId: req.params.id, status: 'done' });
    update.velocity = tasks.reduce((sum, t) => sum + (t.estimatedPoints || 0), 0);
  } else if (status) {
    update.status = status;
  }

  const sprint = await Sprint.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(sprint);
}));

// DELETE /sprints/:id — delete sprint (moves tasks back to backlog)
router.delete('/:id', authenticate, guard(async (req, res) => {
  await Task.updateMany({ sprintId: req.params.id }, { $unset: { sprintId: '' } });
  await Sprint.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// GET /sprints/:id/stats — sprint statistics
router.get('/:id/stats', authenticate, guard(async (req, res) => {
  const tasks = await Task.find({ sprintId: req.params.id });
  const total      = tasks.length;
  const done       = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const todo       = tasks.filter(t => t.status === 'todo').length;
  const points     = tasks.reduce((s, t) => s + (t.estimatedPoints || 0), 0);
  const pointsDone = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.estimatedPoints || 0), 0);
  res.json({ total, done, inProgress, todo, points, pointsDone, completion: total ? Math.round((done/total)*100) : 0 });
}));

module.exports = router;
