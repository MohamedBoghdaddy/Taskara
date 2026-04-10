const templatesService = require('../services/templates/templatesService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getTemplates = asyncHandler(async (req, res) => {
  const templates = await templatesService.getTemplates(getWorkspaceId(req), req.query.type);
  res.json(templates);
});

const createTemplate = asyncHandler(async (req, res) => {
  const template = await templatesService.createTemplate(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(template);
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await templatesService.updateTemplate(getWorkspaceId(req), req.params.id, req.body);
  res.json(template);
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await templatesService.deleteTemplate(getWorkspaceId(req), req.params.id);
  res.json({ message: 'Template deleted' });
});

module.exports = { getTemplates, createTemplate, updateTemplate, deleteTemplate };
