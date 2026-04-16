const { asyncHandler } = require("../middleware/errorHandler");
const {
  completeOnboarding,
  getOperationsOverview,
  getOnboardingStatus,
  runAudienceWorkflowTest,
  runConnectorTest,
  runOnboardingDemo,
  saveFirstUserFinding,
  selectOnboardingAudience,
  updateLaunchCriterion,
} = require("../services/operations/opsService");
const { getWorkspaceMembership } = require("../services/workflows/assignmentService");

const getWorkspaceId = (req) =>
  req.user?.defaultWorkspaceId?.toString() ||
  req.params.workspaceId ||
  req.body?.workspaceId ||
  req.query.workspaceId;

const requireWorkspaceId = (req) => {
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) throw { status: 400, message: "workspaceId is required for operations" };
  return workspaceId;
};

const requireOpsAccess = async (req) => {
  const workspaceId = requireWorkspaceId(req);
  if (req.user?.isPlatformAdmin) return workspaceId;
  const membership = await getWorkspaceMembership(workspaceId, req.user._id);
  if (!membership) throw { status: 403, message: "Access denied to this workspace" };
  if (!["owner", "admin"].includes(membership.role)) {
    throw { status: 403, message: "This action requires owner/admin access" };
  }
  return workspaceId;
};

const requireOnboardingAccess = async (req) => {
  const workspaceId = requireWorkspaceId(req);
  if (req.user?.isPlatformAdmin) return workspaceId;
  const membership = await getWorkspaceMembership(workspaceId, req.user._id);
  if (!membership) throw { status: 403, message: "Access denied to this workspace" };
  if (!["owner", "admin", "editor"].includes(membership.role)) {
    throw { status: 403, message: "This action requires editor/admin access" };
  }
  return workspaceId;
};

const getOverview = asyncHandler(async (req, res) => {
  const workspaceId = await requireOpsAccess(req);
  const data = await getOperationsOverview(workspaceId, req.user._id);
  res.json(data);
});

const chooseOnboardingAudience = asyncHandler(async (req, res) => {
  const workspaceId = await requireOnboardingAccess(req);
  const onboarding = await selectOnboardingAudience({
    workspaceId,
    audienceType: req.body?.audienceType,
  });
  res.json({ onboarding });
});

const getOnboarding = asyncHandler(async (req, res) => {
  const workspaceId = await requireOnboardingAccess(req);
  const onboarding = await getOnboardingStatus(workspaceId);
  res.json({ onboarding });
});

const runOnboarding = asyncHandler(async (req, res) => {
  const workspaceId = await requireOnboardingAccess(req);
  const result = await runOnboardingDemo({
    workspaceId,
    userId: req.user._id,
    audienceType: req.body?.audienceType,
  });
  res.json(result);
});

const finishOnboarding = asyncHandler(async (req, res) => {
  const workspaceId = await requireOnboardingAccess(req);
  const onboarding = await completeOnboarding({ workspaceId });
  res.json({ onboarding });
});

const runWorkflowTest = asyncHandler(async (req, res) => {
  const workspaceId = await requireOpsAccess(req);
  const result = await runAudienceWorkflowTest({
    workspaceId,
    userId: req.user._id,
    audienceType: req.params.audienceType,
  });
  res.json({ result });
});

const runConnectorVerification = asyncHandler(async (req, res) => {
  const workspaceId = await requireOpsAccess(req);
  const result = await runConnectorTest({
    workspaceId,
    userId: req.user._id,
    provider: req.params.provider,
  });
  res.json({ result });
});

const saveFirstUserCohort = asyncHandler(async (req, res) => {
  const workspaceId = await requireOpsAccess(req);
  const firstUsers = await saveFirstUserFinding({
    workspaceId,
    cohortKey: req.params.cohortKey,
    payload: req.body || {},
  });
  res.json({ firstUsers });
});

const saveLaunchCriterion = asyncHandler(async (req, res) => {
  const workspaceId = await requireOpsAccess(req);
  const launchCriteria = await updateLaunchCriterion({
    workspaceId,
    criterionKey: req.params.criterionKey,
    status: req.body?.status,
    notes: req.body?.notes || "",
  });
  res.json({ launchCriteria });
});

module.exports = {
  chooseOnboardingAudience,
  finishOnboarding,
  getOnboarding,
  getOverview,
  runConnectorVerification,
  runOnboarding,
  runWorkflowTest,
  saveFirstUserCohort,
  saveLaunchCriterion,
};
