const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const mongoose = require("mongoose");

const { processDueWorkflowJobs } = require("../../src/services/workflows/jobService");
const { createHarness } = require("../helpers/workflowTestHarness");

let harness;

const get = (path, user) =>
  harness.request(path, {
    method: "GET",
    headers: user ? harness.authHeadersFor(user) : {},
  });

const post = (path, user, body) =>
  harness.request(path, {
    method: "POST",
    headers: user ? harness.authHeadersFor(user) : {},
    body,
  });

const buildAssignee = (user, role = "owner") => ({
  userId: user._id,
  name: user.name,
  email: user.email,
  reason: `Assigned to ${user.name} for production-hardening coverage.`,
  teamRole: role,
  routingRole: role,
  loadSnapshot: 0,
  manualOverride: false,
  assignedAt: new Date(),
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

test("integration readiness endpoint redacts secrets and distinguishes connected from ready", async () => {
  const owner = await harness.createUser({ email: "integration-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Integration Readiness" });

  await harness.createIntegration({
    workspaceId: owner.defaultWorkspaceId,
    connectedBy: owner._id,
    provider: "github",
    config: {
      github: {
        accessToken: "ghp_super_secret_token",
        repos: [{ owner: "taskara", repo: "platform" }],
        syncDirection: "both",
      },
    },
  });

  await harness.createIntegration({
    workspaceId: owner.defaultWorkspaceId,
    connectedBy: owner._id,
    provider: "slack",
    config: {
      slack: {
        webhookUrl: "https://hooks.slack.com/services/T000/B000/secret",
        defaultChannel: "",
      },
    },
  });

  const response = await get("/api/integrations/connected", owner);
  assert.equal(response.status, 200);

  const githubProvider = response.body.providers.find((entry) => entry.provider === "github");
  const slackProvider = response.body.providers.find((entry) => entry.provider === "slack");
  assert(githubProvider);
  assert(slackProvider);
  assert.equal(githubProvider.connected, true);
  assert.equal(githubProvider.ready, true);
  assert.equal(githubProvider.writebackReady, true);
  assert.equal(githubProvider.settings.github.accessToken, "[configured]");
  assert.equal(slackProvider.connected, true);
  assert.equal(slackProvider.ready, true);
  assert.equal(slackProvider.settings.slack.webhookUrl, "[configured]");
  assert.equal(JSON.stringify(response.body).includes("ghp_super_secret_token"), false);
  assert.equal(JSON.stringify(response.body).includes("hooks.slack.com"), false);
});

test("public WhatsApp webhook verification only accepts stored verify tokens", async () => {
  const owner = await harness.createUser({ email: "wa-owner@test.local" });
  await harness.createWorkspace({ owner, name: "WhatsApp Webhook" });

  await harness.createIntegration({
    workspaceId: owner.defaultWorkspaceId,
    connectedBy: owner._id,
    provider: "whatsapp",
    config: {
      whatsapp: {
        accessToken: "wa-secret",
        phoneNumberId: "123456789",
        webhookVerifyToken: "taskara-verify-me",
      },
    },
  });

  const rejected = await harness.request(
    "/api/integrations/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=42",
  );
  assert.equal(rejected.status, 403);

  const accepted = await harness.request(
    "/api/integrations/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=taskara-verify-me&hub.challenge=42",
  );
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body, 42);
});

test("integration writeback routes are workspace-scoped and cannot export another tenant's task", async () => {
  const ownerA = await harness.createUser({ email: "workspace-a@test.local" });
  const ownerB = await harness.createUser({ email: "workspace-b@test.local" });

  await harness.createWorkspace({ owner: ownerA, name: "Workspace A" });
  await harness.createWorkspace({ owner: ownerB, name: "Workspace B" });

  await harness.createIntegration({
    workspaceId: ownerA.defaultWorkspaceId,
    connectedBy: ownerA._id,
    provider: "github",
    config: {
      github: {
        accessToken: "ghp_ready_token",
        repos: [{ owner: "taskara", repo: "platform" }],
        syncDirection: "both",
      },
    },
  });

  const foreignTask = await harness.Task.create({
    workspaceId: ownerB.defaultWorkspaceId,
    createdBy: ownerB._id,
    title: "Foreign workspace task",
    status: "todo",
    priority: "medium",
  });

  const response = await post(`/api/integrations/github/export/${foreignTask._id}`, ownerA, {
    owner: "taskara",
    repo: "platform",
  });
  assert.equal(response.status, 404);
  assert.match(response.body.error, /task not found/i);
});

test("workflow worker records observable claim and completion state for due work", async () => {
  const owner = await harness.createUser({ email: "worker-observer@test.local" });
  await harness.createWorkspace({ owner, name: "Worker Observability" });

  const overdue = new Date(Date.now() - 30 * 60 * 1000);
  const item = await harness.ExecutionItem.create({
    workspaceId: owner.defaultWorkspaceId,
    createdBy: owner._id,
    title: "Observed follow-up",
    description: "Due real-estate follow-up for worker observability.",
    workflowType: "lead_followup",
    audienceType: "realestate",
    sourceType: "email",
    sourceRef: {
      externalId: `obs-${new mongoose.Types.ObjectId()}`,
      connector: "workflow_test",
      label: "Observed follow-up",
    },
    sourceFingerprint: String(new mongoose.Types.ObjectId()),
    sourceContext: {
      title: "Observed follow-up",
      excerpt: "Lead needs a response.",
      rawText: "Lead needs a response.",
      payload: {
        leadEmail: "lead.observe@test.local",
        leadName: "Observed Lead",
      },
    },
    groupKey: `lead-${new mongoose.Types.ObjectId()}`,
    groupLabel: "Observed Lead",
    assignee: buildAssignee(owner),
    status: "scheduled",
    priority: "high",
    approvalRequired: false,
    approvalStatus: "not_required",
    createdByAI: true,
    executionPlan: [
      {
        id: "send_sequence_followup",
        label: "Send lead sequence follow-up",
        channel: "email",
        status: "waiting",
        scheduledFor: overdue,
      },
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
    auditTrail: [],
    syncLogs: [],
  });

  const result = await processDueWorkflowJobs({
    now: new Date(),
    limit: 10,
    jobId: "workflow-observability-job",
  });

  assert.equal(result.picked >= 1, true);

  const refreshed = await harness.ExecutionItem.findById(item._id);
  assert.equal(refreshed.workerState.lockId, "");
  assert.equal(refreshed.workerState.lockExpiresAt, null);
  assert.equal(refreshed.workerState.attemptCount, 1);
  assert.equal(Boolean(refreshed.workerState.lastPickedAt), true);
  assert.equal(Boolean(refreshed.workerState.lastFinishedAt), true);
  assert.equal(["executed", "retry_scheduled"].includes(refreshed.workerState.lastOutcome), true);
  assert(refreshed.auditTrail.some((entry) => entry.message.includes("Workflow worker picked up a due action")));
  assert(
    refreshed.auditTrail.some(
      (entry) =>
        entry.metadata?.correlationId?.startsWith("workflow-observability-job") &&
        entry.message.includes("Workflow worker"),
    ),
  );
});
