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

const STALE_CAMPAIGN_DAYS = 7;

const isStale = (value, days) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
};

const mapTone = (level) => {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  if (level === "review") return "trust";
  return "info";
};

const buildAgencyAssistantBrief = ({
  activeClients,
  contentQueue,
  approvals,
  reportReadiness,
  atRiskAccounts,
  wrongSendRisk,
}) => {
  const headline =
    approvals.length > 0
      ? "Client-facing work is waiting on review."
      : atRiskAccounts > 0
        ? "Account health needs operator attention."
        : contentQueue > 0
          ? "Delivery is moving and the queue looks active."
          : "The workspace is quiet right now.";

  const summaryParts = [
    activeClients
      ? `${activeClients} active client${activeClients === 1 ? "" : "s"} currently in motion.`
      : "No active clients are in motion yet.",
    approvals.length
      ? `${approvals.length} approval${approvals.length === 1 ? "" : "s"} still block live sends or reporting.`
      : "No client-facing approvals are waiting right now.",
    reportReadiness
      ? `${reportReadiness} report${reportReadiness === 1 ? "" : "s"} can move into review or send prep.`
      : "No reports are currently staged for review.",
  ];

  if (atRiskAccounts > 0) {
    summaryParts.push(`${atRiskAccounts} account${atRiskAccounts === 1 ? "" : "s"} are flagged at risk.`);
  }

  return {
    headline,
    summary: summaryParts.join(" "),
    confidence: Math.max(48, 86 - wrongSendRisk * 6 - atRiskAccounts * 5),
    mode: wrongSendRisk > 0 ? "review-aware" : "autopilot-ready",
    generatedAt: new Date().toISOString(),
    sources: [
      { label: "Clients", count: activeClients },
      { label: "Approvals", count: approvals.length },
      { label: "Reports", count: reportReadiness },
    ],
  };
};

const buildAgencyAttentionItems = ({ approvals, reports, contentItems, atRiskAccounts, staleCampaigns }) => {
  const clientFacingDrafts = contentItems.filter(
    (item) => item.channel !== "internal" && item.approvalState !== "approved",
  ).length;
  const reportRecipientsPending = reports.filter(
    (report) => ["review", "ready"].includes(report.status) && (report.recipientEmails || []).length,
  ).length;

  return [
    approvals.length
      ? {
          id: "agency-approvals",
          label: "Review pending client-facing actions",
          description: "Live sends and scheduled outputs are waiting on explicit review coverage.",
          state: `${approvals.length} queued`,
          tone: "trust",
          route: "/agency/approvals",
          requiresApproval: true,
        }
      : null,
    clientFacingDrafts
      ? {
          id: "agency-content-review",
          label: "Client-facing content still lacks final approval",
          description: "Scheduled or external-channel content should not ship without visible approval state.",
          state: `${clientFacingDrafts} item${clientFacingDrafts === 1 ? "" : "s"}`,
          tone: "warning",
          route: "/agency/content",
          requiresApproval: true,
        }
      : null,
    atRiskAccounts
      ? {
          id: "agency-risk-accounts",
          label: "At-risk accounts need operator follow-up",
          description: "Open the client list and resolve the accounts most likely to slip.",
          state: `${atRiskAccounts} account${atRiskAccounts === 1 ? "" : "s"}`,
          tone: "danger",
          route: "/agency/clients",
        }
      : null,
    reportRecipientsPending
      ? {
          id: "agency-report-readiness",
          label: "Reports are ready but recipients still need a final check",
          description: "Confirm recipients and summary tone before external delivery.",
          state: `${reportRecipientsPending} report${reportRecipientsPending === 1 ? "" : "s"}`,
          tone: "warning",
          route: "/agency/reports",
        }
      : null,
    staleCampaigns.length
      ? {
          id: "agency-stale-campaigns",
          label: "Some active campaigns have gone quiet",
          description: "Campaigns with no recent movement usually hide routing or approval blockers.",
          state: `${staleCampaigns.length} stale`,
          tone: "info",
          route: "/agency/campaigns",
        }
      : null,
  ].filter(Boolean);
};

const buildAgencyRecommendedActions = ({ approvals, reports, campaigns, contentItems }) => {
  const nextScheduledContent = contentItems.find((item) => item.status === "scheduled");
  const nextReviewReport = reports.find((report) => ["review", "ready"].includes(report.status));
  const activeCampaign = campaigns.find((campaign) => ["active", "pending_client"].includes(campaign.status));

  return [
    approvals.length
      ? {
          id: "agency-rec-approvals",
          label: "Clear the approval queue",
          description: "Resolve the highest-risk client-facing sends before more work stacks behind them.",
          state: "Do now",
          tone: "trust",
          requiresApproval: true,
        }
      : null,
    nextScheduledContent
      ? {
          id: "agency-rec-content",
          label: `Review ${nextScheduledContent.title}`,
          description: "Confirm the final caption, channel, and approval state before it moves further.",
          state: "Next content check",
          tone: "warning",
          requiresApproval: nextScheduledContent.approvalState !== "approved",
        }
      : null,
    nextReviewReport
      ? {
          id: "agency-rec-report",
          label: `Prep ${nextReviewReport.title} for send`,
          description: "Tighten the executive summary and confirm the recipient list before delivery.",
          state: "Reporting",
          tone: "info",
        }
      : null,
    activeCampaign
      ? {
          id: "agency-rec-campaign",
          label: `Push ${activeCampaign.name} to the next milestone`,
          description: "Keep campaign momentum visible by resolving the next blocker or approval dependency.",
          state: "Campaign flow",
          tone: "info",
        }
      : null,
  ].filter(Boolean);
};

const buildAgencySetupChecklist = ({ clients, campaigns, contentItems, reports, retainers }) => [
  {
    id: "agency-clients",
    label: "Create the first client profile",
    complete: clients.length > 0,
    hint: "Clients unlock campaign, reporting, and approval context.",
    route: "/agency/clients",
  },
  {
    id: "agency-campaigns",
    label: "Create an active campaign",
    complete: campaigns.length > 0,
    hint: "Campaigns connect deliverables, channels, and execution status.",
    route: "/agency/campaigns",
  },
  {
    id: "agency-content",
    label: "Queue at least one content item",
    complete: contentItems.length > 0,
    hint: "Content items make approvals and publish risk visible.",
    route: "/agency/content",
  },
  {
    id: "agency-retainers",
    label: "Attach package or retainer visibility",
    complete: retainers.length > 0,
    hint: "Retainers make account health and delivery scope easier to scan.",
    route: "/agency/clients",
  },
  {
    id: "agency-reports",
    label: "Generate a report draft",
    complete: reports.length > 0,
    hint: "Reports connect delivery to results and recipient review.",
    route: "/agency/reports",
  },
];

const buildAgencyActivityTimeline = ({ campaigns, contentItems, reports, approvals }) =>
  [
    ...campaigns.map((campaign) => ({
      id: `campaign-${campaign._id}`,
      label: campaign.name,
      meta: `Campaign status is ${campaign.status}.`,
      at: campaign.updatedAt || campaign.createdAt,
      state: "Campaign",
      tone: "info",
    })),
    ...contentItems.map((item) => ({
      id: `content-${item._id}`,
      label: item.title,
      meta: `${item.channel || "internal"} content is ${item.status} with ${item.approvalState || "unknown"} review state.`,
      at: item.updatedAt || item.createdAt,
      state: "Content",
      tone: item.approvalState === "approved" ? "success" : "warning",
    })),
    ...reports.map((report) => ({
      id: `report-${report._id}`,
      label: report.title,
      meta: `Report is ${report.status} and ${report.generatedByAI ? "AI-assisted" : "manually written"}.`,
      at: report.updatedAt || report.createdAt,
      state: "Report",
      tone: "info",
    })),
    ...approvals.map((approval) => ({
      id: `approval-${approval._id}`,
      label: approval.actionLabel,
      meta: approval.reason,
      at: approval.createdAt,
      state: "Review",
      tone: "trust",
    })),
  ]
    .sort((left, right) => new Date(right.at || 0) - new Date(left.at || 0))
    .slice(0, 8);

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
  const staleCampaigns = campaigns.filter(
    (campaign) => ["active", "pending_client"].includes(campaign.status) && isStale(campaign.updatedAt || campaign.createdAt, STALE_CAMPAIGN_DAYS),
  );
  const attentionItems = buildAgencyAttentionItems({
    approvals,
    reports,
    contentItems,
    atRiskAccounts,
    staleCampaigns,
  });
  const recommendedActions = buildAgencyRecommendedActions({
    approvals,
    reports,
    campaigns,
    contentItems,
  });
  const setupChecklist = buildAgencySetupChecklist({
    clients,
    campaigns,
    contentItems,
    reports,
    retainers,
  });
  const activityTimeline = buildAgencyActivityTimeline({
    campaigns,
    contentItems,
    reports,
    approvals,
  });

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
    assistantBrief: buildAgencyAssistantBrief({
      activeClients,
      contentQueue,
      approvals,
      reportReadiness,
      atRiskAccounts,
      wrongSendRisk,
    }),
    attentionItems,
    recommendedActions,
    activityTimeline,
    setupChecklist,
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
  const nextActions = [
    {
      id: "agency-ai-review-first",
      label: "Review the strongest proof-point idea first",
      description: "Pick one angle, turn it into a draft, and keep the rest as alternates for later slots.",
      state: "Draft first",
      tone: "info",
    },
    {
      id: "agency-ai-approval-check",
      label: "Attach approval owners before scheduling",
      description: "AI suggestions stay draft-only until the client-facing review path is assigned.",
      state: "Review-aware",
      tone: "trust",
      requiresApproval: true,
    },
    {
      id: "agency-ai-report-link",
      label: "Link content ideas to one reporting question",
      description: "Connect each idea to the performance angle you want to explain next month.",
      state: "Performance loop",
      tone: "info",
    },
  ];
  return {
    ideas: ideas.ideas,
    calendar: calendar.calendar,
    nextActions,
    confidence: Math.max(62, 78 - ((payload.channels || []).length > 2 ? 4 : 0)),
    rationale: "Generated from the current client, campaign goal, and selected channels.",
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
