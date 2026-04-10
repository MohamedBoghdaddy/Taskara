const Note = require('../models/Note');
const Template = require('../models/Template');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLogger');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getDailyNote = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const note = await Note.findOne({
    workspaceId: getWorkspaceId(req),
    dailyNoteDate: { $gte: dayStart, $lte: dayEnd },
  }).populate('tags', 'name color');

  res.json(note || null);
});

const generateDailyNote = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const workspaceId = getWorkspaceId(req);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await Note.findOne({
    workspaceId,
    dailyNoteDate: { $gte: dayStart, $lte: dayEnd },
  });

  if (existing) return res.json(existing);

  const template = await Template.findOne({ workspaceId, type: 'daily_note', isDefault: true });
  const content = template?.content || `# Daily Note — ${date}\n\n## Goals\n\n## Tasks\n\n## Notes\n\n## Reflection`;

  const note = await Note.create({
    workspaceId,
    createdBy: req.user._id,
    title: `Daily Note — ${date}`,
    content,
    contentText: typeof content === 'string' ? content : JSON.stringify(content),
    dailyNoteDate: dayStart,
  });

  await logActivity({ workspaceId, userId: req.user._id, action: 'daily_note_created', entityType: 'note', entityId: note._id });

  res.status(201).json(note);
});

module.exports = { getDailyNote, generateDailyNote };
