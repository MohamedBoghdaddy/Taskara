const mongoose = require("mongoose");
const { AUDIENCE_KEYS } = require("../config/workflowTemplates");

const auditEntrySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: [
        "ingested",
        "extracted",
        "assigned",
        "approval_requested",
        "approved",
        "rejected",
        "executed",
        "synced",
        "status_changed",
        "paused",
        "cancelled",
        "resumed",
        "escalated",
        "followup_scheduled",
        "followup_stopped",
        "note",
      ],
      required: true,
    },
    actorType: {
      type: String,
      enum: ["system", "user", "ai", "integration"],
      default: "system",
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    message: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const actionLogSchema = new mongoose.Schema(
  {
    actionId: { type: String, required: true },
    label: { type: String, required: true },
    channel: { type: String, default: "internal" },
    status: {
      type: String,
      enum: [
        "pending",
        "scheduled",
        "executed",
        "skipped",
        "failed",
        "awaiting_approval",
        "cancelled",
      ],
      default: "pending",
    },
    requiresApproval: { type: Boolean, default: false },
    scheduledFor: { type: Date, default: null },
    executedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    reason: { type: String, default: "" },
    attemptCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const syncLogSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    direction: { type: String, enum: ["outbound", "inbound", "bidirectional"], default: "outbound" },
    status: {
      type: String,
      enum: ["pending", "synced", "skipped", "failed", "awaiting_connector", "awaiting_approval"],
      default: "pending",
    },
    attemptedAt: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const executionPlanStepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    channel: { type: String, default: "internal" },
    requiresApproval: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "ready", "waiting", "done", "skipped", "failed"],
      default: "pending",
    },
    scheduledFor: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const executionItemSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    workflowRunId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowRun", default: null },
    linkedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    workflowType: { type: String, required: true, trim: true },
    audienceType: { type: String, enum: AUDIENCE_KEYS, required: true },
    sourceType: { type: String, required: true, trim: true },
    sourceRef: {
      externalId: { type: String, default: "" },
      url: { type: String, default: "" },
      label: { type: String, default: "" },
      threadId: { type: String, default: "" },
      connector: { type: String, default: "" },
    },
    sourceFingerprint: { type: String, required: true },
    sourceContext: {
      title: { type: String, default: "" },
      excerpt: { type: String, default: "" },
      rawText: { type: String, default: "" },
      payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    groupKey: { type: String, default: "" },
    groupLabel: { type: String, default: "" },
    assignee: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      reason: { type: String, default: "" },
      teamRole: { type: String, default: "" },
      routingRole: { type: String, default: "" },
      loadSnapshot: { type: Number, default: 0 },
      manualOverride: { type: Boolean, default: false },
      assignedAt: { type: Date, default: null },
    },
    dueAt: { type: Date, default: null },
    status: {
      type: String,
      enum: [
        "queued",
        "ready",
        "awaiting_approval",
        "scheduled",
        "in_progress",
        "blocked",
        "completed",
        "cancelled",
        "paused",
        "failed",
      ],
      default: "queued",
    },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    stage: { type: String, default: "" },
    executionPlan: { type: [executionPlanStepSchema], default: [] },
    approvalRequired: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected", "cancelled"],
      default: "not_required",
    },
    approvalId: { type: mongoose.Schema.Types.ObjectId, ref: "ActionApproval", default: null },
    createdByAI: { type: Boolean, default: true },
    confidenceScore: { type: Number, default: 0.74 },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "ExecutionItem", default: null },
    riskLevel: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    traceability: {
      outcomeSummary: { type: String, default: "" },
      outcomeStatus: { type: String, default: "" },
      lastOutcomeAt: { type: Date, default: null },
    },
    followUp: {
      active: { type: Boolean, default: false },
      cadenceStep: { type: Number, default: 0 },
      nextRunAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 0 },
      stopReason: { type: String, default: "" },
      escalated: { type: Boolean, default: false },
    },
    entityRefs: {
      candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
      initiativeId: { type: mongoose.Schema.Types.ObjectId, ref: "StartupInitiative", default: null },
      accountId: { type: mongoose.Schema.Types.ObjectId, ref: "AgencyAccount", default: null },
      leadId: { type: mongoose.Schema.Types.ObjectId, ref: "RealEstateLead", default: null },
      documentChecklistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DocumentChecklist",
        default: null,
      },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    },
    permissions: {
      canApproveRoles: { type: [String], default: ["owner", "admin"] },
      canOverrideAssignmentRoles: { type: [String], default: ["owner", "admin"] },
      canTriggerRoles: { type: [String], default: ["owner", "admin", "editor"] },
    },
    auditTrail: { type: [auditEntrySchema], default: [] },
    actionLogs: { type: [actionLogSchema], default: [] },
    syncLogs: { type: [syncLogSchema], default: [] },
  },
  { timestamps: true },
);

executionItemSchema.index({ workspaceId: 1, audienceType: 1, status: 1, dueAt: 1 });
executionItemSchema.index({ workspaceId: 1, sourceFingerprint: 1, workflowType: 1 });
executionItemSchema.index({ "assignee.userId": 1, workspaceId: 1, status: 1 });
executionItemSchema.index({ title: "text", description: "text", "sourceContext.rawText": "text" });

module.exports = mongoose.model("ExecutionItem", executionItemSchema);
