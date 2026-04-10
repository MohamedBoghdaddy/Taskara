const Workspace = require('../../models/Workspace');
const WorkspaceMember = require('../../models/WorkspaceMember');
const Comment = require('../../models/Comment');
const ActivityLog = require('../../models/ActivityLog');
const User = require('../../models/User');

const inviteMember = async (workspaceId, inviterId, { email, role }) => {
  const user = await User.findOne({ email });
  if (!user) throw { status: 404, message: 'User not found with that email' };

  const existing = await WorkspaceMember.findOne({ workspaceId, userId: user._id });
  if (existing) throw { status: 409, message: 'User is already a member' };

  const member = await WorkspaceMember.create({ workspaceId, userId: user._id, role: role || 'editor' });
  await Workspace.findByIdAndUpdate(workspaceId, { $addToSet: { memberIds: user._id } });

  return { member, user: { _id: user._id, name: user.name, email: user.email } };
};

const getMembers = async (workspaceId) => {
  return WorkspaceMember.find({ workspaceId }).populate('userId', 'name email avatarUrl');
};

const updateMemberRole = async (workspaceId, userId, role) => {
  const member = await WorkspaceMember.findOneAndUpdate(
    { workspaceId, userId },
    { role },
    { new: true }
  );
  if (!member) throw { status: 404, message: 'Member not found' };
  return member;
};

const removeMember = async (workspaceId, userId) => {
  const member = await WorkspaceMember.findOneAndDelete({ workspaceId, userId });
  if (!member) throw { status: 404, message: 'Member not found' };
  await Workspace.findByIdAndUpdate(workspaceId, { $pull: { memberIds: userId } });
  return member;
};

const addComment = async (workspaceId, userId, { entityType, entityId, body, parentCommentId }) => {
  const comment = await Comment.create({ workspaceId, entityType, entityId, authorId: userId, body, parentCommentId });
  return comment.populate('authorId', 'name avatarUrl');
};

const getComments = async (workspaceId, entityType, entityId) => {
  return Comment.find({ workspaceId, entityType, entityId })
    .sort({ createdAt: 1 })
    .populate('authorId', 'name avatarUrl');
};

const getActivity = async (workspaceId, { page = 1, limit = 50 }) => {
  const logs = await ActivityLog.find({ workspaceId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'name avatarUrl');
  const total = await ActivityLog.countDocuments({ workspaceId });
  return { logs, total };
};

module.exports = { inviteMember, getMembers, updateMemberRole, removeMember, addComment, getComments, getActivity };
