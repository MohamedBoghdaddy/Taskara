const mongoose = require("mongoose");
const { AUDIENCE_KEYS } = require("../config/workflowTemplates");

const actionApprovalSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    executionItemId: { type: mongoose.Schema.Types.ObjectId, ref: "ExecutionItem", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    audienceType: { type: String, enum: AUDIENCE_KEYS, required: true },
    workflowType: { type: String, required: true },
    actionId: { type: String, required: true },
    actionLabel: { type: String, required: true },
    channel: { type: String, default: "internal" },
    approvalMode: { type: String, enum: ["manual", "brand_safe", "high_risk"], default: "manual" },
    riskLevel: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    confidenceScore: { type: Number, default: 74 },
    safetyReasons: { type: [String], default: [] },
    reason: { type: String, default: "" },
    payloadPreview: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    decisionComment: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    undoAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

actionApprovalSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
actionApprovalSchema.index({ executionItemId: 1, status: 1 });

module.exports = mongoose.model("ActionApproval", actionApprovalSchema);
