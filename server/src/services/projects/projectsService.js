const Project = require('../../models/Project');
const { logActivity } = require('../../utils/activityLogger');

const getProjects = async (workspaceId, { status } = {}) => {
  const filter = { workspaceId };
  if (status) filter.status = status;
  return Project.find(filter).sort({ createdAt: -1 }).populate('tagIds', 'name color');
};

const createProject = async (workspaceId, userId, data) => {
  const project = await Project.create({
    workspaceId,
    createdBy: userId,
    memberIds: [userId],
    ...data,
  });
  await logActivity({ workspaceId, userId, action: 'project_created', entityType: 'project', entityId: project._id });
  return project;
};

const getProject = async (workspaceId, projectId) => {
  const project = await Project.findOne({ _id: projectId, workspaceId }).populate('tagIds', 'name color');
  if (!project) throw { status: 404, message: 'Project not found' };
  return project;
};

const updateProject = async (workspaceId, projectId, data) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, workspaceId },
    data,
    { new: true, runValidators: true }
  );
  if (!project) throw { status: 404, message: 'Project not found' };
  return project;
};

module.exports = { getProjects, createProject, getProject, updateProject };
