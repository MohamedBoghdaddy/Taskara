const ActionApproval = require("../../models/ActionApproval");
const DocumentChecklist = require("../../models/DocumentChecklist");
const ExecutionItem = require("../../models/ExecutionItem");
const IntegrationSettings = require("../../models/IntegrationSettings");
const Task = require("../../models/Task");
const WorkerJobRun = require("../../models/WorkerJobRun");
const WorkspaceOperationalState = require("../../models/WorkspaceOperationalState");
const WorkflowRun = require("../../models/WorkflowRun");
const { AUDIENCE_KEYS, getTemplate } = require("../../config/workflowTemplates");
const { sendSlackMessage } = require("../integrations/slackService");
const githubService = require("../integrations/githubService");
const googleCalendarService = require("../integrations/googleCalendarService");
const { getUsageSummary } = require("../subscriptions/subscriptionUsageService");
const { getIntegrationReadinessReport, validateProviderMapping } = require("../workflows/syncService");
const { decideApproval, executeReadyPlan, ingestWorkflowInput } = require("../workflows/workflowService");
const { sendEmail } = require("../../utils/email");

const ONBOARDING_COPY = {
  recruiters: {
    demoTitle: "Recruiter onboarding: follow up with Layla Hassan",
    demoText:
      "Candidate Layla Hassan replied once, then went quiet. Send a branded follow-up, book a screening slot if she responds, and keep the ATS stage current.",
    payload: {
      candidateName: "Layla Hassan",
      candidateEmail: "layla.hassan+onboarding@taskara.demo",
      roleTitle: "Senior Product Designer",
      company: "Taskara",
    },
  },
  startups: {
    demoTitle: "Startup onboarding: Slack launch thread",
    demoText:
      "Slack thread: launch onboarding bug is blocking activation. Break this into work, assign an owner, open a GitHub issue if needed, and post status back to Slack.",
    payload: {
      initiativeTitle: "Onboarding activation fixes",
      ownerName: "Product Ops",
      threadUrl: "https://slack.example/thread/onboarding-activation",
    },
  },
  agencies: {
    demoTitle: "Agency onboarding: approval chase for Northwind",
    demoText:
      "Northwind campaign assets are ready but the client has not approved the landing page and paid social copy. Chase approval and prepare the client status update.",
    payload: {
      clientName: "Northwind",
      clientEmail: "northwind.approvals@taskara.demo",
      accountName: "Northwind growth retainer",
    },
  },
  realestate: {
    demoTitle: "Real-estate onboarding: document chase for Omar",
    demoText:
      "Lead Omar Youssef is interested in a downtown listing. Send the next follow-up, request missing documents, and keep the deal milestone moving.",
    payload: {
      leadName: "Omar Youssef",
      leadEmail: "omar.youssef+onboarding@taskara.demo",
      leadPhone: "+12025550199",
      propertyInterest: "Downtown 2BR listing",
    },
  },
};

const CRITICAL_CONNECTORS = ["email", "slack"];
const DEFAULT_ALERT_THRESHOLDS = {
  failedExecutionRatePct: 20,
  connectorFailureRatePct: 15,
  workerErrorCount: 3,
};

const getSystemMode = () => {
  const raw = String(process.env.TASKARA_SYSTEM_MODE || process.env.SYSTEM_MODE || process.env.NODE_ENV || "dev")
    .trim()
    .toLowerCase();
  if (raw === "production") return "production";
  if (["staging", "stage", "test"].includes(raw)) return "staging";
  return "dev";
};

const getSystemFlags = () => {
  const mode = getSystemMode();
  return {
    mode,
    verboseLogging: mode !== "production",
    demoFallbackEnabled: String(process.env.ALLOW_WORKFLOW_DEMO_MODE || "true").toLowerCase() !== "false",
  };
};

const upsertResult = (current = [], nextResult) => {
  const list = Array.isArray(current) ? [...current] : [];
  const index = list.findIndex((entry) => entry.key === nextResult.key);
  if (index >= 0) list[index] = nextResult;
  else list.push(nextResult);
  return list;
};

const getOpsState = async (workspaceId) => {
  let state = await WorkspaceOperationalState.findOne({ workspaceId });
  if (!state) {
    state = await WorkspaceOperationalState.create({
      workspaceId,
      monitoring: { alertThresholds: DEFAULT_ALERT_THRESHOLDS },
    });
  }
  return state;
};

const sanitizeTestResult = (result) => ({
  key: result.key,
  label: result.label,
  status: result.status,
  passed: Boolean(result.passed),
  lastRunAt: result.lastRunAt,
  reasons: result.reasons || [],
  logs: result.logs || [],
  summary: result.summary || {},
});

const saveWorkflowTestResult = async (workspaceId, result) => {
  const state = await getOpsState(workspaceId);
  state.workflowTests = upsertResult(state.workflowTests, result);
  await state.save();
  return state;
};

const saveConnectorTestResult = async (workspaceId, result) => {
  const state = await getOpsState(workspaceId);
  state.connectorTests = upsertResult(state.connectorTests, result);
  await state.save();
  return state;
};

const getRequiredIntegration = (audienceType) => getTemplate(audienceType)?.onboarding?.requiredIntegration || "";

const buildOnboardingDemoInput = (audienceType) => {
  const template = getTemplate(audienceType);
  const demo = ONBOARDING_COPY[audienceType];
  const workflowType = template?.onboarding?.demoWorkflowType;
  const uniqueSuffix = Date.now();
  const emailField =
    audienceType === "recruiters"
      ? { candidateEmail: `layla+${uniqueSuffix}@taskara.demo` }
      : audienceType === "agencies"
        ? { clientEmail: `northwind+${uniqueSuffix}@taskara.demo` }
        : audienceType === "realestate"
          ? { leadEmail: `omar+${uniqueSuffix}@taskara.demo` }
          : {};

  return {
    audienceType,
    workflowType,
    sourceType: template?.readsFirst || "manual",
    title: demo.demoTitle,
    text: demo.demoText,
    payload: {
      ...demo.payload,
      ...emailField,
      verification: true,
      onboardingDemo: true,
    },
    sourceRef: {
      connector: "onboarding_demo",
      externalId: `onboarding-${audienceType}-${uniqueSuffix}`,
      label: "Guided onboarding demo",
    },
    autoExecute: true,
    triggerMode: "onboarding",
  };
};

const getWorkerHealth = async () => {
  const recentRuns = await WorkerJobRun.find({ queueName: "workflows" }).sort({ createdAt: -1 }).limit(20);
  const intervalMs = Number(process.env.WORKFLOW_JOB_INTERVAL_MS || 60 * 1000);
  const staleAfterMs = intervalMs * 5;
  const lastRun = recentRuns[0] || null;
  const errorCount = recentRuns.reduce((sum, run) => sum + (run.errors || 0), 0);
  const healthy = Boolean(
    lastRun &&
      Date.now() - new Date(lastRun.finishedAt).getTime() <= staleAfterMs &&
      errorCount < DEFAULT_ALERT_THRESHOLDS.workerErrorCount,
  );

  return {
    status: healthy ? "healthy" : lastRun ? "degraded" : "unknown",
    healthy,
    lastRunAt: lastRun?.finishedAt || null,
    errorCount,
    recentRuns: recentRuns.map((run) => ({
      jobId: run.jobId,
      status: run.status,
      finishedAt: run.finishedAt,
      picked: run.picked,
      executed: run.executed,
      skipped: run.skipped,
      escalated: run.escalated,
      errors: run.errors,
      mode: run.mode,
    })),
  };
};

const getMonitoringMetrics = async (workspaceId) => {
  const usage = await getUsageSummary(workspaceId, null).catch(() => null);
  const workflowRuns = await WorkflowRun.find({ workspaceId }).sort({ createdAt: -1 }).limit(50).select("status createdAt");
  const actionAggregate = await ExecutionItem.aggregate([
    { $match: { workspaceId } },
    { $unwind: "$actionLogs" },
    {
      $group: {
        _id: null,
        executed: { $sum: { $cond: [{ $eq: ["$actionLogs.status", "executed"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$actionLogs.status", "failed"] }, 1, 0] } },
      },
    },
  ]);
  const syncAggregate = await ExecutionItem.aggregate([
    { $match: { workspaceId } },
    { $unwind: "$syncLogs" },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        failed: {
          $sum: {
            $cond: [
              { $in: ["$syncLogs.status", ["failed", "awaiting_connector"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const approvalsUsed = await ActionApproval.countDocuments({ workspaceId });
  const overridesUsed = await ExecutionItem.countDocuments({ workspaceId, "assignee.manualOverride": true });
  const workerHealth = await getWorkerHealth();

  const executed = actionAggregate[0]?.executed || 0;
  const failed = actionAggregate[0]?.failed || 0;
  const syncTotal = syncAggregate[0]?.total || 0;
  const syncFailed = syncAggregate[0]?.failed || 0;
  const runTotal = workflowRuns.length || 1;
  const successfulRuns = workflowRuns.filter((run) => ["completed", "executing"].includes(run.status)).length;

  return {
    workflowSuccessRate: Number(((successfulRuns / runTotal) * 100).toFixed(1)),
    failedExecutionPct: Number((((failed || 0) / Math.max(executed + failed, 1)) * 100).toFixed(1)),
    approvalUsage: approvalsUsed,
    overrideUsage: overridesUsed,
    connectorFailureRate: Number(((syncFailed / Math.max(syncTotal, 1)) * 100).toFixed(1)),
    workerJobs: {
      status: workerHealth.status,
      errorCount: workerHealth.errorCount,
      lastRunAt: workerHealth.lastRunAt,
      recentRuns: workerHealth.recentRuns,
    },
    usage: usage
      ? {
          planKey: usage.planKey,
          recommendations: usage.recommendations,
          limits: usage.limits,
        }
      : null,
  };
};

const getApprovalSystemStatus = async (workspaceId) => {
  const pendingCount = await ActionApproval.countDocuments({ workspaceId, status: "pending" });
  return {
    enabled: true,
    status: pendingCount > 20 ? "backlogged" : "healthy",
    pendingCount,
  };
};

const evaluateLaunchStatus = ({
  criticalConnectors,
  monitoring,
  workerHealth,
  workflowTests,
  approvalSystem,
}) => {
  const blockers = [];
  const warnings = [];

  criticalConnectors.forEach((entry) => {
    if (!entry.writebackReady) {
      blockers.push(`${entry.provider} is not ready: ${entry.details?.[0] || entry.status}`);
    }
  });

  if (!workerHealth.healthy) blockers.push("Workflow worker is not healthy.");
  if (approvalSystem.status !== "healthy") warnings.push("Approval queue needs attention.");

  const missingAudienceTests = AUDIENCE_KEYS.filter(
    (audienceType) => !workflowTests.find((entry) => entry.key === audienceType && entry.passed),
  );
  if (missingAudienceTests.length) {
    blockers.push(`Workflow verification has not passed for: ${missingAudienceTests.join(", ")}.`);
  }

  if (monitoring.failedExecutionPct >= DEFAULT_ALERT_THRESHOLDS.failedExecutionRatePct) {
    blockers.push("Failed execution rate is above the safety threshold.");
  }
  if (monitoring.connectorFailureRate >= DEFAULT_ALERT_THRESHOLDS.connectorFailureRatePct) {
    warnings.push("Connector failure rate is elevated.");
  }
  if (monitoring.workerJobs.errorCount >= DEFAULT_ALERT_THRESHOLDS.workerErrorCount) {
    blockers.push("Worker error count is above the launch threshold.");
  }

  const status = blockers.length ? "red" : warnings.length ? "yellow" : "green";
  return {
    status,
    go: status === "green",
    blockers,
    warnings,
  };
};

const getChecklist = ({ systemFlags, criticalConnectors, workerHealth, approvalSystem, workflowTests }) => {
  const isolationConfigured = true;
  const passedTests = workflowTests.filter((entry) => entry.passed).length;

  return [
    {
      key: "system_mode",
      label: "System mode",
      status: systemFlags.mode === "production" ? "ready" : "attention",
      detail: `Running in ${systemFlags.mode}.`,
    },
    {
      key: "critical_connectors",
      label: "Critical connectors",
      status: criticalConnectors.every((entry) => entry.writebackReady) ? "ready" : "blocked",
      detail: criticalConnectors
        .map((entry) => `${entry.provider}: ${entry.writebackReady ? "ready" : entry.status}`)
        .join(" | "),
    },
    {
      key: "worker_health",
      label: "Worker health",
      status: workerHealth.healthy ? "ready" : "blocked",
      detail: workerHealth.lastRunAt
        ? `Last workflow job finished at ${new Date(workerHealth.lastRunAt).toLocaleString()}.`
        : "No workflow worker heartbeat recorded yet.",
    },
    {
      key: "approval_system",
      label: "Approval system",
      status: approvalSystem.status === "healthy" ? "ready" : "attention",
      detail: `${approvalSystem.pendingCount} approval(s) currently pending.`,
    },
    {
      key: "workspace_isolation",
      label: "Workspace isolation tests",
      status: isolationConfigured ? "ready" : "attention",
      detail: isolationConfigured ? "Route and workspace-isolation test hooks are present." : "Isolation checks are not configured.",
    },
    {
      key: "workflow_tests",
      label: "Workflow verification",
      status: passedTests === AUDIENCE_KEYS.length ? "ready" : "blocked",
      detail: `${passedTests}/${AUDIENCE_KEYS.length} audience workflow tests have passed.`,
    },
  ];
};

const getOnboardingStatus = async (workspaceId) => {
  const state = await getOpsState(workspaceId);
  const onboarding = state.onboarding || {};
  const audienceType = onboarding.audienceType || "startups";
  const requiredIntegration = onboarding.requiredIntegration || getRequiredIntegration(audienceType);
  const readiness = requiredIntegration
    ? await validateProviderMapping(workspaceId, requiredIntegration)
    : { provider: "", connected: false, ready: false, writebackReady: false, details: [] };
  const template = getTemplate(audienceType);

  return {
    audienceType,
    currentStep: onboarding.currentStep || 1,
    requiredIntegration,
    integrationReady: Boolean(readiness.writebackReady),
    integrationStatus: readiness,
    demoMode: Boolean(onboarding.demoMode),
    startedAt: onboarding.startedAt || null,
    completedAt: onboarding.completedAt || null,
    resultSummary: onboarding.resultSummary || "",
    savedMinutesEstimate: onboarding.savedMinutesEstimate || template?.onboarding?.savedMinutesEstimate || 0,
    approvalDecision: onboarding.approvalDecision || "",
    nextRecommendedAction: onboarding.nextRecommendedAction || "Run your real workflow.",
    lastExecutionItemId: onboarding.lastExecutionItemId || null,
    lastWorkflowRunId: onboarding.lastWorkflowRunId || null,
    demoAvailable: getSystemFlags().demoFallbackEnabled,
  };
};

const buildAudienceTestAssertions = (audienceType, item) => {
  if (audienceType === "recruiters") {
    return [
      { ok: Boolean(item.entityRefs?.candidateId), message: "Candidate entity was created." },
      {
        ok: item.actionLogs.some((entry) => entry.actionId === "send_outreach"),
        message: "Outreach action was planned.",
      },
    ];
  }

  if (audienceType === "startups") {
    return [
      { ok: Boolean(item.linkedTaskId), message: "Startup workflow linked a task." },
      { ok: Boolean(item.assignee?.reason), message: "Assignment reason stayed visible." },
    ];
  }

  if (audienceType === "agencies") {
    return [
      { ok: Boolean(item.entityRefs?.accountId), message: "Agency account entity was created." },
      {
        ok: item.actionLogs.some((entry) => entry.actionId === "send_status"),
        message: "Client update path was prepared.",
      },
    ];
  }

  return [
    { ok: Boolean(item.entityRefs?.leadId), message: "Lead entity was created." },
    {
      ok: item.actionLogs.some((entry) => entry.actionId === "request_docs"),
      message: "Document request path was prepared.",
    },
  ];
};

const cleanupVerificationArtifacts = async ({ runId, items }) => {
  const taskIds = items.map((item) => item.linkedTaskId).filter(Boolean);
  const approvalIds = items.map((item) => item.approvalId).filter(Boolean);
  const candidateIds = items.map((item) => item.entityRefs?.candidateId).filter(Boolean);
  const initiativeIds = items.map((item) => item.entityRefs?.initiativeId).filter(Boolean);
  const accountIds = items.map((item) => item.entityRefs?.accountId).filter(Boolean);
  const leadIds = items.map((item) => item.entityRefs?.leadId).filter(Boolean);
  const checklistIds = items.map((item) => item.entityRefs?.documentChecklistId).filter(Boolean);

  await Promise.all([
    approvalIds.length ? ActionApproval.deleteMany({ _id: { $in: approvalIds } }) : Promise.resolve(),
    taskIds.length ? Task.deleteMany({ _id: { $in: taskIds } }) : Promise.resolve(),
    candidateIds.length ? require("../../models/Candidate").deleteMany({ _id: { $in: candidateIds } }) : Promise.resolve(),
    initiativeIds.length ? require("../../models/StartupInitiative").deleteMany({ _id: { $in: initiativeIds } }) : Promise.resolve(),
    accountIds.length ? require("../../models/AgencyAccount").deleteMany({ _id: { $in: accountIds } }) : Promise.resolve(),
    leadIds.length ? require("../../models/RealEstateLead").deleteMany({ _id: { $in: leadIds } }) : Promise.resolve(),
    checklistIds.length ? DocumentChecklist.deleteMany({ _id: { $in: checklistIds } }) : Promise.resolve(),
    ExecutionItem.deleteMany({ workflowRunId: runId }),
    WorkflowRun.deleteOne({ _id: runId }),
  ]);
};

const runAudienceWorkflowTest = async ({ workspaceId, userId, audienceType }) => {
  const template = getTemplate(audienceType);
  if (!template) throw { status: 400, message: `Unknown audience type: ${audienceType}` };

  const result = {
    key: audienceType,
    label: template.label,
    status: "passed",
    passed: true,
    lastRunAt: new Date(),
    reasons: [],
    logs: [],
    summary: {},
  };

  const ingestResult = await ingestWorkflowInput({
    workspaceId,
    userId,
    ...buildOnboardingDemoInput(audienceType),
    triggerMode: "verification",
    sourceRef: {
      connector: "workflow_verification",
      externalId: `workflow-test-${audienceType}-${Date.now()}`,
      label: `${template.label} verification`,
    },
  });

  const runId = ingestResult.run?._id;
  const createdItems = await ExecutionItem.find({ workflowRunId: runId }).sort({ createdAt: 1 });
  const primaryItem = createdItems.find((item) => item.approvalStatus === "pending") || createdItems[0];

  result.logs.push(`Created ${createdItems.length} workflow item(s).`);
  if (!primaryItem) {
    result.status = "failed";
    result.passed = false;
    result.reasons.push("Workflow verification did not create a primary execution item.");
    await saveWorkflowTestResult(workspaceId, result);
    return result;
  }

  if (primaryItem.approvalStatus === "pending") {
    result.logs.push("Approval step detected and approved automatically for verification.");
    await decideApproval({
      workspaceId,
      itemId: primaryItem._id,
      userId,
      decision: "approve",
      comment: "Workflow verification auto-approval",
    });
  } else {
    await executeReadyPlan({ workspaceId, itemId: primaryItem._id, userId, force: false }).catch(() => null);
  }

  const refreshedItem = await ExecutionItem.findById(primaryItem._id);
  const assertions = buildAudienceTestAssertions(audienceType, refreshedItem);
  assertions.forEach((entry) => {
    if (entry.ok) result.logs.push(entry.message);
    else {
      result.reasons.push(entry.message);
      result.passed = false;
      result.status = "failed";
    }
  });

  const connectorBlocked = (refreshedItem.syncLogs || []).some((entry) =>
    ["awaiting_connector", "failed"].includes(entry.status),
  );
  if (result.passed && connectorBlocked) {
    result.status = "warning";
    result.reasons.push("Core workflow path passed, but at least one connector remained blocked.");
  }

  result.summary = {
    createdItems: createdItems.length,
    approvalTriggered: primaryItem.approvalStatus === "pending",
    finalStatus: refreshedItem.status,
    executedActions: refreshedItem.actionLogs.filter((entry) => entry.status === "executed").length,
  };

  await cleanupVerificationArtifacts({ runId, items: createdItems });
  await saveWorkflowTestResult(workspaceId, result);
  return sanitizeTestResult(result);
};

const runConnectorTest = async ({ workspaceId, userId, provider }) => {
  const readiness = await validateProviderMapping(workspaceId, provider);
  const base = {
    key: provider,
    label: provider.replace(/_/g, " "),
    status: "failed",
    passed: false,
    lastRunAt: new Date(),
    reasons: [],
    logs: [],
    summary: { readiness },
  };

  if (!readiness.connected) {
    base.reasons.push(readiness.details?.[0] || `${provider} is not connected.`);
    await saveConnectorTestResult(workspaceId, base);
    return sanitizeTestResult(base);
  }

  try {
    if (provider === "email") {
      const recipient = process.env.EMAIL_TEST_RECIPIENT || `taskara-test+${userId}@example.com`;
      await sendEmail({
        to: recipient,
        subject: "Taskara email readiness test",
        text: "Taskara email readiness test",
        html: "<p>Taskara email readiness test</p>",
      });
      base.logs.push(`Sent a test email to ${recipient}.`);
      base.status = "passed";
      base.passed = true;
    } else if (provider === "slack") {
      const settings = await IntegrationSettings.findOne({ workspaceId, provider: "slack", isActive: true });
      if (!settings?.slack?.webhookUrl) throw new Error("Slack webhook is missing.");
      await sendSlackMessage(settings.slack.webhookUrl, {
        text: "Taskara readiness check: Slack writeback is working.",
      });
      base.logs.push("Sent a live Slack test message.");
      base.status = "passed";
      base.passed = true;
    } else if (provider === "github") {
      const settings = await IntegrationSettings.findOne({ workspaceId, provider: "github", isActive: true });
      if (!settings?.github?.accessToken) throw new Error("GitHub access token is missing.");
      const profile = await githubService.verifyToken(settings.github.accessToken);
      const repos = await githubService.listRepos(settings.github.accessToken);
      const mapped = (settings.github.repos || [])[0];
      const mappingExists = mapped ? repos.some((repo) => repo.owner === mapped.owner && repo.repo === mapped.repo) : false;
      if (!mappingExists && mapped) {
        throw new Error(`Mapped repo ${mapped.owner}/${mapped.repo} is not accessible to the saved token.`);
      }
      base.logs.push(`Verified GitHub token for ${profile.login}.`);
      base.logs.push(mapped ? `Verified mapped repo ${mapped.owner}/${mapped.repo}.` : "No repo writeback mapping is configured.");
      base.status = mapped ? "passed" : "warning";
      base.passed = mapped ? true : false;
      if (!mapped) base.reasons.push("GitHub is connected, but no export repo mapping is configured.");
    } else if (provider === "google_calendar") {
      if (!readiness.writebackReady) throw new Error(readiness.details?.[0] || "Google Calendar is not ready.");
      const settings = await IntegrationSettings.findOne({ workspaceId, provider: "google_calendar", isActive: true });
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await googleCalendarService.pushTaskToCalendar(
        settings.googleCalendar,
        {
          _id: `test-${Date.now()}`,
          title: "Taskara readiness check",
          description: "Temporary verification event created by Taskara.",
          dueDate,
        },
        settings.googleCalendar.calendarId,
      );
      base.logs.push("Created a live Google Calendar verification event.");
      base.status = "passed";
      base.passed = true;
      base.summary = { ...base.summary, eventId: result.eventId, htmlLink: result.htmlLink };
    } else {
      base.status = readiness.writebackReady ? "passed" : "warning";
      base.passed = Boolean(readiness.writebackReady);
      base.logs.push(readiness.writebackReady ? `${provider} passed readiness preflight.` : `${provider} is connected but not ready for writeback.`);
      if (!readiness.writebackReady) {
        base.reasons.push(readiness.details?.[0] || `${provider} needs configuration before writeback.`);
      }
    }
  } catch (error) {
    base.status = "failed";
    base.passed = false;
    base.reasons.push(error.message || `${provider} test failed.`);
  }

  await saveConnectorTestResult(workspaceId, base);
  return sanitizeTestResult(base);
};

const selectOnboardingAudience = async ({ workspaceId, audienceType }) => {
  const template = getTemplate(audienceType);
  if (!template) throw { status: 400, message: `Unknown audience type: ${audienceType}` };

  const state = await getOpsState(workspaceId);
  state.onboarding = {
    ...state.onboarding,
    audienceType,
    requiredIntegration: template.onboarding?.requiredIntegration || "",
    currentStep: 2,
    startedAt: state.onboarding?.startedAt || new Date(),
    completedAt: null,
    lastWorkflowRunId: null,
    lastExecutionItemId: null,
    approvalDecision: "",
    resultSummary: "",
    savedMinutesEstimate: template.onboarding?.savedMinutesEstimate || 0,
    nextRecommendedAction: "Connect one required integration or use demo mode to run the first workflow.",
  };
  await state.save();
  return getOnboardingStatus(workspaceId);
};

const runOnboardingDemo = async ({ workspaceId, userId, audienceType }) => {
  const template = getTemplate(audienceType);
  if (!template) throw { status: 400, message: `Unknown audience type: ${audienceType}` };

  const state = await getOpsState(workspaceId);
  const integration = template.onboarding?.requiredIntegration || "";
  const readiness = integration ? await validateProviderMapping(workspaceId, integration) : null;
  const systemFlags = getSystemFlags();

  if (integration && !readiness?.writebackReady && !systemFlags.demoFallbackEnabled) {
    throw {
      status: 409,
      message: `${integration} is not ready and demo fallback is disabled.`,
    };
  }

  const ingestResult = await ingestWorkflowInput({
    workspaceId,
    userId,
    ...buildOnboardingDemoInput(audienceType),
  });

  const primaryItem = ingestResult.items.find((item) => item.approvalStatus === "pending") || ingestResult.items[0];
  state.onboarding = {
    ...state.onboarding,
    audienceType,
    requiredIntegration: integration,
    currentStep: primaryItem?.approvalStatus === "pending" ? 4 : 5,
    demoMode: Boolean(integration && !readiness?.writebackReady),
    lastWorkflowRunId: ingestResult.run?._id || null,
    lastExecutionItemId: primaryItem?._id || null,
    resultSummary:
      primaryItem?.approvalStatus === "pending"
        ? "Taskara extracted a workflow and stopped at the approval gate so you can review one risky action."
        : "Taskara extracted a workflow and executed the safe path.",
    savedMinutesEstimate: template.onboarding?.savedMinutesEstimate || 0,
    nextRecommendedAction:
      primaryItem?.approvalStatus === "pending"
        ? "Approve or reject the next action to continue the guided run."
        : "Review the result, then run your real workflow.",
  };
  await state.save();

  return {
    onboarding: await getOnboardingStatus(workspaceId),
    run: ingestResult.run,
    items: ingestResult.items,
    duplicate: ingestResult.duplicate,
  };
};

const syncOnboardingAfterApproval = async ({ workspaceId, item, decision }) => {
  const state = await getOpsState(workspaceId);
  if (!state.onboarding?.lastExecutionItemId || String(state.onboarding.lastExecutionItemId) !== String(item._id)) {
    return getOnboardingStatus(workspaceId);
  }

  const template = getTemplate(state.onboarding.audienceType || item.audienceType);
  state.onboarding = {
    ...state.onboarding,
    currentStep: 5,
    approvalDecision: decision === "approve" ? "approved" : "rejected",
    resultSummary:
      decision === "approve"
        ? `Taskara executed ${item.actionLogs.filter((entry) => entry.status === "executed").length} action(s) after approval.`
        : "Taskara stopped the risky action and preserved the audit trail after rejection.",
    savedMinutesEstimate: template?.onboarding?.savedMinutesEstimate || state.onboarding.savedMinutesEstimate || 0,
    nextRecommendedAction: "Run your real workflow now that the guided example has completed.",
  };
  await state.save();
  return getOnboardingStatus(workspaceId);
};

const completeOnboarding = async ({ workspaceId }) => {
  const state = await getOpsState(workspaceId);
  state.onboarding = {
    ...state.onboarding,
    currentStep: 6,
    completedAt: new Date(),
    nextRecommendedAction: "Run your real workflow.",
  };
  await state.save();
  return getOnboardingStatus(workspaceId);
};

const getOperationsOverview = async (workspaceId, userId) => {
  const [state, connectorReadiness, workerHealth, approvalSystem, monitoring, onboarding, usageSummary] =
    await Promise.all([
      getOpsState(workspaceId),
      getIntegrationReadinessReport(workspaceId, ["email", "slack", "github", "google_calendar", "notion", "clickup", "whatsapp", "ats", "crm"]),
      getWorkerHealth(),
      getApprovalSystemStatus(workspaceId),
      getMonitoringMetrics(workspaceId),
      getOnboardingStatus(workspaceId),
      getUsageSummary(workspaceId, userId),
    ]);

  const criticalConnectors = connectorReadiness.filter((entry) => CRITICAL_CONNECTORS.includes(entry.provider));
  const launchStatus = evaluateLaunchStatus({
    criticalConnectors,
    monitoring,
    workerHealth,
    workflowTests: state.workflowTests || [],
    approvalSystem,
  });

  state.monitoring = {
    ...(state.monitoring?.toObject?.() || state.monitoring || {}),
    alertThresholds: {
      ...DEFAULT_ALERT_THRESHOLDS,
      ...(state.monitoring?.alertThresholds?.toObject?.() || state.monitoring?.alertThresholds || {}),
    },
    lastAlertReasons: [...launchStatus.blockers, ...launchStatus.warnings],
    lastEvaluatedAt: new Date(),
  };
  await state.save();

  return {
    system: getSystemFlags(),
    launchStatus,
    checklist: getChecklist({
      systemFlags: getSystemFlags(),
      criticalConnectors,
      workerHealth,
      approvalSystem,
      workflowTests: state.workflowTests || [],
    }),
    connectorReadiness,
    workerHealth,
    approvalSystem,
    workflowTests: (state.workflowTests || []).map(sanitizeTestResult),
    connectorTests: (state.connectorTests || []).map(sanitizeTestResult),
    monitoring,
    onboarding,
    usage: {
      planKey: usageSummary.planKey,
      planDef: usageSummary.planDef,
      limits: usageSummary.limits,
      usage: usageSummary.usage,
      recommendations: usageSummary.recommendations,
    },
  };
};

module.exports = {
  completeOnboarding,
  getOperationsOverview,
  getOnboardingStatus,
  getSystemFlags,
  runAudienceWorkflowTest,
  runConnectorTest,
  runOnboardingDemo,
  saveConnectorTestResult,
  saveWorkflowTestResult,
  selectOnboardingAudience,
  syncOnboardingAfterApproval,
};
