const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const ActionApproval = require("../../models/ActionApproval");
const AgencyAccount = require("../../models/AgencyAccount");
const Candidate = require("../../models/Candidate");
const DocumentChecklist = require("../../models/DocumentChecklist");
const ExecutionItem = require("../../models/ExecutionItem");
const RealEstateLead = require("../../models/RealEstateLead");
const StartupInitiative = require("../../models/StartupInitiative");
const Task = require("../../models/Task");
const User = require("../../models/User");
const WorkflowRun = require("../../models/WorkflowRun");
const Workspace = require("../../models/Workspace");
const WorkspaceMember = require("../../models/WorkspaceMember");
const { register } = require("../auth/authService");
const {
  applyControlAction,
  applyManualOverride,
  decideApproval,
  executeReadyPlan,
  ingestWorkflowInput,
} = require("./workflowService");
const { buildAuditEntry } = require("./helpers");

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DEMO_CONNECTOR = "demo_seed";
const DEMO_DOMAIN = "demo.taskara.local";

const dateFromNow = ({ days = 0, hours = 0 }) => new Date(Date.now() + days * DAY + hours * HOUR);

const assertDemoSeedAllowed = () => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Workflow demo seeding is disabled in production. Set ALLOW_DEMO_SEED=true to override intentionally.");
  }
};

const DEMO_USERS = [
  { key: "nadia", name: "Nadia Recruiter", email: `nadia@${DEMO_DOMAIN}`, role: "admin" },
  { key: "omar", name: "Omar Product Ops", email: `omar@${DEMO_DOMAIN}`, role: "editor" },
  { key: "sara", name: "Sara Account Lead", email: `sara@${DEMO_DOMAIN}`, role: "editor" },
  { key: "leo", name: "Leo Broker", email: `leo@${DEMO_DOMAIN}`, role: "editor" },
];

const INGEST_SPECS = [
  {
    key: "rec_maya",
    audienceType: "recruiters",
    workflowType: "candidate_outreach",
    sourceType: "email",
    title: "Maya Chen sourced from outbound pipeline",
    text: "Candidate Maya Chen looks like a fit for Senior Product Engineer. Send first outreach today and keep ATS notes current.",
    payload: {
      candidateName: "Maya Chen",
      candidateEmail: `maya.chen@${DEMO_DOMAIN}`,
      roleTitle: "Senior Product Engineer",
      company: "Taskara",
    },
    itemKeys: ["rec_maya"],
  },
  {
    key: "rec_priya",
    audienceType: "recruiters",
    workflowType: "candidate_outreach",
    sourceType: "sourcing_export",
    title: "Priya Nair sourced from backend shortlist",
    text: "Priya Nair opened the role brief yesterday. Send outreach and keep follow-up ready if there is no reply this week.",
    payload: {
      candidateName: "Priya Nair",
      candidateEmail: `priya.nair@${DEMO_DOMAIN}`,
      roleTitle: "Staff Backend Engineer",
      company: "Taskara",
    },
    itemKeys: ["rec_priya"],
  },
  {
    key: "rec_diego",
    audienceType: "recruiters",
    workflowType: "interview_coordination",
    sourceType: "email",
    title: "Diego Park interview loop",
    text: "Diego Park replied with availability for next Tuesday afternoon. Coordinate interview slots, collect feedback, and update stage.",
    payload: {
      candidateName: "Diego Park",
      candidateEmail: `diego.park@${DEMO_DOMAIN}`,
      roleTitle: "Senior Data Engineer",
      company: "Taskara",
      interviewerCount: 3,
    },
    itemKeys: ["rec_diego"],
  },
  {
    key: "rec_amal",
    audienceType: "recruiters",
    workflowType: "candidate_rejection",
    sourceType: "ats",
    title: "Amal Hassan rejection flow",
    text: "Candidate Amal Hassan has been declined after portfolio review. Send rejection and move to nurture only if approved.",
    payload: {
      candidateName: "Amal Hassan",
      candidateEmail: `amal.hassan@${DEMO_DOMAIN}`,
      roleTitle: "Product Designer",
      company: "Taskara",
    },
    itemKeys: ["rec_amal"],
  },
  {
    key: "rec_jordan",
    audienceType: "recruiters",
    workflowType: "candidate_rejection",
    sourceType: "email",
    title: "Jordan Lee nurture sequence",
    text: "Jordan Lee is strong but there is no open headcount right now. Send a warm rejection and add the profile to nurture.",
    payload: {
      candidateName: "Jordan Lee",
      candidateEmail: `jordan.lee@${DEMO_DOMAIN}`,
      roleTitle: "Solutions Engineer",
      company: "Taskara",
    },
    itemKeys: ["rec_jordan"],
  },
  {
    key: "startup_launch",
    audienceType: "startups",
    workflowType: "thread_breakdown",
    sourceType: "slack",
    title: "Q2 analytics launch thread",
    text: "Fix the attribution mismatch before Friday.\nCreate the release checklist and hand off owners.\nPost launch readiness status back into #exec.",
    payload: {
      initiativeTitle: "Q2 Analytics Launch",
      ownerName: "Omar",
    },
    itemKeys: ["startup_launch_fix", "startup_launch_checklist", "startup_launch_status"],
  },
  {
    key: "startup_routing",
    audienceType: "startups",
    workflowType: "issue_routing",
    sourceType: "slack",
    title: "Release blockers and billing incident",
    text: "Billing retry bug needs owner and GitHub issue.\nRelease notes drift needs triage and a status post back to product.",
    payload: {
      initiativeTitle: "Release Readiness Sprint",
      ownerName: "Omar",
    },
    itemKeys: ["startup_billing_bug", "startup_release_triage"],
  },
  {
    key: "agency_brief",
    audienceType: "agencies",
    workflowType: "brief_to_deliverables",
    sourceType: "client_brief",
    title: "Northstar Foods April campaign",
    text: "Landing page refresh for the spring promo.\nPaid social concept pack for Meta and LinkedIn.\nClient status email for Friday leadership review.",
    payload: {
      accountName: "Northstar Foods",
      clientName: "Northstar Foods",
      clientEmail: `northstar@${DEMO_DOMAIN}`,
    },
    itemKeys: ["agency_northstar_landing", "agency_northstar_social", "agency_northstar_status"],
  },
  {
    key: "agency_approval",
    audienceType: "agencies",
    workflowType: "approval_chase",
    sourceType: "email",
    title: "Beacon Wellness approvals",
    text: "Homepage copy sign-off is still pending.\nFounder testimonial creative needs another approval chase.",
    payload: {
      accountName: "Beacon Wellness",
      clientName: "Beacon Wellness",
      clientEmail: `beacon@${DEMO_DOMAIN}`,
    },
    itemKeys: ["agency_beacon_copy", "agency_beacon_testimonial"],
  },
  {
    key: "re_lina",
    audienceType: "realestate",
    workflowType: "lead_followup",
    sourceType: "lead_form",
    title: "Lina Morgan downtown condo inquiry",
    text: "Lead Lina Morgan asked about the two-bedroom downtown condo and wants a quick follow-up today.",
    payload: {
      leadName: "Lina Morgan",
      leadEmail: `lina.morgan@${DEMO_DOMAIN}`,
      leadPhone: "+15550000101",
      propertyInterest: "Downtown two-bedroom condo",
    },
    itemKeys: ["re_lina"],
  },
  {
    key: "re_carlos",
    audienceType: "realestate",
    workflowType: "document_chase",
    sourceType: "crm",
    title: "Carlos Mendez mortgage packet",
    text: "Carlos Mendez is under contract. Request missing proof of funds and signed disclosure today.",
    payload: {
      leadName: "Carlos Mendez",
      leadEmail: `carlos.mendez@${DEMO_DOMAIN}`,
      leadPhone: "+15550000102",
      propertyInterest: "Elm Street townhome",
    },
    itemKeys: ["re_carlos"],
  },
  {
    key: "re_jenna",
    audienceType: "realestate",
    workflowType: "milestone_update",
    sourceType: "email",
    title: "Jenna Blake closing milestone",
    text: "Jenna Blake just cleared final underwriting. Update the deal milestone and notify everyone on the file.",
    payload: {
      leadName: "Jenna Blake",
      leadEmail: `jenna.blake@${DEMO_DOMAIN}`,
      leadPhone: "+15550000103",
      propertyInterest: "Riverside loft",
    },
    itemKeys: ["re_jenna"],
  },
  {
    key: "re_youssef",
    audienceType: "realestate",
    workflowType: "lead_followup",
    sourceType: "whatsapp",
    title: "Youssef Adel showing request",
    text: "Youssef Adel asked for a follow-up on the warehouse listing and needs next steps queued before tomorrow.",
    payload: {
      leadName: "Youssef Adel",
      leadEmail: `youssef.adel@${DEMO_DOMAIN}`,
      leadPhone: "+15550000104",
      propertyInterest: "Warehouse conversion listing",
    },
    itemKeys: ["re_youssef"],
  },
  {
    key: "re_nina",
    audienceType: "realestate",
    workflowType: "milestone_update",
    sourceType: "manual",
    title: "Nina Patel contract review",
    text: "Nina Patel needs the next milestone updated after contract review. Hold until an operator confirms the exact stage.",
    payload: {
      leadName: "Nina Patel",
      leadEmail: `nina.patel@${DEMO_DOMAIN}`,
      leadPhone: "+15550000105",
      propertyInterest: "Oak Terrace family home",
    },
    autoExecute: false,
    itemKeys: ["re_nina"],
  },
];

const ensureDemoWorkspace = async () => {
  let owner = await User.findOne({ defaultWorkspaceId: { $ne: null } }).sort({ createdAt: 1 });
  let workspace = owner ? await Workspace.findById(owner.defaultWorkspaceId) : null;

  if (!owner || !workspace) {
    const registered = await register({
      name: "Taskara Demo Owner",
      email: `owner@${DEMO_DOMAIN}`,
      password: "taskara-demo-123",
    });
    owner = await User.findById(registered.user._id);
    workspace = await Workspace.findById(registered.workspace._id);
  }

  const team = { owner };
  const memberIds = new Set((workspace.memberIds || []).map((id) => String(id)));

  for (const spec of DEMO_USERS) {
    let user = await User.findOne({ email: spec.email });
    if (!user) {
      user = await User.create({
        name: spec.name,
        email: spec.email,
        passwordHash: await bcrypt.hash("taskara-demo-123", 12),
        timezone: "UTC",
      });
    }

    await WorkspaceMember.updateOne(
      { workspaceId: workspace._id, userId: user._id },
      { $set: { role: spec.role }, $setOnInsert: { joinedAt: new Date() } },
      { upsert: true },
    );

    if (!memberIds.has(String(user._id))) {
      workspace.memberIds.push(user._id);
      memberIds.add(String(user._id));
    }

    team[spec.key] = user;
  }

  await workspace.save();
  await WorkspaceMember.updateOne(
    { workspaceId: workspace._id, userId: owner._id },
    { $set: { role: "owner" }, $setOnInsert: { joinedAt: new Date() } },
    { upsert: true },
  );

  return { owner, workspace, team };
};

const clearDemoWorkflowRecords = async (workspaceId) => {
  const demoItems = await ExecutionItem.find({
    workspaceId,
    "sourceRef.connector": DEMO_CONNECTOR,
  }).select("_id");
  const itemIds = demoItems.map((item) => item._id);

  if (itemIds.length) {
    await ActionApproval.deleteMany({ executionItemId: { $in: itemIds } });
    await ExecutionItem.deleteMany({ _id: { $in: itemIds } });
  }

  await WorkflowRun.deleteMany({ workspaceId, "sourceRef.connector": DEMO_CONNECTOR });
  await Task.deleteMany({ workspaceId, "meta.demoWorkflow": true });
};

const refreshItem = async (itemMap, key) => {
  itemMap[key] = await ExecutionItem.findById(itemMap[key]._id);
  return itemMap[key];
};

const updateItem = async (itemMap, key, updater) => {
  const item = await ExecutionItem.findById(itemMap[key]._id);
  await updater(item);
  await item.save();
  itemMap[key] = await ExecutionItem.findById(item._id);
  return itemMap[key];
};

const ensurePendingApproval = async ({ workspaceId, itemMap, key, userId, force = false }) => {
  let item = await refreshItem(itemMap, key);

  if (item.approvalStatus === "pending") return item;
  if (["cancelled", "completed", "blocked", "failed"].includes(item.status)) return item;

  await executeReadyPlan({ workspaceId, itemId: item._id, userId, force });
  item = await refreshItem(itemMap, key);
  return item;
};

const maybeDecideApproval = async ({ workspaceId, itemMap, key, userId, decision, comment = "", force = false }) => {
  const item = await ensurePendingApproval({ workspaceId, itemMap, key, userId, force });
  if (item.approvalStatus !== "pending") return item;

  await decideApproval({
    workspaceId,
    itemId: item._id,
    userId,
    decision,
    comment,
  });
  return refreshItem(itemMap, key);
};

const setTimestamps = async (Model, id, createdAt, updatedAt) => {
  await Model.updateOne(
    { _id: id },
    { $set: { createdAt, updatedAt } },
    { timestamps: false },
  );
};

const recomputeRunSummary = async (runId) => {
  const items = await ExecutionItem.find({ workflowRunId: runId });
  const confidenceAverage =
    items.length > 0
      ? items.reduce((sum, item) => sum + (item.confidenceScore || 0), 0) / items.length
      : 0;

  const executionSummary = {
    executedCount: items.filter((item) => item.actionLogs.some((entry) => entry.status === "executed")).length,
    pendingApprovals: items.filter((item) => item.approvalStatus === "pending").length,
    blockedCount: items.filter((item) => item.status === "blocked" || item.status === "failed").length,
    syncedCount: items.filter((item) => item.syncLogs.some((entry) => entry.status === "synced")).length,
  };

  const status =
    items.length === 0
      ? "duplicate"
      : items.some((item) => item.status === "failed")
        ? "failed"
        : items.every((item) => ["completed", "cancelled"].includes(item.status))
          ? "completed"
          : "executing";

  await WorkflowRun.updateOne(
    { _id: runId },
    {
      $set: {
        status,
        extractionSummary: {
          itemCount: items.length,
          duplicateCount: 0,
          groupedCount: new Set(items.map((item) => item.groupKey)).size,
          confidenceAverage: Number(confidenceAverage.toFixed(2)),
        },
        executionSummary,
        executionItemIds: items.map((item) => item._id),
      },
    },
  );
};

const upsertTaskForItem = async ({ item, workspaceId, userId }) => {
  const task = await Task.findOneAndUpdate(
    { workspaceId, "meta.demoWorkflow": true, "meta.executionItemId": item._id },
    {
      $set: {
        title: item.title,
        description: item.description || item.sourceContext?.excerpt || "",
        status:
          item.status === "completed"
            ? "done"
            : item.status === "blocked" || item.status === "failed"
              ? "blocked"
              : item.status === "in_progress"
                ? "in_progress"
                : "todo",
        priority: item.priority,
        dueDate: item.dueAt || null,
        assigneeIds: item.assignee?.userId ? [item.assignee.userId] : [],
        createdBy: userId,
        meta: {
          demoWorkflow: true,
          executionItemId: item._id,
          audienceType: item.audienceType,
          workflowType: item.workflowType,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await ExecutionItem.updateOne({ _id: item._id }, { $set: { linkedTaskId: task._id } });
};

const seedWorkflowDemoData = async () => {
  assertDemoSeedAllowed();
  const context = await ensureDemoWorkspace();
  const workspaceId = context.workspace._id;
  const userId = context.owner._id;

  await clearDemoWorkflowRecords(workspaceId);

  const itemMap = {};
  const runIds = new Set();

  for (const spec of INGEST_SPECS) {
    const result = await ingestWorkflowInput({
      workspaceId,
      userId,
      audienceType: spec.audienceType,
      workflowType: spec.workflowType,
      sourceType: spec.sourceType,
      title: spec.title,
      text: spec.text,
      payload: spec.payload,
      autoExecute: spec.autoExecute !== false,
      triggerMode: "connector",
      sourceRef: {
        externalId: `demo:${spec.key}`,
        label: spec.title,
        threadId: `demo:${spec.key}`,
        url: `https://demo.taskara.local/${spec.key}`,
        connector: DEMO_CONNECTOR,
      },
    });

    const items = result.items || [];
    spec.itemKeys.forEach((key, index) => {
      itemMap[key] = items[index];
    });
    if (result.run?._id) runIds.add(String(result.run._id));
  }

  await maybeDecideApproval({ workspaceId, itemMap, key: "rec_priya", userId, decision: "approve" });
  await maybeDecideApproval({ workspaceId, itemMap, key: "rec_diego", userId, decision: "approve" });
  await maybeDecideApproval({
    workspaceId,
    itemMap,
    key: "rec_amal",
    userId,
    decision: "reject",
    comment: "Hold rejection until hiring manager review is complete.",
  });
  await maybeDecideApproval({ workspaceId, itemMap, key: "rec_jordan", userId, decision: "approve" });
  await maybeDecideApproval({ workspaceId, itemMap, key: "startup_release_triage", userId, decision: "approve" });

  await executeReadyPlan({ workspaceId, itemId: itemMap.agency_northstar_landing._id, userId, force: true });
  await refreshItem(itemMap, "agency_northstar_landing");

  await executeReadyPlan({ workspaceId, itemId: itemMap.agency_northstar_social._id, userId, force: true });
  await refreshItem(itemMap, "agency_northstar_social");
  await maybeDecideApproval({
    workspaceId,
    itemMap,
    key: "agency_northstar_social",
    userId,
    decision: "approve",
    force: true,
  });

  await executeReadyPlan({ workspaceId, itemId: itemMap.agency_beacon_copy._id, userId, force: true });
  await refreshItem(itemMap, "agency_beacon_copy");
  await maybeDecideApproval({
    workspaceId,
    itemMap,
    key: "agency_beacon_copy",
    userId,
    decision: "reject",
    comment: "Client update copy needs brand review before sending.",
    force: true,
  });

  await applyControlAction({ workspaceId, itemId: itemMap.agency_northstar_status._id, userId, action: "cancel" });
  await refreshItem(itemMap, "agency_northstar_status");

  await applyControlAction({ workspaceId, itemId: itemMap.re_youssef._id, userId, action: "pause" });
  await refreshItem(itemMap, "re_youssef");

  await applyManualOverride({
    workspaceId,
    itemId: itemMap.startup_launch_status._id,
    assigneeId: context.team.omar._id,
    actorId: userId,
  });
  await refreshItem(itemMap, "startup_launch_status");

  await updateItem(itemMap, "agency_beacon_testimonial", async (item) => {
    const delayedLog = item.actionLogs.find((entry) => entry.actionId === "flag_delay");
    const delayedStep = item.executionPlan.find((entry) => entry.id === "flag_delay");
    if (delayedLog) {
      delayedLog.status = "failed";
      delayedLog.reason = "Slack delivery failed after retry exhaustion.";
    }
    if (delayedStep) delayedStep.status = "failed";
    item.status = "failed";
    item.approvalStatus = "not_required";
    item.followUp.active = false;
    item.followUp.stopReason = "delivery_failed";
    item.syncLogs.push({
      provider: "slack",
      direction: "outbound",
      status: "failed",
      attemptedAt: new Date(),
      details: { actionId: "flag_delay", reason: "Slack delivery failed after retry exhaustion." },
    });
    item.auditTrail.push(
      buildAuditEntry(
        "note",
        "Flag delay escalation failed because the Slack delivery retry budget was exhausted.",
        { actionId: "flag_delay" },
        "integration",
        userId,
      ),
    );
  });

  await updateItem(itemMap, "re_nina", async (item) => {
    item.stage = "closing";
    item.priority = "high";
    item.dueAt = dateFromNow({ days: -1 });
    item.auditTrail.push(
      buildAuditEntry(
        "note",
        "Operator held the milestone update so the contract stage can be confirmed before sync.",
        { readyForReview: true },
        "user",
        userId,
      ),
    );
  });

  await updateItem(itemMap, "re_lina", async (item) => {
    item.dueAt = dateFromNow({ days: -2 });
    item.priority = "urgent";
    item.status = "scheduled";
    item.followUp.active = true;
    item.followUp.cadenceStep = 2;
    item.followUp.attempts = Math.max(item.followUp.attempts || 0, 1);
    item.followUp.maxAttempts = Math.max(item.followUp.maxAttempts || 0, 3);
    item.followUp.nextRunAt = dateFromNow({ hours: 18 });
    item.followUp.stopReason = "";
    const scheduledLog = item.actionLogs.find((entry) => entry.actionId === "send_sequence_followup");
    const scheduledStep = item.executionPlan.find((entry) => entry.id === "send_sequence_followup");
    if (scheduledLog) {
      scheduledLog.status = "scheduled";
      scheduledLog.scheduledFor = item.followUp.nextRunAt;
    }
    if (scheduledStep) {
      scheduledStep.status = "waiting";
      scheduledStep.scheduledFor = item.followUp.nextRunAt;
    }
  });

  await updateItem(itemMap, "rec_priya", async (item) => {
    item.dueAt = dateFromNow({ days: -1 });
    item.stage = "contacted";
  });

  await updateItem(itemMap, "startup_billing_bug", async (item) => {
    item.priority = "urgent";
    item.dueAt = dateFromNow({ days: -1 });
  });

  const startupKeys = Object.keys(itemMap).filter((key) => itemMap[key].audienceType === "startups");
  for (const key of startupKeys) {
    await upsertTaskForItem({ item: itemMap[key], workspaceId, userId });
    await refreshItem(itemMap, key);
  }

  const demoEmailPattern = new RegExp(`@${DEMO_DOMAIN.replace(".", "\\.")}$`);
  const candidates = await Candidate.find({ workspaceId, email: demoEmailPattern });
  for (const candidate of candidates) {
    const updates = {
      "maya.chen": {
        currentStage: "contacted",
        ownerId: context.team.nadia._id,
        "metrics.responseRate": 0,
        "metrics.timeToFirstResponseHours": 0,
      },
      "priya.nair": {
        currentStage: "hired",
        ownerId: context.team.nadia._id,
        "metrics.responseRate": 1,
        "metrics.timeToFirstResponseHours": 2.4,
        "metrics.timeToHireDays": 18,
      },
      "diego.park": {
        currentStage: "interview",
        ownerId: context.team.nadia._id,
        "metrics.responseRate": 1,
        "metrics.timeToFirstResponseHours": 3.1,
      },
      "amal.hassan": {
        currentStage: "rejected",
        ownerId: context.team.nadia._id,
        "metrics.timeToFirstResponseHours": 11.8,
      },
      "jordan.lee": {
        currentStage: "nurture",
        ownerId: context.team.nadia._id,
        "metrics.timeToFirstResponseHours": 6.2,
      },
    };
    const key = candidate.email.split("@")[0];
    if (updates[key]) {
      await Candidate.updateOne({ _id: candidate._id }, { $set: updates[key] });
    }
  }

  await StartupInitiative.updateMany(
    { workspaceId, title: "Q2 Analytics Launch" },
    {
      $set: {
        ownerId: context.team.omar._id,
        status: "active",
        statusSummary: "Launch blockers are routed and the release checklist is visible in Slack.",
        "metrics.totalItems": 3,
        "metrics.completedItems": 3,
        "metrics.unownedItems": 0,
        "metrics.blockedItems": 0,
      },
    },
  );
  await StartupInitiative.updateMany(
    { workspaceId, title: "Release Readiness Sprint" },
    {
      $set: {
        ownerId: context.team.omar._id,
        status: "blocked",
        statusSummary: "Billing retry work is waiting on GitHub approval and release triage is still scheduled for follow-up.",
        "metrics.totalItems": 2,
        "metrics.completedItems": 0,
        "metrics.unownedItems": 0,
        "metrics.blockedItems": 1,
        approvalRequired: true,
      },
    },
  );

  await AgencyAccount.updateMany(
    { workspaceId, name: "Northstar Foods" },
    {
      $set: {
        ownerId: context.team.sara._id,
        status: "active",
        "accountHealth.onTimeDeliveryRate": 92,
        "accountHealth.approvalTurnaroundHours": 11,
        "accountHealth.delayCount": 1,
        "accountHealth.utilization": 78,
      },
    },
  );
  await AgencyAccount.updateMany(
    { workspaceId, name: "Beacon Wellness" },
    {
      $set: {
        ownerId: context.team.sara._id,
        status: "at_risk",
        "accountHealth.onTimeDeliveryRate": 74,
        "accountHealth.approvalTurnaroundHours": 29,
        "accountHealth.delayCount": 3,
        "accountHealth.utilization": 88,
      },
    },
  );

  const leads = await RealEstateLead.find({ workspaceId, email: demoEmailPattern });
  for (const lead of leads) {
    const key = lead.email.split("@")[0];
    const updates = {
      "lina.morgan": {
        currentStage: "contacted",
        ownerId: context.team.leo._id,
        nextRequiredAction: "Watch for reply and push the next follow-up if the lead stays cold.",
        "metrics.leadResponseMinutes": 12,
      },
      "carlos.mendez": {
        currentStage: "under_contract",
        ownerId: context.team.leo._id,
        nextRequiredAction: "Collect the remaining documents and clear the checklist.",
        "metrics.leadResponseMinutes": 21,
      },
      "jenna.blake": {
        currentStage: "closed",
        ownerId: context.team.leo._id,
        nextRequiredAction: "Archive the communication trail after closing.",
        "metrics.leadResponseMinutes": 15,
        "metrics.dealCompletionDays": 26,
      },
      "youssef.adel": {
        currentStage: "qualified",
        ownerId: context.team.leo._id,
        nextRequiredAction: "Resume the follow-up once the showing window is confirmed.",
        "metrics.leadResponseMinutes": 34,
      },
      "nina.patel": {
        currentStage: "closing",
        ownerId: context.team.leo._id,
        nextRequiredAction: "Confirm contract review stage before syncing the next milestone.",
        "metrics.leadResponseMinutes": 18,
      },
    };
    if (updates[key]) {
      await RealEstateLead.updateOne({ _id: lead._id }, { $set: updates[key] });
    }
  }

  const checklists = await DocumentChecklist.find({ workspaceId });
  for (const checklist of checklists) {
    const lead = leads.find(
      (entry) =>
        String(entry.documentChecklistId) === String(checklist._id) ||
        String(entry._id) === String(checklist.leadId),
    );
    if (!lead) continue;
    if (lead.email.startsWith("carlos.")) {
      checklist.items = checklist.items.map((item, index) => {
        const raw = typeof item.toObject === "function" ? item.toObject() : item;
        if (index === 0) return { ...raw, status: "received", receivedAt: new Date() };
        return { ...raw, status: "requested", requestedAt: new Date(), lastReminderAt: new Date() };
      });
      checklist.missingCount = 2;
      checklist.nextReminderAt = dateFromNow({ days: 2 });
    } else if (lead.email.startsWith("jenna.")) {
      checklist.items = checklist.items.map((item) => ({
        ...(typeof item.toObject === "function" ? item.toObject() : item),
        status: "approved",
        receivedAt: new Date(),
      }));
      checklist.missingCount = 0;
      checklist.nextReminderAt = null;
    } else {
      checklist.nextReminderAt = dateFromNow({ days: 3 });
      checklist.missingCount = checklist.items.filter((item) => item.status !== "approved").length;
    }
    await checklist.save();
  }

  const itemTimelines = {
    rec_maya: { createdAt: dateFromNow({ days: -2, hours: -4 }), updatedAt: dateFromNow({ days: -1, hours: -6 }) },
    rec_priya: { createdAt: dateFromNow({ days: -10 }), updatedAt: dateFromNow({ days: -2 }) },
    rec_diego: { createdAt: dateFromNow({ days: -6 }), updatedAt: dateFromNow({ days: -1 }) },
    rec_amal: { createdAt: dateFromNow({ days: -3 }), updatedAt: dateFromNow({ days: -1, hours: -4 }) },
    rec_jordan: { createdAt: dateFromNow({ days: -14 }), updatedAt: dateFromNow({ days: -4 }) },
    startup_launch_fix: { createdAt: dateFromNow({ days: -2, hours: -8 }), updatedAt: dateFromNow({ days: -1 }) },
    startup_launch_checklist: { createdAt: dateFromNow({ days: -2, hours: -6 }), updatedAt: dateFromNow({ days: -1 }) },
    startup_launch_status: { createdAt: dateFromNow({ days: -2, hours: -5 }), updatedAt: dateFromNow({ days: -1, hours: -2 }) },
    startup_billing_bug: { createdAt: dateFromNow({ days: -1, hours: -12 }), updatedAt: dateFromNow({ days: -1, hours: -1 }) },
    startup_release_triage: { createdAt: dateFromNow({ days: -1, hours: -9 }), updatedAt: dateFromNow({ hours: -8 }) },
    agency_northstar_landing: { createdAt: dateFromNow({ days: -5 }), updatedAt: dateFromNow({ days: -1, hours: -3 }) },
    agency_northstar_social: { createdAt: dateFromNow({ days: -4 }), updatedAt: dateFromNow({ days: -1 }) },
    agency_northstar_status: { createdAt: dateFromNow({ days: -3 }), updatedAt: dateFromNow({ days: -2 }) },
    agency_beacon_copy: { createdAt: dateFromNow({ days: -6 }), updatedAt: dateFromNow({ days: -1, hours: -5 }) },
    agency_beacon_testimonial: { createdAt: dateFromNow({ days: -2 }), updatedAt: dateFromNow({ hours: -10 }) },
    re_lina: { createdAt: dateFromNow({ days: -2 }), updatedAt: dateFromNow({ hours: -14 }) },
    re_carlos: { createdAt: dateFromNow({ days: -8 }), updatedAt: dateFromNow({ days: -1 }) },
    re_jenna: { createdAt: dateFromNow({ days: -12 }), updatedAt: dateFromNow({ days: -2 }) },
    re_youssef: { createdAt: dateFromNow({ days: -1 }), updatedAt: dateFromNow({ hours: -6 }) },
    re_nina: { createdAt: dateFromNow({ days: -3 }), updatedAt: dateFromNow({ hours: -3 }) },
  };

  for (const [key, timeline] of Object.entries(itemTimelines)) {
    await setTimestamps(ExecutionItem, itemMap[key]._id, timeline.createdAt, timeline.updatedAt);
  }

  const approvals = await ActionApproval.find({
    executionItemId: { $in: Object.values(itemMap).map((item) => item._id) },
  });
  for (const approval of approvals) {
    let createdAt = dateFromNow({ days: -1 });
    let updatedAt = createdAt;
    if (approval.executionItemId.equals(itemMap.rec_priya._id)) {
      createdAt = dateFromNow({ days: -9 });
      updatedAt = dateFromNow({ days: -2 });
      approval.decidedAt = dateFromNow({ days: -2 });
      approval.approverId = userId;
    } else if (approval.executionItemId.equals(itemMap.rec_diego._id)) {
      createdAt = dateFromNow({ days: -5 });
      updatedAt = dateFromNow({ days: -1 });
      approval.decidedAt = dateFromNow({ days: -1 });
      approval.approverId = userId;
    } else if (approval.executionItemId.equals(itemMap.rec_amal._id)) {
      createdAt = dateFromNow({ days: -3 });
      updatedAt = dateFromNow({ days: -1, hours: -4 });
      approval.decidedAt = dateFromNow({ days: -1, hours: -4 });
      approval.approverId = userId;
    } else if (approval.executionItemId.equals(itemMap.rec_jordan._id)) {
      createdAt = dateFromNow({ days: -13 });
      updatedAt = dateFromNow({ days: -4 });
      approval.decidedAt = dateFromNow({ days: -4 });
      approval.approverId = userId;
    } else if (approval.executionItemId.equals(itemMap.startup_release_triage._id)) {
      createdAt = dateFromNow({ days: -1, hours: -9 });
      updatedAt = dateFromNow({ hours: -8 });
      approval.decidedAt = dateFromNow({ hours: -8 });
      approval.approverId = userId;
    } else if (approval.executionItemId.equals(itemMap.startup_billing_bug._id)) {
      createdAt = dateFromNow({ days: -1, hours: -12 });
      updatedAt = dateFromNow({ days: -1, hours: -1 });
    } else if (approval.executionItemId.equals(itemMap.agency_northstar_landing._id)) {
      createdAt = dateFromNow({ days: -4 });
      updatedAt = dateFromNow({ days: -1, hours: -3 });
    } else if (approval.executionItemId.equals(itemMap.agency_northstar_social._id)) {
      createdAt = dateFromNow({ days: -4 });
      updatedAt = dateFromNow({ days: -1 });
      approval.decidedAt = dateFromNow({ days: -1 });
      approval.approverId = userId;
    } else if (approval.executionItemId.equals(itemMap.agency_beacon_copy._id)) {
      createdAt = dateFromNow({ days: -2 });
      updatedAt = dateFromNow({ days: -1, hours: -5 });
      approval.decidedAt = dateFromNow({ days: -1, hours: -5 });
      approval.approverId = userId;
    }
    await approval.save();
    await setTimestamps(ActionApproval, approval._id, createdAt, updatedAt);
  }

  const runs = await WorkflowRun.find({
    _id: { $in: Array.from(runIds).map((id) => new mongoose.Types.ObjectId(id)) },
  });
  for (const run of runs) {
    const relatedItems = await ExecutionItem.find({ workflowRunId: run._id }).sort({ createdAt: 1 });
    const createdAt = relatedItems[0]?.createdAt || new Date();
    const updatedAt = relatedItems[relatedItems.length - 1]?.updatedAt || createdAt;
    await recomputeRunSummary(run._id);
    await setTimestamps(WorkflowRun, run._id, createdAt, updatedAt);
  }

  return {
    workspaceId,
    seededExecutionItems: await ExecutionItem.countDocuments({ workspaceId, "sourceRef.connector": DEMO_CONNECTOR }),
    seededWorkflowRuns: await WorkflowRun.countDocuments({ workspaceId, "sourceRef.connector": DEMO_CONNECTOR }),
    seededApprovals: await ActionApproval.countDocuments({
      executionItemId: { $in: Object.values(itemMap).map((item) => item._id) },
    }),
  };
};

module.exports = {
  DEMO_CONNECTOR,
  DEMO_DOMAIN,
  ensureDemoWorkspace,
  seedWorkflowDemoData,
};
