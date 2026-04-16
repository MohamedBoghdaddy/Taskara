const ActionApproval = require("../../models/ActionApproval");
const AgencyAccount = require("../../models/AgencyAccount");
const Campaign = require("../../models/Campaign");
const ClientReport = require("../../models/ClientReport");
const ContentItem = require("../../models/ContentItem");
const RetainerContract = require("../../models/RetainerContract");
const { buildDashboardWidgets } = require("../dashboards/dashboardRegistryService");
const {
  generateAgencyContentCalendar,
  generateAgencyContentIdeas,
  generateAgencyReportSummary,
} = require("../ai/aiService");
const { extractAgencyReportIntelligence } = require("../documents/documentIntelligenceService");
const { logActivity } = require("../../utils/activityLogger");

const getAgencyDashboard = async (workspaceId) => {
  const [clients, campaigns, contentItems, reports, retainers, approvals] = await Promise.all([
    AgencyAccount.find({ workspaceId }).sort({ updatedAt: -1 }).limit(8),
    Campaign.find({ workspaceId }).sort({ updatedAt: -1 }).limit(8),
    ContentItem.find({ workspaceId }).sort({ scheduledFor: 1, updatedAt: -1 }).limit(12),
    ClientReport.find({ workspaceId }).sort({ updatedAt: -1 }).limit(8),
    RetainerContract.find({ workspaceId }).sort({ updatedAt: -1 }).limit(8),
    ActionApproval.find({ workspaceId, audienceType: "agencies", status: "pending" }).sort({ createdAt: -1 }).limit(10),
  ]);

  const activeClients = clients.filter((client) => ["active", "watch", "at_risk"].includes(client.status)).length;
  const campaignStatus = ["planned", "active", "pending_client", "reporting", "completed", "at_risk"].map((status) => ({
    status,
    count: campaigns.filter((campaign) => campaign.status === status).length,
  }));
  const contentQueue = contentItems.filter((item) => ["draft", "review", "approved", "scheduled"].includes(item.status)).length;
  const reportReadiness = reports.filter((report) => ["review", "ready"].includes(report.status)).length;
  const wrongSendRisk = contentItems.filter(
    (item) => ["scheduled", "published"].includes(item.status) && item.approvalState !== "approved",
  ).length + approvals.length;
  const atRiskAccounts = clients.filter((client) => client.status === "at_risk").length;

  return {
    vertical: "agencies",
    summary: {
      activeClients,
      contentQueue,
      pendingApprovals: approvals.length,
      reportReadiness,
      atRiskAccounts,
    },
    widgets: buildDashboardWidgets({
      vertical: "agencies",
      surfaceMode: "operator",
      audienceType: "agencies",
      data: {
        active_clients: activeClients,
        campaign_status: campaignStatus,
        content_queue: contentQueue,
        pending_approvals: approvals.length,
        report_readiness: reportReadiness,
        wrong_send_risk: wrongSendRisk,
      },
    }),
    trustSummary: {
      level: wrongSendRisk > 0 ? "medium" : "low",
      wrongSendRisk,
      explanation:
        wrongSendRisk > 0
          ? "Client-facing sends or scheduled outputs still need approval coverage."
          : "Client-facing outputs are staying inside the review path.",
    },
    clients,
    campaigns,
    contentItems,
    reports,
    retainers,
    approvals,
    emptyStateExample: {
      clientName: "Northwind",
      campaignName: "Q3 Growth Sprint",
      contentTitle: "Launch-week LinkedIn post",
      reportTitle: "Northwind monthly performance report",
    },
  };
};

const listClients = async (workspaceId) =>
  AgencyAccount.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100);

const createClient = async (workspaceId, userId, payload) => {
  const client = await AgencyAccount.create({
    workspaceId,
    createdBy: userId,
    name: payload.name,
    clientName: payload.clientName || payload.name,
    ownerId: payload.ownerId || null,
    serviceTier: payload.serviceTier || "",
    contacts: payload.contacts || [],
    status: payload.status || "active",
    retainerVisibility: payload.retainerVisibility || {},
  });
  await logActivity({ workspaceId, userId, action: "agency_client_created", entityType: "agency_account", entityId: client._id });
  return client;
};

const updateClient = async (workspaceId, userId, clientId, payload) => {
  const client = await AgencyAccount.findOneAndUpdate({ _id: clientId, workspaceId }, payload, { new: true, runValidators: true });
  if (!client) throw { status: 404, message: "Client not found" };
  await logActivity({ workspaceId, userId, action: "agency_client_updated", entityType: "agency_account", entityId: client._id });
  return client;
};

const listCampaigns = async (workspaceId) =>
  Campaign.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100).populate("accountId", "name clientName");

const createCampaign = async (workspaceId, userId, payload) => {
  const campaign = await Campaign.create({
    workspaceId,
    createdBy: userId,
    accountId: payload.accountId,
    ownerId: payload.ownerId || null,
    name: payload.name,
    goal: payload.goal || "",
    status: payload.status || "planned",
    channels: payload.channels || [],
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    budgetAmount: payload.budgetAmount || 0,
    budgetCurrency: payload.budgetCurrency || "USD",
  });
  await logActivity({ workspaceId, userId, action: "agency_campaign_created", entityType: "campaign", entityId: campaign._id });
  return campaign;
};

const updateCampaign = async (workspaceId, userId, campaignId, payload) => {
  const campaign = await Campaign.findOneAndUpdate({ _id: campaignId, workspaceId }, payload, { new: true, runValidators: true });
  if (!campaign) throw { status: 404, message: "Campaign not found" };
  await logActivity({ workspaceId, userId, action: "agency_campaign_updated", entityType: "campaign", entityId: campaign._id });
  return campaign;
};

const listContentItems = async (workspaceId) =>
  ContentItem.find({ workspaceId }).sort({ scheduledFor: 1, updatedAt: -1 }).limit(100)
    .populate("accountId", "name clientName")
    .populate("campaignId", "name");

const createContentItem = async (workspaceId, userId, payload) => {
  const contentItem = await ContentItem.create({
    workspaceId,
    accountId: payload.accountId,
    campaignId: payload.campaignId || null,
    createdBy: userId,
    ownerId: payload.ownerId || null,
    title: payload.title,
    contentType: payload.contentType || "post",
    channel: payload.channel || "internal",
    status: payload.status || "draft",
    caption: payload.caption || "",
    hashtags: payload.hashtags || [],
    previewText: payload.previewText || payload.caption || "",
    scheduledFor: payload.scheduledFor || null,
    approvalState:
      ["scheduled", "published"].includes(payload.status) || payload.channel !== "internal"
        ? payload.approvalState || "pending"
        : payload.approvalState || "not_required",
    assetIds: payload.assetIds || [],
    aiConfidence: payload.aiConfidence || null,
    sourceSnippet: payload.sourceSnippet || "",
  });
  await logActivity({ workspaceId, userId, action: "agency_content_created", entityType: "content_item", entityId: contentItem._id });
  return contentItem;
};

const updateContentItem = async (workspaceId, userId, contentItemId, payload) => {
  const patch = { ...payload };
  if ((payload.status && ["scheduled", "published"].includes(payload.status)) && !payload.approvalState) {
    patch.approvalState = "pending";
  }
  const contentItem = await ContentItem.findOneAndUpdate({ _id: contentItemId, workspaceId }, patch, { new: true, runValidators: true });
  if (!contentItem) throw { status: 404, message: "Content item not found" };
  await logActivity({ workspaceId, userId, action: "agency_content_updated", entityType: "content_item", entityId: contentItem._id });
  return contentItem;
};

const listReports = async (workspaceId) =>
  ClientReport.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100)
    .populate("accountId", "name clientName")
    .populate("campaignId", "name");

const createReport = async (workspaceId, userId, payload) => {
  const intelligence = await extractAgencyReportIntelligence({
    text: payload.sourceText || JSON.stringify(payload.metrics || {}),
    metadata: {
      reportTitle: payload.title,
      accountId: payload.accountId,
    },
  });
  const aiSummary = await generateAgencyReportSummary(workspaceId, userId, {
    reportTitle: payload.title,
    metrics: payload.metrics || {},
    extracted: intelligence.entities,
  });

  const report = await ClientReport.create({
    workspaceId,
    accountId: payload.accountId,
    campaignId: payload.campaignId || null,
    createdBy: userId,
    title: payload.title,
    periodStart: payload.periodStart || null,
    periodEnd: payload.periodEnd || null,
    status: payload.status || "draft",
    metrics: payload.metrics || {},
    summary: payload.summary || aiSummary.summary,
    generatedByAI: !payload.summary,
    aiConfidence: intelligence.confidenceScore,
    recipientEmails: payload.recipientEmails || [],
  });
  await logActivity({ workspaceId, userId, action: "agency_report_created", entityType: "client_report", entityId: report._id });
  return report;
};

const updateReport = async (workspaceId, userId, reportId, payload) => {
  const report = await ClientReport.findOneAndUpdate({ _id: reportId, workspaceId }, payload, { new: true, runValidators: true });
  if (!report) throw { status: 404, message: "Report not found" };
  await logActivity({ workspaceId, userId, action: "agency_report_updated", entityType: "client_report", entityId: report._id });
  return report;
};

const listRetainers = async (workspaceId) =>
  RetainerContract.find({ workspaceId }).sort({ updatedAt: -1 }).limit(100).populate("accountId", "name clientName");

const createRetainer = async (workspaceId, userId, payload) => {
  const retainer = await RetainerContract.create({
    workspaceId,
    accountId: payload.accountId,
    createdBy: userId,
    packageName: payload.packageName,
    billingType: payload.billingType || "monthly",
    monthlyAmount: payload.monthlyAmount || 0,
    currency: payload.currency || "USD",
    status: payload.status || "active",
    activeFrom: payload.activeFrom || null,
    renewsAt: payload.renewsAt || null,
    notes: payload.notes || "",
  });

  await AgencyAccount.updateOne(
    { _id: payload.accountId, workspaceId },
    {
      $set: {
        "retainerVisibility.packageLabel": retainer.packageName,
        "retainerVisibility.monthlyAmount": retainer.monthlyAmount,
        "retainerVisibility.currency": retainer.currency,
        "retainerVisibility.renewalDate": retainer.renewsAt,
      },
    },
  );

  await logActivity({ workspaceId, userId, action: "agency_retainer_created", entityType: "retainer_contract", entityId: retainer._id });
  return retainer;
};

const listApprovals = async (workspaceId) =>
  ActionApproval.find({ workspaceId, audienceType: "agencies" }).sort({ createdAt: -1 }).limit(100);

const getAgencyAiSuggestions = async (workspaceId, userId, payload) => {
  const [ideas, calendar] = await Promise.all([
    generateAgencyContentIdeas(workspaceId, userId, payload),
    generateAgencyContentCalendar(workspaceId, userId, payload),
  ]);
  return {
    ideas: ideas.ideas,
    calendar: calendar.calendar,
  };
};

module.exports = {
  createCampaign,
  createClient,
  createContentItem,
  createReport,
  createRetainer,
  getAgencyAiSuggestions,
  getAgencyDashboard,
  listApprovals,
  listCampaigns,
  listClients,
  listContentItems,
  listReports,
  listRetainers,
  updateCampaign,
  updateClient,
  updateContentItem,
  updateReport,
};
