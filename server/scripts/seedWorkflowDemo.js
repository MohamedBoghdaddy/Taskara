require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/db");
const { seedWorkflowDemoData } = require("../src/services/workflows/demoSeedService");

const run = async () => {
  await connectDB();
  const result = await seedWorkflowDemoData();
  console.log(
    JSON.stringify(
      {
        ok: true,
        workspaceId: String(result.workspaceId),
        seededExecutionItems: result.seededExecutionItems,
        seededWorkflowRuns: result.seededWorkflowRuns,
        seededApprovals: result.seededApprovals,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
