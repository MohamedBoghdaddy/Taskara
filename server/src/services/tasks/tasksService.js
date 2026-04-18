const Task = require("../../models/Task");
const { logActivity } = require("../../utils/activityLogger");

const getTasks = async (workspaceId, userId, query = {}) => {
  const {
    projectId,
    sprintId,
    status,
    priority,
    tags,
    assignee,
    dueDate,
    search,
    page = 1,
    limit = 100,
  } = query;
  const statusNotEqual = query["status[ne]"] || query?.status?.ne;
  const filter = { workspaceId, parentTaskId: null };
  if (projectId) filter.projectId = projectId;
  if (sprintId === "none") filter.sprintId = null;
  else if (sprintId) filter.sprintId = sprintId;
  if (status) filter.status = Array.isArray(status) ? { $in: status } : status;
  if (statusNotEqual) {
    if (typeof filter.status === "string") {
      filter.status = { $eq: filter.status, $ne: statusNotEqual };
    } else {
      filter.status = { ...(filter.status || {}), $ne: statusNotEqual };
    }
  }
  if (priority)
    filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
  if (tags && tags.length) filter.tagIds = { $in: tags };
  if (assignee) filter.assigneeIds = assignee;
  if (dueDate) {
    const date = new Date(dueDate);
    filter.dueDate = { $lte: new Date(date.setHours(23, 59, 59, 999)) };
  }
  if (search) filter.$text = { $search: search };

  const tasks = await Task.find(filter)
    .sort({ priority: -1, dueDate: 1, createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("tagIds", "name color")
    .populate("assigneeIds", "name avatarUrl")
    .populate("subtaskIds", "title status");

  const total = await Task.countDocuments(filter);
  return { tasks, total, page: Number(page), limit: Number(limit) };
};

const createTask = async (workspaceId, userId, data) => {
  // Validate required fields
  if (!data.title?.trim()) throw { status: 400, message: "title is required" };
  if (
    !["inbox", "todo", "in_progress", "blocked", "done", "archived"].includes(
      data.status,
    )
  ) {
    data.status = "inbox"; // Default if missing or invalid
  }
  if (!["low", "medium", "high", "urgent"].includes(data.priority)) {
    data.priority = "medium"; // Default if missing or invalid
  }
  if (
    ![
      "general",
      "workflow",
      "content",
      "deal",
      "study",
      "bug",
      "report",
    ].includes(data.taskType)
  ) {
    data.taskType = "general"; // Default if missing or invalid
  }

  const task = await Task.create({ workspaceId, createdBy: userId, ...data });

  if (data.parentTaskId) {
    await Task.findByIdAndUpdate(data.parentTaskId, {
      $addToSet: { subtaskIds: task._id },
    });
  }

  await logActivity({
    workspaceId,
    userId,
    action: "task_created",
    entityType: "task",
    entityId: task._id,
  });
  return task.populate("tagIds", "name color");
};

const getTask = async (workspaceId, taskId) => {
  const task = await Task.findOne({ _id: taskId, workspaceId })
    .populate("tagIds", "name color")
    .populate("assigneeIds", "name avatarUrl email")
    .populate("subtaskIds", "title status priority dueDate")
    .populate("linkedNoteIds", "title updatedAt");

  if (!task) throw { status: 404, message: "Task not found" };
  return task;
};

const updateTask = async (workspaceId, userId, taskId, data) => {
  if (data.status === "done" && !data.completedAt) {
    data.completedAt = new Date();
  }

  const task = await Task.findOneAndUpdate({ _id: taskId, workspaceId }, data, {
    new: true,
    runValidators: true,
  })
    .populate("tagIds", "name color")
    .populate("assigneeIds", "name avatarUrl");

  if (!task) throw { status: 404, message: "Task not found" };

  await logActivity({
    workspaceId,
    userId,
    action: "task_updated",
    entityType: "task",
    entityId: taskId,
    metadata: { changes: Object.keys(data) },
  });
  return task;
};

const deleteTask = async (workspaceId, userId, taskId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, workspaceId });
  if (!task) throw { status: 404, message: "Task not found" };

  // Remove from parent
  if (task.parentTaskId) {
    await Task.findByIdAndUpdate(task.parentTaskId, {
      $pull: { subtaskIds: taskId },
    });
  }

  await logActivity({
    workspaceId,
    userId,
    action: "task_deleted",
    entityType: "task",
    entityId: taskId,
  });
  return task;
};

const getTodayTasks = async (workspaceId, userId) => {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  return Task.find({
    workspaceId,
    status: { $in: ["todo", "in_progress", "blocked"] },
    $or: [{ dueDate: { $lte: todayEnd } }, { status: "in_progress" }],
  })
    .sort({ priority: -1, dueDate: 1 })
    .populate("tagIds", "name color")
    .limit(50);
};

module.exports = {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getTodayTasks,
};
