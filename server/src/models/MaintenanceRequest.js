const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorName: { type: String, default: "" },
    summary: { type: String, required: true, trim: true },
    status: { type: String, enum: ["requested", "in_progress", "done", "blocked"], default: "requested" },
    dueAt: { type: Date, default: null },
  },
  { timestamps: true },
);

maintenanceRequestSchema.index({ workspaceId: 1, propertyId: 1, status: 1 });

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
