const { asyncHandler } = require("../middleware/errorHandler");
const {
  applyControlAction,
  applyManualOverride,
  buildMigrationPreview,
  decideApproval,
  executeReadyPlan,
  getAllAudienceAnalytics,
  getWorkflowAnalytics,
  getWorkflowDashboard,
  getWorkflowTemplates,
  ingestWorkflowInput,
  listExecutionItems,
  updateExecutionItem,
} = require("../services/workflows/workflowService");
const { getWorkspaceRole } = require("../services/workflows/assignmentService");

const getWorkspaceId = (req) => req.user?.defaultWorkspaceId?.toString() || req.query.workspaceId;

const requireRole = async (req, allowedRoles) => {
  if (req.user?.isPlatformAdmin) return;
  const role = await getWorkspaceRole(getWorkspaceId(req), req.user._id);
  if (!allowedRoles.includes(role)) {
    throw {
      status: 403,
      message: `This action requires one of: ${allowedRoles.join(", ")}`,
    };
  }
};

const getTemplates = asyncHandler(async (req, res) => {
  res.json({ templates: getWorkflowTemplates() });
});

const getDashboard = asyncHandler(async (req, res) => {
  const data = await getWorkflowDashboard(getWorkspaceId(req), req.query.audienceType);
  res.json(data);
});

const getAnalytics = asyncHandler(async (req, res) => {
  if (req.query.audienceType) {
    const metrics = await getWorkflowAnalytics(getWorkspaceId(req), req.query.audienceType);
    return res.json({ metrics });
  }
  const entries = await getAllAudienceAnalytics(getWorkspaceId(req));
  res.json({ entries });
});

const getItems = asyncHandler(async (req, res) => {
  const items = await listExecutionItems(getWorkspaceId(req), req.query);
  res.json({ items });
});

const ingest = asyncHandler(async (req, res) => {
  const result = await ingestWorkflowInput({
    workspaceId: getWorkspaceId(req),
    userId: req.user._id,
    ...req.body,
  });
  res.status(result.duplicate ? 200 : 201).json(result);
});

const patchItem = asyncHandler(async (req, res) => {
  const item = await updateExecutionItem(getWorkspaceId(req), req.user._id, req.params.id, req.body);
  res.json(item);
});

const executeItem = asyncHandler(async (req, res) => {
  await requireRole(req, ["owner", "admin", "editor"]);
  const item = await executeReadyPlan({
    workspaceId: getWorkspaceId(req),
    itemId: req.params.id,
    userId: req.user._id,
    force: Boolean(req.body?.force),
  });
  res.json(item);
});

const approveItem = asyncHandler(async (req, res) => {
  await requireRole(req, ["owner", "admin"]);
  const decision = req.body?.decision === "reject" ? "reject" : "approve";
  const item = await decideApproval({
    workspaceId: getWorkspaceId(req),
    itemId: req.params.id,
    userId: req.user._id,
    decision,
    comment: req.body?.comment || "",
  });
  res.json(item);
});

const controlItem = asyncHandler(async (req, res) => {
  await requireRole(req, ["owner", "admin", "editor"]);
  const item = await applyControlAction({
    workspaceId: getWorkspaceId(req),
    itemId: req.params.id,
    userId: req.user._id,
    action: req.body?.action,
  });
  res.json(item);
});

const assignItem = asyncHandler(async (req, res) => {
  const requestedAssigneeId = req.body?.assigneeId || null;
  const currentRole = req.user?.isPlatformAdmin ? "owner" : await getWorkspaceRole(getWorkspaceId(req), req.user._id);
  const isSelfClaim = requestedAssigneeId && String(requestedAssigneeId) === String(req.user._id);

  if (!["owner", "admin"].includes(currentRole) && !(currentRole === "editor" && isSelfClaim)) {
    throw {
      status: 403,
      message: "This action requires owner/admin access unless you are claiming the item for yourself.",
    };
  }

  const item = await applyManualOverride({
    workspaceId: getWorkspaceId(req),
    itemId: req.params.id,
    assigneeId: requestedAssigneeId,
    actorId: req.user._id,
  });
  res.json(item);
});

const migrationPreview = asyncHandler(async (req, res) => {
  const preview = buildMigrationPreview(req.body);
  res.json(preview);
});

module.exports = {
  approveItem,
  assignItem,
  controlItem,
  executeItem,
  getAnalytics,
  getDashboard,
  getItems,
  getTemplates,
  ingest,
  migrationPreview,
  patchItem,
};
