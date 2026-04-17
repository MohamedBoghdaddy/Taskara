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

const STALE_LEAD_DAYS = 3;

const isStale = (value, days) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
};

const buildRealEstateAssistantBrief = ({
  newLeads,
  settlementsDue,
  moneyAtRisk,
  maintenanceBacklog,
  staleLeads,
  upcomingViewings,
}) => {
  const headline =
    settlementsDue > 0
      ? "Money movement is waiting on review."
      : staleLeads.length > 0
        ? "Lead momentum needs attention."
        : upcomingViewings.length > 0
          ? "The pipeline is moving toward scheduled activity."
          : "The pipeline is quiet right now.";

  const summary = [
    newLeads
      ? `${newLeads} fresh lead${newLeads === 1 ? "" : "s"} entered the workspace recently.`
      : "No new leads landed recently.",
    settlementsDue
      ? `${settlementsDue} settlement${settlementsDue === 1 ? "" : "s"} still need review before release.`
      : "No settlement releases are blocked by pending review.",
    moneyAtRisk
      ? `${moneyAtRisk} remains exposed while draft or review-stage settlements stay unresolved.`
      : "No draft settlement value is currently sitting at risk.",
  ]
    .concat(
      maintenanceBacklog ? [`${maintenanceBacklog} maintenance request${maintenanceBacklog === 1 ? "" : "s"} still need tracking.`] : [],
    )
    .join(" ");

  return {
    headline,
    summary,
    confidence: Math.max(46, 84 - settlementsDue * 7 - staleLeads.length * 5),
    mode: settlementsDue > 0 ? "review-aware" : "pipeline-watch",
    generatedAt: new Date().toISOString(),
    sources: [
      { label: "Leads", count: newLeads },
      { label: "Viewings", count: upcomingViewings.length },
      { label: "Settlements", count: settlementsDue },
    ],
  };
};

const buildRealEstateAttentionItems = ({
  settlementsDue,
  moneyAtRisk,
  staleLeads,
  upcomingViewings,
  maintenanceBacklog,
}) =>
  [
    settlementsDue
      ? {
          id: "re-settlement-review",
          label: "Owner settlements are waiting on review",
          description: moneyAtRisk
            ? `${moneyAtRisk} is still tied up in draft or review-stage settlements.`
            : "Review payout recipients and release readiness before money moves.",
          state: `${settlementsDue} pending`,
          tone: "trust",
          requiresApproval: true,
          route: "/real-estate/settlements",
        }
      : null,
    staleLeads.length
      ? {
          id: "re-stale-leads",
          label: "Some leads have gone stale",
          description: "Re-open the lead queue and move the oldest untouched opportunities forward.",
          state: `${staleLeads.length} stale`,
          tone: "danger",
          route: "/real-estate/leads",
        }
      : null,
    upcomingViewings.length
      ? {
          id: "re-viewings",
          label: "Upcoming viewings need confirmation",
          description: "Make sure the property, lead, and notes are ready before the next showing.",
          state: `${upcomingViewings.length} scheduled`,
          tone: "info",
          route: "/real-estate/viewings",
        }
      : null,
    maintenanceBacklog
      ? {
          id: "re-maintenance",
          label: "Maintenance backlog can affect listing readiness",
          description: "Close open property tasks so upcoming deals and viewings do not stall.",
          state: `${maintenanceBacklog} open`,
          tone: "warning",
          route: "/real-estate/properties",
        }
      : null,
  ].filter(Boolean);

const buildRealEstateRecommendedActions = ({ settlements, staleLeads, deals, upcomingViewings }) => {
  const nextSettlement = settlements.find((settlement) => ["draft", "review", "ready"].includes(settlement.status));
  const nextLead = staleLeads[0];
  const nextDeal = deals.find((deal) => ["qualified", "under_contract", "closing"].includes(deal.stage));
  const nextViewing = upcomingViewings[0];

  return [
    nextSettlement
      ? {
          id: "re-rec-settlement",
          label: `Review settlement for ${nextSettlement.ownerId?.name || "the owner"}`,
          description: "Confirm payout recipient details and release readiness before finance action.",
          state: "Money review",
          tone: "trust",
          requiresApproval: true,
        }
      : null,
    nextLead
      ? {
          id: "re-rec-lead",
          label: `Follow up with ${nextLead.name}`,
          description: nextLead.nextRequiredAction || "Re-open the lead and move it into the next stage.",
          state: "Lead flow",
          tone: "danger",
        }
      : null,
    nextViewing
      ? {
          id: "re-rec-viewing",
          label: `Prep the ${nextViewing.propertyId?.title || "next"} viewing`,
          description: "Check property notes, attendee expectations, and post-viewing follow-up owner.",
          state: "Viewing prep",
          tone: "info",
        }
      : null,
    nextDeal
      ? {
          id: "re-rec-deal",
          label: `Move ${nextDeal.title} to its next checkpoint`,
          description: "Deal momentum improves when the next document or payment action is explicit.",
          state: "Deal flow",
          tone: "info",
        }
      : null,
  ].filter(Boolean);
};

const buildRealEstateSetupChecklist = ({ owners, properties, deals, settlements }) => [
  {
    id: "re-owner",
    label: "Add an owner record",
    complete: owners.length > 0,
    hint: "Owners unlock payout review, settlement summaries, and recipient checks.",
    route: "/real-estate/properties",
  },
  {
    id: "re-property",
    label: "Add an active property",
    complete: properties.length > 0,
    hint: "Properties create the inventory context for viewings and deals.",
    route: "/real-estate/properties",
  },
  {
    id: "re-deal",
    label: "Start one deal",
    complete: deals.length > 0,
    hint: "Deals connect leads, property context, and payment state.",
    route: "/real-estate/deals",
  },
  {
    id: "re-settlement",
    label: "Create a settlement draft",
    complete: settlements.length > 0,
    hint: "Settlements make owner-facing money movement transparent before release.",
    route: "/real-estate/settlements",
  },
];

const buildRealEstateActivityTimeline = ({ deals, viewings, settlements, maintenanceRequests, properties }) =>
  [
    ...deals.map((deal) => ({
      id: `deal-${deal._id}`,
      label: deal.title,
      meta: `${deal.stage} stage with ${deal.paymentStatus} payment status.`,
      at: deal.updatedAt || deal.createdAt,
      state: "Deal",
      tone: "info",
    })),
    ...viewings.map((viewing) => ({
      id: `viewing-${viewing._id}`,
      label: viewing.propertyId?.title || "Viewing",
      meta: `${viewing.leadId?.name || "Lead"} is ${viewing.status} for ${viewing.scheduledFor ? new Date(viewing.scheduledFor).toLocaleString() : "the upcoming slot"}.`,
      at: viewing.updatedAt || viewing.createdAt || viewing.scheduledFor,
      state: "Viewing",
      tone: "info",
    })),
    ...settlements.map((settlement) => ({
      id: `settlement-${settlement._id}`,
      label: `Settlement for ${settlement.ownerId?.name || "owner"}`,
      meta: `${settlement.currency} ${settlement.amount || 0} is ${settlement.status}.`,
      at: settlement.updatedAt || settlement.createdAt,
      state: "Settlement",
      tone: settlement.approvalRequired ? "trust" : "warning",
    })),
    ...maintenanceRequests.map((request) => ({
      id: `maintenance-${request._id}`,
      label: request.summary,
      meta: `${request.vendorName || "Vendor"} task is ${request.status}.`,
      at: request.updatedAt || request.createdAt,
      state: "Maintenance",
      tone: request.status === "done" ? "success" : "warning",
    })),
    ...properties.map((property) => ({
      id: `property-${property._id}`,
      label: property.title,
      meta: `${property.status} listing in ${property.city || "the area"}.`,
      at: property.updatedAt || property.createdAt,
      state: "Property",
      tone: "info",
    })),
  ]
    .sort((left, right) => new Date(right.at || 0) - new Date(left.at || 0))
    .slice(0, 8);

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
  const staleLeads = leads.filter((lead) => ["new_lead", "contacted", "qualified"].includes(lead.currentStage) && isStale(lead.updatedAt || lead.createdAt, STALE_LEAD_DAYS));
  const attentionItems = buildRealEstateAttentionItems({
    settlementsDue,
    moneyAtRisk,
    staleLeads,
    upcomingViewings: viewingSchedule,
    maintenanceBacklog,
  });
  const recommendedActions = buildRealEstateRecommendedActions({
    settlements,
    staleLeads,
    deals,
    upcomingViewings: viewingSchedule,
  });
  const setupChecklist = buildRealEstateSetupChecklist({
    owners: properties.map((property) => property.ownerId).filter(Boolean),
    properties,
    deals,
    settlements,
  });
  const activityTimeline = buildRealEstateActivityTimeline({
    deals,
    viewings,
    settlements,
    maintenanceRequests,
    properties,
  });

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
    assistantBrief: buildRealEstateAssistantBrief({
      newLeads,
      settlementsDue,
      moneyAtRisk,
      maintenanceBacklog,
      staleLeads,
      upcomingViewings: viewingSchedule,
    }),
    attentionItems,
    recommendedActions,
    activityTimeline,
    setupChecklist,
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
