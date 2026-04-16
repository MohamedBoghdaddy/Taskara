const Task = require("../../models/Task");

const mapExecutionStatusToTaskStatus = (status) => {
  if (status === "completed") return "done";
  if (status === "in_progress") return "in_progress";
  if (["blocked", "failed", "paused", "awaiting_approval"].includes(status)) return "blocked";
  if (status === "cancelled") return "archived";
  return "todo";
};

const buildTaskPayload = (item) => ({
  title: item.title,
  description: item.description || item.sourceContext?.excerpt || "",
  priority: item.priority || "medium",
  dueDate: item.dueAt || null,
  status: mapExecutionStatusToTaskStatus(item.status),
  taskType:
    item.audienceType === "agencies"
      ? "content"
      : item.audienceType === "realestate"
        ? "deal"
        : item.audienceType === "startups"
          ? "workflow"
          : "general",
  assigneeIds: item.assignee?.userId ? [item.assignee.userId] : [],
  contextType: item.entityLinks?.[0]?.kind || "",
  contextId: item.entityLinks?.[0]?.id || null,
  reviewState: item.approvalRequired ? "pending_review" : "not_needed",
  workflowItemId: item._id,
  sourceSnippet: item.sourceContext?.excerpt || "",
  aiConfidence: item.confidenceScore || null,
  meta: {
    source: "workflow_execution",
    executionItemId: item._id,
    audienceType: item.audienceType,
    workflowType: item.workflowType,
    sourceType: item.sourceType,
    sourceRef: item.sourceRef,
    entityLinks: item.entityLinks || [],
  },
});

const createLinkedTaskForExecutionItem = async (item) => {
  if (!item || item.audienceType !== "startups" || item.linkedTaskId) return item;

  const task = await Task.create({
    workspaceId: item.workspaceId,
    createdBy: item.createdBy,
    ...buildTaskPayload(item),
  });

  item.linkedTaskId = task._id;
  item.auditTrail.push({
    at: new Date(),
    type: "note",
    actorType: "system",
    message: "Linked Task record created for startup execution tracking.",
    metadata: { linkedTaskId: task._id },
  });
  await item.save();
  return item;
};

const syncLinkedTaskFromExecutionItem = async (item) => {
  if (!item?.linkedTaskId) return;

  await Task.updateOne(
    { _id: item.linkedTaskId, workspaceId: item.workspaceId },
    { $set: buildTaskPayload(item) },
  );
};

module.exports = {
  createLinkedTaskForExecutionItem,
  mapExecutionStatusToTaskStatus,
  syncLinkedTaskFromExecutionItem,
};
