const ExecutionItem = require("../../models/ExecutionItem");
const { buildAuditEntry, getTemplate } = require("./helpers");
const { executeReadyPlan } = require("./executionService");

const TERMINAL_ITEM_STATUSES = new Set(["paused", "cancelled", "completed", "blocked", "failed"]);

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

const processDueWorkflowJobs = async ({ now = new Date(), limit = 25 } = {}) => {
  const dueItems = await ExecutionItem.find({
    status: { $in: ["scheduled", "ready", "in_progress", "awaiting_approval"] },
    $or: [
      { "followUp.active": true, "followUp.nextRunAt": { $lte: now } },
      { actionLogs: { $elemMatch: { status: "scheduled", scheduledFor: { $lte: now } } } },
    ],
  })
    .sort({ "followUp.nextRunAt": 1, updatedAt: 1 })
    .limit(limit);

  let executed = 0;
  let skipped = 0;
  let escalated = 0;
  let errors = 0;

  for (const item of dueItems) {
    const escalationRule = findEscalationRule(item, now);
    if (escalationRule) {
      item.followUp.escalated = true;
      item.auditTrail.push(
        buildAuditEntry(
          "escalated",
          escalationRule.label,
          { afterDays: escalationRule.afterDays, nextRunAt: item.followUp?.nextRunAt || null },
          "system",
        ),
      );
      await item.save();
      escalated += 1;
    }

    if (TERMINAL_ITEM_STATUSES.has(item.status)) {
      skipped += 1;
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
      continue;
    }

    item.auditTrail.push(
      buildAuditEntry(
        "note",
        "Workflow scheduler picked up a due action.",
        {
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
      executed += 1;
    } catch (error) {
      errors += 1;
      await ExecutionItem.updateOne(
        { _id: item._id },
        {
          $push: {
            auditTrail: buildAuditEntry(
              "note",
              `Workflow scheduler skipped execution: ${error.message || "Unknown error"}.`,
              { error: error.message || "Unknown error" },
              "system",
            ),
          },
        },
      );
    }
  }

  return {
    dueCount: dueItems.length,
    executed,
    skipped,
    escalated,
    errors,
  };
};

module.exports = {
  processDueWorkflowJobs,
};
