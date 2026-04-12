const express      = require('express');
const router       = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const NoteVersion  = require('../models/NoteVersion');
const Note         = require('../models/Note');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

// GET /api/note-versions/:noteId — list versions for a note
router.get('/:noteId', authenticate, asyncHandler(async (req, res) => {
  const versions = await NoteVersion.find({
    noteId:      req.params.noteId,
    workspaceId: getWorkspaceId(req),
  }).sort('-versionNum').limit(50).populate('savedBy', 'name email');
  res.json({ versions });
}));

// GET /api/note-versions/:noteId/:versionNum — get specific version
router.get('/:noteId/:versionNum', authenticate, asyncHandler(async (req, res) => {
  const version = await NoteVersion.findOne({
    noteId:     req.params.noteId,
    versionNum: parseInt(req.params.versionNum),
    workspaceId: getWorkspaceId(req),
  });
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
}));

// POST /api/note-versions/:noteId/restore/:versionNum — restore a version
router.post('/:noteId/restore/:versionNum', authenticate, asyncHandler(async (req, res) => {
  const version = await NoteVersion.findOne({
    noteId:     req.params.noteId,
    versionNum: parseInt(req.params.versionNum),
  });
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const note = await Note.findByIdAndUpdate(
    req.params.noteId,
    { title: version.title, content: version.content, updatedAt: new Date() },
    { new: true }
  );

  // Save current as a new version before restoring
  const latest = await NoteVersion.findOne({ noteId: req.params.noteId }).sort('-versionNum');
  await NoteVersion.create({
    noteId:      req.params.noteId,
    workspaceId: getWorkspaceId(req),
    savedBy:     req.user._id,
    title:       version.title,
    content:     version.content,
    versionNum:  (latest?.versionNum || 0) + 1,
    label:       `Restored from v${version.versionNum}`,
  });

  res.json({ note, restored: true });
}));

// DELETE /api/note-versions/:noteId/:versionNum
router.delete('/:noteId/:versionNum', authenticate, asyncHandler(async (req, res) => {
  await NoteVersion.findOneAndDelete({
    noteId:     req.params.noteId,
    versionNum: parseInt(req.params.versionNum),
    workspaceId: getWorkspaceId(req),
  });
  res.json({ success: true });
}));

module.exports = router;
