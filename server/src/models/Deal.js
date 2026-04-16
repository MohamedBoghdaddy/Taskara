const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "RealEstateLead", required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    stage: {
      type: String,
      enum: ["qualified", "viewing", "offer", "negotiation", "under_contract", "closing", "closed", "lost"],
      default: "qualified",
    },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    nextAction: { type: String, default: "" },
    paymentStatus: { type: String, enum: ["pending", "deposit_received", "installments", "settled"], default: "pending" },
    aiSummary: { type: String, default: "" },
    aiConfidence: { type: Number, default: null },
  },
  { timestamps: true },
);

dealSchema.index({ workspaceId: 1, stage: 1, paymentStatus: 1 });
dealSchema.index({ workspaceId: 1, title: "text", nextAction: "text" });

module.exports = mongoose.model("Deal", dealSchema);
