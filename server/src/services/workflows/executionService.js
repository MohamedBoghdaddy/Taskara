const ActionApproval = require("../../models/ActionApproval");
const AgencyAccount = require("../../models/AgencyAccount");
const Candidate = require("../../models/Candidate");
const ExecutionItem = require("../../models/ExecutionItem");
const IntegrationSettings = require("../../models/IntegrationSettings");
const RealEstateLead = require("../../models/RealEstateLead");
const StartupInitiative = require("../../models/StartupInitiative");
const githubService = require("../integrations/githubService");
const googleCalendarService = require("../integrations/googleCalendarService");
const { sendSlackMessage } = require("../integrations/slackService");
const { sendEmail } = require("../../utils/email");
const {
  addDays,
  buildAuditEntry,
  getTemplate,
} = require("./helpers");
const { planProtectedSync, recordSyncResult } = require("./syncService");

const getActionConfig = (item, actionId) => getTemplate(item.audienceType)?.actionCatalog?.[actionId] || null;

const getActionStep = (item, actionId) => item.executionPlan.find((step) => step.id === actionId);

const getActionLog = (item, actionId) => item.actionLogs.find((step) => step.actionId === actionId);

const resolveRecipient = async (item) => {
  const payload = item.sourceContext?.payload || {};
  if (payload.recipientEmail) {
    return { email: payload.recipientEmail, name: payload.recipientName || payload.name || "Recipient" };
  }
  if (payload.clientEmail) {
    return { email: payload.clientEmail, name: payload.clientName || "Client" };
  }

  if (item.entityRefs?.candidateId) {
    const candidate = await Candidate.findById(item.entityRefs.candidateId).select("name email");
    if (candidate?.email) return { email: candidate.email, name: candidate.name };
  }

  if (item.entityRefs?.leadId) {
    const lead = await RealEstateLead.findById(item.entityRefs.leadId).select("name email");
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

const updateEntityState = async (item, actionId) => {
  if (item.entityRefs?.candidateId) {
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
    await Candidate.updateOne(
      { _id: item.entityRefs.candidateId },
      {
        $set: stageMap[actionId] ? { currentStage: stageMap[actionId] } : {},
        $push: { activityLog: activity },
      },
    );
  }

  if (item.entityRefs?.initiativeId) {
    const set = {};
    if (["assign_owner", "group_initiative"].includes(actionId)) set.status = "active";
    if (actionId === "post_status_slack") set.statusSummary = `Latest status posted at ${new Date().toISOString()}`;
    await StartupInitiative.updateOne({ _id: item.entityRefs.initiativeId }, { $set: set });
  }

  if (item.entityRefs?.accountId) {
    const set = {};
    if (actionId === "send_status") set.lastClientUpdateAt = new Date();
    if (actionId === "chase_approval") {
      set.status = "active";
    }
    await AgencyAccount.updateOne({ _id: item.entityRefs.accountId }, { $set: set });
  }

  if (item.entityRefs?.leadId) {
    const stageMap = {
      send_initial_followup: "contacted",
      send_sequence_followup: "contacted",
      request_docs: "under_contract",
      update_stage: item.stage || "qualified",
    };
    await RealEstateLead.updateOne(
      { _id: item.entityRefs.leadId },
      {
        $set: stageMap[actionId] ? { currentStage: stageMap[actionId] } : {},
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
  }
};

const recalculateStatus = (item) => {
  if (item.status === "paused" || item.status === "cancelled") return item.status;
  if (item.approvalStatus === "pending") return "awaiting_approval";
  if (item.actionLogs.some((entry) => entry.status === "failed")) return "failed";
  if (item.actionLogs.some((entry) => entry.status === "scheduled")) return "scheduled";
  if (item.actionLogs.every((entry) => ["executed", "skipped", "cancelled"].includes(entry.status))) {
    return "completed";
  }
  if (item.actionLogs.some((entry) => entry.status === "executed")) return "in_progress";
  return "ready";
};

const ensureApproval = async (item, actionId, userId) => {
  const action = getActionConfig(item, actionId);
  if (!action?.requiresApproval) return null;

  if (item.approvalId && item.approvalStatus === "pending") {
    return ActionApproval.findById(item.approvalId);
  }

  const preview = await buildEmailPayload(item, actionId);
  const approval = await ActionApproval.create({
    workspaceId: item.workspaceId,
    executionItemId: item._id,
    requestedBy: userId || item.createdBy,
    audienceType: item.audienceType,
    workflowType: item.workflowType,
    actionId,
    actionLabel: action.label,
    channel: action.channel,
    approvalMode: action.risky ? "high_risk" : "manual",
    riskLevel: action.risky ? "high" : "medium",
    reason: `${action.label} is configured to require approval before external delivery.`,
    payloadPreview: preview.preview || {},
  });

  item.approvalId = approval._id;
  item.approvalRequired = true;
  item.approvalStatus = "pending";
  item.status = "awaiting_approval";

  const actionLog = getActionLog(item, actionId);
  if (actionLog) actionLog.status = "awaiting_approval";

  item.auditTrail.push(
    buildAuditEntry(
      "approval_requested",
      `${action.label} is waiting for approval.`,
      { actionId, approvalId: approval._id },
      "ai",
      userId,
    ),
  );

  await item.save();
  return approval;
};

const executeSingleAction = async (item, actionId, userId, force = false) => {
  const action = getActionConfig(item, actionId);
  if (!action) throw { status: 400, message: `Unknown workflow action: ${actionId}` };

  const actionLog = getActionLog(item, actionId);
  const planStep = getActionStep(item, actionId);
  if (!actionLog) throw { status: 400, message: "Action log not found on execution item" };

  if (planStep?.scheduledFor && new Date(planStep.scheduledFor) > new Date() && !force) {
    actionLog.status = "scheduled";
    item.status = "scheduled";
    await item.save();
    return { status: "scheduled", actionId };
  }

  if (action.requiresApproval && item.approvalStatus !== "approved" && !force) {
    await ensureApproval(item, actionId, userId);
    return { status: "awaiting_approval", actionId };
  }

  actionLog.attemptCount += 1;
  let result = {};
  let syncProvider = action.channel;
  let syncStatus = "synced";

  try {
    if (action.channel === "email") {
      const emailPayload = await buildEmailPayload(item, actionId);
      if (!emailPayload.to) {
        await planProtectedSync({
          itemId: item._id,
          provider: "email",
          reason: "No recipient email is available for this workflow item.",
        });
        actionLog.status = "skipped";
        actionLog.reason = "Missing recipient email";
      } else {
        result = await sendEmail(emailPayload);
        actionLog.status = "executed";
        actionLog.executedAt = new Date();
        actionLog.result = { to: emailPayload.to, subject: emailPayload.subject, messageId: result.messageId || "sent" };
      }
    } else if (action.channel === "slack") {
      const slackSettings = await IntegrationSettings.findOne({
        workspaceId: item.workspaceId,
        provider: "slack",
        isActive: true,
      });
      const webhookUrl =
        slackSettings?.slack?.webhookUrl || item.sourceContext?.payload?.slackWebhookUrl || "";

      if (!webhookUrl) {
        syncStatus = "awaiting_connector";
        actionLog.status = "skipped";
        actionLog.reason = "Slack is not connected";
      } else {
        const payload = buildSlackPayload(item, actionId);
        await sendSlackMessage(webhookUrl, payload);
        actionLog.status = "executed";
        actionLog.executedAt = new Date();
        actionLog.result = payload;
      }
    } else if (action.channel === "calendar") {
      const calendarSettings = await IntegrationSettings.findOne({
        workspaceId: item.workspaceId,
        provider: "google_calendar",
        isActive: true,
      });

      if (!calendarSettings?.googleCalendar) {
        syncProvider = "google_calendar";
        syncStatus = "awaiting_connector";
        actionLog.status = "skipped";
        actionLog.reason = "Google Calendar is not connected";
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
      const githubSettings = await IntegrationSettings.findOne({
        workspaceId: item.workspaceId,
        provider: "github",
        isActive: true,
      });

      const firstRepo = githubSettings?.github?.repos?.[0];
      if (!githubSettings?.github?.accessToken || !firstRepo) {
        syncStatus = "awaiting_connector";
        actionLog.status = "skipped";
        actionLog.reason = "GitHub token or repo mapping is missing";
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
    } else if (["ats", "crm", "notion", "clickup", "google_drive"].includes(action.channel)) {
      syncProvider = action.channel;
      syncStatus = "awaiting_connector";
      actionLog.status = "skipped";
      actionLog.reason = "Connector mapping is protected until a system-of-record mapping is approved.";
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

    if (actionLog.status !== "skipped" || syncStatus !== "synced") {
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
    item.auditTrail.push(
      buildAuditEntry(
        "note",
        `${action.label} failed.`,
        { actionId, error: error.message || "Action failed" },
        "integration",
        userId,
      ),
    );
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

  return { status: actionLog.status, actionId, result: actionLog.result };
};

const scheduleFollowUp = async (item, reason = "automatic") => {
  const template = getTemplate(item.audienceType);
  if (!template?.followUpCadence?.length) return item;

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
  return item;
};

const executeReadyPlan = async ({ workspaceId, itemId, userId, force = false }) => {
  const item = await ExecutionItem.findOne({ _id: itemId, workspaceId });
  if (!item) throw { status: 404, message: "Execution item not found" };
  if (["paused", "cancelled", "completed"].includes(item.status)) return item;

  for (const step of item.executionPlan) {
    if (["done", "skipped", "failed"].includes(step.status)) continue;
    if (step.scheduledFor && new Date(step.scheduledFor) > new Date() && !force) {
      const log = getActionLog(item, step.id);
      if (log) log.status = "scheduled";
      item.status = "scheduled";
      await item.save();
      break;
    }

    const result = await executeSingleAction(item, step.id, userId, force);
    if (result.status === "awaiting_approval" || result.status === "failed") break;
  }

  if (["candidate_outreach", "lead_followup", "approval_chase"].includes(item.workflowType)) {
    const alreadyScheduled = item.followUp?.active || item.actionLogs.some((entry) => entry.status === "scheduled");
    if (!alreadyScheduled && item.status !== "awaiting_approval") {
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
    const pendingAction = item.actionLogs.find((entry) => entry.status === "awaiting_approval");
    if (pendingAction) pendingAction.status = "cancelled";
    await item.save();
    return item;
  }

  const pendingAction = item.actionLogs.find((entry) => entry.status === "awaiting_approval");
  await item.save();

  if (pendingAction) {
    const refreshedItem = await ExecutionItem.findById(item._id);
    await executeSingleAction(refreshedItem, pendingAction.actionId, userId, true);
  }

  return executeReadyPlan({ workspaceId, itemId: item._id, userId, force: false });
};

const applyControlAction = async ({ workspaceId, itemId, userId, action }) => {
  const item = await ExecutionItem.findOne({ _id: itemId, workspaceId });
  if (!item) throw { status: 404, message: "Execution item not found" };

  if (action === "pause") {
    item.status = "paused";
    item.followUp.active = false;
    item.auditTrail.push(buildAuditEntry("paused", "Workflow paused.", {}, "user", userId));
  } else if (action === "resume") {
    item.status = recalculateStatus(item) === "completed" ? "ready" : recalculateStatus(item);
    item.auditTrail.push(buildAuditEntry("resumed", "Workflow resumed.", {}, "user", userId));
  } else if (action === "cancel") {
    item.status = "cancelled";
    item.followUp.active = false;
    item.approvalStatus = item.approvalStatus === "pending" ? "cancelled" : item.approvalStatus;
    item.actionLogs.forEach((entry) => {
      if (["pending", "scheduled", "awaiting_approval"].includes(entry.status)) entry.status = "cancelled";
    });
    item.auditTrail.push(buildAuditEntry("cancelled", "Workflow cancelled.", {}, "user", userId));
  } else if (action === "stop_followup") {
    item.followUp.active = false;
    item.followUp.stopReason = "manual_stop";
    item.auditTrail.push(
      buildAuditEntry("followup_stopped", "Follow-up cadence stopped manually.", {}, "user", userId),
    );
  } else if (action === "undo_last_action") {
    const lastExecuted = [...item.actionLogs].reverse().find((entry) => entry.status === "executed");
    if (!lastExecuted) throw { status: 400, message: "No executed action found to undo" };
    if (["internal", "ats", "crm"].includes(getActionConfig(item, lastExecuted.actionId)?.channel)) {
      lastExecuted.status = "pending";
      lastExecuted.executedAt = null;
      item.status = "ready";
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

  await item.save();
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
