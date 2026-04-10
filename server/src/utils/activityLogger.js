const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ workspaceId, userId, action, entityType, entityId, metadata = {} }) => {
  try {
    await ActivityLog.create({ workspaceId, userId, action, entityType, entityId, metadata });
  } catch (err) {
    console.warn('Activity log failed:', err.message);
  }
};

module.exports = { logActivity };
