const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Task         = require('../models/Task');
const HabitEntry   = require('../models/HabitEntry');
const Board        = require('../models/Board');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCSV = (rows, headers) => {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCSV(row[h])).join(','));
  }
  return lines.join('\n');
};

// GET /api/exports/tasks
router.get('/tasks', authenticate, asyncHandler(async (req, res) => {
  const filter = { workspaceId: getWorkspaceId(req) };
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.projectId) filter.projectId = req.query.projectId;

  const tasks = await Task.find(filter)
    .populate('projectId', 'name')
    .populate('tagIds', 'name')
    .populate('assigneeIds', 'name email')
    .sort('-createdAt')
    .limit(5000);

  const rows = tasks.map(t => ({
    id:                  t._id.toString(),
    title:               t.title,
    status:              t.status,
    priority:            t.priority,
    dueDate:             t.dueDate ? t.dueDate.toISOString().slice(0,10) : '',
    estimatedPomodoros:  t.estimatedPomodoros || 0,
    completedPomodoros:  t.completedPomodoros || 0,
    storyPoints:         t.estimatedPoints || 0,
    project:             t.projectId?.name || '',
    assignees:           (t.assigneeIds || []).map(a => a.name || a.email).join(';'),
    tags:                (t.tagIds || []).map(t => t.name).join(';'),
    createdAt:           t.createdAt.toISOString().slice(0,10),
    completedAt:         t.completedAt ? t.completedAt.toISOString().slice(0,10) : '',
  }));

  const headers = ['id','title','status','priority','dueDate','estimatedPomodoros','completedPomodoros','storyPoints','project','assignees','tags','createdAt','completedAt'];
  const csv = toCSV(rows, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');
  res.send(csv);
}));

// GET /api/exports/analytics
router.get('/analytics', authenticate, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const dateStr = cutoff.toISOString().slice(0, 10);

  const entries = await HabitEntry.find({
    userId:      req.user._id,
    workspaceId: getWorkspaceId(req),
    date:        { $gte: dateStr },
  }).sort({ date: 1 });

  const rows = entries.map(e => ({
    date:            e.date,
    pomodoroSessions: e.pomodoroCount,
    focusMinutes:    e.focusMinutes,
    focusHours:      (e.focusMinutes / 60).toFixed(2),
    tasksCompleted:  e.tasksCompleted,
    streak:          e.streak,
  }));

  const headers = ['date','pomodoroSessions','focusMinutes','focusHours','tasksCompleted','streak'];
  const csv = toCSV(rows, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
  res.send(csv);
}));

// GET /api/exports/boards
router.get('/boards', authenticate, asyncHandler(async (req, res) => {
  const boards = await Board.find({ workspaceId: getWorkspaceId(req) });

  const rows = [];
  for (const board of boards) {
    for (const col of (board.columns || [])) {
      for (const card of (col.cards || [])) {
        rows.push({
          boardId:    board._id.toString(),
          boardName:  board.name,
          column:     col.title,
          cardTitle:  card.title,
          priority:   card.priority || '',
          dueDate:    card.dueDate ? new Date(card.dueDate).toISOString().slice(0,10) : '',
          assignees:  (card.assignees || []).join(';'),
          labels:     (card.labels || []).join(';'),
        });
      }
    }
  }

  const headers = ['boardId','boardName','column','cardTitle','priority','dueDate','assignees','labels'];
  const csv = toCSV(rows, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="boards.csv"');
  res.send(csv);
}));

module.exports = router;
