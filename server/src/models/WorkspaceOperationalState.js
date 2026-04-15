const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, default: "" },
    status: { type: String, enum: ["idle", "passed", "failed", "warning"], default: "idle" },
    passed: { type: Boolean, default: false },
    lastRunAt: { type: Date, default: null },
    reasons: { type: [String], default: [] },
    logs: { type: [String], default: [] },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const onboardingSchema = new mongoose.Schema(
  {
    audienceType: { type: String, default: "" },
    requiredIntegration: { type: String, default: "" },
    currentStep: { type: Number, min: 1, max: 6, default: 1 },
    demoMode: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastWorkflowRunId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowRun", default: null },
    lastExecutionItemId: { type: mongoose.Schema.Types.ObjectId, ref: "ExecutionItem", default: null },
    approvalDecision: { type: String, enum: ["", "approved", "rejected"], default: "" },
    resultSummary: { type: String, default: "" },
    savedMinutesEstimate: { type: Number, default: 0 },
    nextRecommendedAction: { type: String, default: "" },
  },
  { _id: false },
);

const workspaceOperationalStateSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, unique: true },
    onboarding: { type: onboardingSchema, default: () => ({}) },
    workflowTests: { type: [testResultSchema], default: [] },
    connectorTests: { type: [testResultSchema], default: [] },
    monitoring: {
      alertThresholds: {
        failedExecutionRatePct: { type: Number, default: 20 },
        connectorFailureRatePct: { type: Number, default: 15 },
        workerErrorCount: { type: Number, default: 3 },
      },
      lastAlertReasons: { type: [String], default: [] },
      lastEvaluatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WorkspaceOperationalState", workspaceOperationalStateSchema);
