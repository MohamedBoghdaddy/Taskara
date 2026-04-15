const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    status: { type: String, enum: ["pending", "active", "done", "blocked"], default: "pending" },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

const communicationTrailSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    channel: { type: String, default: "email" },
    direction: { type: String, enum: ["inbound", "outbound", "internal"], default: "internal" },
    summary: { type: String, default: "" },
    sourceRef: { type: String, default: "" },
  },
  { _id: false },
);

const partySchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    name: { type: String, default: "" },
    contact: { type: String, default: "" },
  },
  { _id: false },
);

const realEstateLeadSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "" },
    propertyInterest: { type: String, default: "" },
    sourceType: { type: String, default: "crm" },
    currentStage: { type: String, default: "new_lead" },
    qualificationStatus: { type: String, default: "pending" },
    nextRequiredAction: { type: String, default: "" },
    documentChecklistId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentChecklist", default: null },
    milestones: { type: [milestoneSchema], default: [] },
    communicationTrail: { type: [communicationTrailSchema], default: [] },
    parties: { type: [partySchema], default: [] },
    metrics: {
      leadResponseMinutes: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      dealCompletionDays: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

realEstateLeadSchema.index({ workspaceId: 1, currentStage: 1, createdAt: -1 });
realEstateLeadSchema.index({ workspaceId: 1, email: 1, phone: 1 });

module.exports = mongoose.model("RealEstateLead", realEstateLeadSchema);
