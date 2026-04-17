const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Attachment = require('../models/Attachment');
const { uploadAttachment, uploadAvatar, uploadAudio, UPLOAD_DIR } = require('../config/storage');

const router = express.Router();

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';

const fileUrl = (filePath) =>
  `${BASE_URL}/uploads/${path.relative(UPLOAD_DIR, filePath).replace(/\\/g, '/')}`;

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString();

const getAttachmentScope = (req) => ({
  workspaceId: getWorkspaceId(req),
});

const handleUpload = (uploader, entityType) =>
  asyncHandler(async (req, res) => {
    if (!uploader) {
      return res.status(503).json({ error: 'File uploads not configured (multer not installed)' });
    }

    await new Promise((resolve, reject) => {
      uploader.single('file')(req, res, (error) => (error ? reject(error) : resolve()));
    });

    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const url = fileUrl(req.file.path);
    const attachment = await Attachment.create({
      uploadedBy: req.user._id,
      workspaceId: getWorkspaceId(req),
      entityType: req.body.entityType || entityType,
      entityId: req.body.entityId || null,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url,
    });

    return res.status(201).json({
      attachment,
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });

router.post('/attachment', authenticate, handleUpload(uploadAttachment, 'Task'));
router.post('/avatar', authenticate, handleUpload(uploadAvatar, 'User'));
router.post('/audio', authenticate, handleUpload(uploadAudio, 'Audio'));

router.get(
  '/entity/:entityId',
  authenticate,
  asyncHandler(async (req, res) => {
    const attachments = await Attachment.find({
      ...getAttachmentScope(req),
      entityId: req.params.entityId,
    }).sort('-createdAt');

    return res.json({ attachments });
  }),
);

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const attachment = await Attachment.findOne({
      _id: req.params.id,
      ...getAttachmentScope(req),
    });

    if (!attachment) return res.status(404).json({ error: 'Not found' });
    return res.json(attachment);
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const attachment = await Attachment.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
      ...getAttachmentScope(req),
    });

    if (!attachment) return res.status(404).json({ error: 'Not found or not yours' });

    try {
      fs.unlinkSync(attachment.path);
    } catch (_) {
      // Ignore missing files so metadata cleanup can still complete.
    }

    await attachment.deleteOne();
    return res.json({ success: true });
  }),
);

module.exports = router;
