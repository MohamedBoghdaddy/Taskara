const notesService = require('../services/notes/notesService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getNotes = asyncHandler(async (req, res) => {
  const result = await notesService.getNotes(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

const createNote = asyncHandler(async (req, res) => {
  const note = await notesService.createNote(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(note);
});

const getNote = asyncHandler(async (req, res) => {
  const note = await notesService.getNote(getWorkspaceId(req), req.params.id);
  res.json(note);
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await notesService.updateNote(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(note);
});

const deleteNote = asyncHandler(async (req, res) => {
  await notesService.deleteNote(getWorkspaceId(req), req.user._id, req.params.id);
  res.json({ message: 'Note deleted' });
});

const getBacklinks = asyncHandler(async (req, res) => {
  const notes = await notesService.getBacklinks(getWorkspaceId(req), req.params.id);
  res.json(notes);
});

module.exports = { getNotes, createNote, getNote, updateNote, deleteNote, getBacklinks };
