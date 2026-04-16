const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "active", "under_offer", "under_contract", "closed", "off_market"],
      default: "draft",
    },
    propertyType: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    description: { type: String, default: "" },
    aiDescription: { type: String, default: "" },
    aiConfidence: { type: Number, default: null },
  },
  { timestamps: true },
);

propertySchema.index({ workspaceId: 1, ownerId: 1, status: 1 });
propertySchema.index({ workspaceId: 1, title: "text", address: "text", city: "text" });

module.exports = mongoose.model("Property", propertySchema);
