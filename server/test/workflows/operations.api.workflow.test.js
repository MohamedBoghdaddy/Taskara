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

test("ops endpoints persist first-user simulation findings and launch criteria", async () => {
  const harness = await createHarness();
  try {
    const owner = await harness.createUser({ email: "owner-launch@test.local" });
    await harness.createWorkspace({ owner });

    const firstUsers = await harness.request("/api/ops/first-users/users_1_3", {
      method: "POST",
      headers: harness.authHeadersFor(owner),
      body: {
        sessionCount: 2,
        timeToFirstSuccessMinutes: 14,
        trustAutoSend: "hesitant",
        confusionPoints: ["Did not understand why approval was required"],
        failedFirstRunMoments: ["Stopped at integrations screen"],
        notes: "Needed coaching on the first workflow.",
      },
    });
    assert.strictEqual(firstUsers.status, 200);
    assert.strictEqual(firstUsers.body.firstUsers.find((entry) => entry.key === "users_1_3").trustAutoSend, "hesitant");

    const launchCriterion = await harness.request("/api/ops/launch-criteria/trust", {
      method: "POST",
      headers: harness.authHeadersFor(owner),
      body: {
        status: "at_risk",
        notes: "Users still hesitate before allowing automatic sends.",
      },
    });
    assert.strictEqual(launchCriterion.status, 200);
    assert.strictEqual(launchCriterion.body.launchCriteria.trust.status, "at_risk");

    const overview = await harness.request("/api/ops/overview", {
      headers: harness.authHeadersFor(owner),
    });
    assert.strictEqual(overview.status, 200);
    assert.ok(Array.isArray(overview.body.firstUsers));
    assert.strictEqual(overview.body.launchCriteria.trust.status, "at_risk");
    assert.ok(Array.isArray(overview.body.launchStatus.warnings));
  } finally {
    await harness.close();
  }
});
