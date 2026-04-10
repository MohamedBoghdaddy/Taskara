const Tag = require('../models/Tag');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getTags = asyncHandler(async (req, res) => {
  const tags = await Tag.find({ workspaceId: getWorkspaceId(req) }).sort({ name: 1 });
  res.json(tags);
});

const createTag = asyncHandler(async (req, res) => {
  const tag = await Tag.create({ workspaceId: getWorkspaceId(req), createdBy: req.user._id, ...req.body });
  res.status(201).json(tag);
});

const updateTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOneAndUpdate(
    { _id: req.params.id, workspaceId: getWorkspaceId(req) },
    req.body,
    { new: true }
  );
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  res.json(tag);
});

const deleteTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findOneAndDelete({ _id: req.params.id, workspaceId: getWorkspaceId(req) });
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  res.json({ message: 'Tag deleted' });
});

module.exports = { getTags, createTag, updateTag, deleteTag };
