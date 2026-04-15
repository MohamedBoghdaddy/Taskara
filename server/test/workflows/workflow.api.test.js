const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");

const ActionApproval = require("../../src/models/ActionApproval");
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
    headers: user ? harness.authHeadersFor(user) : {},
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

test("workflow templates stay public while protected routes require auth and workspace context", async () => {
  const publicResponse = await harness.request("/api/workflows/templates/public");
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.body.templates.length, 4);
  assert.equal("actionCatalog" in publicResponse.body.templates[0], false);

  const protectedResponse = await harness.request("/api/workflows/dashboard");
  assert.equal(protectedResponse.status, 401);

  const user = await harness.createUser({ email: "no-workspace@test.local" });
  const missingWorkspace = await get("/api/workflows/dashboard?audienceType=startups", user);
  assert.equal(missingWorkspace.status, 400);
  assert.match(missingWorkspace.body.error, /workspaceId is required/i);
});

test("workflow mutation routes require authentication", async () => {
  const owner = await harness.createUser({ email: "auth-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Auth Workspace" });

  const ingestResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "recruiters",
    sourceType: "email",
    workflowType: "candidate_outreach",
    title: "Auth coverage",
    text: "Email Linus about the role.",
    payload: {
      candidateEmail: "linus@test.local",
    },
    autoExecute: false,
  });
  const itemId = ingestResponse.body.items[0]._id;

  const executeNoAuth = await harness.request(`/api/workflows/items/${itemId}/execute`, {
    method: "POST",
    body: { force: false },
  });
  assert.equal(executeNoAuth.status, 401);

  const approveNoAuth = await harness.request(`/api/workflows/items/${itemId}/approve`, {
    method: "POST",
    body: { decision: "approve" },
  });
  assert.equal(approveNoAuth.status, 401);

  const controlNoAuth = await harness.request(`/api/workflows/items/${itemId}/control`, {
    method: "POST",
    body: { action: "pause" },
  });
  assert.equal(controlNoAuth.status, 401);
});

test("workflow routes enforce workspace isolation, membership, and role boundaries", async () => {
  const owner = await harness.createUser({ email: "owner-a@test.local" });
  const editor = await harness.createUser({ email: "editor-a@test.local" });
  const viewer = await harness.createUser({ email: "viewer-a@test.local" });
  const outsider = await harness.createUser({ email: "owner-b@test.local" });
  const platformAdmin = await harness.createUser({ email: "platform-admin@test.local" });

  const workspace = await harness.createWorkspace({
    owner,
    name: "Workspace A",
    members: [
      {
        user: editor,
        role: "editor",
        setDefaultWorkspace: true,
        routingProfile: {
          title: "Execution lead",
          routingTags: ["thread", "issue"],
          audienceTypes: ["startups"],
          capacityWeight: 1.2,
        },
      },
      {
        user: viewer,
        role: "viewer",
        setDefaultWorkspace: true,
      },
    ],
  });

  const otherWorkspace = await harness.createWorkspace({
    owner: outsider,
    name: "Workspace B",
    setOwnerDefaultWorkspace: false,
  });
  await harness.createIntegration({
    workspaceId: otherWorkspace._id,
    connectedBy: outsider._id,
    provider: "github",
    config: {
      github: {
        accessToken: "secret",
        repos: [{ owner: "other", repo: "workspace" }],
        syncDirection: "both",
      },
    },
  });

  const ingestResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "startups",
    sourceType: "slack",
    workflowType: "thread_breakdown",
    title: "Launch retrospective thread",
    text: "Slack thread about launch bugs, owners, and next actions.",
    payload: {
      initiativeTitle: "Launch Reliability",
      threadUrl: "https://slack.test/thread/launch",
    },
    autoExecute: false,
  });
  assert.equal(ingestResponse.status, 201);
  const itemId = ingestResponse.body.items[0]._id;

  const outsiderDashboard = await harness.request(`/api/workflows/dashboard?workspaceId=${workspace._id}`, {
    method: "GET",
    headers: harness.authHeadersFor(outsider),
  });
  assert.equal(outsiderDashboard.status, 403);

  const viewerDashboard = await get("/api/workflows/dashboard?audienceType=startups", viewer);
  assert.equal(viewerDashboard.status, 200);
  const githubCoverage = viewerDashboard.body.integrationCoverage.find((entry) => entry.provider === "github");
  assert.equal(githubCoverage.connected, false);

  const viewerIngest = await post("/api/workflows/ingest", viewer, {
    audienceType: "startups",
    sourceType: "slack",
    title: "Viewer should not ingest",
    text: "This should be rejected.",
  });
  assert.equal(viewerIngest.status, 403);

  const selfClaim = await post(`/api/workflows/items/${itemId}/assign`, editor, {
    assigneeId: String(editor._id),
  });
  assert.equal(selfClaim.status, 200);
  assert.equal(String(selfClaim.body.assignee.userId), String(editor._id));
  assert.equal(selfClaim.body.assignee.manualOverride, true);
  assert.match(selfClaim.body.assignee.reason, /manually/i);

  const invalidReassign = await post(`/api/workflows/items/${itemId}/assign`, editor, {
    assigneeId: String(owner._id),
  });
  assert.equal(invalidReassign.status, 403);

  const platformDashboard = await harness.request(`/api/workflows/dashboard?workspaceId=${workspace._id}`, {
    method: "GET",
    headers: harness.authHeadersFor(platformAdmin),
  });
  assert.equal(platformDashboard.status, 200);
});

test("workflow API validates ingest and migration preview inputs safely", async () => {
  const owner = await harness.createUser({ email: "input-owner@test.local" });
  const workspace = await harness.createWorkspace({ owner, name: "Input Safety" });

  const missingSource = await post("/api/workflows/ingest", owner, {
    audienceType: "startups",
    title: "Missing source",
    text: "This should fail.",
  });
  assert.equal(missingSource.status, 400);
  assert.match(missingSource.body.error, /sourceType is required/i);

  const invalidWorkflowType = await post("/api/workflows/ingest", owner, {
    audienceType: "recruiters",
    sourceType: "email",
    workflowType: "not_real",
    title: "Invalid workflow",
    text: "Candidate outreach",
  });
  assert.equal(invalidWorkflowType.status, 400);
  assert.match(invalidWorkflowType.body.error, /unknown workflow type/i);

  const unsupportedSourceType = await post("/api/workflows/ingest", owner, {
    audienceType: "agencies",
    sourceType: "github",
    title: "Wrong source",
    text: "Client update",
  });
  assert.equal(unsupportedSourceType.status, 400);
  assert.match(unsupportedSourceType.body.error, /unsupported sourceType/i);

  const invalidPreview = await post("/api/workflows/migration/preview", owner, {
    audienceType: "unknown-audience",
    sourceSystem: "legacy",
    fields: ["owner"],
  });
  assert.equal(invalidPreview.status, 400);

  const preview = await post("/api/workflows/migration/preview", owner, {
    audienceType: "agencies",
    sourceSystem: "legacy-pm",
    fields: ["account", "deliverable", "mystery_field", "random_custom"],
    workspaceId: String(workspace._id),
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.validation.readyToImport, false);
  assert.deepEqual(preview.body.validation.unsupportedFields, ["mystery_field", "random_custom"]);
  assert.deepEqual(preview.body.validation.unknownFields, ["mystery_field", "random_custom"]);
});

test("recruiter workflow smoke test runs through ingest, approval, execution, and ATS fallback", async () => {
  const owner = await harness.createUser({ email: "recruiter-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Recruiter Workspace" });

  const ingestResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "recruiters",
    sourceType: "email",
    workflowType: "candidate_outreach",
    title: "Backend candidate outreach",
    text: "Reach out to Ada Lovelace about the backend platform role this week.",
    payload: {
      candidateName: "Ada Lovelace",
      candidateEmail: "ada.lovelace@test.local",
      roleTitle: "Senior Backend Engineer",
    },
    autoExecute: false,
  });

  assert.equal(ingestResponse.status, 201);
  const item = ingestResponse.body.items[0];
  assert.equal(item.audienceType, "recruiters");

  const executeResponse = await post(`/api/workflows/items/${item._id}/execute`, owner, { force: true });
  assert.equal(executeResponse.status, 200);
  assert.equal(executeResponse.body.status, "awaiting_approval");
  assert.equal(executeResponse.body.approvalStatus, "pending");

  const approveResponse = await post(`/api/workflows/items/${item._id}/approve`, owner, {
    decision: "approve",
    comment: "Looks good to send.",
  });
  assert.equal(approveResponse.status, 200);
  const sendOutreachLog = approveResponse.body.actionLogs.find((entry) => entry.actionId === "send_outreach");
  const updateStageLog = approveResponse.body.actionLogs.find((entry) => entry.actionId === "update_stage");
  assert.equal(sendOutreachLog.status, "executed");
  assert.equal(updateStageLog.status, "failed");
  assert.match(updateStageLog.reason, /ATS sync remains protected/i);

  const candidate = await harness.Candidate.findOne({ email: "ada.lovelace@test.local" });
  assert(candidate);
  assert.equal(candidate.currentStage, "contacted");
});

test("startup workflow smoke test creates linked tasks, supports assignment, and fails Slack safely", async () => {
  const owner = await harness.createUser({ email: "startup-owner@test.local" });
  const editor = await harness.createUser({ email: "startup-editor@test.local" });
  await harness.createWorkspace({
    owner,
    name: "Startup Workspace",
    members: [
      {
        user: editor,
        role: "editor",
        setDefaultWorkspace: true,
        routingProfile: {
          title: "Product engineer",
          routingTags: ["thread", "issue", "status"],
          audienceTypes: ["startups"],
          capacityWeight: 1.1,
        },
      },
    ],
  });

  const ingestResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "startups",
    sourceType: "slack",
    workflowType: "thread_breakdown",
    title: "Launch issue routing",
    text: "Slack thread about bug triage, owner assignment, and status updates back to product.",
    payload: {
      initiativeTitle: "Launch Stabilization",
      threadUrl: "https://slack.test/thread/launch-stabilization",
      ownerName: editor.name,
    },
    autoExecute: false,
  });

  assert.equal(ingestResponse.status, 201);
  const item = ingestResponse.body.items[0];
  assert(item.linkedTaskId);

  const selfClaim = await post(`/api/workflows/items/${item._id}/assign`, editor, {
    assigneeId: String(editor._id),
  });
  assert.equal(selfClaim.status, 200);

  const executeResponse = await post(`/api/workflows/items/${item._id}/execute`, owner, { force: true });
  assert.equal(executeResponse.status, 200);
  const assignOwnerLog = executeResponse.body.actionLogs.find((entry) => entry.actionId === "assign_owner");
  const slackLog = executeResponse.body.actionLogs.find((entry) => entry.actionId === "post_status_slack");
  assert.equal(assignOwnerLog.status, "executed");
  assert.equal(slackLog.status, "failed");
  assert.match(slackLog.reason, /Slack webhook is missing/i);

  const linkedTask = await harness.Task.findById(item.linkedTaskId);
  assert(linkedTask);
  assert.equal(String(linkedTask.assigneeIds[0]), String(editor._id));

  const initiative = await harness.StartupInitiative.findOne({ workspaceId: owner.defaultWorkspaceId });
  assert(initiative);
  assert.equal(String(initiative.ownerId), String(editor._id));
});

test("agency workflow smoke test creates deliverables, approval queues, and client update execution", async () => {
  const owner = await harness.createUser({ email: "agency-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Agency Workspace" });

  const briefResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "agencies",
    sourceType: "client_brief",
    workflowType: "brief_to_deliverables",
    title: "Q2 launch brief",
    text: "Create launch deck\nPrepare paid social variants\nSend weekly client update",
    payload: {
      clientName: "Northwind",
      clientEmail: "client@northwind.test",
    },
    autoExecute: false,
  });
  assert.equal(briefResponse.status, 201);
  const briefItem = briefResponse.body.items[0];

  const executeBrief = await post(`/api/workflows/items/${briefItem._id}/execute`, owner, { force: true });
  assert.equal(executeBrief.status, 200);
  assert.equal(executeBrief.body.status, "awaiting_approval");
  assert.equal(executeBrief.body.approvalStatus, "pending");

  const account = await harness.AgencyAccount.findOne({ workspaceId: owner.defaultWorkspaceId });
  assert(account);
  assert(account.deliverables.length >= 2);

  const approveBrief = await post(`/api/workflows/items/${briefItem._id}/approve`, owner, {
    decision: "approve",
  });
  assert.equal(approveBrief.status, 200);
  const sendStatusLog = approveBrief.body.actionLogs.find((entry) => entry.actionId === "send_status");
  assert.equal(sendStatusLog.status, "executed");

  const approvalChase = await post("/api/workflows/ingest", owner, {
    audienceType: "agencies",
    sourceType: "email",
    workflowType: "approval_chase",
    title: "Approval chase",
    text: "Client has not approved the campaign landing page mockups.",
    payload: {
      clientName: "Northwind",
      clientEmail: "client@northwind.test",
    },
    autoExecute: false,
  });
  assert.equal(approvalChase.status, 201);

  const chaseExecute = await post(`/api/workflows/items/${approvalChase.body.items[0]._id}/execute`, owner, {});
  assert.equal(chaseExecute.status, 200);
  const chaseApprovalLog = chaseExecute.body.actionLogs.find((entry) => entry.actionId === "chase_approval");
  assert.equal(chaseApprovalLog.status, "executed");
});

test("real estate workflow smoke test covers follow-up, document chase, and milestone update visibility", async () => {
  const owner = await harness.createUser({ email: "realestate-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Real Estate Workspace" });

  const followUpResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "realestate",
    sourceType: "lead_form",
    workflowType: "lead_followup",
    title: "New website lead",
    text: "Lead wants a 3-bedroom listing and needs a response today.",
    payload: {
      leadName: "Maya Hassan",
      leadEmail: "maya.hassan@test.local",
      leadPhone: "+201001234567",
    },
    autoExecute: false,
  });
  assert.equal(followUpResponse.status, 201);

  const followUpItem = followUpResponse.body.items[0];
  const executeFollowUp = await post(`/api/workflows/items/${followUpItem._id}/execute`, owner, {});
  assert.equal(executeFollowUp.status, 200);
  const initialFollowUpLog = executeFollowUp.body.actionLogs.find((entry) => entry.actionId === "send_initial_followup");
  const milestoneLog = executeFollowUp.body.actionLogs.find((entry) => entry.actionId === "update_stage");
  assert.equal(initialFollowUpLog.status, "executed");
  assert.equal(milestoneLog.status, "failed");
  assert.match(milestoneLog.reason, /CRM sync remains protected/i);

  const documentResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "realestate",
    sourceType: "email",
    workflowType: "document_chase",
    title: "Missing deal docs",
    text: "Need ID document and proof of funds before moving the deal forward.",
    payload: {
      leadName: "Maya Hassan",
      leadEmail: "maya.hassan@test.local",
      leadPhone: "+201001234567",
    },
    autoExecute: false,
  });
  assert.equal(documentResponse.status, 201);
  const documentItem = documentResponse.body.items[0];

  const executeDocuments = await post(`/api/workflows/items/${documentItem._id}/execute`, owner, {});
  assert.equal(executeDocuments.status, 200);
  const requestDocsLog = executeDocuments.body.actionLogs.find((entry) => entry.actionId === "request_docs");
  assert.equal(requestDocsLog.status, "executed");

  const checklist = await harness.DocumentChecklist.findOne({ workspaceId: owner.defaultWorkspaceId });
  assert(checklist);
  assert(checklist.items.some((entry) => entry.status === "requested"));

  const lead = await harness.RealEstateLead.findOne({ email: "maya.hassan@test.local" });
  assert(lead);
  assert.equal(lead.currentStage, "under_contract");
});

test("duplicate ingest returns the original workflow run instead of creating broken duplicates", async () => {
  const owner = await harness.createUser({ email: "duplicate-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Duplicate Safety" });

  const payload = {
    audienceType: "startups",
    sourceType: "slack",
    workflowType: "thread_breakdown",
    title: "Repeated thread",
    text: "Slack thread about a launch checklist and next steps.",
    payload: {
      initiativeTitle: "Repeated Launch",
      threadUrl: "https://slack.test/thread/repeated",
    },
    autoExecute: false,
  };

  const first = await post("/api/workflows/ingest", owner, payload);
  const second = await post("/api/workflows/ingest", owner, payload);

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(second.body.items.length, first.body.items.length);

  const runs = await harness.WorkflowRun.find({ workspaceId: owner.defaultWorkspaceId });
  assert.equal(runs.length, 1);
});

test("approval decisions validate input and non-existent item access fails safely", async () => {
  const owner = await harness.createUser({ email: "approve-owner@test.local" });
  await harness.createWorkspace({ owner, name: "Approval Safety" });

  const ingestResponse = await post("/api/workflows/ingest", owner, {
    audienceType: "recruiters",
    sourceType: "email",
    workflowType: "candidate_outreach",
    title: "Pending approval",
    text: "Email Grace Hopper about the principal engineer opening.",
    payload: {
      candidateName: "Grace Hopper",
      candidateEmail: "grace.hopper@test.local",
    },
    autoExecute: false,
  });

  const itemId = ingestResponse.body.items[0]._id;
  await post(`/api/workflows/items/${itemId}/execute`, owner, {});

  const invalidDecision = await post(`/api/workflows/items/${itemId}/approve`, owner, {
    decision: "maybe",
  });
  assert.equal(invalidDecision.status, 400);

  const missingExecute = await post(`/api/workflows/items/000000000000000000000000/execute`, owner, {});
  assert.equal(missingExecute.status, 404);

  const approval = await ActionApproval.findOne({ executionItemId: itemId });
  assert(approval);
});
