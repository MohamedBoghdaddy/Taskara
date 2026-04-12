const notesService  = require('../services/notes/notesService');
const NoteVersion   = require('../models/NoteVersion');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const emitNoteEvent = (req, event, note) => {
  try {
    const io = req.app.get('io');
    if (io) io.to(`workspace:${getWorkspaceId(req)}`).emit(event, note);
  } catch (_) {}
};

// Save a version snapshot before update
const saveVersion = async (req, noteId, oldNote) => {
  try {
    const latest = await NoteVersion.findOne({ noteId }).sort('-versionNum');
    await NoteVersion.create({
      noteId,
      workspaceId: getWorkspaceId(req),
      savedBy:     req.user._id,
      title:       oldNote.title,
      content:     oldNote.content,
      versionNum:  (latest?.versionNum || 0) + 1,
    });
  } catch (_) {}
};

const getNotes = asyncHandler(async (req, res) => {
  const result = await notesService.getNotes(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

const createNote = asyncHandler(async (req, res) => {
  const note = await notesService.createNote(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(note);
  emitNoteEvent(req, 'note:created', note);
});

const getNote = asyncHandler(async (req, res) => {
  const note = await notesService.getNote(getWorkspaceId(req), req.params.id);
  res.json(note);
});

const updateNote = asyncHandler(async (req, res) => {
  // Save version before updating (if content/title changed)
  if (req.body.content || req.body.title) {
    const old = await notesService.getNote(getWorkspaceId(req), req.params.id).catch(() => null);
    if (old) saveVersion(req, req.params.id, old);
  }

  const note = await notesService.updateNote(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(note);
  emitNoteEvent(req, 'note:updated', note);
});

const deleteNote = asyncHandler(async (req, res) => {
  await notesService.deleteNote(getWorkspaceId(req), req.user._id, req.params.id);
  res.json({ message: 'Note deleted' });
  emitNoteEvent(req, 'note:deleted', { _id: req.params.id });
});

const getBacklinks = asyncHandler(async (req, res) => {
  const notes = await notesService.getBacklinks(getWorkspaceId(req), req.params.id);
  res.json(notes);
});

module.exports = { getNotes, createNote, getNote, updateNote, deleteNote, getBacklinks };
