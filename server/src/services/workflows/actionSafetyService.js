const Candidate = require("../../models/Candidate");
const RealEstateLead = require("../../models/RealEstateLead");
const { clamp, getTemplate } = require("./helpers");
const { getEntityId } = require("./entityLinkService");
const { validateProviderMapping } = require("./syncService");
const { applyWorkflowPolicyToSafety } = require("./workflowPolicyService");

const RISK_WEIGHT = { low: 1, medium: 2, high: 3 };

const getActionConfig = (item, actionId) => getTemplate(item.audienceType)?.actionCatalog?.[actionId] || null;

const getActionLog = (item, actionId) => item.actionLogs.find((entry) => entry.actionId === actionId) || null;

const resolveRecipientContext = async (item) => {
  const payload = item.sourceContext?.payload || {};
  if (payload.recipientEmail || payload.clientEmail || payload.candidateEmail || payload.leadEmail || payload.email) {
    return {
      email:
        payload.recipientEmail ||
        payload.clientEmail ||
        payload.candidateEmail ||
        payload.leadEmail ||
        payload.email ||
        "",
      name:
        payload.recipientName ||
        payload.clientName ||
        payload.candidateName ||
        payload.leadName ||
        payload.name ||
        "",
      source: "payload",
    };
  }

  const candidateId = getEntityId(item, "candidate");
  if (candidateId) {
    const candidate = await Candidate.findById(candidateId).select("email name");
    if (candidate?.email) {
      return { email: candidate.email, name: candidate.name || "", source: "candidate" };
    }
  }

  const leadId = getEntityId(item, "lead");
  if (leadId) {
    const lead = await RealEstateLead.findById(leadId).select("email name");
    if (lead?.email) {
      return { email: lead.email, name: lead.name || "", source: "lead" };
    }
  }

  return { email: "", name: "", source: "missing" };
};

const deriveRiskLevel = (score, hardStops = []) => {
  if (hardStops.includes("missing_target") || hardStops.includes("missing_recipient")) return "high";
  if (score <= 54) return "high";
  if (score <= 74) return "medium";
  return "low";
};

const summarizeReasons = (reasons) => reasons.filter(Boolean).slice(0, 4);

const evaluateActionSafety = async ({ item, actionId }) => {
  const action = getActionConfig(item, actionId);
  const log = getActionLog(item, actionId);
  if (!action || !log) {
    return {
      confidenceScore: 35,
      riskLevel: "high",
      reasons: ["Taskara could not find a valid action configuration for this step."],
      approvalForced: true,
      approvalRecommended: false,
    };
  }

  const reasons = [];
  const hardStops = [];
  let score = 92;

  if (action.risky) {
    score -= 16;
    reasons.push(`${action.label} is marked as a risky external action.`);
  }

  if (action.requiresApproval) {
    score -= 8;
    reasons.push("This step is configured to stop for operator review.");
  }

  const rawText = String(item.sourceContext?.rawText || "");
  if (rawText.trim().length < 40) {
    score -= 10;
    reasons.push("Source context is short, so Taskara has less evidence for this step.");
  }

  if (!item.sourceRef?.externalId && !item.sourceRef?.threadId && !item.sourceRef?.url) {
    score -= 7;
    reasons.push("The source reference is weak, so traceability is lower than normal.");
  }

  if (!item.assignee?.userId && ["assign_owner", "assign_internal", "group_initiative"].includes(actionId)) {
    score -= 22;
    hardStops.push("missing_target");
    reasons.push("No assignee is confirmed for an ownership-sensitive step.");
  } else if (!item.assignee?.reason) {
    score -= 6;
    reasons.push("Assignment reasoning is sparse for this item.");
  }

  if (item.sourceContext?.payload?.onboardingDemo || item.sourceContext?.payload?.verification) {
    score -= 8;
    reasons.push("This run is using demo or verification context rather than a live production input.");
  }

  if (action.channel === "email") {
    const recipient = await resolveRecipientContext(item);
    if (!recipient.email) {
      score -= 35;
      hardStops.push("missing_recipient");
      reasons.push("No verified recipient email is available for this action.");
    } else if (recipient.source !== "payload") {
      score -= 6;
      reasons.push("Recipient was inferred from a linked record instead of the source payload.");
    }
  }

  if (action.channel !== "internal") {
    const readiness = await validateProviderMapping(item.workspaceId, action.channel);
    if (!readiness.writebackReady) {
      score -= 32;
      hardStops.push("missing_target");
      reasons.push(readiness.details?.[0] || `${action.channel} is not ready for writeback.`);
    } else if (!readiness.ready) {
      score -= 14;
      reasons.push(`${action.channel} is connected but still needs operator attention.`);
    }
  }

  if (action.channel === "github" && !item.sourceContext?.payload?.repo && !item.sourceContext?.payload?.repository) {
    score -= 10;
    reasons.push("Repository intent was inferred from workspace defaults instead of explicit source context.");
  }

  if (["ats", "crm", "notion", "clickup"].includes(action.channel)) {
    score -= 8;
    reasons.push("This step depends on mapping quality inside a system of record.");
  }

  const confidenceScore = clamp(Math.round(score), 5, 99);
  const riskLevel = deriveRiskLevel(confidenceScore, hardStops);
  const executionBlocked = hardStops.includes("missing_target") || hardStops.includes("missing_recipient");
  const approvalForced = riskLevel === "high" && action.channel !== "internal" && !executionBlocked;
  const approvalRecommended = !approvalForced && riskLevel === "medium" && action.channel !== "internal";

  return applyWorkflowPolicyToSafety({
    item,
    actionId,
    action,
    safety: {
      confidenceScore,
      riskLevel,
      reasons: summarizeReasons(reasons),
      executionBlocked,
      approvalForced,
      approvalRecommended,
    },
  });
};

const applySafetyToItem = async (item) => {
  if (!item?.executionPlan?.length || !item?.actionLogs?.length) return item;

  const safetyEntries = [];
  for (const step of item.executionPlan) {
    const safety = await evaluateActionSafety({ item, actionId: step.id });
    const log = getActionLog(item, step.id);
    if (!log) continue;
    log.confidenceScore = safety.confidenceScore;
    log.riskLevel = safety.riskLevel;
    log.riskReasons = safety.reasons;
    log.executionBlocked = safety.executionBlocked;
    log.approvalForced = safety.approvalForced;
    log.approvalRecommended = safety.approvalRecommended;
    log.reviewLabel = safety.reviewLabel || "";
    log.reviewMessage = safety.reviewMessage || "";
    log.copyTone = safety.copyTone || "operator";
    log.safetyEvaluatedAt = new Date();
    step.metadata = {
      ...(step.metadata || {}),
      safety: {
        confidenceScore: safety.confidenceScore,
        riskLevel: safety.riskLevel,
        reasons: safety.reasons,
        executionBlocked: safety.executionBlocked,
        approvalForced: safety.approvalForced,
        approvalRecommended: safety.approvalRecommended,
      },
    };
    safetyEntries.push(safety);
  }

  if (!safetyEntries.length) return item;

  const avgConfidence =
    safetyEntries.reduce((sum, entry) => sum + entry.confidenceScore, 0) / safetyEntries.length;
  const maxRisk =
    safetyEntries
      .map((entry) => entry.riskLevel)
      .sort((left, right) => (RISK_WEIGHT[right] || 0) - (RISK_WEIGHT[left] || 0))[0] || "low";
  const dominantReasons = summarizeReasons(safetyEntries.flatMap((entry) => entry.reasons || []));

  item.confidenceScore = Math.round(avgConfidence);
  item.riskLevel = maxRisk;
  item.safetyReasons = dominantReasons;
  item.approvalRequired = item.actionLogs.some((entry) => entry.requiresApproval || entry.approvalForced);
  return item;
};

module.exports = {
  applySafetyToItem,
  evaluateActionSafety,
};
