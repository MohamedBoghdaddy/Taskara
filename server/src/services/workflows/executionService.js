const ActionApproval = require("../../models/ActionApproval");
const AgencyAccount = require("../../models/AgencyAccount");
const Candidate = require("../../models/Candidate");
const DocumentChecklist = require("../../models/DocumentChecklist");
const ExecutionItem = require("../../models/ExecutionItem");
const IntegrationSettings = require("../../models/IntegrationSettings");
const RealEstateLead = require("../../models/RealEstateLead");
const StartupInitiative = require("../../models/StartupInitiative");
const githubService = require("../integrations/githubService");
const googleCalendarService = require("../integrations/googleCalendarService");
const { sendSlackMessage } = require("../integrations/slackService");
const { assertActionExecutionAllowed } = require("../subscriptions/subscriptionUsageService");
const { sendEmail } = require("../../utils/email");
const { applySafetyToItem, evaluateActionSafety } = require("./actionSafetyService");
const { getEntityId } = require("./entityLinkService");
const {
  addDays,
  buildAuditEntry,
  getTemplate,
} = require("./helpers");
const { recordSyncResult, validateProviderMapping } = require("./syncService");
const { syncLinkedTaskFromExecutionItem } = require("./taskLinkService");

const getActionConfig = (item, actionId) => getTemplate(item.audienceType)?.actionCatalog?.[actionId] || null;

const getActionStep = (item, actionId) => item.executionPlan.find((step) => step.id === actionId);

const getActionLog = (item, actionId) => item.actionLogs.find((step) => step.actionId === actionId);

const getCurrentApproval = async (item) => {
  if (!item.approvalId) return null;
  return ActionApproval.findById(item.approvalId);
};

const resolveRecipient = async (item) => {
  const payload = item.sourceContext?.payload || {};
  if (payload.recipientEmail) {
    return { email: payload.recipientEmail, name: payload.recipientName || payload.name || "Recipient" };
  }
  if (payload.clientEmail) {
    return { email: payload.clientEmail, name: payload.clientName || "Client" };
  }
  if (payload.candidateEmail || payload.leadEmail || payload.email) {
    return {
      email: payload.candidateEmail || payload.leadEmail || payload.email,
      name:
        payload.candidateName ||
        payload.leadName ||
        payload.recipientName ||
        payload.clientName ||
        payload.name ||
        "Recipient",
    };
  }

  const candidateId = getEntityId(item, "candidate");
  if (candidateId) {
    const candidate = await Candidate.findById(candidateId).select("name email");
    if (candidate?.email) return { email: candidate.email, name: candidate.name };
  }

  const leadId = getEntityId(item, "lead");
  if (leadId) {
    const lead = await RealEstateLead.findById(leadId).select("name email");
    if (lead?.email) return { email: lead.email, name: lead.name };
  }

  return { email: "", name: "" };
};

const buildEmailPayload = async (item, actionId) => {
  const recipient = await resolveRecipient(item);
  const subjectMap = {
    send_outreach: `Taskara outreach: ${item.title}`,
    send_followup: `Following up: ${item.title}`,
    send_rejection: `Update from Taskara: ${item.title}`,
    chase_approval: `Approval needed: ${item.title}`,
    send_status: `Status update: ${item.title}`,
    send_initial_followup: `Following up on your inquiry: ${item.title}`,
    send_sequence_followup: `Checking in on: ${item.title}`,
    request_docs: `Documents needed: ${item.title}`,
    notify_parties: `Workflow update: ${item.title}`,
  };

  const bodyText = [
    `Hi ${recipient.name || "there"},`,
    "",
    `${getActionConfig(item, actionId)?.label || "Taskara update"} is ready to move.`,
    item.description || item.sourceContext?.excerpt || item.title,
    "",
    "This message was triggered by Taskara's workflow engine with audit logging enabled.",
  ].join("\n");

  return {
    to: recipient.email,
    subject: subjectMap[actionId] || `${item.title} update`,
    text: bodyText,
    html: `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`,
    preview: {
      to: recipient.email,
      subject: subjectMap[actionId] || `${item.title} update`,
      body: bodyText,
    },
  };
};

const buildSlackPayload = (item, actionId) => ({
  text: [
    `Taskara ${getActionConfig(item, actionId)?.label || "update"}`,
    `Audience: ${item.audienceType}`,
    `Workflow: ${item.title}`,
    item.assignee?.name ? `Owner: ${item.assignee.name}` : null,
    item.stage ? `Stage: ${item.stage}` : null,
  ]
    .filter(Boolean)
    .join(" | "),
});

const buildActionPreview = async (item, actionId) => {
  const action = getActionConfig(item, actionId);
  if (!action) return { title: item.title, description: item.description || item.sourceContext?.excerpt || "" };

  if (action.channel === "email") {
    const emailPayload = await buildEmailPayload(item, actionId);
    return emailPayload.preview || {};
  }

  if (action.channel === "slack") {
    return buildSlackPayload(item, actionId);
  }

  if (action.channel === "github") {
    return {
      title: item.title,
      body: item.description || item.sourceContext?.excerpt || "",
      priority: item.priority,
      audienceType: item.audienceType,
    };
  }

  if (action.channel === "calendar") {
    return {
      title: item.title,
      dueAt: item.dueAt || null,
      stage: item.stage || "",
    };
  }

  return {
    title: item.title,
    description: item.description || item.sourceContext?.excerpt || "",
    channel: action.channel,
  };
};

const updateEntityState = async (item, actionId) => {
  const candidateId = getEntityId(item, "candidate");
  if (candidateId) {
    const stageMap = {
      send_outreach: "contacted",
      send_followup: "contacted",
      schedule_interview: "interview",
      update_stage: item.stage || "contacted",
      send_rejection: "rejected",
      add_to_nurture: "nurture",
    };
    const activity = {
      at: new Date(),
      type: actionId,
      message: getActionConfig(item, actionId)?.label || actionId,
      metadata: { executionItemId: item._id },
    };
    const set = stageMap[actionId] ? { currentStage: stageMap[actionId] } : {};
    if (actionId === "send_outreach") {
      set["outreachSequence.active"] = true;
      set["outreachSequence.nextFollowUpAt"] = item.followUp?.nextRunAt || null;
    }
    if (actionId === "send_followup") {
      set["outreachSequence.followUpsSent"] = (item.followUp?.attempts || 0) + 1;
      set["outreachSequence.nextFollowUpAt"] = item.followUp?.nextRunAt || null;
    }
    if (actionId === "schedule_interview") {
      set["scheduling.status"] = "booked";
      set["scheduling.conflictState"] = "clear";
    }
    if (actionId === "collect_feedback") {
      set["feedbackCollection.requestedAt"] = new Date();
      set["feedbackCollection.pendingCount"] = Math.max(item.sourceContext?.payload?.interviewerCount || 1, 1);
    }
    if (actionId === "send_rejection") {
      set["rejectionFlow.lastSentAt"] = new Date();
      set["outreachSequence.active"] = false;
      set["outreachSequence.stopReason"] = "rejected";
    }
    if (actionId === "add_to_nurture") {
      set["rejectionFlow.nurtureEnabled"] = true;
      set["outreachSequence.active"] = false;
      set["outreachSequence.stopReason"] = "nurture";
    }
    await Candidate.updateOne(
      { _id: candidateId },
      {
        $set: set,
        $push: { activityLog: activity },
      },
    );
  }

  const initiativeId = getEntityId(item, "initiative");
  if (initiativeId) {
    const set = {};
    if (["assign_owner", "group_initiative"].includes(actionId)) set.status = "active";
    if (actionId === "post_status_slack") set.statusSummary = `Latest status posted at ${new Date().toISOString()}`;
    if (actionId === "assign_owner" && item.assignee?.userId) set.ownerId = item.assignee.userId;
    if (actionId === "extract_tasks") {
      set["metrics.totalItems"] = Math.max((item.sourceContext?.payload?.taskCount || 1), 1);
    }
    if (actionId === "assign_owner") {
      set["metrics.unownedItems"] = item.assignee?.userId ? 0 : 1;
    }
    if (actionId === "create_github_issue") {
      set["metrics.completedItems"] = Math.max(item.status === "completed" ? 1 : 0, 0);
    }
    await StartupInitiative.updateOne({ _id: initiativeId }, { $set: set });
  }

  const accountId = getEntityId(item, "agency_account");
  if (accountId) {
    const set = {};
    if (actionId === "send_status") {
      set.lastClientUpdateAt = new Date();
      set.status = "active";
    }
    if (actionId === "chase_approval") {
      set.status = "active";
    }
    const push = {};
    if (actionId === "break_brief") {
      const deliverables = (item.sourceContext?.rawText || item.description || item.title)
        .split(/\n+/)
        .map((entry) => entry.replace(/^[\-\*\d\.\)\s]+/, "").trim())
        .filter((entry) => entry.length >= 4)
        .slice(0, 3)
        .map((entry) => ({
          title: entry,
          status: "planned",
          dueAt: item.dueAt || null,
          ownerId: item.assignee?.userId || null,
        }));
      if (deliverables.length) push.deliverables = { $each: deliverables };
      set.status = "active";
    }
    if (actionId === "assign_internal" && item.assignee?.userId) {
      set.ownerId = item.assignee.userId;
    }
    if (actionId === "chase_approval") {
      push.approvals = {
        $each: [
          {
            label: item.title,
            status: "pending",
            requestedAt: new Date(),
            pendingOn: item.sourceContext?.payload?.clientName || item.groupLabel || "Client",
            channel: "email",
          },
        ],
      };
    }
    await AgencyAccount.updateOne(
      { _id: accountId },
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(push).length ? { $push: push } : {}),
      },
    );
  }

  const leadId = getEntityId(item, "lead");
  if (leadId) {
    const stageMap = {
      send_initial_followup: "contacted",
      send_sequence_followup: "contacted",
      request_docs: "under_contract",
      update_stage: item.stage || "qualified",
    };
    const set = stageMap[actionId] ? { currentStage: stageMap[actionId] } : {};
    if (actionId === "send_initial_followup") {
      set.nextRequiredAction = "Wait for reply or request qualifying documents";
    }
    if (actionId === "request_docs") {
      set.nextRequiredAction = "Collect requested documents";
    }
    if (actionId === "update_stage") {
      set.nextRequiredAction = "Advance milestone after the next completed action";
    }
    await RealEstateLead.updateOne(
      { _id: leadId },
      {
        $set: set,
        $push: {
          communicationTrail: {
            at: new Date(),
            channel: getActionConfig(item, actionId)?.channel || "internal",
            direction: "outbound",
            summary: getActionConfig(item, actionId)?.label || actionId,
            sourceRef: item.sourceRef?.url || item.sourceRef?.externalId || "",
          },
        },
      },
    );
    const documentChecklistId = getEntityId(item, "document_checklist");
    if (actionId === "request_docs" && documentChecklistId) {
      const checklist = await DocumentChecklist.findById(documentChecklistId);
      if (checklist) {
        checklist.items = checklist.items.map((entry) =>
          entry.status === "missing"
            ? {
                ...(typeof entry.toObject === "function" ? entry.toObject() : entry),
                status: "requested",
                requestedAt: new Date(),
                lastReminderAt: new Date(),
              }
            : entry,
        );
        checklist.missingCount = checklist.items.filter((entry) => entry.status !== "approved").length;
        checklist.nextReminderAt = addDays(new Date(), 3);
        await checklist.save();
      }
    }
  }
};

const recalculateStatus = (item, options = {}) => {
  const { ignoreControlState = false } = options;
  if (!ignoreControlState && (item.status === "paused" || item.status === "cancelled")) return item.status;
  if (item.approvalStatus === "rejected") return "blocked";
  if (item.actionLogs.some((entry) => entry.status === "awaiting_approval")) return "awaiting_approval";
  if (item.actionLogs.some((entry) => entry.status === "failed")) return "failed";
  if (item.actionLogs.every((entry) => ["executed", "skipped", "cancelled"].includes(entry.status))) {
    return "completed";
  }
  if (item.actionLogs.some((entry) => entry.status === "scheduled")) return "scheduled";
  if (item.actionLogs.some((entry) => entry.status === "executed")) return "in_progress";
  return "ready";
};

const ensureApproval = async (item, actionId, userId) => {
  const action = getActionConfig(item, actionId);
  const safety = await evaluateActionSafety({ item, actionId });
  const actionLog = getActionLog(item, actionId);
  if (actionLog) {
    actionLog.confidenceScore = safety.confidenceScore;
    actionLog.riskLevel = safety.riskLevel;
    actionLog.riskReasons = safety.reasons;
    actionLog.approvalForced = safety.approvalForced;
    actionLog.approvalRecommended = safety.approvalRecommended;
    actionLog.reviewLabel = safety.reviewLabel || "";
    actionLog.reviewMessage = safety.reviewMessage || "";
    actionLog.copyTone = safety.copyTone || "operator";
    actionLog.safetyEvaluatedAt = new Date();
  }
  item.confidenceScore = Math.round(
    (item.actionLogs || []).reduce((sum, entry) => sum + (entry.confidenceScore || 0), 0) /
      Math.max((item.actionLogs || []).length, 1)
  );
  item.riskLevel = item.actionLogs.some((entry) => entry.riskLevel === "high")
    ? "high"
    : item.actionLogs.some((entry) => entry.riskLevel === "medium")
      ? "medium"
      : "low";
  item.safetyReasons = [...new Set((item.actionLogs || []).flatMap((entry) => entry.riskReasons || []))].slice(0, 4);

  if (!action?.requiresApproval && !safety.approvalForced) {
    if (safety.approvalRecommended) {
      item.auditTrail.push(
        buildAuditEntry(
          "note",
          `${action?.label || actionId} can run automatically, but approval is recommended.`,
          {
            actionId,
            confidenceScore: safety.confidenceScore,
            riskLevel: safety.riskLevel,
            reasons: safety.reasons,
          },
          "ai",
          userId,
        ),
      );
      await item.save();
    }
    return null;
  }

  const existingApproval = await getCurrentApproval(item);
  if (existingApproval?.actionId === actionId) {
    if (existingApproval.status === "approved") {
      item.approvalRequired = true;
      item.approvalStatus = "approved";
      return existingApproval;
    }

    if (existingApproval.status === "pending") {
      item.approvalRequired = true;
      item.approvalStatus = "pending";
      item.status = "awaiting_approval";
      if (actionLog && actionLog.status !== "cancelled") actionLog.status = "awaiting_approval";
      await item.save();
      return existingApproval;
    }
  }

  const preview = await buildActionPreview(item, actionId);
  const approval = await ActionApproval.create({
    workspaceId: item.workspaceId,
    executionItemId: item._id,
    requestedBy: userId || item.createdBy,
    audienceType: item.audienceType,
    workflowType: item.workflowType,
    actionId,
    actionLabel: action.label,
    channel: action.channel,
    approvalMode: safety.approvalForced ? "high_risk" : action.risky ? "brand_safe" : "manual",
    riskLevel: safety.riskLevel,
    confidenceScore: safety.confidenceScore,
    safetyReasons: safety.reasons,
    reason:
      safety.reasons?.[0] ||
      `${action.label} is configured to require approval before external delivery.`,
    payloadPreview: {
      ...preview,
      safety,
    },
  });

  item.approvalId = approval._id;
  item.approvalRequired = true;
  item.approvalStatus = "pending";
  item.status = "awaiting_approval";

  if (actionLog) actionLog.status = "awaiting_approval";

  item.auditTrail.push(
    buildAuditEntry(
      "approval_requested",
      `${action.label} is waiting for approval.`,
      {
        actionId,
        approvalId: approval._id,
        confidenceScore: safety.confidenceScore,
        riskLevel: safety.riskLevel,
        reasons: safety.reasons,
      },
      "ai",
      userId,
    ),
  );

  await item.save();
  return approval;
};

const executeSingleAction = async (item, actionId, userId, options = {}) => {
  const { force = false } = options;
  const action = getActionConfig(item, actionId);
  if (!action) throw { status: 400, message: `Unknown workflow action: ${actionId}` };

  const actionLog = getActionLog(item, actionId);
  const planStep = getActionStep(item, actionId);
  if (!actionLog) throw { status: 400, message: "Action log not found on execution item" };

  await applySafetyToItem(item);

  if (planStep?.scheduledFor && new Date(planStep.scheduledFor) > new Date() && !force) {
    actionLog.status = "scheduled";
    item.status = "scheduled";
    await item.save();
    return { status: "scheduled", actionId };
  }

  if (action.requiresApproval) {
    const approval = await ensureApproval(item, actionId, userId);
    if (approval?.status !== "approved") {
      return { status: "awaiting_approval", actionId };
    }
  }

  actionLog.attemptCount += 1;
  actionLog.reason = "";
  let result = {};
  let syncProvider = action.channel;
  let syncStatus = "synced";
  const failForConfiguration = (provider, reason, status = "awaiting_connector") => {
    syncProvider = provider;
    syncStatus = status;
    actionLog.status = "failed";
    actionLog.reason = reason;
  };

  try {
    await assertActionExecutionAllowed(item.workspaceId, userId);

    if (action.channel === "email") {
      const emailPayload = await buildEmailPayload(item, actionId);
      if (!emailPayload.to) {
        failForConfiguration("email", "Missing recipient email");
      } else {
        result = await sendEmail(emailPayload);
        actionLog.status = "executed";
        actionLog.executedAt = new Date();
        actionLog.result = { to: emailPayload.to, subject: emailPayload.subject, messageId: result.messageId || "sent" };
      }
    } else if (action.channel === "slack") {
      const slackMapping = await validateProviderMapping(item.workspaceId, "slack");
      const slackSettings = slackMapping.connected
        ? await IntegrationSettings.findOne({
            workspaceId: item.workspaceId,
            provider: "slack",
            isActive: true,
          })
        : null;
      const webhookUrl = slackSettings?.slack?.webhookUrl || item.sourceContext?.payload?.slackWebhookUrl || "";

      if (!webhookUrl) {
        failForConfiguration("slack", slackMapping.details?.[0] || "Slack is not connected");
      } else {
        const payload = buildSlackPayload(item, actionId);
        await sendSlackMessage(webhookUrl, payload);
        actionLog.status = "executed";
        actionLog.executedAt = new Date();
        actionLog.result = payload;
      }
    } else if (action.channel === "calendar") {
      const calendarMapping = await validateProviderMapping(item.workspaceId, "google_calendar");
      const calendarSettings = calendarMapping.connected
        ? await IntegrationSettings.findOne({
            workspaceId: item.workspaceId,
            provider: "google_calendar",
            isActive: true,
          })
        : null;

      if (!calendarSettings?.googleCalendar || !calendarMapping.ready) {
        failForConfiguration("google_calendar", calendarMapping.details?.[0] || "Google Calendar is not connected");
      } else {
        result = await googleCalendarService.pushTaskToCalendar(
          calendarSettings.googleCalendar,
          {
            title: item.title,
            description: item.description || item.sourceContext?.excerpt || "",
            dueDate: item.dueAt || addDays(new Date(), 1),
            _id: item._id,
          },
          calendarSettings.googleCalendar.calendarId,
        );
        syncProvider = "google_calendar";
        actionLog.status = "executed";
        actionLog.executedAt = new Date();
        actionLog.result = result;
      }
    } else if (action.channel === "github") {
      const githubMapping = await validateProviderMapping(item.workspaceId, "github");
      const githubSettings = githubMapping.connected
        ? await IntegrationSettings.findOne({
            workspaceId: item.workspaceId,
            provider: "github",
            isActive: true,
          })
        : null;

      const firstRepo = githubSettings?.github?.repos?.[0];
      if (!githubSettings?.github?.accessToken || !firstRepo || !githubMapping.ready) {
        failForConfiguration("github", githubMapping.details?.[0] || "GitHub token or repo mapping is missing");
      } else {
        result = await githubService.exportTaskAsIssue(
          githubSettings.github.accessToken,
          firstRepo.owner,
          firstRepo.repo,
          {
            title: item.title,
            description: item.description,
            priority: item.priority,
            tags: [item.audienceType, item.workflowType],
          },
        );
        actionLog.status = "executed";
        actionLog.executedAt = new Date();
        actionLog.result = result;
      }
    } else if (action.channel === "notion") {
      const notionMapping = await validateProviderMapping(item.workspaceId, "notion");
      failForConfiguration("notion", notionMapping.details?.[0] || "Notion mapping is missing");
    } else if (action.channel === "clickup") {
      const clickupMapping = await validateProviderMapping(item.workspaceId, "clickup");
      failForConfiguration("clickup", clickupMapping.details?.[0] || "ClickUp mapping is missing");
    } else if (["ats", "crm", "google_drive"].includes(action.channel)) {
      const protectedMapping = await validateProviderMapping(item.workspaceId, action.channel);
      failForConfiguration(action.channel, protectedMapping.details?.[0] || "Protected system mapping is missing");
    } else {
      actionLog.status = "executed";
      actionLog.executedAt = new Date();
      actionLog.result = { message: `${action.label} completed internally.` };
    }

    if (actionLog.status === "executed") {
      item.auditTrail.push(
        buildAuditEntry(
          "executed",
          `${action.label} executed successfully.`,
          { actionId, channel: action.channel, result: actionLog.result },
          action.channel === "internal" ? "system" : "integration",
          userId,
        ),
      );
      await updateEntityState(item, actionId);
    }

    if (action.channel !== "internal" && (actionLog.status !== "skipped" || syncStatus !== "synced")) {
      await recordSyncResult({
        itemId: item._id,
        provider: syncProvider,
        status: syncStatus,
        details:
          actionLog.status === "executed"
            ? { actionId, result: actionLog.result }
            : { actionId, reason: actionLog.reason || "Skipped" },
      });
    }
  } catch (error) {
    actionLog.status = "failed";
    actionLog.reason = error.message || "Action failed";
    if (Number(error?.status) === 402) {
      item.status = "blocked";
    }
    item.auditTrail.push(
      buildAuditEntry(
        "note",
        `${action.label} failed.`,
        { actionId, error: error.message || "Action failed" },
        "integration",
        userId,
      ),
    );
    if (action.channel !== "internal") {
      await recordSyncResult({
        itemId: item._id,
        provider: syncProvider,
        status: "failed",
        details: { actionId, error: error.message || "Action failed" },
      });
    }
  }

  if (planStep) {
    planStep.status =
      actionLog.status === "executed"
        ? "done"
        : actionLog.status === "skipped"
          ? "skipped"
          : actionLog.status === "failed"
            ? "failed"
            : planStep.status;
  }

  item.status = recalculateStatus(item);
  item.traceability.outcomeSummary = `${action.label} ${actionLog.status}.`;
  item.traceability.outcomeStatus = item.status;
  item.traceability.lastOutcomeAt = new Date();
  await item.save();
  await syncLinkedTaskFromExecutionItem(item);

  return { status: actionLog.status, actionId, result: actionLog.result };
};

const scheduleFollowUp = async (item, reason = "automatic") => {
  const template = getTemplate(item.audienceType);
  if (!template?.followUpCadence?.length) return item;
  if (item.followUp?.stopReason) return item;
  if (item.followUp?.active && item.followUp?.nextRunAt && new Date(item.followUp.nextRunAt) > new Date()) {
    return item;
  }
  if (item.followUp.attempts >= template.followUpCadence.length) {
    item.followUp.active = false;
    item.followUp.stopReason = "max_attempts_reached";
    item.followUp.nextRunAt = null;
    item.auditTrail.push(
      buildAuditEntry("followup_stopped", "Follow-up cadence stopped after max attempts.", { reason }),
    );
    await item.save();
    await syncLinkedTaskFromExecutionItem(item);
    return item;
  }

  const cadence = template.followUpCadence[Math.min(item.followUp.attempts, template.followUpCadence.length - 1)];
  if (!cadence) return item;

  item.followUp.active = true;
  item.followUp.attempts += 1;
  item.followUp.cadenceStep = cadence.step;
  item.followUp.maxAttempts = cadence.maxAttempts || item.followUp.maxAttempts || 0;
  item.followUp.nextRunAt = addDays(new Date(), cadence.delayDays || 0);
  item.auditTrail.push(
    buildAuditEntry(
      "followup_scheduled",
      `Scheduled follow-up step ${cadence.step}.`,
      { reason, nextRunAt: item.followUp.nextRunAt, actionId: cadence.actionId },
    ),
  );

  const followUpLog = getActionLog(item, cadence.actionId);
  const followUpStep = getActionStep(item, cadence.actionId);
  if (followUpLog) followUpLog.status = "scheduled";
  if (followUpStep) {
    followUpStep.status = "waiting";
    followUpStep.scheduledFor = item.followUp.nextRunAt;
  }

  item.status = "scheduled";
  await item.save();
  await syncLinkedTaskFromExecutionItem(item);
  return item;
};

const executeReadyPlan = async ({ workspaceId, itemId, userId, force = false }) => {
  const item = await ExecutionItem.findOne({ _id: itemId, workspaceId });
  if (!item) throw { status: 404, message: "Execution item not found" };
  if (["paused", "cancelled", "completed", "blocked", "failed"].includes(item.status)) {
    throw { status: 409, message: `Workflow item is ${item.status} and cannot execute.` };
  }

  for (const step of item.executionPlan) {
    if (["done", "skipped", "failed"].includes(step.status)) continue;
    const log = getActionLog(item, step.id);
    if (log?.status === "cancelled") {
      step.status = "skipped";
      continue;
    }
    if (step.scheduledFor && new Date(step.scheduledFor) > new Date() && !force) {
      if (log) log.status = "scheduled";
      item.status = "scheduled";
      await item.save();
      break;
    }

    const result = await executeSingleAction(item, step.id, userId, { force });
    if (["awaiting_approval", "failed", "scheduled"].includes(result.status)) break;
  }

  if (["candidate_outreach", "lead_followup", "approval_chase"].includes(item.workflowType)) {
    const alreadyScheduled = item.followUp?.active || item.actionLogs.some((entry) => entry.status === "scheduled");
    if (!alreadyScheduled && !["awaiting_approval", "blocked", "failed", "cancelled", "paused", "completed"].includes(item.status)) {
      await scheduleFollowUp(item);
    }
  }

  return ExecutionItem.findById(item._id);
};

const decideApproval = async ({ workspaceId, itemId, userId, decision, comment = "" }) => {
  const item = await ExecutionItem.findOne({ _id: itemId, workspaceId });
  if (!item) throw { status: 404, message: "Execution item not found" };
  if (!item.approvalId) throw { status: 400, message: "No pending approval found" };

  const approval = await ActionApproval.findOne({ _id: item.approvalId, executionItemId: item._id });
  if (!approval || approval.status !== "pending") {
    throw { status: 400, message: "Approval is no longer pending" };
  }

  approval.status = decision === "approve" ? "approved" : "rejected";
  approval.approverId = userId;
  approval.decisionComment = comment;
  approval.decidedAt = new Date();
  await approval.save();

  item.approvalStatus = decision === "approve" ? "approved" : "rejected";
  item.auditTrail.push(
    buildAuditEntry(
      decision === "approve" ? "approved" : "rejected",
      decision === "approve" ? "Approval granted." : "Approval rejected.",
      { comment, approvalId: approval._id },
      "user",
      userId,
    ),
  );

  if (decision === "reject") {
    item.status = "blocked";
    item.followUp.active = false;
    item.followUp.nextRunAt = null;
    item.followUp.stopReason = "approval_rejected";
    const pendingAction = item.actionLogs.find((entry) => entry.status === "awaiting_approval");
    if (pendingAction) {
      pendingAction.status = "cancelled";
      const pendingStep = getActionStep(item, pendingAction.actionId);
      if (pendingStep && !["done", "failed", "skipped"].includes(pendingStep.status)) {
        pendingStep.status = "skipped";
      }
    }
    await item.save();
    await syncLinkedTaskFromExecutionItem(item);
    return item;
  }

  const pendingAction = item.actionLogs.find((entry) => entry.status === "awaiting_approval");
  await item.save();
  await syncLinkedTaskFromExecutionItem(item);

  if (pendingAction) {
    const refreshedItem = await ExecutionItem.findById(item._id);
    await executeSingleAction(refreshedItem, pendingAction.actionId, userId, { force: true });
  }

  const postApprovalItem = await ExecutionItem.findById(item._id);
  if (["paused", "cancelled", "completed", "blocked", "failed"].includes(postApprovalItem.status)) {
    return postApprovalItem;
  }

  return executeReadyPlan({ workspaceId, itemId: item._id, userId, force: false });
};

const applyControlAction = async ({ workspaceId, itemId, userId, action }) => {
  const item = await ExecutionItem.findOne({ _id: itemId, workspaceId });
  if (!item) throw { status: 404, message: "Execution item not found" };

  if (action === "pause") {
    if (["paused", "cancelled", "completed"].includes(item.status)) {
      throw { status: 409, message: `Workflow item is ${item.status} and cannot be paused.` };
    }
    item.status = "paused";
    item.followUp.active = false;
    item.followUp.stopReason = item.followUp.stopReason || "paused";
    item.auditTrail.push(buildAuditEntry("paused", "Workflow paused.", {}, "user", userId));
  } else if (action === "resume") {
    if (item.status !== "paused") throw { status: 409, message: "Only paused workflow items can be resumed" };
    item.followUp.stopReason = item.followUp.stopReason === "paused" ? "" : item.followUp.stopReason;
    if (item.actionLogs.some((entry) => entry.status === "scheduled")) {
      item.followUp.active = true;
    }
    item.status = recalculateStatus(item, { ignoreControlState: true });
    item.auditTrail.push(buildAuditEntry("resumed", "Workflow resumed.", {}, "user", userId));
  } else if (action === "cancel") {
    if (["cancelled", "completed"].includes(item.status)) {
      throw { status: 409, message: `Workflow item is ${item.status} and cannot be cancelled.` };
    }
    item.status = "cancelled";
    item.followUp.active = false;
    item.followUp.nextRunAt = null;
    item.followUp.stopReason = "cancelled";
    item.approvalStatus = item.approvalStatus === "pending" ? "cancelled" : item.approvalStatus;
    item.actionLogs.forEach((entry) => {
      if (["pending", "scheduled", "awaiting_approval"].includes(entry.status)) entry.status = "cancelled";
    });
    item.executionPlan.forEach((step) => {
      if (!["done", "failed", "skipped"].includes(step.status)) step.status = "skipped";
    });
    const approval = await getCurrentApproval(item);
    if (approval?.status === "pending") {
      approval.status = "cancelled";
      approval.decisionComment = "Cancelled by workspace operator";
      approval.decidedAt = new Date();
      await approval.save();
    }
    item.auditTrail.push(buildAuditEntry("cancelled", "Workflow cancelled.", {}, "user", userId));
  } else if (action === "stop_followup") {
    const template = getTemplate(item.audienceType);
    const followUpActionIds = new Set((template?.followUpCadence || []).map((entry) => entry.actionId));
    if (!item.followUp.active && !item.actionLogs.some((entry) => entry.status === "scheduled" && followUpActionIds.has(entry.actionId))) {
      throw { status: 409, message: "This workflow item does not have an active follow-up cadence to stop." };
    }
    item.followUp.active = false;
    item.followUp.nextRunAt = null;
    item.followUp.stopReason = "manual_stop";
    item.actionLogs.forEach((entry) => {
      if (entry.status === "scheduled" && followUpActionIds.has(entry.actionId)) entry.status = "cancelled";
    });
    item.executionPlan.forEach((step) => {
      if (step.status === "waiting" && followUpActionIds.has(step.id)) step.status = "skipped";
    });
    item.status = recalculateStatus(item, { ignoreControlState: true });
    item.auditTrail.push(
      buildAuditEntry("followup_stopped", "Follow-up cadence stopped manually.", {}, "user", userId),
    );
  } else if (action === "undo_last_action") {
    const lastExecuted = [...item.actionLogs].reverse().find((entry) => entry.status === "executed");
    if (!lastExecuted) throw { status: 400, message: "No executed action found to undo" };
    if (["internal", "ats", "crm"].includes(getActionConfig(item, lastExecuted.actionId)?.channel)) {
      lastExecuted.status = "pending";
      lastExecuted.executedAt = null;
      lastExecuted.result = {};
      const step = getActionStep(item, lastExecuted.actionId);
      if (step) step.status = "pending";
      item.status = recalculateStatus(item, { ignoreControlState: true });
      item.auditTrail.push(
        buildAuditEntry(
          "note",
          `Last internal action (${lastExecuted.label}) was reset for re-run.`,
          { actionId: lastExecuted.actionId },
          "user",
          userId,
        ),
      );
    } else {
      item.auditTrail.push(
        buildAuditEntry(
          "note",
          `Undo requested for ${lastExecuted.label}. External reversals require manual review.`,
          { actionId: lastExecuted.actionId },
          "user",
          userId,
        ),
      );
    }
  } else {
    throw { status: 400, message: "Unsupported control action" };
  }

  item.traceability.outcomeStatus = item.status;
  item.traceability.lastOutcomeAt = new Date();
  await item.save();
  await syncLinkedTaskFromExecutionItem(item);
  return item;
};

module.exports = {
  applyControlAction,
  decideApproval,
  ensureApproval,
  executeReadyPlan,
  executeSingleAction,
  scheduleFollowUp,
};
