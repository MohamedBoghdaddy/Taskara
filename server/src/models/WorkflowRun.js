const mongoose = require("mongoose");
const { AUDIENCE_KEYS } = require("../config/workflowTemplates");

const workflowRunAuditSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, required: true },
    message: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const workflowRunSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    audienceType: { type: String, enum: AUDIENCE_KEYS, required: true },
    workflowType: { type: String, required: true },
    sourceType: { type: String, required: true },
    sourceRef: {
      externalId: { type: String, default: "" },
      url: { type: String, default: "" },
      label: { type: String, default: "" },
      threadId: { type: String, default: "" },
      connector: { type: String, default: "" },
    },
    sourceFingerprint: { type: String, required: true },
    status: {
      type: String,
      enum: ["ingested", "extracted", "executing", "completed", "duplicate", "failed"],
      default: "ingested",
    },
    input: {
      title: { type: String, default: "" },
      rawText: { type: String, default: "" },
      payload: { type: mongoose.Schema.Types.Mixed, default: {} },
      triggerMode: { type: String, enum: ["manual", "connector", "webhook", "onboarding", "verification"], default: "manual" },
    },
    extractionSummary: {
      itemCount: { type: Number, default: 0 },
      duplicateCount: { type: Number, default: 0 },
      groupedCount: { type: Number, default: 0 },
      confidenceAverage: { type: Number, default: 0 },
    },
    executionSummary: {
      executedCount: { type: Number, default: 0 },
      pendingApprovals: { type: Number, default: 0 },
      blockedCount: { type: Number, default: 0 },
      syncedCount: { type: Number, default: 0 },
    },
    executionItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ExecutionItem" }],
    auditTrail: { type: [workflowRunAuditSchema], default: [] },
  },
  { timestamps: true },
);

workflowRunSchema.index({ workspaceId: 1, audienceType: 1, createdAt: -1 });
workflowRunSchema.index({ workspaceId: 1, sourceFingerprint: 1 }, { unique: true });

module.exports = mongoose.model("WorkflowRun", workflowRunSchema);
