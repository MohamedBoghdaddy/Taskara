const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "AgencyAccount", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    goal: { type: String, default: "" },
    status: {
      type: String,
      enum: ["planned", "active", "pending_client", "reporting", "completed", "at_risk"],
      default: "planned",
    },
    channels: { type: [String], default: [] },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    budgetAmount: { type: Number, default: 0 },
    budgetCurrency: { type: String, default: "USD" },
    performanceSnapshot: {
      leads: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      spend: { type: Number, default: 0 },
    },
    notesSummary: { type: String, default: "" },
  },
  { timestamps: true },
);

campaignSchema.index({ workspaceId: 1, accountId: 1, status: 1 });
campaignSchema.index({ workspaceId: 1, name: "text", goal: "text" });

module.exports = mongoose.model("Campaign", campaignSchema);
