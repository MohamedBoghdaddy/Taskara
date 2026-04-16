const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    body: { type: String, default: "" },
    authorName: { type: String, default: "" },
    visibility: { type: String, enum: ["internal", "external"], default: "internal" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const contentItemSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "AgencyAccount", required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    contentType: { type: String, enum: ["post", "ad", "email", "report_asset", "landing_page"], default: "post" },
    channel: { type: String, enum: ["instagram", "facebook", "linkedin", "x", "email", "web", "internal"], default: "internal" },
    status: {
      type: String,
      enum: ["draft", "review", "approved", "scheduled", "published", "blocked"],
      default: "draft",
    },
    caption: { type: String, default: "" },
    hashtags: { type: [String], default: [] },
    previewText: { type: String, default: "" },
    scheduledFor: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    approvalState: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
    },
    assetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attachment" }],
    comments: { type: [commentSchema], default: [] },
    aiConfidence: { type: Number, default: null },
    sourceSnippet: { type: String, default: "" },
  },
  { timestamps: true },
);

contentItemSchema.index({ workspaceId: 1, accountId: 1, status: 1, scheduledFor: 1 });
contentItemSchema.index({ workspaceId: 1, title: "text", caption: "text" });

module.exports = mongoose.model("ContentItem", contentItemSchema);
