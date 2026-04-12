const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Attachment        = require('../models/Attachment');
const { uploadAttachment, uploadAvatar, uploadAudio, UPLOAD_DIR } = require('../config/storage');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';
const fileUrl  = (filePath) => `${BASE_URL}/uploads/${path.relative(UPLOAD_DIR, filePath).replace(/\\/g,'/')}`;

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

const handleUpload = (uploader, subdir, entityType) => asyncHandler(async (req, res) => {
  if (!uploader) return res.status(503).json({ error: 'File uploads not configured (multer not installed)' });

  await new Promise((resolve, reject) => {
    uploader.single('file')(req, res, (err) => err ? reject(err) : resolve());
  });

  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const url  = fileUrl(req.file.path);
  const doc  = await Attachment.create({
    uploadedBy:   req.user._id,
    workspaceId:  getWorkspaceId(req),
    entityType:   req.body.entityType || entityType,
    entityId:     req.body.entityId   || null,
    filename:     req.file.filename,
    originalName: req.file.originalname,
    mimetype:     req.file.mimetype,
    size:         req.file.size,
    path:         req.file.path,
    url,
  });

  res.status(201).json({ attachment: doc, url, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
});

// POST /api/uploads/attachment
router.post('/attachment', authenticate, handleUpload(uploadAttachment, 'attachments', 'Task'));

// POST /api/uploads/avatar
router.post('/avatar', authenticate, handleUpload(uploadAvatar, 'avatars', 'User'));

// POST /api/uploads/audio
router.post('/audio', authenticate, handleUpload(uploadAudio, 'audio', 'Audio'));

// GET /api/uploads/:id — get attachment metadata
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const att = await Attachment.findById(req.params.id);
  if (!att) return res.status(404).json({ error: 'Not found' });
  res.json(att);
}));

// GET /api/uploads/entity/:entityId — list attachments for entity
router.get('/entity/:entityId', authenticate, asyncHandler(async (req, res) => {
  const attachments = await Attachment.find({ entityId: req.params.entityId }).sort('-createdAt');
  res.json({ attachments });
}));

// DELETE /api/uploads/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const att = await Attachment.findOne({ _id: req.params.id, uploadedBy: req.user._id });
  if (!att) return res.status(404).json({ error: 'Not found or not yours' });

  // Remove file from disk
  try { fs.unlinkSync(att.path); } catch (_) {}

  await att.deleteOne();
  res.json({ success: true });
}));

module.exports = router;
