const mongoose = require("mongoose");
const { AUDIENCE_KEYS } = require("../config/workflowTemplates");

const workflowFeedbackSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    executionItemId: { type: mongoose.Schema.Types.ObjectId, ref: "ExecutionItem", required: true },
    workflowRunId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowRun", default: null },
    audienceType: { type: String, enum: AUDIENCE_KEYS, required: true },
    workflowType: { type: String, required: true, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    verdict: { type: String, enum: ["correct", "incorrect"], required: true },
    categories: {
      type: [String],
      default: [],
      enum: [
        "wrong_action",
        "wrong_assignment",
        "wrong_output",
        "wrong_recipient",
        "wrong_sync_target",
        "unclear_explanation",
        "should_have_required_approval",
      ],
    },
    note: { type: String, default: "" },
    actionId: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

workflowFeedbackSchema.index({ workspaceId: 1, audienceType: 1, createdAt: -1 });
workflowFeedbackSchema.index({ executionItemId: 1, submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model("WorkflowFeedback", workflowFeedbackSchema);
