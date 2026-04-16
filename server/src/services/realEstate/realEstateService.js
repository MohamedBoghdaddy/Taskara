const Deal = require("../../models/Deal");
const MaintenanceRequest = require("../../models/MaintenanceRequest");
const Owner = require("../../models/Owner");
const Property = require("../../models/Property");
const RealEstateLead = require("../../models/RealEstateLead");
const Settlement = require("../../models/Settlement");
const Viewing = require("../../models/Viewing");
const { buildDashboardWidgets } = require("../dashboards/dashboardRegistryService");
const {
  generateOwnerSettlementSummary,
  generateRealEstateListingDescription,
  recommendRealEstateLeadMatches,
  summarizeRealEstateConversation,
} = require("../ai/aiService");
const { extractSettlementIntelligence } = require("../documents/documentIntelligenceService");
const { logActivity } = require("../../utils/activityLogger");

const getRealEstateDashboard = async (workspaceId) => {
  const [leads, properties, deals, viewings, settlements, maintenanceRequests] = await Promise.all([
    RealEstateLead.find({ workspaceId }).sort({ updatedAt: -1 }).limit(10),
    Property.find({ workspaceId }).sort({ updatedAt: -1 }).limit(10).populate("ownerId", "name"),
    Deal.find({ workspaceId }).sort({ updatedAt: -1 }).limit(10).populate("leadId", "name").populate("propertyId", "title"),
    Viewing.find({ workspaceId }).sort({ scheduledFor: 1 }).limit(10).populate("propertyId", "title").populate("leadId", "name"),
    Settlement.find({ workspaceId }).sort({ dueAt: 1, updatedAt: -1 }).limit(10).populate("ownerId", "name"),
    MaintenanceRequest.find({ workspaceId }).sort({ updatedAt: -1 }).limit(10).populate("propertyId", "title"),
  ]);

  const newLeads = leads.filter((lead) => lead.currentStage === "new_lead").length;
  const activeDeals = ["qualified", "viewing", "offer", "negotiation", "under_contract", "closing", "closed", "lost"].map((stage) => ({
    stage,
    count: deals.filter((deal) => deal.stage === stage).length,
  }));
  const viewingSchedule = viewings.filter((viewing) => viewing.status === "scheduled");
  const settlementsDue = settlements.filter((settlement) => ["draft", "review", "ready", "approved"].includes(settlement.status)).length;
  const moneyAtRisk = settlements
    .filter((settlement) => ["draft", "review", "ready"].includes(settlement.status))
    .reduce((sum, settlement) => sum + (settlement.amount || 0), 0);
  const maintenanceBacklog = maintenanceRequests.filter((request) => request.status !== "done").length;

  return {
    vertical: "realestate",
    summary: {
      newLeads,
      settlementsDue,
      moneyAtRisk,
      maintenanceBacklog,
    },
    widgets: buildDashboardWidgets({
      vertical: "realestate",
      surfaceMode: "operator",
      audienceType: "realestate",
      data: {
        new_leads: newLeads,
        active_deals: activeDeals,
        viewing_schedule: viewingSchedule,
        settlements_due: settlementsDue,
        money_at_risk: moneyAtRisk,
        maintenance_backlog: maintenanceBacklog,
      },
    }),
    trustSummary: {
      level: settlementsDue > 0 ? "medium" : "low",
      explanation:
        settlementsDue > 0
          ? "Owner settlements still need review before release."
          : "Money movement is not waiting on unresolved settlement review.",
    },
    leads,
    properties,
    deals,
    viewings,
    settlements,
    maintenanceRequests,
  };
};

const listLeads = async (workspaceId) =>
  RealEstateLead.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100);

const updateLead = async (workspaceId, userId, leadId, payload) => {
  const lead = await RealEstateLead.findOneAndUpdate({ _id: leadId, workspaceId }, payload, { new: true, runValidators: true });
  if (!lead) throw { status: 404, message: "Lead not found" };
  await logActivity({ workspaceId, userId, action: "realestate_lead_updated", entityType: "realestate_lead", entityId: lead._id });
  return lead;
};

const listOwners = async (workspaceId) =>
  Owner.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100);

const createOwner = async (workspaceId, userId, payload) => {
  const owner = await Owner.create({
    workspaceId,
    createdBy: userId,
    name: payload.name,
    email: payload.email || "",
    phone: payload.phone || "",
    status: payload.status || "active",
    preferredPayoutMethod: payload.preferredPayoutMethod || "",
    payoutRecipients: payload.payoutRecipients || [],
    notesSummary: payload.notesSummary || "",
  });
  await logActivity({ workspaceId, userId, action: "realestate_owner_created", entityType: "owner", entityId: owner._id });
  return owner;
};

const updateOwner = async (workspaceId, userId, ownerId, payload) => {
  const owner = await Owner.findOneAndUpdate({ _id: ownerId, workspaceId }, payload, { new: true, runValidators: true });
  if (!owner) throw { status: 404, message: "Owner not found" };
  await logActivity({ workspaceId, userId, action: "realestate_owner_updated", entityType: "owner", entityId: owner._id });
  return owner;
};

const listProperties = async (workspaceId) =>
  Property.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100).populate("ownerId", "name");

const createProperty = async (workspaceId, userId, payload) => {
  const description = payload.aiDescription
    ? { description: payload.description || "", aiDescription: payload.aiDescription, aiConfidence: payload.aiConfidence || null }
    : await generateRealEstateListingDescription(workspaceId, userId, { property: payload }).then((result) => ({
        description: payload.description || "",
        aiDescription: result.description,
        aiConfidence: 72,
      }));

  const property = await Property.create({
    workspaceId,
    ownerId: payload.ownerId,
    createdBy: userId,
    title: payload.title,
    status: payload.status || "draft",
    propertyType: payload.propertyType || "",
    address: payload.address || "",
    city: payload.city || "",
    price: payload.price || 0,
    currency: payload.currency || "USD",
    bedrooms: payload.bedrooms || 0,
    bathrooms: payload.bathrooms || 0,
    ...description,
  });
  await logActivity({ workspaceId, userId, action: "realestate_property_created", entityType: "property", entityId: property._id });
  return property;
};

const updateProperty = async (workspaceId, userId, propertyId, payload) => {
  const property = await Property.findOneAndUpdate({ _id: propertyId, workspaceId }, payload, { new: true, runValidators: true });
  if (!property) throw { status: 404, message: "Property not found" };
  await logActivity({ workspaceId, userId, action: "realestate_property_updated", entityType: "property", entityId: property._id });
  return property;
};

const listDeals = async (workspaceId) =>
  Deal.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100)
    .populate("leadId", "name")
    .populate("propertyId", "title")
    .populate("ownerId", "name");

const createDeal = async (workspaceId, userId, payload) => {
  const deal = await Deal.create({
    workspaceId,
    leadId: payload.leadId,
    propertyId: payload.propertyId,
    ownerId: payload.ownerId,
    createdBy: userId,
    assignedAgentId: payload.assignedAgentId || null,
    title: payload.title,
    stage: payload.stage || "qualified",
    amount: payload.amount || 0,
    currency: payload.currency || "USD",
    nextAction: payload.nextAction || "",
    paymentStatus: payload.paymentStatus || "pending",
    aiSummary: payload.aiSummary || "",
    aiConfidence: payload.aiConfidence || null,
  });
  await RealEstateLead.updateOne({ _id: payload.leadId, workspaceId }, { $set: { currentStage: payload.stage || "qualified" } });
  await logActivity({ workspaceId, userId, action: "realestate_deal_created", entityType: "deal", entityId: deal._id });
  return deal;
};

const updateDeal = async (workspaceId, userId, dealId, payload) => {
  const deal = await Deal.findOneAndUpdate({ _id: dealId, workspaceId }, payload, { new: true, runValidators: true });
  if (!deal) throw { status: 404, message: "Deal not found" };
  if (payload.stage) {
    await RealEstateLead.updateOne({ _id: deal.leadId, workspaceId }, { $set: { currentStage: payload.stage } });
  }
  await logActivity({ workspaceId, userId, action: "realestate_deal_updated", entityType: "deal", entityId: deal._id });
  return deal;
};

const listViewings = async (workspaceId) =>
  Viewing.find({ workspaceId }).sort({ scheduledFor: 1 }).limit(100)
    .populate("propertyId", "title")
    .populate("leadId", "name");

const createViewing = async (workspaceId, userId, payload) => {
  const viewing = await Viewing.create({
    workspaceId,
    propertyId: payload.propertyId,
    leadId: payload.leadId,
    dealId: payload.dealId || null,
    createdBy: userId,
    scheduledFor: payload.scheduledFor,
    status: payload.status || "scheduled",
    notes: payload.notes || "",
  });
  await logActivity({ workspaceId, userId, action: "realestate_viewing_created", entityType: "viewing", entityId: viewing._id });
  return viewing;
};

const updateViewing = async (workspaceId, userId, viewingId, payload) => {
  const viewing = await Viewing.findOneAndUpdate({ _id: viewingId, workspaceId }, payload, { new: true, runValidators: true });
  if (!viewing) throw { status: 404, message: "Viewing not found" };
  await logActivity({ workspaceId, userId, action: "realestate_viewing_updated", entityType: "viewing", entityId: viewing._id });
  return viewing;
};

const listSettlements = async (workspaceId) =>
  Settlement.find({ workspaceId }).sort({ dueAt: 1, updatedAt: -1 }).limit(100)
    .populate("ownerId", "name")
    .populate("dealId", "title");

const createSettlement = async (workspaceId, userId, payload) => {
  const intelligence = await extractSettlementIntelligence({
    text: payload.sourceText || `${payload.recipientName || ""} ${payload.amount || 0} ${payload.currency || "USD"}`,
    metadata: { ownerId: payload.ownerId, dealId: payload.dealId },
  });
  const summary = await generateOwnerSettlementSummary(workspaceId, userId, {
    ownerName: payload.ownerName || "Owner",
    amount: payload.amount || 0,
    currency: payload.currency || "USD",
    dueAt: payload.dueAt || null,
  });

  const settlement = await Settlement.create({
    workspaceId,
    dealId: payload.dealId,
    ownerId: payload.ownerId,
    createdBy: userId,
    recipientName: payload.recipientName || "",
    recipientReference: payload.recipientReference || "",
    amount: payload.amount || 0,
    currency: payload.currency || "USD",
    dueAt: payload.dueAt || null,
    status: payload.status || "draft",
    approvalRequired: payload.approvalRequired !== undefined ? payload.approvalRequired : true,
    aiSummary: payload.aiSummary || summary.summary,
    aiConfidence: intelligence.confidenceScore,
  });
  await logActivity({ workspaceId, userId, action: "realestate_settlement_created", entityType: "settlement", entityId: settlement._id });
  return settlement;
};

const updateSettlement = async (workspaceId, userId, settlementId, payload) => {
  const settlement = await Settlement.findOneAndUpdate({ _id: settlementId, workspaceId }, payload, { new: true, runValidators: true });
  if (!settlement) throw { status: 404, message: "Settlement not found" };
  await logActivity({ workspaceId, userId, action: "realestate_settlement_updated", entityType: "settlement", entityId: settlement._id });
  return settlement;
};

const listMaintenanceRequests = async (workspaceId) =>
  MaintenanceRequest.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100).populate("propertyId", "title");

const createMaintenanceRequest = async (workspaceId, userId, payload) => {
  const request = await MaintenanceRequest.create({
    workspaceId,
    propertyId: payload.propertyId,
    createdBy: userId,
    vendorName: payload.vendorName || "",
    summary: payload.summary,
    status: payload.status || "requested",
    dueAt: payload.dueAt || null,
  });
  await logActivity({ workspaceId, userId, action: "realestate_maintenance_created", entityType: "maintenance_request", entityId: request._id });
  return request;
};

const getRealEstateAiSuggestions = async (workspaceId, userId, payload) => {
  if (payload.mode === "conversation_summary") {
    return summarizeRealEstateConversation(workspaceId, userId, { text: payload.text || "" });
  }

  if (payload.mode === "lead_match") {
    const properties = payload.properties?.length ? payload.properties : await Property.find({ workspaceId, status: { $in: ["draft", "active"] } }).limit(5);
    return recommendRealEstateLeadMatches(workspaceId, userId, {
      lead: payload.lead || {},
      properties,
    });
  }

  if (payload.mode === "owner_update") {
    return generateOwnerSettlementSummary(workspaceId, userId, payload);
  }

  return generateRealEstateListingDescription(workspaceId, userId, { property: payload.property || payload });
};

module.exports = {
  createDeal,
  createMaintenanceRequest,
  createOwner,
  createProperty,
  createSettlement,
  createViewing,
  getRealEstateAiSuggestions,
  getRealEstateDashboard,
  listDeals,
  listLeads,
  listMaintenanceRequests,
  listOwners,
  listProperties,
  listSettlements,
  listViewings,
  updateDeal,
  updateLead,
  updateOwner,
  updateProperty,
  updateSettlement,
  updateViewing,
};
