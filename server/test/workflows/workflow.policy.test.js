const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");

const {
  applyAudienceWorkspaceProfile,
  getWorkspaceContextById,
} = require("../../src/services/workspaces/workspaceProfileService");
const { applyWorkflowPolicyToSafety } = require("../../src/services/workflows/workflowPolicyService");
const { buildDashboardWidgets, getDashboardLayout } = require("../../src/services/dashboards/dashboardRegistryService");
const {
  extractAgencyReportIntelligence,
  extractSettlementIntelligence,
  extractStudyDocumentIntelligence,
} = require("../../src/services/documents/documentIntelligenceService");
const { createHarness } = require("../helpers/workflowTestHarness");

let harness;

const baseSafety = () => ({
  confidenceScore: 92,
  riskLevel: "low",
  reasons: [],
  executionBlocked: false,
  approvalForced: false,
  approvalRecommended: false,
});

before(async () => {
  harness = await createHarness();
});

after(async () => {
  await harness.close();
});

beforeEach(async () => {
  await harness.resetDatabase();
});

test("workspace profiles drive softer student trust copy without removing hard stops", async () => {
  const owner = await harness.createUser({ email: "student-profile@test.local" });
  const workspace = await harness.createWorkspace({ owner, name: "Student Surface" });

  await applyAudienceWorkspaceProfile(workspace._id, "student");
  const context = await getWorkspaceContextById(workspace._id);

  assert.equal(context.vertical, "student");
  assert.equal(context.surfaceMode, "student");
  assert.equal(context.featureProfile, "student_survival");
  assert.equal(context.trustProfile, "student");

  const reviewRecommendation = await applyWorkflowPolicyToSafety({
    item: { workspaceId: workspace._id, audienceType: "student" },
    actionId: "extract_deadlines",
    action: { label: "Extract deadlines", channel: "internal" },
    safety: baseSafety(),
  });

  assert.equal(reviewRecommendation.reviewLabel, "Review AI suggestion");
  assert.equal(reviewRecommendation.reviewRecommendedLabel, "Check before saving");
  assert.equal(reviewRecommendation.copyTone, "student");
  assert.equal(reviewRecommendation.approvalRecommended, true);
  assert.equal(reviewRecommendation.riskLevel, "medium");
  assert.match(reviewRecommendation.reviewMessage, /may have extracted it incorrectly/i);

  const protectedWrite = await applyWorkflowPolicyToSafety({
    item: { workspaceId: workspace._id, audienceType: "student" },
    actionId: "overwrite_confirmed_deadline",
    action: { label: "Overwrite confirmed deadline", channel: "internal" },
    safety: baseSafety(),
  });

  assert.equal(protectedWrite.approvalForced, true);
  assert.equal(protectedWrite.riskLevel, "high");
  assert.match(protectedWrite.reviewMessage, /could create confusing or incorrect information/i);
});

test("agency client-facing actions are forced into review-heavy trust policy", async () => {
  const result = await applyWorkflowPolicyToSafety({
    item: { audienceType: "agencies" },
    actionId: "send_status",
    action: { label: "Send status update", channel: "email" },
    safety: baseSafety(),
  });

  assert.equal(result.reviewLabel, "Approval required");
  assert.equal(result.approvalForced, true);
  assert.equal(result.approvalRecommended, false);
  assert.equal(result.riskLevel, "high");
  assert.ok(
    result.reasons.some((reason) => /client-facing|publish-facing/i.test(reason)),
    "expected an agency wrong-send reason to be added",
  );
  assert.match(result.reviewMessage, /wrong external outcome/i);
});

test("dashboard registry returns verticalized layouts for operator and student surfaces", () => {
  const agencyLayout = getDashboardLayout({ vertical: "agencies", surfaceMode: "operator", audienceType: "agencies" });
  const studentLayout = getDashboardLayout({ vertical: "student", surfaceMode: "student", audienceType: "student" });

  assert.deepEqual(
    agencyLayout.map((widget) => widget.id),
    ["active_clients", "campaign_status", "content_queue", "pending_approvals", "report_readiness", "wrong_send_risk"],
  );
  assert.deepEqual(
    studentLayout.map((widget) => widget.id),
    ["today_queue", "upcoming_deadlines", "exam_readiness", "focus_history"],
  );

  const widgets = buildDashboardWidgets({
    vertical: "realestate",
    surfaceMode: "operator",
    audienceType: "realestate",
    data: { new_leads: 3, settlements_due: 2, money_at_risk: 150000 },
  });

  assert.equal(widgets[0].label, "New leads");
  assert.equal(widgets[0].value, 3);
  assert.equal(widgets.find((widget) => widget.id === "money_at_risk").value, 150000);
});

test("document intelligence stays reusable across agency, real-estate, and study inputs", async () => {
  const report = await extractAgencyReportIntelligence({
    text: "Northwind report window 2026-05-01 to 2026-05-31 with USD 12,500 spend and 4.6% CTR.",
  });
  assert.equal(report.documentType, "report");
  assert.ok(report.entities.dates.includes("2026-05-01"));
  assert.ok(report.entities.amounts.some((value) => /12,500/.test(value)));
  assert.ok(report.entities.percentages.includes("4.6%"));

  const settlement = await extractSettlementIntelligence({
    text: "Settlement scheduled 2026-06-15 for USD 88,000 to owner record AB-220.",
  });
  assert.equal(settlement.documentType, "settlement");
  assert.ok(settlement.entities.dates.includes("2026-06-15"));
  assert.ok(settlement.entities.amounts.some((value) => /88,000/.test(value)));

  const syllabus = await extractStudyDocumentIntelligence({
    text: "Quiz 1 on 2026-09-18. Midterm exam on 2026-10-24. Project due 2026-11-09.",
  });
  assert.equal(syllabus.documentType, "syllabus");
  assert.deepEqual(
    syllabus.entities.dates,
    ["2026-09-18", "2026-10-24", "2026-11-09"],
  );
});
