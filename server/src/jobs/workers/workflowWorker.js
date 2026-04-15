let Worker;
try {
  ({ Worker } = require("bullmq"));
} catch (_) {}

const { processDueWorkflowJobs } = require("../../services/workflows/jobService");

const DEFAULT_INTERVAL_MS = Number(process.env.WORKFLOW_JOB_INTERVAL_MS || 60 * 1000);

let workerInstance = null;

const startWorkflowWorker = (redisConnection) => {
  if (!Worker || !redisConnection) {
    console.log("[WorkflowWorker] No Redis - using fallback polling");
    const interval = setInterval(async () => {
      try {
        await processDueWorkflowJobs();
      } catch (error) {
        console.error("[WorkflowPoller]", error.message);
      }
    }, DEFAULT_INTERVAL_MS);

    return { close: () => clearInterval(interval) };
  }

  workerInstance = new Worker(
    "workflows",
    async () => processDueWorkflowJobs(),
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  workerInstance.on("failed", (job, error) => {
    console.error("[WorkflowWorker] Job failed:", error.message);
  });

  console.log("[WorkflowWorker] Worker started");
  return workerInstance;
};

module.exports = {
  startWorkflowWorker,
};
