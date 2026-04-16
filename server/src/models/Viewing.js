const mongoose = require("mongoose");

const viewingSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "RealEstateLead", required: true },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ["scheduled", "completed", "cancelled", "no_show"], default: "scheduled" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

viewingSchema.index({ workspaceId: 1, scheduledFor: 1, status: 1 });

module.exports = mongoose.model("Viewing", viewingSchema);
