const { asyncHandler } = require("../middleware/errorHandler");
const realEstateService = require("../services/realEstate/realEstateService");

const getWorkspaceId = (req) =>
  req.user?.defaultWorkspaceId?.toString() ||
  req.params.workspaceId ||
  req.body?.workspaceId ||
  req.query.workspaceId;

const getDashboard = asyncHandler(async (req, res) => {
  res.json(await realEstateService.getRealEstateDashboard(getWorkspaceId(req)));
});

const getLeads = asyncHandler(async (req, res) => {
  res.json({ leads: await realEstateService.listLeads(getWorkspaceId(req)) });
});

const updateLead = asyncHandler(async (req, res) => {
  res.json({ lead: await realEstateService.updateLead(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getOwners = asyncHandler(async (req, res) => {
  res.json({ owners: await realEstateService.listOwners(getWorkspaceId(req)) });
});

const createOwner = asyncHandler(async (req, res) => {
  res.status(201).json({ owner: await realEstateService.createOwner(getWorkspaceId(req), req.user._id, req.body) });
});

const updateOwner = asyncHandler(async (req, res) => {
  res.json({ owner: await realEstateService.updateOwner(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getProperties = asyncHandler(async (req, res) => {
  res.json({ properties: await realEstateService.listProperties(getWorkspaceId(req)) });
});

const createProperty = asyncHandler(async (req, res) => {
  res.status(201).json({ property: await realEstateService.createProperty(getWorkspaceId(req), req.user._id, req.body) });
});

const updateProperty = asyncHandler(async (req, res) => {
  res.json({ property: await realEstateService.updateProperty(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getDeals = asyncHandler(async (req, res) => {
  res.json({ deals: await realEstateService.listDeals(getWorkspaceId(req)) });
});

const createDeal = asyncHandler(async (req, res) => {
  res.status(201).json({ deal: await realEstateService.createDeal(getWorkspaceId(req), req.user._id, req.body) });
});

const updateDeal = asyncHandler(async (req, res) => {
  res.json({ deal: await realEstateService.updateDeal(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getViewings = asyncHandler(async (req, res) => {
  res.json({ viewings: await realEstateService.listViewings(getWorkspaceId(req)) });
});

const createViewing = asyncHandler(async (req, res) => {
  res.status(201).json({ viewing: await realEstateService.createViewing(getWorkspaceId(req), req.user._id, req.body) });
});

const updateViewing = asyncHandler(async (req, res) => {
  res.json({ viewing: await realEstateService.updateViewing(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getSettlements = asyncHandler(async (req, res) => {
  res.json({ settlements: await realEstateService.listSettlements(getWorkspaceId(req)) });
});

const createSettlement = asyncHandler(async (req, res) => {
  res.status(201).json({ settlement: await realEstateService.createSettlement(getWorkspaceId(req), req.user._id, req.body) });
});

const updateSettlement = asyncHandler(async (req, res) => {
  res.json({ settlement: await realEstateService.updateSettlement(getWorkspaceId(req), req.user._id, req.params.id, req.body) });
});

const getMaintenanceRequests = asyncHandler(async (req, res) => {
  res.json({ maintenanceRequests: await realEstateService.listMaintenanceRequests(getWorkspaceId(req)) });
});

const createMaintenanceRequest = asyncHandler(async (req, res) => {
  res.status(201).json({ maintenanceRequest: await realEstateService.createMaintenanceRequest(getWorkspaceId(req), req.user._id, req.body) });
});

const getAiSuggestions = asyncHandler(async (req, res) => {
  res.json(await realEstateService.getRealEstateAiSuggestions(getWorkspaceId(req), req.user._id, req.body));
});

module.exports = {
  createDeal,
  createMaintenanceRequest,
  createOwner,
  createProperty,
  createSettlement,
  createViewing,
  getAiSuggestions,
  getDashboard,
  getDeals,
  getLeads,
  getMaintenanceRequests,
  getOwners,
  getProperties,
  getSettlements,
  getViewings,
  updateDeal,
  updateLead,
  updateOwner,
  updateProperty,
  updateSettlement,
  updateViewing,
};
