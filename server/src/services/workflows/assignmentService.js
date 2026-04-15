const ExecutionItem = require("../../models/ExecutionItem");
const User = require("../../models/User");
const WorkspaceMember = require("../../models/WorkspaceMember");
const { ACTIVE_ITEM_STATUSES } = require("./helpers");

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

  score -= load * 2.5;
  reasons.push(`${load} open workflow items`);

  return { score, reasons };
};

const getWorkspaceRole = async (workspaceId, userId) => {
  const membership = await WorkspaceMember.findOne({ workspaceId, userId }).select("role");
  return membership?.role || "viewer";
};

const suggestAssignee = async ({ workspaceId, item }) => {
  const members = await WorkspaceMember.find({ workspaceId }).populate("userId", "name email");
  const eligibleMembers = members.filter((member) => member.userId && member.role !== "viewer");

  if (!eligibleMembers.length) {
    return {
      userId: null,
      name: "Unassigned",
      reason: "No eligible workspace members found for automatic routing.",
      routingRole: "",
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
    reason: `Assigned to ${winner.member.userId.name} because ${winner.reasons.slice(0, 3).join(", ")}.`,
    routingRole: winner.member.role,
    loadSnapshot: winner.load,
    manualOverride: false,
    assignedAt: new Date(),
  };
};

const applyManualOverride = async ({ workspaceId, itemId, assigneeId, actorId }) => {
  const user = assigneeId ? await User.findById(assigneeId).select("name") : null;
  const assignee = {
    userId: user?._id || null,
    name: user?.name || "Unassigned",
    reason: user ? `Manually overridden by workspace operator.` : "Manually cleared.",
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
  return item;
};

module.exports = {
  applyManualOverride,
  getWorkspaceRole,
  suggestAssignee,
};
