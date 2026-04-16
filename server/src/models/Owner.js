const mongoose = require("mongoose");

const payoutRecipientSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    accountName: { type: String, default: "" },
    reference: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const ownerSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "" },
    status: { type: String, enum: ["active", "watch", "inactive"], default: "active" },
    preferredPayoutMethod: { type: String, default: "" },
    payoutRecipients: { type: [payoutRecipientSchema], default: [] },
    notesSummary: { type: String, default: "" },
  },
  { timestamps: true },
);

ownerSchema.index({ workspaceId: 1, status: 1 });
ownerSchema.index({ workspaceId: 1, name: "text", email: "text" });

module.exports = mongoose.model("Owner", ownerSchema);
