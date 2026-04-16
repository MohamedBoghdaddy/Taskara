const mongoose = require("mongoose");

const agencyApprovalSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    pendingOn: { type: String, default: "" },
    channel: { type: String, default: "email" },
  },
  { _id: false },
);

const deliverableSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["planned", "in_progress", "pending_client", "revision", "done", "blocked"],
      default: "planned",
    },
    dueAt: { type: Date, default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const agencyAccountSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    clientName: { type: String, default: "" },
    serviceTier: { type: String, default: "" },
    contacts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: { type: String, enum: ["active", "watch", "at_risk", "paused"], default: "active" },
    deliverables: { type: [deliverableSchema], default: [] },
    approvals: { type: [agencyApprovalSchema], default: [] },
    accountHealth: {
      onTimeDeliveryRate: { type: Number, default: 0 },
      approvalTurnaroundHours: { type: Number, default: 0 },
      delayCount: { type: Number, default: 0 },
      utilization: { type: Number, default: 0 },
      budgetStatus: { type: String, default: "on_track" },
    },
    updateCadenceDays: { type: Number, default: 7 },
    lastClientUpdateAt: { type: Date, default: null },
    retainerVisibility: {
      packageLabel: { type: String, default: "" },
      monthlyAmount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      renewalDate: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

agencyAccountSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
agencyAccountSchema.index({ workspaceId: 1, name: "text", clientName: "text" });

module.exports = mongoose.model("AgencyAccount", agencyAccountSchema);
