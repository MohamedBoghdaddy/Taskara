require("dotenv").config();
const assert = require("assert");
const mongoose = require("mongoose");
const ActionApproval = require("../src/models/ActionApproval");
const DocumentChecklist = require("../src/models/DocumentChecklist");
const ExecutionItem = require("../src/models/ExecutionItem");
const RealEstateLead = require("../src/models/RealEstateLead");
const { connectDB } = require("../src/config/db");
const { seedWorkflowDemoData } = require("../src/services/workflows/demoSeedService");
const { getWorkflowAnalytics, getWorkflowDashboard } = require("../src/services/workflows/workflowService");

const run = async () => {
  await connectDB();
  const seeded = await seedWorkflowDemoData();
  const workspaceId = seeded.workspaceId;

  const items = await ExecutionItem.find({ workspaceId, "sourceRef.connector": "demo_seed" });
  assert.strictEqual(items.length, 20, `Expected 20 demo execution items, received ${items.length}`);

  items.forEach((item) => {
    assert(item.assignee?.reason, `Missing assignment reason for item ${item.title}`);
  });

  const pendingApprovalItems = items.filter((item) => item.approvalStatus === "pending");
  assert(pendingApprovalItems.length >= 2, "Expected pending approval items in the seed data");
  for (const item of pendingApprovalItems) {
    assert(item.approvalId, `Pending approval item ${item.title} is missing approvalId`);
    const approval = await ActionApproval.findById(item.approvalId);
    assert(approval, `Approval document missing for ${item.title}`);
    const actionLog = item.actionLogs.find((entry) => entry.actionId === approval.actionId);
    assert(actionLog, `Approval action log missing for ${item.title}`);
    assert.strictEqual(actionLog.status, "awaiting_approval", `Approval action executed too early for ${item.title}`);
  }

  const cancelledItems = items.filter((item) => item.status === "cancelled");
  assert(cancelledItems.length >= 1, "Expected at least one cancelled item in demo data");
  cancelledItems.forEach((item) => {
    const invalidLog = item.actionLogs.find((entry) => ["pending", "scheduled", "awaiting_approval"].includes(entry.status));
    assert(!invalidLog, `Cancelled item ${item.title} still has active action logs`);
  });

  const pausedItem = items.find((item) => item.status === "paused");
  assert(pausedItem, "Expected a paused workflow item in demo data");
  assert.strictEqual(pausedItem.followUp?.active, false, "Paused item should not have an active follow-up");

  const manualOverrideItem = items.find((item) => item.assignee?.manualOverride);
  assert(manualOverrideItem, "Expected a manually overridden workflow item");
  assert(manualOverrideItem.assignee?.reason, "Manual override item is missing its visible reason");

  const failedItem = items.find((item) => item.status === "failed");
  assert(failedItem, "Expected a failed workflow item");
  assert(
    failedItem.syncLogs.some((entry) => ["failed", "awaiting_connector"].includes(entry.status)),
    "Failed workflow item should include a visible sync failure or connector-blocked log",
  );

  const recruiterItems = items.filter((item) => item.audienceType === "recruiters");
  assert(recruiterItems.some((item) => item.workflowType === "candidate_outreach" && item.actionLogs.some((entry) => entry.actionId === "send_outreach" && entry.status === "executed")), "Recruiter path is missing executed outreach");
  assert(recruiterItems.some((item) => item.workflowType === "interview_coordination"), "Recruiter path is missing interview coordination");
  assert(recruiterItems.some((item) => item.status === "blocked"), "Recruiter path is missing blocked rejection coverage");

  const startupItems = items.filter((item) => item.audienceType === "startups");
  assert(startupItems.filter((item) => item.workflowType === "thread_breakdown").length >= 3, "Startup thread breakdown items were not created");
  assert(startupItems.some((item) => item.workflowType === "issue_routing" && item.approvalStatus === "pending"), "Startup approval-sensitive routing path is missing");
  assert(startupItems.some((item) => item.linkedTaskId), "Startup items were not linked back to Task records");

  const agencyItems = items.filter((item) => item.audienceType === "agencies");
  assert(agencyItems.length === 5, "Agency seed count is wrong");
  assert(agencyItems.some((item) => item.approvalStatus === "pending"), "Agency approval queue is empty");
  assert(agencyItems.some((item) => item.status === "cancelled"), "Agency cancel control was not exercised");

  const realEstateItems = items.filter((item) => item.audienceType === "realestate");
  assert(realEstateItems.length === 5, "Real estate seed count is wrong");
  assert(realEstateItems.some((item) => item.status === "ready"), "Real estate ready-state coverage is missing");
  assert(realEstateItems.some((item) => item.status === "scheduled"), "Real estate scheduled follow-up coverage is missing");

  const checklists = await DocumentChecklist.find({ workspaceId });
  assert(checklists.length >= 5, "Expected real estate document checklists in demo data");
  const leads = await RealEstateLead.find({ workspaceId });
  assert(leads.some((lead) => lead.currentStage === "closed"), "Real estate metrics need at least one closed lead");

  for (const audienceType of ["recruiters", "startups", "agencies", "realestate"]) {
    const dashboard = await getWorkflowDashboard(workspaceId, audienceType);
    const analytics = await getWorkflowAnalytics(workspaceId, audienceType);
    assert(dashboard.summary, `Dashboard summary missing for ${audienceType}`);
    assert(Array.isArray(dashboard.items), `Dashboard items missing for ${audienceType}`);
    assert(Array.isArray(dashboard.integrationCoverage), `Integration coverage missing for ${audienceType}`);
    assert(analytics && typeof analytics === "object", `Analytics payload missing for ${audienceType}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        workspaceId: String(workspaceId),
        checkedItems: items.length,
        pendingApprovals: pendingApprovalItems.length,
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
