const collaborationService = require('../services/collaboration/collaborationService');
const analyticsService = require('../services/analytics/analyticsService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId || req.params.workspaceId;

const inviteMember = asyncHandler(async (req, res) => {
  const result = await collaborationService.inviteMember(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(result);
});

const getMembers = asyncHandler(async (req, res) => {
  const members = await collaborationService.getMembers(getWorkspaceId(req));
  res.json(members);
});

const addComment = asyncHandler(async (req, res) => {
  const comment = await collaborationService.addComment(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(comment);
});

const getComments = asyncHandler(async (req, res) => {
  const comments = await collaborationService.getComments(getWorkspaceId(req), req.query.entityType, req.query.entityId);
  res.json(comments);
});

const getActivity = asyncHandler(async (req, res) => {
  const result = await collaborationService.getActivity(getWorkspaceId(req), req.query);
  res.json(result);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats(getWorkspaceId(req), req.user._id);
  res.json(stats);
});

const getTaskAnalytics = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getTaskAnalytics(getWorkspaceId(req), req.user._id, req.query);
  res.json(stats);
});

const getFocusAnalytics = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getFocusAnalytics(getWorkspaceId(req), req.user._id, req.query);
  res.json(stats);
});

module.exports = { inviteMember, getMembers, addComment, getComments, getActivity, getDashboardStats, getTaskAnalytics, getFocusAnalytics };
