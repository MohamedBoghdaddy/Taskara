const ActionApproval = require("../../models/ActionApproval");
const ExecutionItem = require("../../models/ExecutionItem");
const IntegrationSettings = require("../../models/IntegrationSettings");
const Subscription = require("../../models/Subscription");
const WorkflowRun = require("../../models/WorkflowRun");
const { PLANS } = require("../../models/Subscription");

const LEGACY_PLAN_ALIASES = {
  ai: "enterprise",
};

const getUsageWindowStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

const normalizePlanKey = (plan) => LEGACY_PLAN_ALIASES[plan] || plan || "free";

const getPlanDef = (plan) => {
  const normalized = normalizePlanKey(plan);
  return PLANS[normalized] || PLANS.free;
};

const getVisiblePlans = () =>
  Object.entries(PLANS)
    .filter(([key]) => key !== "ai")
    .map(([key, value]) => ({
      key,
      ...value,
    }));

const getOrCreateSubscription = async (workspaceId, userId) => {
  let subscription = await Subscription.findOne({ workspaceId });
  if (!subscription) {
    if (!userId) return null;
    subscription = await Subscription.create({
      workspaceId,
      userId,
      plan: "free",
      status: "active",
    });
  }
  return subscription;
};

const getUsageSnapshot = async (workspaceId) => {
  const usageWindowStart = getUsageWindowStart();
  const [workflowRuns, integrationCount, actionAggregate, pendingApprovals, manualOverrides] = await Promise.all([
    WorkflowRun.countDocuments({ workspaceId, createdAt: { $gte: usageWindowStart } }),
    IntegrationSettings.countDocuments({ workspaceId, isActive: true }),
    ExecutionItem.aggregate([
      { $match: { workspaceId } },
      { $unwind: "$actionLogs" },
      {
        $match: {
          "actionLogs.status": "executed",
          "actionLogs.executedAt": { $gte: usageWindowStart },
        },
      },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    ActionApproval.countDocuments({ workspaceId, createdAt: { $gte: usageWindowStart } }),
    ExecutionItem.countDocuments({
      workspaceId,
      "assignee.manualOverride": true,
      updatedAt: { $gte: usageWindowStart },
    }),
  ]);

  return {
    usageWindowStart,
    workflowsExecuted: workflowRuns,
    actionsExecuted: actionAggregate[0]?.count || 0,
    integrationsConnected: integrationCount,
    approvalsUsed: pendingApprovals,
    assignmentOverrides: manualOverrides,
  };
};

const withLimitStatus = (used, limit) => ({
  used,
  limit,
  unlimited: limit === -1,
  remaining: limit === -1 ? -1 : Math.max(limit - used, 0),
  percent: limit === -1 || limit === 0 ? 0 : Math.min(Math.round((used / limit) * 100), 999),
});

const getUsageSummary = async (workspaceId, userId) => {
  const subscription = await getOrCreateSubscription(workspaceId, userId);
  const planKey = normalizePlanKey(subscription?.plan || "free");
  const planDef = getPlanDef(planKey);
  const usage = await getUsageSnapshot(workspaceId);

  const limits = {
    workflowsExecuted: withLimitStatus(usage.workflowsExecuted, planDef.workflowLimit || -1),
    actionsExecuted: withLimitStatus(usage.actionsExecuted, planDef.actionLimit || -1),
    integrationsConnected: withLimitStatus(usage.integrationsConnected, planDef.integrationLimit || -1),
  };

  const recommendations = [];
  if (!limits.workflowsExecuted.unlimited && limits.workflowsExecuted.percent >= 80) {
    recommendations.push("Workflow volume is close to the current monthly limit.");
  }
  if (!limits.actionsExecuted.unlimited && limits.actionsExecuted.percent >= 80) {
    recommendations.push("Executed action volume is close to the current monthly limit.");
  }
  if (!limits.integrationsConnected.unlimited && limits.integrationsConnected.percent >= 100) {
    recommendations.push("Integration capacity is exhausted for the current plan.");
  }

  return {
    subscription,
    planKey,
    planDef,
    usage,
    limits,
    recommendations,
  };
};

const throwUsageLimit = (message, code, details) => {
  throw {
    status: 402,
    message,
    code,
    details,
  };
};

const assertWorkflowCreationAllowed = async (workspaceId, userId) => {
  const summary = await getUsageSummary(workspaceId, userId);
  if (!summary.limits.workflowsExecuted.unlimited && summary.limits.workflowsExecuted.used >= summary.limits.workflowsExecuted.limit) {
    throwUsageLimit("Monthly workflow limit reached for this workspace.", "WORKFLOW_LIMIT_REACHED", summary);
  }
  return summary;
};

const assertActionExecutionAllowed = async (workspaceId, userId) => {
  const summary = await getUsageSummary(workspaceId, userId);
  if (!summary.limits.actionsExecuted.unlimited && summary.limits.actionsExecuted.used >= summary.limits.actionsExecuted.limit) {
    throwUsageLimit("Monthly action limit reached for this workspace.", "ACTION_LIMIT_REACHED", summary);
  }
  return summary;
};

const assertIntegrationConnectionAllowed = async (workspaceId, userId, provider) => {
  const summary = await getUsageSummary(workspaceId, userId);
  const existing = await IntegrationSettings.findOne({ workspaceId, provider, isActive: true }).select("_id");
  if (!existing && !summary.limits.integrationsConnected.unlimited && summary.limits.integrationsConnected.used >= summary.limits.integrationsConnected.limit) {
    throwUsageLimit("Integration limit reached for this workspace.", "INTEGRATION_LIMIT_REACHED", summary);
  }
  return summary;
};

module.exports = {
  assertActionExecutionAllowed,
  assertIntegrationConnectionAllowed,
  assertWorkflowCreationAllowed,
  getOrCreateSubscription,
  getPlanDef,
  getUsageSnapshot,
  getUsageSummary,
  getVisiblePlans,
  normalizePlanKey,
};
