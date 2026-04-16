const { normalizeAudienceKey } = require("../../config/workflowTemplates");
const { getWorkspaceContextById } = require("../workspaces/workspaceProfileService");

const normalizePolicyAudience = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["student", "students", "study"].includes(raw)) return "student";
  if (["real-estate", "real_estate"].includes(raw)) return "realestate";
  return normalizeAudienceKey(raw, "");
};

const BASE_COPY = {
  operator: {
    reviewLabel: "Approval required",
    reviewRecommendedLabel: "Review recommended",
    blockedLabel: "Execution blocked",
    highRiskPrefix: "Taskara stopped this step because it could cause the wrong external outcome.",
    mediumRiskPrefix: "Taskara can draft this step, but a quick review is recommended first.",
  },
  student: {
    reviewLabel: "Review AI suggestion",
    reviewRecommendedLabel: "Check before saving",
    blockedLabel: "Check before we save this",
    highRiskPrefix: "This could create confusing or incorrect information, so Taskara stopped here.",
    mediumRiskPrefix: "This looks useful, but we may have extracted it incorrectly.",
  },
};

const AUDIENCE_POLICIES = {
  recruiters: {
    highRiskActions: ["send_outreach", "schedule_interview", "send_rejection"],
    highRiskReasons: ["Candidate-facing action could go to the wrong recipient or wrong stage."],
  },
  agencies: {
    highRiskActions: ["send_status", "publish_content", "send_report", "schedule_post"],
    mediumRiskActions: ["mark_report_ready", "schedule_review"],
    highRiskReasons: [
      "This is a client-facing or publish-facing action where the wrong send is costly.",
    ],
    mediumRiskReasons: ["Client-ready output should be reviewed before final delivery."],
  },
  realestate: {
    highRiskActions: ["release_settlement", "change_payment_recipient", "send_owner_statement"],
    mediumRiskActions: ["match_property", "schedule_showing", "generate_settlement_summary"],
    highRiskReasons: ["This step affects money movement or owner-facing financial communication."],
    mediumRiskReasons: ["Property matches and schedule changes should be reviewed for accuracy."],
  },
  startups: {
    highRiskActions: ["create_github_issue", "protected_repo_writeback", "production_deploy"],
    mediumRiskActions: ["assign_owner", "create_bug_report"],
    highRiskReasons: ["Repo and release actions can target the wrong system or environment."],
    mediumRiskReasons: ["Assignment and bug routing should be checked when confidence is limited."],
  },
  insurance: {
    neverAutoActions: ["approve_claim", "reject_claim", "release_payout"],
    highRiskReasons: ["Insurance decisions and payouts must stay human-approved and defensible."],
  },
  student: {
    neverAutoActions: ["overwrite_confirmed_exam_date", "overwrite_confirmed_deadline"],
    mediumRiskActions: ["extract_deadlines", "generate_study_plan", "summarize_notes"],
    highRiskReasons: ["This could overwrite confirmed academic information."],
    mediumRiskReasons: ["AI-generated academic structure should be checked before saving."],
  },
};

const toCopyKey = (surfaceMode = "operator", trustProfile = "operator") =>
  surfaceMode === "student" || trustProfile === "student" ? "student" : "operator";

const getWorkflowPolicyContext = async ({ workspaceId, audienceType, surfaceMode, trustProfile } = {}) => {
  const resolvedAudience = normalizePolicyAudience(audienceType);
  const workspaceContext = workspaceId
    ? await getWorkspaceContextById(workspaceId)
    : {
        vertical: resolvedAudience || "core",
        surfaceMode: surfaceMode || "operator",
        featureProfile: "core",
        trustProfile: trustProfile || "operator",
      };

  const normalizedAudience = normalizePolicyAudience(resolvedAudience || workspaceContext.vertical) || "core";
  const copyKey = toCopyKey(workspaceContext.surfaceMode, workspaceContext.trustProfile);
  return {
    workspaceContext,
    audienceType: normalizedAudience,
    policy: AUDIENCE_POLICIES[normalizedAudience] || {},
    copy: BASE_COPY[copyKey],
  };
};

const withReason = (reasons = [], additions = []) => [...new Set([...(reasons || []), ...(additions || [])])].slice(0, 4);

const applyWorkflowPolicyToSafety = async ({ item, actionId, action, safety }) => {
  const context = await getWorkflowPolicyContext({
    workspaceId: item?.workspaceId,
    audienceType: item?.audienceType,
  });

  const next = {
    ...safety,
    reviewLabel: context.copy.reviewLabel,
    reviewRecommendedLabel: context.copy.reviewRecommendedLabel,
    blockedLabel: context.copy.blockedLabel,
    copyTone: context.workspaceContext.surfaceMode,
  };

  if (!action) {
    next.reviewMessage = context.copy.highRiskPrefix;
    return next;
  }

  if (context.policy.neverAutoActions?.includes(actionId)) {
    next.confidenceScore = Math.min(Number(next.confidenceScore || 74), 45);
    next.riskLevel = "high";
    next.approvalForced = true;
    next.approvalRecommended = false;
    next.reasons = withReason(next.reasons, context.policy.highRiskReasons);
  } else if (context.policy.highRiskActions?.includes(actionId)) {
    next.confidenceScore = Math.min(Number(next.confidenceScore || 74), 62);
    next.riskLevel = "high";
    next.approvalForced = true;
    next.approvalRecommended = false;
    next.reasons = withReason(next.reasons, context.policy.highRiskReasons);
  } else if (context.policy.mediumRiskActions?.includes(actionId)) {
    next.confidenceScore = Math.min(Number(next.confidenceScore || 74), 78);
    if (next.riskLevel === "low") next.riskLevel = "medium";
    if (!next.approvalForced) next.approvalRecommended = true;
    next.reasons = withReason(next.reasons, context.policy.mediumRiskReasons);
  }

  next.reviewMessage =
    next.executionBlocked || next.approvalForced
      ? context.copy.highRiskPrefix
      : next.approvalRecommended
        ? context.copy.mediumRiskPrefix
        : "";

  return next;
};

module.exports = {
  AUDIENCE_POLICIES,
  applyWorkflowPolicyToSafety,
  getWorkflowPolicyContext,
};
