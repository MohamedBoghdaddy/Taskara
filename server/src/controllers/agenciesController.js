const { asyncHandler } = require("../middleware/errorHandler");
const agencyService = require("../services/agencies/agencyService");

const getWorkspaceId = (req) =>
  req.user?.defaultWorkspaceId?.toString() ||
  req.params.workspaceId ||
  req.body?.workspaceId ||
  req.query.workspaceId;

const getDashboard = asyncHandler(async (req, res) => {
  res.json(await agencyService.getAgencyDashboard(getWorkspaceId(req)));
});

const getClients = asyncHandler(async (req, res) => {
  res.json({ clients: await agencyService.listClients(getWorkspaceId(req)) });
});

const createClient = asyncHandler(async (req, res) => {
  res.status(201).json({ client: await agencyService.createClient(getWorkspaceId(req), req.user._id, req.body) });
});

const updateClient = asyncHandler(async (req, res) => {
  res.json({ client: await agencyService.updateClient(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getCampaigns = asyncHandler(async (req, res) => {
  res.json({ campaigns: await agencyService.listCampaigns(getWorkspaceId(req)) });
});

const createCampaign = asyncHandler(async (req, res) => {
  res.status(201).json({ campaign: await agencyService.createCampaign(getWorkspaceId(req), req.user._id, req.body) });
});

const updateCampaign = asyncHandler(async (req, res) => {
  res.json({ campaign: await agencyService.updateCampaign(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getContentItems = asyncHandler(async (req, res) => {
  res.json({ contentItems: await agencyService.listContentItems(getWorkspaceId(req)) });
});

const createContentItem = asyncHandler(async (req, res) => {
  res.status(201).json({ contentItem: await agencyService.createContentItem(getWorkspaceId(req), req.user._id, req.body) });
});

const updateContentItem = asyncHandler(async (req, res) => {
  res.json({ contentItem: await agencyService.updateContentItem(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getReports = asyncHandler(async (req, res) => {
  res.json({ reports: await agencyService.listReports(getWorkspaceId(req)) });
});

const createReport = asyncHandler(async (req, res) => {
  res.status(201).json({ report: await agencyService.createReport(getWorkspaceId(req), req.user._id, req.body) });
});

const updateReport = asyncHandler(async (req, res) => {
  res.json({ report: await agencyService.updateReport(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getRetainers = asyncHandler(async (req, res) => {
  res.json({ retainers: await agencyService.listRetainers(getWorkspaceId(req)) });
});

const createRetainer = asyncHandler(async (req, res) => {
  res.status(201).json({ retainer: await agencyService.createRetainer(getWorkspaceId(req), req.user._id, req.body) });
});

const getApprovals = asyncHandler(async (req, res) => {
  res.json({ approvals: await agencyService.listApprovals(getWorkspaceId(req)) });
});

const getAiSuggestions = asyncHandler(async (req, res) => {
  res.json(await agencyService.getAgencyAiSuggestions(getWorkspaceId(req), req.user._id, req.body));
});

module.exports = {
  createCampaign,
  createClient,
  createContentItem,
  createReport,
  createRetainer,
  getAiSuggestions,
  getApprovals,
  getCampaigns,
  getClients,
  getContentItems,
  getDashboard,
  getReports,
  getRetainers,
  updateCampaign,
  updateClient,
  updateContentItem,
  updateReport,
};
