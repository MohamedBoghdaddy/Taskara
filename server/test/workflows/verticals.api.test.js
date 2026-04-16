const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const mongoose = require("mongoose");

const ActionApproval = require("../../src/models/ActionApproval");
const { createHarness } = require("../helpers/workflowTestHarness");

let harness;

const get = (path, user) =>
  harness.request(path, {
    method: "GET",
    headers: harness.authHeadersFor(user),
  });

const post = (path, user, body) =>
  harness.request(path, {
    method: "POST",
    headers: harness.authHeadersFor(user),
    body,
  });

const patch = (path, user, body) =>
  harness.request(path, {
    method: "PATCH",
    headers: harness.authHeadersFor(user),
    body,
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

test("agency vertical routes support client, campaign, content, reporting, approvals, and AI hooks", async () => {
  const owner = await harness.createUser({ email: "agency-vertical@test.local" });
  await harness.createWorkspace({ owner, name: "Agency Vertical" });

  const clientResponse = await post("/api/agencies/clients", owner, {
    name: "Northwind",
    clientName: "Northwind",
    serviceTier: "Growth Retainer",
    status: "active",
  });
  assert.equal(clientResponse.status, 201);
  const clientId = clientResponse.body.client._id;

  const retainerResponse = await post("/api/agencies/retainers", owner, {
    accountId: clientId,
    packageName: "Growth Retainer",
    monthlyAmount: 3200,
    currency: "USD",
    status: "active",
  });
  assert.equal(retainerResponse.status, 201);

  const campaignResponse = await post("/api/agencies/campaigns", owner, {
    accountId: clientId,
    name: "Q3 Growth Sprint",
    goal: "Drive qualified leads",
    status: "active",
    channels: ["linkedin", "email"],
  });
  assert.equal(campaignResponse.status, 201);
  const campaignId = campaignResponse.body.campaign._id;

  const contentResponse = await post("/api/agencies/content", owner, {
    accountId: clientId,
    campaignId,
    title: "Launch week post",
    channel: "linkedin",
    status: "scheduled",
    caption: "Launch week is live.",
  });
  assert.equal(contentResponse.status, 201);
  assert.equal(contentResponse.body.contentItem.approvalState, "pending");

  const reportResponse = await post("/api/agencies/reports", owner, {
    accountId: clientId,
    campaignId,
    title: "Northwind monthly report",
    status: "review",
    metrics: { impressions: 5400, conversions: 42, ctr: "4.6%" },
    recipientEmails: ["client@northwind.test"],
  });
  assert.equal(reportResponse.status, 201);
  assert.equal(reportResponse.body.report.generatedByAI, true);

  await ActionApproval.create({
    workspaceId: owner.defaultWorkspaceId,
    executionItemId: new mongoose.Types.ObjectId(),
    requestedBy: owner._id,
    audienceType: "agencies",
    workflowType: "report_delivery",
    actionId: "send_report",
    actionLabel: "Send report",
    channel: "email",
    approvalMode: "high_risk",
    riskLevel: "high",
    confidenceScore: 61,
    safetyReasons: ["Wrong report recipient risk."],
    reason: "Client-facing report send needs review.",
  });

  const [dashboard, clients, campaigns, contentItems, reports, retainers, approvals, aiSuggestions] = await Promise.all([
    get("/api/agencies/dashboard", owner),
    get("/api/agencies/clients", owner),
    get("/api/agencies/campaigns", owner),
    get("/api/agencies/content", owner),
    get("/api/agencies/reports", owner),
    get("/api/agencies/retainers", owner),
    get("/api/agencies/approvals", owner),
    post("/api/agencies/ai/suggestions", owner, {
      clientName: "Northwind",
      campaignGoal: "Drive qualified leads",
      channels: ["linkedin", "email"],
    }),
  ]);

  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.summary.activeClients, 1);
  assert.equal(dashboard.body.summary.reportReadiness, 1);
  assert.equal(dashboard.body.summary.pendingApprovals, 1);
  assert.equal(dashboard.body.widgets.length, 6);
  assert.ok(dashboard.body.trustSummary.wrongSendRisk >= 2);

  assert.equal(clients.body.clients.length, 1);
  assert.equal(clients.body.clients[0].serviceTier, "Growth Retainer");
  assert.equal(campaigns.body.campaigns.length, 1);
  assert.equal(contentItems.body.contentItems.length, 1);
  assert.equal(reports.body.reports.length, 1);
  assert.equal(retainers.body.retainers.length, 1);
  assert.equal(approvals.body.approvals.length, 1);

  assert.equal(aiSuggestions.status, 200);
  assert.ok(aiSuggestions.body.ideas.length >= 1);
  assert.ok(aiSuggestions.body.calendar.length >= 1);
});

test("real-estate vertical routes support owner, property, deal, viewing, settlement, maintenance, and manifests", async () => {
  const owner = await harness.createUser({ email: "realestate-vertical@test.local" });
  await harness.createWorkspace({ owner, name: "Real Estate Vertical" });

  const leadOne = await harness.RealEstateLead.create({
    workspaceId: owner.defaultWorkspaceId,
    createdBy: owner._id,
    name: "Maya Hassan",
    email: "maya@test.local",
    phone: "+201001234567",
    currentStage: "new_lead",
    nextRequiredAction: "Initial follow-up",
  });
  const leadTwo = await harness.RealEstateLead.create({
    workspaceId: owner.defaultWorkspaceId,
    createdBy: owner._id,
    name: "Omar Adel",
    email: "omar@test.local",
    phone: "+201001234568",
    currentStage: "qualified",
    nextRequiredAction: "Match to active property",
  });

  const ownerResponse = await post("/api/real-estate/owners", owner, {
    name: "Amina Mansour",
    email: "owner@test.local",
    preferredPayoutMethod: "bank_transfer",
    payoutRecipients: [{ label: "Primary", accountName: "Amina Mansour", reference: "ACCT-22", isPrimary: true }],
  });
  assert.equal(ownerResponse.status, 201);
  const ownerId = ownerResponse.body.owner._id;

  const propertyResponse = await post("/api/real-estate/properties", owner, {
    ownerId,
    title: "Palm Hills Villa",
    status: "active",
    propertyType: "villa",
    city: "Cairo",
    price: 450000,
    currency: "USD",
    bedrooms: 4,
    bathrooms: 3,
  });
  assert.equal(propertyResponse.status, 201);
  const propertyId = propertyResponse.body.property._id;
  assert.ok(propertyResponse.body.property.aiDescription.length > 0);

  const dealResponse = await post("/api/real-estate/deals", owner, {
    leadId: leadTwo._id,
    propertyId,
    ownerId,
    title: "Palm Hills - Omar Adel",
    stage: "under_contract",
    amount: 430000,
    paymentStatus: "deposit_received",
    nextAction: "Collect contract signatures",
  });
  assert.equal(dealResponse.status, 201);
  const dealId = dealResponse.body.deal._id;

  const viewingResponse = await post("/api/real-estate/viewings", owner, {
    propertyId,
    leadId: leadTwo._id,
    dealId,
    scheduledFor: "2026-05-10T12:00:00.000Z",
    status: "scheduled",
  });
  assert.equal(viewingResponse.status, 201);

  const settlementResponse = await post("/api/real-estate/settlements", owner, {
    dealId,
    ownerId,
    ownerName: "Amina Mansour",
    recipientName: "Amina Mansour",
    recipientReference: "ACCT-22",
    amount: 175000,
    currency: "USD",
    dueAt: "2026-05-22T00:00:00.000Z",
    status: "review",
  });
  assert.equal(settlementResponse.status, 201);
  assert.equal(settlementResponse.body.settlement.approvalRequired, true);

  const maintenanceResponse = await post("/api/real-estate/maintenance", owner, {
    propertyId,
    vendorName: "Cairo Maintenance Co",
    summary: "Prepare AC system before viewing",
    status: "requested",
  });
  assert.equal(maintenanceResponse.status, 201);

  const leadUpdate = await patch(`/api/real-estate/leads/${leadOne._id}`, owner, {
    currentStage: "contacted",
    nextRequiredAction: "Schedule qualification call",
  });
  assert.equal(leadUpdate.status, 200);
  assert.equal(leadUpdate.body.lead.currentStage, "contacted");

  const [dashboard, leads, owners, properties, deals, viewings, settlements, maintenance, aiSuggestions, startupsManifest, insuranceManifest, studentManifest, studyManifest] =
    await Promise.all([
      get("/api/real-estate/dashboard", owner),
      get("/api/real-estate/leads", owner),
      get("/api/real-estate/owners", owner),
      get("/api/real-estate/properties", owner),
      get("/api/real-estate/deals", owner),
      get("/api/real-estate/viewings", owner),
      get("/api/real-estate/settlements", owner),
      get("/api/real-estate/maintenance", owner),
      post("/api/real-estate/ai/suggestions", owner, {
        mode: "conversation_summary",
        text: "Lead asked about payment timing, requested a second viewing, and wants owner fees clarified.",
      }),
      get("/api/startups/manifest", owner),
      get("/api/insurance/manifest", owner),
      get("/api/student/manifest", owner),
      get("/api/study/manifest", owner),
    ]);

  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.summary.settlementsDue, 1);
  assert.equal(dashboard.body.summary.moneyAtRisk, 175000);
  assert.equal(dashboard.body.summary.maintenanceBacklog, 1);
  assert.equal(dashboard.body.widgets.length, 6);
  assert.match(dashboard.body.trustSummary.explanation, /settlements/i);

  assert.equal(leads.body.leads.length, 2);
  assert.equal(owners.body.owners.length, 1);
  assert.equal(properties.body.properties.length, 1);
  assert.equal(deals.body.deals.length, 1);
  assert.equal(viewings.body.viewings.length, 1);
  assert.equal(settlements.body.settlements.length, 1);
  assert.equal(maintenance.body.maintenanceRequests.length, 1);

  assert.equal(aiSuggestions.status, 200);
  assert.match(aiSuggestions.body.summary, /summary/i);

  assert.equal(startupsManifest.body.status, "scaffolded");
  assert.equal(insuranceManifest.body.status, "pilot_only");
  assert.equal(studentManifest.body.key, "student");
  assert.equal(studyManifest.body.status, "surface_scaffolded");
});
