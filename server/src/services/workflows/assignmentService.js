const ExecutionItem = require("../../models/ExecutionItem");
const User = require("../../models/User");
const WorkspaceMember = require("../../models/WorkspaceMember");
const { ACTIVE_ITEM_STATUSES } = require("./helpers");
const { syncLinkedTaskFromExecutionItem } = require("./taskLinkService");

const DEFAULT_ROLE_WEIGHT = {
  owner: 4,
  admin: 5,
  editor: 6,
  viewer: 1,
};

const RISKY_ROLE_BONUS = {
  owner: 4,
  admin: 3,
  editor: 0,
  viewer: -10,
};

const scoreMember = ({ member, load = 0, item, payload = {} }) => {
  let score = DEFAULT_ROLE_WEIGHT[member.role] ?? 0;
  const reasons = [`${member.role} role`];
  const routingProfile = member.routingProfile || {};

  if (item.riskLevel === "high" || item.approvalRequired) {
    score += RISKY_ROLE_BONUS[member.role] ?? 0;
    reasons.push("trusted for approval-sensitive work");
  }

  const email = member.userId?.email?.toLowerCase?.() || "";
  const name = member.userId?.name?.toLowerCase?.() || "";
  const preferredAssigneeId = payload.preferredAssigneeId || payload.ownerId;
  const ownerEmail = String(payload.ownerEmail || payload.assigneeEmail || "").toLowerCase();
  const ownerName = String(payload.ownerName || payload.assigneeName || "").toLowerCase();

  if (preferredAssigneeId && String(preferredAssigneeId) === String(member.userId?._id)) {
    score += 25;
    reasons.push("matched preferred assignee");
  }

  if (ownerEmail && ownerEmail === email) {
    score += 16;
    reasons.push("matched source owner email");
  }

  if (ownerName && name && ownerName.includes(name.split(" ")[0])) {
    score += 12;
    reasons.push("matched source owner name");
  }

  if ((routingProfile.audienceTypes || []).includes(item.audienceType)) {
    score += 8;
    reasons.push("matched structured audience routing");
  }

  if ((routingProfile.routingTags || []).some((tag) => String(item.workflowType || "").includes(String(tag)))) {
    score += 6;
    reasons.push("matched workflow routing tag");
  }

  if (/recruit|talent|sourc/.test(name) && item.audienceType === "recruiters") {
    score += 4;
    reasons.push("name hints recruiting ownership");
  }

  if (/ops|product|engin|founder/.test(name) && item.audienceType === "startups") {
    score += 4;
    reasons.push("name hints startup execution ownership");
  }

  if (/account|client|creative|project/.test(name) && item.audienceType === "agencies") {
    score += 4;
    reasons.push("name hints client delivery ownership");
  }

  if (/agent|broker|sales/.test(name) && item.audienceType === "realestate") {
    score += 4;
    reasons.push("name hints deal coordination ownership");
  }

  score -= load * (2.5 / Math.max(routingProfile.capacityWeight || 1, 0.5));
  reasons.push(`${load} open workflow items`);

  return { score, reasons };
};

const getWorkspaceMembership = async (workspaceId, userId) =>
  WorkspaceMember.findOne({ workspaceId, userId }).select("role userId workspaceId");

const getWorkspaceRole = async (workspaceId, userId) => {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  return membership?.role || null;
};

const suggestAssignee = async ({ workspaceId, item }) => {
  const members = await WorkspaceMember.find({ workspaceId }).populate("userId", "name email");
  const eligibleMembers = members.filter((member) => member.userId && member.role !== "viewer");

  if (!eligibleMembers.length) {
    const fallbackUser = item.createdBy
      ? await User.findById(item.createdBy).select("name email")
      : null;
    return {
      userId: fallbackUser?._id || null,
      name: fallbackUser?.name || "Unassigned",
      email: fallbackUser?.email || "",
      reason: fallbackUser
        ? `Assigned back to ${fallbackUser.name} because no eligible workspace members were available for routing.`
        : "No eligible workspace members found for automatic routing.",
      teamRole: "",
      routingRole: fallbackUser ? "fallback_creator" : "",
      loadSnapshot: 0,
      manualOverride: false,
      assignedAt: new Date(),
    };
  }

  const memberIds = eligibleMembers.map((member) => member.userId._id);
  const loads = await ExecutionItem.aggregate([
    {
      $match: {
        workspaceId: item.workspaceId,
        status: { $in: ACTIVE_ITEM_STATUSES },
        "assignee.userId": { $in: memberIds },
      },
    },
    {
      $group: {
        _id: "$assignee.userId",
        count: { $sum: 1 },
      },
    },
  ]);

  const loadMap = new Map(loads.map((entry) => [String(entry._id), entry.count]));
  const payload = item.sourceContext?.payload || {};

  const ranked = eligibleMembers
    .map((member) => {
      const load = loadMap.get(String(member.userId._id)) || 0;
      const scored = scoreMember({ member, load, item, payload });
      return { member, load, ...scored };
    })
    .sort((left, right) => right.score - left.score);

  const winner = ranked[0];
  return {
    userId: winner.member.userId._id,
    name: winner.member.userId.name,
    email: winner.member.userId.email || "",
    reason: `Assigned to ${winner.member.userId.name} because ${winner.reasons.slice(0, 3).join(", ")}.`,
    teamRole: winner.member.role,
    routingRole: winner.member.role,
    loadSnapshot: winner.load,
    manualOverride: false,
    assignedAt: new Date(),
  };
};

const applyManualOverride = async ({ workspaceId, itemId, assigneeId, actorId }) => {
  let user = null;
  let member = null;
  if (assigneeId) {
    member = await WorkspaceMember.findOne({ workspaceId, userId: assigneeId }).populate("userId", "name email");
    if (!member?.userId) throw { status: 400, message: "Assignee must belong to this workspace" };
    user = member.userId;
  }

  const assignee = {
    userId: user?._id || null,
    name: user?.name || "Unassigned",
    email: user?.email || "",
    reason: user ? `Manually overridden by workspace operator.` : "Manually cleared.",
    teamRole: member?.role || "",
    routingRole: "manual",
    loadSnapshot: 0,
    manualOverride: true,
    assignedAt: new Date(),
  };

  const item = await ExecutionItem.findOneAndUpdate(
    { _id: itemId, workspaceId },
    {
      $set: { assignee },
      $push: {
        auditTrail: {
          at: new Date(),
          type: "assigned",
          actorType: "user",
          actorId,
          message: user
            ? `Assignment manually overridden to ${user.name}.`
            : "Assignment manually cleared.",
          metadata: { assigneeId: user?._id || null },
        },
      },
    },
    { new: true },
  );

  if (!item) throw { status: 404, message: "Execution item not found" };
  await syncLinkedTaskFromExecutionItem(item);
  return item;
};

module.exports = {
  applyManualOverride,
  getWorkspaceMembership,
  getWorkspaceRole,
  suggestAssignee,
};
