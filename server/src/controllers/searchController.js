const searchService = require('../services/search/searchService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const search = asyncHandler(async (req, res) => {
  const result = await searchService.globalSearch(getWorkspaceId(req), req.user._id, req.query);
  res.json(result);
});

module.exports = { search };
