const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientName: { type: String, default: "" },
    recipientReference: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    dueAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "review", "ready", "approved", "released"],
      default: "draft",
    },
    approvalRequired: { type: Boolean, default: true },
    aiSummary: { type: String, default: "" },
    aiConfidence: { type: Number, default: null },
  },
  { timestamps: true },
);

settlementSchema.index({ workspaceId: 1, ownerId: 1, status: 1, dueAt: 1 });

module.exports = mongoose.model("Settlement", settlementSchema);
