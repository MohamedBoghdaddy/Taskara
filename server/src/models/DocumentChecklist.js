const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    required: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["missing", "requested", "received", "approved"],
      default: "missing",
    },
    requestedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    lastReminderAt: { type: Date, default: null },
    note: { type: String, default: "" },
    sourceRef: { type: String, default: "" },
  },
  { _id: false },
);

const documentChecklistSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "RealEstateLead", required: true },
    title: { type: String, default: "Deal checklist" },
    storageRef: { type: String, default: "" },
    items: { type: [checklistItemSchema], default: [] },
    missingCount: { type: Number, default: 0 },
    nextReminderAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentChecklistSchema.index({ workspaceId: 1, leadId: 1 });

module.exports = mongoose.model("DocumentChecklist", documentChecklistSchema);
