const inboxService = require("../services/inbox/inboxService");
const { asyncHandler } = require("../middleware/errorHandler");

const getWorkspaceId = (req) =>
  req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getItems = asyncHandler(async (req, res) => {
  const result = await inboxService.getItems(
    getWorkspaceId(req),
    req.user._id,
    req.query,
  );
  res.json(result);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await inboxService.getUnreadCount(
    getWorkspaceId(req),
    req.user._id,
  );

  // Generate consistent ETag for this user/workspace
  const eTag = `"unread-${getWorkspaceId(req)}-${req.user._id}-${result.count}"`;

  // Check If-None-Match header
  if (req.headers["if-none-match"] === eTag) {
    return res.status(304).end(); // Return 304 if count unchanged
  }

  // Set cache headers
  res.set({
    ETag: eTag,
    "Cache-Control": "private, max-age=5", // Cache for 5 seconds
    Expires: new Date(Date.now() + 5000).toUTCString(),
  });

  res.json(result);
});

const createItem = asyncHandler(async (req, res) => {
  const item = await inboxService.createItem(
    getWorkspaceId(req),
    req.user._id,
    req.body,
  );
  res.status(201).json(item);
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await inboxService.updateItem(
    getWorkspaceId(req),
    req.user._id,
    req.params.id,
    req.body,
  );
  res.json(item);
});

const convertItem = asyncHandler(async (req, res) => {
  const result = await inboxService.convertItem(
    getWorkspaceId(req),
    req.user._id,
    req.params.id,
    req.body,
  );
  res.json(result);
});

module.exports = {
  getItems,
  getUnreadCount,
  createItem,
  updateItem,
  convertItem,
};
