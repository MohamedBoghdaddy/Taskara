const test = require("node:test");
const assert = require("assert");

const { createHarness } = require("../helpers/workflowTestHarness");

test("ops overview requires owner/admin while onboarding stays available to editors", async () => {
  const harness = await createHarness();
  try {
    const owner = await harness.createUser({ email: "owner-ops@test.local" });
    const editor = await harness.createUser({ email: "editor-ops@test.local" });
    await harness.createWorkspace({
      owner,
      members: [{ user: editor, role: "editor", setDefaultWorkspace: true }],
    });

    const ownerOverview = await harness.request("/api/ops/overview", {
      headers: harness.authHeadersFor(owner),
    });
    assert.strictEqual(ownerOverview.status, 200);
    assert.ok(ownerOverview.body.launchStatus);

    const editorOverview = await harness.request("/api/ops/overview", {
      headers: harness.authHeadersFor(editor),
    });
    assert.strictEqual(editorOverview.status, 403);

    const editorOnboarding = await harness.request("/api/ops/onboarding", {
      headers: harness.authHeadersFor(editor),
    });
    assert.strictEqual(editorOnboarding.status, 200);
    assert.strictEqual(editorOnboarding.body.onboarding.currentStep, 1);

    const selectAudience = await harness.request("/api/ops/onboarding/select-audience", {
      method: "POST",
      headers: harness.authHeadersFor(editor),
      body: { audienceType: "startups" },
    });
    assert.strictEqual(selectAudience.status, 200);
    assert.strictEqual(selectAudience.body.onboarding.audienceType, "startups");
  } finally {
    await harness.close();
  }
});

test("ops endpoints run guided onboarding, workflow verification, and connector checks", async () => {
  const harness = await createHarness();
  try {
    const owner = await harness.createUser({ email: "owner-verify@test.local" });
    const workspace = await harness.createWorkspace({ owner });

    const onboardingRun = await harness.request("/api/ops/onboarding/run-demo", {
      method: "POST",
      headers: harness.authHeadersFor(owner),
      body: { audienceType: "startups" },
    });
    assert.strictEqual(onboardingRun.status, 200);
    assert.ok(Array.isArray(onboardingRun.body.items));
    assert.ok(onboardingRun.body.onboarding.currentStep >= 4);

    const workflowTest = await harness.request("/api/ops/workflow-tests/startups/run", {
      method: "POST",
      headers: harness.authHeadersFor(owner),
    });
    assert.strictEqual(workflowTest.status, 200);
    assert.ok(["passed", "warning"].includes(workflowTest.body.result.status));

    const connectorTest = await harness.request("/api/ops/connectors/email/test", {
      method: "POST",
      headers: harness.authHeadersFor(owner),
    });
    assert.strictEqual(connectorTest.status, 200);
    assert.strictEqual(connectorTest.body.result.passed, true);

    const state = await harness.WorkspaceOperationalState.findOne({ workspaceId: workspace._id });
    assert.ok(state);
    assert.ok(state.workflowTests.some((entry) => entry.key === "startups"));
    assert.ok(state.connectorTests.some((entry) => entry.key === "email"));
  } finally {
    await harness.close();
  }
});
