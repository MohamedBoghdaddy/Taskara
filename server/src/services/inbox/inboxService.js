const InboxItem = require('../../models/InboxItem');
const Note = require('../../models/Note');
const Task = require('../../models/Task');
const { logActivity } = require('../../utils/activityLogger');

const getItems = async (workspaceId, userId, { status, type, page = 1, limit = 50 }) => {
  const filter = { workspaceId, createdBy: userId };
  if (status) filter.status = status;
  if (type) filter.type = type;

  const items = await InboxItem.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('tags', 'name color');

  const total = await InboxItem.countDocuments(filter);
  return { items, total, page, limit };
};

const createItem = async (workspaceId, userId, data) => {
  const item = await InboxItem.create({ workspaceId, createdBy: userId, ...data });
  await logActivity({ workspaceId, userId, action: 'inbox_item_created', entityType: 'inbox_item', entityId: item._id });
  return item;
};

const updateItem = async (workspaceId, userId, itemId, data) => {
  const item = await InboxItem.findOneAndUpdate(
    { _id: itemId, workspaceId, createdBy: userId },
    data,
    { new: true, runValidators: true }
  );
  if (!item) throw { status: 404, message: 'Inbox item not found' };
  return item;
};

const convertItem = async (workspaceId, userId, itemId, { targetType, additionalData }) => {
  const item = await InboxItem.findOne({ _id: itemId, workspaceId, createdBy: userId });
  if (!item) throw { status: 404, message: 'Inbox item not found' };

  let entity;

  if (targetType === 'task') {
    entity = await Task.create({
      workspaceId,
      title: item.title,
      description: item.content,
      status: 'todo',
      createdBy: userId,
      ...additionalData,
    });
  } else if (targetType === 'note') {
    entity = await Note.create({
      workspaceId,
      title: item.title,
      content: item.content,
      contentText: item.content,
      createdBy: userId,
      tags: item.tags,
      ...additionalData,
    });
  } else {
    throw { status: 400, message: 'Invalid target type' };
  }

  item.status = 'processed';
  item.convertedEntityType = targetType;
  item.convertedEntityId = entity._id;
  await item.save();

  await logActivity({ workspaceId, userId, action: `inbox_converted_to_${targetType}`, entityType: 'inbox_item', entityId: item._id, metadata: { targetType, entityId: entity._id } });

  return { item, entity };
};

module.exports = { getItems, createItem, updateItem, convertItem };
