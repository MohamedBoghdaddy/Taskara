const mongoose = require("mongoose");

const clientReportSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "AgencyAccount", required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    status: { type: String, enum: ["draft", "review", "ready", "sent"], default: "draft" },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: String, default: "" },
    generatedByAI: { type: Boolean, default: false },
    aiConfidence: { type: Number, default: null },
    recipientEmails: { type: [String], default: [] },
    shareUrl: { type: String, default: "" },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

clientReportSchema.index({ workspaceId: 1, accountId: 1, status: 1 });
clientReportSchema.index({ workspaceId: 1, title: "text", summary: "text" });

module.exports = mongoose.model("ClientReport", clientReportSchema);
