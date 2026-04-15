const mongoose = require("mongoose");

const candidateActivitySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, required: true },
    message: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const scorecardSchema = new mongoose.Schema(
  {
    category: { type: String, default: "" },
    score: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const candidateSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "" },
    roleTitle: { type: String, default: "" },
    company: { type: String, default: "" },
    sourceType: { type: String, default: "email" },
    sourceRef: { type: String, default: "" },
    currentStage: { type: String, default: "sourced" },
    outreachSequence: {
      active: { type: Boolean, default: true },
      approvalMode: { type: Boolean, default: true },
      followUpsSent: { type: Number, default: 0 },
      nextFollowUpAt: { type: Date, default: null },
      stopReason: { type: String, default: "" },
    },
    scheduling: {
      status: { type: String, default: "not_started" },
      candidateTimezone: { type: String, default: "" },
      interviewerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      proposedSlots: { type: [mongoose.Schema.Types.Mixed], default: [] },
      conflictState: { type: String, default: "clear" },
    },
    feedbackCollection: {
      requestedAt: { type: Date, default: null },
      pendingCount: { type: Number, default: 0 },
      structuredNotes: { type: [scorecardSchema], default: [] },
    },
    rejectionFlow: {
      lastSentAt: { type: Date, default: null },
      nurtureEnabled: { type: Boolean, default: false },
    },
    metrics: {
      responseRate: { type: Number, default: 0 },
      timeToFirstResponseHours: { type: Number, default: 0 },
      timeToHireDays: { type: Number, default: 0 },
    },
    activityLog: { type: [candidateActivitySchema], default: [] },
  },
  { timestamps: true },
);

candidateSchema.index({ workspaceId: 1, email: 1 });
candidateSchema.index({ workspaceId: 1, currentStage: 1, createdAt: -1 });

module.exports = mongoose.model("Candidate", candidateSchema);
