const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const mongoose = require("mongoose");

const ActionApproval = require("../../src/models/ActionApproval");
const { processDueWorkflowJobs } = require("../../src/services/workflows/jobService");
const { createHarness } = require("../helpers/workflowTestHarness");

let harness;

const post = (path, user, body) =>
  harness.request(path, {
    method: "POST",
    headers: harness.authHeadersFor(user),
    body,
  });

const get = (path, user) =>
  harness.request(path, {
    method: "GET",
    headers: harness.authHeadersFor(user),
  });

const buildAssignee = (user, role = "owner") => ({
  userId: user._id,
  name: user.name,
  email: user.email,
  reason: `Assigned to ${user.name} for test coverage.`,
  teamRole: role,
  routingRole: role,
  loadSnapshot: 0,
  manualOverride: false,
  assignedAt: new Date(),
});

const buildBaseItem = ({ workspaceId, user, audienceType, workflowType, title, sourceType, payload = {} }) => ({
  workspaceId,
  createdBy: user._id,
  title,
  description: `${title} test item`,
  workflowType,
  audienceType,
  sourceType,
  sourceRef: {
    externalId: `test-${new mongoose.Types.ObjectId()}`,
    label: title,
    connector: "workflow_test",
  },
  sourceFingerprint: String(new mongoose.Types.ObjectId()),
  sourceContext: {
    title,
    excerpt: `${title} excerpt`,
    rawText: `${title} raw text`,
    payload,
  },
  groupKey: `group-${new mongoose.Types.ObjectId()}`,
  groupLabel: title,
  assignee: buildAssignee(user),
  status: "ready",
  priority: "high",
  stage: "",
  approvalRequired: false,
  approvalStatus: "not_required",
  createdByAI: true,
  auditTrail: [],
  syncLogs: [],
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

test("workflow analytics and item listing routes stay stable with partial data", async () => {
  const owner = await harness.createUser({ email: "analytics-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Analytics Workspace" });

  const ingestResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "startups",
    sourceType: "slack",
    workflowType: "thread_breakdown",
    title: "Metrics thread",
    text: "Slack thread about triage and release blockers.",
    payload: {
      initiativeTitle: "Metrics Stability",
      threadUrl: "https://slack.test/thread/metrics",
    },
    autoExecute: false,
  });
  assert.equal(ingestResponse.status, 201);

  const itemsResponse = await get("/api/workflows/items?audienceType=startups", owner);
  assert.equal(itemsResponse.status, 200);
  assert.equal(itemsResponse.body.items.length >= 1, true);

  const analyticsResponse = await get("/api/workflows/analytics?audienceType=startups", owner);
  assert.equal(analyticsResponse.status, 200);
  assert.equal(typeof analyticsResponse.body.metrics.execution_velocity, "number");

  const allAnalyticsResponse = await get("/api/workflows/analytics", owner);
  assert.equal(allAnalyticsResponse.status, 200);
  assert.equal(allAnalyticsResponse.body.entries.length, 4);
});

test("control endpoints keep pause, resume, stop-followup, and undo transitions valid", async () => {
  const owner = await harness.createUser({ email: "control-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Control Workspace" });

  const future = new Date(Date.now() + 60 * 60 * 1000);
  const item = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "startups",
      workflowType: "spec_handoff",
      title: "Scheduled startup follow-up",
      sourceType: "slack",
      payload: { threadUrl: "https://slack.test/thread/control" },
    }),
    status: "scheduled",
    executionPlan: [
      { id: "group_initiative", label: "Group under initiative", channel: "internal", status: "done" },
      { id: "assign_owner", label: "Assign owner", channel: "internal", status: "done" },
      { id: "create_github_issue", label: "Create GitHub issue", channel: "github", requiresApproval: true, status: "pending" },
      { id: "post_status_slack", label: "Post status update to Slack", channel: "slack", status: "waiting", scheduledFor: future },
    ],
    actionLogs: [
      { actionId: "group_initiative", label: "Group under initiative", channel: "internal", status: "executed", executedAt: new Date(), attemptCount: 1 },
      { actionId: "assign_owner", label: "Assign owner", channel: "internal", status: "executed", executedAt: new Date(), attemptCount: 1 },
      { actionId: "create_github_issue", label: "Create GitHub issue", channel: "github", status: "pending", requiresApproval: true, attemptCount: 0 },
      { actionId: "post_status_slack", label: "Post status update to Slack", channel: "slack", status: "scheduled", scheduledFor: future, attemptCount: 0 },
    ],
    followUp: {
      active: true,
      cadenceStep: 1,
      nextRunAt: future,
      attempts: 1,
      maxAttempts: 3,
      stopReason: "",
      escalated: false,
    },
  });

  const pauseResponse = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "pause" });
  assert.equal(pauseResponse.status, 200);
  assert.equal(pauseResponse.body.status, "paused");
  assert.equal(pauseResponse.body.followUp.active, false);

  const resumeResponse = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "resume" });
  assert.equal(resumeResponse.status, 200);
  assert.equal(resumeResponse.body.status, "scheduled");
  assert.equal(resumeResponse.body.followUp.active, true);
  assert.equal(resumeResponse.body.actionLogs.filter((entry) => entry.actionId === "post_status_slack" && entry.status === "scheduled").length, 1);

  const stopFollowUp = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "stop_followup" });
  assert.equal(stopFollowUp.status, 200);
  assert.equal(stopFollowUp.body.followUp.active, false);
  assert.equal(stopFollowUp.body.actionLogs.find((entry) => entry.actionId === "post_status_slack").status, "cancelled");
  assert.equal(stopFollowUp.body.actionLogs.find((entry) => entry.actionId === "create_github_issue").status, "pending");

  const redundantStopFollowUp = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "stop_followup" });
  assert.equal(redundantStopFollowUp.status, 409);

  const undoResponse = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "undo_last_action" });
  assert.equal(undoResponse.status, 200);
  assert.equal(undoResponse.body.actionLogs.find((entry) => entry.actionId === "assign_owner").status, "pending");

  const invalidResume = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "resume" });
  assert.equal(invalidResume.status, 409);
});

test("distinct risky actions require distinct approvals and rejected approvals halt execution", async () => {
  const owner = await harness.createUser({ email: "approval-edge@test.local" });
  await harness.createWorkspace({ owner, name: "Approval Edge Workspace" });

  const doubleRiskItem = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "recruiters",
      workflowType: "interview_coordination",
      title: "Two-step risky recruiter workflow",
      sourceType: "email",
      payload: {
        candidateEmail: "candidate@test.local",
        candidateName: "Candidate Risk",
      },
    }),
    executionPlan: [
      { id: "send_outreach", label: "Send outreach email", channel: "email", requiresApproval: true, status: "pending" },
      { id: "schedule_interview", label: "Coordinate interview slots", channel: "calendar", requiresApproval: true, status: "pending" },
    ],
    actionLogs: [
      { actionId: "send_outreach", label: "Send outreach email", channel: "email", status: "pending", requiresApproval: true, attemptCount: 0 },
      { actionId: "schedule_interview", label: "Coordinate interview slots", channel: "calendar", status: "pending", requiresApproval: true, attemptCount: 0 },
    ],
  });

  const firstExecute = await post(`/api/workflows/items/${doubleRiskItem._id}/execute`, owner, {});
  assert.equal(firstExecute.status, 200);
  assert.equal(firstExecute.body.status, "awaiting_approval");

  const firstApproval = await post(`/api/workflows/items/${doubleRiskItem._id}/approve`, owner, {
    decision: "approve",
  });
  assert.equal(firstApproval.status, 200);
  const refreshedAfterFirst = await harness.ExecutionItem.findById(doubleRiskItem._id);
  const secondApproval = await ActionApproval.findById(refreshedAfterFirst.approvalId);
  assert(secondApproval);
  assert.equal(secondApproval.actionId, "schedule_interview");
  assert.equal(refreshedAfterFirst.actionLogs.find((entry) => entry.actionId === "send_outreach").status, "executed");
  assert.equal(refreshedAfterFirst.actionLogs.find((entry) => entry.actionId === "schedule_interview").status, "awaiting_approval");

  const rejectItem = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "agencies",
      workflowType: "brief_to_deliverables",
      title: "Reject this client update",
      sourceType: "email",
      payload: {
        clientEmail: "client@test.local",
        clientName: "Blocked Client",
      },
    }),
    executionPlan: [
      { id: "send_status", label: "Send client status update", channel: "email", requiresApproval: true, status: "pending" },
    ],
    actionLogs: [
      { actionId: "send_status", label: "Send client status update", channel: "email", status: "pending", requiresApproval: true, attemptCount: 0 },
    ],
  });

  await post(`/api/workflows/items/${rejectItem._id}/execute`, owner, {});
  const rejected = await post(`/api/workflows/items/${rejectItem._id}/approve`, owner, {
    decision: "reject",
    comment: "Not safe to send.",
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.status, "blocked");
  assert.equal(rejected.body.actionLogs[0].status, "cancelled");

  const blockedExecute = await post(`/api/workflows/items/${rejectItem._id}/execute`, owner, {});
  assert.equal(blockedExecute.status, 409);
});

test("cancel marks pending approvals cancelled and execute rejects invalid terminal states", async () => {
  const owner = await harness.createUser({ email: "cancel-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Cancel Workspace" });

  const item = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "agencies",
      workflowType: "brief_to_deliverables",
      title: "Cancel pending approval item",
      sourceType: "email",
      payload: {
        clientEmail: "client@test.local",
      },
    }),
    status: "awaiting_approval",
    approvalRequired: true,
    approvalStatus: "pending",
    executionPlan: [
      { id: "send_status", label: "Send client status update", channel: "email", requiresApproval: true, status: "pending" },
    ],
    actionLogs: [
      { actionId: "send_status", label: "Send client status update", channel: "email", status: "awaiting_approval", requiresApproval: true, attemptCount: 0 },
    ],
  });

  const approval = await ActionApproval.create({
    workspaceId: owner.defaultWorkspaceId,
    executionItemId: item._id,
    requestedBy: owner._id,
    audienceType: "agencies",
    workflowType: "brief_to_deliverables",
    actionId: "send_status",
    actionLabel: "Send client status update",
    channel: "email",
    reason: "Needs approval",
  });

  item.approvalId = approval._id;
  await item.save();

  const cancelResponse = await post(`/api/workflows/items/${item._id}/control`, owner, { action: "cancel" });
  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.body.status, "cancelled");
  assert(cancelResponse.body.actionLogs.every((entry) => ["cancelled", "done", "failed", "skipped"].includes(entry.status)));

  const cancelledApproval = await ActionApproval.findById(approval._id);
  assert.equal(cancelledApproval.status, "cancelled");

  const executeCancelled = await post(`/api/workflows/items/${item._id}/execute`, owner, {});
  assert.equal(executeCancelled.status, 409);
});

test("background workflow jobs execute due work, escalate overdue follow-ups, and never bypass approval", async () => {
  const owner = await harness.createUser({ email: "worker-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Worker Workspace" });

  const overdue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const dueItem = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "realestate",
      workflowType: "lead_followup",
      title: "Due real estate follow-up",
      sourceType: "email",
      payload: {
        leadEmail: "lead@test.local",
        leadName: "Lead Due",
      },
    }),
    status: "scheduled",
    executionPlan: [
      { id: "send_sequence_followup", label: "Send lead sequence follow-up", channel: "email", status: "waiting", scheduledFor: overdue },
    ],
    actionLogs: [
      {
        actionId: "send_sequence_followup",
        label: "Send lead sequence follow-up",
        channel: "email",
        status: "scheduled",
        scheduledFor: overdue,
        attemptCount: 0,
      },
    ],
    followUp: {
      active: true,
      cadenceStep: 2,
      nextRunAt: overdue,
      attempts: 1,
      maxAttempts: 3,
      stopReason: "",
      escalated: false,
    },
  });

  const approvalGated = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "recruiters",
      workflowType: "candidate_outreach",
      title: "Due approval-gated outreach",
      sourceType: "email",
      payload: {
        candidateEmail: "approval@test.local",
        candidateName: "Approval Gate",
      },
    }),
    status: "scheduled",
    executionPlan: [
      { id: "send_outreach", label: "Send outreach email", channel: "email", requiresApproval: true, status: "waiting", scheduledFor: overdue },
    ],
    actionLogs: [
      {
        actionId: "send_outreach",
        label: "Send outreach email",
        channel: "email",
        status: "scheduled",
        scheduledFor: overdue,
        requiresApproval: true,
        attemptCount: 0,
      },
    ],
    followUp: {
      active: true,
      cadenceStep: 1,
      nextRunAt: overdue,
      attempts: 0,
      maxAttempts: 3,
      stopReason: "",
      escalated: false,
    },
  });

  const pausedItem = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "startups",
      workflowType: "thread_breakdown",
      title: "Paused item should not run",
      sourceType: "slack",
    }),
    status: "paused",
    executionPlan: [
      { id: "post_status_slack", label: "Post status update to Slack", channel: "slack", status: "waiting", scheduledFor: overdue },
    ],
    actionLogs: [
      { actionId: "post_status_slack", label: "Post status update to Slack", channel: "slack", status: "scheduled", scheduledFor: overdue, attemptCount: 0 },
    ],
    followUp: {
      active: false,
      cadenceStep: 1,
      nextRunAt: overdue,
      attempts: 1,
      maxAttempts: 3,
      stopReason: "paused",
      escalated: false,
    },
  });

  const jobResult = await processDueWorkflowJobs({ now: new Date(), limit: 10 });
  assert.equal(jobResult.executed >= 2, true);
  assert.equal(jobResult.escalated >= 1, true);

  const refreshedDueItem = await harness.ExecutionItem.findById(dueItem._id);
  assert(refreshedDueItem.auditTrail.some((entry) => entry.type === "executed"));
  assert.equal(refreshedDueItem.followUp.escalated, true);
  assert(refreshedDueItem.auditTrail.some((entry) => entry.type === "escalated"));

  const refreshedApprovalGated = await harness.ExecutionItem.findById(approvalGated._id);
  assert.equal(refreshedApprovalGated.status, "awaiting_approval");
  assert.equal(refreshedApprovalGated.actionLogs[0].status, "awaiting_approval");

  const refreshedPaused = await harness.ExecutionItem.findById(pausedItem._id);
  assert.equal(refreshedPaused.actionLogs[0].status, "scheduled");
});

test("integration fallback stays explicit for GitHub and Google Calendar execution", async () => {
  const owner = await harness.createUser({ email: "connector-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Connector Workspace" });

  const githubItem = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "startups",
      workflowType: "spec_handoff",
      title: "GitHub fallback item",
      sourceType: "slack",
    }),
    executionPlan: [
      { id: "create_github_issue", label: "Create GitHub issue", channel: "github", requiresApproval: true, status: "pending" },
    ],
    actionLogs: [
      { actionId: "create_github_issue", label: "Create GitHub issue", channel: "github", status: "pending", requiresApproval: true, attemptCount: 0 },
    ],
  });

  await post(`/api/workflows/items/${githubItem._id}/execute`, owner, {});
  const githubApprove = await post(`/api/workflows/items/${githubItem._id}/approve`, owner, {
    decision: "approve",
  });
  assert.equal(githubApprove.status, 200);
  assert.equal(githubApprove.body.actionLogs[0].status, "failed");
  assert.match(githubApprove.body.actionLogs[0].reason, /GitHub access token|repo mapping/i);
  assert.equal(githubApprove.body.syncLogs[0].provider, "github");
  assert.equal(githubApprove.body.syncLogs[0].status, "awaiting_connector");

  const calendarItem = await harness.ExecutionItem.create({
    ...buildBaseItem({
      workspaceId: owner.defaultWorkspaceId,
      user: owner,
      audienceType: "recruiters",
      workflowType: "interview_coordination",
      title: "Calendar fallback item",
      sourceType: "email",
      payload: {
        candidateEmail: "calendar@test.local",
      },
    }),
    executionPlan: [
      { id: "schedule_interview", label: "Coordinate interview slots", channel: "calendar", requiresApproval: true, status: "pending" },
    ],
    actionLogs: [
      { actionId: "schedule_interview", label: "Coordinate interview slots", channel: "calendar", status: "pending", requiresApproval: true, attemptCount: 0 },
    ],
  });

  await post(`/api/workflows/items/${calendarItem._id}/execute`, owner, {});
  const calendarApprove = await post(`/api/workflows/items/${calendarItem._id}/approve`, owner, {
    decision: "approve",
  });
  assert.equal(calendarApprove.status, 200);
  assert.equal(calendarApprove.body.actionLogs[0].status, "failed");
  assert.match(calendarApprove.body.actionLogs[0].reason, /Google Calendar/i);
  assert.equal(calendarApprove.body.syncLogs[0].provider, "google_calendar");
  assert.equal(calendarApprove.body.syncLogs[0].status, "awaiting_connector");
});
