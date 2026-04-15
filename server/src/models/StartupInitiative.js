const mongoose = require("mongoose");

const startupInitiativeSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["captured", "active", "blocked", "done"], default: "captured" },
    linkedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    sourceThreads: { type: [mongoose.Schema.Types.Mixed], default: [] },
    linkedDocs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    linkedGithub: { type: [mongoose.Schema.Types.Mixed], default: [] },
    statusSummary: { type: String, default: "" },
    metrics: {
      totalItems: { type: Number, default: 0 },
      completedItems: { type: Number, default: 0 },
      unownedItems: { type: Number, default: 0 },
      blockedItems: { type: Number, default: 0 },
    },
    approvalRequired: { type: Boolean, default: false },
  },
  { timestamps: true },
);

startupInitiativeSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
startupInitiativeSchema.index({ workspaceId: 1, title: "text", description: "text" });

module.exports = mongoose.model("StartupInitiative", startupInitiativeSchema);
