const Template = require('../../models/Template');

const getTemplates = async (workspaceId, type) => {
  const filter = { workspaceId };
  if (type) filter.type = type;
  return Template.find(filter).sort({ isDefault: -1, name: 1 });
};

const createTemplate = async (workspaceId, userId, data) => {
  if (data.isDefault) {
    await Template.updateMany({ workspaceId, type: data.type, isDefault: true }, { isDefault: false });
  }
  return Template.create({ workspaceId, createdBy: userId, ...data });
};

const updateTemplate = async (workspaceId, templateId, data) => {
  if (data.isDefault) {
    const template = await Template.findOne({ _id: templateId, workspaceId });
    if (template) await Template.updateMany({ workspaceId, type: template.type, isDefault: true }, { isDefault: false });
  }
  const template = await Template.findOneAndUpdate(
    { _id: templateId, workspaceId },
    data,
    { new: true }
  );
  if (!template) throw { status: 404, message: 'Template not found' };
  return template;
};

const deleteTemplate = async (workspaceId, templateId) => {
  const template = await Template.findOneAndDelete({ _id: templateId, workspaceId });
  if (!template) throw { status: 404, message: 'Template not found' };
  return template;
};

const getDefaultTemplate = async (workspaceId, type) => {
  return Template.findOne({ workspaceId, type, isDefault: true });
};

module.exports = { getTemplates, createTemplate, updateTemplate, deleteTemplate, getDefaultTemplate };
