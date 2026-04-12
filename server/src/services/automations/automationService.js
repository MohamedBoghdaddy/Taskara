/**
 * Automation rules engine.
 * Evaluates trigger filters and executes actions.
 */
const AutomationRule = require('../../models/AutomationRule');
const Task           = require('../../models/Task');
const { notifyWorkspace } = require('../../config/socket');
const { dispatchEvent }   = require('../webhooks/webhookService');

/**
 * Fire event and run any matching automation rules.
 * @param {string} workspaceId
 * @param {string} event - e.g. 'card.moved', 'task.status_changed'
 * @param {object} context - event data (card, task, etc.)
 */
const runAutomations = async (workspaceId, event, context) => {
  try {
    const rules = await AutomationRule.find({
      workspaceId,
      active: true,
      'trigger.event': event,
    });

    for (const rule of rules) {
      if (!matchesFilter(rule.trigger.filter, context)) continue;

      try {
        for (const action of rule.actions) {
          await executeAction(action, context, workspaceId);
        }
        await AutomationRule.findByIdAndUpdate(rule._id, {
          $inc: { runCount: 1 }, lastRunAt: new Date(), lastError: null,
        });
      } catch (err) {
        await AutomationRule.findByIdAndUpdate(rule._id, {
          $inc: { errorCount: 1 }, lastError: err.message,
        });
        console.error(`[AutomationService] Rule ${rule._id} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('[AutomationService] runAutomations error:', err.message);
  }
};

const matchesFilter = (filter, context) => {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, value] of Object.entries(filter)) {
    const ctxVal = getNestedValue(context, key);
    if (Array.isArray(value)) {
      if (!value.includes(ctxVal)) return false;
    } else if (ctxVal !== value) return false;
  }
  return true;
};

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
};

const executeAction = async (action, context, workspaceId) => {
  switch (action.type) {
    case 'set_task_field': {
      const taskId = context.taskId || context.task?._id;
      if (taskId) {
        await Task.findByIdAndUpdate(taskId, { [action.params.field]: action.params.value });
        if (action.params.field === 'status' && action.params.value === 'done') {
          await Task.findByIdAndUpdate(taskId, { completedAt: new Date() });
        }
      }
      break;
    }
    case 'send_notification': {
      notifyWorkspace(workspaceId, 'automation:notification', {
        message: action.params.message || 'Automation triggered',
        context,
      });
      break;
    }
    case 'webhook': {
      await dispatchEvent(workspaceId, `automation.${action.params.event || 'triggered'}`, context);
      break;
    }
    case 'create_task': {
      await Task.create({
        workspaceId,
        title:     action.params.title || 'Auto-created task',
        status:    action.params.status || 'todo',
        priority:  action.params.priority || 'medium',
        createdBy: context.userId || context.createdBy,
        projectId: context.projectId || null,
      });
      break;
    }
    default:
      console.warn(`[AutomationService] Unknown action type: ${action.type}`);
  }
};

module.exports = { runAutomations };
