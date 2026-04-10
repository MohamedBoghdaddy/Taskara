const Note = require('../../models/Note');
const Link = require('../../models/Link');
const { logActivity } = require('../../utils/activityLogger');

const getNotes = async (workspaceId, userId, { projectId, tags, search, isPinned, isFavorite, isArchived = false, page = 1, limit = 50 }) => {
  const filter = { workspaceId, isArchived };
  if (projectId) filter.projectId = projectId;
  if (tags && tags.length) filter.tags = { $in: tags };
  if (isPinned !== undefined) filter.isPinned = isPinned;
  if (isFavorite !== undefined) filter.isFavorite = isFavorite;
  if (search) filter.$text = { $search: search };

  const notes = await Note.find(filter)
    .sort({ isPinned: -1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('tags', 'name color')
    .select('-content');

  const total = await Note.countDocuments(filter);
  return { notes, total, page, limit };
};

const createNote = async (workspaceId, userId, data) => {
  const note = await Note.create({ workspaceId, createdBy: userId, ...data });
  await logActivity({ workspaceId, userId, action: 'note_created', entityType: 'note', entityId: note._id });
  return note;
};

const getNote = async (workspaceId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspaceId })
    .populate('tags', 'name color')
    .populate('linkedTaskIds', 'title status priority dueDate')
    .populate('linkedNoteIds', 'title updatedAt');

  if (!note) throw { status: 404, message: 'Note not found' };
  return note;
};

const updateNote = async (workspaceId, userId, noteId, data) => {
  if (data.content !== undefined) {
    data.contentText = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
  }

  const note = await Note.findOneAndUpdate(
    { _id: noteId, workspaceId },
    data,
    { new: true, runValidators: true }
  ).populate('tags', 'name color');

  if (!note) throw { status: 404, message: 'Note not found' };

  // Handle link updates
  if (data.linkedNoteIds) {
    await syncNoteLinks(workspaceId, userId, noteId, data.linkedNoteIds);
  }

  return note;
};

const syncNoteLinks = async (workspaceId, userId, noteId, linkedNoteIds) => {
  // Remove old links
  await Link.deleteMany({ workspaceId, fromId: noteId, fromType: 'note', toType: 'note' });

  // Create new links
  for (const targetId of linkedNoteIds) {
    await Link.findOneAndUpdate(
      { workspaceId, fromId: noteId, toId: targetId, fromType: 'note', toType: 'note' },
      { workspaceId, fromId: noteId, toId: targetId, fromType: 'note', toType: 'note', createdBy: userId },
      { upsert: true }
    );

    // Add backlink to target note
    await Note.findByIdAndUpdate(targetId, {
      $addToSet: { linkedNoteIds: noteId },
    });
  }
};

const deleteNote = async (workspaceId, userId, noteId) => {
  const note = await Note.findOneAndDelete({ _id: noteId, workspaceId });
  if (!note) throw { status: 404, message: 'Note not found' };

  await Link.deleteMany({ workspaceId, $or: [{ fromId: noteId }, { toId: noteId }] });
  await logActivity({ workspaceId, userId, action: 'note_deleted', entityType: 'note', entityId: noteId });
  return note;
};

const getBacklinks = async (workspaceId, noteId) => {
  const links = await Link.find({ workspaceId, toId: noteId, toType: 'note' });
  const noteIds = links.map(l => l.fromId);
  const notes = await Note.find({ _id: { $in: noteIds } }).select('title updatedAt');
  return notes;
};

module.exports = { getNotes, createNote, getNote, updateNote, deleteNote, getBacklinks };
