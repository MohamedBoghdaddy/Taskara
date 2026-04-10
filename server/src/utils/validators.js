const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const taskSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  description: Joi.string().allow('').optional(),
  status: Joi.string().valid('inbox', 'todo', 'in_progress', 'blocked', 'done', 'archived').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  dueDate: Joi.date().allow(null).optional(),
  estimateMinutes: Joi.number().min(0).optional(),
  projectId: Joi.string().allow(null).optional(),
  parentTaskId: Joi.string().allow(null).optional(),
  tagIds: Joi.array().items(Joi.string()).optional(),
  assigneeIds: Joi.array().items(Joi.string()).optional(),
});

const noteSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  content: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
  projectId: Joi.string().allow(null).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPinned: Joi.boolean().optional(),
  isFavorite: Joi.boolean().optional(),
});

const workspaceSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('').optional(),
  visibility: Joi.string().valid('private', 'shared').optional(),
});

module.exports = { registerSchema, loginSchema, taskSchema, noteSchema, workspaceSchema };
