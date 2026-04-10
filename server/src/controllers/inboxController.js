const inboxService = require('../services/inbox/inboxService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getItems = asyncHandler(async (req, res) => {
  const result = await inboxService.getItems(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

const createItem = asyncHandler(async (req, res) => {
  const item = await inboxService.createItem(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(item);
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await inboxService.updateItem(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(item);
});

const convertItem = asyncHandler(async (req, res) => {
  const result = await inboxService.convertItem(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(result);
});

module.exports = { getItems, createItem, updateItem, convertItem };
