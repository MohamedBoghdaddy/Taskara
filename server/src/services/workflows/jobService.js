const crypto = require("crypto");

const ExecutionItem = require("../../models/ExecutionItem");
const WorkerJobRun = require("../../models/WorkerJobRun");
const { buildAuditEntry, getTemplate } = require("./helpers");
const { executeReadyPlan } = require("./executionService");

const PROCESSABLE_ITEM_STATUSES = new Set(["scheduled", "ready", "in_progress"]);
const TERMINAL_ITEM_STATUSES = new Set(["paused", "cancelled", "completed", "blocked", "failed"]);
const LOCK_TTL_MS = Number(process.env.WORKFLOW_JOB_LOCK_TTL_MS || 5 * 60 * 1000);

const buildDueFilter = (now) => ({
  status: { $in: [...PROCESSABLE_ITEM_STATUSES] },
  $or: [
    { "followUp.active": true, "followUp.nextRunAt": { $lte: now } },
    { actionLogs: { $elemMatch: { status: "scheduled", scheduledFor: { $lte: now } } } },
  ],
});

const buildAvailableLockFilter = (now) => ({
  $or: [
    { "workerState.lockId": "" },
    { "workerState.lockId": { $exists: false } },
    { "workerState.lockExpiresAt": null },
    { "workerState.lockExpiresAt": { $lte: now } },
  ],
});

const findEscalationRule = (item, now) => {
  const template = getTemplate(item.audienceType);
  if (!template?.escalationRules?.length || item.followUp?.escalated || item.followUp?.stopReason) return null;

  const baseline = item.followUp?.nextRunAt || item.dueAt || item.updatedAt || item.createdAt;
  if (!baseline) return null;

  const overdueDays = (now.getTime() - new Date(baseline).getTime()) / (1000 * 60 * 60 * 24);
  return (
    [...template.escalationRules]
      .sort((left, right) => right.afterDays - left.afterDays)
      .find((rule) => overdueDays >= Number(rule.afterDays || 0)) || null
  );
};

const claimDueItem = async ({ itemId, now, correlationId }) =>
  ExecutionItem.findOneAndUpdate(
    {
      _id: itemId,
      $and: [buildDueFilter(now), buildAvailableLockFilter(now)],
    },
    {
      $set: {
        "workerState.lockId": correlationId,
        "workerState.lockExpiresAt": new Date(now.getTime() + LOCK_TTL_MS),
        "workerState.lastPickedAt": now,
        "workerState.lastOutcome": "picked",
        "workerState.lastError": "",
      },
      $inc: { "workerState.attemptCount": 1 },
    },
    { new: true },
  );

const finalizeWorkerState = async ({
  itemId,
  correlationId,
  outcome,
  message,
  error = "",
  metadata = {},
  now = new Date(),
}) =>
  ExecutionItem.updateOne(
    { _id: itemId, "workerState.lockId": correlationId },
    {
      $set: {
        "workerState.lockId": "",
        "workerState.lockExpiresAt": null,
        "workerState.lastFinishedAt": now,
        "workerState.lastOutcome": outcome,
        "workerState.lastError": error || "",
      },
      $push: {
        auditTrail: buildAuditEntry(
          "note",
          message,
          {
            correlationId,
            workerOutcome: outcome,
            ...metadata,
            ...(error ? { error } : {}),
          },
          "system",
        ),
      },
    },
  );

const processDueWorkflowJobs = async ({ now = new Date(), limit = 25, jobId = "" } = {}) => {
  const rootCorrelationId = jobId || `workflow-job-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const dueCandidates = await ExecutionItem.find(buildDueFilter(now))
    .sort({ "followUp.nextRunAt": 1, updatedAt: 1 })
    .limit(limit)
    .select("_id");

  let picked = 0;
  let executed = 0;
  let skipped = 0;
  let escalated = 0;
  let errors = 0;

  for (const [index, candidate] of dueCandidates.entries()) {
    const correlationId = `${rootCorrelationId}:${index + 1}`;
    const item = await claimDueItem({ itemId: candidate._id, now, correlationId });
    if (!item) {
      skipped += 1;
      continue;
    }

    picked += 1;

    const escalationRule = findEscalationRule(item, now);
    if (escalationRule) {
      item.followUp.escalated = true;
      item.auditTrail.push(
        buildAuditEntry(
          "escalated",
          escalationRule.label,
          { afterDays: escalationRule.afterDays, nextRunAt: item.followUp?.nextRunAt || null, correlationId },
          "system",
        ),
      );
      escalated += 1;
    }

    if (TERMINAL_ITEM_STATUSES.has(item.status)) {
      skipped += 1;
      await item.save();
      await finalizeWorkerState({
        itemId: item._id,
        correlationId,
        outcome: "skipped",
        message: `Workflow worker skipped item because it is ${item.status}.`,
        metadata: { status: item.status },
        now,
      });
      continue;
    }

    const hasDueScheduledStep = item.actionLogs.some(
      (entry) => entry.status === "scheduled" && entry.scheduledFor && new Date(entry.scheduledFor) <= now,
    );
    const hasDueFollowUp = Boolean(
      item.followUp?.active && item.followUp?.nextRunAt && new Date(item.followUp.nextRunAt) <= now,
    );

    if (!hasDueScheduledStep && !hasDueFollowUp) {
      skipped += 1;
      await item.save();
      await finalizeWorkerState({
        itemId: item._id,
        correlationId,
        outcome: "skipped",
        message: "Workflow worker skipped item because no due actions remained after claim.",
        metadata: {
          followUpActive: Boolean(item.followUp?.active),
          nextRunAt: item.followUp?.nextRunAt || null,
        },
        now,
      });
      continue;
    }

    item.auditTrail.push(
      buildAuditEntry(
        "note",
        "Workflow worker picked up a due action.",
        {
          correlationId,
          followUpActive: Boolean(item.followUp?.active),
          nextRunAt: item.followUp?.nextRunAt || null,
        },
        "system",
      ),
    );
    await item.save();

    try {
      await executeReadyPlan({
        workspaceId: item.workspaceId,
        itemId: item._id,
        userId: item.createdBy,
        force: false,
      });

      const refreshedItem = await ExecutionItem.findById(item._id).select("status followUp actionLogs");
      const outcome =
        refreshedItem?.status === "failed"
          ? "failed"
          : refreshedItem?.status === "scheduled"
            ? "retry_scheduled"
            : "executed";

      if (outcome === "failed") errors += 1;
      else executed += 1;

      await finalizeWorkerState({
        itemId: item._id,
        correlationId,
        outcome,
        message:
          outcome === "retry_scheduled"
            ? "Workflow worker processed due actions and left future work scheduled."
            : outcome === "failed"
              ? "Workflow worker processed due actions but the workflow item entered a failed state."
              : "Workflow worker processed due actions successfully.",
        metadata: {
          status: refreshedItem?.status || "unknown",
          nextRunAt: refreshedItem?.followUp?.nextRunAt || null,
        },
        now,
      });
    } catch (error) {
      const message = error?.message || "Unknown worker error";
      const isSkippableConflict = Number(error?.status) === 409;
      if (isSkippableConflict) skipped += 1;
      else errors += 1;

      await finalizeWorkerState({
        itemId: item._id,
        correlationId,
        outcome: isSkippableConflict ? "skipped" : "failed",
        message: isSkippableConflict
          ? `Workflow worker skipped item: ${message}.`
          : `Workflow worker failed: ${message}.`,
        error: isSkippableConflict ? "" : message,
        metadata: { status: item.status },
        now,
      });
    }
  }

  return {
    jobId: rootCorrelationId,
    dueCount: dueCandidates.length,
    picked,
    executed,
    skipped,
    escalated,
    errors,
  };
};

const runWorkflowJobCycle = async ({ now = new Date(), limit = 25, jobId = "", mode = "manual" } = {}) => {
  const startedAt = new Date();
  try {
    const result = await processDueWorkflowJobs({ now, limit, jobId });
    const finishedAt = new Date();
    await WorkerJobRun.create({
      queueName: "workflows",
      mode,
      jobId: result.jobId,
      status: result.errors ? "partial" : "success",
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      dueCount: result.dueCount,
      picked: result.picked,
      executed: result.executed,
      skipped: result.skipped,
      escalated: result.escalated,
      errors: result.errors,
    }).catch(() => {});
    return result;
  } catch (error) {
    const finishedAt = new Date();
    await WorkerJobRun.create({
      queueName: "workflows",
      mode,
      jobId: jobId || `workflow-job-failed-${Date.now()}`,
      status: "failed",
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      errorMessage: error.message || "Unknown workflow worker failure",
      errors: 1,
    }).catch(() => {});
    throw error;
  }
};

module.exports = {
  processDueWorkflowJobs,
  runWorkflowJobCycle,
};
