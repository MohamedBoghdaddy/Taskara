let Worker;
try {
  ({ Worker } = require("bullmq"));
} catch (_) {}

const { runWorkflowJobCycle } = require("../../services/workflows/jobService");

const DEFAULT_INTERVAL_MS = Number(process.env.WORKFLOW_JOB_INTERVAL_MS || 60 * 1000);

let workerInstance = null;

const logJobResult = (label, result) => {
  if (!result) return;
  const shouldLog = result.picked || result.errors || result.escalated;
  if (!shouldLog) return;
  console.log(
    `${label} job=${result.jobId} picked=${result.picked} executed=${result.executed} skipped=${result.skipped} escalated=${result.escalated} errors=${result.errors}`,
  );
};

const startWorkflowWorker = (redisConnection) => {
  if (!Worker || !redisConnection) {
    console.log("[WorkflowWorker] No Redis - using fallback polling");
    const interval = setInterval(async () => {
      try {
        const result = await runWorkflowJobCycle({
          jobId: `poller-${Date.now()}`,
          mode: "poller",
        });
        logJobResult("[WorkflowPoller]", result);
      } catch (error) {
        console.error("[WorkflowPoller]", error.message);
      }
    }, DEFAULT_INTERVAL_MS);

    return { close: () => clearInterval(interval) };
  }

  workerInstance = new Worker(
    "workflows",
    async (job) =>
      runWorkflowJobCycle({
        jobId: String(job?.id || `bullmq-${Date.now()}`),
        mode: "bullmq",
      }),
    {
      connection: redisConnection,
      concurrency: 1,
      lockDuration: DEFAULT_INTERVAL_MS * 2,
    },
  );

  workerInstance.on("completed", (job, result) => {
    logJobResult("[WorkflowWorker]", result);
  });

  workerInstance.on("failed", (job, error) => {
    console.error(`[WorkflowWorker] Job ${job?.id || "unknown"} failed:`, error.message);
  });

  console.log("[WorkflowWorker] Worker started");
  return workerInstance;
};

module.exports = {
  startWorkflowWorker,
};
