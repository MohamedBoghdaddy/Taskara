const mongoose = require("mongoose");

const workerJobRunSchema = new mongoose.Schema(
  {
    queueName: { type: String, default: "workflows" },
    mode: { type: String, enum: ["bullmq", "poller", "manual"], default: "manual" },
    jobId: { type: String, required: true, trim: true },
    status: { type: String, enum: ["success", "partial", "failed"], default: "success" },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, default: 0 },
    dueCount: { type: Number, default: 0 },
    picked: { type: Number, default: 0 },
    executed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    escalated: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    errorMessage: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

workerJobRunSchema.index({ queueName: 1, createdAt: -1 });
workerJobRunSchema.index({ jobId: 1 }, { unique: true });

module.exports = mongoose.model("WorkerJobRun", workerJobRunSchema);
