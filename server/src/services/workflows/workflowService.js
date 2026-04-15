const ActionApproval = require("../../models/ActionApproval");
const AgencyAccount = require("../../models/AgencyAccount");
const Candidate = require("../../models/Candidate");
const DocumentChecklist = require("../../models/DocumentChecklist");
const ExecutionItem = require("../../models/ExecutionItem");
const RealEstateLead = require("../../models/RealEstateLead");
const StartupInitiative = require("../../models/StartupInitiative");
const WorkflowRun = require("../../models/WorkflowRun");
const WorkspaceMember = require("../../models/WorkspaceMember");
const { logActivity } = require("../../utils/activityLogger");
const { AUDIENCE_KEYS } = require("../../config/workflowTemplates");
const { applyManualOverride, suggestAssignee } = require("./assignmentService");
const { buildIntegrationCoverage } = require("./syncService");
const { applyControlAction, decideApproval, executeReadyPlan } = require("./executionService");
const {
  ACTIVE_ITEM_STATUSES,
  buildAuditEntry,
  buildExecutionPlan,
  calculateRiskLevel,
  getTemplate,
  getWorkflowType,
  inferDueAt,
  inferPriority,
  inferWorkflowType,
  makeFingerprint,
  normalizeAudienceKey,
  parseSegments,
  summarizeText,
} = require("./helpers");

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phoneRegex = /(\+?\d[\d\s\-()]{7,}\d)/;

const toMetricValue = (value, digits = 1) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
};

const defaultMigrationTarget = {
  title: "execution item title",
  description: "workflow context",
  owner: "assignee",
  status: "stage / status",
  history: "audit trail",
  notes: "source context",
  email: "source reference",
  thread_url: "source reference",
  repo: "sync target",
  documents: "document checklist",
  next_action: "execution plan",
  deliverable: "execution item title",
  approver: "approval queue",
  due_date: "dueAt",
  phone: "source reference",
  candidate_name: "candidate profile",
  lead_name: "lead profile",
  deal_stage: "stage",
  initiative: "group label",
};

const extractEmail = (text = "", payload = {}, keys = []) => {
  for (const key of keys) {
    if (payload[key]) return String(payload[key]).trim().toLowerCase();
  }
  const match = String(text).match(emailRegex);
  return match ? match[0].toLowerCase() : "";
};

const extractPhone = (text = "", payload = {}, keys = []) => {
  for (const key of keys) {
    if (payload[key]) return String(payload[key]).trim();
  }
  const match = String(text).match(phoneRegex);
  return match ? match[0].trim() : "";
};

const extractName = (text = "", payload = {}, keys = [], fallback = "Workflow Contact") => {
  for (const key of keys) {
    if (payload[key]) return String(payload[key]).trim();
  }
  const cleaned = String(text).replace(emailRegex, "").replace(phoneRegex, "").trim();
  if (!cleaned) return fallback;
  return cleaned.split(/\n|,| - /)[0].trim().slice(0, 80) || fallback;
};

const createOrUpdateAudienceEntity = async ({
  workspaceId,
  userId,
  audienceType,
  sourceType,
  sourceRef,
  title,
  text,
  payload,
}) => {
  if (audienceType === "recruiters") {
    const email = extractEmail(text, payload, ["candidateEmail", "email"]);
    const name = extractName(text, payload, ["candidateName", "name"], "Candidate");
    const candidate =
      (email &&
        (await Candidate.findOne({
          workspaceId,
          email,
        }))) ||
      null;

    const doc =
      candidate ||
      (await Candidate.create({
        workspaceId,
        createdBy: userId,
        name,
        email,
        roleTitle: payload.roleTitle || payload.jobTitle || "",
        company: payload.company || "",
        sourceType,
        sourceRef: sourceRef.url || sourceRef.externalId || title,
        activityLog: [
          {
            at: new Date(),
            type: "source_ingested",
            message: `Source ingested from ${sourceType}.`,
            metadata: { title },
          },
        ],
      }));

    return { candidateId: doc._id };
  }

  if (audienceType === "startups") {
    const initiativeTitle =
      payload.initiativeTitle ||
      payload.projectName ||
      title ||
      summarizeText(text, 60) ||
      "New initiative";

    let initiative = await StartupInitiative.findOne({
      workspaceId,
      title: initiativeTitle,
      status: { $ne: "done" },
    });

    if (!initiative) {
      initiative = await StartupInitiative.create({
        workspaceId,
        createdBy: userId,
        title: initiativeTitle,
        description: summarizeText(text, 260),
        sourceThreads: [
          {
            platform: sourceType,
            label: sourceRef.label || title,
            url: sourceRef.url || "",
            threadId: sourceRef.threadId || "",
          },
        ],
      });
    }

    return { initiativeId: initiative._id };
  }

  if (audienceType === "agencies") {
    const accountName =
      payload.accountName || payload.clientName || title || summarizeText(text, 60) || "Client account";
    let account = await AgencyAccount.findOne({
      workspaceId,
      name: accountName,
    });

    if (!account) {
      account = await AgencyAccount.create({
        workspaceId,
        createdBy: userId,
        name: accountName,
        clientName: payload.clientName || accountName,
      });
    }

    return { accountId: account._id };
  }

  if (audienceType === "realestate") {
    const email = extractEmail(text, payload, ["leadEmail", "email"]);
    const phone = extractPhone(text, payload, ["leadPhone", "phone"]);
    const name = extractName(text, payload, ["leadName", "name"], "New lead");
    let lead =
      (email &&
        (await RealEstateLead.findOne({
          workspaceId,
          email,
        }))) ||
      (phone &&
        (await RealEstateLead.findOne({
          workspaceId,
          phone,
        }))) ||
      null;

    if (!lead) {
      lead = await RealEstateLead.create({
        workspaceId,
        createdBy: userId,
        name,
        email,
        phone,
        propertyInterest: payload.propertyInterest || payload.listing || "",
        sourceType,
        nextRequiredAction: "Follow up and collect missing documents",
        milestones: [
          { id: "lead_response", label: "First response", status: "active" },
          { id: "documents", label: "Document collection", status: "pending" },
          { id: "milestone_update", label: "Deal milestone update", status: "pending" },
        ],
      });
    }

    let checklist = await DocumentChecklist.findOne({ workspaceId, leadId: lead._id });
    if (!checklist) {
      checklist = await DocumentChecklist.create({
        workspaceId,
        createdBy: userId,
        leadId: lead._id,
        items: [
          { label: "ID document", status: "missing" },
          { label: "Proof of funds", status: "missing" },
          { label: "Signed disclosure", status: "missing" },
        ],
        missingCount: 3,
      });
      lead.documentChecklistId = checklist._id;
      await lead.save();
    }

    return { leadId: lead._id, documentChecklistId: checklist._id };
  }

  return {};
};

const buildItemDrafts = ({ audienceType, workflowType, title, text, payload }) => {
  const template = getTemplate(audienceType);
  const workflowConfig = getWorkflowType(audienceType, workflowType);
  const segments = parseSegments(text, title);

  if (audienceType === "startups" || audienceType === "agencies") {
    return segments.slice(0, 4).map((segment, index) => ({
      title:
        audienceType === "startups"
          ? `${workflowConfig.label}: ${segment}`
          : `${payload.clientName || payload.accountName || "Client"} - ${segment}`,
      description: segment,
      segmentIndex: index,
    }));
  }

  const entityTitleMap = {
    recruiters: payload.candidateName || payload.name || title || "Candidate flow",
    realestate: payload.leadName || payload.name || title || "Lead flow",
  };

  return [
    {
      title: `${workflowConfig.label}: ${entityTitleMap[audienceType] || template.label}`,
      description: summarizeText(text || title, 280),
      segmentIndex: 0,
    },
  ];
};

const createExecutionItemDocs = async ({
  workspaceId,
  userId,
  audienceType,
  workflowType,
  sourceType,
  sourceRef,
  title,
  text,
  payload,
  entityRefs,
  workflowRunId,
}) => {
  const template = getTemplate(audienceType);
  const itemDrafts = buildItemDrafts({ audienceType, workflowType, title, text, payload });
  const createdItems = [];
  const duplicateItems = [];

  for (const draft of itemDrafts) {
    const fingerprint = makeFingerprint({
      audienceType,
      workflowType,
      sourceType,
      sourceRef,
      text,
      title: `${draft.title}-${draft.segmentIndex}`,
    });

    const duplicate = await ExecutionItem.findOne({
      workspaceId,
      sourceFingerprint: fingerprint,
      workflowType,
      duplicateOf: null,
    });

    if (duplicate) {
      duplicateItems.push(duplicate);
      continue;
    }

    const executionPlan = buildExecutionPlan(template, workflowType);
    const item = new ExecutionItem({
      workspaceId,
      workflowRunId,
      createdBy: userId,
      title: draft.title,
      description: draft.description,
      workflowType,
      audienceType,
      sourceType,
      sourceRef,
      sourceFingerprint: fingerprint,
      sourceContext: {
        title,
        excerpt: summarizeText(text, 240),
        rawText: text,
        payload,
      },
      groupKey: String(
        entityRefs.candidateId ||
          entityRefs.initiativeId ||
          entityRefs.accountId ||
          entityRefs.leadId ||
          workflowRunId,
      ),
      groupLabel: payload.groupLabel || title || template.label,
      dueAt: inferDueAt(text),
      priority: inferPriority(text),
      status: "ready",
      stage: getWorkflowType(audienceType, workflowType)?.stage || "",
      executionPlan,
      approvalRequired: executionPlan.some((step) => step.requiresApproval),
      approvalStatus: executionPlan.some((step) => step.requiresApproval) ? "pending" : "not_required",
      createdByAI: true,
      riskLevel: calculateRiskLevel(template, workflowType),
      entityRefs,
      auditTrail: [
        buildAuditEntry("ingested", `Input ingested from ${sourceType}.`, { sourceRef }, "user", userId),
        buildAuditEntry(
          "extracted",
          `Taskara extracted a structured execution item for ${template.label}.`,
          { workflowType, draftTitle: draft.title },
          "ai",
          userId,
        ),
      ],
      actionLogs: executionPlan.map((step) => ({
        actionId: step.id,
        label: step.label,
        channel: step.channel,
        status: step.scheduledFor ? "scheduled" : "pending",
        requiresApproval: step.requiresApproval,
        scheduledFor: step.scheduledFor || null,
      })),
    });

    item.assignee = await suggestAssignee({ workspaceId, item });
    item.auditTrail.push(
      buildAuditEntry(
        "assigned",
        item.assignee.reason || "Assignee selected by Taskara.",
        { assigneeId: item.assignee.userId },
        "ai",
        userId,
      ),
    );

    await item.save();
    createdItems.push(item);
  }

  return { createdItems, duplicateItems };
};

const updateRunSummary = async (runId) => {
  const items = await ExecutionItem.find({ workflowRunId: runId });
  const confidenceAverage =
    items.length > 0
      ? items.reduce((sum, item) => sum + (item.confidenceScore || 0), 0) / items.length
      : 0;

  const executionSummary = {
    executedCount: items.filter((item) => item.actionLogs.some((entry) => entry.status === "executed")).length,
    pendingApprovals: items.filter((item) => item.approvalStatus === "pending").length,
    blockedCount: items.filter((item) => item.status === "blocked" || item.status === "failed").length,
    syncedCount: items.filter((item) => item.syncLogs.some((entry) => entry.status === "synced")).length,
  };

  const runStatus =
    items.length === 0
      ? "duplicate"
      : executionSummary.blockedCount > 0
        ? "executing"
        : items.every((item) => ["completed", "scheduled", "awaiting_approval"].includes(item.status))
          ? "completed"
          : "executing";

  return WorkflowRun.findByIdAndUpdate(
    runId,
    {
      status: runStatus,
      extractionSummary: {
        itemCount: items.length,
        duplicateCount: 0,
        groupedCount: new Set(items.map((item) => item.groupKey)).size,
        confidenceAverage: toMetricValue(confidenceAverage, 2),
      },
      executionSummary,
      executionItemIds: items.map((item) => item._id),
    },
    { new: true },
  );
};

const ingestWorkflowInput = async ({
  workspaceId,
  userId,
  audienceType,
  sourceType,
  title = "",
  text = "",
  payload = {},
  sourceRef = {},
  autoExecute = true,
  workflowType,
  triggerMode = "manual",
}) => {
  const normalizedAudience = normalizeAudienceKey(audienceType);
  const template = getTemplate(normalizedAudience);
  if (!template) throw { status: 400, message: "Unknown audience type" };

  const resolvedWorkflowType = workflowType || inferWorkflowType(normalizedAudience, text || title, payload);
  const sourceFingerprint = makeFingerprint({
    audienceType: normalizedAudience,
    workflowType: resolvedWorkflowType,
    sourceType,
    sourceRef,
    text: text || title,
    title,
  });

  const existingRun = await WorkflowRun.findOne({ workspaceId, sourceFingerprint });
  if (existingRun) {
    const items = await ExecutionItem.find({ workflowRunId: existingRun._id }).sort({ updatedAt: -1 });
    return { duplicate: true, run: existingRun, items, duplicates: items };
  }

  const workflowRun = await WorkflowRun.create({
    workspaceId,
    createdBy: userId,
    audienceType: normalizedAudience,
    workflowType: resolvedWorkflowType,
    sourceType,
    sourceRef,
    sourceFingerprint,
    input: {
      title,
      rawText: text,
      payload,
      triggerMode,
    },
    auditTrail: [
      {
        at: new Date(),
        type: "ingested",
        message: `Input received from ${sourceType}.`,
        metadata: { title },
      },
    ],
  });

  const entityRefs = await createOrUpdateAudienceEntity({
    workspaceId,
    userId,
    audienceType: normalizedAudience,
    sourceType,
    sourceRef,
    title,
    text,
    payload,
  });

  const { createdItems, duplicateItems } = await createExecutionItemDocs({
    workspaceId,
    userId,
    audienceType: normalizedAudience,
    workflowType: resolvedWorkflowType,
    sourceType,
    sourceRef,
    title,
    text,
    payload,
    entityRefs,
    workflowRunId: workflowRun._id,
  });

  let items = createdItems;
  if (autoExecute) {
    const executed = [];
    for (const item of createdItems) {
      executed.push(await executeReadyPlan({ workspaceId, itemId: item._id, userId }));
    }
    items = executed;
  }

  const updatedRun = await updateRunSummary(workflowRun._id);

  await logActivity({
    workspaceId,
    userId,
    action: "workflow_input_ingested",
    entityType: "workflow_run",
    entityId: updatedRun._id,
    metadata: {
      audienceType: normalizedAudience,
      workflowType: resolvedWorkflowType,
      itemCount: items.length,
    },
  });

  return { duplicate: false, run: updatedRun, items, duplicates: duplicateItems };
};

const listExecutionItems = async (workspaceId, query = {}) => {
  const filter = { workspaceId };
  if (query.audienceType) filter.audienceType = normalizeAudienceKey(query.audienceType);
  if (query.status) filter.status = query.status;
  if (query.workflowType) filter.workflowType = query.workflowType;
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.assigneeId) filter["assignee.userId"] = query.assigneeId;
  if (query.search) filter.$text = { $search: query.search };

  const limit = Math.min(Number(query.limit) || 50, 100);
  const items = await ExecutionItem.find(filter).sort({ updatedAt: -1 }).limit(limit);
  return items;
};

const updateExecutionItem = async (workspaceId, userId, itemId, updates) => {
  const item = await ExecutionItem.findOne({ _id: itemId, workspaceId });
  if (!item) throw { status: 404, message: "Execution item not found" };

  const trackedChanges = {};
  ["status", "priority", "stage", "dueAt", "description"].forEach((field) => {
    if (updates[field] !== undefined) {
      item[field] = updates[field];
      trackedChanges[field] = updates[field];
    }
  });

  if (updates.stopFollowUp) {
    item.followUp.active = false;
    item.followUp.stopReason = "manual_stop";
  }

  item.auditTrail.push(
    buildAuditEntry("status_changed", "Workflow item updated manually.", trackedChanges, "user", userId),
  );
  await item.save();

  await logActivity({
    workspaceId,
    userId,
    action: "execution_item_updated",
    entityType: "execution_item",
    entityId: item._id,
    metadata: trackedChanges,
  });

  return item;
};

const computeRecruiterMetrics = async (workspaceId) => {
  const candidates = await Candidate.find({ workspaceId });
  const total = candidates.length || 1;
  const replied = candidates.filter((candidate) =>
    ["replied", "interview", "offer", "hired"].includes(candidate.currentStage),
  ).length;
  const hired = candidates.filter((candidate) => candidate.currentStage === "hired");
  const rejected = candidates.filter((candidate) => ["rejected", "nurture"].includes(candidate.currentStage)).length;

  return {
    response_rate: toMetricValue((replied / total) * 100),
    time_to_first_response: toMetricValue(
      candidates.reduce((sum, candidate) => sum + (candidate.metrics.timeToFirstResponseHours || 0), 0) / total,
    ),
    time_to_hire: toMetricValue(
      hired.reduce((sum, candidate) => sum + (candidate.metrics.timeToHireDays || 0), 0) / (hired.length || 1),
    ),
    stage_dropoff_rate: toMetricValue((rejected / total) * 100),
  };
};

const computeStartupMetrics = async (workspaceId, audienceType) => {
  const items = await ExecutionItem.find({ workspaceId, audienceType });
  const active = items.filter((item) => ACTIVE_ITEM_STATUSES.includes(item.status));
  const completedLastWeek = items.filter(
    (item) => item.status === "completed" && item.updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  const ideaToExecutionValues = items
    .map((item) => {
      const firstExecution = item.auditTrail.find((entry) => entry.type === "executed");
      if (!firstExecution) return null;
      return (new Date(firstExecution.at).getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
    })
    .filter(Boolean);

  return {
    execution_velocity: completedLastWeek.length,
    idea_to_execution_time: toMetricValue(
      ideaToExecutionValues.reduce((sum, value) => sum + value, 0) / (ideaToExecutionValues.length || 1),
    ),
    unowned_task_rate: toMetricValue(
      (active.filter((item) => !item.assignee?.userId).length / (active.length || 1)) * 100,
    ),
    weekly_completion_volume: completedLastWeek.length,
  };
};

const computeAgencyMetrics = async (workspaceId, audienceType) => {
  const items = await ExecutionItem.find({ workspaceId, audienceType });
  const approvals = await ActionApproval.find({ workspaceId, audienceType, status: { $in: ["approved", "rejected"] } });
  const completedWithDueDate = items.filter((item) => item.status === "completed" && item.dueAt);
  const onTime = completedWithDueDate.filter((item) => item.updatedAt <= item.dueAt).length;
  const delayCount = items.filter(
    (item) => item.status === "blocked" || (item.dueAt && item.status !== "completed" && item.dueAt < new Date()),
  ).length;
  const memberCount = await WorkspaceMember.countDocuments({ workspaceId });

  return {
    on_time_delivery_rate: toMetricValue((onTime / (completedWithDueDate.length || 1)) * 100),
    client_approval_turnaround: toMetricValue(
      approvals.reduce((sum, approval) => sum + (approval.decidedAt - approval.createdAt) / (1000 * 60 * 60), 0) /
        (approvals.length || 1),
    ),
    delay_count: delayCount,
    throughput_utilization: toMetricValue(
      (items.filter((item) => item.status === "completed").length / (memberCount || 1)) * 100,
    ),
  };
};

const computeRealEstateMetrics = async (workspaceId) => {
  const leads = await RealEstateLead.find({ workspaceId });
  const checklists = await DocumentChecklist.find({ workspaceId });
  const total = leads.length || 1;
  const converted = leads.filter((lead) =>
    ["under_contract", "closing", "closed"].includes(lead.currentStage),
  ).length;
  const closed = leads.filter((lead) => lead.currentStage === "closed");

  return {
    lead_response_time: toMetricValue(
      leads.reduce((sum, lead) => sum + (lead.metrics.leadResponseMinutes || 0), 0) / total,
    ),
    conversion_rate: toMetricValue((converted / total) * 100),
    deal_completion_time: toMetricValue(
      closed.reduce((sum, lead) => sum + (lead.metrics.dealCompletionDays || 0), 0) / (closed.length || 1),
    ),
    missing_document_count: checklists.reduce((sum, checklist) => sum + (checklist.missingCount || 0), 0),
  };
};

const getWorkflowAnalytics = async (workspaceId, audienceType) => {
  const normalizedAudience = normalizeAudienceKey(audienceType);
  if (normalizedAudience === "recruiters") return computeRecruiterMetrics(workspaceId);
  if (normalizedAudience === "startups") return computeStartupMetrics(workspaceId, normalizedAudience);
  if (normalizedAudience === "agencies") return computeAgencyMetrics(workspaceId, normalizedAudience);
  return computeRealEstateMetrics(workspaceId);
};

const getAllAudienceAnalytics = async (workspaceId) => {
  const entries = await Promise.all(
    AUDIENCE_KEYS.map(async (audienceType) => ({
      audienceType,
      metrics: await getWorkflowAnalytics(workspaceId, audienceType),
      template: getTemplate(audienceType),
    })),
  );

  return entries;
};

const buildMigrationPreview = ({ audienceType, sourceSystem, fields }) => {
  const template = getTemplate(audienceType);
  const sourceFields = fields?.length ? fields : template.migrationFields;

  return {
    sourceSystem: sourceSystem || template.readsFirst,
    targetWorkflow: template.workflowChain.join(" -> "),
    mappingPreview: sourceFields.map((field) => ({
      sourceField: field,
      targetField: defaultMigrationTarget[field] || "custom metadata",
      compatibility: defaultMigrationTarget[field] ? "high" : "review",
    })),
    safeguards: [
      "Mapping preview before import",
      "History preserved in source context and audit trail",
      "Manual correction hooks after import",
      "Rollback by cancelling imported execution runs",
    ],
  };
};

const buildEntitySummary = async (workspaceId) => ({
  recruiters: await Candidate.countDocuments({ workspaceId }),
  startups: await StartupInitiative.countDocuments({ workspaceId }),
  agencies: await AgencyAccount.countDocuments({ workspaceId }),
  realestate: await RealEstateLead.countDocuments({ workspaceId }),
});

const getWorkflowDashboard = async (workspaceId, audienceType) => {
  const normalizedAudience = normalizeAudienceKey(audienceType);
  const template = getTemplate(normalizedAudience);
  const [items, approvals, runs, metrics, integrationCoverage, entitySummary] = await Promise.all([
    ExecutionItem.find({ workspaceId, audienceType: normalizedAudience }).sort({ updatedAt: -1 }).limit(10),
    ActionApproval.find({ workspaceId, audienceType: normalizedAudience, status: "pending" })
      .sort({ createdAt: -1 })
      .limit(10),
    WorkflowRun.find({ workspaceId, audienceType: normalizedAudience }).sort({ createdAt: -1 }).limit(8),
    getWorkflowAnalytics(workspaceId, normalizedAudience),
    buildIntegrationCoverage(workspaceId, normalizedAudience),
    buildEntitySummary(workspaceId),
  ]);

  const activeCount = items.filter((item) => ACTIVE_ITEM_STATUSES.includes(item.status)).length;
  const completedThisWeek = items.filter(
    (item) => item.status === "completed" && item.updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length;
  const scheduledFollowUps = items.filter((item) => item.followUp?.active).length;

  return {
    audience: template,
    audiences: AUDIENCE_KEYS.map((key) => {
      const audienceTemplate = getTemplate(key);
      return {
        key,
        label: audienceTemplate.label,
        painPoint: audienceTemplate.painPoint,
        workflowChain: audienceTemplate.workflowChain,
        syncTargets: audienceTemplate.syncTargets,
      };
    }),
    summary: {
      activeCount,
      pendingApprovals: approvals.length,
      completedThisWeek,
      scheduledFollowUps,
    },
    metrics,
    items,
    approvals,
    runs,
    integrationCoverage,
    entitySummary,
    migrationPreview: buildMigrationPreview({ audienceType: normalizedAudience }),
    emptyStateExample: {
      sourceType: template.readsFirst,
      title: `${template.label} workflow kickoff`,
      text:
        normalizedAudience === "recruiters"
          ? "Candidate Sarah Khan has not replied after initial outreach. Need follow-up and stage update."
          : normalizedAudience === "startups"
            ? "Slack thread: launch metrics bug needs owner, GitHub issue, and status update back to product."
            : normalizedAudience === "agencies"
              ? "Client brief needs deliverables split, approvals chased, and Friday status email."
              : "Lead from website inquiry needs first response, missing docs request, and CRM milestone update.",
    },
  };
};

const getWorkflowTemplates = () =>
  AUDIENCE_KEYS.map((key) => {
    const template = getTemplate(key);
    return {
      key: template.key,
      label: template.label,
      slug: template.slug,
      painPoint: template.painPoint,
      readsFirst: template.readsFirst,
      workflowChain: template.workflowChain,
      automaticActions: template.automaticActions,
      measuredResults: template.measuredResults,
      syncTargets: template.syncTargets,
      trustControls: template.trustControls,
      metrics: template.metrics,
    };
  });

module.exports = {
  applyControlAction,
  applyManualOverride,
  buildMigrationPreview,
  decideApproval,
  executeReadyPlan,
  getAllAudienceAnalytics,
  getWorkflowAnalytics,
  getWorkflowDashboard,
  getWorkflowTemplates,
  ingestWorkflowInput,
  listExecutionItems,
  updateExecutionItem,
};
