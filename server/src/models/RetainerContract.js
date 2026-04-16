const mongoose = require("mongoose");

const retainerContractSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "AgencyAccount", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    packageName: { type: String, required: true, trim: true },
    billingType: { type: String, enum: ["monthly", "quarterly", "project"], default: "monthly" },
    monthlyAmount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: ["active", "at_risk", "paused", "ended"], default: "active" },
    activeFrom: { type: Date, default: null },
    renewsAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

retainerContractSchema.index({ workspaceId: 1, accountId: 1, status: 1 });

module.exports = mongoose.model("RetainerContract", retainerContractSchema);
