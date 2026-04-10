const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Link = require('../models/Link');
const Note = require('../models/Note');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticate);

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

router.get('/graph', asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const links = await Link.find({ workspaceId }).limit(500);

  const nodeIds = new Set();
  links.forEach(l => { nodeIds.add(l.fromId.toString()); nodeIds.add(l.toId.toString()); });

  const [notes, tasks, projects] = await Promise.all([
    Note.find({ workspaceId, _id: { $in: [...nodeIds] } }).select('title').limit(200),
    Task.find({ workspaceId, _id: { $in: [...nodeIds] } }).select('title').limit(200),
    Project.find({ workspaceId, _id: { $in: [...nodeIds] } }).select('name').limit(50),
  ]);

  const nodes = [
    ...notes.map(n => ({ id: n._id, label: n.title, type: 'note' })),
    ...tasks.map(t => ({ id: t._id, label: t.title, type: 'task' })),
    ...projects.map(p => ({ id: p._id, label: p.name, type: 'project' })),
  ];

  const edges = links.map(l => ({ id: l._id, source: l.fromId, target: l.toId, type: l.relationType }));

  res.json({ nodes, edges });
}));

router.post('/', asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req);
  const { fromType, fromId, toType, toId, relationType } = req.body;

  const link = await Link.findOneAndUpdate(
    { workspaceId, fromId, toId },
    { workspaceId, fromType, fromId, toType, toId, relationType: relationType || 'reference', createdBy: req.user._id },
    { upsert: true, new: true }
  );

  res.status(201).json(link);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Link.findOneAndDelete({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  res.json({ message: 'Link deleted' });
}));

module.exports = router;
