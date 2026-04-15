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
const { getWorkspaceMembership, getWorkspaceRole } = require("../services/workflows/assignmentService");

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const getWorkspaceId = (req) =>
  req.user?.defaultWorkspaceId?.toString() ||
  req.params.workspaceId ||
  req.body?.workspaceId ||
  req.query.workspaceId;

const requireWorkspaceId = (req) => {
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) {
    throw { status: 400, message: "workspaceId is required for workflow operations" };
  }
  return workspaceId;
};

const requireWorkspaceAccess = async (req, allowedRoles = ["viewer", "editor", "admin", "owner"]) => {
  const workspaceId = requireWorkspaceId(req);
  if (req.user?.isPlatformAdmin) return workspaceId;

  const membership = await getWorkspaceMembership(workspaceId, req.user._id);
  if (!membership) {
    throw { status: 403, message: "Access denied to this workspace" };
  }
  if (!allowedRoles.includes(membership.role)) {
    throw {
      status: 403,
      message: `This action requires one of: ${allowedRoles.join(", ")}`,
    };
  }
  return workspaceId;
};

const getTemplates = asyncHandler(async (req, res) => {
  res.json({ templates: getWorkflowTemplates() });
});

const getDashboard = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req);
  const data = await getWorkflowDashboard(workspaceId, req.query.audienceType);
  res.json(data);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req);
  if (req.query.audienceType) {
    const metrics = await getWorkflowAnalytics(workspaceId, req.query.audienceType);
    return res.json({ metrics });
  }
  const entries = await getAllAudienceAnalytics(workspaceId);
  res.json({ entries });
});

const getItems = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req);
  const items = await listExecutionItems(workspaceId, req.query);
  res.json({ items });
});

const ingest = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req, ["owner", "admin", "editor"]);
  const result = await ingestWorkflowInput({
    workspaceId,
    userId: req.user._id,
    autoExecute: parseBoolean(req.body?.autoExecute, true),
    ...req.body,
  });
  res.status(result.duplicate ? 200 : 201).json(result);
});

const patchItem = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req, ["owner", "admin", "editor"]);
  const item = await updateExecutionItem(workspaceId, req.user._id, req.params.id, req.body);
  res.json(item);
});

const executeItem = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req, ["owner", "admin", "editor"]);
  const item = await executeReadyPlan({
    workspaceId,
    itemId: req.params.id,
    userId: req.user._id,
    force: parseBoolean(req.body?.force, false),
  });
  res.json(item);
});

const approveItem = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req, ["owner", "admin"]);
  if (!["approve", "reject"].includes(req.body?.decision)) {
    throw { status: 400, message: "decision must be either approve or reject" };
  }
  const item = await decideApproval({
    workspaceId,
    itemId: req.params.id,
    userId: req.user._id,
    decision: req.body.decision,
    comment: req.body?.comment || "",
  });
  res.json(item);
});

const controlItem = asyncHandler(async (req, res) => {
  const workspaceId = await requireWorkspaceAccess(req, ["owner", "admin", "editor"]);
  const item = await applyControlAction({
    workspaceId,
    itemId: req.params.id,
    userId: req.user._id,
    action: req.body?.action,
  });
  res.json(item);
});

const assignItem = asyncHandler(async (req, res) => {
  const requestedAssigneeId = req.body?.assigneeId || null;
  const workspaceId = await requireWorkspaceAccess(req);
  const currentRole = req.user?.isPlatformAdmin ? "owner" : await getWorkspaceRole(workspaceId, req.user._id);
  const isSelfClaim = requestedAssigneeId && String(requestedAssigneeId) === String(req.user._id);

  if (!["owner", "admin"].includes(currentRole) && !(currentRole === "editor" && isSelfClaim)) {
    throw {
      status: 403,
      message: "This action requires owner/admin access unless you are claiming the item for yourself.",
    };
  }

  const item = await applyManualOverride({
    workspaceId,
    itemId: req.params.id,
    assigneeId: requestedAssigneeId,
    actorId: req.user._id,
  });
  res.json(item);
});

const migrationPreview = asyncHandler(async (req, res) => {
  await requireWorkspaceAccess(req);
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
